import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
}

const InfoModal = ({ isOpen, onClose, title, description }: InfoModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        {title}
                    </DialogTitle>
                </DialogHeader>                <div className="mt-4">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {description}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InfoModal;
