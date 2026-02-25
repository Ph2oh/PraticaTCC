import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { startWhatsAppClient, getWhatsAppStatus, disconnectWhatsAppClient, acceptWhatsAppRequest, rejectWhatsAppRequest } from './whatsapp';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- CLIENTES ROUTES ---

// Get all clients
app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { nome: 'asc' },
            include: { orcamentos: { orderBy: { dataAtualizado: 'desc' } } }
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// Create new client
app.post('/api/clientes', async (req, res) => {
    try {
        const { nome, email, telefone } = req.body;
        const novoCliente = await prisma.cliente.create({
            data: {
                nome,
                email: email || "",
                telefone,
            },
        });
        res.status(201).json(novoCliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// Update client
app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone } = req.body;
        const clienteAtualizado = await prisma.cliente.update({
            where: { id },
            data: {
                ...(nome && { nome }),
                ...(email && { email }),
                ...(telefone && { telefone }),
            },
        });
        res.json(clienteAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// Delete client
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Deleta os orçamentos associados primeiro
        await prisma.orcamento.deleteMany({
            where: { clienteId: id },
        });

        // Depois deleta o cliente
        await prisma.cliente.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
});

// --- ORCAMENTOS ROUTES ---

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            orderBy: { dataRecebido: 'desc' },
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                }
            }
        });
        const result = {
            total: orcamentos.length,
            primeiroTemEventos: orcamentos[0]?.eventos?.length || 0,
            eventos: orcamentos[0]?.eventos || [],
            primeiroCompleto: orcamentos[0]
        };
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao testar' });
    }
});

// Get all orcamentos
app.get('/api/orcamentos', async (req, res) => {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            orderBy: { dataRecebido: 'desc' },
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                }
            }
        });
        const logMsg = `[API GET /orcamentos] Total: ${orcamentos.length}, Primeiro tem eventos: ${orcamentos[0]?.eventos?.length || 0}`;
        console.log(logMsg);
        console.error(logMsg);  // Força stderr
        res.json(orcamentos);
    } catch (error) {
        console.error('Erro GET /api/orcamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar orçamentos' });
    }
});

// Create new orcamento
app.post('/api/orcamentos', async (req, res) => {
    try {
        const { clienteId, clienteNome, telefone, descricao, valor } = req.body;

        if ((!clienteId && !clienteNome) || !descricao || typeof valor === 'undefined') {
            return res.status(400).json({ error: 'Dados incompletos para criar o orçamento' });
        }

        let cliente;

        if (clienteId) {
            cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            if (telefone && telefone !== cliente.telefone) {
                cliente = await prisma.cliente.update({
                    where: { id: cliente.id },
                    data: { telefone },
                });
            }
        } else {
            cliente = await prisma.cliente.create({
                data: {
                    nome: clienteNome,
                    email: '',
                    telefone: telefone || '',
                },
            });
        }

        const novoOrcamento = await prisma.orcamento.create({
            data: {
                descricao,
                valor: Number(valor),
                status: 'pendente',
                cliente: {
                    connect: { id: cliente.id },
                },
                eventos: {
                    create: {
                        tipo: 'criado',
                        descricao: 'Orçamento criado',
                    },
                },
            },
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                },
            },
        });

        await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
                totalOrcamentos: {
                    increment: 1,
                },
            },
        });

        res.status(201).json(novoOrcamento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar orçamento' });
    }
});

// Update orcamento status
app.patch('/api/orcamentos/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const orcamentoAtigo = await prisma.orcamento.findUnique({
            where: { id },
        });

        const orcamentoAtualizado = await prisma.orcamento.update({
            where: { id },
            data: {
                status,
                ...(orcamentoAtigo && orcamentoAtigo.status !== status ? {
                    eventos: {
                        create: {
                            tipo: 'status_alterado',
                            descricao: `Status alterado para ${status}`,
                            statusAntigo: orcamentoAtigo.status,
                            statusNovo: status,
                        }
                    }
                } : {})
            },
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                }
            },
        });
        res.json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar status do orçamento' });
    }
});

// Update orcamento (completo)
app.put('/api/orcamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, valor, status } = req.body;

        // Buscar status anterior
        const orcamentoAtigo = await prisma.orcamento.findUnique({
            where: { id },
        });

        const dataAtualizacao: any = {};
        if (descricao) dataAtualizacao.descricao = descricao;
        if (typeof valor !== 'undefined') dataAtualizacao.valor = Number(valor);
        if (status) dataAtualizacao.status = status;

        if (Object.keys(dataAtualizacao).length === 0) {
            return res.status(400).json({ error: 'Nenhuma informação para atualizar' });
        }

        const eventosParaCriar: any[] = [];

        if (status && orcamentoAtigo && orcamentoAtigo.status !== status) {
            eventosParaCriar.push({
                tipo: 'status_alterado',
                descricao: `Status alterado para ${status}`,
                statusAntigo: orcamentoAtigo.status,
                statusNovo: status,
            });
        }

        if (
            (descricao && orcamentoAtigo && orcamentoAtigo.descricao !== descricao) ||
            (typeof valor !== 'undefined' && orcamentoAtigo && orcamentoAtigo.valor !== Number(valor))
        ) {
            eventosParaCriar.push({
                tipo: 'atualizado',
                descricao: 'Informações do orçamento atualizadas'
            });
        }

        if (eventosParaCriar.length > 0) {
            dataAtualizacao.eventos = {
                create: eventosParaCriar
            };
        }

        const orcamentoAtualizado = await prisma.orcamento.update({
            where: { id },
            data: dataAtualizacao,
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                }
            },
        });

        res.json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar orçamento' });
    }
});

// Delete orcamento
app.delete('/api/orcamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.orcamento.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar orçamento' });
    }
});


// --- CONFIGURACOES ROUTES ---

// Get global config
app.get('/api/config', async (req, res) => {
    try {
        let config = await prisma.configuracao.findUnique({
            where: { id: 'global' }
        });

        // Se não existir, criar com os padrões
        if (!config) {
            config = await prisma.configuracao.create({
                data: { id: 'global' }
            });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações globais' });
    }
});

// Update global config
app.put('/api/config', async (req, res) => {
    try {
        const { corPrimaria, tema, templateProposta, templateLembrete, templateAgradecimento } = req.body;

        const dataAtualizacao: any = {};
        if (corPrimaria) dataAtualizacao.corPrimaria = corPrimaria;
        if (tema) dataAtualizacao.tema = tema;
        if (templateProposta) dataAtualizacao.templateProposta = templateProposta;
        if (templateLembrete) dataAtualizacao.templateLembrete = templateLembrete;
        if (templateAgradecimento) dataAtualizacao.templateAgradecimento = templateAgradecimento;

        const config = await prisma.configuracao.upsert({
            where: { id: 'global' },
            update: dataAtualizacao,
            create: {
                id: 'global',
                ...dataAtualizacao
            }
        });

        res.json(config);
    } catch (error) {
        console.error('Erro na rota PUT /api/config:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações globais' });
    }
});


// --- WHATSAPP ROUTES ---
app.get('/api/whatsapp/status', (req, res) => {
    res.json(getWhatsAppStatus());
});

app.post('/api/whatsapp/requests/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const orcamento = await acceptWhatsAppRequest(id);
        res.json({ success: true, orcamento });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Erro ao aprovar solicitação' });
    }
});

app.post('/api/whatsapp/requests/:id/reject', (req, res) => {
    try {
        const { id } = req.params;
        const success = rejectWhatsAppRequest(id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Solicitação não encontrada' });
        }
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao recusar solicitação' });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
        const success = await disconnectWhatsAppClient();
        res.json({ success });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    // Start WhatsApp client when server starts
    startWhatsAppClient();
});
