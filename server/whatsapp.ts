import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
    // Rastreamento de sincronização pausada (quando app móvel fica offline)
    // Utilizado para notificações ao usuário e logging
    isMobileOffline: boolean;
    lastOfflineTime: Date | null;
    // Número de WhatsApp conectado (extraído de client.info.wid.user quando session fica ready)
    // Útil para disambiguação quando múltiplas contas são usadas
    connectedNumber: string | null;
    // Rastreamento de reconexões para implementar backoff exponencial e evitar poluição de logs e tentativas infrutíferas quando Chromium está em estado ruim
    reconnectAttempts: number;
    lastReconnectAttemptTime: Date | null;
}

const prisma = new PrismaClient();

// Onde as múltiplas conexões ficarão em memória RAM
const activeSessions = new Map<string, WhatsAppSession>();

// Mapeamento dinâmico do local de salvamento dos caches do whatsapp por Tenant
const getSessionPath = (usuarioId: string) => path.join(process.cwd(), '.wwebjs_auth', `session-${usuarioId}`);

// Limpeza de lockfiles e processos Chromium orfaos
// Implementação: Força limpeza para evitar "Browser is already running" na VPS
const cleanupLocks = (usuarioId: string) => {
    const sessionPath = getSessionPath(usuarioId);
    const lockFiles = [
        path.join(sessionPath, 'SingletonLock'),
        path.join(sessionPath, 'lockfile'),
        path.join(sessionPath, 'DevToolsActivePort'),
    ];

    try {
        lockFiles.forEach((lockFilePath) => {
            if (fs.existsSync(lockFilePath)) {
                try {
                    fs.unlinkSync(lockFilePath);
                } catch (err) {
                    console.debug(`Erro ao deletar lockfile ${lockFilePath}:`, err);
                }
            }
        });
    } catch (err) {
        console.error(`Erro ao limpar lockfiles do tenant ${usuarioId}:`, err);
    }
    
    // Mata processos Chromium orfaos associados a esse tenant (backoff 10s em VPS)
    // Necessário porque whatsapp-web.js pode deixar processos zumbis ao desconectar
    try {
        // Busca por processos chromium e chrome que possam estar orfaos
        // Usa kill -9 para forçar término imediato
        execSync(`pkill -9 -f "session-${usuarioId}"`, { stdio: 'ignore' });
    } catch (err) {
        console.debug(`Nenhum processo Chromium orfao encontrado para tenant ${usuarioId}`);
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

const scheduleReconnect = (usuarioId: string, delayMs?: number) => {
    const session = activeSessions.get(usuarioId);
    if (!session || session.reconnectTimeout) return;

    // Usa backoff exponencial se não foi especificado delay
    // Primeiro calcula tentativas do tipo: 2s, 4s, 8s, 16s, 32s, até 60s máximo
    let delay = delayMs;
    if (!delay) {
        session.reconnectAttempts++;
        // Backoff exponencial: 2^attempts segundos, mínimo 2s, máximo 60s
        delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts - 1), 60000);
        console.log(`[Tenant: ${usuarioId}] Tentativa de reconexão ${session.reconnectAttempts} agendada em ${delay / 1000}s.`);
    }

    session.lastReconnectAttemptTime = new Date();
    session.reconnectTimeout = setTimeout(() => {
        if (activeSessions.has(usuarioId)) {
            activeSessions.get(usuarioId)!.reconnectTimeout = null;
            safeInitializeWhatsAppClient(usuarioId).catch(err => {
                console.error(`[Tenant: ${usuarioId}] Erro na reconexão:`, err.message);
            });
        }
    }, delay);
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
        
        // Reseta contador de reconexões (sucesso completo!)
        // Próxima falha começará do backoff inicial (2 segundos)
        if (session.reconnectAttempts > 0) {
            console.log(`[Tenant: ${usuarioId}] Reconexão bem-sucedida após ${session.reconnectAttempts} tentativa(s).`);
            session.reconnectAttempts = 0;
        }
        
        // Extrai o número de WhatsApp conectado
        // Tenta múltiplas formas de acessar: wid.user, wid._serialized, ou info completo
        try {
            let phoneNumber = null;
            
            // Tenta client.info.wid.user (formato: XX9XXXXXXXXXX)
            if (client.info?.wid?.user) {
                phoneNumber = client.info.wid.user;
            }
            // Tenta client.info.wid._serialized (formato: XX9XXXXXXXXXX@c.us)
            else if (client.info?.wid?._serialized) {
                phoneNumber = client.info.wid._serialized.replace('@c.us', '');
            }
            // Tenta client.info.me (objeto de ID do usuário)
            else if (client.info?.me?._data?.user) {
                phoneNumber = client.info.me._data.user;
            }
            // Fallback: tenta acessar propriedades diretamente
            else if (client.info?.user) {
                phoneNumber = client.info.user;
            }
            
            if (phoneNumber) {
                session.connectedNumber = phoneNumber;
                console.log(`[Tenant: ${usuarioId}] Número de WhatsApp conectado: +${phoneNumber}`);
            } else {
                console.warn(`[Tenant: ${usuarioId}] Não foi possível extrair número. Disponível ao receber primeira mensagem.`);
                console.debug(`[Tenant: ${usuarioId}] client.info:`, JSON.stringify(client.info, null, 2));
            }
        } catch (err) {
            console.error(`[Tenant: ${usuarioId}] Erro ao extrair número de WhatsApp:`, err);
        }
        
        // Reseta flag de offline quando reconecta
        // Indica que a sincronização foi restaurada após app móvel voltar online
        if (session.isMobileOffline) {
            const offlineMinutes = Math.round((Date.now() - (session.lastOfflineTime?.getTime() || 0)) / 60000);
            console.log(`[Tenant: ${usuarioId}] Sincronização restaurada! App móvel esteve offline por ~${offlineMinutes} minuto(s).`);
            session.isMobileOffline = false;
        }
    });

    client.on('disconnected', (reason: any) => {
        const reasonStr = String(reason).toUpperCase();
        
        // Detecção de desconexão por app móvel offline ou conflito de dispositivos
        // Correlação com comportamento esperado: sincronização pausada quando app fica offline
        const isMobileOffline = reasonStr.includes('CONFLICT') || 
                                reasonStr.includes('OFFLINE') || 
                                reasonStr.includes('MOBILE') ||
                                reasonStr.includes('SYNC');
        
        if (isMobileOffline) {
            session.isMobileOffline = true;
            session.lastOfflineTime = new Date();
            console.warn(`[Tenant: ${usuarioId}] AVISO: App WhatsApp no celular pode estar offline ou sincronização foi pausada.`);
            console.warn(`[Tenant: ${usuarioId}] Razão da desconexão: ${reasonStr}`);
            console.warn(`[Tenant: ${usuarioId}] Ação recomendada: Mantenha o app WhatsApp aberto no dispositivo móvel para restaurar a sincronização.`);
            session.statusMessage = 'App móvel offline - Mantenha o WhatsApp aberto no celular';
        } else {
            console.warn(`[Tenant: ${usuarioId}] Cliente do WhatsApp desconectado: ${reasonStr}`);
            session.statusMessage = `WhatsApp desconectado: ${reasonStr}`;
        }
        
        session.isReady = false;
        session.qrCode = '';
        session.connectedNumber = null;
        session.statusMessage = 'Reconectando... Aguarde o QR Code aparecer.';
        
        // Tenta reconectar imediatamente (em vez de esperar 10s)
        // Isso garante que o usuário veja o QR rapidamente após desconexão
        console.log(`[Tenant: ${usuarioId}] Iniciando reconexão imediata...`);
        scheduleReconnect(usuarioId, 1000);
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

        // Fallback: Se ainda não conseguimos extrair o número, tenta a partir da mensagem recebida
        // message.to é o número para o qual a mensagem foi recebida (nosso número)
        if (!session.connectedNumber && message.to) {
            try {
                const phoneNumber = message.to.replace('@c.us', '');
                session.connectedNumber = phoneNumber;
                console.log(`[Tenant: ${usuarioId}] Número de WhatsApp extraído da primeira mensagem: +${phoneNumber}`);
            } catch (err) {
                console.debug(`[Tenant: ${usuarioId}] Erro ao extrair número da mensagem:`, err);
            }
        }

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
            reconnectTimeout: null,
            isMobileOffline: false,
            lastOfflineTime: null,
            connectedNumber: null,
            reconnectAttempts: 0,
            lastReconnectAttemptTime: null
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

export const startWhatsAppClient = async (usuarioId: string) => {
    console.log(`[Tenant: ${usuarioId}] Solicitada a ativação da integração WhatsApp.`);
    
    // Cria a sessão IMEDIATAMENTE e a coloca em activeSessions
    // Isso garante que getWhatsAppStatus() retorne activeSession:true rapidinho
    // A inicialização do cliente continua em background sem bloquear
    createWhatsAppSessionPlaceholder(usuarioId);
    
    // Inicializa o cliente em background (não aguarda)
    // Polling do frontend vai monitorar o progresso
    safeInitializeWhatsAppClient(usuarioId).catch(err => {
        console.error(`[Tenant: ${usuarioId}] Erro durante inicialização assincronizada:`, err);
    });
};

// Cria uma sessão placeholder na RAM imediatamente
// Sem bloquear na inicialização do Chromium
const createWhatsAppSessionPlaceholder = (usuarioId: string) => {
    if (activeSessions.has(usuarioId)) {
        return; // Já existe sessão
    }
    
    const session: WhatsAppSession = {
        client: null,
        isReady: false,
        qrCode: '',
        statusMessage: 'Iniciando container WhatsApp...',
        pendingRequests: [],
        reconnectTimeout: null,
        isMobileOffline: false,
        lastOfflineTime: null,
        connectedNumber: null,
        reconnectAttempts: 0,
        lastReconnectAttemptTime: null
    };
    
    activeSessions.set(usuarioId, session);
    console.log(`[Tenant: ${usuarioId}] Sessão placeholder criada em RAM.`);
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
        activeSession: true,
        mobileOffline: session.isMobileOffline,
        connectedNumber: session.connectedNumber
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

    // Reseta sessão mas mantém em memória para permitir reconexão
    // Não deleta a sessão completamente, apenas zera os valores de conexão
    // Assim o frontend pode clicar em "Gerar QR Code" novamente
    session.isReady = false;
    session.qrCode = '';
    session.connectedNumber = null;
    session.client = null;
    session.statusMessage = 'Desconectado. Clique em "Gerar QR Code" para reconectar.';
    session.pendingRequests = [];
    session.reconnectAttempts = 0;
    session.lastReconnectAttemptTime = null;
    
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
