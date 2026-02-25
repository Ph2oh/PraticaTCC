import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes
  await prisma.orcamento.deleteMany();
  await prisma.cliente.deleteMany();

  const clientesSeed = [
    { nome: "Maria Silva", telefone: "(11) 99999-1234", email: "maria@email.com", ultimoContato: new Date("2026-02-22") },
    { nome: "João Santos", telefone: "(11) 98888-5678", email: "joao@email.com", ultimoContato: new Date("2026-02-21") },
    { nome: "Ana Oliveira", telefone: "(11) 97777-9012", email: "ana@email.com", ultimoContato: new Date("2026-02-22") },
    { nome: "Carlos Pereira", telefone: "(11) 96666-3456", email: "carlos@email.com", ultimoContato: new Date("2026-02-20") },
    { nome: "Fernanda Lima", telefone: "(11) 95555-7890", email: "fernanda@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Roberto Costa", telefone: "(11) 94444-2345", email: "roberto@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Lucia Martins", telefone: "(11) 93333-6789", email: "lucia@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Pedro Almeida", telefone: "(11) 92222-0123", email: "pedro@email.com", ultimoContato: new Date("2026-02-21") },
  ];

  const clientes = await Promise.all(
    clientesSeed.map((data) =>
      prisma.cliente.create({
        data: {
          ...data,
          totalOrcamentos: 0,
        },
      })
    )
  );

  const clientePorNome = clientes.reduce<Record<string, string>>((acc, cliente) => {
    acc[cliente.nome] = cliente.id;
    return acc;
  }, {});

  const orcamentosSeed = [
    { cliente: "Maria Silva", descricao: "Pintura residencial - 3 quartos", valor: 4500, status: "contratado", dataRecebido: "2026-02-20", dataAtualizado: "2026-02-22" },
    { cliente: "João Santos", descricao: "Reforma de banheiro completa", valor: 12000, status: "enviado", dataRecebido: "2026-02-21", dataAtualizado: "2026-02-21" },
    { cliente: "Ana Oliveira", descricao: "Instalação de piso laminado", valor: 3200, status: "pendente", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-22" },
    { cliente: "Carlos Pereira", descricao: "Troca de telhado", valor: 8500, status: "recusado", dataRecebido: "2026-02-18", dataAtualizado: "2026-02-20" },
    { cliente: "Fernanda Lima", descricao: "Projeto paisagismo", valor: 6000, status: "contratado", dataRecebido: "2026-02-19", dataAtualizado: "2026-02-23" },
    { cliente: "Roberto Costa", descricao: "Elétrica predial", valor: 15000, status: "enviado", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-23" },
    { cliente: "Lucia Martins", descricao: "Impermeabilização laje", valor: 7200, status: "pendente", dataRecebido: "2026-02-23", dataAtualizado: "2026-02-23" },
    { cliente: "Pedro Almeida", descricao: "Marcenaria sob medida", valor: 9800, status: "contratado", dataRecebido: "2026-02-17", dataAtualizado: "2026-02-22" },
  ];

  const orcamentos = await Promise.all(
    orcamentosSeed.map((orc) =>
      prisma.orcamento.create({
        data: {
          descricao: orc.descricao,
          valor: orc.valor,
          status: orc.status,
          dataRecebido: new Date(orc.dataRecebido),
          dataAtualizado: new Date(orc.dataAtualizado),
          cliente: {
            connect: { id: clientePorNome[orc.cliente] },
          },
        },
      })
    )
  );

  // Criar eventos de histórico para cada orçamento
  await Promise.all(
    orcamentos.map((orc, idx) => {
      const seed = orcamentosSeed[idx];
      return prisma.orcamentoEvento.create({
        data: {
          orcamentoId: orc.id,
          tipo: "criado",
          descricao: "Orçamento criado",
          criadoEm: new Date(seed.dataRecebido),
        },
      }).then(() => {
        // Se o status não é pendente, criar um evento de mudança de status
        if (seed.status !== "pendente") {
          return prisma.orcamentoEvento.create({
            data: {
              orcamentoId: orc.id,
              tipo: "status_alterado",
              descricao: `Status alterado para ${seed.status}`,
              statusAntigo: "pendente",
              statusNovo: seed.status,
              criadoEm: new Date(seed.dataAtualizado),
            },
          });
        }
      });
    })
  );

  await Promise.all(
    clientes.map(async (cliente) => {
      const count = await prisma.orcamento.count({ where: { clienteId: cliente.id } });
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { totalOrcamentos: count },
      });
    })
  );

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
