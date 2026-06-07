import { createFilterEvaluator } from "./filterEvaluator.server.js";
import { createGraphQLQueryBuilder } from "./graphQLQueryBuilder.server.js";
import { createGraphQLMutationBuilder } from "./graphQLMutationBuilder.server.js";
import { createBatchProcessor } from "./batchProcessor.server.js";
import prisma from "../db.server.js";

export class ProcedureExecutor {
  constructor(admin, shop) {
    this.admin = admin;
    this.shop = shop;
    this.queryBuilder = createGraphQLQueryBuilder();
    this.mutationBuilder = createGraphQLMutationBuilder();
    this.batchProcessor = createBatchProcessor();
  }

  async execute(procedureId, triggeredBy = "manual") {
    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
    });

    if (!procedure) {
      throw new Error(`Procedure not found: ${procedureId}`);
    }

    const execution = await prisma.procedureExecution.create({
      data: {
        procedureId: procedure.id,
        shop: this.shop,
        status: "in_progress",
        triggeredBy,
      },
    });

    try {
      await this.executeInternal(procedure, execution);
      return execution;
    } catch (error) {
      await prisma.procedureExecution.update({
        where: { id: execution.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          errors: [{ message: error.message, stack: error.stack }],
        },
      });
      throw error;
    }
  }

  async executeInternal(procedure, execution) {
    const { filters, changes } = procedure;

    const products = await this.fetchAllMatchingProducts(filters);
    let matched = products.length;

    await prisma.procedureExecution.update({
      where: { id: execution.id },
      data: { productsMatched: matched },
    });

    const productsToUpdate = await this.evaluateFilters(products, filters);

    if (productsToUpdate.length === 0) {
      await prisma.procedureExecution.update({
        where: { id: execution.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          productsMatched: 0,
          productsUpdated: 0,
          productsFailed: 0,
        },
      });
      return;
    }

    const result = await this.applyChanges(
      execution,
      productsToUpdate,
      changes,
      procedure
    );

    await prisma.procedureExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        productsMatched: matched,
        productsUpdated: result.updated,
        productsFailed: result.failed,
        errors: result.errors.length > 0 ? result.errors : null,
      },
    });
  }

  async fetchAllMatchingProducts(filters) {
    const allProducts = [];
    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = this.queryBuilder.buildProductQuery(filters, after);
      const response = await this.admin.graphql(query);
      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(`GraphQL error: ${errors.map((e) => e.message).join(", ")}`);
      }

      const edges = data?.products?.edges ?? [];
      const pageInfo = data?.products?.pageInfo ?? {};

      allProducts.push(...edges.map((edge) => edge.node));

      hasNextPage = pageInfo.hasNextPage || false;
      after = pageInfo.endCursor || null;
    }

    return allProducts;
  }

  async evaluateFilters(products, filters) {
    const toUpdate = [];

    for (const product of products) {
      const evaluator = createFilterEvaluator(product);
      if (evaluator.evaluate(filters)) {
        toUpdate.push(product);
      }
    }

    return toUpdate;
  }

  async applyChanges(execution, products, changes, procedure) {
    const processor = async (batch) => {
      const mutations = this.mutationBuilder.buildBatchMutations(batch, changes);
      const batchResults = [];

      for (const mutation of mutations) {
        try {
          const response = await this.admin.graphql(mutation);
          const { data, errors: gqlErrors } = await response.json();

          if (gqlErrors) {
            throw new Error(
              `GraphQL error: ${gqlErrors.map((e) => e.message).join(", ")}`
            );
          }

          if (!data) {
            throw new Error("No data returned from mutation");
          }

          const mutationKeys = Object.keys(data).filter((k) => k !== "__typename");
          for (const key of mutationKeys) {
            const result = data[key];
            const userErrors = result?.userErrors || [];

            if (userErrors.length > 0) {
              batchResults.push({
                success: false,
                error: userErrors.map((e) => e.message).join(", ")
              });
            } else if (result?.product?.id) {
              batchResults.push({ success: true, productId: result.product.id });
            } else {
              batchResults.push({ success: false, error: "No product returned from mutation" });
            }
          }
        } catch (err) {
          batchResults.push({ success: false, error: err.message });
        }
      }

      return { results: batchResults, errors: [] };
    };

    const batchResult = await this.batchProcessor.processBatches(products, processor);

    const updated = batchResult.results.filter((r) => r.success).length;
    const failed = batchResult.results.filter((r) => !r.success).length;
    const errors = batchResult.results.filter((r) => !r.success).map((r) => ({ message: r.error }));

    await this.logResults(execution.id, batchResult.results);

    return { updated, failed, errors };
  }

  async logResults(executionId, results) {
    const logs = results.map((result) => ({
      procedureId: result.productId || "unknown",
      executionId,
      shop: this.shop,
      productId: result.productId || "unknown",
      message: result.error || "Updated successfully",
      status: result.success ? "success" : "error",
    }));

    if (logs.length > 0) {
      await prisma.procedureLog.createMany({
        data: logs,
      });
    }
  }
}

export async function executeProcedure(admin, shop, procedureId, triggeredBy = "manual") {
  const executor = new ProcedureExecutor(admin, shop);
  return executor.execute(procedureId, triggeredBy);
}
