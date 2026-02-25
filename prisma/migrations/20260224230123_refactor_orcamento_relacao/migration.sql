/*
  Warnings:

  - You are about to drop the column `clienteNome` on the `Orcamento` table. All the data in the column will be lost.
  - You are about to drop the column `telefone` on the `Orcamento` table. All the data in the column will be lost.
  - Made the column `clienteId` on table `Orcamento` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Orcamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "dataRecebido" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizado" DATETIME NOT NULL,
    "clienteId" TEXT NOT NULL,
    CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Orcamento" ("clienteId", "dataAtualizado", "dataRecebido", "descricao", "id", "status", "valor") SELECT "clienteId", "dataAtualizado", "dataRecebido", "descricao", "id", "status", "valor" FROM "Orcamento";
DROP TABLE "Orcamento";
ALTER TABLE "new_Orcamento" RENAME TO "Orcamento";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
