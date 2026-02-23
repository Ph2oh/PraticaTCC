import { MessageSquare, Shield, Bell, User, Save } from "lucide-react";

const Configuracoes = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações da aplicação</p>
      </div>

      {/* WhatsApp Integration */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <MessageSquare className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Integração WhatsApp</h3>
            <p className="text-xs text-muted-foreground">Configure a integração com WhatsApp Cloud API ou Twilio</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-card-foreground">Provedor</label>
            <select className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option>WhatsApp Cloud API</option>
              <option>Twilio</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">Token de Acesso</label>
            <input type="password" placeholder="••••••••••••••••" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">Webhook URL</label>
            <input type="text" placeholder="https://seudominio.com/api/webhook" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium text-card-foreground">Status da Conexão</p>
              <p className="text-xs text-muted-foreground">Última verificação: há 5 minutos</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" /> Não configurado
            </span>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Perfil do Administrador</h3>
            <p className="text-xs text-muted-foreground">Informações da conta</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-card-foreground">Nome</label>
            <input type="text" defaultValue="Administrador" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">E-mail</label>
            <input type="email" defaultValue="admin@sgo.com.br" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Notificações</h3>
            <p className="text-xs text-muted-foreground">Configure alertas e notificações</p>
          </div>
        </div>
        <div className="space-y-3">
          {["Novo orçamento recebido", "Orçamento contratado", "Relatório semanal"].map((item) => (
            <label key={item} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span className="text-sm text-card-foreground">{item}</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Segurança e LGPD</h3>
            <p className="text-xs text-muted-foreground">Configurações de privacidade e segurança</p>
          </div>
        </div>
        <div className="space-y-3">
          {["Criptografia de dados sensíveis", "Registro de log de ações", "Controle de acesso por perfil"].map((item) => (
            <label key={item} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <span className="text-sm text-card-foreground">{item}</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </div>
            </label>
          ))}
        </div>
      </div>

      <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        <Save className="w-4 h-4" /> Salvar Configurações
      </button>
    </div>
  );
};

export default Configuracoes;
