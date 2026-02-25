import { useState } from "react";
import { Search, Plus, Phone, Mail, FileText, Loader } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";

const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clientes = [], isLoading, error } = useClientes();
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone && c.telefone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Base de clientes cadastrados</p>
        </div>
        <button 
          onClick={() => setIsNovoClienteOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <NovoClienteDialog open={isNovoClienteOpen} onOpenChange={setIsNovoClienteOpen} />

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

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader className="w-8 h-8 animate-spin" />
            <p>Carregando clientes...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar clientes: {error instanceof Error ? error.message : "Erro desconhecido"}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((cliente) => (
              <div key={cliente.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{cliente.nome}</h3>
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
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum cliente encontrado.</div>
          )}
        </>
      )}
    </div>
  );
};

export default Clientes;
