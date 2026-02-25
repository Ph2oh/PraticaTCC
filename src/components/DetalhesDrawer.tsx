import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Orcamento } from "@/types";
import StatusBadge from "./StatusBadge";
import type { Status } from "./StatusBadge";
import { Copy, MapPin, MessageSquare, Phone, User, MessageCircle, Save, X, Edit2 } from "lucide-react";
import { useUpdateOrcamento } from "@/hooks/useOrcamentos";
import { useConfig } from "@/hooks/useConfig";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface DetalhesDrawerProps {
    orcamento: Orcamento | null;
    isOpen: boolean;
    onClose: () => void;
}

const statusColorsForTimeline: Record<string, string> = {
    pendente: "bg-warning border-warning",
    enviado: "bg-primary border-primary",
    contratado: "bg-success border-success",
    recusado: "bg-destructive border-destructive",
};

export function DetalhesDrawer({ orcamento, isOpen, onClose }: DetalhesDrawerProps) {
    const [activeTab, setActiveTab] = useState("detalhes");
    const [isEditing, setIsEditing] = useState(false);
    const [editDescricao, setEditDescricao] = useState("");
    const [editValor, setEditValor] = useState("");
    const updateMutation = useUpdateOrcamento();

    // Configurações globais (Templates)
    const { data: config } = useConfig();

    // Sincroniza estado local quando orçamento muda
    useEffect(() => {
        if (orcamento) {
            setEditDescricao(orcamento.descricao);
            setEditValor(orcamento.valor.toString());
            setIsEditing(false); // reseta modo edição ao trocar orçamento
        }
    }, [orcamento]);

    if (!orcamento) return null;

    const handleStatusChange = (newStatus: Status) => {
        updateMutation.mutate({
            id: orcamento.id,
            data: { status: newStatus },
        });
    };

    const handleSaveEdits = () => {
        let cleanValue = editValor;
        if (typeof cleanValue === 'string') {
            cleanValue = cleanValue.replace('R$', '').trim();
            if (cleanValue.includes(',') && cleanValue.includes('.')) {
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
            } else if (cleanValue.includes(',')) {
                cleanValue = cleanValue.replace(',', '.');
            }
        }

        const floatValor = parseFloat(cleanValue);
        if (isNaN(floatValor)) return;

        updateMutation.mutate({
            id: orcamento.id,
            data: {
                descricao: editDescricao,
                valor: floatValor
            },
        }, {
            onSuccess: () => {
                setIsEditing(false);
            }
        });
    };

    const handleCancelEdits = () => {
        setEditDescricao(orcamento.descricao);
        setEditValor(orcamento.valor.toString());
        setIsEditing(false);
    }

    const handleOpenWhatsApp = (customText?: string) => {
        if (orcamento.cliente?.telefone) {
            const phone = orcamento.cliente.telefone.replace(/\D/g, '');
            let message = customText || `Olá ${orcamento.cliente.nome}, tudo bem? Gostaria de falar sobre o seu orçamento.`;
            const encoded = encodeURIComponent(message);
            window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`, '_blank');
        }
    };

    const parseTemplate = (text: string) => {
        if (!text) return "";
        let parsed = text;
        parsed = parsed.replace(/{{cliente}}/g, orcamento?.cliente?.nome || "");
        parsed = parsed.replace(/{{valor}}/g, orcamento?.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "");
        parsed = parsed.replace(/{{descricao}}/g, orcamento?.descricao || "");
        return parsed;
    };

    const whatsappTemplates = config ? [
        {
            title: "Enviar Proposta",
            text: parseTemplate(config.templateProposta)
        },
        {
            title: "Lembrete / Follow-up",
            text: parseTemplate(config.templateLembrete)
        },
        {
            title: "Agradecimento / Contrato",
            text: parseTemplate(config.templateAgradecimento)
        }
    ] : [];

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto flex flex-col p-0">
                <div className="p-6 pb-4 border-b">
                    <SheetHeader className="text-left">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground mb-1">
                                    {orcamento.id}
                                </p>
                                {isEditing ? (
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Editando Orçamento</h3>
                                ) : (
                                    <SheetTitle className="text-xl font-bold leading-tight" title={orcamento.descricao}>
                                        {orcamento.descricao.length > 60 ? orcamento.descricao.substring(0, 60) + "..." : orcamento.descricao}
                                    </SheetTitle>
                                )}
                            </div>
                            <StatusBadge status={orcamento.status} />
                        </div>

                        {!isEditing && (
                            <SheetDescription className="mt-4 flex items-center gap-2">
                                <span className="text-lg font-bold text-foreground">
                                    {orcamento.valor.toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    })}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    • Atualizado em {new Date(orcamento.dataAtualizado).toLocaleDateString("pt-BR")}
                                </span>
                            </SheetDescription>
                        )}
                    </SheetHeader>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                        <TabsTrigger value="historico">WhatsApp</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="flex-1 space-y-6 animate-in fade-in-50 mt-0 pb-10">
                        {/* Card Info Cliente */}
                        <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                Informações do Cliente
                            </h3>

                            <div className="grid gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{orcamento.cliente?.nome || "Cliente não informado"}</p>
                                        <p className="text-xs text-muted-foreground">Cliente Registrado</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4 ml-2" />
                                        <span>{orcamento.cliente?.telefone || "Telefone não informado"}</span>
                                    </div>
                                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all text-muted-foreground">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4 ml-2" />
                                        <span>Endereço não informado</span>
                                    </div>
                                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all text-muted-foreground">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Campos de Edição ou Visualização */}
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm border-primary/50 ring-1 ring-primary/20">
                                    <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                                            Valor
                                        </h3>
                                        <Input
                                            type="text"
                                            value={editValor}
                                            onChange={(e) => setEditValor(e.target.value)}
                                            className="font-medium"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                                            Escopo do Serviço
                                        </h3>
                                        <Textarea
                                            value={editDescricao}
                                            onChange={(e) => setEditDescricao(e.target.value)}
                                            className="min-h-[120px] resize-none"
                                            placeholder="Descreva o serviço..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider m-0">
                                        Escopo do Serviço
                                    </h3>
                                </div>
                                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                    {orcamento.descricao}
                                </p>
                            </div>
                        )}

                        {/* Status Alterar */}
                        <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                Alterar Status
                            </h3>
                            <Select value={orcamento.status} onValueChange={(value) => handleStatusChange(value as Status)} disabled={isEditing}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Mudar status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="enviado">Enviado</SelectItem>
                                    <SelectItem value="contratado">Contratado</SelectItem>
                                    <SelectItem value="recusado">Recusado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    <TabsContent value="historico" className="flex-1 overflow-y-auto mt-0 animate-in fade-in-50 space-y-4 pt-4 pb-8 pl-[2px] pr-2">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                Comunicação Rápida
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Envie mensagens padronizadas diretamente para o WhatsApp do cliente através da sessão no seu navegador.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {whatsappTemplates.map((template, idx) => (
                                <div key={idx} className="border rounded-lg p-3 space-y-2 hover:border-primary/40 transition-colors bg-card">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-sm">{template.title}</h4>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleOpenWhatsApp(template.text)}
                                            disabled={!orcamento.cliente?.telefone}
                                            className="h-8 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400"
                                        >
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Enviar
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md">
                                        {template.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="flex-1 mt-0 animate-in fade-in-50 relative pt-4 pb-8 pl-4">
                        {orcamento.eventos && orcamento.eventos.length > 0 ? (
                            <>
                                <div className="absolute left-[19px] top-6 bottom-4 w-px bg-gradient-to-b from-primary to-muted"></div>

                                <div className="space-y-6">
                                    {orcamento.eventos.map((evento, index) => {
                                        const isFirst = index === 0;
                                        const isStatusChange = evento.tipo === 'status_alterado';

                                        // Usa as cores do mapa com base no statusNovo, caso seja mudança, senão usa border padrão
                                        const timelineDotColors = isStatusChange && evento.statusNovo
                                            ? statusColorsForTimeline[evento.statusNovo]
                                            : 'bg-muted border-muted-foreground';

                                        return (
                                            <div key={evento.id} className="flex gap-4 relative">
                                                <div className={`w-3 h-3 rounded-full ring-4 ring-background border-2 mt-1 relative z-10 ${isFirst ? 'bg-primary border-primary' : timelineDotColors
                                                    }`}></div>
                                                <div className={`flex-1 p-3 rounded-lg border ${isFirst ? 'bg-primary/5 border-primary/20' : isStatusChange ? 'bg-muted/10 border-border/50' : 'bg-muted/30 border-border'
                                                    }`}>
                                                    <p className="text-sm font-medium">{evento.descricao}</p>
                                                    {isStatusChange && evento.statusAntigo && evento.statusNovo && (
                                                        <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-2">
                                                            <span className="line-through opacity-50 capitalize">{evento.statusAntigo}</span>
                                                            <span className="text-foreground capitalize">{evento.statusNovo}</span>
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {new Date(evento.criadoEm).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center py-8">
                                <div>
                                    <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Footer actions */}
                <div className="p-4 border-t bg-muted/20 flex gap-2 shrink-0">
                    {activeTab === "historico" && (
                        <Button
                            onClick={() => handleOpenWhatsApp()}
                            disabled={!orcamento.cliente?.telefone}
                            className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Conversar no WhatsApp
                        </Button>
                    )}
                    {activeTab === "detalhes" && (
                        isEditing ? (
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
                                    <Save className="w-4 h-4" /> Salvar
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full flex items-center gap-2"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="w-4 h-4" /> Editar Orçamento
                            </Button>
                        )
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
