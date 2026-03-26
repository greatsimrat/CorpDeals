import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVendor?: boolean;
  requireFinance?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireVendor = false,
  requireFinance = false
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isVendor, isAdminOrFinance, isLoading } = useAuth();
  const location = useLocation();

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
        to={requireVendor ? '/vendor/login' : '/login'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireVendor && !isVendor) {
    return <Navigate to="/" replace />;
  }

  if (requireFinance && !isAdminOrFinance) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

