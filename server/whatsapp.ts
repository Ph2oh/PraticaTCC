import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export interface PendingRequest {
    id: string;
    clienteId: string;
    clienteNome: string;
    whatsappFrom: string;
    mensagemOriginal: string;
    timestamp: Date;
}

// Representa a gaveta de conexão única de um usuário (Tenant)
interface WhatsAppSession {
    client: any; // Instância do Cliente do wwebjs
    isReady: boolean;
    qrCode: string;
    statusMessage: string;
    pendingRequests: PendingRequest[];
    reconnectTimeout: ReturnType<typeof setTimeout> | null;
}

const prisma = new PrismaClient();

// Onde as múltiplas conexões ficarão em memória RAM
const activeSessions = new Map<string, WhatsAppSession>();

// Mapeamento dinâmico do local de salvamento dos caches do whatsapp por Tenant
const getSessionPath = (usuarioId: string) => path.join(process.cwd(), '.wwebjs_auth', `session-${usuarioId}`);

// Limpeza de lockfiles que impedem o Chromium de abrir (Error: Browser is already running)
const cleanupLocks = (usuarioId: string) => {
    const sessionPath = getSessionPath(usuarioId);
    const lockFiles = [
        path.join(sessionPath, 'SingletonLock'),
        path.join(sessionPath, 'lockfile'),
        path.join(sessionPath, 'DevToolsActivePort'),
    ];

    try {
        lockFiles.forEach((lockFilePath) => {
            if (fs.existsSync(lockFilePath)) fs.unlinkSync(lockFilePath);
        });
    } catch (err) {
        console.error(`Não foi possível limpar lockfiles do tenant ${usuarioId}`, err);
    }
};

const scheduleReconnect = (usuarioId: string, delayMs = 10000) => {
    const session = activeSessions.get(usuarioId);
    if (!session || session.reconnectTimeout) return;

    session.reconnectTimeout = setTimeout(() => {
        if (activeSessions.has(usuarioId)) {
            activeSessions.get(usuarioId)!.reconnectTimeout = null;
            safeInitializeWhatsAppClient(usuarioId);
        }
    }, delayMs);
};

const setupWhatsAppListeners = (usuarioId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session || !session.client) return;

    const { client } = session;

    client.on('ready', () => {
        console.log(`[Tenant: ${usuarioId}] Cliente do WhatsApp pronto e conectado!`);
        session.isReady = true;
        session.qrCode = '';
        session.statusMessage = 'WhatsApp conectado';
    });

    client.on('disconnected', (reason: any) => {
        console.warn(`[Tenant: ${usuarioId}] Cliente do WhatsApp desconectado:`, reason);
        session.isReady = false;
        session.qrCode = '';
        session.statusMessage = `WhatsApp desconectado: ${String(reason)}`;
        scheduleReconnect(usuarioId);
    });

    client.on('auth_failure', (message: any) => {
        console.error(`[Tenant: ${usuarioId}] Falha de autenticação do WhatsApp:`, message);
        session.isReady = false;
        session.qrCode = '';
        session.statusMessage = `Falha de autenticação. É necessário relogar.`;
        scheduleReconnect(usuarioId);
    });

    client.on('qr', async (qr: any) => {
        console.log(`[Tenant: ${usuarioId}] Novo QR Code gerado!`);
        session.statusMessage = 'QR Code gerado. Aguardando leitura pelo celular.';
        try {
            session.qrCode = await QRCode.toDataURL(qr);
        } catch (err) {
            session.qrCode = '';
            session.statusMessage = 'QR recebido, mas falhou ao converter para imagem.';
        }
    });

    client.on('message_create', async (message: any) => {
        if (message.from.includes('@g.us') || message.isStatus || message.fromMe) return;

        const body = message.body.toLowerCase();
        if (body.includes('orçamento') || body.includes('orcamento')) {
            console.log(`[Tenant: ${usuarioId}] Nova solicitação de orçamento: ${message.from}`);

            try {
                const contact = await message.getContact();
                const contactName = contact.name || contact.pushname || "Novo Cliente (WhatsApp)";
                const phoneNumber = message.from.replace('@c.us', '');

                let cliente = await prisma.cliente.findFirst({
                    where: { telefone: phoneNumber, usuarioId: usuarioId }
                });

                if (!cliente) {
                    cliente = await prisma.cliente.create({
                        data: {
                            nome: contactName,
                            email: '',
                            telefone: phoneNumber,
                            usuarioId: usuarioId
                        }
                    });
                }

                const hasPending = await prisma.orcamento.findFirst({
                    where: { clienteId: cliente.id, usuarioId: usuarioId, status: 'pendente' }
                });

                if (hasPending) return;

                const requestId = Date.now().toString() + Math.random().toString(36).substring(7);
                session.pendingRequests.push({
                    id: requestId,
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    whatsappFrom: message.from,
                    mensagemOriginal: message.body,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error(`[Tenant: ${usuarioId}] Erro ao processar mensagem do WhatsApp:`, error);
            }
        }
    });
};

const safeInitializeWhatsAppClient = (usuarioId: string) => {
    let session = activeSessions.get(usuarioId);
    
    if (session?.client) {
        session.client.destroy().catch(() => {});
    }

    if (!session) {
        session = {
            client: null,
            isReady: false,
            qrCode: '',
            statusMessage: 'Iniciando container WhatsApp...',
            pendingRequests: [],
            reconnectTimeout: null
        };
        activeSessions.set(usuarioId, session);
    } else {
        session.statusMessage = 'Reconectando ao WhatsApp...';
        session.isReady = false;
    }

    cleanupLocks(usuarioId);

    session.client = new Client({
        authStrategy: new LocalAuth({ clientId: usuarioId }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        }
    });

    session.client.initialize().catch((error: any) => {
        session!.isReady = false;
        session!.statusMessage = error instanceof Error ? error.message : 'Falha ao inicializar WhatsApp';
        console.error(`[Tenant: ${usuarioId}] Falha de Inicialização:`, error);
        scheduleReconnect(usuarioId);
    });

    setupWhatsAppListeners(usuarioId);
};

export const startWhatsAppClient = (usuarioId: string) => {
    console.log(`[Tenant: ${usuarioId}] Solicitada a ativação da integração WhatsApp.`);
    safeInitializeWhatsAppClient(usuarioId);
};

export const getWhatsAppStatus = (usuarioId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session) {
        return { ready: false, qrCode: '', message: 'Aguardando inicialização manual...', pendingRequests: [], activeSession: false };
    }
    return {
        ready: session.isReady,
        qrCode: session.qrCode,
        message: session.statusMessage,
        pendingRequests: session.pendingRequests,
        activeSession: true // Flag pra saber se o array bot existe
    };
};

export const acceptWhatsAppRequest = async (usuarioId: string, requestId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session) throw new Error("Sessão do WhatsApp não encontrada");

    const requestIndex = session.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Solicitação não encontrada");

    const request = session.pendingRequests[requestIndex];

    try {
        const novoOrcamento = await prisma.orcamento.create({
            data: {
                clienteId: request.clienteId,
                usuarioId: usuarioId,
                descricao: `Criado via WhatsApp (Aprovado).\n\nMensagem original:\n"${request.mensagemOriginal}"`,
                valor: 0,
                status: 'pendente',
                eventos: {
                    create: {
                        tipo: 'criado',
                        descricao: 'Orçamento criado via integração WhatsApp (Aprovado manualmente)',
                    }
                }
            }
        });

        await prisma.cliente.update({
            where: { id: request.clienteId },
            data: { totalOrcamentos: { increment: 1 } },
        });

        session.pendingRequests.splice(requestIndex, 1);
        return novoOrcamento;
    } catch (e) {
        throw e;
    }
};

export const rejectWhatsAppRequest = (usuarioId: string, requestId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session) return false;

    const requestIndex = session.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex !== -1) {
        session.pendingRequests.splice(requestIndex, 1);
        return true;
    }
    return false;
};

export const disconnectWhatsAppClient = async (usuarioId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session || !session.client) return false;

    console.log(`[Tenant: ${usuarioId}] Desconectando WhatsApp...`);
    try {
        await session.client.logout();
    } catch (e) {
        console.log("Erro no logout, forçando destroy...", e);
    }
    await session.client.destroy();
    
    session.isReady = false;
    session.qrCode = '';
    session.client = null;
    activeSessions.delete(usuarioId); // Desliga e remove da RAM
    return true;
};

const shutdownWhatsApp = async () => {
    console.log('Desligando todas as instâncias ativas do WhatsApp...');
    for (const [id, session] of activeSessions.entries()) {
        if (session.client) {
            try {
                await session.client.destroy();
                console.log(`Session ${id} destruída.`);
            } catch (e) {}
        }
    }
};

process.on('SIGINT', async () => { await shutdownWhatsApp(); process.exit(0); });
process.on('SIGTERM', async () => { await shutdownWhatsApp(); process.exit(0); });
process.on('uncaughtException', async (err) => { console.error(err); await shutdownWhatsApp(); process.exit(1); });
