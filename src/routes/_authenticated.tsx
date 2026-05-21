import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function AuthLayout() {
  const { loading, user } = useAuth();
  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell />;
}