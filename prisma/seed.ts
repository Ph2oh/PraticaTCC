import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper para gerar datas dinâmicas relativas a hoje, garantindo que o seed sempre apareça no Mês Atual
const d = (diasAtras: number) => {
  const data = new Date();
  data.setDate(data.getDate() - diasAtras);
  return data;
};

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
        isAdmin: true,
        configuracao: {
          create: {
            corPrimaria: "224.3 76.3% 48%",
            tema: "light"
          }
        }
      }
    });
    console.log(`Admin user created: ${adminEmail} / ${adminPassword}`);
  } else {
    // Garante que se o admin já existia antes da migração de segurança, ele receba a flag true
    admin = await prisma.usuario.update({
      where: { email: adminEmail },
      data: { isAdmin: true }
    });
    console.log(`Admin user updated to ensure isAdmin is true: ${adminEmail}`);
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
    { nome: "Julia & Ricardo", telefone: "(11) 99999-1234", email: "julia_ricardo_casamento@email.com", ultimoContato: d(5) },
    { nome: "Amanda & Felipe", telefone: "(11) 98888-5678", email: "amanda.felipe.wedding@email.com", ultimoContato: d(6) },
    { nome: "Carolina & Thiago", telefone: "(11) 97777-9012", email: "carol_thiago_2026@email.com", ultimoContato: d(3) },
    { nome: "Beatriz & Lucas", telefone: "(11) 96666-3456", email: "bea_lucas_noivos@email.com", ultimoContato: d(15) },
    { nome: "Mariana & Gabriel", telefone: "(11) 95555-7890", email: "mari_gabriel_foto@email.com", ultimoContato: d(2) },
    { nome: "Camila & Pedro", telefone: "(11) 94444-2345", email: "camila.pedro.matrimonio@email.com", ultimoContato: d(1) },
    { nome: "Letícia & Rafael", telefone: "(11) 93333-6789", email: "leticia_rafael_wedding@email.com", ultimoContato: d(1) },
    { nome: "Isabela & Mateus", telefone: "(11) 92222-0123", email: "isabela_mateus_casamento@email.com", ultimoContato: d(10) },
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
    { cliente: "Julia & Ricardo", descricao: "Cobertura Completa + Ensaio Pré-Wedding", valor: 6500, status: "contratado", dataRecebido: d(10), dataAtualizado: d(5) },
    { cliente: "Amanda & Felipe", descricao: "Fotografia Casamento Duração 8h", valor: 4200, status: "enviado", dataRecebido: d(8), dataAtualizado: d(6) },
    { cliente: "Carolina & Thiago", descricao: "Pacote Premium (Pré + Casamento + Pós-Wedding)", valor: 8500, status: "pendente", dataRecebido: d(3), dataAtualizado: d(3) },
    { cliente: "Beatriz & Lucas", descricao: "Making of + Cerimônia + Festa + Álbum", valor: 7800, status: "recusado", dataRecebido: d(20), dataAtualizado: d(15), motivoRecusa: "Preço" },
    { cliente: "Mariana & Gabriel", descricao: "Ensaio Pré-Wedding Externo (Praia)", valor: 1500, status: "contratado", dataRecebido: d(15), dataAtualizado: d(2) },
    { cliente: "Camila & Pedro", descricao: "Fotografia Destination Wedding (Itália)", valor: 25000, status: "enviado", dataRecebido: d(5), dataAtualizado: d(1) },
    { cliente: "Letícia & Rafael", descricao: "Mini Wedding (Cobertura 4h)", valor: 3000, status: "pendente", dataRecebido: d(1), dataAtualizado: d(1) },
    { cliente: "Isabela & Mateus", descricao: "Cobertura Completa Casamento + Álbum Panorâmico", valor: 7100, status: "contratado", dataRecebido: d(25), dataAtualizado: d(10) },
  ];

  const orcamentos = await Promise.all(
    orcamentosSeed.map((orc) =>
      prisma.orcamento.create({
        data: {
          descricao: orc.descricao,
          valor: orc.valor,
          status: orc.status,
          dataRecebido: orc.dataRecebido,
          dataAtualizado: orc.dataAtualizado,
          dataFechamento: orc.status === "contratado" ? orc.dataAtualizado : null,
          dataCancelamento: orc.status === "recusado" ? orc.dataAtualizado : null,
          motivoRecusa: orc.status === "recusado" && "motivoRecusa" in orc ? (orc as any).motivoRecusa : null,
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
          criadoEm: seed.dataRecebido,
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
              criadoEm: seed.dataAtualizado,
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

  console.log("Seed completed successfully with dynamic dates!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
