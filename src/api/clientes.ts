import type { Cliente } from "@/types";

const API_BASE = "/api";

export async function fetchClientes(): Promise<Cliente[]> {
  const response = await fetch(`${API_BASE}/clientes`);
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao deletar cliente");
  }
}
