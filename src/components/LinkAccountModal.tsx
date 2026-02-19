import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Lock, Key, Trash2, Save, AlertCircle } from 'lucide-react';
import { GameAccount, CreateGameAccountData, UpdateGameAccountData } from '@/types/accounts';
import { GameAccountService } from '@/services/GameAccountService';
import { toast } from '@/components/ui/use-toast';

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  onAccountLinked: (hasAccount: boolean) => void;
  // Para modo de criação (quando itemId é null)
  pendingCredentials?: {
    email: string;
    password: string;
    token?: string;
  } | null;
  onPendingCredentialsChange?: (credentials: {
    email: string;
    password: string;
    token?: string;
  } | null) => void;
}

const LinkAccountModal: React.FC<LinkAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  itemId,
  onAccountLinked,
  pendingCredentials,
  onPendingCredentialsChange 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState<GameAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);

  // Resetar campos quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setToken('');
      setExistingAccount(null);
      setIsEditing(false);
      setIsCreationMode(false);
    }
  }, [isOpen]);

  // Carregar dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (itemId) {
        // Modo de edição - carregar conta existente
        loadExistingAccount();
      } else if (pendingCredentials) {
        // Modo de criação com credenciais pendentes
        setIsCreationMode(true);
        setEmail(pendingCredentials.email);
        setPassword(pendingCredentials.password);
        setToken(pendingCredentials.token || '');
      } else {
        // Modo de criação sem credenciais
        setIsCreationMode(true);
      }
    }
  }, [isOpen, itemId, pendingCredentials]);

  const loadExistingAccount = async () => {
    if (!itemId) return;
    
    try {
      setLoading(true);
      const account = await GameAccountService.getAccountByItemId(itemId);
      
      if (account) {
        setExistingAccount(account);
        setEmail(account.email);
        setPassword(account.password);
        setToken(account.token || '');
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading existing account:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conta existente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Email e Senha são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const accountData = {
        email: email.trim(),
        password: password.trim(),
        token: token.trim() || undefined
      };

      if (isCreationMode) {
        // Modo de criação - salvar credenciais como pendentes
        if (onPendingCredentialsChange) {
          onPendingCredentialsChange(accountData);
        }
        toast({
          title: "Credenciais Preparadas",
          description: "Credenciais serão vinculadas quando o item for criado!"
        });
        onAccountLinked(true); // Para atualizar o botão visual
      } else if (itemId) {
        // Modo de edição
        if (existingAccount) {
          // Atualizar conta existente
          await GameAccountService.updateAccount(itemId, accountData as UpdateGameAccountData);
          toast({
            title: "Sucesso",
            description: "Credenciais atualizadas com sucesso!"
          });
        } else {
          // Criar nova conta
          await GameAccountService.createAccount({
            item_id: itemId,
            ...accountData
          } as CreateGameAccountData);
          toast({
            title: "Sucesso",
            description: "Credenciais vinculadas com sucesso!"
          });
        }
        onAccountLinked(true);
      }

      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar credenciais. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (isCreationMode) {
      // Modo de criação - limpar credenciais pendentes
      if (onPendingCredentialsChange) {
        onPendingCredentialsChange(null);
      }
      toast({
        title: "Credenciais Removidas",
        description: "Credenciais pendentes foram removidas!"
      });
      onAccountLinked(false);
      onClose();
      return;
    }

    if (!itemId || !existingAccount) return;

    try {
      setLoading(true);
      await GameAccountService.deleteAccount(itemId);
      
      toast({
        title: "Removido",
        description: "Credenciais removidas com sucesso!"
      });
      
      onAccountLinked(false);
      onClose();
    } catch (error) {
      console.error('Error removing account:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover credenciais. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {isCreationMode ? 'Preparar Credenciais' : (isEditing ? 'Editar Credenciais' : 'Vincular Acesso')}
          </DialogTitle>
          <DialogDescription>
            {isCreationMode 
              ? 'Prepare credenciais que serão automaticamente vinculadas quando o item for criado.'
              : isEditing 
                ? 'Edite ou remova as credenciais vinculadas a este item.'
                : 'Vincule credenciais de acesso ao jogo para este item.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Senha de Backup</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="token"
                placeholder="Token de autenticação ou informações adicionais..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pl-10 min-h-[80px]"
                disabled={loading}
              />
            </div>
          </div>

          {isCreationMode && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Modo de preparação: As credenciais serão automaticamente vinculadas quando o item for criado.
              </p>
            </div>
          )}
          
          {isEditing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                Editando credenciais existentes. Clique em "Remover" para desvincular.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {(isEditing || (isCreationMode && pendingCredentials)) && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isCreationMode ? 'Limpar' : 'Remover'}
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !email.trim() || !password.trim()}
            className="flex items-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isCreationMode ? 'Preparar' : (isEditing ? 'Salvar Alterações' : 'Vincular')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkAccountModal;
