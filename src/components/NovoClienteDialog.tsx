import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NovoClienteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (cliente: any) => void;
}

export function NovoClienteDialog({ open, onOpenChange, onSave }: NovoClienteDialogProps) {
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        telefone: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSave) {
            onSave({
                ...formData,
                id: `CLI-${Math.floor(Math.random() * 10000)}`,
                totalOrcamentos: 0,
                ultimoContato: new Date().toISOString(),
            });
        }
        // Reset form after save
        setFormData({ nome: "", email: "", telefone: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Novo Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label htmlFor="nome" className="text-sm font-medium text-foreground">
                            Nome Completo
                        </label>
                        <Input
                            id="nome"
                            placeholder="Ex: João da Silva"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                            E-mail
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="joao@exemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                            Salvar Cliente
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
