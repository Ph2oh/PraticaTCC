# PROTÓTIPO | SGO — Sistema de Gerenciamento de Orçamentos

O prótipo de sistema de gestão de orçamentos, clientes para fotógrafos e prestadores de serviço. Construído em TypeScript com React no frontend, Express.js no backend e PostgreSQL como banco de dados.

---

## Visão Geral do Produto

A idéia do protótipo é ser uma aplicação SaaS multi-tenant desenvolvida para centralizar o processo comercial de profissionais que trabalham com orçamentos personalizados. O sistema contempla desde a captação de uma solicitação (via WhatsApp ou manual) até o fechamento ou perda do negócio, com rastreabilidade completa de cada evento.

### Problema que resolve

Profissionais que recebem solicitações de orçamento por vários canais (WhatsApp, DM, e-mail) tendem a perder o controle do funil comercial, não sabem sua taxa de conversão real, não identificam por que clientes rejeitam propostas e não acompanham metas mensais de receita.

### Público-alvo

Fotógrafos, videomakers, designers e demais profissionais criativos que trabalham com proposta/orçamento personalizado por cliente.

---

## Regras de Negócio do Sistema

Esta seção define as regras que governam o comportamento do sistema e devem ser respeitadas em qualquer alteração futura.

### Funil Comercial

Um orçamento percorre os seguintes status de forma sequencial, mas com possibilidade de regressão:

```
pendente → enviado → contratado
                   → recusado
```

| Status | Significado |
|:---|:---|
| `pendente` | Solicitação recebida, proposta ainda não enviada ao cliente |
| `enviado` | Proposta enviada, aguardando resposta |
| `contratado` | Cliente aceitou e o serviço foi fechado |
| `recusado` | Cliente recusou ou não respondeu (motivo obrigatório) |

**Regra:** Ao mover para `recusado`, o sistema obrigatoriamente solicita o motivo da recusa. Os motivos são categorizados e rastreados analiticamente.

---

### Motivos de Recusa Permitidos

Os motivos são padronizados para possibilitar análise agregada:

| Motivo | Descrição |
|:---|:---|
| Acima do orçamento | O cliente considerou o valor fora do seu planejamento financeiro |
| Cliente desqualificado | Lead fora do escopo ou serviço incompatível |
| Data indisponível | A data solicitada não está disponível na agenda |
| Sem retorno do cliente | Proposta enviada, sem resposta após follow-up |

**Regra:** Novos motivos só devem ser adicionados na constante `MOTIVOS_RECUSA` em `src/components/MotivoRecusaDialog.tsx`. O restante do sistema se adapta automaticamente.

---

### Regras de Negócio (Lógica e Funcionamento)

O sistema rastreia os valores financeiros e previne "vazamentos" de métricas ou ambiguidades durante as trocas de colunas do Kanban. A lógica se baseia em separar rigidamente as etapas de conquista (contratos), captação (leads) e perda (rejeições), delegando cada uma a uma coluna temporal fixa no banco de dados, parando de depender unicamente do nome do seu status flutuante.

**Exemplos práticos:**

| Situação | Comportamento |
|:---|:---|
| Orçamento criado em março, fechado em maio | Contabilizado na receita de **março** |
| Orçamento criado em fevereiro, recusado em abril | Contabilizado nas perdas de **fevereiro** |
| Cliente cancela contrato após fechamento | O status pode ser revertido; o impacto fica no mês de criação |


#### 1. Volume de Captação (O que enche o pipeline?)
Tudo que entra no escopo tem a métrica contábil gerada pela `dataRecebido`.
- **Regra Exata:** A data registra o exato instante em que um contato inicial ocorre e um negócio é criado.
- **Como funciona:** Quando são recebidos 50 contatos comerciais num determinado mês (ex: fevereiro), todos pertencerão estatisticamente ao volume de captação histórico deste próprio mês, tornando estática e imutável a leitura do topo do funil referente àquele período.

#### 2. Competência Fechada (Contabilidade de Receitas)
Isso resolve o paradigma: _"Se um orçamento foi emitido em Janeiro, mas a confirmação e o fechamento do serviço só ocorreram em Março, qual painel deve refletir a receita?"_ 
- **Regra Exata:** O mês do fechamento (neste exemplo, março). Nenhuma receita escapa do controle, pois o faturamento é rastreado exclusivamente pela presença da coluna `dataFechamento`.

- **Como funciona de forma autônoma:**
  - A transição exige zero intervenção direta nas datas. Assim que uma proposta é movimentada para o status `contratado`, o Servidor _Backend_ registra imediatamente um _timestamp_ do relógio central no campo `dataFechamento`.
  - Essa ação blinda o mês em curso. O sistema sempre buscará e atrelará o lucro do negócio especificamente à competência real em que ocorreu o acordo.

- **Tratamento de Anomalias de Estágio:** Nos casos em que um orçamento é movido para "contratado" de maneira equivocada e revertido logo em seguida (ex: voltar um orçamento de `contratado` para `pendente`), o servidor está arquitetado para purificações automáticas. Ao constatar a regressão do status, o sistema redefine e esvazia automaticamente as marcações da `dataFechamento` e `dataCancelamento` de volta para `null`. Isso expurga subitamente aquele valor de qualquer análise visual de "Receita", corrigindo os números de fechamento sem exigir limpezas do operador.

#### 3. Competência de Rejeições (Isolamento Frio de Perdas)
Semelhante à separação da receita, as perdas são enxergadas sob a métrica inflexível da `dataCancelamento`.
- **Regra Exata:** Se qualquer negociação for encerrada como `recusado` ou `perdido`, o banco separa e grava imediatamente esta interrupção em seu eixo temporal, removendo os valores circulantes do _pipeline_ de previsão.
- **Como funciona:** O acionamento trava um painel obrigatório levantando o interrogatório do "por que" foi perdido (ex: MotivoRecusaDialog) e instintivamente assina o atestado dessa perda definindo a restrição de que tais fluxos saiam do escopo de métricas passíveis aos valores ganhos da empresa.

---

### Isolamento de Dados (Multi-Tenant)

Cada usuário autenticado enxerga apenas seus próprios dados. Isso é garantido por:

1. O middleware `authenticateToken` injeta `req.usuarioId` em todas as requisições autenticadas.
2. **Toda** query ao banco de dados inclui `where: { usuarioId: req.usuarioId }`.
3. Não existe endpoint que retorne dados de outros usuários, mesmo para administradores.

---

### Metas e Configurações

| Meta | Valor Padrão | Configurável |
|:---|:---|:---|
| Meta de Receita Mensal | R$ 20.000 | Sim, na aba Configurações |
| Meta de Taxa de Conversão | 45% | Sim, na aba Configurações |
| Meta de Contratos por Semana | 3 | Por enquanto estático no código |

As metas são armazenadas por usuário na tabela `Configuracao` e impactam diretamente os indicadores visuais dos cards do Dashboard.

---

### Histórico de Eventos (Audit Log)

Todo orçamento possui um histórico de eventos imutável (append-only). Os seguintes eventos são registrados automaticamente:

| Tipo | Quando é criado |
|:---|:---|
| `criado` | Ao criar um novo orçamento |
| `status_alterado` | Ao mover entre qualquer status; inclui status anterior, novo e motivo de recusa quando aplicável |
| `atualizado` | Ao editar descrição ou valor |

**Regra:** Eventos nunca são deletados. Se um orçamento for excluído, os eventos são removidos por cascata no banco (ON DELETE CASCADE).

---

## Arquitetura e Estrutura do Projeto

```text
PraticaTCC/
├── server/
│   └── index.ts              <- API REST Express (porta 3001)
├── src/
│   ├── api/                  <- Funcoes de fetch HTTP
│   │   ├── orcamentos.ts
│   │   └── clientes.ts
│   ├── components/           <- Componentes reutilizaveis
│   │   ├── KanbanBoard.tsx   <- Visualizacao em colunas de status com drag-and-drop
│   │   ├── DetalhesDrawer.tsx <- Painel lateral de detalhes do orcamento
│   │   ├── MotivoRecusaDialog.tsx <- Dialog de selecao de motivo ao recusar
│   │   ├── NovoOrcamentoDialog.tsx <- Formulario de criacao de orcamento
│   │   ├── StatusBadge.tsx   <- Badge visual de status
│   │   ├── ProtectedRoute.tsx <- Guard de autenticacao (redireciona para '/' se nao autenticado)
│   │   └── EmptyState.tsx    <- Componente de estado vazio
│   ├── contexts/
│   │   └── AuthContext.tsx   <- Contexto de autenticacao JWT
│   ├── hooks/                <- Custom hooks (React Query)
│   │   ├── useOrcamentos.ts
│   │   ├── useClientes.ts
│   │   └── useConfig.ts
│   ├── lib/
│   │   └── exportUtils.ts    <- Motor de exportacao (CSV, Excel XLSX e PDF)
│   ├── pages/
│   │   ├── LadingPage.tsx    <- Landing page publica (ponto de entrada '/')
│   │   ├── Dashboard.tsx     <- KPIs, graficos e analises (/dashboard)
│   │   ├── Orcamentos.tsx    <- Listagem, Kanban e gestao de orcamentos
│   │   ├── Clientes.tsx      <- Listagem de clientes
│   │   ├── Configuracoes.tsx <- Metas, templates e preferencias
│   │   ├── Relatorios.tsx    <- Deep Analytics com exportacao
│   │   ├── Login.tsx         <- Pagina de login (/login)
│   │   └── Register.tsx      <- Pagina de registro (/register)
│   ├── types.ts              <- Interfaces TypeScript globais
│   └── index.css             <- Tokens de design e variaveis de tema
├── prisma/
│   ├── schema.prisma         <- Modelo de dados relacional
│   ├── migrations/           <- Historico de migracoes SQL
│   └── seed.ts               <- Dados iniciais e usuario admin
└── package.json
```

---

## Estrutura de Rotas

O roteamento da aplicacao e dividido entre rotas publicas (acessiveis sem autenticacao) e rotas protegidas (exigem token JWT valido).

| Rota | Tipo | Componente | Descricao |
|:---|:---|:---|:---|
| `/` | Publica | `LadingPage.tsx` | Landing page comercial para novos usuários (design inspirado em CRMs modernos) |
| `/login` | Publica | `Login.tsx` | Formulario de autenticacao |
| `/register` | Publica | `Register.tsx` | Formulario de criacao de conta |
| `/dashboard` | Protegida | `Dashboard.tsx` | Painel principal com KPIs e graficos |
| `/orcamentos` | Protegida | `Orcamentos.tsx` | Gestao do funil de orcamentos |
| `/clientes` | Protegida | `Clientes.tsx` | Carteira de clientes com LTV |
| `/relatorios` | Protegida | `Relatorios.tsx` | Deep Analytics com exportacao |
| `/configuracoes` | Protegida | `Configuracoes.tsx` | Metas, temas e templates |

**Fluxo de autenticacao:**
1. Usuario nao autenticado acessa qualquer URL protegida -> redirecionado para `/`
2. Usuario clica em "Login" na landing page -> vai para `/login`
3. Apos login bem-sucedido -> redirecionado para `/dashboard`
4. Ao fazer logout -> redirecionado para `/` (landing page)


## Modelo de Dados

### Orcamento

```sql
id            (UUID, PK)
descricao     (String)
valor         (Float)
status        (String: pendente | enviado | contratado | recusado)
motivoRecusa  (String?, nullable — preenchido somente quando status = 'recusado')
dataRecebido  (DateTime — data de criação, IMUTÁVEL para cálculo de métricas)
dataAtualizado (DateTime — atualizado automaticamente pelo Prisma no UPDATE)
dataFechamento (DateTime?, nullable — preenchido automaticamente ao mudar status para 'contratado', resetado em outros)
dataCancelamento (DateTime?, nullable — preenchido automaticamente ao mudar status para 'recusado' ou equivalente)
clienteId     (UUID, FK → Cliente)
usuarioId     (UUID, FK → Usuario)
```

### OrcamentoEvento (Histórico Imutável)

```sql
id           (UUID, PK)
orcamentoId  (UUID, FK → Orcamento, CASCADE DELETE)
tipo         (String: criado | status_alterado | atualizado)
descricao    (String)
statusAntigo (String?)
statusNovo   (String?)
criadoEm     (DateTime)
```

### Cliente

```sql
id              (UUID, PK)
nome            (String)
email           (String)
telefone        (String)
ultimoContato   (DateTime)
totalOrcamentos (Int)
usuarioId       (UUID, FK → Usuario)
```

### Configuracao

```sql
usuarioId            (UUID, unique FK → Usuario)
corPrimaria          (String — token HSL da cor primária do tema)
tema                 (String: light | dark | system)
metaReceita          (Float — Meta de receita mensal em R$)
metaConversao        (Float — Meta de taxa de conversão em %)
templateProposta     (String — Template de mensagem WhatsApp)
templateLembrete     (String — Template de lembrete)
templateAgradecimento (String — Template pós-fechamento)
```

---

## Stack de Tecnologia

| Camada | Tecnologia | Função |
|:---|:---|:---|
| Frontend | React 18 + TypeScript | Interface SPA com componentes tipados |
| Build | Vite 5 | Build rápido com HMR |
| Styling | Tailwind CSS 3 + shadcn/ui | Sistema de design utilitário com componentes acessíveis |
| Estado remoto | TanStack React Query 5 | Cache, invalidação e sincronização de dados do servidor |
| Gráficos | Recharts | Gráficos de barras, pizza e linhas no Dashboard |
| Backend | Express.js 5 | API REST com middlewares de autenticação e rate limiting |
| Auth | JWT + Bcrypt | Autenticação stateless com senha hasheada |
| ORM | Prisma 5 | Acesso tipado ao banco com controle de schema via migrations |
| Banco | PostgreSQL 15 | Banco relacional com integridade referencial |
| Integração | whatsapp-web.js | Emulação do cliente web do WhatsApp via Puppeteer |

---

## Design System

O sistema utiliza um tema baseado em CSS Custom Properties (HSL) com suporte a dark/light mode e modo automático por preferência do sistema.

### Tokens de Cor Principais

| Token | Light | Dark |
|:---|:---|:---|
| `--background` | Cinza muito claro | Azul escuro `#0b0f15` |
| `--card` | Branco | Slate elev. `#141a22` |
| `--sidebar-background` | Mesmo do background | Mais escuro que o card |
| `--border` | Cinza sutil | Slate `#21262d` |
| `--primary` | Violeta 600 `#7C3AED` | Mesmo no dark |

O dark mode é inspirado na paleta do GitHub Dark e no Antigravity, com camadas de profundidade distintas para separar sidebar, fundo, cards e modais visualmente.

---

## Gerenciamento de Estado Simplificado (Hooks)

Para evitar re-renderizações e a proliferação visual de carregamentos longos ("_loading..._"), o Frontend empodera o banco com a camada do **React Query** a partir de ganchos flexíveis encapsulados em `src/hooks/`.

1. **`useOrcamentos.ts`**: Delega as buscas e agrega métodos que efetuam adições pontuais e exclusões otimistas nas linhas (`optimistic updates`) na tabela e no fluxo _Kanban_ sem esperá-las persistirem no MySQL antes do encerramento das requisições REST; devolvendo uma experiência veloz e à prova de travamentos. Em caso da requisição falhar no servidor, recua imediatamente o fluxo retornando _Toasts_ notificados.
2. **`useClientes.ts`**: Opera o cadastro massivo ou edição de carteira de contatos baseados também nas ferramentas do Query.
3. **`useConfig.ts`**: Mantém a coesão guardando metas configuráveis e visuais e repassando isso do Banco diretamente a memória _cache_ React.
4. **`useWhatsApp.ts`**: Mantém os gatilhos dedicados às interações REST específicas exigidas ao aprovar _leads_ escaneados no WhatsApp e lidar com os status remotos em conjunto do Bot rodado via Node.

---


## Execução Local

### Pré-requisitos

- Node.js v18 ou superior
- Servidor PostgreSQL (local com Docker ou na nuvem com [Neon.tech](https://neon.tech))
- Chromium/Chrome instalado (apenas para testar integração WhatsApp)

### Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd PraticaTCC
npm install
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
# Banco de dados (obrigatório)
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"

# JWT (obrigatório — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="sua_chave_de_64_caracteres"

# WhatsApp (opcional, desative para desenvolvimento mais rápido)
WHATSAPP_ENABLED="false"
WHATSAPP_USER_EMAIL="admin@sgo.com"
```

### Banco de Dados

```bash
npx prisma db push      # Cria as tabelas no banco
npx prisma generate     # Gera os tipos TypeScript do Prisma
npm run seed            # Cria o usuário admin e dados iniciais
```

### Iniciando

```bash
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

### Credenciais Padrão

- **E-mail:** `admin@sgo.com`
- **Senha:** `password123`

---

## Erros Comuns

### "JWT_SECRET não está definido"
Certifique-se de que `.env` existe na raiz do projeto e contém a variável `JWT_SECRET`.

### "Environment variable not found: DATABASE_URL"
Verifique se `.env` existe, contém uma URL PostgreSQL válida e o banco está acessível.

### Backend não conecta na porta 3001

```bash
netstat -ano | findstr :3001   # Verifica o que está usando a porta (Windows)
taskkill /IM node.exe /F       # Mata processos Node.js antigos (Windows)
npm run dev:server             # Rode só o backend para ver o erro detalhado
```

### WhatsApp: "Browser is already running"

```bash
node scripts/cleanup-chrome.js
```

### Prisma Schema fora de sincronia após deploy

O script de build já inclui `prisma db push` automaticamente. Para forçar manualmente:

```bash
npx prisma db push --accept-data-loss
npx prisma generate
```