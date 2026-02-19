
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Mail, ArrowLeft } from 'lucide-react';

const EmailConfirmationPage = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="bg-card border border-border p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Aguardando Confirmação
          </h1>
          <p className="text-muted-foreground">
            Enviamos um email de confirmação para sua conta. 
            Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Não recebeu o email?</p>
            <p>Verifique sua pasta de spam ou lixo eletrônico.</p>
          </div>
          
          <button
            onClick={() => navigate('/auth/admin')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;
