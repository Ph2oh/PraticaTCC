import { useState } from "react";
import { XCircle, AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Motivos de recusa definidos conforme levantamento do usuario.
// Novos motivos podem ser adicionados a esta lista no futuro sem alterar a logica do componente.
export const MOTIVOS_RECUSA = [
    { value: "Acima do orçamento", label: "Acima do orçamento", descricao: "O cliente considerou o valor fora do seu planejamento financeiro" },
    { value: "Cliente desqualificado", label: "Cliente desqualificado", descricao: "Orçamento para serviço fora do escopo ou lead não qualificado" },
    { value: "Data indisponível", label: "Data indisponível", descricao: "A data solicitada pelo cliente não está disponível na agenda" },
    { value: "Sem retorno do cliente", label: "Sem retorno do cliente", descricao: "Não obtive retorno do cliente após o envio do orçamento" },
    { value: "orcamento_de_teste", label: "Orçamento de teste", descricao: "Orçamento utilizado para testes ou demonstrações" },
] as const;

export type MotivoRecusaValue = typeof MOTIVOS_RECUSA[number]["value"];

interface MotivoRecusaDialogProps {
    open: boolean;
    onConfirm: (motivo: MotivoRecusaValue) => void;
    onCancel: () => void;
}

// Novo componente: dialog intermediario que intercepta a acao de mover para 'recusado'.
// Se o usuario cancelar, o status NAO e alterado (comportamento controlado pelo pai).
export function MotivoRecusaDialog({ open, onConfirm, onCancel }: MotivoRecusaDialogProps) {
    const [selecionado, setSelecionado] = useState<MotivoRecusaValue | null>(null);

    const handleConfirm = () => {
        if (!selecionado) return;
        onConfirm(selecionado);
        setSelecionado(null);
    };

    const handleCancel = () => {
        setSelecionado(null);
        onCancel();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
            <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
                {/* Header com fundo destrutivo sutil */}
                <div className="bg-destructive/8 border-b border-destructive/20 px-6 pt-6 pb-5">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                                <XCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <DialogTitle className="text-base font-semibold text-foreground">
                                Motivo da Recusa
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground pl-12">
                            Por que este orçamento não foi contratado? Isso ajuda a entender as rejeições nas métricas.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Opcoes */}
                <div className="px-6 py-5 space-y-2.5">
                    {MOTIVOS_RECUSA.map((motivo) => {
                        const isSelected = selecionado === motivo.value;
                        return (
                            <button
                                key={motivo.value}
                                type="button"
                                onClick={() => setSelecionado(motivo.value)}
                                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 group ${isSelected
                                        ? "border-destructive/60 bg-destructive/8 ring-1 ring-destructive/30"
                                        : "border-border hover:border-destructive/30 hover:bg-muted/40"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Radio visual customizado */}
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected
                                            ? "border-destructive bg-destructive"
                                            : "border-muted-foreground/40 group-hover:border-destructive/50"
                                        }`}>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium leading-none mb-1 ${isSelected ? "text-destructive" : "text-foreground"}`}>
                                            {motivo.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-snug">{motivo.descricao}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Aviso quando nenhuma opcao selecionada */}
                {!selecionado && (
                    <div className="mx-6 mb-4 flex items-center gap-2 text-xs text-muted-foreground/70 animate-in fade-in duration-200">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Selecione um motivo para continuar
                    </div>
                )}

                <DialogFooter className="px-6 pb-5 gap-2 sm:gap-2">
                    <Button variant="ghost" onClick={handleCancel} className="flex-1 sm:flex-none">
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!selecionado}
                        className="flex-1 sm:flex-none"
                    >
                        Confirmar Recusa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
