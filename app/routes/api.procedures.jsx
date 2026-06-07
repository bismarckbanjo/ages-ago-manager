import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const procedures = await prisma.procedure.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(procedures);
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  if (request.method === "POST") {
    const { name, filters, changes } = await request.json();
    const procedure = await prisma.procedure.create({
      data: {
        shop: session.shop,
        name,
        filters,
        changes,
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

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
