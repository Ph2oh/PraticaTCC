import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Orcamento } from "@/data/mockData";
import StatusBadge from "./StatusBadge";
import { Copy, MapPin, MessageSquare, Phone, User } from "lucide-react";

interface DetalhesDrawerProps {
    orcamento: Orcamento | null;
    isOpen: boolean;
    onClose: () => void;
}

export function DetalhesDrawer({ orcamento, isOpen, onClose }: DetalhesDrawerProps) {
    if (!orcamento) return null;

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
                                <SheetTitle className="text-xl font-bold">
                                    {orcamento.descricao}
                                </SheetTitle>
                            </div>
                            <StatusBadge status={orcamento.status} />
                        </div>
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
                    </SheetHeader>
                </div>

                <Tabs defaultValue="detalhes" className="flex-1 flex flex-col px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                        <TabsTrigger value="historico">WhatsApp</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="flex-1 space-y-6 animate-in fade-in-50 mt-0">
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
                                        <p className="text-sm font-medium">{orcamento.cliente}</p>
                                        <p className="text-xs text-muted-foreground">Cliente Registrado</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Phone className="w-4 h-4 ml-2" />
                                        <span>{orcamento.telefone}</span>
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

                        {/* Descritivo */}
                        <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                Escopo do Serviço
                            </h3>
                            <p className="text-sm leading-relaxed text-foreground">
                                {orcamento.descricao}
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="historico" className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center mt-0 animate-in fade-in-50 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center border-2 border-dashed border-border mb-2">
                            <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Integração WhatsApp</h3>
                            <p className="text-sm text-muted-foreground max-w-[250px] mt-1 mx-auto">
                                Em breve o histórico de mensagens deste orçamento aparecerá aqui automaticamente.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="flex-1 mt-0 animate-in fade-in-50 relative pt-4 pb-8 pl-4">
                        {/* Simple Timeline mockup before implementing the real component */}
                        <div className="absolute left-[19px] top-6 bottom-4 w-px bg-border"></div>

                        <div className="space-y-6">
                            {/* Event 1 */}
                            <div className="flex gap-4 relative">
                                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-background border-2 border-primary mt-1 relative z-10"></div>
                                <div className="flex-1 bg-muted/30 p-3 rounded-lg border border-border">
                                    <p className="text-sm font-medium">Orçamento Criado</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(orcamento.dataRecebido).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            {/* Event 2 */}
                            <div className="flex gap-4 relative">
                                <div className="w-3 h-3 rounded-full bg-muted border-2 border-muted-foreground mt-1 relative z-10"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">Status atualizado para {orcamento.status}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(orcamento.dataAtualizado).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer actions */}
                <div className="p-4 border-t bg-muted/20 flex gap-2">
                    <button className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                        Abrir WhatsApp Web
                    </button>
                    <button className="px-4 py-2 rounded-lg border bg-background font-medium text-sm hover:bg-muted transition-colors">
                        Editar
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
