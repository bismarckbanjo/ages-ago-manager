import { redirect } from "next/navigation";

// No OAuth: this app authenticates to a single store via an Admin API token,
// so there is nothing to "connect". Send users straight to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
