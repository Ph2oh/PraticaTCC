import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
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

export let pendingRequests: PendingRequest[] = [];

const prisma = new PrismaClient();

// Create a new client instance
// We use LocalAuth so it saves the session locally and you don't need to scan the QR code every time
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isClientReady = false;
let currentQrCode = '';

// When the client is ready, run this code
whatsappClient.on('ready', () => {
    console.log(' Cliente do WhatsApp está pronto e conectado!');
    isClientReady = true;
    currentQrCode = '';
});

// When the client receives QR-Code
whatsappClient.on('qr', async (qr) => {
    console.log(' Leia o QR Code abaixo com o seu WhatsApp para conectar a aplicação:');
    qrcodeTerminal.generate(qr, { small: true });
    try {
        currentQrCode = await QRCode.toDataURL(qr);
    } catch (err) {
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

            // FIND OR CREATE CLIENT
            let cliente = await prisma.cliente.findFirst({
                where: { telefone: phoneNumber }
            });

            if (!cliente) {
                console.log(` Criando novo cliente para ${phoneNumber}`);
                cliente = await prisma.cliente.create({
                    data: {
                        nome: contactName,
                        email: '',
                        telefone: phoneNumber,
                    }
                });
            }

            // VERIFICA SE JÁ EXISTE ORÇAMENTO PENDENTE
            const hasPending = await prisma.orcamento.findFirst({
                where: {
                    clienteId: cliente.id,
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
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session');
    const lockFile = path.join(sessionPath, 'SingletonLock');

    try {
        if (fs.existsSync(lockFile)) {
            console.log(' Removendo SingletonLock antigo do WhatsApp...');
            fs.unlinkSync(lockFile);
        }
    } catch (err) {
        console.error(' Não foi possível limpar o SingletonLock. O Client inicializará de toda forma:', err);
    }

    whatsappClient.initialize();
};

export const getWhatsAppStatus = () => {
    return {
        ready: isClientReady,
        qrCode: currentQrCode,
        pendingRequests
    };
};

export const acceptWhatsAppRequest = async (id: string) => {
    const requestIndex = pendingRequests.findIndex(r => r.id === id);
    if (requestIndex === -1) throw new Error("Solicitação não encontrada");

    const request = pendingRequests[requestIndex];

    try {
        console.log(` Criando novo orçamento (APROVADO) para ${request.clienteNome}`);
        const novoOrcamento = await prisma.orcamento.create({
            data: {
                clienteId: request.clienteId,
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
            whatsappClient.initialize();
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
