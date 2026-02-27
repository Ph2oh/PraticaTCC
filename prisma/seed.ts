import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@sgo.com";
  const adminPassword = "password123";
  let admin = await prisma.usuario.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const hashedSenha = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.usuario.create({
      data: {
        nome: "Administrador SGO",
        email: adminEmail,
        senha: hashedSenha,
        empresa: "Agência Padrão",
        telefone: "(11) 90000-0000",
        configuracao: {
          create: {
            corPrimaria: "224.3 76.3% 48%",
            tema: "light"
          }
        }
      }
    });
    console.log(`Admin user created: ${adminEmail} / ${adminPassword}`);
  }

  // Limpar dados APENAS do usuário Administrador para não afetar outros tenants (Inquilinos)
  await prisma.orcamento.deleteMany({
    where: {
      usuarioId: admin.id,
    },
  });

  await prisma.cliente.deleteMany({
    where: {
      usuarioId: admin.id,
    },
  });

  const clientesSeed = [
    { nome: "Julia & Ricardo", telefone: "(11) 99999-1234", email: "julia_ricardo_casamento@email.com", ultimoContato: new Date("2026-02-22") },
    { nome: "Amanda & Felipe", telefone: "(11) 98888-5678", email: "amanda.felipe.wedding@email.com", ultimoContato: new Date("2026-02-21") },
    { nome: "Carolina & Thiago", telefone: "(11) 97777-9012", email: "carol_thiago_2026@email.com", ultimoContato: new Date("2026-02-22") },
    { nome: "Beatriz & Lucas", telefone: "(11) 96666-3456", email: "bea_lucas_noivos@email.com", ultimoContato: new Date("2026-02-20") },
    { nome: "Mariana & Gabriel", telefone: "(11) 95555-7890", email: "mari_gabriel_foto@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Camila & Pedro", telefone: "(11) 94444-2345", email: "camila.pedro.matrimonio@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Letícia & Rafael", telefone: "(11) 93333-6789", email: "leticia_rafael_wedding@email.com", ultimoContato: new Date("2026-02-23") },
    { nome: "Isabela & Mateus", telefone: "(11) 92222-0123", email: "isabela_mateus_casamento@email.com", ultimoContato: new Date("2026-02-21") },
  ];

  const clientes = await Promise.all(
    clientesSeed.map((data) =>
      prisma.cliente.create({
        data: {
          ...data,
          totalOrcamentos: 0,
          usuarioId: admin.id,
        },
      })
    )
  );

  const clientePorNome = clientes.reduce<Record<string, string>>((acc, cliente) => {
    acc[cliente.nome] = cliente.id;
    return acc;
  }, {});

  const orcamentosSeed = [
    { cliente: "Julia & Ricardo", descricao: "Cobertura Completa + Ensaio Pré-Wedding", valor: 6500, status: "contratado", dataRecebido: "2026-02-20", dataAtualizado: "2026-02-22" },
    { cliente: "Amanda & Felipe", descricao: "Fotografia Casamento Duração 8h", valor: 4200, status: "enviado", dataRecebido: "2026-02-21", dataAtualizado: "2026-02-21" },
    { cliente: "Carolina & Thiago", descricao: "Pacote Premium (Pré + Casamento + Pós-Wedding)", valor: 8500, status: "pendente", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-22" },
    { cliente: "Beatriz & Lucas", descricao: "Making of + Cerimônia + Festa + Álbum", valor: 7800, status: "recusado", dataRecebido: "2026-02-18", dataAtualizado: "2026-02-20" },
    { cliente: "Mariana & Gabriel", descricao: "Ensaio Pré-Wedding Externo (Praia)", valor: 1500, status: "contratado", dataRecebido: "2026-02-19", dataAtualizado: "2026-02-23" },
    { cliente: "Camila & Pedro", descricao: "Fotografia Destination Wedding (Itália)", valor: 25000, status: "enviado", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-23" },
    { cliente: "Letícia & Rafael", descricao: "Mini Wedding (Cobertura 4h)", valor: 3000, status: "pendente", dataRecebido: "2026-02-23", dataAtualizado: "2026-02-23" },
    { cliente: "Isabela & Mateus", descricao: "Cobertura Completa Casamento + Álbum Panorâmico", valor: 7100, status: "contratado", dataRecebido: "2026-02-17", dataAtualizado: "2026-02-22" },
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
          usuario: {
            connect: { id: admin.id }
          },
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
