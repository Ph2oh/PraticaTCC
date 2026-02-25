import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCreateCliente } from "@/hooks/useClientes";

const formSchema = z.object({
    nome: z.string().min(3, "Informe o nome completo"),
    email: z.string().email("Informe um e-mail válido").optional().or(z.literal("")),
    telefone: z.string().min(10, "Informe um telefone válido"),
});

type FormValues = z.infer<typeof formSchema>;

interface NovoClienteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NovoClienteDialog({ open, onOpenChange }: NovoClienteDialogProps) {
    const createMutation = useCreateCliente();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            email: "",
            telefone: "",
        },
    });

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open, reset]);

    const onSubmit = (values: FormValues) => {
        createMutation.mutate(
            {
                nome: values.nome,
                email: values.email || "",
                telefone: values.telefone,
            },
            {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            }
        );
    };

    const isSubmitting = createMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Novo Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input
                            id="nome"
                            placeholder="Ex: João da Silva"
                            {...register("nome")}
                        />
                        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="joao@exemplo.com"
                            {...register("email")}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                            id="telefone"
                            placeholder="(00) 00000-0000"
                            {...register("telefone")}
                        />
                        {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
                    </div>

                    {createMutation.error && (
                        <p className="text-sm text-destructive">
                            {createMutation.error instanceof Error
                                ? createMutation.error.message
                                : "Erro ao criar cliente"}
                        </p>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-transparent bg-muted/50 hover:bg-muted"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                                </span>
                            ) : (
                                "Salvar Cliente"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
