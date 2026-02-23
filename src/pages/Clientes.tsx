import { useState } from "react";
import { Search, Plus, Phone, Mail, FileText, Users } from "lucide-react";
import { clientes } from "@/data/mockData";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";

const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Base de clientes cadastrados</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cliente) => (
          <div
            key={cliente.id}
            className={`relative rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedItems.has(cliente.id) ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
          >
            <div className="absolute top-4 right-4">
              <Checkbox
                checked={selectedItems.has(cliente.id)}
                onCheckedChange={(c) => toggleSelectItem(cliente.id, !!c)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-card-foreground pr-8">{cliente.nome}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{cliente.id}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {cliente.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> {cliente.telefone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" /> {cliente.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-3.5 h-3.5" /> {cliente.totalOrcamentos} orçamento(s)
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              Último contato: {new Date(cliente.ultimoContato).toLocaleDateString("pt-BR")}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nenhum Cliente Encontrado"
          description={searchTerm ? "Não encontramos nenhum cliente correspondente à sua busca atual." : "Adicione seus primeiros clientes no sistema para vê-los aqui."}
          action={
            searchTerm ? (
              <button onClick={() => setSearchTerm("")} className="text-primary text-sm font-medium hover:underline">
                Limpar Busca
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Novo Cliente
              </button>
            )
          }
        />
      )}
    </div>
  );
};

export default Clientes;
