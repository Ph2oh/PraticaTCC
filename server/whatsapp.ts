import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
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

export const pendingRequests: PendingRequest[] = [];

const prisma = new PrismaClient();
// Sessão dedicada para evitar conflito com lock da sessão padrão e manter isolamento da autenticação.
const WHATSAPP_CLIENT_ID = 'sgo-main';
const WHATSAPP_SESSION_PATH = path.join(process.cwd(), '.wwebjs_auth', `session-${WHATSAPP_CLIENT_ID}`);

// Create a new client instance
// We use LocalAuth so it saves the session locally and you don't need to scan the QR code every time
const whatsappClient = new Client({
    authStrategy: new LocalAuth({ clientId: WHATSAPP_CLIENT_ID }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isClientReady = false;
let currentQrCode = '';
let statusMessage = 'Inicializando integração com WhatsApp...';
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

const scheduleReconnect = (delayMs = 10000) => {
    if (reconnectTimeout) return;

    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        safeInitializeWhatsAppClient();
    }, delayMs);
};

const safeInitializeWhatsAppClient = () => {
    statusMessage = 'Conectando ao WhatsApp...';
    void whatsappClient.initialize().catch((error) => {
        isClientReady = false;
        // Se o QR já foi gerado, preservamos para a UI continuar exibindo durante retentativas.
        // Isso evita o efeito de "spinner infinito" quando ocorre erro logo após emitir o QR no terminal.
        statusMessage = error instanceof Error ? error.message : 'Falha ao inicializar WhatsApp';
        console.error(' Falha ao inicializar o cliente do WhatsApp:', error);
        scheduleReconnect();
    });
};

// When the client is ready, run this code
whatsappClient.on('ready', () => {
    console.log(' Cliente do WhatsApp está pronto e conectado!');
    isClientReady = true;
    currentQrCode = '';
    statusMessage = 'WhatsApp conectado';
});

whatsappClient.on('disconnected', (reason) => {
    console.warn(' Cliente do WhatsApp desconectado:', reason);
    isClientReady = false;
    currentQrCode = '';
    statusMessage = `WhatsApp desconectado: ${String(reason)}`;
    scheduleReconnect();
});

whatsappClient.on('auth_failure', (message) => {
    console.error(' Falha de autenticação do WhatsApp:', message);
    isClientReady = false;
    currentQrCode = '';
    statusMessage = `Falha de autenticação: ${message}`;
    scheduleReconnect();
});

// When the client receives QR-Code
whatsappClient.on('qr', async (qr) => {
    console.log(' Leia o QR Code abaixo com o seu WhatsApp para conectar a aplicação:');
    qrcodeTerminal.generate(qr, { small: true });
    statusMessage = 'QR Code gerado. Aguardando leitura pelo celular.';
    try {
        currentQrCode = await QRCode.toDataURL(qr);
    } catch (err) {
        currentQrCode = '';
        statusMessage = 'QR recebido, mas falhou ao converter imagem para exibição.';
        console.error('Erro ao gerar imagem do QR Code', err);
    }
});

// Listening to all incoming and outgoing messages (useful if the user is testing by sending to themselves)
whatsappClient.on('message_create', async (message) => {
    // Ignore messages from groups or status
    if (message.from.includes('@g.us') || message.isStatus) return;

    // Ignore messages sent by the bot itself
    if (message.fromMe) return;

    const body = message.body.toLowerCase();

    // Check if the message contains the keyword "orçamento" or "orcamento"
    if (body.includes('orçamento') || body.includes('orcamento')) {
        console.log(` Nova solicitação de orçamento detectada do número: ${message.from}`);

        try {
            const contact = await message.getContact();
            const contactName = contact.name || contact.pushname || "Novo Cliente (WhatsApp)";

            // The 'from' property format is similar to '5511999999999@c.us'
            // We want to extract just the number
            const phoneNumber = message.from.replace('@c.us', '');

            // FIND OR CREATE CLIENT (E ATRELA AO USUÁRIO/TENANT PRINCIPAL DO SISTEMA)
            // OBS: Como o WhatsApp é Singleton por Servidor nesta fase de infraestrutura, 
            // a captura de mensagens ocorrerá no contexto do PRIMEIRO usuário registrado (Admin).
            const adminUser = await prisma.usuario.findFirst({
                orderBy: { id: 'asc' }
            });

            if (!adminUser) {
                console.error("ERRO CRÍTICO WhatsApp Bot: Não há nenhum Usuário/Tenant cadastrado no sistema para ser o dono deste cliente.");
                return;
            }

            let cliente = await prisma.cliente.findFirst({
                where: { telefone: phoneNumber, usuarioId: adminUser.id }
            });

            if (!cliente) {
                console.log(` Criando novo cliente para ${phoneNumber} no Tenant ${adminUser.id}`);
                cliente = await prisma.cliente.create({
                    data: {
                        nome: contactName,
                        email: '',
                        telefone: phoneNumber,
                        usuarioId: adminUser.id
                    }
                });
            }

            // VERIFICA SE JÁ EXISTE ORÇAMENTO PENDENTE
            const hasPending = await prisma.orcamento.findFirst({
                where: {
                    clienteId: cliente.id,
                    usuarioId: adminUser.id,
                    status: 'pendente'
                }
            });

            if (hasPending) {
                console.log(` Ignorando solicitação de ${cliente.nome}. Já possui orçamento pendente.`);
                return;
            }

            // ADICIONA À FILA DE APROVAÇÃO (NA MEMÓRIA)
            const requestId = Date.now().toString() + Math.random().toString(36).substring(7);
            pendingRequests.push({
                id: requestId,
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                whatsappFrom: message.from,
                mensagemOriginal: message.body,
                timestamp: new Date()
            });

            console.log(`🔔 Nova solicitação de orçamento enfileirada para aprovação: ${cliente.nome}`);


        } catch (error) {
            console.error(' Erro completo ao processar mensagem do WhatsApp:', error);
        }
    }
});

// Export a function to start the client
export const startWhatsAppClient = () => {
    console.log(' Inicializando integração com o WhatsApp...');

    // Auto-cleanup do arquivo de lock do Puppeteer (evita o erro "Browser is already running")
    const lockFiles = [
        path.join(WHATSAPP_SESSION_PATH, 'SingletonLock'),
        path.join(WHATSAPP_SESSION_PATH, 'lockfile'),
        path.join(WHATSAPP_SESSION_PATH, 'DevToolsActivePort'),
    ];

    try {
        lockFiles.forEach((lockFilePath) => {
            if (fs.existsSync(lockFilePath)) {
                console.log(` Removendo lock antigo do WhatsApp: ${path.basename(lockFilePath)}`);
                fs.unlinkSync(lockFilePath);
            }
        });
    } catch (err) {
        console.error(' Não foi possível limpar lockfiles do WhatsApp. O Client inicializará de toda forma:', err);
    }

    safeInitializeWhatsAppClient();
};

export const getWhatsAppStatus = () => {
    return {
        ready: isClientReady,
        qrCode: currentQrCode,
        message: statusMessage,
        pendingRequests
    };
};

export const acceptWhatsAppRequest = async (id: string) => {
    const requestIndex = pendingRequests.findIndex(r => r.id === id);
    if (requestIndex === -1) throw new Error("Solicitação não encontrada");

    const request = pendingRequests[requestIndex];

    try {
        console.log(` Criando novo orçamento (APROVADO) para ${request.clienteNome}`);

        // Busca o Admin para atrelar a propriedade do Orçamento (mesma lógica do Cliente)
        const adminUser = await prisma.usuario.findFirst({
            orderBy: { id: 'asc' }
        });

        if (!adminUser) throw new Error("Usuário administrador não encontrado no sistema.");

        const novoOrcamento = await prisma.orcamento.create({
            data: {
                clienteId: request.clienteId,
                usuarioId: adminUser.id,
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
            data: {
                totalOrcamentos: { increment: 1 },
            },
        });

        console.log(` Orçamento aprovado e criado com sucesso. ID: ${novoOrcamento.id}`);

        pendingRequests.splice(requestIndex, 1);
        return novoOrcamento;
    } catch (e) {
        console.error("Erro ao aprovar solicitação do whatsapp:", e);
        throw e;
    }
};

export const rejectWhatsAppRequest = (id: string) => {
    const requestIndex = pendingRequests.findIndex(r => r.id === id);
    if (requestIndex !== -1) {
        pendingRequests.splice(requestIndex, 1);
        return true;
    }
    return false;
};

export const disconnectWhatsAppClient = async () => {
    if (isClientReady || currentQrCode) {
        console.log(' Desconectando WhatsApp...');
        try {
            await whatsappClient.logout();
        } catch (e) {
            console.log("Erro no logout, forçando destroy...", e);
        }
        await whatsappClient.destroy();
        isClientReady = false;
        currentQrCode = '';

        // Re-initialize to get a new QR Code later if needed
        setTimeout(() => {
            safeInitializeWhatsAppClient();
        }, 5000);

        return true;
    }
    return false;
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('(SIGINT) Desligando servidor e WhatsApp...');
    if (isClientReady) {
        await whatsappClient.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('(SIGTERM) Desligando servidor e WhatsApp...');
    if (isClientReady) {
        await whatsappClient.destroy();
    }
    process.exit(0);
});
