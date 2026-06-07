import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { validateProcedure } from "../utils/procedureValidation.js";
import { formatValidationErrors } from "../utils/errorFormatter.js";
import { executeProcedure } from "../services/procedureExecutor.server.js";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const procedureId = url.searchParams.get("id");
  const executionId = url.searchParams.get("executionId");

  if (executionId) {
    const execution = await prisma.procedureExecution.findUnique({
      where: { id: executionId },
      include: {
        logs: { take: 100, orderBy: { createdAt: "desc" } },
      },
    });
    return Response.json(execution);
  }

  if (procedureId) {
    const executions = await prisma.procedureExecution.findMany({
      where: { procedureId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json(executions);
  }

  const procedures = await prisma.procedure.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(procedures);
}

export async function action({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (request.method === "POST" && action === "preview") {
    try {
      const { filters } = await request.json();
      const { ProcedureExecutor } = await import("../services/procedureExecutor.server.js");
      const executor = new ProcedureExecutor(admin, session.shop);
      const products = await executor.fetchAllMatchingProducts(filters);

      return Response.json({
        totalMatched: products.length,
        preview: products.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          vendor: p.vendor,
          tags: p.tags,
          price: p.variants?.edges?.[0]?.node?.price
        }))
      });
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  if (request.method === "POST") {
    const { name, description, filters, changes, schedule } =
      await request.json();

    const validation = validateProcedure(name, filters, changes, schedule);
    if (!validation.valid) {
      return Response.json(
        {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const procedure = await prisma.procedure.create({
      data: {
        shop: session.shop,
        name,
        description,
        filters,
        changes,
        schedule: schedule || "manual",
      },
    });
    return Response.json(procedure, { status: 201 });
  }

  if (request.method === "DELETE") {
    const { id } = await request.json();
    await prisma.procedure.delete({
      where: { id },
    });
    return Response.json({ success: true });
  }

  if (request.method === "PUT") {
    const { id, name, description, filters, changes, schedule, isActive } =
      await request.json();

    if (filters && changes) {
      const validation = validateProcedure(name, filters, changes, schedule);
      if (!validation.valid) {
        return Response.json(
          formatValidationErrors(validation.errors),
          { status: 400 }
        );
      }
    }

    const procedure = await prisma.procedure.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(filters && { filters }),
        ...(changes && { changes }),
        ...(schedule && { schedule }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return Response.json(procedure);
  }

  if (request.method === "PATCH") {
    const pathParts = url.pathname.split("/");
    const procedureId = pathParts[pathParts.length - 2];
    const action = pathParts[pathParts.length - 1];

    if (action === "execute") {
      try {
        const procedure = await prisma.procedure.findUnique({
          where: { id: procedureId },
        });

        if (!procedure) {
          return Response.json(
            { error: "Procedure not found" },
            { status: 404 }
          );
        }

        const execution = await executeProcedure(
          admin,
          session.shop,
          procedureId,
          "manual"
        );

        await prisma.procedure.update({
          where: { id: procedureId },
          data: { lastExecutedAt: new Date() },
        });

        return Response.json(execution, { status: 200 });
      } catch (error) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    if (action === "schedule") {
      const { schedule } = await request.json();
      const procedure = await prisma.procedure.update({
        where: { id: procedureId },
        data: { schedule },
      });
      return Response.json(procedure);
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
