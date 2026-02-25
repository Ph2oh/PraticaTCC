import { MessageSquare, User, Save, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const Configuracoes = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState("WhatsApp Cloud API");
  const [token, setToken] = useState("");
  const [webhook, setWebhook] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // mock save
      await new Promise((r) => setTimeout(r, 600));
      toast({ title: "Configurações salvas", description: "As configurações foram atualizadas." });
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao salvar configurações." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações da aplicação</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <MessageSquare className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Integração WhatsApp</h3>
            <p className="text-xs text-muted-foreground">Configure o provedor e webhook</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-card-foreground">Provedor</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm">
              <option>WhatsApp Cloud API</option>
              <option>Twilio</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">Token de Acesso</label>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-card-foreground">Webhook URL</label>
            <input type="text" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://seu-dominio.com/webhook" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Aparência</h3>
            <p className="text-xs text-muted-foreground">Escolha o modo claro ou escuro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
            className="justify-start"
          >
            <Sun className="w-4 h-4" /> Modo claro
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
            className="justify-start"
          >
            <Moon className="w-4 h-4" /> Modo escuro
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Perfil do Administrador</h3>
            <p className="text-xs text-muted-foreground">Informações da conta</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Nome do administrador" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <input placeholder="admin@exemplo.com" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
};

export default Configuracoes;
