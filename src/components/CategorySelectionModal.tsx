import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '@/contexts/SupabaseItemsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GamepadIcon, SwordIcon, ShieldIcon, PackageIcon, StarIcon, FlameIcon, BoxIcon, TagIcon } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getConfig } from '@/lib/config';

interface CategorySelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const categories: Array<{
    section: string;
    items: Array<{
        id: Category;
        name: string;
        description: string;
        icon: React.ReactNode;
        color: string;
    }>;
}> = [
        {
            section: 'Rucoy', items: [{
                id: 'kina',
                name: 'Kina',
                description: 'Contas especializadas em Kina',
                icon: <SwordIcon className="h-6 w-6" />,
                color: 'bg-kina-bg/90 text-kina-light border-kina-primary/50'
            },
            {
                id: 'mage',
                name: 'Mage',
                description: 'Contas de magos',
                icon: <StarIcon className="h-6 w-6" />,
                color: 'bg-mage-bg/90 text-mage-light border-mage-primary/50'
            },
            {
                id: 'pally',
                name: 'Pally',
                description: 'Contas de paladinos',
                icon: <ShieldIcon className="h-6 w-6" />,
                color: 'bg-pally-bg/90 text-pally-light border-pally-primary/50'
            }, {
                id: 'itens',
                name: 'Itens',
                description: 'Itens diversos para Rucoy',
                icon: <BoxIcon className="h-6 w-6" />,
                color: 'bg-itens-bg/90 text-itens-light border-itens-primary/50'
            }
            ]
        },
        {
            section: 'Outros Jogos', items: [{
                id: 'supercell',
                name: 'Supercell',
                description: 'Contas da Supercell',
                icon: <GamepadIcon className="h-6 w-6" />,
                color: 'bg-gaming-accent/20 text-gaming-accent border-gaming-accent/30'
            },
            {
                id: 'freefire',
                name: 'Free Fire',
                description: 'Contas do Free Fire',
                icon: <FlameIcon className="h-6 w-6" />,
                color: 'bg-gaming-primary/20 text-gaming-primary border-gaming-primary/30'
            },
            {
                id: 'outros',
                name: 'Outros',
                description: 'Outras categorias de jogos',
                icon: <PackageIcon className="h-6 w-6" />,
                color: 'bg-muted/50 text-muted-foreground border-muted'
            }
            ]
        },
        {
            section: 'Geral', items: [
                {
                    id: 'geral',
                    name: 'Geral',
                    description: 'Todas as contas disponíveis',
                    icon: <PackageIcon className="h-6 w-6" />,
                    color: 'bg-geral-bg/90 text-geral-light border-geral-primary/50'
                },
                {
                    id: 'promocoes',
                    name: 'Divulgações',
                    description: 'Divulgações diárias',
                    icon: <TagIcon className="h-6 w-6" />,
                    color: 'bg-divulgacoes-bg/90 text-divulgacoes-light border-divulgacoes-primary/50'
                }
            ]
        }
    ];

const CategorySelectionModal = ({ isOpen, onClose }: CategorySelectionModalProps) => {
    const navigate = useNavigate();
    const { user } = useSupabaseAuth();
    const config = getConfig();

    const handleCategorySelect = (category: Category) => {
        navigate(`/category/${category}`);
        onClose();
    }; return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-xl font-bold text-center">
                        Escolha uma Categoria
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
                    {categories
                        .map((section) => (
                            <div key={section.section}>
                                <h3 className="text-base font-semibold mb-2 text-center text-muted-foreground">
                                    {section.section}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {section.items.map((category) => (<Button
                                    key={category.id}
                                    variant="outline"
                                    className={`h-auto p-4 flex flex-col items-center gap-2 transition-all hover:bg-opacity-80 hover:border-opacity-100 ${category.color}`}
                                    onClick={() => handleCategorySelect(category.id)}
                                >
                                    <div className="w-6 h-6">
                                        {category.icon}
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-semibold text-sm">{category.name}</h4>
                                        <p className="text-xs opacity-70">{category.description}</p>
                                    </div>
                                </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CategorySelectionModal;
