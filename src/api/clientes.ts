import type { Cliente } from "@/types";
import { getAuthHeaders } from "@/utils/auth";

const API_BASE = "/api";

export async function fetchClientes(): Promise<Cliente[]> {
  const response = await fetch(`${API_BASE}/clientes`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao buscar clientes");
  }
  return response.json();
}

export async function createCliente(data: {
  nome: string;
  email: string;
  telefone: string;
}): Promise<Cliente> {
  const response = await fetch(`${API_BASE}/clientes`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar cliente");
  }
  return response.json();
}

export async function updateCliente(
  id: string,
  data: {
    nome?: string;
    email?: string;
    telefone?: string;
  }
): Promise<Cliente> {
  const response = await fetch(`${API_BASE}/clientes/${id}`, {
    method: "PUT",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar cliente");
  }
  return response.json();
}

export async function deleteCliente(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/clientes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao deletar cliente");
  }
}
