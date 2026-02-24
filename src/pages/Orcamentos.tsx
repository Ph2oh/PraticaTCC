import { useState } from "react";
import { Search, Filter, Download, Plus, LayoutGrid, List, Inbox } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import KanbanBoard from "@/components/KanbanBoard";
import { DetalhesDrawer } from "@/components/DetalhesDrawer";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { orcamentos as initialOrcamentos } from "@/data/mockData";
import { NovoOrcamentoDialog } from "@/components/NovoOrcamentoDialog";
import type { Status } from "@/components/StatusBadge";

const Orcamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "todos">("todos");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [orcamentos, setOrcamentos] = useState(initialOrcamentos);
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isNovoOrcamentoOpen, setIsNovoOrcamentoOpen] = useState(false);

  const filtered = orcamentos.filter((orc) => {
    const matchesSearch =
      orc.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "todos" || orc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orcamentoId: string, newStatus: Status) => {
    setOrcamentos((prev) =>
      prev.map((orc) => (orc.id === orcamentoId ? { ...orc, status: newStatus, dataAtualizado: new Date().toISOString() } : orc))
    );
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
    <div className="space-y-6">
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

      {/* View Toggles & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <List className="w-4 h-4" /> Tabela
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
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
                  <tr
                    key={orc.id}
                    className={`border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group ${selectedItems.has(orc.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-4 px-6">
                      <Checkbox
                        checked={selectedItems.has(orc.id)}
                        onCheckedChange={(c) => toggleSelectItem(orc.id, !!c)}
                      />
                    </td>
                    <td
                      className="py-4 px-4 font-mono text-xs text-muted-foreground cursor-pointer group-hover:text-primary transition-colors"
                      onClick={() => setSelectedOrcamentoId(orc.id)}
                    >{orc.id}</td>
                    <td
                      className="py-4 px-6 font-medium text-card-foreground cursor-pointer"
                      onClick={() => setSelectedOrcamentoId(orc.id)}
                    >{orc.cliente}</td>
                    <td className="py-4 px-6 text-muted-foreground">{orc.telefone}</td>
                    <td className="py-4 px-6 text-muted-foreground truncate max-w-[200px]">{orc.descricao}</td>
                    <td className="py-4 px-6 font-medium text-card-foreground">
                      {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="py-4 px-6 cursor-pointer" onClick={() => setSelectedOrcamentoId(orc.id)}><StatusBadge status={orc.status} /></td>
                    <td className="py-4 px-6 text-muted-foreground text-xs cursor-pointer" onClick={() => setSelectedOrcamentoId(orc.id)}>{new Date(orc.dataRecebido).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="Nenhum Orçamento Encontrado"
              description={searchTerm ? "Tente buscar usando termos ou IDs diferentes." : "Esse é o lugar onde você acompanhará todos os orçamentos solicitados."}
              action={
                <button onClick={() => { setSearchTerm(""); setFilterStatus("todos") }} className="text-primary text-sm font-medium hover:underline">
                  Limpar Filtros
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
        onSave={(novoOrcamento) => {
          setOrcamentos([novoOrcamento, ...orcamentos]);
        }}
      />
    </div>
  );
};

export default Orcamentos;
