import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Orcamento } from "@/types";
import type { Status } from "@/components/StatusBadge";
import StatusBadge from "@/components/StatusBadge";
import { Phone, Calendar, User, DollarSign } from "lucide-react";

interface KanbanBoardProps {
    orcamentos: Orcamento[];
    onOrcamentoClick: (id: string) => void;
    onStatusChange?: (orcamentoId: string, newStatus: Status) => void;
}

const STATUS_COLUMNS: { id: Status; label: string; colorClass: string; textColor: string }[] = [
    { id: "pendente", label: "Pendente", colorClass: "border-warning/50 bg-warning/5", textColor: "text-warning" },
    { id: "enviado", label: "Em Negociação", colorClass: "border-primary/50 bg-primary/5", textColor: "text-primary" },
    { id: "contratado", label: "Contratado", colorClass: "border-success/50 bg-success/5", textColor: "text-success" },
    { id: "recusado", label: "Recusado", colorClass: "border-destructive/50 bg-destructive/5", textColor: "text-destructive" },
];

const STATUS_CARD_COLORS: Record<Status, string> = {
    pendente: "border-warning/20 bg-warning/5 hover:bg-warning/8",
    enviado: "border-primary/20 bg-primary/5 hover:bg-primary/8",
    contratado: "border-success/20 bg-success/5 hover:bg-success/8",
    recusado: "border-destructive/20 bg-destructive/5 hover:bg-destructive/8",
};

const STATUS_AVATAR_COLORS: Record<Status, string> = {
    pendente: "bg-warning/10 text-warning",
    enviado: "bg-primary/10 text-primary",
    contratado: "bg-success/10 text-success",
    recusado: "bg-destructive/10 text-destructive",
};

export const KanbanBoard = ({ orcamentos, onOrcamentoClick, onStatusChange }: KanbanBoardProps) => {
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
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onOrcamentoClick(orc.id)}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                        }}
                                                        className={`group mb-3 cursor-pointer rounded-xl p-3 sm:p-4 transition-all duration-300 border ${snapshot.isDragging
                                                            ? "shadow-xl scale-105 rotate-2 ring-1 ring-primary/20 z-50"
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
                                                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                                                                <div className="flex items-center gap-1 opacity-60">
                                                                    <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                                                    <span className="text-xs">{new Date(orc.dataAtualizado).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}</span>
                                                                </div>
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${STATUS_AVATAR_COLORS[orc.status]}`}>
                                                                    {(orc.cliente?.nome || "?").substring(0, 2).toUpperCase()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
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
