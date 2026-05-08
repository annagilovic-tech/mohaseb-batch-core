import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => (
    <div className="p-6">
      <Link to="/admin" className="underline">Open admin</Link>
    </div>
  ),
});
