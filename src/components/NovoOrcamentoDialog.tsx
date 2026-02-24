import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NovoOrcamentoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (orcamento: any) => void;
}

export function NovoOrcamentoDialog({ open, onOpenChange, onSave }: NovoOrcamentoDialogProps) {
    const [formData, setFormData] = useState({
        cliente: "",
        telefone: "",
        descricao: "",
        valor: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSave) {
            onSave({
                ...formData,
                id: `ORC-${Math.floor(Math.random() * 10000)}`,
                valor: parseFloat(formData.valor) || 0,
                status: "pendente",
                dataRecebido: new Date().toISOString(),
                dataAtualizado: new Date().toISOString(),
            });
        }
        setFormData({ cliente: "", telefone: "", descricao: "", valor: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Novo Orçamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="cliente" className="text-sm font-medium text-foreground">
                                Cliente
                            </label>
                            <Input
                                id="cliente"
                                placeholder="Nome do cliente"
                                value={formData.cliente}
                                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="telefone" className="text-sm font-medium text-foreground">
                                Telefone
                            </label>
                            <Input
                                id="telefone"
                                placeholder="(00) 00000-0000"
                                value={formData.telefone}
                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="descricao" className="text-sm font-medium text-foreground">
                            Descrição do Serviço
                        </label>
                        <Input
                            id="descricao"
                            placeholder="Ex: Ensaio fotográfico corporativo"
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="valor" className="text-sm font-medium text-foreground">
                            Valor Estimado (R$)
                        </label>
                        <Input
                            id="valor"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-transparent bg-muted/50 hover:bg-muted"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Criar Orçamento
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
