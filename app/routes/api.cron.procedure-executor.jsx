import { createAdminApiClient } from "@shopify/admin-api-client";
import { ScheduleEvaluator } from "../services/scheduleEvaluator.server";
import { executeProcedure } from "../services/procedureExecutor.server";
import prisma from "../db.server";

export async function loader({ request }) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const allProcedures = await prisma.procedure.findMany({
      where: { isActive: true },
    });

    const toExecute = allProcedures.filter((proc) =>
      ScheduleEvaluator.shouldExecute(proc)
    );

    if (toExecute.length === 0) {
      return Response.json({
        success: true,
        message: "No procedures to execute",
        checked: allProcedures.length,
        executed: 0,
      });
    }

    const results = [];
    const errors = [];
    const shopGroups = new Map();

    toExecute.forEach((proc) => {
      if (!shopGroups.has(proc.shop)) {
        shopGroups.set(proc.shop, []);
      }
      shopGroups.get(proc.shop).push(proc);
    });

    for (const [shop, procedures] of shopGroups.entries()) {
      try {
        const session = await prisma.session.findFirst({
          where: { shop, isOnline: true },
          orderBy: { createdAt: "desc" },
        });

        if (!session || !session.accessToken) {
          procedures.forEach((proc) => {
            errors.push({
              procedureId: proc.id,
              procedureName: proc.name,
              error: "No valid session found for shop",
            });
          });
          continue;
        }

        const admin = createAdminApiClient({
          shop,
          accessToken: session.accessToken,
        });

        for (const procedure of procedures) {
          try {
            const execution = await executeProcedure(
              admin,
              shop,
              procedure.id,
              "cron"
            );

            await prisma.procedure.update({
              where: { id: procedure.id },
              data: { lastExecutedAt: new Date() },
            });

            results.push({
              procedureId: procedure.id,
              procedureName: procedure.name,
              executionId: execution.id,
              status: execution.status,
            });
          } catch (err) {
            errors.push({
              procedureId: procedure.id,
              procedureName: procedure.name,
              error: err.message,
            });
          }
        }
      } catch (err) {
        procedures.forEach((proc) => {
          errors.push({
            procedureId: proc.id,
            procedureName: proc.name,
            error: err.message,
          });
        });
      }
    }

    return Response.json({
      success: true,
      checked: allProcedures.length,
      executed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
