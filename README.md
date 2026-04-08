# SGO - Sistema de Gerenciamento de Orçamentos

Sistema para gerenciamento de clientes, orçamentos, registro de histórico de eventos e integração com o WhatsApp via emulação do cliente web. Desenvolvido em TypeScript.

---

## Estrutura do Projeto

A aplicação é dividida em um frontend Single Page Application (SPA) e uma API RESTful no backend.

```text
PraticaTCC/
├── server/                   ← Backend Express.js
│   └── index.ts              ← API REST (localhost:3001)
├── src/                      ← Frontend React
│   ├── components/           ← Componentes reutilizáveis UI
│   │   ├── KanbanBoard.tsx   ← Visualização de estágios
│   │   ├── DetalhesDrawer.tsx ← Painel lateral com informações
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
│   ├── types.ts              ← Declarações de tipos TypeScript
│   └── index.css             ← Estilos globais
├── prisma/                   ← Arquivos do ORM e Banco de Dados
│   ├── schema.prisma         ← Declaração do modelo de dados
│   ├── migrations/           ← Arquivos de migração SQL
│   └── seed.ts               ← Script para dados iniciais
└── package.json              ← Gerenciamento de dependências
```

---

## Tecnologias Utilizadas e Justificativas

A stack foi definida priorizando consistência de tipagem entre camadas, previsibilidade de comportamento e eficiência no desenvolvimento.

| Camada | Tecnologia | Versão | Função Principal e Justificativa |
| :--- | :--- | :--- | :--- |
| **Frontend** | `React` | 18.x | Biblioteca para construção de interfaces baseada em componentes. Permite reuso, organização modular e ampla integração com o ecossistema web atual. |
| **Linguagem** | `TypeScript` | 5.x | Superset do JavaScript com tipagem estática. Garante contratos explícitos entre módulos e reduz inconsistências entre frontend e backend. |
| **Build** | `Vite` | 5.x | Ferramenta de build orientada a performance. Inicialização rápida e HMR eficiente, reduzindo o tempo de feedback durante o desenvolvimento. |
| **Styling** | `Tailwind CSS` | 3.x | Abordagem utilitária para estilização. Elimina a necessidade de arquivos CSS extensos e favorece consistência visual diretamente na estrutura dos componentes. |
| **Componentes** | `shadcn/ui` | Latest | Base de componentes acessíveis construída sobre Radix UI. Permite customização total sem abstrações rígidas ou dependência de bibliotecas fechadas. |
| **Estado Remoto** | `React Query` | 5.x | Gerenciamento de estado assíncrono e cache de requisições. Centraliza o controle de dados remotos, incluindo invalidação, refetch e sincronização. |
| **Backend** | `Express.js` | 4.x | Framework HTTP minimalista para Node.js. Estrutura simples para definição de rotas, middlewares e APIs REST. |
| **Autenticação** | `JWT + Bcrypt` | Latest | JWT para autenticação stateless e Bcrypt para hashing seguro de senhas. Garante isolamento de credenciais e controle de sessão sem persistência no servidor. |
| **Validação** | `Zod` | 3.x | Validação declarativa de schemas com tipagem integrada. Utilizado na borda da aplicação para garantir integridade dos dados recebidos. |
| **Database** | `PostgreSQL` | 15.x | Banco relacional com suporte a transações ACID, integridade referencial e consultas complexas. |
| **ORM** | `Prisma ORM` | 5.x | Camada de abstração para acesso ao banco com tipagem forte e controle de migrations. Reduz erros de consulta e padroniza o acesso aos dados. |
| **Integração** | `whatsapp-web.js` | Latest | Automação baseada em sessão web do WhatsApp. Viabiliza integração sem dependência direta da API oficial, reduzindo custo e barreiras de entrada. |

---

## Componentes do Sistema

### Dashboard
*   Exibição de métricas gerais: Total de clientes, orçamentos por status e faturamento calculado a partir dos orçamentos aprovados.
*   Gráficos para análise de distribuição de dados e funil de conversão.

### Gestão de Orçamentos
*   **Interface de Listagem:** Exibição em tabela com capacidade de busca e filtros, juntamente com visualização em Kanban para alteração de status via drag-and-drop.
*   **Painel de Detalhes:** Componente de sobreposição acionado ao selecionar um orçamento, dividindo a visualização em abas: Detalhes Financeiros, Controles do WhatsApp e Histórico de Eventos.

### Gestão de Clientes e Histórico
*   Listagem de clientes com paginação e associação aos respectivos orçamentos.
*   **Registro de Eventos:** Persistência no formato append-only para o fluxo de eventos de cada orçamento, onde operações de criação, modificação de dados e alteração de status são registradas com data e hora.

### Sistema de Onboarding Interativo
*   **Integração:** Novo recurso empregando `react-joyride` para apresentar as visões globais do sistema aos usuários na sua primeira viagem de navegação.
*   **Comportamento:** Engatilhado passivamente (Baseado na leitura do `localStorage`), guiando por botões chaves do Dashboard e Buscas, sumindo discretamente sem persistir carga no banco de dados.

---

## Middlewares, Segurança e Isolamento Lógico

 aplicação adota o modelo Multi-Tenant na arquitetura e na persistência de dados:

*   **Autenticação JWT (`authenticateToken`):** 
    *   **Função:** Middleware inserido para travar a base das rotas de API não-públicas (excluindo `/auth`).
    *   **Mecânica:** Ele extrai o `Authorization: Bearer <Token>`, verifica a assinatura do token JWT com a chave `JWT_SECRET` em ambiente isolado (`.env`). Quando aceito, injeta as propriedades `usuarioId` e `isAdmin` no objeto global Request.
    *   **Isolamento (Tenant-Level):** As controllers capturam esse `req.usuarioId` injetado pelo middleware e obrigatoriamente acoplam na tag de `{ where: { usuarioId: req.usuarioId } }` do banco de dados (Prisma). Portanto, nunca um inquilino vai ver as tabelas dos outros.
*   **Rate Limiting (`express-rate-limit`):**
    *   **Ameaça prevenida:** Ataques de Força Bruta ou Inundações de Requisições Automatizadas (Scripts/Spam).
    *   **Mecânica aplicada:** Embutido nos handlers `/api/auth/login` e `/register`, confina endereços de IP que erraram suas tentativas de acesso por limite excessivo em uma janela curta de minutos, bloqueando o tráfego até o período ser aliviado.
*   **Validações Preventivas e de Acesso Privilegiado:** 
    *   **Zod Schema:** Analisa o body (`req.body`) comparado ao molde de forma defensiva antes da camada se aprofundar dentro do express.
    *   **Middleware de Administrador:** Certas integrações pesadas como Iniciar, Aceitar e Recusar requisições atreladas ao worker do Puppeteer do WhatsApp utilizam uma dupla validação que verifica a existência nativa da flag `req.isAdmin`. Apenas o e-mail master (seed principal) tem esse privilégio na conta.

---

## Integração com WhatsApp

A comunicação não adota a API oficial provida pela provedora, mas sim a emulação do cliente Web gerenciada pelo processo Node.js:

*   **Motor de Execução:** O worker aloca uma instância isolada do navegador Chromium usando Puppeteer, armazenando as sessões validadas para manter o estado persistente entre inicializações.
*   **Gerenciamento de Processos e Sinalização:** O sistema reage a eventos de interrupção (`SIGINT`, `SIGTERM`) para encerrar de maneira limpa as dependências do Puppeteer, mitigando o acúmulo de processos vazados (`zombie processes`) e potenciais perdas de memória em hospedagem.
*   **Processamento Seletivo:** O listener de eventos descarta mensagens passivas no nível inicial e efetua a indexação de requisições baseando-se em mapeamentos definidos na memória antes de registrar a solicitação no PostgreSQL.
*   **Comunicação em Tempo Real:** Requisições e confirmações pendentes obtidas pelo worker são emitidas para o frontend mediante conexões WebSocket ou Polling de API REST.

---

## Fluxo de Interação de Dados

```text
┌─────────────────────────────────────┐
│      FRONTEND (React)               │
│   Componentes (TypeScript)          │
│  ↓                                  │
│  React Query + Hooks Customizados   │
│  ↓                                  │
│  Fetch API HTTP                     │
└─────────────────────────────────────┘
          ║ (Payload JSON)
          ↓
┌─────────────────────────────────────┐
│    BACKEND (Express.js)             │
│    Escuta TCP na porta 3001         │
├─────────────────────────────────────┤
│  GET/POST/PUT/DELETE                │
│  /api/orcamentos                    │
│  /api/clientes                      │
│  ↓                                  │
│  Validação de Schemas e Prisma ORM  │
└─────────────────────────────────────┘
          ║
          ↓
┌─────────────────────────────────────┐
│    PostgreSQL Database              │
├─────────────────────────────────────┤
│  Tabelas Mapeadas:                  │
│  • Usuario (O dono da conta SaaS)   │
│  • Cliente                          │
│  • Orcamento                        │
│  • Configuracao                     │
│  • OrcamentoEvento (Histórico)      │
└─────────────────────────────────────┘
```

### Fluxo de Mensagens do WhatsApp

```text
┌──────────────────┐       ┌─────────────────────────┐       ┌───────────────────────┐
│ Cliente WhatsApp │ ────> │ API Web do WhatsApp     │ ────> │ Worker Node.js        │
│ (Usuário Final)  │ <──── │ (Infraestrutura Oficial)│ <──── │ (Puppeteer/Chromium)  │
└──────────────────┘       └─────────────────────────┘       └───────────────────────┘
                                                                       │
                                 ┌─────────────────────────────────────┴─┐
                                 │                                       │
                         ┌───────▼───────┐                       ┌───────▼───────┐
                         │ Ignora Grupos │                       │   Filtra      │
                         └───────────────┘                       │ "Orçamento"   │
                                                                 └───────┬───────┘
                                                                         │
┌────────────────────────┐       ┌─────────────────────────┐     ┌───────▼───────┐
│ Frontend React         │ <──── │ Backend Express.js      │ <── │ Validação e   │
│ (Aprovação em painel)  │ ────> │ (Persiste no banco)     │ ──> │ Anti-Spam     │
└────────────────────────┘       └─────────────────────────┘     └───────────────┘
```

---

## Modelo de Dados (Schema)

Os metadados das entidades principais da modelagem relacional:

### Cliente
```sql
id (UUID)
nome (String)
email (String)
telefone (String)
ultimoContato (DateTime)
totalOrcamentos (Int)
```

### Orcamento
```sql
id (UUID)
descricao (String)
valor (Float)
status (String: pendente | enviado | contratado | recusado)
dataRecebido (DateTime)
clienteId (UUID - Relacional)
```

### OrcamentoEvento (Histórico)
```sql
id (UUID)
orcamentoId (UUID - Relacional)
tipo (String: criado | status_alterado | atualizado)
descricao (String)
statusAntigo (String - Opcional)
statusNovo (String - Opcional)
criadoEm (DateTime)
```

---

## API REST Endpoints

A interface base para acesso local recebe tráfego na URI `http://localhost:3001/api`.

### Autenticação
*   `POST /auth/login` - Verifica credenciais (hash Bcrypt) e emite acesso no cabeçalho JWT Bearer.
*   `POST /auth/register` - Endpoint base para registro de provedor.
*   `GET /auth/me` - Retorna a carga nominal do usuário empregando validação do Token na requisição.

### Gerenciamento de Dados
*   `GET /orcamentos` e `GET /clientes` - Retorna a lista dos consolidados parametrizados pelos filtros de tenant e paginação.
*   `POST /orcamentos` - Execução do comando INSERT da entidade do orçamento, associado ao primeiro evento auditado na tabela `OrcamentoEvento` para evitar perda transacional.
*   `PATCH /orcamentos/:id/status` - Muta o estado de um registro no banco de dados.

### WhatsApp Client
*   `GET /whatsapp/status` - Solicitação do payload Base64 para QR Code da sessão do Chromium subjacente.
*   `POST /whatsapp/requests/:id/accept` - Sinaliza a autorização a um evento interceptado via listener da automação.

---

## Execução Local (Para outros Desenvolvedores)

Se você clonou este repositório para contribuir ou testar, siga os passos abaixo para rodar o projeto na sua máquina:

### 1. Pré-requisitos
*   [Node.js](https://nodejs.org/) v18 ou superior.
*   Servidor em execução do banco PostgreSQL (pode ser local usando Docker/PgAdmin ou na nuvem como [Neon.tech](https://neon.tech/)).
*   Opcional (se for testar o WhatsApp): Chromium/Google Chrome instalado.

### 2. Instalação e Configuração

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd PraticaTCC

# 2. Instale todas as dependências
npm install

# 3. Crie o arquivo de variáveis de ambiente
cp .env.example -> .env
```

** Atenção:** Abra o arquivo `.env` e configure as seguintes variáveis:

#### 2.1 Configurar DATABASE_URL (Neon.tech)

Se você não tem uma conexão PostgreSQL:

1. Acesse [https://neon.tech/](https://neon.tech/) e crie uma conta gratuita
2. Crie um novo projeto (deixe as configurações padrão)
3. Na dashboard do projeto, copie a **Connection String** (estará no formato abaixo):

```
postgresql://neon_username:senha_gerada@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

4. Cole no arquivo `.env`:

```env
DATABASE_URL="postgresql://neon_username:senha_gerada@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Ou se preferir usar PostgreSQL local em Docker:

```bash
docker run --name postgres -e POSTGRES_PASSWORD=senha123 -p 5432:5432 -d postgres:15
```

Então configure:

```env
DATABASE_URL="postgresql://postgres:senha123@localhost:5432/sgo"
```

#### 2.2 Configurar JWT_SECRET

Generate uma chave segura com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado (64 caracteres) e adicione ao `.env`:

```env
JWT_SECRET="seu_hash_gerado_aqui"
```

#### 2.3 Configurar WhatsApp (Opcional)

```env
# Ativa ou desativa a integração com WhatsApp
WHATSAPP_ENABLED="true"

# Email do usuário que receberá as solicitações de orçamento via WhatsApp
# Este usuário DEVE ter acesso de Administrador
WHATSAPP_USER_EMAIL="admin@sgo.com"
```

Para testar com WhatsApp desabilitado (mais rápido no desenvolvimento):

```env
WHATSAPP_ENABLED="false"
```

### 3. Banco de Dados

Com o banco acessível via `DATABASE_URL`, execute os comandos de inicialização:

```bash
# Sincroniza o código Prisma com as tabelas do seu banco de dados vazio
npx prisma db push

# Gera os tipos do Prisma Client para o TypeScript
npx prisma generate

# (Obrigatório na 1ª vez) Cria o usuário Administrador padrão e dados de teste
npm run seed
```

**Nota:** Se ocorrer erro no seed dizendo que `JWT_SECRET` não foi encontrado, verifique se:
1. O arquivo `.env` existe na raiz do projeto
2. `JWT_SECRET` está definido no `.env`
3. Você salvou o arquivo `.env` antes de rodar o comando

### 4. Credenciais Padrão do Sistema

Após rodar o comando `npm run seed`, o sistema será alimentado com a seguinte conta de Administrador Padrão. Você deve usá-la para fazer o primeiro login:

*   **E-mail:** `admin@sgo.com`
*   **Senha:** `password123`

*(Recomenda-se alterar esta senha na aba "Configurações" após o primeiro acesso ao sistema num ambiente de Produção).*

### 5. Iniciando a Aplicação

```bash
# O comando inicializa o backend (porta 3001) e front-end (porta 5173) simultaneamente
npm run dev:all
```

Acesse no navegador:
*   **Aplicação Frontend:** `http://localhost:5173`
*   **Acesso API:** `http://localhost:3001/api`

---

## Variáveis de Ambiente Completos (.env)

Referência completa de todas as variáveis disponíveis:

```env
# ===== BANCO DE DADOS =====
# URL de conexão PostgreSQL (obrigatório)
# Exemplo com Neon.tech:
DATABASE_URL="postgresql://neon_username:password@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ===== AUTENTICAÇÃO =====
# Chave para assinar tokens JWT (obrigatório)
# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
/.env -> JWT_SECRET="seu_hash_de_64_caracteres_aqui"

# ===== WHATSAPP =====
# Ativa/desativa integração com WhatsApp
WHATSAPP_ENABLED="true"

# Email do usuário que receberá solicitações via WhatsApp
# O usuário DEVE ter permissão de administrador
WHATSAPP_USER_EMAIL="admin@sgo.com"

# ===== FRONTEND (Opcional) =====
# URL do frontend para CORS no backend (padrão: http://localhost:5173)
FRONTEND_URL="http://localhost:5173"

# ===== BACKEND (Opcional) =====
# Porta HTTP do backend (padrão: 3001)
PORT="3001"
```

---

## Erros comuns

### Erro: "JWT_SECRET não está definido"
**Solução:** Verifique se o arquivo `.env` existe e contém `JWT_SECRET="..."`, então salve e execute o comando novamente.

### Erro: "Environment variable not found: DATABASE_URL"
**Solução:** Certifique-se de que:
1. O arquivo `.env` existe na raiz do projeto
2. Contém uma URL PostgreSQL válida
3. O banco está acessível (teste a conexão manualmente se necessário)

### Backend não conecta na porta 3001
**Solução:**
1. Verifique se outra aplicação está usando a porta 3001: `netstat -ano | findstr :3001` (Windows)
2. Mate processos Node.js antigos: `taskkill /IM node.exe /F` (Windows)
3. Tente rodar: `npm run dev:server` para ver erros específicos

### WhatsApp mostra erro "Browser is already running"
**Solução:** Rode o cleanup manual:
```bash
node scripts/cleanup-chrome.js
```

### Prisma não consegue conectar ao banco
**Solução:** Teste a conexão diretamente:
```bash
npx prisma db execute --stdin < /dev/null
```