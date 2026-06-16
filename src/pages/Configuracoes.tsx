import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, User, Sun, Moon, Palette, Type, Shield, MessageCircle, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Button, ConfirmButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { WhatsAppWizardSetup } from "@/components/WhatsAppWizardSetup";
import { useConfig, useUpdateConfig } from "@/hooks/useConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

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
  const { usuario } = useAuth();

  // Queries
  const { status, loading: waLoading, disconnect } = useWhatsApp();
  const { data: config, isLoading: isConfigLoading } = useConfig();
  const updateConfig = useUpdateConfig();

  // Local State for Forms
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "geral");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  // Visual
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  // Templates
  const [templateProposta, setTemplateProposta] = useState("");
  const [templateLembrete, setTemplateLembrete] = useState("");
  const [templateAgradecimento, setTemplateAgradecimento] = useState("");

  // Passwords
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Metas
  const [metaReceita, setMetaReceita] = useState<number>(20000);
  const [metaConversao, setMetaConversao] = useState<number>(45);
  const [metaContratosSemana, setMetaContratosSemana] = useState<number>(3);

  // Populate local state when config is loaded
  useEffect(() => {
    if (config) {
      setSelectedColor(config.corPrimaria);
      setTemplateProposta(config.templateProposta || "");
      setTemplateLembrete(config.templateLembrete || "");
      setTemplateAgradecimento(config.templateAgradecimento || "");
      setMetaReceita(config.metaReceita ?? 20000);
      setMetaConversao(config.metaConversao ?? 45);
      setMetaContratosSemana(config.metaContratosSemana ?? 3);

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
    templateAgradecimento !== (config.templateAgradecimento || "") ||
    metaReceita !== (config.metaReceita ?? 20000) ||
    metaConversao !== (config.metaConversao ?? 45) ||
    metaContratosSemana !== (config.metaContratosSemana ?? 3)
  ) : false;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        corPrimaria: selectedColor,
        tema: theme,
        templateProposta,
        templateLembrete,
        templateAgradecimento,
        metaReceita,
        metaConversao,
        metaContratosSemana,
      });
      toast({ title: "Configurações salvas", description: "O sistema foi atualizado com sucesso." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: "Não foi possível aplicar as alterações.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast({ title: "Senha muito curta", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('@sgotoken');
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao alterar senha.');
      }

      toast({ title: "Sucesso", description: "Sua senha foi alterada com sucesso." });
      setSenhaAtual("");
      setNovaSenha("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
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
          <p className="text-sm text-muted-foreground mt-1">Gerencie preferências, aparência e integrações do painel administrativo.</p>
        </div>
        {hasChanges && (
          <ConfirmButton 
            onClick={handleSave} 
            loading={isSaving || updateConfig.isPending} 
            className="min-w-[140px] animate-in fade-in slide-in-from-bottom-4" 
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">

        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical" className="w-full hidden md:block">
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0 justify-start items-stretch">
              <TabsTrigger value="geral" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <User className="w-4 h-4 mr-3" /> Geral
              </TabsTrigger>
              <TabsTrigger value="aparencia" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <Palette className="w-4 h-4 mr-3" /> Temas
              </TabsTrigger>
              <TabsTrigger value="metas" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <TrendingUp className="w-4 h-4 mr-3" /> Metas
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <MessageSquare className="w-4 h-4 mr-3" /> Integrações
              </TabsTrigger>
              <TabsTrigger value="templates" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <Type className="w-4 h-4 mr-3" /> Mensagens
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="justify-start px-4 py-2.5 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                <Shield className="w-4 h-4 mr-3" /> Segurança
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Mobile Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:hidden mb-4">
            <TabsList className="grid grid-cols-2 h-auto w-full">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="metas">Metas</TabsTrigger>
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
                <h3 className="text-lg font-medium">Perfil do proprietário</h3>
                <p className="text-sm text-muted-foreground">Informações sobre a conta responsável por este Workspace protegido.</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>Nome registrado</Label>
                  <Input placeholder="Nome" value={usuario?.nome || "Carregando..."} disabled className="bg-muted/50" />
                  <p className="text-[11px] text-muted-foreground">O nome da conta não pode ser modificado nesta versão.</p>
                </div>
                <div className="space-y-2">
                  <Label>Email de autenticação</Label>
                  <Input placeholder="email@exemplo.com" value={usuario?.email || "Carregando..."} disabled className="bg-muted/50" />
                </div>
              </div>

            </div>
          )}

          {/* Aba: Metas */}
          {activeTab === "metas" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Metas e Indicadores Base</h3>
                <p className="text-sm text-muted-foreground">Estes valores irão alimentar e balizar os medidores de desempenho do Dashboard.</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <Label>Meta de receita mensal (R$)</Label>
                  <Input
                    type="number"
                    placeholder="20000"
                    value={metaReceita}
                    onChange={(e) => setMetaReceita(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Valor em reais (ex: 20000 para R$ 20.000).</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta de conversão (%)</Label>
                  <Input
                    type="number"
                    placeholder="45"
                    value={metaConversao}
                    onChange={(e) => setMetaConversao(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Porcentagem (ex: 45 para 45%).</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta de contratos por semana</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    min={1}
                    value={metaContratosSemana}
                    onChange={(e) => setMetaContratosSemana(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Número inteiro (ex: 3 contratos/semana). Usada como linha de referência no gráfico semanal do Dashboard.</p>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Segurança */}
          {activeTab === "seguranca" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Segurança da Conta</h3>
                <p className="text-sm text-muted-foreground">Gerencie suas credenciais de acesso e informações sensíveis.</p>
              </div>
              <Separator />

              <div className="pt-2">
                <Card className="max-w-2xl shadow-sm border-destructive/20">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Alterar Senha
                    </CardTitle>
                    <CardDescription>
                      Atualize sua senha de acesso periodicamente para manter seu workspace protegido.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form id="password-form" onSubmit={handlePasswordChange} className="space-y-5">
                      <div className="grid gap-2">
                        <Label htmlFor="senhaAtual">Senha atual</Label>
                        <Input
                          id="senhaAtual"
                          type="password"
                          value={senhaAtual}
                          onChange={(e) => setSenhaAtual(e.target.value)}
                          placeholder="Digite sua senha atual"
                          className="max-w-md"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="novaSenha">Nova senha</Label>
                        <Input
                          id="novaSenha"
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Digite a nova senha"
                          className="max-w-md"
                          required
                        />
                        <p className="text-[12px] text-muted-foreground mt-1">
                          A senha deve conter no mínimo 6 caracteres.
                        </p>
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20 px-6 py-4">
                    <Button
                      type="submit"
                      form="password-form"
                      disabled={isChangingPassword || !senhaAtual || novaSenha.length < 6}
                      className="min-w-[140px]"
                    >
                      {isChangingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Atualizando...</> : "Atualizar Senha"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}

          {/* Aba: Aparência */}
          {activeTab === "aparencia" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Identidade visual</h3>
                <p className="text-sm text-muted-foreground">Personalize a cara do painel de acordo com a sua preferência e marca.</p>
              </div>
              <Separator />

              <div className="space-y-3">
                <Label className="text-base">Tema principal</Label>
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
                <Label className="text-base">Cor primária da interface</Label>
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
              <WhatsAppWizardSetup />
            </div>
          )}

          {/* Aba: Templates */}
          {activeTab === "templates" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-medium">Templates de mensagem pronta</h3>
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
