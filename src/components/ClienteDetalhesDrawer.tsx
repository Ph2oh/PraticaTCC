import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Mail, MapPin, Phone, User, Save, X, Edit2, MessageCircle } from "lucide-react";
import { useUpdateCliente } from "@/hooks/useClientes";
import { useConfig } from "@/hooks/useConfig";
import { useToast } from "@/hooks/use-toast";
import type { Cliente, Orcamento } from "@/types";

interface ClienteDetalhesDrawerProps {
    cliente: Cliente | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ClienteDetalhesDrawer({ cliente, isOpen, onClose }: ClienteDetalhesDrawerProps) {
    const [activeTab, setActiveTab] = useState("detalhes");
    const [isEditing, setIsEditing] = useState(false);

    // Formulário de edição
    const [editNome, setEditNome] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editTelefone, setEditTelefone] = useState("");

    const updateMutation = useUpdateCliente();
    const { toast } = useToast();
    const { data: config } = useConfig();

    // Sincroniza estado quando o cliente muda
    useEffect(() => {
        if (cliente) {
            setEditNome(cliente.nome);
            setEditEmail(cliente.email || "");
            setEditTelefone(cliente.telefone || "");
            setIsEditing(false);
            setActiveTab("detalhes");
        }
    }, [cliente]);

    if (!cliente) return null;

    const handleSaveEdits = () => {
        if (!editNome.trim()) {
            toast({ title: "Erro", description: "O nome não pode estar vazio", variant: "destructive" });
            return;
        }

        updateMutation.mutate({
            id: cliente.id,
            data: {
                nome: editNome,
                email: editEmail,
                telefone: editTelefone
            },
        }, {
            onSuccess: () => {
                setIsEditing(false);
                toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." });
            }
        });
    };

    const handleCancelEdits = () => {
        setEditNome(cliente.nome);
        setEditEmail(cliente.email || "");
        setEditTelefone(cliente.telefone || "");
        setIsEditing(false);
    }

    const openWhatsApp = () => {
        if (cliente.telefone) {
            const phone = cliente.telefone.replace(/\D/g, '');
            const message = config?.templateProposta
                ? config.templateProposta.replace(/{{cliente}}/g, cliente.nome).replace(/{{valor}}/g, "R$ 0,00").replace(/{{descricao}}/g, "o serviço em aberto")
                : `Olá ${cliente.nome}, tudo bem? Aqui é do nosso CRM.`;

            const encoded = encodeURIComponent(message);
            window.open(`https://wa.me/55${phone}?text=${encoded}`, '_blank');
        }
    };

    const copyToClipboard = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: `${subject} copiado para a área de transferência.` });
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto flex flex-col p-0">
                <div className="p-6 pb-4 border-b">
                    <SheetHeader className="text-left">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground mb-1">
                                    ID: {cliente.id}
                                </p>
                                {isEditing ? (
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Editando Cliente</h3>
                                ) : (
                                    <SheetTitle className="text-xl font-bold leading-tight flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">
                                            {cliente.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                        </div>
                                        {cliente.nome}
                                    </SheetTitle>
                                )}
                            </div>
                        </div>

                        {!isEditing && (
                            <SheetDescription className="mt-4 flex items-center gap-4">
                                <span className="text-sm font-medium text-foreground bg-muted/50 px-3 py-1 rounded-md">
                                    {cliente.totalOrcamentos} Orçamento(s)
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    Último contato: {new Date(cliente.ultimoContato).toLocaleDateString("pt-BR")}
                                </span>
                            </SheetDescription>
                        )}
                    </SheetHeader>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="detalhes">Informações Cadastrais</TabsTrigger>
                        <TabsTrigger value="historico">Orçamentos Vinculados</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="flex-1 space-y-6 animate-in fade-in-50 mt-0 pb-10">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm border-primary/50 ring-1 ring-primary/20">
                                    <div className="space-y-2">
                                        <Label htmlFor="nome">Nome Completo</Label>
                                        <Input
                                            id="nome"
                                            value={editNome}
                                            onChange={(e) => setEditNome(e.target.value)}
                                            placeholder="Ex: João da Silva"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                                        <Input
                                            id="telefone"
                                            value={editTelefone}
                                            onChange={(e) => setEditTelefone(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            placeholder="joao@exemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                                    Dados de Contato
                                </h3>
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Telefone</p>
                                                <p className="font-medium text-foreground">{cliente.telefone || "Não informado"}</p>
                                            </div>
                                        </div>
                                        {cliente.telefone && (
                                            <button
                                                onClick={() => copyToClipboard(cliente.telefone, "Telefone")}
                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all text-muted-foreground"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">E-mail</p>
                                                <p className="font-medium text-foreground">{cliente.email || "Não informado"}</p>
                                            </div>
                                        </div>
                                        {cliente.email && (
                                            <button
                                                onClick={() => copyToClipboard(cliente.email, "E-mail")}
                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all text-muted-foreground"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Endereço</p>
                                                <p className="font-medium text-foreground text-opacity-70 italic">Endereço ainda não mapeado no sistema</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="historico" className="flex-1 overflow-y-auto mt-0 animate-in fade-in-50 space-y-4 pt-4 pb-8">
                        {cliente.orcamentos && cliente.orcamentos.length > 0 ? (
                            <div className="space-y-3">
                                {cliente.orcamentos.map((orc: Orcamento) => (
                                    <div key={orc.id} className="border rounded-xl p-4 space-y-2 hover:border-primary/40 transition-colors bg-card shadow-sm cursor-default">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                                {orc.id}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${orc.status === 'pendente' ? 'bg-warning/10 text-warning' :
                                                orc.status === 'enviado' ? 'bg-primary/10 text-primary' :
                                                    orc.status === 'contratado' ? 'bg-success/10 text-success' :
                                                        'bg-destructive/10 text-destructive'
                                                }`}>
                                                {orc.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium line-clamp-2">{orc.descricao}</p>
                                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50 text-xs text-muted-foreground">
                                            <span>
                                                {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </span>
                                            <span>{new Date(orc.dataAtualizado).toLocaleDateString("pt-BR")}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center rounded-xl bg-muted/10 border border-dashed border-border/60">
                                <p className="text-sm text-muted-foreground">Nenhum orçamento encontrado para este cliente.</p>
                                <p className="text-xs text-muted-foreground mt-1">Crie pelo Kanban ou via mensagem do WhatsApp.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Footer actions */}
                <div className="p-4 border-t bg-muted/20 flex gap-2 shrink-0">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 flex items-center gap-2"
                                onClick={handleCancelEdits}
                                disabled={updateMutation.isPending}
                            >
                                <X className="w-4 h-4" /> Cancelar
                            </Button>
                            <Button
                                className="flex-1 flex items-center gap-2"
                                onClick={handleSaveEdits}
                                disabled={updateMutation.isPending}
                            >
                                <Save className="w-4 h-4" /> Salvar Contato
                            </Button>
                        </>
                    ) : (
                        <div className="flex w-full gap-2">
                            {activeTab === "detalhes" && (
                                <Button
                                    variant="outline"
                                    className="flex-1 flex items-center justify-center gap-2"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit2 className="w-4 h-4" /> Editar
                                </Button>
                            )}

                            <Button
                                onClick={openWhatsApp}
                                disabled={!cliente.telefone}
                                className="flex-[2] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
