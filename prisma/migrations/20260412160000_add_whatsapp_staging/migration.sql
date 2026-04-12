-- CreateTable
CREATE TABLE "SolicitacaoWhatsApp" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "whatsappFrom" TEXT NOT NULL,
    "mensagemOriginal" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoWhatsApp_usuarioId_idx" ON "SolicitacaoWhatsApp"("usuarioId");

-- AddForeignKey
ALTER TABLE "SolicitacaoWhatsApp" ADD CONSTRAINT "SolicitacaoWhatsApp_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoWhatsApp" ADD CONSTRAINT "SolicitacaoWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
