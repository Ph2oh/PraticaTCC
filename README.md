# SGO - Sistema de Gerenciamento de Orçamentos

Uma aplicação full-stack moderna para gerenciar orçamentos com histórico de eventos, visualizações interativas e integração com WhatsApp.

## Pré-Requisitos

- **Node.js** v18+ (com npm)
- **Git**
- **SQLite** (incluído automaticamente via Prisma)

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Instale as dependências
npm install

# 3. Configure o banco de dados
npx prisma generate
npm run seed

# 4. Inicie o desenvolvimento
npm run dev:all
```

A aplicação abrirá em:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

---

## 📦 Estrutura do Projeto

```
PraticaTCC/
├── server/                   ← Backend Express.js
│   └── index.ts              ← API REST (localhost:3001)
├── src/                      ← Frontend React
│   ├── components/           ← Componentes reutilizáveis UI
│   │   ├── KanbanBoard.tsx   ← Visualização drag & drop
│   │   ├── DetalhesDrawer.tsx ← Drawer com abas e timeline
│   │   └── ...outros
│   ├── pages/                ← Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Orcamentos.tsx
│   │   └── Clientes.tsx
│   ├── hooks/                ← Custom hooks
│   │   ├── useOrcamentos.ts
│   │   └── useClientes.ts
│   ├── api/                  ← Chamadas HTTP
│   │   ├── orcamentos.ts
│   │   └── clientes.ts
│   ├── types.ts              ← Tipos TypeScript
│   └── index.css             ← Estilos globais
├── prisma/                   ← ORM e Banco de Dados
│   ├── schema.prisma         ← Modelo de dados
│   ├── migrations/           ← Histórico de mudanças
│   ├── seed.ts               ← Dados iniciais de teste
│   └── dev.db                ← Banco SQLite
└── package.json              ← Dependências
```

---

## Stack Tecnológico

| **Camada** | **Tecnologia** | **Versão** |
|-----------|--------------|----------|
| **Frontend** | React | 18.x |
| **Linguagem** | TypeScript | 5.x |
| **Build** | Vite | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **Componentes** | shadcn/ui (Radix UI) | Latest |
| **Roteamento** | React Router | 6.x |
| **Estado** | React Query (TanStack) | 5.x |
| **Formulários** | React Hook Form + Zod | Latest |
| **Drag & Drop** | @hello-pangea/dnd | 18.x |
| **Backend** | Express.js | 4.x |
| **Integração WhatsApp**| whatsapp-web.js / puppeteer | Latest |
| **Database** | SQLite + Prisma ORM | 5.x |
| **HTTP Client** | Fetch API | Nativo |

---

## Funcionalidades Principais

### Dashboard
- Cards com KPI (Total clientes, orçamentos por status, faturamento)
- Visualização de métricas em tempo real
- Gráficos de distribuição

### Gestão de Orçamentos
#### Visualização Dupla:
- **Tabela**: CRUD completo, filtros e busca global
- **Kanban**: Drag & drop entre status, grid responsivo (1-4 colunas)

#### Abas no Drawer de Detalhes:
1. **Detalhes** - Informações completas, edição de status
2. **WhatsApp** - Link para enviar mensagem via WhatsApp Web
3. **Timeline** - Histórico completo com eventos ordenados cronologicamente

### Gestão de Clientes
- Lista de clientes registrados
- Criar novo cliente
- Visualizar orçamentos associados
- Atualizar informações

### Timeline de Eventos (Novo!)
- Histórico automático desde criação
- Rastreia: criação do orçamento, mudanças de status
- Marcações cronológicas precisas
- Visualização em linha do tempo

### Integração com WhatsApp (Novo!)
- **Comunicação por QR Code:** O sistema se conecta diretamente ao seu número via biblioteca `whatsapp-web.js`.
- **Fila de Aprovação (Memória):** Quando um cliente envia a palavra "orçamento", o servidor retém a mensagem em memória e gera um **Popup Global Interativo** em qualquer tela do Front-end.
- **Verificação de Duplicidade:** Ignora automaticamente contatos que já possuam orçamentos pendentes para evitar duplicações.
- **Gaveta de Comunicação Rápida:** Tela de Detalhes possui atalhos (templates predefinidos) que abrem chamadas nativas do WhatsApp Web com mensagens personalizadas (Propsta, Lembrete, Agradecimento).
- **Sem Auto-Replies:** Respeitando regras personalizadas, atua apenas de forma passiva através da captura de orçamentos e facilitação de links.

---

## Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev           # Frontend (Vite) - porta 5173
npm run dev:server    # Backend (Express) - porta 3001
npm run dev:all       # Ambos simultâneos (usa concurrently)
```

### Build & Deploy
```bash
npm run build         # Compila para produção (./dist)
npm run build:dev     # Build em modo desenvolvimento
npm run preview       # Visualiza build produção
```

### Qualidade de Código
```bash
npm run lint          # ESLint - verifica código
npm run test          # Vitest - testes unitários
npm run test:watch    # Testes em modo watch
```

### Database
```bash
npm run seed          # Popula banco com dados de teste
```

---

## Fluxo de Dados

```
┌─────────────────────────────────────┐
│      FRONTEND (React)               │
│   Componentes (TypeScript)          │
│  ↓                                  │
│  React Query + Hooks Customizados   │
│  ↓                                  │
│  Fetch API HTTP                     │
└─────────────────────────────────────┘
          ║ (JSON)
          ↓
┌─────────────────────────────────────┐
│    BACKEND (Express.js)             │
│    localhost:3001                   │
├─────────────────────────────────────┤
│  GET/POST/PUT/DELETE                │
│  /api/orcamentos                    │
│  /api/clientes                      │
│  ↓                                  │
│  Prisma ORM                         │
└─────────────────────────────────────┘
          ║
          ↓
┌─────────────────────────────────────┐
│    SQLite Database                  │
│    ./prisma/dev.db                  │
├─────────────────────────────────────┤
│  Tabelas:                           │
│  • Cliente                          │
│  • Orcamento                        │
│  • OrcamentoEvento (Histórico)      │
└─────────────────────────────────────┘
```

---

## Modelo de Dados

### Cliente
```sql
id (UUID)
nome (String)
email (String)
telefone (String)
ultimoContato (DateTime)
totalOrcamentos (Int)
createdAt (DateTime)
updatedAt (DateTime)
```

### Orcamento
```sql
id (UUID)
descricao (String)
valor (Float)
status (String: pendente|enviado|contratado|recusado)
dataRecebido (DateTime)
dataAtualizado (DateTime)
clienteId (UUID - Foreign Key)
```

### OrcamentoEvento (Histórico)
```sql
id (UUID)
orcamentoId (UUID - Foreign Key)
tipo (String: criado|status_alterado|atualizado)
descricao (String)
statusAntigo (String - nullable)
statusNovo (String - nullable)
criadoEm (DateTime)
```

---

## API REST Endpoints

### Orçamentos
```
GET    /api/orcamentos              # Lista todos
GET    /api/orcamentos/:id          # Busca um
POST   /api/orcamentos              # Cria novo
PUT    /api/orcamentos/:id          # Atualiza
DELETE /api/orcamentos/:id          # Deleta
PATCH  /api/orcamentos/:id/status   # Muda status
```

### Clientes
```
GET    /api/clientes                # Lista todos
GET    /api/clientes/:id            # Busca um
POST   /api/clientes                # Cria novo
PUT    /api/clientes/:id            # Atualiza
DELETE /api/clientes/:id            # Deleta
```

---

## Exemplo: Criar um Orçamento

### Frontend (React)
```typescript
import { useCreateOrcamento } from '@/hooks/useOrcamentos';

export function NovoOrcamentoDialog() {
  const { mutate: createOrcamento } = useCreateOrcamento();

  const handleSubmit = (data) => {
    createOrcamento({
      clienteId: "123",
      descricao: "Pintura residencial",
      valor: 5000
    });
  };

  return (
    <Dialog>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {/* Campos do formulário */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Backend (Express + Prisma)
```typescript
app.post('/api/orcamentos', async (req, res) => {
  const { clienteId, descricao, valor } = req.body;

  // Criar orçamento
  const novoOrcamento = await prisma.orcamento.create({
    data: {
      descricao,
      valor: Number(valor),
      status: 'pendente',
      cliente: { connect: { id: clienteId } },
    },
    include: { cliente: true, eventos: true },
  });

  // Registrar evento automaticamente
  await prisma.orcamentoEvento.create({
    data: {
      orcamentoId: novoOrcamento.id,
      tipo: 'criado',
      descricao: 'Orçamento criado',
    },
  });

  res.status(201).json(novoOrcamento);
});
```

### Fluxo Completo
1. Usuário preenche formulário no Frontend
2. React Hook Form valida com Zod
3. useCreateOrcamento envia POST para `/api/orcamentos`
4. Express recebe, Prisma insere no banco
5. Evento criado automaticamente na tabela OrcamentoEvento
6. React Query intercepta resposta e atualiza cache
7. UI renderiza novo orçamento sem precisar recarregar

---

## Características Diferenciais

### Stack Moderno
- **Vite** em vez de Create React App (5x mais rápido)
- **TypeScript** obrigatório em todo código
- **Tailwind + shadcn** (componentes profissionais prontos)

### Full-Stack JavaScript
- Mesma linguagem (TypeScript) frontend e backend
- Compartilhamento de tipos
- Sem necessidade de GraphQL

### Database Flexível
- Prisma permite trocar SQLite → PostgreSQL facilmente
- Migrations automáticas
- Queries type-safe

### 🔄 State Management Inteligente
- React Query cacheando automaticamente
- Sem Redux ou Zustand complexos
- Sincronização automática com servidor

### 📦 Componentes Reutilizáveis
- shadcn/ui (componentes Radix copiadoslocalmente)
- Totalmente customizáveis via Tailwind
- Acessibilidade nativa (WCAG)

### Drag & Drop Nativo
- TanStack usando @hello-pangea/dnd
- Performance otimizada
- Sem jQuery

### 🕐 Timeline de Eventos
- Histórico automático de todas operações
- Rastreia criação, mudanças de status
- Ordenação cronológica

---

## Deploy

### Opção 1: Vercel (Recomendado)
```bash
npm i -g vercel
vercel

# Frontend vai para Vercel
# Backend vai para servidor separado (Render, Railway, etc)
```

### Opção 2: Self-Hosted
```bash
npm run build
npm start  # Serve ./dist
```

### Opção 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "dev:all"]
```

---

## Próximas Melhorias

- [ ] Autenticação com JWT
- [ ] Upload de arquivos (fotos/PDFs)
- [ ] Relatórios em PDF (PDFKit)
- [ ] Notificações em tempo real (WebSocket)
- [ ] Integração WhatsApp Business API
- [ ] Sistema de múltiplos usuários
- [ ] Analytics avançado
- [ ] Backup automático
- [ ] Validação de CPF/CNPJ
- [ ] Integração com Payment APIs

---

## Troubleshooting

### Porta 5173 em uso
```bash
npm run dev -- --port 5174
```

### Porta 3001 em uso
```bash
lsof -i :3001
kill -9 <PID>
# ou
npm run dev:server -- --port 3002
```

### Erro no Prisma
```bash
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

### Limpar banco de dados
```bash
rm prisma/dev.db
npm run seed
```

---

## Referências Úteis

- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Query Docs](https://tanstack.com/query)
- [Express Docs](https://expressjs.com)

---

## Licença

Este projeto é privado. Todos os direitos reservados.

---

## Suporte

Para dúvidas ou reportar bugs, abra uma issue no repositório.

---

**Desenvolvido usando TypeScript, React e Express.js**
