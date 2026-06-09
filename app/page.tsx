import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const shop = cookieStore.get("shop")?.value;

  if (shop) {
    redirect("/dashboard");
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Ages Ago Manager</h1>
      <p>Bulk product editor for Shopify</p>
      <a href="/api/auth/shopify?shop=agesagoapparel.com">
        <button style={{ padding: "10px 20px", fontSize: "16px" }}>
          Connect to Shopify
        </button>
      </a>
    </main>
  );
}
