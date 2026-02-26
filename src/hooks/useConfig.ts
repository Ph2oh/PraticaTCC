import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAuthHeaders } from "@/utils/auth";


export interface ConfigAPI {
    id: string;
    corPrimaria: string;
    tema: string;
    templateProposta: string;
    templateLembrete: string;
    templateAgradecimento: string;
}

export const fetchConfig = async (): Promise<ConfigAPI> => {
    const response = await fetch("/api/config", {
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Falha ao buscar configurações");
    return response.json();
};

export const updateConfig = async (data: Partial<ConfigAPI>): Promise<ConfigAPI> => {
    const response = await fetch("/api/config", {
        method: "PUT",
        headers: getAuthHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Falha ao atualizar configurações");
    return response.json();
};

export function useConfig() {
    return useQuery({
        queryKey: ["config"],
        queryFn: fetchConfig,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useUpdateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["config"] });
        },
    });
}
