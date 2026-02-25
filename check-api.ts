import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const orcamentos = await p.orcamento.findMany({
    include: { 
      cliente: true,
      eventos: {
        orderBy: { criadoEm: 'asc' }
      }
    }
  });
  
  console.log(`Total orçamentos: ${orcamentos.length}`);
  console.log(`Primeiro orçamento:\n${JSON.stringify(orcamentos[0], null, 2)}`);
}

main().finally(() => p.$disconnect());
