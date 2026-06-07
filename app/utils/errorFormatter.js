export function formatValidationErrors(errors) {
  return {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    errors: Array.isArray(errors) ? errors : [errors],
  };
}

export function formatShopifyError(error) {
  if (error.errors && Array.isArray(error.errors)) {
    return {
      code: "SHOPIFY_API_ERROR",
      message: "Shopify API error",
      details: error.errors.map((e) => ({
        message: e.message || String(e),
        extensions: e.extensions || {},
      })),
    };
  }

  return {
    code: "SHOPIFY_API_ERROR",
    message: error.message || "Unknown Shopify API error",
  };
}

export function formatExecutionError(error, context = {}) {
  return {
    code: error.code || "EXECUTION_ERROR",
    message: error.message || "Procedure execution failed",
    context,
    timestamp: new Date().toISOString(),
  };
}

export function formatProcedureExecutionResult(execution) {
  return {
    id: execution.id,
    status: execution.status,
    productsMatched: execution.productsMatched,
    productsUpdated: execution.productsUpdated,
    productsFailed: execution.productsFailed,
    successRate:
      execution.productsMatched > 0
        ? Math.round(
            ((execution.productsUpdated /
              (execution.productsUpdated + execution.productsFailed)) *
              100) | 0
          )
        : 0,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    duration: execution.completedAt
      ? Math.round(
          (execution.completedAt.getTime() -
            execution.startedAt.getTime()) /
            1000
        )
      : null,
    errors: execution.errors || [],
  };
}
