import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o preenchimento retroativo...');

  const orcamentosContratados = await prisma.orcamento.findMany({
    where: {
      status: 'contratado',
      dataFechamento: null
    }
  });

  console.log(`Encontrados ${orcamentosContratados.length} orçamentos contratados para atualizar.`);

  for (const orcamento of orcamentosContratados) {
    await prisma.orcamento.update({
      where: { id: orcamento.id },
      data: { dataFechamento: orcamento.dataAtualizado }
    });
  }

  const orcamentosRecusados = await prisma.orcamento.findMany({
    where: {
      status: {
        in: ['recusado', 'cancelado', 'perdido']
      },
      dataCancelamento: null
    }
  });

  console.log(`Encontrados ${orcamentosRecusados.length} orçamentos recusados/perdidos para atualizar.`);

  for (const orcamento of orcamentosRecusados) {
    await prisma.orcamento.update({
      where: { id: orcamento.id },
      data: { dataCancelamento: orcamento.dataAtualizado }
    });
  }

  console.log('Preenchimento retroativo concluído com sucesso!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
