import { useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, AlertTriangle } from 'lucide-react';
import { getConfig } from '@/lib/config';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [emailAllowed, setEmailAllowed] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailHasAccount, setEmailHasAccount] = useState<boolean | null>(null);
  
  const { signUp, signIn, user } = useSupabaseAuth();
  const navigate = useNavigate();

  // Check if environment variables are configured
  const appConfig = getConfig();
  const isConfigured = appConfig.isConfigured();  const adminEmail1 = appConfig.admin.emails[0];
  const adminEmail2 = appConfig.admin.emails[1];
  const allowedEmails = appConfig.admin.emails;

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, [isConfigured]);
  
  // Redirecionamento será gerenciado pelo RouteGuard
  // useEffect(() => {
  //   if (user) {
  //     navigate('/');
  //   }
  // }, [user, navigate]);

  // Check if email is allowed when user types (only for signup)
  useEffect(() => {
    if (!isSignUp || !email.trim()) {
      setEmailAllowed(null);
      setEmailHasAccount(null);
      return;
    }

    const checkEmailPermission = async () => {
      try {
        setCheckingEmail(true);
        
        // Check if email is allowed
        const { data: isAllowed, error: allowedError } = await supabase
          .rpc('is_email_allowed', { email_to_check: email.trim().toLowerCase() });
        
        // Check if email already exists using our new function
        const { data: emailExists, error: existsError } = await supabase
          .rpc('check_email_exists', { email_to_check: email.trim().toLowerCase() });
        
        if (allowedError) {
          logger.error('Error checking email permission:', allowedError);
          setEmailAllowed(null);
        } else {
          setEmailAllowed(isAllowed);
        }

        if (existsError) {
          logger.error('Error checking existing account:', existsError);
          setEmailHasAccount(null);
        } else {
          setEmailHasAccount(emailExists);
        }
      } catch (error) {
        logger.error('Error checking email:', error);
        setEmailAllowed(null);
        setEmailHasAccount(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    // Debounce the email check
    const timeoutId = setTimeout(checkEmailPermission, 500);
    return () => clearTimeout(timeoutId);
  }, [email, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Check if email is allowed before attempting signup
        if (emailAllowed === false) {
          setError('Este email não está autorizado a criar uma conta. Entre em contato com o administrador.');
          setLoading(false);
          return;
        }

        // Check if email already has an account
        if (emailHasAccount === true) {
          setError('Este email já possui uma conta. Tente fazer login ou use outro email.');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, { user_type: 'admin' });
        if (!error) {
          navigate('/email-confirmation');
        } else {
          setError(error.message);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      }
    } catch (err) {
      logger.error('Auth error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      {!mounted && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded text-sm">
          Carregando Auth...
        </div>
      )}
        {!isConfigured && mounted && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded text-sm">
          ⚠️ Env vars missing
        </div>      )}
      
      <div className="bg-card border border-border p-8 rounded-lg shadow-lg w-full max-w-md"><div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {isSignUp ? 'Criar Conta' : 'Bem-vindo de Volta'}
          </h1>
          <p className="text-muted-foreground">
            {isSignUp 
              ? 'Registre-se para começar a gerenciar seus itens de jogo' 
              : 'Entre em sua conta'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Digite seu nome completo"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-12 py-2 bg-muted border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${
                  isSignUp && email.trim() && (emailAllowed === false || emailHasAccount === true)
                    ? 'border-red-500 focus:ring-red-500' 
                    : isSignUp && email.trim() && emailAllowed === true && emailHasAccount === false
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-border'
                }`}
                placeholder="Digite seu email"
                required
              />
              {isSignUp && email.trim() && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {checkingEmail ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                  ) : emailAllowed === true && emailHasAccount === false ? (
                    <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (emailAllowed === false || emailHasAccount === true) ? (
                    <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs">✗</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {isSignUp && email.trim() && emailAllowed === false && (
              <p className="text-red-600 text-xs mt-1">
                Este email não está autorizado a criar uma conta
              </p>
            )}
            {isSignUp && email.trim() && emailHasAccount === true && (
              <p className="text-red-600 text-xs mt-1">
                Este email já possui uma conta. Tente fazer login.
              </p>
            )}
            {isSignUp && email.trim() && emailAllowed === true && emailHasAccount === false && (
              <p className="text-green-600 text-xs mt-1">
                Email autorizado e disponível ✓
              </p>
            )}
          </div>          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Digite sua senha"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (isSignUp && (emailAllowed === false || emailHasAccount === true))}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />            ) : isSignUp ? (
              <>
                <UserPlus className="h-4 w-4" />
                Registrar
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4">          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setEmailAllowed(null);
              setEmailHasAccount(null);
            }}
            className="text-primary hover:underline text-sm"
          >
            {isSignUp 
              ? 'Já tem uma conta? Entre aqui' 
              : "Não tem uma conta? Registre-se"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
