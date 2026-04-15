import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Orcamento } from "@/types";
import type { Status } from "@/components/StatusBadge";
import StatusBadge from "@/components/StatusBadge";
import { Phone, Calendar, User, DollarSign, Copy, Send, Trash2, Clock, Sparkles, Bot, MonitorDot } from "lucide-react";
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
// Importa o dialog de motivo de recusa e seus tipos para interceptar mudancas para 'recusado'
import { MotivoRecusaDialog, type MotivoRecusaValue } from "@/components/MotivoRecusaDialog";
import { ConfirmacaoReversaoDialog } from "@/components/ConfirmacaoReversaoDialog";

interface KanbanBoardProps {
    orcamentos: Orcamento[];
    onOrcamentoClick: (id: string) => void;
    // Estendido: aceita motivoRecusa como terceiro argumento opcional quando newStatus='recusado'
    onStatusChange?: (orcamentoId: string, newStatus: Status, motivoRecusa?: string) => void;
    highlightedId?: string | null;
    // Conjunto de IDs para destaque múltiplo — usado pelo banner de orçamentos antigos
    highlightedIds?: Set<string>;
}

const STATUS_COLUMNS: { id: Status; label: string; colorClass: string; textColor: string }[] = [
    { id: "pendente", label: "Pendente", colorClass: "border-warning/30 bg-warning/5", textColor: "text-warning" },
    { id: "enviado", label: "Em Negociação", colorClass: "border-blue-500/30 bg-blue-500/5", textColor: "text-blue-500" },
    { id: "contratado", label: "Contratado", colorClass: "border-success/30 bg-success/5", textColor: "text-success" },
    { id: "recusado", label: "Recusado", colorClass: "border-destructive/30 bg-destructive/5", textColor: "text-destructive" },
];

const STATUS_CARD_COLORS: Record<Status, string> = {
    pendente: "border-border/40 hover:border-warning/60 hover:shadow-warning/10",
    enviado: "border-border/40 hover:border-blue-500/60 hover:shadow-blue-500/10",
    contratado: "border-border/40 hover:border-success/60 hover:shadow-success/10",
    recusado: "border-border/40 hover:border-destructive/60 hover:shadow-destructive/10",
};

const STATUS_AVATAR_COLORS: Record<Status, string> = {
    pendente: "bg-warning/10 text-warning",
    enviado: "bg-blue-500/10 text-blue-500",
    contratado: "bg-success/10 text-success",
    recusado: "bg-destructive/10 text-destructive",
};

export const KanbanBoard = ({ orcamentos, onOrcamentoClick, onStatusChange, highlightedId, highlightedIds }: KanbanBoardProps) => {
    const { toast } = useToast();
    const deleteMutation = useDeleteOrcamento();

    const [columns, setColumns] = useState<Record<Status, Orcamento[]>>({
        pendente: [],
        enviado: [],
        contratado: [],
        recusado: [],
    });

    // Estado do dialog de motivo de recusa: guarda a acao pendente ate o usuario confirmar ou cancelar
    const [recusaPendente, setRecusaPendente] = useState<{
        orcamentoId: string;
        sourceColumn: Status;
        destColumn: Status;
        sourceIndex: number;
        destIndex: number;
        snapshotColumns: Record<Status, Orcamento[]>;
    } | null>(null);

    // Estado do dialog de reversao de contrato
    const [reversaoPendente, setReversaoPendente] = useState<{
        orcamentoId: string;
        sourceColumn: Status;
        destColumn: Status;
        sourceIndex: number;
        destIndex: number;
        snapshotColumns: Record<Status, Orcamento[]>;
    } | null>(null);

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

    // Aplica efetivamente a mudanca de coluna apos confirmacao (ou imediatamente para status != recusado)
    const aplicarMudancaColuna = (
        sourceColumn: Status,
        destColumn: Status,
        sourceIndex: number,
        destIndex: number,
        motivoRecusa?: string
    ) => {
        const sourceItems = Array.from(columns[sourceColumn]);
        const destItems = Array.from(columns[destColumn]);
        const [removido] = sourceItems.splice(sourceIndex, 1);
        removido.status = destColumn;
        destItems.splice(destIndex, 0, removido);

        setColumns({ ...columns, [sourceColumn]: sourceItems, [destColumn]: destItems });

        if (onStatusChange) {
            onStatusChange(removido.id, destColumn, motivoRecusa);
        }

        // Gamificacao: confete ao fechar contrato
        if (destColumn === "contratado" && sourceColumn !== "contratado") {
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
            const interval: ReturnType<typeof setInterval> = setInterval(function () {
                const particleCount = 50;
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            setTimeout(() => clearInterval(interval), 1000);
            toast({
                title: "Novo Contrato Fechado!",
                description: `O orçamento de ${columns[sourceColumn][sourceIndex]?.cliente?.nome || "Cliente"} foi ganho! Excelente trabalho!`,
            });
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceColumn = source.droppableId as Status;
        const destColumn = destination.droppableId as Status;

        // Movendo na mesma coluna — sem confirmacao necessaria
        if (sourceColumn === destColumn) {
            const novaColuna = Array.from(columns[sourceColumn]);
            const [removido] = novaColuna.splice(source.index, 1);
            novaColuna.splice(destination.index, 0, removido);
            setColumns({ ...columns, [sourceColumn]: novaColuna });
            return;
        }

        // Intercepta reversao de contrato (contratado -> qualquer outro)
        if (sourceColumn === "contratado" && destColumn !== "contratado") {
            setReversaoPendente({
                orcamentoId: columns[sourceColumn][source.index]?.id,
                sourceColumn,
                destColumn,
                sourceIndex: source.index,
                destIndex: destination.index,
                snapshotColumns: columns,
            });
            return;
        }

        // Regra de negocio: impede contratacao de orcamento com valor zerado
        // O usuario deve editar o orcamento e definir um valor antes de mover para contratado
        if (destColumn === "contratado" && sourceColumn !== "contratado") {
            const orcMovido = columns[sourceColumn][source.index];
            if (orcMovido && orcMovido.valor <= 0) {
                toast({
                    title: "Valor obrigatorio",
                    description: "Defina um valor acima de R$ 0,00 antes de marcar como contratado. Clique no card para editar.",
                    variant: "destructive",
                });
                return;
            }
        }

        // Intercepta drag para 'recusado': guarda estado e abre dialog sem mover o card ainda
        if (destColumn === "recusado" && sourceColumn !== "recusado") {
            setRecusaPendente({
                orcamentoId: columns[sourceColumn][source.index]?.id,
                sourceColumn,
                destColumn,
                sourceIndex: source.index,
                destIndex: destination.index,
                snapshotColumns: columns,
            });
            return;
        }

        aplicarMudancaColuna(sourceColumn, destColumn, source.index, destination.index);
    };

    // Confirmacao do motivo de recusa via drag-and-drop ou contextMenu
    const handleRecusaConfirm = (motivo: MotivoRecusaValue) => {
        if (!recusaPendente) return;
        aplicarMudancaColuna(
            recusaPendente.sourceColumn,
            recusaPendente.destColumn,
            recusaPendente.sourceIndex,
            recusaPendente.destIndex,
            motivo
        );
        setRecusaPendente(null);
    };

    const handleRecusaCancel = () => {
        setRecusaPendente(null);
    };

    // Confirmacao da reversao de status contratado
    const handleReversaoConfirm = () => {
        if (!reversaoPendente) return;
        
        // Se a reversao for para 'recusado', joga no proximo dialog (MotivoRecusa)
        if (reversaoPendente.destColumn === "recusado") {
            setRecusaPendente(reversaoPendente);
            setReversaoPendente(null);
            return;
        }
        
        aplicarMudancaColuna(
            reversaoPendente.sourceColumn,
            reversaoPendente.destColumn,
            reversaoPendente.sourceIndex,
            reversaoPendente.destIndex
        );
        setReversaoPendente(null);
    };

    const handleReversaoCancel = () => {
        setReversaoPendente(null);
    };

    // Intercepta mudanca de status via menu de contexto
    const handleContextStatusChange = (orcamentoId: string, novoStatus: Status) => {
        const sourceColumn = Object.keys(columns).find(
            (col) => columns[col as Status].some((o) => o.id === orcamentoId)
        ) as Status | undefined;
        if (!sourceColumn || sourceColumn === novoStatus) return;

        const sourceIndex = columns[sourceColumn].findIndex((o) => o.id === orcamentoId);
        const destIndex = columns[novoStatus].length;

        // Regra 1: Reversão de "contratado" sempre pede confirmação
        if (sourceColumn === "contratado" && novoStatus !== "contratado") {
            setReversaoPendente({
                orcamentoId,
                sourceColumn,
                destColumn: novoStatus,
                sourceIndex,
                destIndex,
                snapshotColumns: columns,
            });
            return;
        }

        // Regra de negocio: impede contratacao com valor zerado via menu de contexto
        if (novoStatus === "contratado" && sourceColumn !== "contratado") {
            const orc = columns[sourceColumn][sourceIndex];
            if (orc && orc.valor <= 0) {
                toast({
                    title: "Valor obrigatorio",
                    description: "Defina um valor acima de R$ 0,00 antes de marcar como contratado. Clique no card para editar.",
                    variant: "destructive",
                });
                return;
            }
        }

        // Regra 2: Movimentacao para "recusado" pede motivo de recusa
        if (novoStatus === "recusado") {
            setRecusaPendente({
                orcamentoId,
                sourceColumn,
                destColumn: novoStatus,
                sourceIndex,
                destIndex,
                snapshotColumns: columns,
            });
            return;
        }

        // Caso normal sem interceptacoes:
        aplicarMudancaColuna(sourceColumn, novoStatus, sourceIndex, destIndex);
    };

    return (
        <>
        <div className="w-full pb-0 overflow-hidden">
            <div className="flex flex-row lg:grid lg:grid-cols-4 gap-4 overflow-x-auto lg:overflow-x-visible pb-4 snap-x snap-mandatory lg:snap-none custom-scrollbar px-1">
                <DragDropContext onDragEnd={onDragEnd}>
                    {STATUS_COLUMNS.map((column) => (
                        <div key={column.id} className="flex flex-col min-w-[280px] w-[85vw] sm:w-[45vw] lg:w-full snap-center last:pr-4 lg:last:pr-0">
                            <div className={`mb-4 px-4 py-2.5 rounded-[18px] flex items-center justify-between shadow-sm border ${column.colorClass} backdrop-blur-sm bg-opacity-40`}>
                                <h3 className={`font-semibold text-sm tracking-tight ${column.textColor} truncate`}>{column.label}</h3>
                                <span className="bg-background/80 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm text-foreground ml-2 flex-shrink-0 ring-1 ring-border/50">
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
                                                                id={`orc-${orc.id}`}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => onOrcamentoClick(orc.id)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                }}
                                                                className={`group mb-4 cursor-pointer rounded-[20px] p-4 sm:p-5 transition-all duration-400 ease-out border bg-card/60 backdrop-blur-md ${snapshot.isDragging
                                                                    ? "shadow-[0_20px_40px_rgba(0,0,0,0.12)] scale-[1.03] rotate-1 ring-2 ring-primary/20 z-50 opacity-95 bg-card/90"
                                                                    : highlightedId === orc.id
                                                                    ? "ring-2 ring-primary bg-primary/20 animate-pulse shadow-lg"
                                                                    : highlightedIds?.has(orc.id)
                                                                    ? "ring-2 ring-amber-500 bg-amber-500/15 animate-pulse shadow-lg"
                                                                    : `shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] ${STATUS_CARD_COLORS[orc.status]}`
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ring-2 ring-background ${orc.status === 'pendente' ? 'bg-warning' : orc.status === 'enviado' ? 'bg-blue-500' : orc.status === 'contratado' ? 'bg-success' : 'bg-destructive'}`} />
                                                                        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase opacity-70">
                                                                            #{orc.id.split('-')[0]}
                                                                        </span>

                                                                        {orc.eventos && orc.eventos.length > 0 && (
                                                                            <div className="flex items-center gap-1 w-max px-1.5 py-0.5 ml-1 rounded shadow-sm bg-background/50 border border-border/40 backdrop-blur-sm">
                                                                                {orc.eventos.some(e => e.tipo === 'criado' && e.descricao.toLowerCase().includes('whatsapp')) ? (
                                                                                    <>
                                                                                        <Bot className="w-[10px] h-[10px] text-primary/80" />
                                                                                        <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest leading-none mt-[1px]">WhatsApp</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <MonitorDot className="w-[10px] h-[10px] text-muted-foreground/60" />
                                                                                        <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest leading-none mt-[1px]">Manual</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <p className="font-medium text-foreground text-sm sm:text-base leading-snug mb-4 line-clamp-2">
                                                                    {orc.descricao}
                                                                </p>

                                                                <div className="space-y-3 mt-auto">
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm ${STATUS_AVATAR_COLORS[orc.status]}`}>
                                                                                {(orc.cliente?.nome || "?").substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                            <span className="truncate text-[13px] font-medium text-foreground/80">{orc.cliente?.nome || "Cliente não informado"}</span>
                                                                        </div>

                                                                        <div className="flex items-center justify-between pt-3 border-t border-border/40">
                                                                            <span className="font-semibold text-foreground text-[16px] tracking-tight">
                                                                                {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                                            </span>
                                                                            {/* Datas: criação (Calendar) e última atualização (Clock) exibidas lado a lado */}
                                                                            <div className="flex items-center gap-2 opacity-60">
                                                                                <div className="flex items-center gap-1">
                                                                                    <Calendar className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                                                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                                                        {new Date(orc.dataRecebido).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }).replace(". de", "")}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-muted-foreground/40 text-[10px]">•</span>
                                                                                <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                                                                                    <Clock className="w-3 h-3 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                                                                                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                                                                        {new Date(orc.dataAtualizado).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }).replace(". de", "")}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
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
                                                                            // Usa handleContextStatusChange para interceptar mudancas para 'recusado'
                                                                            onSelect={() => handleContextStatusChange(orc.id, col.id)}
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

        {/* Dialog de motivo de recusa: fora do grid para evitar conflito de portal com o DragDropContext */}
        <MotivoRecusaDialog
            open={recusaPendente !== null}
            onConfirm={handleRecusaConfirm}
            onCancel={handleRecusaCancel}
        />
        
        {/* Novo Dialog de confirmacao de reversao de status Contratado */}
        <ConfirmacaoReversaoDialog
            open={reversaoPendente !== null}
            onConfirm={handleReversaoConfirm}
            onCancel={handleReversaoCancel}
        />
        </>
    );
};

export default KanbanBoard;
