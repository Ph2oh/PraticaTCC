-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ultimoContato" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalOrcamentos" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteNome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "dataRecebido" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizado" DATETIME NOT NULL,
    "clienteId" TEXT,
    CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
