import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, Phone, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { userData, loading, updating, updateAccountData, updatePassword } = useAccountSettings();
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: ''
  });
  
  // Password form states
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);

  // Initialize form data when userData loads
  React.useEffect(() => {
    if (userData && !isFormInitialized && !loading) {
      setFormData({
        full_name: userData.full_name || '',
        phone_number: userData.phone_number ? formatPhoneNumber(userData.phone_number) : ''
      });
      setIsFormInitialized(true);
    }
  }, [userData, isFormInitialized, loading]);

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna string vazia
    if (numbers.length === 0) {
      return '';
    }
    
    // Se há apenas 1 número, não adiciona parênteses ainda
    if (numbers.length === 1) {
      return numbers;
    }
    
    // Se há 2 ou mais números, adiciona formatação
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'phone_number') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare update data (remove formatting for phone)
    const updateData = {
      full_name: formData.full_name.trim() || null,
      phone_number: formData.phone_number ? formData.phone_number.replace(/\D/g, '') : null
    };

    // Remove null values
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== null && value !== '')
    );

    if (Object.keys(filteredData).length === 0) {
      toast.error('Nenhum dado para atualizar');
      return;
    }

    const success = await updateAccountData(filteredData);
    if (success) {
      // Show saved feedback
      setRecentlySaved(true);
      setTimeout(() => setRecentlySaved(false), 3000); // Hide after 3 seconds
    }
  };

  // Handle password update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.new_password) {
      toast.error('Digite a nova senha');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    const success = await updatePassword(passwordData.new_password);
    if (success) {
      setPasswordData({ new_password: '', confirm_password: '' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gaming-primary">Acesso negado</h2>
          <p className="text-muted-foreground mt-2">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gaming-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando dados da conta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gaming-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gaming-card rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gaming-primary">Configurações da Conta</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Welcome Message */}
          {userData.full_name && (
            <div className="bg-gradient-to-r from-gaming-primary/10 to-gaming-accent/10 border border-gaming-primary/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gaming-primary mb-1">
                Olá, {userData.full_name}! 👋
              </h2>
              <p className="text-sm text-muted-foreground">
                Aqui você pode gerenciar as informações da sua conta e preferências.
              </p>
            </div>
          )}

          {/* Account Information Card */}
          <div className="bg-gaming-card border border-border rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gaming-primary/10 rounded-lg">
                <User className="h-5 w-5 text-gaming-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Informações da Conta</h2>
                <p className="text-sm text-muted-foreground">Mantenha seus dados atualizados</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (readonly) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
                  <Mail className="inline h-4 w-4 mr-2 text-gaming-primary" />
                  Email da Conta
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="email"
                    value={userData.email || ''}
                    disabled
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 cursor-not-allowed font-medium"
                  />
                  <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                    ✓ Verificado
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <span>🔒</span> Seu email é usado para login e não pode ser alterado
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium mb-2">
                  <User className="inline h-4 w-4 mr-2 text-gaming-primary" />
                  Nome Completo
                  {formData.full_name && (
                    <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                      ✓ Preenchido
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaming-primary focus:border-gaming-primary transition-all duration-200 text-black dark:text-white"
                  disabled={updating}
                />
                {!formData.full_name && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <span>⚠️</span> Recomendamos preencher seu nome completo
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium mb-2">
                  <Phone className="inline h-4 w-4 mr-2 text-gaming-primary" />
                  Telefone/WhatsApp
                  <span className="ml-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                    Opcional
                  </span>
                  {formData.phone_number && (
                    <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                      ✓ Preenchido
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaming-primary focus:border-gaming-primary transition-all duration-200 text-black dark:text-white"
                  disabled={updating}
                  maxLength={15}
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-gradient-to-r from-gaming-primary to-gaming-accent hover:from-gaming-primary/90 hover:to-gaming-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : recentlySaved ? (
                  <>
                    <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    </div>
                    Salvo!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Password Change Card */}
          <div className="bg-gaming-card border border-border rounded-lg p-6 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gaming-accent/10 rounded-lg">
                <Lock className="h-5 w-5 text-gaming-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Alterar Senha</h2>
                <p className="text-sm text-muted-foreground">Mantenha sua conta segura</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new_password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Digite sua nova senha"
                    className="w-full px-4 py-3 pr-12 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaming-accent focus:border-gaming-accent transition-all duration-200 text-black dark:text-white"
                    disabled={updating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                    className="w-full px-4 py-3 pr-12 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaming-accent focus:border-gaming-accent transition-all duration-200 text-black dark:text-white"
                    disabled={updating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Mínimo 6 caracteres</span>
                </div>
                <button
                  type="submit"
                  disabled={updating || !passwordData.new_password || !passwordData.confirm_password}
                  className="w-full bg-gradient-to-r from-gaming-accent to-gaming-primary hover:from-gaming-accent/90 hover:to-gaming-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Lock className="h-4 w-4" />
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Atualizando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
