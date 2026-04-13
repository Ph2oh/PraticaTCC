import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function anti-travamento para proteger o motor principal 
const destroyWithTimeout = async (client: any, timeoutMs = 3000) => {
    if (!client) return;
    try {
        await Promise.race([
            client.destroy(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DestroyTimeout')), timeoutMs))
        ]);
    } catch (e) {
        console.debug('Forçado encerramento do pupeteer (timeout/zumbi da VPS).');
    }
};

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
    // Timeout para auto-destruição se o cliente pedir o QR e abandonar a tela
    qrAttempts: number;
}

import { prisma } from './prisma';

// Onde as múltiplas conexões ficarão em memória RAM
const activeSessions = new Map<string, WhatsAppSession>();

// Prevenção de race-condition nas criações de cliente (evita duplicação)
const clientCreationLocks = new Set<string>();

// Mapeamento dinâmico do local de salvamento dos caches do whatsapp por Tenant
const getSessionPath = (usuarioId: string) => path.join(process.cwd(), '.wwebjs_auth', `session-${usuarioId}`);

// Limpeza de lockfiles e processos Chromium orfaos (TOTALMENTE ASSÍNCRONO e NÃO BLOQUEANTE)
const cleanupLocksAsync = async (usuarioId: string) => {
    const sessionPath = getSessionPath(usuarioId);
    const lockFiles = [
        path.join(sessionPath, 'SingletonLock'),
        path.join(sessionPath, 'lockfile'),
        path.join(sessionPath, 'DevToolsActivePort'),
    ];

    try {
        await Promise.all(lockFiles.map(async (lockPath) => {
            try {
                const stat = await fs.promises.stat(lockPath).catch(() => null);
                if (stat) await fs.promises.unlink(lockPath);
            } catch (err) { }
        }));
    } catch (err) { }

    // Mata processos zumbis rodando em background da VPS assincronamente sem bloquear a Thread
    try {
        await execAsync(`pkill -9 -f "session-${usuarioId}"`).catch(() => {});
    } catch (err) { }
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
        session.qrAttempts = 0;
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
        session.qrAttempts++;
        if (session.qrAttempts > 10) {
            console.log(`[Tenant: ${usuarioId}] Timeout de QR Code! Usuário abandonou a tela. Destruindo container local para salvar RAM.`);
            await disconnectWhatsAppClient(usuarioId);
            return;
        }

        if (!session.qrCode) {
            // Consulta o BD assincronicamente apenas no PRIMEIRO QR Code para logar quem é humano
            prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, email: true } })
                .then(user => {
                    const info = user ? `${user.nome} | ${user.email}` : usuarioId;
                    console.log(`[Tenant: ${info}] Aguardando leitura do primeiro QR Code gerado...`);
                })
                .catch(() => {
                    console.log(`[Tenant: ${usuarioId}] Aguardando leitura do QR Code gerado...`);
                });
        }

        session.statusMessage = 'QR Code aguardando leitura. Aponte seu celular.';
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
                // Bypass MASSIVO de velocidade: ignorar `message.getContact()` que trava na VPS
                // e extrair o nome diretamente do payload crú da notificação (Pushname)
                const rawName = message._data?.notifyName || message._data?.pushname;
                const contactName = rawName || "Novo Cliente (WhatsApp)";
                const phoneNumber = message.from.replace('@c.us', '');

                const lockKey = `${usuarioId}:${phoneNumber}`;
                if (clientCreationLocks.has(lockKey)) {
                    console.log(`[Tenant: ${usuarioId}] Race condition mitigada: solicitação sendo processada para ${phoneNumber}`);
                    return;
                }
                clientCreationLocks.add(lockKey);

                try {
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

                    if (hasPending) {
                        console.log(`[Tenant: ${usuarioId}] Mensagem ignorada: O cliente ${phoneNumber} já possui um orçamento 'pendente' no Kanban de serviços.`);
                        return;
                    }

                    // correcao deduplicacao: evita criar solicitacao duplicada,
                    // mas se o cliente mandar várias mensagens seguidas ("Oi", "Quero orçamento", "Para casamento"),
                    // nós JUNTAMOS as mensagens na mesma solicitação em vez de ignorar as secundárias.
                    const jaTemSolicitacaoPendente = await prisma.solicitacaoWhatsApp.findFirst({
                        where: { usuarioId: usuarioId, whatsappFrom: message.from }
                    });

                    if (jaTemSolicitacaoPendente) {
                        console.log(`[Tenant: ${usuarioId}] Anexando nova mensagem à solicitação pendente de: ${message.from}`);

                        const msgAgrupada = jaTemSolicitacaoPendente.mensagemOriginal + "\n" + message.body;

                        await prisma.solicitacaoWhatsApp.update({
                            where: { id: jaTemSolicitacaoPendente.id },
                            data: { mensagemOriginal: msgAgrupada }
                        });

                        // Atualiza a RAM para o Frontend enxergar e rodar os Regex atualizados em tempo real!
                        const reqInRAM = session.pendingRequests.find(r => r.id === jaTemSolicitacaoPendente.id);
                        if (reqInRAM) {
                            reqInRAM.mensagemOriginal = msgAgrupada;
                        }
                        return;
                    }

                    console.log(`[Tenant: ${usuarioId}] Criando nova solicitação para o frontend.`);
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
                        timestamp: solicitacao.criadoEm as any
                    });
                } finally {
                    // Libera o lock após 3 segundos para cobrir flutuações de rede rápida
                    setTimeout(() => clientCreationLocks.delete(lockKey), 3000);
                }

            } catch (error) {
                console.error(`[Tenant: ${usuarioId}] Erro ao processar mensagem do WhatsApp:`, error);
            }
        }
    });

    // Listener geral de erros para capturar bloqueios do WhatsApp
    client.on('error', (error: any) => {
        const errorStr = String(error).toLowerCase();
        console.error(`[Tenant: ${usuarioId}] ERRO DO CLIENTE WHATSAPP:`, error);

        // Detecta mensagens específicas de bloqueio/restrição
        if (errorStr.includes('connect') ||
            errorStr.includes('device') ||
            errorStr.includes('blocked') ||
            errorStr.includes('fail') ||
            errorStr.includes('offline')) {
            session.statusMessage = `Erro: ${error.toString()}`;
            session.isReady = false;
            session.qrCode = '';
        }
    });

    // Listener para mudanças de estado gerais
    client.on('change_state', (state: any) => {
        console.log(`[Tenant: ${usuarioId}] Mudança de estado do WhatsApp: ${state}`);
    });
};

const safeInitializeWhatsAppClient = async (usuarioId: string) => {
    let session = activeSessions.get(usuarioId);

    if (session?.client) {
        // Encerra a aba e o processo órfão com garantia de timeout
        await destroyWithTimeout(session.client, 4000);
        session.client = null;
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
            lastReconnectAttemptTime: null,
            qrAttempts: 0
        };
        activeSessions.set(usuarioId, session);

        // Carrega solicitações pendentes do banco de forma sincronizada (com await)
        // Isso garante que não há race condition entre o carregamento e novas mensagens
        await loadPendingRequests(usuarioId);
    } else {
        session.statusMessage = 'Reconectando ao WhatsApp...';
        session.isReady = false;
    }

    await cleanupLocksAsync(usuarioId);

    session.client = new Client({
        authStrategy: new LocalAuth({ clientId: usuarioId }),
        // Configuração otimizada do Puppeteer para evitar detecção como automação
        // Mantém alguns flags para VPS/Linux, mas adiciona outros para parecer navegador real
        puppeteer: {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                // Otimizações ESSENCIAIS para Kernel Linux sem interface gráfica (VPS)
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--mute-audio',
                // Argumentos VITAIS na VPS para o Chrome não 'dormir' a aba e pausar a sincronização
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                // Argumentos adicionais para evitar detecção de automação
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--disable-features=IsolateOrigins,site-per-process,CalculateNativeWinOcclusion',
                '--disable-web-resources',
                '--disable-client-side-phishing-detection',
                '--disable-component-extensions-with-background-pages',
                '--disable-component-extensions-with-warning-badge',
                '--disable-sync'
            ],
            // Habilita execução de código para limpar flags de automação
            protocolTimeout: 180000,
        }
    });

    // Listener para limpar flags de automação após a página carregar
    // Isso é feito antes da autenticação para parecer um navegador real
    session.client.once('page_created', async (page: any) => {
        try {
            console.log(`[Tenant: ${usuarioId}] Página criada. Aplicando stealth mode...`);

            // Remove flags de automação do Chromium
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['pt-BR', 'pt', 'en-US', 'en'],
                });
                (window as any).chrome = {
                    runtime: {}
                };
            });
        } catch (err) {
            console.warn(`[Tenant: ${usuarioId}] Aviso ao aplicar stealth mode:`, err);
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
    let session = activeSessions.get(usuarioId);

    // Evita recriar ou destruir o container se já está ativo ou buscando QR code agressivamente
    if (session?.client && (session.isReady || session.qrCode)) {
        console.log(`[Tenant: ${usuarioId}] Tentativa de reiniciar ignorada: o WhatsApp já está rodando ou aguardando leitura.`);
        return;
    }

    console.log(`[Tenant: ${usuarioId}] Solicitada a ativação da integração WhatsApp.`);

    // Cria a sessão IMEDIATAMENTE e a coloca em activeSessions
    // Isso garante que getWhatsAppStatus() retorne activeSession:true
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
        lastReconnectAttemptTime: null,
        qrAttempts: 0
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

    // Removemos o Fallback de findMany do Banco de Dados daqui de dentro!
    // Ele estava causando um DDOS acidental de 1 query a cada 2 segundos no NeonDB se a lista estivesse vazia,
    // o que derruba a API e desconecta banco serverless (P1001). 
    // O banco já se sincroniza naturalmente uma única vez no loadPendingRequests() na inicialização.
    
    return {
        ready: session.isReady,
        qrCode: session.qrCode,
        message: session.statusMessage,
        pendingRequests: session.pendingRequests,
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

    let request;
    const requestIndex = session.pendingRequests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) {
        // Fallback robusto: se a RAM apagou a solicitação mas ela ainda está no BD (via poll, etc)
        const reqBanco = await prisma.solicitacaoWhatsApp.findFirst({ where: { id: requestId, usuarioId } });
        if (!reqBanco) throw new Error("Solicitação não encontrada");
        request = { ...reqBanco, timestamp: reqBanco.criadoEm as any };
    } else {
        request = session.pendingRequests[requestIndex];
    }

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

        if (requestIndex !== -1) {
            session.pendingRequests.splice(requestIndex, 1);
        }
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
    }
    // Força deleção no banco mesmo que já tinha sumido da RAM
    const deleted = await prisma.solicitacaoWhatsApp.deleteMany({
        where: { id: requestId, usuarioId }
    });

    return deleted.count > 0 || requestIndex !== -1;
};

export const disconnectWhatsAppClient = async (usuarioId: string) => {
    const session = activeSessions.get(usuarioId);
    if (!session || !session.client) return false;

    console.log(`[Tenant: ${usuarioId}] Desconectando WhatsApp...`);
    try {
        await Promise.race([
            session.client.logout(),
            new Promise((_, r) => setTimeout(() => r(new Error('LogoutTimeout')), 4000))
        ]);
    } catch (e) {
        console.log("Erro/Timeout no logout, forçando destroy...", e);
    }
    
    await destroyWithTimeout(session.client, 4000);

    // Remove a pasta local de forma ASSÍNCRONA para não parar todo o servidor
    try {
        const sessionPath = getSessionPath(usuarioId);
        const stat = await fs.promises.stat(sessionPath).catch(() => null);
        if (stat) {
            await fs.promises.rm(sessionPath, { recursive: true, force: true });
            console.log(`[Tenant: ${usuarioId}] Pasta de sessão local blindada e removida com sucesso.`);
        }
    } catch (e) {
        console.error(`[Tenant: ${usuarioId}] Erro ao apagar pasta da sessão:`, e);
    }

    // SANGRIA DA MEMÓRIA RAM
    // Limpa completamente todos os traços desse tenant da alocação de memória. Memory Leak extirpado.
    activeSessions.delete(usuarioId);

    return true;
};

export const shutdownWhatsApp = async () => {
    console.log('Desligando todas as instâncias ativas do WhatsApp para evitar processos orfaos...');
    const destroyPromises = [];
    
    for (const [id, session] of activeSessions.entries()) {
        if (session.client) {
            destroyPromises.push(
                destroyWithTimeout(session.client, 3000)
                    .then(() => console.log(`Session do tenant ${id} limpa internamente.`))
            );
        }
    }
    
    // Matamos todos em paralelo ao mesmo tempo durante o restart do PM2 
    await Promise.all(destroyPromises);
};
