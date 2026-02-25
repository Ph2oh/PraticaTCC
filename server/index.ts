import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

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
            },
            include: {
                cliente: true,
                eventos: true,
            },
        });

        // Criar evento de criação
        await prisma.orcamentoEvento.create({
            data: {
                orcamentoId: novoOrcamento.id,
                tipo: 'criado',
                descricao: 'Orçamento criado',
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
        const orcamentoAtualizado = await prisma.orcamento.update({
            where: { id },
            data: { status },
            include: { cliente: true },
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

        const dataAtualizacao: Record<string, unknown> = {};
        if (descricao) dataAtualizacao.descricao = descricao;
        if (typeof valor !== 'undefined') dataAtualizacao.valor = Number(valor);
        if (status) dataAtualizacao.status = status;

        if (Object.keys(dataAtualizacao).length === 0) {
            return res.status(400).json({ error: 'Nenhuma informação para atualizar' });
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

        // Criar evento se status foi alterado
        if (status && orcamentoAtigo && orcamentoAtigo.status !== status) {
            await prisma.orcamentoEvento.create({
                data: {
                    orcamentoId: id,
                    tipo: 'status_alterado',
                    descricao: `Status alterado para ${status}`,
                    statusAntigo: orcamentoAtigo.status,
                    statusNovo: status,
                },
            });
        }

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


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
