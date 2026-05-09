import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, routeForRole } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, role, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else navigate({ to: routeForRole(role) as any });
  }, [loading, role, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold text-primary">Churros Crocantes</h1>
        <p className="mt-2 text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}
