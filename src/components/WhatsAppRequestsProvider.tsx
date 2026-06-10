import React from 'react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, ConfirmButton, CancelButton } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function WhatsAppRequestsProvider({ children }: { children: React.ReactNode }) {
    const { status, acceptRequest, rejectRequest } = useWhatsApp();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Form States
    const [tipoEvento, setTipoEvento] = React.useState('Casamento');
    const [casal, setCasal] = React.useState('');
    const [dataEvento, setDataEvento] = React.useState('');
    const [local, setLocal] = React.useState('');

    // Get the first pending request if any
    const pendingRequest = status.pendingRequests && status.pendingRequests.length > 0
        ? status.pendingRequests[0]
        : null;

    // Captura a hora exata em que a notificacao apareceu na tela do usuario
    // Permite mensurar a latencia entre o recebimento da mensagem e a exibicao do dialog
    const [horaNotificacao, setHoraNotificacao] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (pendingRequest) {
            setHoraNotificacao(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
            setHoraNotificacao(null);
        }
    }, [pendingRequest?.id]);

    // Parsing effect
    React.useEffect(() => {
        if (pendingRequest) {
            const originalMsg = pendingRequest.mensagemOriginal || '';
            const msg = originalMsg.toLowerCase();

            // Extract Tipo
            let tipo = 'Outro';
            if (msg.includes('casamento') || msg.includes('wedding')) tipo = 'Casamento';
            else if (msg.match(/pr[eé]\s*wedding/) || msg.includes('ensaio')) tipo = 'Pré Wedding';
            else if (msg.includes('civil')) tipo = 'Civil';
            else if (msg.includes('formatura') || msg.includes('formando')) tipo = 'Formatura';
            setTipoEvento(tipo);

            // Extract Casal heuristic (usando a mensagem original para preservar capitalização, mas regex case-insensitive)
            const casalMatch = originalMsg.match(/(?:sou|me chamo)\s+([a-zA-ZÀ-ÿ]+(?:\s+e\s+[a-zA-ZÀ-ÿ]+)?)/i) ||
                originalMsg.match(/([a-zA-ZÀ-ÿ]+)\s+e\s+([a-zA-ZÀ-ÿ]+)/i);

            if (casalMatch && casalMatch[2]) {
                // Remove espaços extras e preserva como o usuário digitou
                setCasal(`${casalMatch[1].trim()} e ${casalMatch[2].trim()}`);
            } else if (casalMatch && casalMatch[1]) {
                setCasal(casalMatch[1].trim());
            } else {
                setCasal('');
            }

            // Extract Data
            const numMatch = originalMsg.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
            if (numMatch) {
                setDataEvento(numMatch[1]);
            } else {
                setDataEvento('');
            }

            // Extract Local usando a mensagem original
            const localMatch = originalMsg.match(/(?:em|local|no|na)\s+([a-zA-ZÀ-ÿ0-9\s]+?)(?:[.,!?\n]|$)/i);
            if (localMatch && localMatch[1]) {
                let localRaw = localMatch[1].trim();
                // Apenas garante que a primeira letra seja maiúscula, mantendo as demais da forma como foram digitadas
                if (localRaw.length > 0) {
                   localRaw = localRaw.charAt(0).toUpperCase() + localRaw.slice(1);
                }
                setLocal(localRaw);
            } else {
                setLocal('');
            }
        }
    }, [pendingRequest]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingRequest) return;
        setIsProcessing(true);
        try {
            await acceptRequest(pendingRequest.id, {
                casal,
                dataEvento,
                tipoEvento,
                local
            });
            toast({
                title: "Orçamento Criado!",
                description: `O orçamento foi criado e adicionado a lista de orçamentos.`,
            });
            // Invalidate queries to refresh the kanban board if we are on that page
            queryClient.invalidateQueries({ queryKey: ['orcamentos', token] });
            queryClient.invalidateQueries({ queryKey: ['clientes', token] });
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao aceitar a solicitação.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!pendingRequest) return;
        setIsProcessing(true);
        try {
            await rejectRequest(pendingRequest.id);
            toast({
                title: "Solicitação Recusada",
                description: "A mensagem foi ignorada.",
            });
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao recusar a solicitação.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {children}
            <Dialog open={!!pendingRequest}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleAccept}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                Detectamos um novo orçamento
                            </DialogTitle>
                            <DialogDescription className="space-y-4 pt-4 text-left">
                                <p><strong>De:</strong> {pendingRequest?.clienteNome} ({pendingRequest?.whatsappFrom?.replace('@c.us', '')})</p>

                                <div className="bg-muted p-3 rounded-md text-sm italic border-l-4 border-primary/50 text-foreground">
                                    "{pendingRequest?.mensagemOriginal}"
                                </div>

                                {/* Exibe horarios para mensurar latencia entre recebimento e notificacao */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <strong>Mensagem:</strong>{' '}
                                        {pendingRequest?.timestamp
                                            ? new Date(pendingRequest.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                            : '--:--:--'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <strong>Notificacao:</strong> {horaNotificacao || '--:--:--'}
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground mt-1">Extraimos algumas informacoes automaticamente. Corrija o que for necessario antes de aceitar.</p>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="tipo" className="text-right">Evento</Label>
                                <div className="col-span-3">
                                    <Select value={tipoEvento} onValueChange={setTipoEvento}>
                                        <SelectTrigger id="tipo">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Casamento">Casamento</SelectItem>
                                            <SelectItem value="Pré Wedding">Pré Wedding</SelectItem>
                                            <SelectItem value="Civil">Civil</SelectItem>
                                            <SelectItem value="Formatura">Formatura</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="casal" className="text-right">Nomes</Label>
                                <Input
                                    id="casal"
                                    value={casal}
                                    onChange={(e) => setCasal(e.target.value)}
                                    placeholder="Ex: João e Maria"
                                    className="col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="data" className="text-right">Data</Label>
                                <Input
                                    id="data"
                                    value={dataEvento}
                                    onChange={(e) => setDataEvento(e.target.value)}
                                    placeholder="Ex: 12/10/2026, Fim do ano, Indefinido..."
                                    className="col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="local" className="text-right">Local</Label>
                                <Input
                                    id="local"
                                    value={local}
                                    onChange={(e) => setLocal(e.target.value)}
                                    placeholder="Ex: Espaço X, Sítio Y..."
                                    className="col-span-3"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <CancelButton onClick={handleReject} disabled={isProcessing} />
                            <ConfirmButton type="submit" loading={isProcessing} />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
