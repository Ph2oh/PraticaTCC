import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const Mensagens = () => {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe conversas e interações com clientes.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-2">
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma mensagem por enquanto"
          description="As conversas vinculadas aos clientes e orçamentos aparecerão aqui." 
        />
      </div>
    </section>
  );
};

export default Mensagens;
