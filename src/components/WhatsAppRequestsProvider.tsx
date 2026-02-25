import React from 'react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function WhatsAppRequestsProvider({ children }: { children: React.ReactNode }) {
    const { status, acceptRequest, rejectRequest } = useWhatsApp();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Get the first pending request if any
    const pendingRequest = status.pendingRequests && status.pendingRequests.length > 0
        ? status.pendingRequests[0]
        : null;

    const handleAccept = async () => {
        if (!pendingRequest) return;
        setIsProcessing(true);
        try {
            await acceptRequest(pendingRequest.id);
            toast({
                title: "Orçamento Criado!",
                description: `O orçamento para ${pendingRequest.clienteNome} foi criado e movido para o Kanban.`,
            });
            // Invalidate queries to refresh the kanban board if we are on that page
            queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
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
            <AlertDialog open={!!pendingRequest}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-success" />
                            Novo Pedido (WhatsApp)
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-4 text-left">
                            <p>O cliente <strong>{pendingRequest?.clienteNome}</strong> enviou uma mensagem solicitando um orçamento.</p>

                            <div className="bg-muted p-3 rounded-md text-sm italic border-l-4 border-primary/50 text-foreground">
                                "{pendingRequest?.mensagemOriginal}"
                            </div>

                            <p>Deseja gerar um Card de Orçamento (Pendente) para este cliente?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => { e.preventDefault(); handleReject(); }} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                            Ignorar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleAccept(); }} disabled={isProcessing} className="bg-success text-success-foreground hover:bg-success/90">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Criar Orçamento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
