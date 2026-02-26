import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Orcamento } from "@/types";
import type { Status } from "@/components/StatusBadge";
import StatusBadge from "@/components/StatusBadge";
import { Phone, Calendar, User, DollarSign, Copy, Send, Trash2, Clock } from "lucide-react";
import confetti from "canvas-confetti";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { useDeleteOrcamento } from "@/hooks/useOrcamentos";

interface KanbanBoardProps {
    orcamentos: Orcamento[];
    onOrcamentoClick: (id: string) => void;
    onStatusChange?: (orcamentoId: string, newStatus: Status) => void;
}

const STATUS_COLUMNS: { id: Status; label: string; colorClass: string; textColor: string }[] = [
    { id: "pendente", label: "Pendente", colorClass: "border-warning/50 bg-warning/5", textColor: "text-warning" },
    { id: "enviado", label: "Em Negociação", colorClass: "border-blue-500/50 bg-blue-500/5", textColor: "text-blue-500" },
    { id: "contratado", label: "Contratado", colorClass: "border-success/50 bg-success/5", textColor: "text-success" },
    { id: "recusado", label: "Recusado", colorClass: "border-destructive/50 bg-destructive/5", textColor: "text-destructive" },
];

const STATUS_CARD_COLORS: Record<Status, string> = {
    pendente: "border-warning/20 bg-warning/5 hover:bg-warning/8",
    enviado: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/8",
    contratado: "border-success/20 bg-success/5 hover:bg-success/8",
    recusado: "border-destructive/20 bg-destructive/5 hover:bg-destructive/8",
};

const STATUS_AVATAR_COLORS: Record<Status, string> = {
    pendente: "bg-warning/10 text-warning",
    enviado: "bg-blue-500/10 text-blue-500",
    contratado: "bg-success/10 text-success",
    recusado: "bg-destructive/10 text-destructive",
};

export const KanbanBoard = ({ orcamentos, onOrcamentoClick, onStatusChange }: KanbanBoardProps) => {
    const { toast } = useToast();
    const deleteMutation = useDeleteOrcamento();

    const [columns, setColumns] = useState<Record<Status, Orcamento[]>>({
        pendente: [],
        enviado: [],
        contratado: [],
        recusado: [],
    });

    // Atualiza as colunas locais quando a prop orcamentos muda
    useEffect(() => {
        const newColumns: Record<Status, Orcamento[]> = {
            pendente: [],
            enviado: [],
            contratado: [],
            recusado: [],
        };

        orcamentos.forEach((orc) => {
            // Agrupa orcamentos por status
            if (newColumns[orc.status]) {
                newColumns[orc.status].push(orc);
            }
        });

        // Ordenação cronológica: do mais antigo para o mais novo
        // Isso ajuda a priorizar os cartões que estão parados na coluna há mais tempo.
        (Object.keys(newColumns) as Status[]).forEach(status => {
            newColumns[status].sort((a, b) => {
                const dateA = new Date(a.dataAtualizado || a.dataRecebido).getTime();
                const dateB = new Date(b.dataAtualizado || b.dataRecebido).getTime();
                return dateA - dateB;
            });
        });

        setColumns(newColumns);
    }, [orcamentos]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Se dropou fora do quadro
        if (!destination) return;

        // Se dropou no mesmo lugar
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceColumn = source.droppableId as Status;
        const destColumn = destination.droppableId as Status;

        // Movendo na mesma coluna
        if (sourceColumn === destColumn) {
            const novaColuna = Array.from(columns[sourceColumn]);
            const [removido] = novaColuna.splice(source.index, 1);
            novaColuna.splice(destination.index, 0, removido);

            setColumns({
                ...columns,
                [sourceColumn]: novaColuna,
            });
            return;
        }

        // Movendo para outra coluna
        const sourceItems = Array.from(columns[sourceColumn]);
        const destItems = Array.from(columns[destColumn]);
        const [removido] = sourceItems.splice(source.index, 1);

        // Atualiza o status do item
        removido.status = destColumn;

        destItems.splice(destination.index, 0, removido);

        setColumns({
            ...columns,
            [sourceColumn]: sourceItems,
            [destColumn]: destItems,
        });

        // Chama o callback prop se existir
        if (onStatusChange) {
            onStatusChange(removido.id, destColumn);
        }

        // Gamificação / Micro-interação: Confete ao Fechar Contrato 🎉
        if (destColumn === "contratado" && sourceColumn !== "contratado") {
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: ReturnType<typeof setInterval> = setInterval(function () {
                const particleCount = 50;
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            setTimeout(() => clearInterval(interval), 1000); // Para o confete em 1 segundo

            toast({
                title: "Novo Contrato Fechado! 🎉",
                description: `O orçamento de ${removido.cliente?.nome || "Cliente"} foi ganho! Excelente trabalho!`,
            });
        }
    };

    return (
        <div className="w-full pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full auto-rows-max">
                <DragDropContext onDragEnd={onDragEnd}>
                    {STATUS_COLUMNS.map((column) => (
                        <div key={column.id} className="flex flex-col">
                            <div className={`mb-4 px-3 py-2 rounded-2xl flex items-center justify-between shadow-sm border ${column.colorClass}`}>
                                <h3 className={`font-semibold text-xs sm:text-sm ${column.textColor} truncate`}>{column.label}</h3>
                                <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground ml-2 flex-shrink-0">
                                    {columns[column.id].length}
                                </span>
                            </div>

                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 rounded-2xl p-2 transition-all ${snapshot.isDraggingOver ? "bg-muted/40 shadow-inner" : "bg-transparent"
                                            }`}
                                    >
                                        {columns[column.id].map((orc, index) => (
                                            <Draggable key={orc.id} draggableId={orc.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <ContextMenu>
                                                        <ContextMenuTrigger asChild>
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => onOrcamentoClick(orc.id)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                }}
                                                                className={`group mb-3 cursor-pointer rounded-xl p-3 sm:p-4 transition-all duration-300 border-l-[4px] border-y border-r ${snapshot.isDragging
                                                                    ? "shadow-xl scale-105 rotate-2 ring-1 ring-primary/20 z-50 opacity-90"
                                                                    : "shadow-sm hover:shadow-md hover:-translate-y-1"
                                                                    } ${STATUS_CARD_COLORS[orc.status]}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xs font-mono font-medium text-muted-foreground/80 bg-muted/30 px-2 py-0.5 rounded-lg flex-shrink-0">
                                                                        {orc.id}
                                                                    </span>
                                                                </div>

                                                                <p className="font-medium text-card-foreground text-xs sm:text-sm line-clamp-2 mb-2">
                                                                    {orc.descricao}
                                                                </p>

                                                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <User className="w-3 h-3 opacity-70 flex-shrink-0" />
                                                                        <span className="truncate text-xs">{orc.cliente?.nome || "Cliente não informado"}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <DollarSign className="w-3 h-3 opacity-80 flex-shrink-0" />
                                                                        <span className="font-medium text-foreground text-xs">
                                                                            {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                                                                        {/* Time alert indicator */}
                                                                        <div className="flex items-center gap-1.5 opacity-70">
                                                                            <Clock className="w-3 h-3 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                                            <span className="text-[11px] font-medium tracking-tight">
                                                                                {new Date(orc.dataAtualizado).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                                                                            </span>
                                                                        </div>
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${STATUS_AVATAR_COLORS[orc.status]}`}>
                                                                            {(orc.cliente?.nome || "?").substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="w-56">
                                                            <ContextMenuItem onSelect={() => {
                                                                navigator.clipboard.writeText(orc.id);
                                                                toast({ title: "ID Copiado" });
                                                            }}>
                                                                <Copy className="w-4 h-4 mr-2" /> Copiar ID
                                                            </ContextMenuItem>

                                                            <ContextMenuItem
                                                                disabled={!orc.cliente?.telefone}
                                                                onSelect={() => {
                                                                    if (orc.cliente?.telefone) {
                                                                        const number = orc.cliente.telefone.replace(/\D/g, "");
                                                                        window.open(`https://wa.me/55${number}`, "_blank");
                                                                    }
                                                                }}
                                                            >
                                                                <Send className="w-4 h-4 mr-2" /> Abrir no WhatsApp
                                                            </ContextMenuItem>

                                                            <ContextMenuSeparator />

                                                            <ContextMenuSub>
                                                                <ContextMenuSubTrigger>Mudar Status</ContextMenuSubTrigger>
                                                                <ContextMenuSubContent className="w-48">
                                                                    {STATUS_COLUMNS.map(col => (
                                                                        <ContextMenuItem
                                                                            key={col.id}
                                                                            disabled={orc.status === col.id}
                                                                            onSelect={() => onStatusChange && onStatusChange(orc.id, col.id)}
                                                                        >
                                                                            {col.label}
                                                                        </ContextMenuItem>
                                                                    ))}
                                                                </ContextMenuSubContent>
                                                            </ContextMenuSub>

                                                            <ContextMenuSeparator />

                                                            <ContextMenuItem
                                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                                onSelect={() => {
                                                                    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
                                                                        deleteMutation.mutate(orc.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {columns[column.id].length === 0 && !snapshot.isDraggingOver && (
                                            <div className="h-16 sm:h-20 flex items-center justify-center rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground/60">
                                                Arraste para cá
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </DragDropContext>
            </div>
        </div>
    );
};

export default KanbanBoard;
