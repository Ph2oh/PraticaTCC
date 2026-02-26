import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/whatsapp';

export interface PendingWhatsAppRequest {
    id: string;
    clienteId: string;
    clienteNome: string;
    whatsappFrom: string;
    mensagemOriginal: string;
    timestamp: string;
}

export interface WhatsAppStatus {
    ready: boolean;
    qrCode: string;
    disabled?: boolean;
    message?: string;
    pendingRequests?: PendingWhatsAppRequest[];
}

const DEFAULT_STATUS: WhatsAppStatus = {
    ready: false,
    qrCode: '',
    pendingRequests: [],
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
    const raw = await response.text();
    if (!raw) return null;

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function useWhatsApp() {
    const queryClient = useQueryClient();

    const { data: status = DEFAULT_STATUS, isLoading: loading } = useQuery<WhatsAppStatus>({
        queryKey: ['whatsapp-status'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/status`);
            if (!response.ok) {
                return {
                    ...DEFAULT_STATUS,
                    message: 'Servidor de WhatsApp indisponível no momento.'
                };
            }

            const data = await parseJsonSafe<WhatsAppStatus>(response);
            if (!data) {
                return {
                    ...DEFAULT_STATUS,
                    message: 'Resposta inválida ao consultar status do WhatsApp.'
                };
            }

            // Para evitar piscar a tela, tentamos manter o QRcode anterior se o servidor estiver carregando um novo
            const prevStatus = queryClient.getQueryData<WhatsAppStatus>(['whatsapp-status']);
            const shouldKeepPreviousQr = !data.ready && !data.disabled && !data.qrCode && prevStatus?.qrCode;

            return {
                ...data,
                pendingRequests: data.pendingRequests || [],
                qrCode: shouldKeepPreviousQr ? prevStatus.qrCode : (data.qrCode || ''),
            };
        },
        refetchInterval: 5000,
        refetchOnWindowFocus: false, // Prevents reset on tab switching
        staleTime: 4000,
    });

    const disconnectMutation = useMutation({
        mutationFn: async () => {
            await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        }
    });

    const acceptMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE}/requests/${id}/accept`, { method: 'POST' });
            const payload = await parseJsonSafe<{ success?: boolean; error?: string; orcamento?: unknown }>(res);

            if (!res.ok) {
                throw new Error(payload?.error || 'Erro ao aprovar solicitação');
            }

            return payload ?? { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE}/requests/${id}/reject`, { method: 'POST' });
            const payload = await parseJsonSafe<{ success?: boolean; error?: string }>(res);

            if (!res.ok) {
                throw new Error(payload?.error || 'Erro ao recusar solicitação');
            }

            return payload ?? { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        }
    });

    return { 
        status, 
        loading: loading || disconnectMutation.isPending, 
        disconnect: () => disconnectMutation.mutateAsync(), 
        acceptRequest: (id: string) => acceptMutation.mutateAsync(id), 
        rejectRequest: (id: string) => rejectMutation.mutateAsync(id) 
    };
}

