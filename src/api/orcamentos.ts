import type { Status } from "@/components/StatusBadge";
import type { Orcamento } from "@/types";

export type OrcamentoAPI = Orcamento;

const API_BASE = "/api";

export async function fetchOrcamentos(): Promise<OrcamentoAPI[]> {
  const response = await fetch(`${API_BASE}/orcamentos`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao buscar orçamentos");
  }
  return response.json();
}

export async function createOrcamento(data: {
  clienteId?: string; // Opcional, para clientes existentes
  clienteNome: string; // Obrigatório, para novos clientes ou para exibição
  telefone: string;
  descricao: string;
  valor: number;
}): Promise<OrcamentoAPI> {
  const response = await fetch(`${API_BASE}/orcamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar orçamento");
  }
  return response.json();
}

export async function updateOrcamento(
  id: string,
  data: {
    status?: Status;
    descricao?: string;
    valor?: number;
  }
): Promise<OrcamentoAPI> {
  // A atualização de cliente/telefone não é mais feita por aqui
  const response = await fetch(`${API_BASE}/orcamentos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar orçamento");
  }
  return response.json();
}

export async function deleteOrcamento(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/orcamentos/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao deletar orçamento");
  }
}
