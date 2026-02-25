-- CreateTable
CREATE TABLE "OrcamentoEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orcamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "statusAntigo" TEXT,
    "statusNovo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrcamentoEvento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrcamentoEvento_orcamentoId_idx" ON "OrcamentoEvento"("orcamentoId");
