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

// Carrega solicitações pendentes do banco para a RAM de forma sincronizada
// Evita race condition onde solicitações chegam enquanto o carregamento está em progresso
const loadPendingRequests = async (usuarioId: string): Promise<void> => {
    const session = activeSessions.get(usuarioId);
    if (!session) return;

    try {
        const solicitacoes = await prisma.solicitacaoWhatsApp.findMany({
            where: { usuarioId }
        });
        
        if (activeSessions.has(usuarioId)) {
            activeSessions.get(usuarioId)!.pendingRequests = solicitacoes.map(s => ({
                id: s.id,
                clienteId: s.clienteId,
                clienteNome: s.clienteNome,
                whatsappFrom: s.whatsappFrom,
                mensagemOriginal: s.mensagemOriginal,
                timestamp: s.criadoEm as any
            }));
            
            if (solicitacoes.length > 0) {
                console.log(`[Tenant: ${usuarioId}] Carregadas ${solicitacoes.length} solicitações pendentes do banco.`);
            }
        }
    } catch (err) {
        console.error(`[Tenant: ${usuarioId}] Erro ao carregar solicitações pendentes:`, err);
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

                // correcao deduplicacao: evita criar solicitacao duplicada
                // caso o whatsapp-web.js re-entregue a mensagem apos reconexao
                const jaTemSolicitacaoPendente = await prisma.solicitacaoWhatsApp.findFirst({
                    where: { usuarioId: usuarioId, whatsappFrom: message.from }
                });

                if (jaTemSolicitacaoPendente) {
                    console.log(`[Tenant: ${usuarioId}] Solicitação duplicada ignorada de: ${message.from}`);
                    return;
                }

                const solicitacao = await prisma.solicitacaoWhatsApp.create({

                    data: {
                        usuarioId: usuarioId,
                        clienteId: cliente.id,
                        whatsappFrom: message.from,
                        mensagemOriginal: message.body,
                        clienteNome: cliente.nome,
                    }
                });

                session.pendingRequests.push({
                    id: solicitacao.id,
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    whatsappFrom: message.from,
                    mensagemOriginal: message.body,
                    timestamp: solicitacao.criadoEm
                });

            } catch (error) {
                console.error(`[Tenant: ${usuarioId}] Erro ao processar mensagem do WhatsApp:`, error);
            }
        }
    });
};

const safeInitializeWhatsAppClient = async (usuarioId: string) => {
    let session = activeSessions.get(usuarioId);

    if (session?.client) {
        session.client.destroy().catch(() => { });
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

        // Carrega solicitações pendentes do banco de forma sincronizada (com await)
        // Isso garante que não há race condition entre o carregamento e novas mensagens
        await loadPendingRequests(usuarioId);
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
    // Inicializa de forma assincronizada sem bloquear a resposta ao cliente
    // O frontend fará polling para monitorar o progresso
    safeInitializeWhatsAppClient(usuarioId).catch(err => {
        console.error(`[Tenant: ${usuarioId}] Erro durante inicialização assincronizada:`, err);
    });
};

export const getWhatsAppStatus = async (usuarioId: string) => {
    const session = activeSessions.get(usuarioId);
    
    // Se não tem sessão ativa, retorna status vazio
    if (!session) {
        return { ready: false, qrCode: '', message: 'Aguardando inicialização manual...', pendingRequests: [], activeSession: false };
    }
    
    // Se tem sessão mas o array de pending está vazio, faz fallback ao banco
    // Isso evita que solicitações fiquem órfãs se houver descompasso entre RAM e BD
    let pendingRequests = session.pendingRequests;
    if (session.client && pendingRequests.length === 0) {
        try {
            const solicitacoesNoBanco = await prisma.solicitacaoWhatsApp.findMany({
                where: { usuarioId }
            });
            
            if (solicitacoesNoBanco.length > 0) {
                console.log(`[Tenant: ${usuarioId}] Sincronizando ${solicitacoesNoBanco.length} solicitações do banco para RAM.`);
                pendingRequests = solicitacoesNoBanco.map(s => ({
                    id: s.id,
                    clienteId: s.clienteId,
                    clienteNome: s.clienteNome,
                    whatsappFrom: s.whatsappFrom,
                    mensagemOriginal: s.mensagemOriginal,
                    timestamp: s.criadoEm as any
                }));
                session.pendingRequests = pendingRequests;
            }
        } catch (err) {
            console.error(`[Tenant: ${usuarioId}] Erro ao fazer fallback ao banco:`, err);
        }
    }
    
    return {
        ready: session.isReady,
        qrCode: session.qrCode,
        message: session.statusMessage,
        pendingRequests: pendingRequests,
        activeSession: true
    };
};

export interface WhatsAppDetalhesOpcionais {
    casal?: string;
    dataEvento?: string;
    tipoEvento?: string;
    local?: string;
}

export const acceptWhatsAppRequest = async (usuarioId: string, requestId: string, detalhes?: WhatsAppDetalhesOpcionais) => {
    const session = activeSessions.get(usuarioId);
    if (!session) throw new Error("Sessão do WhatsApp não encontrada");

    const requestIndex = session.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Solicitação não encontrada");

    const request = session.pendingRequests[requestIndex];

    try {
        let textoDetalhes = "";
        if (detalhes && (detalhes.casal || detalhes.dataEvento || detalhes.tipoEvento || detalhes.local)) {
            textoDetalhes = `Casal: ${detalhes.casal || 'Não informado'}\nData: ${detalhes.dataEvento || 'Não informada'}\nEvento: ${detalhes.tipoEvento || 'Outro'}\n Local: ${detalhes.local || 'Não informado'}\n\n`;
        }

        const novoOrcamento = await prisma.orcamento.create({
            data: {
                clienteId: request.clienteId,
                usuarioId: usuarioId,
                descricao: `Criado via WhatsApp (Aprovado).\n\n${textoDetalhes}Mensagem original:\n"${request.mensagemOriginal}"`,
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
        await prisma.solicitacaoWhatsApp.delete({ where: { id: requestId } }).catch(() => { });
        return novoOrcamento;
    } catch (e) {
        throw e;
    }
};

export const rejectWhatsAppRequest = async (usuarioId: string, requestId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session) return false;

    const requestIndex = session.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex !== -1) {
        session.pendingRequests.splice(requestIndex, 1);
        await prisma.solicitacaoWhatsApp.delete({ where: { id: requestId } }).catch(() => { });
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
            } catch (e) { }
        }
    }
};

process.on('SIGINT', async () => { await shutdownWhatsApp(); process.exit(0); });
process.on('SIGTERM', async () => { await shutdownWhatsApp(); process.exit(0); });
process.on('uncaughtException', async (err) => { console.error(err); await shutdownWhatsApp(); process.exit(1); });
