import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Plus, User, UserCheck, Shield, Edit3, Check, X, Package } from 'lucide-react';
import logger from '@/lib/logger';
import { getConfig } from '@/lib/config';

interface AllowedEmail {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
  is_active: boolean;
  photo_limit: number;
  has_account?: boolean;
}

const AdminManagementPage = () => {
  const { user } = useSupabaseAuth();
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhotoLimit, setNewPhotoLimit] = useState('5');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingLimits, setEditingLimits] = useState<{[key: string]: string}>({});

  const config = getConfig();
  const isSuportAdmin = user?.email === config.admin.emails[1]; // VITE_ADMIN_EMAIL_SUPORT

  // Function to calculate days remaining for 30-day access
  const getDaysRemaining = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const thirtyDaysLater = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const remainingTime = thirtyDaysLater.getTime() - currentDate.getTime();
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
    
    return Math.max(0, remainingDays); // Don't show negative days
  };

  // Function to format the days remaining text
  const formatDaysRemaining = (days: number) => {
    if (days === 0) return 'Expira hoje';
    if (days === 1) return '1 dia restante';
    return `${days} dias restantes`;
  };

  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      // No user is logged in, redirect to home page
      toast.error('Acesso negado. Apenas o administrador principal pode acessar esta página.');
      navigate('/');
      return;
    }
    
    if (!isSuportAdmin) {
      toast.error('Acesso negado. Apenas o administrador principal pode acessar esta página.');
      navigate('/');
      return;
    }
    
    fetchAllowedEmails();
  }, [isSuportAdmin, user, navigate]);

  const fetchAllowedEmails = async () => {
    try {
      setLoading(true);

      // Use RPC function to get allowed emails
      const { data: allowedEmailsData, error: allowedError } = await supabase
        .rpc('get_allowed_emails');

      if (allowedError) throw allowedError;

      // Fetch all user profiles to check which emails have accounts
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('email');

      if (profilesError) throw profilesError;

      const existingEmails = new Set(profilesData?.map(p => p.email) || []);

      // Combine data
      const enrichedEmails = (allowedEmailsData || []).map((email: any) => ({
        ...email,
        has_account: existingEmails.has(email.email)
      }));

      setAllowedEmails(enrichedEmails);
    } catch (error) {
      logger.error('Error fetching allowed emails:', error);
      toast.error('Erro ao carregar emails permitidos');
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    const photoLimit = parseInt(newPhotoLimit);
    if (isNaN(photoLimit) || (photoLimit < 1 && photoLimit !== -1)) {
      toast.error('Limite de fotos deve ser -1 (ilimitado) ou um número maior que 0');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .rpc('add_allowed_email', {
          email_to_add: newEmail.trim().toLowerCase(),
          photo_limit_param: photoLimit
        } as any);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('Este email já está na lista');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Email adicionado com sucesso (limite: ${photoLimit} fotos)`);
      setNewEmail('');
      setNewPhotoLimit('5');
      fetchAllowedEmails();
    } catch (error) {
      logger.error('Error adding email:', error);
      toast.error('Erro ao adicionar email');
    } finally {
      setSubmitting(false);
    }
  };

  const updatePhotoLimit = async (emailId: string, newLimit: string) => {
    const photoLimit = parseInt(newLimit);
    if (isNaN(photoLimit) || (photoLimit < 1 && photoLimit !== -1)) {
      toast.error('Limite deve ser -1 (ilimitado) ou um número maior que 0');
      return;
    }

    try {
      // Call the RPC function to update photo limit in database
      const { error } = await (supabase as any)
        .rpc('update_photo_limit', {
          email_id: emailId,
          new_photo_limit: photoLimit
        });

      if (error) {
        throw error;
      }
      
      // Update local state immediately for better UX
      setAllowedEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, photo_limit: photoLimit }
            : email
        )
      );

      // Clear editing state
      setEditingLimits(prev => {
        const newState = { ...prev };
        delete newState[emailId];
        return newState;
      });

      toast.success(`Limite atualizado para ${photoLimit === -1 ? 'ilimitado' : photoLimit + ' fotos'}`);
    } catch (error) {
      logger.error('Error updating photo limit:', error);
      toast.error('Erro ao atualizar limite de fotos');
    }
  };

  const startEditingLimit = (emailId: string, currentLimit: number) => {
    setEditingLimits(prev => ({
      ...prev,
      [emailId]: currentLimit.toString()
    }));
  };

  const cancelEditingLimit = (emailId: string) => {
    setEditingLimits(prev => {
      const newState = { ...prev };
      delete newState[emailId];
      return newState;
    });
  };

  const removeEmail = async (emailId: string, email: string) => {
    try {
      // Prevent removing the main admin email
      if (email === config.admin.emails[1]) {
        toast.error('Não é possível remover o email do administrador principal');
        return;
      }

      const { error } = await supabase
        .rpc('remove_allowed_email', {
          email_id: emailId
        });

      if (error) throw error;

      toast.success('Email removido com sucesso');
      fetchAllowedEmails();
    } catch (error) {
      logger.error('Error removing email:', error);
      toast.error('Erro ao remover email');
    }
  };

  if (!isSuportAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 md:h-8 md:w-8" />
          <span className="break-words">Gerenciamento de Administradores</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie quais emails podem criar contas no sistema
        </p>
        
        {/* Quick access button */}
        <div className="mt-4">
          <Link to="/admin/items">
            <Button variant="outline" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Gerenciar Itens dos Usuários
            </Button>
          </Link>
        </div>
      </div>

      {/* Add new email section */}
      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            Adicionar Novo Email
          </CardTitle>
          <CardDescription className="text-sm">
            Adicione um email à lista de usuários autorizados a criar contas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="exemplo@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="5 ou -1 para ilimitado"
                value={newPhotoLimit}
                onChange={(e) => setNewPhotoLimit(e.target.value)}
                min="-1"
                max="100"
                className="w-full sm:w-40"
              />
              <Button
                onClick={addEmail}
                disabled={submitting || !newEmail.trim()}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O limite de fotos define quantos itens cada usuário pode criar no sistema. Use -1 para ilimitado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Emails list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <User className="h-4 w-4 md:h-5 md:w-5" />
            <span className="break-words">Emails Autorizados ({allowedEmails.length})</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Lista de todos os emails que podem criar contas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allowedEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4" />
              <p>Nenhum email autorizado encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allowedEmails.map((allowedEmail) => (
                <div key={allowedEmail.id}>
                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {allowedEmail.has_account ? (
                          <UserCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{allowedEmail.email}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            Adicionado em {new Date(allowedEmail.created_at).toLocaleDateString('pt-BR')} • Limite: 
                          </p>
                          {editingLimits[allowedEmail.id] ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingLimits[allowedEmail.id]}
                                onChange={(e) => setEditingLimits(prev => ({
                                  ...prev,
                                  [allowedEmail.id]: e.target.value
                                }))}
                                className="w-16 px-1 py-0 text-xs border rounded bg-muted/50 text-foreground"
                                min="-1"
                                placeholder="-1"
                              />
                              <span className="text-xs text-muted-foreground">fotos</span>
                              <button
                                onClick={() => updatePhotoLimit(allowedEmail.id, editingLimits[allowedEmail.id])}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Salvar"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => cancelEditingLimit(allowedEmail.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Cancelar"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">
                                {(allowedEmail.photo_limit || 5) === -1 ? 'ilimitado' : `${allowedEmail.photo_limit || 5} fotos`}
                              </span>
                              <button
                                onClick={() => startEditingLimit(allowedEmail.id, allowedEmail.photo_limit || 5)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                title="Editar limite"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {allowedEmail.email !== config.admin.emails[1] && (
                          <p className={`text-xs font-medium ${
                            getDaysRemaining(allowedEmail.created_at) <= 7 
                              ? 'text-red-600' 
                              : getDaysRemaining(allowedEmail.created_at) <= 15 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                          }`}>
                            📅 {formatDaysRemaining(getDaysRemaining(allowedEmail.created_at))}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {allowedEmail.has_account ? (
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            Tem conta
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Sem conta
                          </Badge>
                        )}

                        {allowedEmail.email === config.admin.emails[1] && (
                          <Badge variant="default">
                            Admin Principal
                          </Badge>
                        )}

                        {allowedEmail.email === config.admin.emails[0] && (
                          <Badge variant="secondary">
                            Admin
                          </Badge>
                        )}
                      </div>

                      {allowedEmail.email !== config.admin.emails[1] && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Email</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o email "{allowedEmail.email}" da lista de autorizados?
                                {allowedEmail.has_account && (
                                  <span className="block mt-2 text-amber-600">
                                    ⚠️ Este email já possui uma conta no sistema.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeEmail(allowedEmail.id, allowedEmail.email)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="md:hidden p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {allowedEmail.has_account ? (
                          <UserCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm break-all">{allowedEmail.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Adicionado em {new Date(allowedEmail.created_at).toLocaleDateString('pt-BR')} • Limite: {allowedEmail.photo_limit || 5} fotos
                        </p>
                        {allowedEmail.email !== config.admin.emails[1] && (
                          <p className={`text-xs font-medium ${
                            getDaysRemaining(allowedEmail.created_at) <= 7 
                              ? 'text-red-600' 
                              : getDaysRemaining(allowedEmail.created_at) <= 15 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                          }`}>
                            📅 {formatDaysRemaining(getDaysRemaining(allowedEmail.created_at))}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {allowedEmail.has_account ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
                          Tem conta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Sem conta
                        </Badge>
                      )}

                      {allowedEmail.email === config.admin.emails[1] && (
                        <Badge variant="default" className="text-xs">
                          Admin Principal
                        </Badge>
                      )}

                      {allowedEmail.email === config.admin.emails[0] && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>

                    {allowedEmail.email !== config.admin.emails[1] && (
                      <div className="flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 text-xs">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] mx-4">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Email</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o email "{allowedEmail.email}" da lista de autorizados?
                                {allowedEmail.has_account && (
                                  <span className="block mt-2 text-amber-600">
                                    ⚠️ Este email já possui uma conta no sistema.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeEmail(allowedEmail.id, allowedEmail.email)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagementPage;
