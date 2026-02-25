import { useState } from "react";
import { Search, Download, Plus, LayoutGrid, List, Inbox, Loader, Copy, Send, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import KanbanBoard from "@/components/KanbanBoard";
import { DetalhesDrawer } from "@/components/DetalhesDrawer";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrcamentos, useUpdateOrcamento, useDeleteOrcamento } from "@/hooks/useOrcamentos";
import { NovoOrcamentoDialog } from "@/components/NovoOrcamentoDialog";
import type { Status } from "@/components/StatusBadge";

const Orcamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "todos">("todos");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isNovoOrcamentoOpen, setIsNovoOrcamentoOpen] = useState(false);

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
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orcamentoId: string, newStatus: Status) => {
    updateMutation.mutate({
      id: orcamentoId,
      data: { status: newStatus },
    });
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
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as Status | "todos")}
                className="px-4 py-2.5 rounded-lg border border-input bg-card text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="enviado">Enviado</option>
                <option value="contratado">Contratado</option>
                <option value="recusado">Recusado</option>
              </select>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-card text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === "kanban" ? (
            <KanbanBoard
              orcamentos={filtered}
              onOrcamentoClick={(id) => setSelectedOrcamentoId(id)}
              onStatusChange={handleStatusChange}
            />
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
                            className={`border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group ${selectedItems.has(orc.id) ? "bg-primary/5" : ""
                              }`}
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
                              {["pendente", "enviado", "contratado", "recusado"].map((st) => (
                                <ContextMenuItem
                                  key={st}
                                  disabled={orc.status === st}
                                  className="capitalize"
                                  onSelect={() => handleStatusChange(orc.id, st as Status)}
                                >
                                  {st}
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
        </>
      )}
    </div>
  );
};

export default Orcamentos;
