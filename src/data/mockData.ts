import type { Status } from "@/components/StatusBadge";

export interface Orcamento {
  id: string;
  cliente: string;
  telefone: string;
  descricao: string;
  valor: number;
  status: Status;
  dataRecebido: string;
  dataAtualizado: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  totalOrcamentos: number;
  ultimoContato: string;
}

export const orcamentos: Orcamento[] = [
  { id: "ORC-001", cliente: "Maria Silva", telefone: "(11) 99999-1234", descricao: "Pintura residencial - 3 quartos", valor: 4500, status: "contratado", dataRecebido: "2026-02-20", dataAtualizado: "2026-02-22" },
  { id: "ORC-002", cliente: "João Santos", telefone: "(11) 98888-5678", descricao: "Reforma de banheiro completa", valor: 12000, status: "enviado", dataRecebido: "2026-02-21", dataAtualizado: "2026-02-21" },
  { id: "ORC-003", cliente: "Ana Oliveira", telefone: "(11) 97777-9012", descricao: "Instalação de piso laminado", valor: 3200, status: "pendente", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-22" },
  { id: "ORC-004", cliente: "Carlos Pereira", telefone: "(11) 96666-3456", descricao: "Troca de telhado", valor: 8500, status: "recusado", dataRecebido: "2026-02-18", dataAtualizado: "2026-02-20" },
  { id: "ORC-005", cliente: "Fernanda Lima", telefone: "(11) 95555-7890", descricao: "Projeto paisagismo", valor: 6000, status: "contratado", dataRecebido: "2026-02-19", dataAtualizado: "2026-02-23" },
  { id: "ORC-006", cliente: "Roberto Costa", telefone: "(11) 94444-2345", descricao: "Elétrica predial", valor: 15000, status: "enviado", dataRecebido: "2026-02-22", dataAtualizado: "2026-02-23" },
  { id: "ORC-007", cliente: "Lucia Martins", telefone: "(11) 93333-6789", descricao: "Impermeabilização laje", valor: 7200, status: "pendente", dataRecebido: "2026-02-23", dataAtualizado: "2026-02-23" },
  { id: "ORC-008", cliente: "Pedro Almeida", telefone: "(11) 92222-0123", descricao: "Marcenaria sob medida", valor: 9800, status: "contratado", dataRecebido: "2026-02-17", dataAtualizado: "2026-02-22" },
];

export const clientes: Cliente[] = [
  { id: "CLI-001", nome: "Maria Silva", telefone: "(11) 99999-1234", email: "maria@email.com", totalOrcamentos: 3, ultimoContato: "2026-02-22" },
  { id: "CLI-002", nome: "João Santos", telefone: "(11) 98888-5678", email: "joao@email.com", totalOrcamentos: 1, ultimoContato: "2026-02-21" },
  { id: "CLI-003", nome: "Ana Oliveira", telefone: "(11) 97777-9012", email: "ana@email.com", totalOrcamentos: 2, ultimoContato: "2026-02-22" },
  { id: "CLI-004", nome: "Carlos Pereira", telefone: "(11) 96666-3456", email: "carlos@email.com", totalOrcamentos: 1, ultimoContato: "2026-02-20" },
  { id: "CLI-005", nome: "Fernanda Lima", telefone: "(11) 95555-7890", email: "fernanda@email.com", totalOrcamentos: 4, ultimoContato: "2026-02-23" },
  { id: "CLI-006", nome: "Roberto Costa", telefone: "(11) 94444-2345", email: "roberto@email.com", totalOrcamentos: 2, ultimoContato: "2026-02-23" },
];

export const chartDataSemanal = [
  { dia: "Seg", recebidos: 4, contratados: 1 },
  { dia: "Ter", recebidos: 6, contratados: 2 },
  { dia: "Qua", recebidos: 3, contratados: 1 },
  { dia: "Qui", recebidos: 8, contratados: 3 },
  { dia: "Sex", recebidos: 5, contratados: 2 },
  { dia: "Sáb", recebidos: 2, contratados: 1 },
  { dia: "Dom", recebidos: 1, contratados: 0 },
];

export const chartDataMensal = [
  { mes: "Set", recebidos: 45, contratados: 12 },
  { mes: "Out", recebidos: 52, contratados: 18 },
  { mes: "Nov", recebidos: 48, contratados: 15 },
  { mes: "Dez", recebidos: 38, contratados: 10 },
  { mes: "Jan", recebidos: 56, contratados: 22 },
  { mes: "Fev", recebidos: 29, contratados: 11 },
];

export const statusDistribution = [
  { name: "Pendente", value: 28, fill: "hsl(var(--warning))" },
  { name: "Enviado", value: 35, fill: "hsl(var(--primary))" },
  { name: "Contratado", value: 25, fill: "hsl(var(--success))" },
  { name: "Recusado", value: 12, fill: "hsl(var(--destructive))" },
];
