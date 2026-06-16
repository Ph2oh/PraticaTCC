import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLegacyDateFromEvents(orcamento: any, searchString: string): string | null {
  if (!orcamento?.eventos || !Array.isArray(orcamento.eventos)) return null;
  // Procura no histórico de eventos o momento em que o status mudou para o desejado (ex: "contratado" ou "recusado")
  // Ordenado por mais recente caso haja múltiplas mudanças
  const eventosOrdenados = [...orcamento.eventos].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  const evento = eventosOrdenados.find(e => e.tipo === 'status_alterado' && e.descricao && e.descricao.toLowerCase().includes(searchString.toLowerCase()));
  return evento ? evento.criadoEm : null;
}
