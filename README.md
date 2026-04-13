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
| Cliente desqualificado | Orçamento fora do escopo ou serviço incompatível |
| Data indisponível | A data solicitada não está disponível na agenda |
| Sem retorno do cliente | Proposta enviada, sem resposta após follow-up |

**Regra:** Novos motivos só devem ser adicionados na constante `MOTIVOS_RECUSA` em `src/components/MotivoRecusaDialog.tsx`. O restante do sistema se adapta automaticamente.

---

### Regras de Negócio (Lógica e Funcionamento)

O sistema rastreia os valores financeiros e previne "vazamentos" de métricas ou ambiguidades durante as trocas de colunas do Kanban. A lógica se baseia em separar rigidamente as etapas de conquista (contratos), captação (clientes) e perda (rejeições), delegando cada uma a uma coluna temporal fixa no banco de dados, parando de depender unicamente do nome do seu status flutuante.

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

### SolicitacaoWhatsApp (Fila Temporária)

```sql
id               (UUID, PK)
usuarioId        (UUID, FK → Usuario)
clienteId        (UUID, FK → Cliente)
whatsappFrom     (String — número do remetente)
mensagemOriginal (String — mensagem enviada pelo cliente)
clienteNome      (String)
criadoEm         (DateTime)
```

**Regra:** Registros nesta tabela funcionam apenas como uma *fila de staging* (temporária). Uma vez que o usuário decide "Criar Orçamento" ou "Ignorar" o pedido gerado via WhatsApp no painel, a linha correspondente é **deletada** instantaneamente. Esta tabela atua como blindagem passiva: garante que os orçamentos não lidos (ex. enviados de madrugada ou no fim de semana) não sejam permanentemente perdidos da memória caso a aplicação inteira seja reiniciada (`pm2 restart` / deploy automáticos / crashes).



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

## Decisão de Arquitetura: Uso do whatsapp-web.js vs Cloud API Oficial

Apesar deste sistema possuir fortes aspirações para escalabilidade multi-tenant, o núcleo de mensageria foi deliberadamente construído operando a emulação extra-oficial de navegadores (`whatsapp-web.js` instanciando containers Linux/Chromium na raiz da VPS) em detrimento à **API Cloud Oficial da Meta / Graph API**.

### Parecer Técnico:
1. **Complexidade operacional:** A Cloud API exige que todo sistema integrador (modelo SaaS) que conecte "APIs para outras contas de negócios" passe pela criação de um aplicativo comercial verificado. A Meta cobra contratos societários, CNPJ autêntico para emissão do status Oauth e infindáveis aprovações em código vivo (*App Reviews*) onde dezenas de engenheiros deles bloqueiam qualquer projeto iniciante.
2. **Simplicidade Absoluta da Experiência do Usuário Central (UX):** Se plugado em Webhooks Cloud, todo novo ideal criativo que pagasse a mensalidade do SGO precisaria dominar autenticações de painéis WABA complexos no menu "*Facebook Login for Business*". Mas, com nossa arquitetura robusta no Web.js, instalamos o majestoso *Wizard* visual que solicita aos clientes a tarefa mais comum que a raça humana já executa há uma década: **Mire o celular e leia o QR Code.**
3. **Escudo de Faturamentos de Tráfego:** Integradores atrelados à documentação original sofrem tarifários variando da janela das 24h transcorridas além das rígidas aprovações de envios de _Templates Oficiais_. Nossa ponte, sendo um canal invisível "Consumer" baseado nos pacotes de WebSockets via Puppeteer, assegura Custo Operacional ZERO irrestrito.

### Consequências Acordadas ( Trade-off):
- **O Fator do Algoritmo Banidor:** A arquitetura rasga claramente as diretrizes restritivas (*ToS / Terms of Service*) impostas unilateralmente pela META para uso empresarial. Para garantir longa vida útil aos chips de celulares plugados ao emulador do servidor, é intrinsecamente dependente contar que a base de clientes do SaaS nunca utilizará o sistema pra panfletagem de *SPAM frio* capaz de acumular denúncias pesadas da bolha.
- **Impacto do uso da biblioteca `whatsapp-web.js` na Memória RAM:** Se operássemos no modelo de Webhooks permitidos da Meta (Rest API), a nossa instãncia consumiria somente Megabytes de I/O em eventos POST limpos. Usar Chromium virtual aumenta consideravelmente o uso de recursos na máquina onde a instancia do navegador irá rodar. Uma estimativa dura de até ~`200MB de RAM real` por cada fotógrafo logado obriga gastos elevados previstos na escalada do *Virtual Private Server* contratado para manter todo mundo simultaneamente com "navegadores zumbis" armados 24hrs no Linux.

---

## Requisitos Operacionais: WhatsApp Web (Sincronização)

A integração com WhatsApp utiliza a tecnologia de **espelhamento do WhatsApp Web** (whatsapp-web.js). Isso significa que o navegador web (rodando em sua VPS) espelha a sessão do seu aplicativo móvel.

### Comportamento Esperado

Quando você conecta seu WhatsApp ao SGO via QR Code:

1. **App móvel é a "fonte de verdade"** — O telefone conectado é sempre o dispositivo principal. A VPS apenas espelha essa sessão.
2. **Sincronização pausada em outros dispositivos** — Ao detectar uma nova simulação (seu servidor), o WhatsApp pausa a sincronização com tablets, computadores de mesa e outras conexões Web para proteger dados.
3. **Notificação no mobile** — Você verá a mensagem "Mantenha o app aberto nos 2 dispositivos" com um ícone de atualização.

### O que isso Significa na Prática

| Cenário | Comportamento |
|:---|:---|
| App WhatsApp aberto no celular | Sincronização ativa, novas mensagens chegam em tempo real no SGO |
| App WhatsApp fechado no celular | Sincronização **pausada**, novas mensagens só sincronizam quando reabre o app |
| Outro dispositivo (tablet) conectado | Ver apenas a última sincronização quando estiver offline |
| Mudar de WiFi / Dados Móveis | Reconexão automática, sem perda de sessão |

### Requisitos para Funcionamento Óptimo

Mantenha o app WhatsApp aberto no seu celular
- Se fechar o app, o SGO perderá sincronização em tempo real
- Mensagens recebidas enquanto offline serão sincronizadas ao reabrir

Use a mesma conta WhatsApp que deseja integrar
- Não é possível compartilhar uma sessão entre múltiplos usuários
- Cada usuário do SGO deve conectar sua própria conta WhatsApp

Evite desconectar a sessão no seu telefone
- A opção "Desconectar todos os dispositivos" na tela de linked devices pode encerrar a integração
- Se isso ocorrer, faça login novamente escaneando o QR Code

### Monitoramento de Status

O SGO monitora automaticamente a integridade da sessão WhatsApp:

- Se o app móvel ficar offline por mais de 5 minutos, o sistema registra um aviso no log
- Quando a sincronização é retomada, o status volta ao normal automaticamente
- Você pode visualizar o status em tempo real na tela de configuração do WhatsApp

### Plano de Melhoria Futuro

No roadmap, está prevista uma migração para a **API Cloud Oficial da Meta** (Graph API), que eliminaria completamente a dependência do app móvel ficar aberto. Isso removeria a limitação de sincronização pausada e ofereceria maior escalabilidade. Porém, essa implementação será considerada apenas quando a base de clientes crescer significativamente.

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
4. **`useWhatsApp.ts`**: Mantém os gatilhos dedicados às interações REST específicas exigidas ao aprovar orçamentos escaneados no WhatsApp e lidar com os status remotos em conjunto do Bot rodado via Node.

---

## Integração WhatsApp: Fluxo de Aceitação de orçamentos

Quando uma mensagem chega no número do WhatsApp conectado, o sistema executa o seguinte pipeline:

### 1. Detecção e Notificação em Tempo Real

O endpoint `GET /api/whatsapp/status` é consultado pelo frontend a cada 5 segundos (1.5s durante pareamento). Para garantir que intermediários de rede (Nginx, Cloudflare) não atrasem a entrega da notificação, o servidor injeta headers anti-cache:

```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### 2. Parsing Inteligente da Mensagem

Ao exibir o modal de aceitação, o componente `WhatsAppRequestsProvider.tsx` analisa automaticamente o texto da mensagem usando heurísticas baseadas em Regex para extrair:

| Campo | Exemplo de Detecção | Fallback |
|:---|:---|:---|
| Tipo de Evento | "casamento", "pré wedding", "civil", "formatura" | "Outro" |
| Nomes do Casal | "Maria e João", "sou Maria" | Campo vazio (preenchimento manual) |
| Data do Evento | "12/10/2026", "dia 15/03" | Campo vazio |
| Local | "em São Paulo", "no Espaço X" | Campo vazio |

Os valores pré-preenchidos podem ser corrigidos manualmente antes da confirmação.

### 3. Formatação da Descrição

Ao confirmar, a descrição do orçamento é gerada no formato:

```
Criado via WhatsApp (Aprovado).

Casal: Maria e João
Data: 12/10/2026
Evento: Casamento
Local: Espaço Villa Real

Mensagem original:
"Olá, gostaria de um orçamento para fotos do meu casamento dia 12/10 no Espaço Villa Real"
```

### 4. Persistência

Os dados do modal são enviados via `POST /api/whatsapp/requests/:id/accept` com o corpo JSON `{ detalhes: { casal, dataEvento, tipoEvento, local } }`. O backend monta a string formatada e persiste no campo `descricao` do orçamento criado.

---

## No GitHub tem duas branchs configuradas, Main e Develop.

Main é a branch que está em produção, que irá rodar localmente.
Develop é a branch que está em desenvolvimento, que irá rodar em uma VPS linux Ubuntu.

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
# ---> CONFIGURAÇÕES LOCAIS (Sua Máquina) <---

# Banco de dados (obrigatório: pode ser localhost ou o Neon Tech)
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"

# JWT (obrigatório — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="sua_chave_de_64_caracteres"

# Motor do WhatsApp (opcional, desative para desenvolvimento genérico rápido sem Puppeteer)
WHATSAPP_ENABLED="false"

# Autenticação e E-mail (Mude o FRONTEND_URL para a porta Vite para simulação)
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER="ethereal_user"
SMTP_PASS="ethereal_pass"
SMTP_SECURE="false"
SMTP_FROM="teste@local.dev"
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

Para atualizar a estrutura do banco em produção de forma segura:

```bash
npx prisma generate
npx prisma migrate deploy
```

---

## Histórico de Atualizações (Changelog)

- **Estabilidade do WhatsApp Engine:** Unificação da instância do PrismaClient para otimização do banco de dados (prevenção de "Too many connections"); mitigação de concorrência (*Race Condition*) na criação simultânea de clientes; correção no descarte contínuo e recriação de sessões na leitura de QR-Code, e alinhamento rígido na comunicação do fluxo RAM/DB para que nenhuma solicitação cancelada no Frontend fique pendente fantasmalmente.
- **Formatação de Extração de Orçamentos:** Ajuste na Expressão Regular (Regex) no Provider que interage com as propostas vindas do WhatsApp, assegurando que o case original fornecido pelo cliente prospect (letras Maiúsculas/Minúsculas) seja preservado integralmente, enquanto a captação heurística foca em ser Case-Insensitive aos gatilhos.
- **Correção nos cálculos de variação (Deltas):** Ajuste matemático nos *cards* de "Dashboard" e "Deep Analytics" (Relatórios). Os números não ficam mais travados em "+100%" ou em inconsistências nos casos onde o período base de comparação (mês anterior ou janela antiga) possui 0 orçamentos, o que gerava infinitos matemáticos falsos. Agora a interface esconde o indicativo de porcentagem dinamicamente e mostra a sinalização "S/ Dados" adequadamente, mantendo a consistência visual.
- **Deep Analytics:** Agora totalmente integrado no sistema como a página inteligente `/relatorios`, isolando as métricas de ltv, ciclo de vida e projeções ativas da meta de captação atual.

---

## Deploy em VPS (Produção)

### 1. Dependências da VPS (Servidor Linux)
- **Node.js**: Instalado (versão 18+).
- **Gerenciador de Processos**: PM2 instalado globalmente (`npm install -g pm2`) para manter o backend vivo em segundo plano.
- **Servidor Web / Proxy Reverso**: NGINX configurado para servir as portas HTTP/HTTPS e expor o frontend.
- **Banco de Dados**: PostgreSQL rodando na própria máquina ou via provedor como RDS/Neon.
- **Dependências Chromium (IMPORTANTE)**: Para o bot do WhatsApp rodar corretamente em VPS (Ubuntu/Debian sem interface gráfica), instale as bibliotecas base:
  ```bash
  sudo apt install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
  ```

### 2. Processo de Build e Configuração
1. Faça o clone do repositório na sua instância Linux.
2. Crie e configure o arquivo `.env` para apontar ao seu banco de dados de produção EXCLUSIVO. **Este arquivo possui diferenças drásticas do seu ambiente local!**

    ```env
    # ---> CONFIGURAÇÕES ONLINE (VPS Produção) <---
    DATABASE_URL="postgresql://usuario_PRODUCAO:senha@host/banco?sslmode=require"
    JWT_SECRET="chave_super_segura"
    WHATSAPP_ENABLED="true"

    # URL oficial pública com o HTTPS gerado e porta web liberada
    FRONTEND_URL="https://seusistema.com.br"

    # Chaves absolutas corporativas (Exemplo: Resend.com)
    SMTP_HOST="smtp.resend.com"
    SMTP_PORT="465"
    SMTP_USER="resend"
    SMTP_PASS="re_SuaChaveOficial"
    SMTP_SECURE="true"
    SMTP_FROM="contato@seusistema.com.br"
    ```

3. Instale recursos do projeto: `npm install`
4. Propague o modelo de dados e migrações **de forma segura**: `npx prisma generate` && `npx prisma migrate deploy`
   *(Importante: Nunca use `prisma db push` em produção, sob risco de perda de colunas e dados)*
5. Compile o projeto executando: `npm run build`.

### 3. Rodando os Serviços
- **Frontend**: A resposta ao rodar o comando *build* é uma compilação do Vite enviada para a pasta `/dist`. As regras do **NGINX** local devem expor e servir esta pasta `/dist` na porta web principal. Todo o controle de rotas será do React (configuração `try_files $uri /index.html` no Nginx). **Nota**: A API Express agora implementa compressão Gzip automaticamente, acelerando entregas.
- **Backend (API)**: A API baseada em Express fará as regras de negócio em segundo plano. Para não expor seu terminal, você pode rodá-la usando o PM2: 
  ```bash
  pm2 start ecosystem.config.cjs
  ```
  Isso garantirá que o Express e o Bot do WhatsApp subam e monitorem os orçamentos.
- **Monitoramento / Graceful Shutdown**: O servidor Node detém tratamento automático de `SIGINT`/`SIGTERM` para fechamento sem vazamento de memória (DB connections desconectados com segurança) e uma rota simples de pings `/api/health` para verificações de uptime.

### 4. Automações de Background (Node.js)
Para garantir a integridade absoluta da memória RAM da sua VPS (limitada e valiosa) o Backend opera através das seguintes mecânicas invisíveis:
- **Destruidor de Zumbis (Graceful Chromium Shutdown):** Quando o PM2 ou o servidor Node cai, o sistema engata um *blocker* que submete comandos automáticos de encerramento (`destroy()`) em todas as sessões abertas do Chromium na memória ANTES de matar o ciclo de eventos. Previne bloqueios (lockfiles) impenetráveis e processos fantasmas nas reconexões futuras.
- **Race Condition Limiter:** Proteção contra disparos duplicados (`clientCreationLocks`). Entradas idênticas do Webhook em milissegundos não vão duplicar o mesmo orçamento visualmente no Kanban devido a esse filtro temporal em RAM.
- **Auto-Destruição de Leitura Ociosa (Timeout QR):** Se um usuário solicitar um QR Code do sistema no navegador e abandonar o computador fechando a aba, ao passar de certa quantia de recargas ociosas sem pareamento (~3 minutos), o sistema destruirá aquele *Container Chrome* ativo e deletará o rastro na base, derrubando o QR Code para conter estagnação de 150MB~200MB de RAM na máquina para cada cliente distraído.

### 5. Integração Contínua Automatizada
Para facilitar envios de alterações em código local para sua máquina em produção sem derrubar a aplicação, um script automatizado (`update.sh`) está embutido no projeto.
Sempre que desejar espelhar as alterações do GitHub para Nuvem, entre no terminal do seu Servidor VPS e chame o script:
```bash
cd PraticaTCC
git pull origin develop
bash update.sh
```
O script cuidará automaticamente da instalação de pacotes recém inseridos, compilação do Vite e restart invisível via PM2!
---

## Fluxo de Trabalho e Contribuição (Git Flow)

Por segurança e para evitar subida de código instável, o projeto adota regras focadas em **Git Flow**, dividindo ambientes de trabalho:

- **Branch `main` (Produção)**: Representa o ambiente oficial sem erros. Sob nenhuma hipótese desenvolva diretamente nela. Ela recebe os *merges* das funcionalidades completas consolidadas.
- **Branch `develop` (Homologação)**: Espelha o andamento integrado dos desenvolvedores. Branch de encontro para integrar módulos de código.
- **Branches de Funcionalidades (`feature/nome-da-feature`)**: São ramificadas de `develop` sempre que for necessário criar novidades. Exemplo: `git checkout -b feature/novo-painel`. Somente após teste local e commit fechado, se direciona um Pull Request para `develop`.
- **Branches de Correção (`bugfix/nome-do-bug` e `hotfix`)**: Criadas para reparos rápidos, sendo as `hotfixes` originadas diretamentes em emergências de `main`.

**Ciclo correto para iniciar um de trabalho:**
1. Verifique sempre seu repositório local e baixe as atualizações dos servidores antes: `git checkout develop` e `git pull`.
2. Isole seu trajeto em uma vertente específica, nomeada descritivamente: `git checkout -b feature/dashboard-vps`.
3. Desenvolva, confira logs e faça as transações do banco. Após certo do resultado, suba a sua *branch*: `git commit -m "feat: configuração de deploy pronta"` seguido de `git push origin feature/dashboard-vps`.
4. Vá ao GitHub e solicite o Merge (Pull Request).