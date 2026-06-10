import { AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button, CancelButton, ConfirmButton } from "@/components/ui/button";

interface ConfirmacaoReversaoDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmacaoReversaoDialog({ open, onConfirm, onCancel }: ConfirmacaoReversaoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-hidden">
                <div className="bg-warning/10 border-b border-warning/20 px-6 pt-6 pb-5">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-warning" />
                            </div>
                            <DialogTitle className="text-base font-semibold text-foreground">
                                Reverter Contrato?
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground pl-12">
                            Ao tirar este orçamento do status de "Contratado", a receita vinculada a ele será anulada preventivamente do painel financeiro.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5">
                    <p className="text-sm text-foreground">
                        Tem certeza que deseja alterar o status deste contrato? As métricas de receita serão alteradas.
                    </p>
                </div>

                <DialogFooter className="px-6 pb-5 gap-2 sm:gap-2">
                    <CancelButton onClick={onCancel} className="flex-1 sm:flex-none" />
                    <ConfirmButton
                        className="flex-1 sm:flex-none"
                        onClick={onConfirm}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
