import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '@/utils/auth';
import { useAuth } from '@/contexts/AuthContext';

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
    activeSession?: boolean;
    pendingRequests?: PendingWhatsAppRequest[];
    mobileOffline?: boolean;
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
    const { isAuthenticated } = useAuth();
    const { data: status = DEFAULT_STATUS, isLoading: loading } = useQuery<WhatsAppStatus>({
        queryKey: ['whatsapp-status'],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/status`, {
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    // Se retornar 401 ou 403, pode estar deslogado
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("Não autorizado");
                    }
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
            } catch (error) {
                return {
                    ...DEFAULT_STATUS,
                    message: error instanceof Error ? error.message : 'Erro desconhecido ao buscar status do WhatsApp.'
                };
            }
        },
        // Só faz refetch se o usuário estiver autenticado
        enabled: isAuthenticated,
        refetchInterval: (query) => {
            if (!isAuthenticated) return false;
            const data = query.state?.data as WhatsAppStatus | undefined;
            // Se a sessão está ativa MAS não conectada (aguardando QR ou inicializando), polling agressivo
            if (data && data.activeSession && !data.ready) return 1500;
            // Caso contrário usa polling relaxado
            return 5000;
        },
        refetchIntervalInBackground: true, // Garante que as notificações não atrasem quando minimizado
        // Reabilitar refetchOnWindowFocus: ao voltar para a aba após período longo,
        // garante uma consulta imediata sem aguardar o próximo ciclo de 5s
        refetchOnWindowFocus: true,
        staleTime: 0, // Garante que todos os refetches tragam dados frescos
    });

    const disconnectMutation = useMutation({
        mutationFn: async () => {
            await fetch(`${API_BASE}/disconnect`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        }
    });

    const acceptMutation = useMutation({
        mutationFn: async ({ id, detalhes }: { id: string, detalhes?: any }) => {
            const res = await fetch(`${API_BASE}/requests/${id}/accept`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ detalhes })
            });
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
            const res = await fetch(`${API_BASE}/requests/${id}/reject`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
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

    const startAuthMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/start`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const payload = await parseJsonSafe<{ success?: boolean; error?: string }>(res);

            if (!res.ok) {
                throw new Error(payload?.error || 'Erro ao inicializar contêiner');
            }

            return payload ?? { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        }
    });

    return {
        status,
        loading: loading || disconnectMutation.isPending || startAuthMutation.isPending,
        startConnection: () => startAuthMutation.mutateAsync(),
        disconnect: () => disconnectMutation.mutateAsync(),
        acceptRequest: (id: string, detalhes?: any) => acceptMutation.mutateAsync({ id, detalhes }),
        rejectRequest: (id: string) => rejectMutation.mutateAsync(id)
    };
}

