-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ultimoContato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalOrcamentos" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "motivoRecusa" TEXT,
    "dataRecebido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizado" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoEvento" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "statusAntigo" TEXT,
    "statusNovo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrcamentoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "corPrimaria" TEXT NOT NULL DEFAULT '224.3 76.3% 48%',
    "tema" TEXT NOT NULL DEFAULT 'system',
    "templateProposta" TEXT NOT NULL DEFAULT 'Olá {{cliente}}, tudo bem? 

Conforme conversamos, o valor estimado para o serviço fica em *{{valor}}*.

O escopo inclui:
{{descricao}}

Podemos dar andamento? Qualquer dúvida estou à disposição!',
    "templateLembrete" TEXT NOT NULL DEFAULT 'Oi {{cliente}}, passando para saber se você conseguiu dar uma olhadinha na nossa proposta ou se ficou com alguma dúvida! 😊',
    "templateAgradecimento" TEXT NOT NULL DEFAULT 'Muito obrigado por fechar conosco, {{cliente}}! Vamos fazer um trabalho incrível. Em breve envio os próximos passos.',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "empresa" TEXT,
    "telefone" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrcamentoEvento_orcamentoId_idx" ON "OrcamentoEvento"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_usuarioId_key" ON "Configuracao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoEvento" ADD CONSTRAINT "OrcamentoEvento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
