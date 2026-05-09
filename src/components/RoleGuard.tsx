import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, routeForRole, type AppRole } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function RoleGuard({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/login" }); return; }
    if (role && !allow.includes(role)) navigate({ to: routeForRole(role) as any });
  }, [loading, session, role, allow, navigate]);

  if (loading || !session || !role || !allow.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
