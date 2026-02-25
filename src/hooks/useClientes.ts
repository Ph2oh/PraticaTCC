import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientes, createCliente, updateCliente, deleteCliente } from "@/api/clientes";
import type { Cliente } from "@/types";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome?: string; email?: string; telefone?: string } }) =>
      updateCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
