export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif", maxWidth: 640 }}>
      <h1>Ages Ago Manager</h1>
      <p>Bulk product editor for the Ages Ago Apparel store.</p>

      <p style={{ marginTop: 24 }}>
        <a href="/dashboard">
          <button style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
            Open dashboard
          </button>
        </a>
      </p>

      <p style={{ marginTop: 16, color: "#666", fontSize: 14 }}>
        First-time setup, or seeing an authentication error?{" "}
        <a href="/api/auth/shopify">Connect / reauthorize Shopify</a> (one-time).
      </p>
    </main>
  );
}
