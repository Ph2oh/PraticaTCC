import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Orcamento } from "@/data/mockData";
import type { Status } from "@/components/StatusBadge";
import StatusBadge from "@/components/StatusBadge";
import { Phone, Calendar, User, DollarSign } from "lucide-react";

interface KanbanBoardProps {
    orcamentos: Orcamento[];
    onOrcamentoClick: (id: string) => void;
    onStatusChange?: (orcamentoId: string, newStatus: Status) => void;
}

const STATUS_COLUMNS: { id: Status; label: string; colorClass: string }[] = [
    { id: "pendente", label: "Pendente", colorClass: "border-warning/50 bg-warning/5" },
    { id: "enviado", label: "Em Negociação", colorClass: "border-primary/50 bg-primary/5" },
    { id: "contratado", label: "Contratado", colorClass: "border-success/50 bg-success/5" },
    { id: "recusado", label: "Recusado", colorClass: "border-destructive/50 bg-destructive/5" },
];

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
        <div className="flex w-full overflow-x-auto gap-4 pb-4 min-h-[600px] snap-x">
            <DragDropContext onDragEnd={onDragEnd}>
                {STATUS_COLUMNS.map((column) => (
                    <div key={column.id} className="min-w-[300px] w-full max-w-[350px] shrink-0 snap-start flex flex-col">
                        <div className={`mb-4 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm bg-card`}>
                            <h3 className="font-semibold text-sm text-foreground">{column.label}</h3>
                            <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-semibold text-muted-foreground">
                                {columns[column.id].length}
                            </span>
                        </div>

                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 rounded-2xl p-2 transition-all duration-300 ${snapshot.isDraggingOver ? "bg-muted/40 shadow-inner" : "bg-transparent"
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
                                                    className={`group mb-4 cursor-pointer bg-card rounded-2xl p-5 transition-all duration-300 ${snapshot.isDragging
                                                        ? "shadow-xl scale-105 rotate-2 ring-1 ring-primary/20 z-50"
                                                        : "shadow-sm hover:shadow-md hover:-translate-y-1 border border-transparent"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-xs font-mono font-medium text-muted-foreground/80 bg-muted/30 px-2.5 py-1 rounded-lg">
                                                            {orc.id}
                                                        </span>
                                                    </div>

                                                    <p className="font-medium text-card-foreground text-sm line-clamp-2 mb-3">
                                                        {orc.descricao}
                                                    </p>

                                                    <div className="space-y-2 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-3.5 h-3.5 opacity-70" />
                                                            <span className="truncate">{orc.cliente}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="w-3.5 h-3.5 text-primary opacity-80" />
                                                            <span className="font-medium text-foreground">
                                                                {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                                                            <div className="flex items-center gap-1.5 opacity-60">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{new Date(orc.dataAtualizado).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}</span>
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                                {orc.cliente.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}

                                    {columns[column.id].length === 0 && !snapshot.isDraggingOver && (
                                        <div className="h-24 flex items-center justify-center rounded-2xl bg-card border border-transparent shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] text-xs text-muted-foreground/60 m-2">
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
    );
};

export default KanbanBoard;
