import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseSecurity } from '@/hooks/usePurchaseSecurity';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/components/ui/use-toast';

interface CheckoutProtectionProps {
  children: React.ReactNode;
  itemId?: string;
}

const CheckoutProtection = ({ children, itemId }: CheckoutProtectionProps) => {
  const { user } = useSupabaseAuth();
  const { checkPurchaseSecurity } = usePurchaseSecurity();
  const navigate = useNavigate();
  const params = useParams();
  const [isChecking, setIsChecking] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  // Se itemId não foi passado, tentar pegar dos parâmetros da rota
  const targetItemId = itemId || params.itemId || params.id;

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !targetItemId) {
        setIsChecking(false);
        setCanAccess(true); // Permitir se não há usuário ou item
        return;
      }

      try {
        const securityCheck = await checkPurchaseSecurity(targetItemId);
        
        if (!securityCheck.canPurchase) {
          const reason = securityCheck.reason || 'Compra não permitida';
          
          toast({
            title: "Acesso negado",
            description: reason,
            variant: "destructive"
          });

          // Redirecionar para página inicial
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
          
          setCanAccess(false);
        } else {
          setCanAccess(true);
        }
      } catch (error) {
        console.error('Erro na verificação de acesso:', error);
        // Em caso de erro, permitir acesso
        setCanAccess(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [user, targetItemId, checkPurchaseSecurity, navigate]);

  // Mostrar loading enquanto verifica
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensagem de acesso negado
  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl">🚫</div>
          <h2 className="text-2xl font-bold text-red-600">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página. 
            Redirecionando para a página inicial...
          </p>
          <div className="animate-pulse">
            <div className="h-1 bg-red-200 rounded overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar children se tudo estiver ok
  return <>{children}</>;
};

export default CheckoutProtection;
