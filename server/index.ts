import express from 'express';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './middleware/auth';
import { startWhatsAppClient, getWhatsAppStatus, disconnectWhatsAppClient, acceptWhatsAppRequest, rejectWhatsAppRequest } from './whatsapp';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
// Mudança estrutural: esta flag permite executar a API sem inicializar a sessão do WhatsApp.
// Útil em ambiente de desenvolvimento quando o Chromium/Puppeteer estiver indisponível.
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED !== 'false';

app.use(cors());
app.use(express.json());

// --- AUTH ROUTES ---

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const validPassword = await bcrypt.compare(senha, usuario.senha);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET || 'secret-sgo-dev-2026',
            { expiresIn: '24h' }
        );
        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresa: usuario.empresa } });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nome, email, senha, empresa, telefone } = req.body;

        // Valida duplicidade
        const existingUser = await prisma.usuario.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Este e-mail já está em uso' });
        }

        // Hash senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Cria o Usuário já com sua Configuração (Isolamento de Tenant)
        const novoUsuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: hashedPassword,
                empresa,
                telefone,
                configuracao: {
                    create: {
                        corPrimaria: "224.3 76.3% 48%",
                        tema: "light"
                    }
                }
            },
            select: { id: true, nome: true, email: true, empresa: true }
        });

        // Autentica-o automaticamente
        const token = jwt.sign(
            { id: novoUsuario.id },
            process.env.JWT_SECRET || 'secret-sgo-dev-2026',
            { expiresIn: '24h' }
        );
        res.status(201).json({ token, usuario: novoUsuario });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao criar conta' });
    }
});

// Define AuthRequest type for better type safety, assuming it's similar to express.Request with an added usuarioId
interface AuthRequest extends express.Request {
    usuarioId?: string;
}

app.put('/api/auth/password', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;

        if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
            return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const validPassword = await bcrypt.compare(senhaAtual, usuario.senha);
        if (!validPassword) {
            return res.status(401).json({ message: 'A senha atual está incorreta.' });
        }

        const hashedPassword = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id: req.usuarioId },
            data: { senha: hashedPassword }
        });

        res.json({ message: 'Senha atualizada com sucesso.' });
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ message: 'Erro interno ao alterar senha.' });
    }
});

// Get current user metadata
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuarioId },
            select: { id: true, nome: true, email: true, empresa: true }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

// --- GLOBAL API PROTECTION ---
// Todas as rotas de API registradas ABAIXO dessa linha exigirão o Token JWT válido (Logado)
app.use('/api', authenticateToken);

// --- CLIENTES ROUTES ---

// Get all clients
app.get('/api/clientes', async (req: any, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            where: { usuarioId: req.usuarioId },
            orderBy: { nome: 'asc' },
            include: { orcamentos: { orderBy: { dataAtualizado: 'desc' } } }
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// Create new client
app.post('/api/clientes', async (req: any, res) => {
    try {
        const { nome, email, telefone } = req.body;
        const novoCliente = await prisma.cliente.create({
            data: {
                nome,
                email: email || "",
                telefone,
                usuarioId: req.usuarioId
            },
        });
        res.status(201).json(novoCliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// Update client
app.put('/api/clientes/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone } = req.body;

        // Verifica dono do registro
        const pertence = await prisma.cliente.findFirst({ where: { id, usuarioId: req.usuarioId } });
        if (!pertence) return res.status(404).json({ error: 'Cliente não encontrado.' });

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
app.delete('/api/clientes/:id', async (req: any, res) => {
    try {
        const { id } = req.params;

        const pertence = await prisma.cliente.findFirst({ where: { id, usuarioId: req.usuarioId } });
        if (!pertence) return res.status(404).json({ error: 'Cliente não encontrado.' });

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
app.get('/api/test', async (req: any, res) => {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            where: { usuarioId: req.usuarioId },
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
app.get('/api/orcamentos', async (req: any, res) => {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            where: { usuarioId: req.usuarioId },
            orderBy: { dataRecebido: 'desc' },
            include: {
                cliente: true,
                eventos: {
                    orderBy: { criadoEm: 'asc' }
                }
            }
        });
        res.json(orcamentos);
    } catch (error) {
        console.error('Erro GET /api/orcamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar orçamentos' });
    }
});

// Create new orcamento
app.post('/api/orcamentos', async (req: any, res) => {
    try {
        const { clienteId, clienteNome, telefone, descricao, valor } = req.body;

        if ((!clienteId && !clienteNome) || !descricao || typeof valor === 'undefined') {
            return res.status(400).json({ error: 'Dados incompletos para criar o orçamento' });
        }

        let cliente;

        if (clienteId) {
            cliente = await prisma.cliente.findUnique({ where: { id: clienteId, usuarioId: req.usuarioId } });
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
                    usuarioId: req.usuarioId
                },
            });
        }

        const novoOrcamento = await prisma.orcamento.create({
            data: {
                descricao,
                valor: Number(valor),
                status: 'pendente',
                usuario: {
                    connect: { id: req.usuarioId }
                },
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
app.patch('/api/orcamentos/:id/status', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const orcamentoAtigo = await prisma.orcamento.findUnique({
            where: { id, usuarioId: req.usuarioId },
        });
        if (!orcamentoAtigo) return res.status(404).json({ error: 'Orçamento não encontrado.' });

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
app.put('/api/orcamentos/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { descricao, valor, status } = req.body;

        // Buscar status anterior
        const orcamentoAtigo = await prisma.orcamento.findUnique({
            where: { id, usuarioId: req.usuarioId },
        });
        if (!orcamentoAtigo) return res.status(404).json({ error: 'Orçamento não encontrado.' });

        const dataAtualizacao: Prisma.OrcamentoUpdateInput = {};
        if (descricao) dataAtualizacao.descricao = descricao;
        if (typeof valor !== 'undefined') dataAtualizacao.valor = Number(valor);
        if (status) dataAtualizacao.status = status;

        if (Object.keys(dataAtualizacao).length === 0) {
            return res.status(400).json({ error: 'Nenhuma informação para atualizar' });
        }

        const eventosParaCriar: Prisma.OrcamentoEventoCreateWithoutOrcamentoInput[] = [];

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
app.delete('/api/orcamentos/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const pertence = await prisma.orcamento.findUnique({ where: { id, usuarioId: req.usuarioId } });
        if (!pertence) return res.status(404).json({ error: 'Orçamento não encontrado.' });

        await prisma.orcamento.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar orçamento' });
    }
});


// --- CONFIGURACOES ROUTES ---

// Get user config
app.get('/api/config', async (req: any, res) => {
    try {
        const config = await prisma.configuracao.findUnique({
            where: { usuarioId: req.usuarioId }
        });

        if (!config) {
            return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Update user config
app.put('/api/config', async (req: any, res) => {
    try {
        const { corPrimaria, tema, templateProposta, templateLembrete, templateAgradecimento } = req.body;

        const dataAtualizacao: Prisma.ConfiguracaoUpdateInput = {};
        if (corPrimaria) dataAtualizacao.corPrimaria = corPrimaria;
        if (tema) dataAtualizacao.tema = tema;
        if (templateProposta) dataAtualizacao.templateProposta = templateProposta;
        if (templateLembrete) dataAtualizacao.templateLembrete = templateLembrete;
        if (templateAgradecimento) dataAtualizacao.templateAgradecimento = templateAgradecimento;

        const config = await prisma.configuracao.update({
            where: { usuarioId: req.usuarioId },
            data: dataAtualizacao
        });

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});


// --- WHATSAPP ROUTES ---
app.get('/api/whatsapp/status', (req, res) => {
    if (!WHATSAPP_ENABLED) {
        return res.json({ ready: false, qrCode: '', pendingRequests: [], disabled: true });
    }

    res.json(getWhatsAppStatus());
});

app.post('/api/whatsapp/requests/:id/accept', async (req, res) => {
    if (!WHATSAPP_ENABLED) {
        return res.status(503).json({ error: 'Integração com WhatsApp desabilitada no ambiente atual' });
    }

    try {
        const { id } = req.params;
        const orcamento = await acceptWhatsAppRequest(id);
        res.json({ success: true, orcamento });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro ao aprovar solicitação';
        res.status(400).json({ error: message });
    }
});

app.post('/api/whatsapp/requests/:id/reject', (req, res) => {
    if (!WHATSAPP_ENABLED) {
        return res.status(503).json({ error: 'Integração com WhatsApp desabilitada no ambiente atual' });
    }

    try {
        const { id } = req.params;
        const success = rejectWhatsAppRequest(id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Solicitação não encontrada' });
        }
    } catch (e: unknown) {
        res.status(500).json({ error: 'Erro ao recusar solicitação' });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    if (!WHATSAPP_ENABLED) {
        return res.status(503).json({ error: 'Integração com WhatsApp desabilitada no ambiente atual' });
    }

    try {
        const success = await disconnectWhatsAppClient();
        res.json({ success });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});

app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`Servidor rodando na porta ${PORT} (IPv4 Explicitado)`);

    if (WHATSAPP_ENABLED) {
        // Start WhatsApp client when server starts
        startWhatsAppClient();
    } else {
        console.log(' Integração com WhatsApp desabilitada (WHATSAPP_ENABLED=false).');
    }
});
