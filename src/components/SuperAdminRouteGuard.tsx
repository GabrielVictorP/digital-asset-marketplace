import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface SuperAdminRouteGuardProps {
  children: React.ReactNode;
}

const SuperAdminRouteGuard: React.FC<SuperAdminRouteGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const location = useLocation();

  // Show loading while checking authentication and super admin status
  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to home if not super admin
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Render the protected content
  return <>{children}</>;
};

export default SuperAdminRouteGuard;
