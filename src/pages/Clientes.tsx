import { useState } from "react";
import { Search, Plus, Phone, Mail, FileText, Loader, UserX } from "lucide-react";
import { useClientes, useDeleteCliente } from "@/hooks/useClientes";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ClienteDetalhesDrawer } from "@/components/ClienteDetalhesDrawer";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { Copy, Edit2, MessageCircle, Trash2 } from "lucide-react";
import type { Cliente } from "@/types";

const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clientes = [], isLoading, error } = useClientes();
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();
  const deleteMutation = useDeleteCliente();

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-500">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
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
              <ContextMenu key={cliente.id}>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() => setSelectedCliente(cliente)}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/30 group"
                  >
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
                        <Phone className="w-3.5 h-3.5" /> {cliente.telefone || "Não informado"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {cliente.email || "Não informado"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" /> {cliente.totalOrcamentos} orçamento(s)
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                      Último contato: {new Date(cliente.ultimoContato).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  {cliente.telefone && (
                    <ContextMenuItem
                      onSelect={() => {
                        const number = cliente.telefone.replace(/\D/g, "");
                        window.open(`https://wa.me/55${number}`, "_blank");
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> Chamar no WhatsApp
                    </ContextMenuItem>
                  )}
                  {cliente.email && (
                    <ContextMenuItem
                      onSelect={() => {
                        navigator.clipboard.writeText(cliente.email);
                        toast({ title: "Email copiado!" });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copiar E-mail
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem onSelect={() => setSelectedCliente(cliente)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Ver Detalhes / Editar
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => {
                      if (confirm(`Tem certeza que deseja excluir ${cliente.nome}?`)) {
                        deleteMutation.mutate(cliente.id, {
                          onSuccess: () => {
                            toast({ title: "Cliente excluído com sucesso." });
                            if (selectedCliente?.id === cliente.id) {
                              setSelectedCliente(null);
                            }
                          }
                        });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir Cliente
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12">
              <EmptyState
                icon={UserX}
                title="Nenhum Cliente Encontrado"
                description={searchTerm ? "Tente buscar por um nome ou telefone diferente." : "Sua base de clientes está vazia. Adicione o seu primeiro cliente!"}
                action={
                  <button
                    onClick={() => {
                      if (searchTerm) {
                        setSearchTerm("");
                      } else {
                        setIsNovoClienteOpen(true);
                      }
                    }}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    {searchTerm ? "Limpar Busca" : "Adicionar Cliente"}
                  </button>
                }
              />
            </div>
          )}
        </>
      )}

      {/* Slide Out Panel */}
      <ClienteDetalhesDrawer
        cliente={selectedCliente}
        isOpen={!!selectedCliente}
        onClose={() => setSelectedCliente(null)}
      />
    </div>
  );
};

export default Clientes;
