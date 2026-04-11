import { useState, useEffect } from "react";
import { Search, Download, Plus, LayoutGrid, List, Inbox, Loader, Copy, Send, Trash2, Calendar } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { useSearchParams } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import KanbanBoard from "@/components/KanbanBoard";
import { DetalhesDrawer } from "@/components/DetalhesDrawer";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrcamentos, useUpdateOrcamento, useDeleteOrcamento } from "@/hooks/useOrcamentos";
import { NovoOrcamentoDialog } from "@/components/NovoOrcamentoDialog";
import type { Status } from "@/components/StatusBadge";
// Importa o dialog de motivo de recusa para interceptar mudancas para 'recusado' na tabela e no kanban
import { MotivoRecusaDialog, type MotivoRecusaValue } from "@/components/MotivoRecusaDialog";
import { ConfirmacaoReversaoDialog } from "@/components/ConfirmacaoReversaoDialog";

const Orcamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState<string>("mes_atual");
  const [filterStatus, setFilterStatus] = useState<Status | "todos">("todos");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isNovoOrcamentoOpen, setIsNovoOrcamentoOpen] = useState(false);
  // Estado do dialog de recusa: guarda qual orcamento esta aguardando confirmacao de motivo
  const [recusaPendente, setRecusaPendente] = useState<{ id: string; novoStatus: Status } | null>(null);

  // Estado do dialog de reversao: guarda orcamento que vai reverter o "ganho"
  const [reversaoPendente, setReversaoPendente] = useState<{ id: string; novoStatus: Status } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const { data: orcamentos = [], isLoading, error } = useOrcamentos();
  const updateMutation = useUpdateOrcamento();
  const deleteMutation = useDeleteOrcamento();
  const { toast } = useToast();

  const filtered = orcamentos.filter((orc) => {
    const clienteNome = orc.cliente?.nome?.toLowerCase() ?? "";
    const matchesSearch =
      clienteNome.includes(searchTerm.toLowerCase()) ||
      orc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "todos" || orc.status === filterStatus;

    // Filtro Temporal baseado na dataRecebido, dataFechamento e dataCancelamento
    const dataOrc = new Date(orc.dataRecebido);
    const dataFechamento = orc.dataFechamento ? new Date(orc.dataFechamento) : null;
    const dataCancelamento = orc.dataCancelamento ? new Date(orc.dataCancelamento) : null;

    const now = new Date();
    let matchesPeriod = true;

    if (filterPeriodo !== "todos") {
      const isMesAtual = isWithinInterval(dataOrc, { start: startOfMonth(now), end: endOfMonth(now) });
      const fechadoMesAtual = dataFechamento ? isWithinInterval(dataFechamento, { start: startOfMonth(now), end: endOfMonth(now) }) : false;
      const canceladoMesAtual = dataCancelamento ? isWithinInterval(dataCancelamento, { start: startOfMonth(now), end: endOfMonth(now) }) : false;

      if (filterPeriodo === "mes_atual") {
        // Mostra mês atual OU orçamentos antigos vivos no pipeline OU antigos finalizados neste mês!
        const isFunilAtivo = orc.status === "pendente" || orc.status === "enviado";
        matchesPeriod = isMesAtual || isFunilAtivo || fechadoMesAtual || canceladoMesAtual;
      } else if (filterPeriodo === "mes_passado") {
        const lastMonth = subMonths(now, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);
        const isMesPassado = isWithinInterval(dataOrc, { start, end });
        const fechadoMesPassado = dataFechamento ? isWithinInterval(dataFechamento, { start, end }) : false;
        const canceladoMesPassado = dataCancelamento ? isWithinInterval(dataCancelamento, { start, end }) : false;

        matchesPeriod = isMesPassado || fechadoMesPassado || canceladoMesPassado;
      } else if (filterPeriodo === "ultimos_3_meses") {
        const trimesAgo = subMonths(now, 2);
        const start = startOfMonth(trimesAgo);
        const end = endOfMonth(now);
        const isUltimos3 = isWithinInterval(dataOrc, { start, end });
        const fechadoUltimos3 = dataFechamento ? isWithinInterval(dataFechamento, { start, end }) : false;
        const canceladoUltimos3 = dataCancelamento ? isWithinInterval(dataCancelamento, { start, end }) : false;

        matchesPeriod = isUltimos3 || fechadoUltimos3 || canceladoUltimos3;
      }
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // Intercepta mudancas de status na tabela: valida reversão de contrato e motivo de recusa
  const handleStatusChange = (orcamentoId: string, newStatus: Status, motivoRecusa?: string, bypassReversao?: boolean) => {
    const orc = orcamentos.find(o => o.id === orcamentoId);

    // Regra 1: Reversão de "contratado" sempre pede confirmação
    if (orc && orc.status === "contratado" && newStatus !== "contratado" && !bypassReversao) {
      setReversaoPendente({ id: orcamentoId, novoStatus: newStatus });
      return;
    }

    // Regra 2: Movimentação para "recusado" pede motivo de recusa
    if (newStatus === "recusado" && !motivoRecusa) {
      setRecusaPendente({ id: orcamentoId, novoStatus: newStatus });
      return;
    }

    updateMutation.mutate({
      id: orcamentoId,
      data: { status: newStatus, motivoRecusa: motivoRecusa ?? null },
    });
  };

  useEffect(() => {
    if (highlightId && !isLoading) {
      setTimeout(() => {
        const el = document.getElementById(`orc-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      // Remove the highlight parameter after 3 seconds to stop flashing
      const timer = setTimeout(() => {
        searchParams.delete("highlight");
        setSearchParams(searchParams, { replace: true });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, isLoading, searchParams, setSearchParams]);

  // Confirmacao da recusa
  const handleRecusaConfirm = (motivo: MotivoRecusaValue) => {
    if (!recusaPendente) return;
    updateMutation.mutate({
      id: recusaPendente.id,
      data: { status: recusaPendente.novoStatus, motivoRecusa: motivo },
    });
    setRecusaPendente(null);
  };

  const handleRecusaCancel = () => setRecusaPendente(null);

  // Confirmacao da reversão de contrato
  const handleReversaoConfirm = () => {
    if (!reversaoPendente) return;
    // Repassa acao para handleStatusChange pulando a checagem que acabou de ser aceita
    handleStatusChange(reversaoPendente.id, reversaoPendente.novoStatus, undefined, true);
    setReversaoPendente(null);
  };

  const selectedOrcamento = orcamentos.find(o => o.id === selectedOrcamentoId) || null;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filtered.map(o => o.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const toggleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected = filtered.length > 0 && selectedItems.size === filtered.length;

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os orçamentos recebidos</p>
        </div>
        <button
          onClick={() => setIsNovoOrcamentoOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-[42px] w-[84px] rounded-lg" />
            <Skeleton className="h-[42px] flex-1 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-[42px] w-[140px] rounded-lg" />
              <Skeleton className="h-[42px] w-[110px] rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar orçamentos: {error instanceof Error ? error.message : "Erro desconhecido"}
        </div>
      ) : (
        <>
          {/* View Toggles & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
              <button
                onClick={() => setViewMode("table")}
                title="Visualização em Tabela"
                className={`flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Visualização Kanban"
                className={`flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${viewMode === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por cliente, descrição ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                <SelectTrigger className="w-[200px] h-10 bg-card">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="mes_passado">Mês Passado</SelectItem>
                  <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
                  <SelectItem value="todos">Todo Histórico</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as Status | "todos")}>
                <SelectTrigger className="w-[180px] h-10 bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Em Negociação</SelectItem>
                  <SelectItem value="contratado">Contratado</SelectItem>
                  <SelectItem value="recusado">Recusado / Não fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === "kanban" ? (
            <div id="tour-kanban-board">
              <KanbanBoard
                orcamentos={filtered}
                onOrcamentoClick={(id) => setSelectedOrcamentoId(id)}
                onStatusChange={handleStatusChange}
                highlightedId={highlightId}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/10">
                      <th className="py-4 px-6 w-[40px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(c) => toggleSelectAll(!!c)}
                        />
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((orc) => (
                      <ContextMenu key={orc.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            id={`orc-${orc.id}`}
                            className={`border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group ${selectedItems.has(orc.id) ? "bg-primary/5" : ""
                              } ${highlightId === orc.id ? "bg-primary/20 animate-pulse ring-2 ring-inset ring-primary/50" : ""}`}
                          >
                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedItems.has(orc.id)}
                                onCheckedChange={(c) => toggleSelectItem(orc.id, !!c)}
                              />
                            </td>
                            <td
                              className="py-4 px-4 font-mono text-xs text-muted-foreground group-hover:text-primary transition-colors"
                              onClick={() => setSelectedOrcamentoId(orc.id)}
                            >
                              {orc.id}
                            </td>
                            <td
                              className="py-4 px-6 font-medium text-card-foreground"
                              onClick={() => setSelectedOrcamentoId(orc.id)}
                            >
                              {orc.cliente?.nome || "Cliente não informado"}
                            </td>
                            <td className="py-4 px-6 text-muted-foreground" onClick={() => setSelectedOrcamentoId(orc.id)}>{orc.cliente?.telefone || "-"}</td>
                            <td className="py-4 px-6 text-muted-foreground truncate max-w-[200px]" onClick={() => setSelectedOrcamentoId(orc.id)}>{orc.descricao}</td>
                            <td className="py-4 px-6 font-medium text-card-foreground" onClick={() => setSelectedOrcamentoId(orc.id)}>
                              {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="py-4 px-6" onClick={() => setSelectedOrcamentoId(orc.id)}>
                              <StatusBadge status={orc.status} />
                            </td>
                            <td
                              className="py-4 px-6 text-muted-foreground text-xs"
                              onClick={() => setSelectedOrcamentoId(orc.id)}
                            >
                              {new Date(orc.dataRecebido).toLocaleDateString("pt-BR")}
                            </td>
                          </tr>
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
                              {/* handleStatusChange intercepta 'recusado' e abre o dialog de motivo */}
                              {["pendente", "enviado", "contratado", "recusado"].map((st) => (
                                <ContextMenuItem
                                  key={st}
                                  disabled={orc.status === st}
                                  className="capitalize"
                                  onSelect={() => handleStatusChange(orc.id, st as Status)}
                                >
                                  {st === "enviado" ? "Em Negociação" : st === "recusado" ? "Recusado" : st === "contratado" ? "Contratado" : "Pendente"}
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
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <EmptyState
                  icon={Inbox}
                  title="Nenhum Orçamento Encontrado"
                  description={
                    searchTerm ? "Tente buscar usando termos ou IDs diferentes." : "Esse é o lugar onde você acompanhará todos os orçamentos solicitados."
                  }
                  action={
                    <button
                      onClick={() => {
                        if (searchTerm || filterStatus !== "todos") {
                          setSearchTerm("");
                          setFilterStatus("todos");
                        } else {
                          setIsNovoOrcamentoOpen(true);
                        }
                      }}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {searchTerm || filterStatus !== "todos" ? "Limpar Filtros" : "Criar Orçamento"}
                    </button>
                  }
                />
              )}
            </div>
          )}

          {/* Slide-over Drawer para Detalhes */}
          <DetalhesDrawer
            orcamento={selectedOrcamento}
            isOpen={selectedOrcamentoId !== null}
            onClose={() => setSelectedOrcamentoId(null)}
          />

          <NovoOrcamentoDialog
            open={isNovoOrcamentoOpen}
            onOpenChange={setIsNovoOrcamentoOpen}
          />

          {/* Dialog de motivo de recusa para mudancas feitas pela tabela e pelo menu de contexto */}
          <MotivoRecusaDialog
            open={recusaPendente !== null}
            onConfirm={handleRecusaConfirm}
            onCancel={handleRecusaCancel}
          />

          {/* Dialog de confirmacao de reversao de status Contratado na tabela */}
          <ConfirmacaoReversaoDialog
            open={reversaoPendente !== null}
            onConfirm={handleReversaoConfirm}
            onCancel={() => setReversaoPendente(null)}
          />
        </>
      )}
    </div>
  );
};

export default Orcamentos;
