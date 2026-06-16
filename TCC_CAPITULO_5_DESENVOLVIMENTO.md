# 5 DESENVOLVIMENTO DO SISTEMA

Este capítulo tem como objetivo detalhar as etapas práticas da construção do Sistema de Gerenciamento de Orçamentos (SGO). O processo de desenvolvimento foi orientado pelas melhores práticas da engenharia de software, abrangendo desde a fase de concepção e levantamento de requisitos até a implementação das lógicas de frontend e backend. A arquitetura proposta visa garantir um produto de software escalável, manutenível e que atenda às necessidades de profissionais que trabalham com propostas comerciais personalizadas.

## 5.1 Levantamento de requisitos

A fase de engenharia de requisitos é fundamental para delimitar o escopo do software e garantir o alinhamento com as necessidades dos usuários finais. Para o SGO, os requisitos foram elicitados a partir do estudo do fluxo de trabalho de fotógrafos e prestadores de serviços sob demanda. Os requisitos foram divididos em funcionais (RF), que descrevem o que o sistema deve fazer, e não funcionais (RNF), que especificam como o sistema deve se comportar.

**Requisitos Funcionais (RF):**
- **RF01:** O sistema deve permitir o cadastro e a autenticação de usuários (multi-tenant), isolando os dados de cada conta.
- **RF02:** O sistema deve possibilitar a criação, edição e exclusão de orçamentos, vinculando-os a clientes específicos.
- **RF03:** O sistema deve apresentar os orçamentos em um quadro Kanban, permitindo a transição visual entre os status: pendente, enviado, contratado e recusado.
- **RF04:** O sistema deve exigir e registrar o motivo da recusa sempre que um orçamento for movido para o status "recusado".
- **RF05:** O sistema deve manter um histórico de eventos (audit log) imutável para cada orçamento.
- **RF06:** O sistema deve integrar-se ao WhatsApp para captar solicitações de forma autônoma, analisando a mensagem e pré-preenchendo dados essenciais.
- **RF07:** O sistema deve calcular indicadores-chave de desempenho (KPIs), como receita fechada mensal, taxa de conversão e ticket médio.

**Requisitos Não Funcionais (RNF):**
- **RNF01 (Desempenho):** O sistema deve atualizar as interfaces de forma otimista, utilizando gerenciamento de estado assíncrono para evitar percepção de lentidão.
- **RNF02 (Segurança):** O sistema deve utilizar autenticação via *JSON Web Token* (JWT) e criptografar as senhas no banco de dados.
- **RNF03 (Confiabilidade):** O banco de dados deve manter a integridade referencial e o controle de exclusões em cascata.
- **RNF04 (Usabilidade):** A interface deve ser responsiva e suportar nativamente temas claro e escuro (Light/Dark mode).

## 5.2 Casos de uso

A modelagem dos casos de uso ilustra a interação entre os atores (usuários) e as funcionalidades providas pelo sistema, oferecendo uma visão comportamental do produto.

1. **UC01 - Gerenciar Funil de Orçamentos:** O usuário acessa a plataforma e visualiza o Kanban. Ele pode arrastar *cards* (orçamentos) entre as colunas. Ao aprovar, o sistema registra a data de fechamento; ao reprovar, o sistema abre uma janela solicitando o motivo da recusa.
2. **UC02 - Sincronizar via WhatsApp:** O usuário escaneia um *QR Code* na aba de configurações, vinculando sua sessão do WhatsApp. O sistema passa a atuar em segundo plano, identificando novas mensagens e criando solicitações pendentes para análise no painel.
3. **UC03 - Acompanhar Métricas (Dashboard):** O usuário consulta a página principal, onde o sistema cruza os dados temporais (datas de criação, fechamento e cancelamento) e os compara com as metas pré-definidas, exibindo gráficos analíticos de desempenho mensal.

## 5.3 Modelagem do banco de dados

A estrutura de persistência de dados foi projetada seguindo o modelo relacional e implementada através do Sistema de Gerenciamento de Banco de Dados (SGBD) PostgreSQL, operado de forma programática pelo ORM (*Object-Relational Mapping*) Prisma.

O modelo de Entidade-Relacionamento (MER) baseia-se nos seguintes pilares:
- **Usuario:** Entidade central para autenticação e isolamento multi-tenant.
- **Cliente:** Armazena os dados de contato e o histórico de LTV (*Lifetime Value*) dos consumidores. Relaciona-se em cardinalidade de um-para-muitos com a tabela de orçamentos.
- **Orcamento:** Tabela principal do fluxo de negócios. Armazena valores, status e, criticamente, as marcações temporais (`dataRecebido`, `dataFechamento`, `dataCancelamento`) que orientam a extração de KPIs, dissociando as métricas contábeis do simples status flutuante do funil.
- **OrcamentoEvento:** Uma tabela *append-only* que registra todo o histórico de transições de um orçamento, garantindo a rastreabilidade e a auditoria das ações (criado, status alterado, atualizado).
- **SolicitacaoWhatsApp:** Tabela temporária que atua como uma fila de *staging*. Armazena as mensagens brutas capturadas do aplicativo até que o usuário decida transformá-las em um orçamento real ou descartá-las, evitando perdas de dados em caso de instabilidade do servidor.
- **Configuracao:** Relacionamento de um-para-um com o usuário, contendo suas metas, preferências visuais (tema) e *templates* de mensagens.

## 5.4 Prototipação da interface

A concepção visual priorizou uma estética de alto padrão e uma arquitetura da informação voltada para a usabilidade. O uso de paletas de cores balanceadas, micro-interações de transição e espaçamentos definidos (design system) objetivou criar um *Software as a Service* (SaaS) profissional e intuitivo.

### 5.4.1 Wireframe da Dashboard
A Dashboard atua como o centro de inteligência comercial. O *wireframe* foi desenhado para alocar no topo os *cards* de KPIs essenciais (Receita, Taxa de Conversão, Novos Contatos), fornecendo leitura instantânea. Logo abaixo, gráficos renderizados de forma responsiva permitem o acompanhamento histórico do funil, balanceando a carga cognitiva do usuário ao focar primariamente nos dados da competência atual.

### 5.4.2 Wireframe do Funil de Orçamentos
O layout principal do sistema adota a metodologia ágil visual através de um Kanban interativo. O design prevê colunas de status rigidamente definidas. Os *cards* dos orçamentos foram projetados para serem compactos, porém ricos em informação (nome do cliente, valor, *badges* de status e indicativos de tempo na etapa). As interações preveem *drag-and-drop* (arrastar e soltar) para facilitar a mudança de fase de maneira orgânica.

### 5.4.3 Wireframe do Cadastro de Clientes
O módulo de clientes foi estruturado em um formato de lista tabular (Data Table), priorizando a rápida localização e filtragem. O protótipo considerou a exibição do último contato realizado e do volume de orçamentos vinculados a cada indivíduo, além de prever ações contextuais e modais laterais (*drawers*) para a visualização de detalhes sem a necessidade de mudar de página.

### 5.4.4 Wireframe das Solicitações WhatsApp
Para gerenciar a entrada de novos contatos, projetou-se uma interface paralela no topo da listagem de orçamentos. Quando uma mensagem chega via WhatsApp, uma notificação flutuante ou um painel de "Solicitações Pendentes" é exibido. O *wireframe* desse painel possui um fluxo de aceitação em duas etapas: visualização da mensagem original e, em seguida, uma tela de triagem, onde heurísticas do sistema pré-preenchem campos (como nome e data) para a aprovação final do usuário.

## 5.5 Implementação do Frontend

O desenvolvimento da interface de usuário (UI) foi pautado pela construção de uma SPA (*Single Page Application*). Utilizou-se a biblioteca React (versão 18) integrada com TypeScript, visando garantir segurança estática de tipagem e a consequente redução de falhas em tempo de execução. O ambiente de *build* foi suportado pela ferramenta Vite, escolhida pelo seu excepcional desempenho de *Hot Module Replacement* (HMR).

No que tange à estilização, adotou-se o *framework* de utilitários CSS Tailwind em conjunto com a biblioteca de componentes *shadcn/ui*. Essa abordagem possibilitou a criação de um sistema de design (`index.css`) baseado em variáveis HSL (matiz, saturação e luminosidade), facilitando a transição automática entre modos claro e escuro.

O estado remoto, aspecto sensível de aplicações *web*, foi gerenciado pelo *TanStack React Query*. Essa tecnologia otimizou as chamadas à API, abstraindo o armazenamento em *cache*, a sincronização em segundo plano e, fundamentalmente, permitindo *optimistic updates*. Assim, ações visuais como a movimentação de um orçamento no Kanban ocorrem de maneira instantânea na tela, enquanto a persistência no banco de dados ocorre de forma paralela no servidor, assegurando fluidez à experiência do usuário.

## 5.6 Implementação do Backend

O servidor do sistema foi implementado utilizando a plataforma Node.js em conjunto com o *framework* Express.js, seguindo os princípios de uma API RESTful. O backend assume o papel de processamento da regra de negócio, isolamento *multi-tenant* e segurança, validando cada requisição através de *middlewares* de autenticação que extraem a identidade do usuário a partir do *token* JWT fornecido.

A interação com o banco de dados PostgreSQL foi orquestrada de forma segura através do ORM Prisma. A lógica construída no servidor previne "vazamentos" estatísticos ao realizar controles rigorosos em cima dos eventos de *timestamp* (como a atribuição de *null* a uma data de fechamento caso o orçamento sofra uma regressão de status).

Por fim, o subsistema de captura e mensageria representou um desafio arquitetural resolvido com o emprego da biblioteca `whatsapp-web.js`. Para evitar a complexidade burocrática e os altos custos da *Cloud API* oficial da Meta, optou-se pela emulação *headless* de uma sessão do WhatsApp Web utilizando *Puppeteer* (baseado em Chromium). O fluxo no servidor recebe os eventos *WebSocket* das conversas via celular espelhado, extrai heurísticas do texto (usando expressões regulares avançadas para identificar intenções de orçamento, datas e locais) e alimenta a fila do banco de dados para posterior aprovação no painel frontend, viabilizando uma automação essencial e de custo zero para operações iniciais.
