import type { Status } from "@/components/StatusBadge";

export interface OrcamentoEvento {
  id: string;
  orcamentoId: string;
  tipo: "criado" | "status_alterado" | "atualizado";
  descricao: string;
  statusAntigo?: string | null;
  statusNovo?: string | null;
  criadoEm: string;
}

export interface Orcamento {
  id: string;
  descricao: string;
  valor: number;
  status: Status;
  dataRecebido: string;
  dataAtualizado: string;
  clienteId: string;
  cliente?: Cliente;
  eventos?: OrcamentoEvento[];
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  ultimoContato: string;
  totalOrcamentos: number;
  orcamentos?: Orcamento[];
}
