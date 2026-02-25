import { useState, useEffect } from "react";
import { MessageSquare, User, Save, Sun, Moon, Palette, Type, Shield, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useConfig, useUpdateConfig } from "@/hooks/useConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const COLORS = [
  { name: "Blue (Default)", value: "224.3 76.3% 48%", class: "bg-blue-600" },
  { name: "Rose", value: "346.8 77.2% 49.8%", class: "bg-rose-500" },
  { name: "Orange", value: "24.6 95% 53.1%", class: "bg-orange-500" },
  { name: "Green", value: "142.1 76.2% 36.3%", class: "bg-green-600" },
  { name: "Violet", value: "262.1 83.3% 57.8%", class: "bg-violet-500" },
];

const Configuracoes = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Queries
  const { status, loading: waLoading, disconnect } = useWhatsApp();
  const { data: config, isLoading: isConfigLoading } = useConfig();
  const updateConfig = useUpdateConfig();

  // Local State for Forms
  const [activeTab, setActiveTab] = useState("geral");
  const [isSaving, setIsSaving] = useState(false);

  // Visual
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  // Templates
  const [templateProposta, setTemplateProposta] = useState("");
  const [templateLembrete, setTemplateLembrete] = useState("");
  const [templateAgradecimento, setTemplateAgradecimento] = useState("");

  // Populate local state when config is loaded
  useEffect(() => {
    if (config) {
      setSelectedColor(config.corPrimaria);
      setTemplateProposta(config.templateProposta || "");
      setTemplateLembrete(config.templateLembrete || "");
      setTemplateAgradecimento(config.templateAgradecimento || "");

      // Apply Root color dynamically to preview
      document.documentElement.style.setProperty('--primary', config.corPrimaria);
    }
  }, [config]);

  const handleColorChange = (colorValue: string) => {
    setSelectedColor(colorValue);
    document.documentElement.style.setProperty('--primary', colorValue);
  };

  const hasChanges = config ? (
    selectedColor !== config.corPrimaria ||
    templateProposta !== (config.templateProposta || "") ||
    templateLembrete !== (config.templateLembrete || "") ||
    templateAgradecimento !== (config.templateAgradecimento || "")
  ) : false;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        corPrimaria: selectedColor,
        tema: theme,
        templateProposta,
        templateLembrete,
        templateAgradecimento
      });
      toast({ title: "Configurações salvas", description: "O sistema foi atualizado com sucesso." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: "Não foi possível aplicar as alterações.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie preferências, aparência e integrações do painel Administrativo.</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving || updateConfig.isPending} className="min-w-[140px] animate-in fade-in slide-in-from-bottom-4">
            {(isSaving || updateConfig.isPending) ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
            )}
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">

        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full hidden md:block">
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0 justify-start items-stretch">
              <TabsTrigger value="geral" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <User className="w-4 h-4 mr-3" /> Geral
              </TabsTrigger>
              <TabsTrigger value="aparencia" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <Palette className="w-4 h-4 mr-3" /> Temas
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <MessageSquare className="w-4 h-4 mr-3" /> Integrações
              </TabsTrigger>
              <TabsTrigger value="templates" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <Type className="w-4 h-4 mr-3" /> Mensagens
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Mobile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:hidden mb-4">
            <TabsList className="grid grid-cols-2 h-auto w-full">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
          </Tabs>
        </aside>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">

          {/* Aba: Geral */}
          {activeTab === "geral" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Perfil do Administrador</h3>
                <p className="text-sm text-muted-foreground">Informações sobre o titular da conta que fica registrado no sistema.</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>Nome de Exibição</Label>
                  <Input placeholder="Nome do administrador" defaultValue="Admin Geral" disabled />
                  <p className="text-[11px] text-muted-foreground"></p>
                </div>
                <div className="space-y-2">
                  <Label>Email de Contato</Label>
                  <Input placeholder="admin@exemplo.com" defaultValue="admin@praticatcc.com.br" disabled />
                </div>
              </div>
            </div>
          )}

          {/* Aba: Aparência */}
          {activeTab === "aparencia" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Identidade Visual</h3>
                <p className="text-sm text-muted-foreground">Personalize a cara do painel de acordo com a sua preferência e marca.</p>
              </div>
              <Separator />

              <div className="space-y-3">
                <Label className="text-base">Tema Principal</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                  <Button
                    type="button"
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => {
                      setTheme("light");
                      handleSave();
                    }}
                    className="justify-start h-12"
                  >
                    <Sun className="w-5 h-5 mr-3" /> Claro
                  </Button>
                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => {
                      setTheme("dark");
                      handleSave();
                    }}
                    className="justify-start h-12"
                  >
                    <Moon className="w-5 h-5 mr-3" /> Escuro
                  </Button>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t border-border/40 max-w-2xl">
                <Label className="text-base">Cor Primária da Interface</Label>
                <p className="text-sm text-muted-foreground">Escolha a cor que representa os botões, detalhes e links do sistema.</p>

                <div className="flex flex-wrap gap-4 mt-4">
                  {COLORS.map((color) => (
                    <div
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`
                        w-12 h-12 rounded-full cursor-pointer flex items-center justify-center
                        ring-offset-background transition-all hover:scale-110
                        ${color.class} 
                        ${selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''}
                      `}
                      title={color.name}
                    >
                    </div>
                  ))}
                </div>

                {/* Elementos Exemplo */}
                <div className="mt-8 p-6 border rounded-xl bg-card shadow-sm space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização</h4>
                  <div className="flex items-center gap-4">
                    <Button>Botão Principal</Button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">A</div>
                    <span className="text-primary font-medium hover:underline cursor-pointer">Texto de Link</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: WhatsApp */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp
                </h3>
                <p className="text-sm text-muted-foreground">Acompanhe e configure a conexão com o WhatsApp.</p>
              </div>
              <Separator />

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm max-w-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${status.ready ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                      <MessageSquare className={`w-6 h-6 ${status.ready ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">Sessão Ativa</h3>
                      <p className="text-sm text-muted-foreground">
                        {waLoading ? "Consultando servidor de mensagens..." : status.ready ? "Conectado" : "Desconectado. Aguardando leitura do QR Code."}
                      </p>
                    </div>
                  </div>
                  {status.ready && (
                    <Button variant="destructive" size="sm" onClick={disconnect} disabled={waLoading}>
                      Desconectar Dispositivo
                    </Button>
                  )}
                </div>

                {!waLoading && !status.ready && status.qrCode && (
                  <div className="mt-8 flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl bg-muted/10">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <img src={status.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                    </div>
                    <p className="text-sm text-center text-muted-foreground mt-6 max-w-sm font-medium">
                      Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para este QR Code.
                    </p>
                  </div>
                )}

                {!waLoading && !status.ready && !status.qrCode && (
                  <div className="mt-8 flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-muted/10">
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Gerando QR Code Criptografado...</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">O primeiro ciclo de conexão do pacote WWeb.js pode demorar até 45 segundos.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba: Templates */}
          {activeTab === "templates" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Templates de Mensagem Pronta</h3>
                <p className="text-sm text-muted-foreground">Estas mensagens ficam disponíveis nas mensagens prontas de clientes e orçamentos como atalhos para abrir no seu WhatsApp Web.</p>
              </div>
              <Separator />

              <div className="space-y-6 max-w-3xl">
                <div className="grid gap-2">
                  <Label className="text-base font-semibold">1. Template de Envio de Proposta</Label>
                  <p className="text-sm text-muted-foreground">Usado logo após finalizar e precificar um orçamento pendente.</p>
                  <Textarea
                    value={templateProposta}
                    onChange={(e) => setTemplateProposta(e.target.value)}
                    className="min-h-[120px] font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis Suportadas: <code className="bg-muted px-1 py-0.5 rounded">{"{{cliente}}"}</code> <code className="bg-muted px-1 py-0.5 rounded">{"{{valor}}"}</code> <code className="bg-muted px-1 py-0.5 rounded">{"{{descricao}}"}</code>
                  </p>
                </div>

                <div className="grid gap-2 pt-4 border-t border-border/40">
                  <Label className="text-base font-semibold">2. Lembrete / Follow-up</Label>
                  <p className="text-sm text-muted-foreground">Enviado para clientes que ficaram parados na coluna 'Enviado'</p>
                  <Textarea
                    value={templateLembrete}
                    onChange={(e) => setTemplateLembrete(e.target.value)}
                    className="min-h-[100px] font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis Suportadas: <code className="bg-muted px-1 py-0.5 rounded">{"{{cliente}}"}</code>
                  </p>
                </div>

                <div className="grid gap-2 pt-4 border-t border-border/40">
                  <Label className="text-base font-semibold">3. Agradecimento por Contratação</Label>
                  <p className="text-sm text-muted-foreground">O texto padrão ideal quando você move o card para Ganho/Contratado.</p>
                  <Textarea
                    value={templateAgradecimento}
                    onChange={(e) => setTemplateAgradecimento(e.target.value)}
                    className="min-h-[100px] font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis Suportadas: <code className="bg-muted px-1 py-0.5 rounded">{"{{cliente}}"}</code>
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
