import { CircleNotchIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  Analyst: 0,
  Supervisor: 1,
  Admin: 2,
};

function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-[#1a1aff]">
      <CircleNotchIcon className="h-6 w-6 animate-spin" aria-label="Loading session" />
    </div>
  );
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole !== undefined && !hasRole(user.role, requiredRole)) {
    return <Navigate to="/monitor" replace />;
  }

  return <>{children}</>;
}
