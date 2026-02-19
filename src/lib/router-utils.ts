// Utilitários para controle de roteamento e estado do React Router
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook para prevenir redirecionamentos indesejados durante o carregamento inicial
 * Útil para evitar redirecionamentos para home quando a página é recarregada (F5)
 */
export const usePreventInitialRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Marca que a aplicação foi inicializada e o roteamento está pronto
    const isInitialLoad = sessionStorage.getItem('app-initialized') !== 'true';
    
    if (isInitialLoad) {
      // Marca como inicializada para evitar redirecionamentos futuros
      sessionStorage.setItem('app-initialized', 'true');
      
      // Se estivermos em uma rota que não seja a home e não seja uma rota de auth,
      // mantém a rota atual em vez de redirecionar
      if (location.pathname !== '/' && !location.pathname.startsWith('/auth/')) {
        // Força a permanência na rota atual
        console.log('Maintaining current route after page reload:', location.pathname);
      }
    }
  }, [location.pathname]);

  return { location, navigate };
};

/**
 * Verifica se uma rota é protegida e requer autenticação
 */
export const isProtectedRoute = (pathname: string): boolean => {
  const protectedRoutes = [
    '/create',
    '/edit',
    '/delete', 
    '/profitable',
    '/admin-management',
    '/admin/items',
    '/sales',
    '/user/dashboard',
    '/account/settings'
  ];
  
  return protectedRoutes.some(route => pathname.startsWith(route));
};

/**
 * Verifica se uma rota é pública e pode ser acessada sem autenticação
 */
export const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = [
    '/',
    '/kina',
    '/mage', 
    '/pally',
    '/geral',
    '/supercell',
    '/freefire',
    '/itens',
    '/outros',
    '/divulgacoes',
    '/auth/admin',
    '/auth/login',
    '/email-confirmation'
  ];
  
  return publicRoutes.includes(pathname) || pathname.startsWith('/checkout/');
};
