export class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.maxRetries = options.maxRetries || 3;
    this.initialDelayMs = options.initialDelayMs || 1000;
    this.delayBetweenBatchesMs = options.delayBetweenBatchesMs || 100;
  }

  async processBatches(items, processor, onProgress) {
    const results = [];
    const errors = [];
    let processed = 0;

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(items.length / this.batchSize);

      try {
        const batchResult = await this.processBatchWithRetry(batch, processor);
        results.push(...batchResult.results);
        errors.push(...batchResult.errors);
        processed += batch.length;

        if (onProgress) {
          onProgress({
            processed,
            total: items.length,
            batchNumber,
            totalBatches,
            batchSize: batch.length,
          });
        }

        if (i + this.batchSize < items.length) {
          await this.delay(this.delayBetweenBatchesMs);
        }
      } catch (err) {
        errors.push({
          batch: batchNumber,
          items: batch,
          error: err.message,
          code: err.code || "BATCH_FAILURE",
        });
      }
    }

    return { results, errors, processed, total: items.length };
  }

  async processBatchWithRetry(batch, processor) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await processor(batch);
      } catch (err) {
        lastError = err;

        if (attempt < this.maxRetries) {
          const delay = this.initialDelayMs * Math.pow(2, attempt - 1);
          await this.delay(Math.min(delay, 8000));
        }
      }
    }

    throw lastError;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  calculateRateLimit(successCount, errorCount, apiCallsRemaining) {
    const totalCalls = successCount + errorCount;
    const errorRate = totalCalls > 0 ? errorCount / totalCalls : 0;

    if (errorRate > 0.5) {
      return {
        shouldThrottle: true,
        message: "High error rate detected, reducing batch size",
        newBatchSize: Math.max(10, this.batchSize / 2),
      };
    }

    if (apiCallsRemaining < 50) {
      return {
        shouldThrottle: true,
        message: "API rate limit approaching",
        newBatchSize: Math.max(10, this.batchSize / 2),
      };
    }

    return {
      shouldThrottle: false,
      message: "Normal operation",
      newBatchSize: this.batchSize,
    };
  }
}

export function createBatchProcessor(options) {
  return new BatchProcessor(options);
}
