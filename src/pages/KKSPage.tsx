import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KKSManager } from '@/components/KKSManager';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

const KKSPage = () => {
    const { user, loading } = useSupabaseAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return; // Wait for auth to load

        if (!user) {
            toast.error('Você precisa fazer login para acessar esta página.');
            navigate('/auth/admin');
            return;
        }
    }, [user, loading, navigate]);

    // Show loading while checking permissions
    if (loading || !user) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Verificando permissões...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gaming-primary mb-2">
                    Gerenciar Moeda KKS
                </h1>
                <p className="text-muted-foreground">
                    Gerencie sua moeda KKS do Rucoy. Adicione quantidade, atualize preços e controle seu estoque pessoal.
                </p>
            </div>

            <KKSManager />
        </div>
    );
};

export default KKSPage;
