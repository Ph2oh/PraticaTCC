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

// --- ORCAMENTOS ROUTES ---

// Get all orcamentos
app.get('/api/orcamentos', async (req, res) => {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            orderBy: { dataRecebido: 'desc' },
            include: { cliente: true }
        });
        res.json(orcamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamentos' });
    }
});

// Create new orcamento
app.post('/api/orcamentos', async (req, res) => {
    try {
        const { clienteNome, telefone, descricao, valor } = req.body;
        const novoOrcamento = await prisma.orcamento.create({
            data: {
                clienteNome,
                telefone,
                descricao,
                valor: parseFloat(valor),
                status: 'pendente'
            },
        });
        res.status(201).json(novoOrcamento);
    } catch (error) {
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
        });
        res.json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar status do orçamento' });
    }
});


app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
