import { useState } from "react";
import { Search, Filter, Download, Plus } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { orcamentos } from "@/data/mockData";
import type { Status } from "@/components/StatusBadge";

const Orcamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "todos">("todos");

  const filtered = orcamentos.filter((orc) => {
    const matchesSearch =
      orc.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "todos" || orc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os orçamentos recebidos</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((orc) => (
                <tr key={orc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                  <td className="py-3 px-5 font-mono text-xs text-muted-foreground">{orc.id}</td>
                  <td className="py-3 px-5 font-medium text-card-foreground">{orc.cliente}</td>
                  <td className="py-3 px-5 text-muted-foreground">{orc.telefone}</td>
                  <td className="py-3 px-5 text-muted-foreground truncate max-w-[200px]">{orc.descricao}</td>
                  <td className="py-3 px-5 font-medium text-card-foreground">
                    {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-3 px-5"><StatusBadge status={orc.status} /></td>
                  <td className="py-3 px-5 text-muted-foreground text-xs">{new Date(orc.dataRecebido).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">Nenhum orçamento encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default Orcamentos;
