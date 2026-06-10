import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = localStorage.getItem("queue_care_authenticated") === "true";

  if (!isAuthenticated) {
    return <Redirect to="/login" replace />;
  }

  return <>{children}</>;
}
