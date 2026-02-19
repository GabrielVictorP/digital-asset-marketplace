import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import { usePhotoLimit } from '@/hooks/usePhotoLimit';
import { toast } from 'sonner';

export const KKSManager = () => {
    const { getKKSItem, addKKSQuantity, removeKKSQuantity, updateKKSPrice } = useSupabaseItems();
    const { photoLimit, currentCount, canCreate, loading: photoLimitLoading } = usePhotoLimit();
    const [quantity, setQuantity] = useState<number>(0);
    const [price, setPrice] = useState<number>(0);
    const [newPrice, setNewPrice] = useState<number>(0);
    const [removeQuantity, setRemoveQuantity] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const kksItem = getKKSItem();

    const handleAddKKS = async () => {
        if (quantity <= 0) {
            toast.error('Quantidade deve ser maior que zero');
            return;
        }
        if (price <= 0) {
            toast.error('Preço deve ser maior que zero');
            return;
        }

        // Check if user can create items (only if they don't have a KKS item yet)
        if (!kksItem && !canCreate) {
            const limitText = photoLimit === -1 ? 'ilimitados' : photoLimit.toString();
            toast.error(`Limite de fotos atingido! Você já criou ${currentCount} de ${limitText} itens permitidos.`);
            return;
        }

        setLoading(true);
        try {
            await addKKSQuantity(quantity, price);
            setQuantity(0);
            setPrice(0);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePrice = async () => {
        if (newPrice <= 0) {
            toast.error('Preço deve ser maior que zero');
            return;
        }

        setLoading(true);
        try {
            await updateKKSPrice(newPrice);
            setNewPrice(0);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveKKS = async () => {
        if (removeQuantity <= 0) {
            toast.error('Quantidade deve ser maior que zero');
            return;
        }

        setLoading(true);
        try {
            await removeKKSQuantity(removeQuantity);
            setRemoveQuantity(0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Status da Moeda KKS</CardTitle>
                    <CardDescription>
                        Gerencie sua moeda KKS do Rucoy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {kksItem ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Quantidade disponível:</span>
                                <Badge variant="secondary" className="text-lg font-bold">
                                    {kksItem.quantity} KKS
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Preço atual:</span>
                                <Badge variant="outline" className="text-lg">
                                    R$ {kksItem.rl_price.toFixed(2)}
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Nenhuma moeda KKS cadastrada ainda
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Adicionar KKS</CardTitle>
                    <CardDescription>
                        Adicione mais moedas KKS ao seu estoque
                    </CardDescription>
                    {!photoLimitLoading && !kksItem && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                {photoLimit === -1 
                                  ? `Sem limite de itens`
                                  : canCreate 
                                    ? `Você pode criar mais ${photoLimit - currentCount} itens`
                                    : `Limite atingido!`
                                }
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {photoLimit === -1 
                                  ? `Items criados: ${currentCount} (ilimitado)`
                                  : `Items criados: ${currentCount} de ${photoLimit} permitidos`
                                }
                            </p>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantidade</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity || ''}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                placeholder="Ex: 1000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço por KKS (R$)</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={price || ''}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                placeholder="Ex: 0.50"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddKKS}
                        disabled={loading || quantity <= 0 || price <= 0 || (!kksItem && !canCreate)}
                        className="w-full"
                    >
                        {loading ? 'Adicionando...' : 
                         (!kksItem && !canCreate) ? 'Limite de itens atingido' : 
                         'Adicionar KKS'}
                    </Button>
                </CardContent>
            </Card>

            {kksItem && (
                <Card>
                    <CardHeader>
                        <CardTitle>Atualizar Preço</CardTitle>
                        <CardDescription>
                            Altere o preço da moeda KKS
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPrice">Novo preço por KKS (R$)</Label>
                            <Input
                                id="newPrice"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={newPrice || ''}
                                onChange={(e) => setNewPrice(Number(e.target.value))}
                                placeholder={`Preço atual: R$ ${kksItem.rl_price.toFixed(2)}`}
                            />
                        </div>
                        <Button
                            onClick={handleUpdatePrice}
                            disabled={loading || newPrice <= 0}
                            className="w-full"
                            variant="outline"
                        >
                            {loading ? 'Atualizando...' : 'Atualizar Preço'}
                        </Button>
                    </CardContent>
                </Card>
            )}            {kksItem && (
                <Card>
                    <CardHeader>
                        <CardTitle>Remover KKS</CardTitle>
                        <CardDescription>
                            Remova moedas KKS do seu estoque (mínimo 1 KKS deve ser mantido)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="removeQuantity">
                                Quantidade a remover (máximo: {Math.max(0, kksItem.quantity - 1)})
                            </Label>
                            <Input
                                id="removeQuantity"
                                type="number"
                                min="1"
                                max={Math.max(0, kksItem.quantity - 1)}
                                value={removeQuantity || ''}
                                onChange={(e) => setRemoveQuantity(Number(e.target.value))}
                                placeholder={`Ex: ${Math.min(500, Math.max(0, kksItem.quantity - 1))}`}
                                disabled={kksItem.quantity <= 1}
                            />
                            {kksItem.quantity <= 1 && (
                                <p className="text-sm text-yellow-600">
                                    ⚠️ KKS deve manter pelo menos 1 unidade. Não é possível remover.
                                </p>
                            )}
                        </div>
                        <Button
                            onClick={handleRemoveKKS}
                            disabled={loading || removeQuantity <= 0 || kksItem.quantity <= 1 || removeQuantity > (kksItem.quantity - 1)}
                            className="w-full"
                            variant="destructive"
                        >
                            {loading ? 'Removendo...' : 'Remover KKS'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
