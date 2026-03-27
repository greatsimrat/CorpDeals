import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '../lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, defaultRoute, hasVendorAccess } = useAuth();
  const location = useLocation();
  const loginPath =
    allowedRoles?.length === 1 && allowedRoles[0] === 'VENDOR' ? '/vendor/login' : '/login';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  const vendorOnlyRoute =
    allowedRoles?.length === 1 && allowedRoles[0] === 'VENDOR' && hasVendorAccess;

  if (allowedRoles?.length && !vendorOnlyRoute && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}

