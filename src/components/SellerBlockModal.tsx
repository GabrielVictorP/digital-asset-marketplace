import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCircle, ShoppingCart, ExternalLink } from 'lucide-react';

interface SellerBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SellerBlockModal: React.FC<SellerBlockModalProps> = ({ isOpen, onClose }) => {
  const handleLoginRedirect = () => {
    window.open('/auth/login', '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <UserCircle className="h-5 w-5" />
            Acesso Restrito para Vendedores
          </DialogTitle>
          <DialogDescription className="text-base">
            Como você é um vendedor cadastrado em nosso sistema, não é possível realizar compras com esta conta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <ShoppingCart className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Para realizar uma compra:</strong> Você precisa se cadastrar como um usuário normal (cliente) em nosso sistema.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vendedores não podem comprar produtos usando suas contas de vendedor por questões de organização e controle interno.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleLoginRedirect}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Cadastrar como Cliente
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerBlockModal;
