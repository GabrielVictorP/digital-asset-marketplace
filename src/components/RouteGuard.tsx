import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserType } from '@/hooks/useUserType';
import { useAllowedEmail } from '@/hooks/useAllowedEmail';
import { isProtectedRoute, isPublicRoute } from '@/lib/router-utils';

interface RouteGuardProps {
  children: ReactNode;
}

/**
 * Componente responsável por gerenciar o acesso às rotas da aplicação
 * Evita redirecionamentos desnecessários durante reloads (F5)
 */
const RouteGuard = ({ children }: RouteGuardProps) => {
  const { user, loading } = useSupabaseAuth();
  const { isAdmin, isCustomer, loading: userTypeLoading } = useUserType();
  const { isAllowedEmail, loading: allowedEmailLoading } = useAllowedEmail();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Não fazer nada se ainda está carregando
    if (loading || userTypeLoading || allowedEmailLoading) {
      return;
    }

    const currentPath = location.pathname;
    
    // Apenas redirecionar se necessário, evitar redirecionamentos durante reload
    const isInitialLoad = !sessionStorage.getItem('route-guard-initialized');
    
    if (isInitialLoad) {
      sessionStorage.setItem('route-guard-initialized', 'true');
      // Em carregamento inicial, ser mais conservador
      return;
    }
    
    // Verifica se é uma rota protegida que requer autenticação
    if (isProtectedRoute(currentPath)) {
      if (!user) {
        // Usuário não autenticado tentando acessar rota protegida
        console.log('Redirecting to login: user not authenticated');
        navigate('/auth/login', { replace: true });
        return;
      }

      // Verificações específicas para rotas admin (acessíveis por qualquer admin)
      const adminOnlyRoutes = ['/create', '/edit', '/delete', '/profitable', '/admin/items', '/kks'];
      
      // Rotas exclusivas do super admin (support@example.com)
      const superAdminOnlyRoutes = ['/sales', '/admin/emails', '/admin-management'];
      
      if (adminOnlyRoutes.some(route => currentPath.startsWith(route))) {
        if (!isAdmin && !isAllowedEmail) {
          console.log('Redirecting to home: user not admin or allowed email');
          navigate('/', { replace: true });
          return;
        }
      }
      
      // Verificação para rotas exclusivas do super admin
      if (superAdminOnlyRoutes.some(route => currentPath.startsWith(route))) {
        if (user.email !== 'support@example.com') {
          console.log('Redirecting to home: user not authorized for super admin page');
          navigate('/', { replace: true });
          return;
        }
      }

      // Verificações específicas para rotas de customer
      const customerRoutes = ['/user/dashboard'];
      
      if (customerRoutes.some(route => currentPath.startsWith(route)) && !isCustomer) {
        console.log('Redirecting to home: user not customer');
        navigate('/', { replace: true });
        return;
      }
    }

    // Se é uma página de auth e usuário já está logado, redirecionar para home
    if (currentPath.startsWith('/auth/') && user) {
      console.log('Redirecting to home: user already authenticated');
      navigate('/', { replace: true });
      return;
    }

  }, [user, loading, userTypeLoading, allowedEmailLoading, isAdmin, isAllowedEmail, isCustomer, location.pathname, navigate]);

  // Mostrar loading enquanto verifica autenticação
  if (loading || userTypeLoading || allowedEmailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;
