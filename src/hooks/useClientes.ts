import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientes, createCliente, updateCliente, deleteCliente } from "@/api/clientes";
import type { Cliente } from "@/types";

import { useAuth } from "@/contexts/AuthContext";

export function useClientes() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["clientes", token],
    queryFn: fetchClientes,
    staleTime: 1000 * 60, // 1 minuto
    enabled: !!token,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: createCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome?: string; email?: string; telefone?: string } }) =>
      updateCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}
