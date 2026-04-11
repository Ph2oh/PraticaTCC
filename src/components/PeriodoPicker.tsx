/**
 * PeriodoPicker.tsx
 * Componente de filtro de período para a aba de Orçamentos.
 * Suporta períodos predefinidos (Este Mês, Mês Passado, etc.) e
 * um modo personalizado com dois date-inputs (de/até).
 *
 * Emite sempre um objeto com { start: Date, end: Date } para o pai,
 * ou null quando o modo é "Todos" (sem restrição de data).
 */
import { useState, useEffect } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  parseISO,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type PeriodoPreset =
  | "mes_atual"
  | "mes_passado"
  | "ultimos_3_meses"
  | "ultimos_6_meses"
  | "ano_atual"
  | "personalizado"
  | "todos";

export interface PeriodoRange {
  start: Date;
  end: Date;
}

interface PeriodoPickerProps {
  /** Preset selecionado atualmente (controlado pelo pai). */
  value: PeriodoPreset;
  /** Range customizado (apenas usado quando value === 'personalizado'). */
  customRange?: PeriodoRange | null;
  /** Chamado quando o usuário muda o preset. */
  onValueChange: (preset: PeriodoPreset) => void;
  /** Chamado com o range calculado sempre que o período efetivo mudar. */
  onRangeChange: (range: PeriodoRange | null) => void;
}

/** Retorna o range de datas para um preset predefinido, ou null para "todos". */
export function calcularRangeParaPreset(preset: PeriodoPreset): PeriodoRange | null {
  const now = new Date();
  switch (preset) {
    case "mes_atual":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "mes_passado": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "ultimos_3_meses": {
      const threeAgo = subMonths(now, 2);
      return { start: startOfMonth(threeAgo), end: endOfMonth(now) };
    }
    case "ultimos_6_meses": {
      const sixAgo = subMonths(now, 5);
      return { start: startOfMonth(sixAgo), end: endOfMonth(now) };
    }
    case "ano_atual":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "todos":
    case "personalizado":
    default:
      return null;
  }
}

const PRESET_LABELS: Record<PeriodoPreset, string> = {
  mes_atual: "Este Mês",
  mes_passado: "Mês Passado",
  ultimos_3_meses: "Últimos 3 Meses",
  ultimos_6_meses: "Últimos 6 Meses",
  ano_atual: "Ano Atual",
  personalizado: "Personalizado",
  todos: "Todo Histórico",
};

export function PeriodoPicker({
  value,
  customRange,
  onValueChange,
  onRangeChange,
}: PeriodoPickerProps) {
  // Estado interno do calendário de range personalizado
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (value === "personalizado" && customRange) {
      return { from: customRange.start, to: customRange.end };
    }
    return undefined;
  });

  // Sempre que o preset mudar para algo predefinido, emite o range calculado
  useEffect(() => {
    if (value !== "personalizado") {
      onRangeChange(calcularRangeParaPreset(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza caso venha via props (ex: inicialização)
  useEffect(() => {
    if (value === "personalizado" && customRange) {
      setDate({ from: customRange.start, to: customRange.end });
    }
  }, [customRange]); 

  // Quando o usuário seleciona as datas no calendário
  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      const end = new Date(range.to);
      end.setHours(23, 59, 59, 999);
      onRangeChange({ start: range.from, end });
    } else {
      // Incompleto, não aciona o filtro
      onRangeChange(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={value} onValueChange={(v) => onValueChange(v as PeriodoPreset)}>
        <SelectTrigger id="periodo-picker-trigger" className="w-[200px] h-10 bg-card">
          <Calendar className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mes_atual">Este Mês</SelectItem>
          <SelectItem value="mes_passado">Mês Passado</SelectItem>
          <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
          <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
          <SelectItem value="ano_atual">Ano Atual</SelectItem>
          <SelectItem value="personalizado">Personalizado...</SelectItem>
          <SelectItem value="todos">Todo Histórico</SelectItem>
        </SelectContent>
      </Select>

      {/* Input visual para data personalizada */}
      {value === "personalizado" && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal bg-card border-input",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })} -{" "}
                      {format(date.to, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Botão para limpar */}
          {date?.from && (
            <button
              onClick={() => handleSelect(undefined)}
              title="Limpar datas"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
