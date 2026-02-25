import { useState, useEffect } from 'react';

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
    pendingRequests?: PendingWhatsAppRequest[];
}

export function useWhatsApp() {
    const [status, setStatus] = useState<WhatsAppStatus>({ ready: false, qrCode: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/whatsapp/status');
                const data = await response.json();
                setStatus(data);
            } catch (error) {
                console.error("Erro ao checar status do WhatsApp:", error);
            } finally {
                setLoading(false);
            }
        };

        checkStatus();

        // Polling every 5 seconds
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const disconnect = async () => {
        try {
            setLoading(true);
            await fetch('http://localhost:3001/api/whatsapp/disconnect', { method: 'POST' });
            setStatus({ ready: false, qrCode: '', pendingRequests: [] });
        } catch (error) {
            console.error("Erro ao desconectar WhatsApp:", error);
        } finally {
            setLoading(false);
        }
    };

    const acceptRequest = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:3001/api/whatsapp/requests/${id}/accept`, { method: 'POST' });
            if (res.ok) {
                setStatus(prev => ({
                    ...prev,
                    pendingRequests: prev.pendingRequests?.filter(r => r.id !== id)
                }));
            }
            return await res.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const rejectRequest = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:3001/api/whatsapp/requests/${id}/reject`, { method: 'POST' });
            if (res.ok) {
                setStatus(prev => ({
                    ...prev,
                    pendingRequests: prev.pendingRequests?.filter(r => r.id !== id)
                }));
            }
            return await res.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return { status, loading, disconnect, acceptRequest, rejectRequest };
}
