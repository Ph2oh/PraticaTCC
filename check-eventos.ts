import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const eventos = await p.orcamentoEvento.findMany();
  console.log("Total eventos:", eventos.length);
  eventos.slice(0, 5).forEach(e => {
    console.log(`\nEvento: ${e.descricao}`);
    console.log(`  Tipo: ${e.tipo}`);
    console.log(`  Criado em: ${e.criadoEm}`);
    console.log(`  Status: ${e.statusAntigo} → ${e.statusNovo}`);
  });
}

main().finally(() => p.$disconnect());
