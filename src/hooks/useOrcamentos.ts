import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrcamentos, createOrcamento, updateOrcamento, deleteOrcamento, type OrcamentoAPI } from "@/api/orcamentos";
import type { Status } from "@/components/StatusBadge";

import { useAuth } from "@/contexts/AuthContext";

export function useOrcamentos() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["orcamentos", token],
    queryFn: fetchOrcamentos,
    staleTime: 1000 * 60, // 1 minuto
    enabled: !!token, // Só busca se tiver logado
  });
}

export function useCreateOrcamento() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: createOrcamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", token] });
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}

export function useUpdateOrcamento() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: Status; descricao?: string; valor?: number } }) =>
      updateOrcamento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", token] });
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}

export function useDeleteOrcamento() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: deleteOrcamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos", token] });
      queryClient.invalidateQueries({ queryKey: ["clientes", token] });
    },
  });
}
