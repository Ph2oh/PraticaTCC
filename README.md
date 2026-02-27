# SGO - Sistema de Gerenciamento de Orçamentos

Sistema cliente-servidor para gerenciamento de clientes, orçamentos, registro de histórico de eventos e integração com o WhatsApp via emulação do cliente web. Desenvolvido em TypeScript.

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

## Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Função Principal |
| :--- | :--- | :--- | :--- |
| **Frontend** | `React` | 18.x | Biblioteca para construção da interface de usuário. |
| **Linguagem** | `TypeScript` | 5.x | Tipagem estática para frontend e backend. |
| **Build** | `Vite` | 5.x | Ferramenta de build e servidor local. |
| **Styling** | `Tailwind CSS` | 3.x | Framework CSS utilitário para estilização da interface. |
| **Componentes** | `shadcn/ui` | Latest | Coleção de componentes injetados diretamente no código-fonte do projeto. |
| **Estado Remoto** | `React Query` | 5.x | Gerenciamento de estado de dados assíncronos e controle de cache de rede. |
| **Backend** | `Express.js` | 4.x | Framework para a estruturação da API REST. |
| **Autenticação** | `JWT + Bcrypt` | Latest | Emissão de tokens de acesso para requisições e armazenamento de senhas com hash. |
| **Integração** | `whatsapp-web.js`| Latest | Biblioteca baseada em Puppeteer para interagir com a interface web do WhatsApp. |
| **Database** | `PostgreSQL` | 15.x | Sistema gerenciador de banco de dados relacional. |
| **ORM** | `Prisma ORM` | 5.x | Ferramenta de mapeamento objeto-relacional para consultas e gerenciamento do schema. |

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

---

## Segurança e Isolamento Lógico

A aplicação adota o modelo Multi-Tenant na arquitetura e na persistência de dados:

*   **Configuração de Ambiente:** Chaves criptográficas (como `JWT_SECRET`) são providas estritamente através de variáveis de ambiente (`.env`).
*   **Isolamento de Dados (Tenant-level):** Os registros contêm um atributo relacionando ao proprietário do dado (`usuarioId`). As consultas executadas via Prisma implementam um filtro obrigatório nesse atributo para prevenir acesso não autorizado entre contas distintas.
*   **Validação de Sessão:** A camada de middleware na API (`/api`) intercepta requisições baseando a validação em tokens JWT com tempo configurado de expiração.
*   **Controle de Integração:** Interações automatizadas com conexões WhatsApp são designadas exclusivamente a instâncias de usuário nível Administrador na base de dados.

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

### OrcamentoEvento (Trilha de Histórico)
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

## Execução Local (Desenvolvimento)

### Pré-requisitos
*   Node.js v18 ou superior.
*   Servidor em execução do banco PostgreSQL local ou provisionado remotamente.

### Build e Inicialização
```bash
# Clone o diretório e mapeie as dependências pelo NPM
git clone <REPOSITORIO>
cd PraticaTCC
npm install

# Gere as configurações de ambiente necessárias
cp .env.example .env
# Defina strings válidas para DATABASE_URL e JWT_SECRET no arquivo .env gerado.

# Migração de banco: reflete a definição do esquema no banco relacional e compila o Prisma Client
npx prisma db push
```

```bash
# O comando inicializa o servidor de backend (:3001) e front-end (:5173) assíncronamente através dos pacotes nativos
npm run dev:all
```
*   **Aplicação Frontend:** Acessível em `http://localhost:5173`
*   **API Gateway:** Acessível em `http://localhost:3001`

