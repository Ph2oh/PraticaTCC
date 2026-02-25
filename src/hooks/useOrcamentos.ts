import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrcamentos, createOrcamento, updateOrcamento, deleteOrcamento, type OrcamentoAPI } from "@/api/orcamentos";
import type { Status } from "@/components/StatusBadge";

export function useOrcamentos() {
  return useQuery({
    queryKey: ["orcamentos"],
    queryFn: fetchOrcamentos,
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useCreateOrcamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrcamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    },
  });
}

export function useUpdateOrcamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: Status; descricao?: string; valor?: number } }) =>
      updateOrcamento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    },
  });
}

export function useDeleteOrcamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOrcamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    },
  });
}
