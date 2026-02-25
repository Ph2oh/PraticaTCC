import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientes } from "@/hooks/useClientes";
import { useCreateOrcamento } from "@/hooks/useOrcamentos";

const formSchema = z.object({
    clienteId: z.string().optional(),
    clienteNome: z.string().optional(),
    telefone: z.string().optional(),
    descricao: z.string().min(5, "Descreva o serviço"),
    valor: z.coerce.number().min(1, "Informe um valor maior que zero"),
});

type FormValues = z.infer<typeof formSchema>;

interface NovoOrcamentoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NovoOrcamentoDialog({ open, onOpenChange }: NovoOrcamentoDialogProps) {
    const { data: clientes = [] } = useClientes();
    const createMutation = useCreateOrcamento();
    const [clienteMode, setClienteMode] = useState<"existente" | "novo">("existente");

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        setError,
        clearErrors,
        watch,
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clienteId: "",
            clienteNome: "",
            telefone: "",
            descricao: "",
            valor: 0,
        },
    });

    const selectedClienteId = watch("clienteId");
    const isNovoClienteMode = clienteMode === "novo";

    useEffect(() => {
        if (!open) {
            reset();
            setClienteMode("existente");
        }
    }, [open, reset]);

    const handleSelectCliente = (clienteId: string) => {
        const cliente = clientes.find((c) => c.id === clienteId);
        if (cliente) {
            setClienteMode("existente");
            setValue("clienteId", cliente.id);
            setValue("clienteNome", cliente.nome);
            setValue("telefone", cliente.telefone || "");
            clearErrors("clienteId");
        }
    };

    const activateNovoClienteMode = () => {
        setClienteMode("novo");
        setValue("clienteId", "");
        setValue("clienteNome", "");
        setValue("telefone", "");
        clearErrors("clienteId");
    };

    const activateClienteExistenteMode = () => {
        setClienteMode("existente");
    };

    const onSubmit = (values: FormValues) => {
        if (!isNovoClienteMode && !values.clienteId) {
            setError("clienteId", { message: "Selecione um cliente existente para continuar." });
            return;
        }

        if (isNovoClienteMode) {
            const nomeValido = (values.clienteNome || "").trim().length >= 3;
            const telefoneValido = (values.telefone || "").trim().length >= 10;

            if (!nomeValido) {
                setError("clienteNome", { message: "Informe o nome do cliente" });
                return;
            }

            if (!telefoneValido) {
                setError("telefone", { message: "Informe um telefone válido" });
                return;
            }
        }

        const clienteSelecionado = clientes.find((c) => c.id === values.clienteId);
        const clienteNome = isNovoClienteMode ? (values.clienteNome || "") : (clienteSelecionado?.nome || values.clienteNome || "");
        const telefone = isNovoClienteMode ? (values.telefone || "") : (clienteSelecionado?.telefone || values.telefone || "");

        createMutation.mutate(
            {
                clienteId: !isNovoClienteMode ? values.clienteId || undefined : undefined,
                clienteNome,
                telefone,
                descricao: values.descricao,
                valor: values.valor,
            },
            {
                onSuccess: () => {
                    reset();
                    setClienteMode("existente");
                    onOpenChange(false);
                },
            }
        );
    };

    const isSubmitting = createMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Novo Orçamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
                    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                        <div className="grid grid-cols-2 gap-2 rounded-md bg-background p-1 border border-border">
                            <button
                                type="button"
                                onClick={activateClienteExistenteMode}
                                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    !isNovoClienteMode
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                <Users className="h-4 w-4" /> Cliente existente
                            </button>
                            <button
                                type="button"
                                onClick={activateNovoClienteMode}
                                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    isNovoClienteMode
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                <UserPlus className="h-4 w-4" /> Novo cliente
                            </button>
                        </div>
                        {!isNovoClienteMode && (
                            <>
                                <Label htmlFor="cliente-select" className="text-sm font-medium">Selecionar cliente existente</Label>
                                <Select onValueChange={handleSelectCliente} value={selectedClienteId || ""}>
                                    <SelectTrigger id="cliente-select">
                                        <SelectValue placeholder="Selecione um cliente existente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clientes.map((cliente) => (
                                            <SelectItem key={cliente.id} value={cliente.id}>
                                                {cliente.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                        {errors.clienteId && (
                            <p className="text-xs text-destructive">{errors.clienteId.message}</p>
                        )}
                        {!isNovoClienteMode && (
                            <p className="text-xs text-muted-foreground">
                                Cliente selecionado. Os dados abaixo já foram preenchidos automaticamente.
                            </p>
                        )}
                    </div>

                    {isNovoClienteMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border-2 border-primary bg-primary/10 p-4 shadow-sm">
                            <div className="space-y-2">
                                <Label htmlFor="clienteNome" className="text-sm font-semibold text-primary">Nome do cliente</Label>
                                <Input
                                    id="clienteNome"
                                    placeholder="Nome do cliente"
                                    className="border-primary/50 focus:ring-primary"
                                    {...register("clienteNome")}
                                />
                                {errors.clienteNome && (
                                    <p className="text-xs text-destructive">{errors.clienteNome.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone" className="text-sm font-semibold text-primary">Telefone</Label>
                                <Input
                                    id="telefone"
                                    placeholder="(00) 00000-0000"
                                    className="border-primary/50 focus:ring-primary"
                                    {...register("telefone")}
                                />
                                {errors.telefone && (
                                    <p className="text-xs text-destructive">{errors.telefone.message}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente selecionado</p>
                            <p className="text-sm font-medium text-card-foreground">{watch("clienteNome")}</p>
                            <p className="text-sm text-muted-foreground">{watch("telefone")}</p>
                        </div>
                    )}

                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                        <Label htmlFor="descricao">Descrição do serviço</Label>
                        <Textarea
                            id="descricao"
                            placeholder="Descreva os detalhes do orçamento"
                            {...register("descricao")}
                        />
                        {errors.descricao && (
                            <p className="text-xs text-destructive">{errors.descricao.message}</p>
                        )}
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                        <Label htmlFor="valor">Valor estimado (R$)</Label>
                        <Input
                            id="valor"
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="0,00"
                            {...register("valor")}
                        />
                        {errors.valor && (
                            <p className="text-xs text-destructive">{errors.valor.message}</p>
                        )}
                    </div>

                    {createMutation.error && (
                        <p className="text-sm text-destructive">
                            {createMutation.error instanceof Error
                                ? createMutation.error.message
                                : "Erro ao criar orçamento"}
                        </p>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
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
                                "Criar Orçamento"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}