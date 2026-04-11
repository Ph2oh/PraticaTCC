import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { useConfig } from "@/hooks/useConfig";
import { useEffect, useState } from "react";
import { OnboardingTour } from "./OnboardingTour";
import { Bell, Plus, Moon, Sun, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "./theme-provider";
import { NovoOrcamentoDialog } from "./NovoOrcamentoDialog";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const { data: config } = useConfig();
  const { theme, setTheme } = useTheme();
  const { logout, usuario } = useAuth();
  const navigate = useNavigate();
  const [novoOrcamentoOpen, setNovoOrcamentoOpen] = useState(false);

  useEffect(() => {
    if (config?.corPrimaria) {
      document.documentElement.style.setProperty('--primary', config.corPrimaria);
      document.documentElement.style.setProperty('--ring', config.corPrimaria);
    }
  }, [config?.corPrimaria]);

  return (
    <div className="flex min-h-screen bg-background">
      <OnboardingTour />
      <AppSidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Header Global */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:px-8 shrink-0 justify-between shadow-sm">
          {/* Espaçador joga tudo para a direita */}
          <div className="flex-1" />

          {/* Painel lateral direito (Busca + Utilidades) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <GlobalSearch />

            <div className="hidden md:block h-6 w-px bg-border mx-1" />

            {/* 1. Botão Ação Rápida */}
            <Button size="sm" onClick={() => setNovoOrcamentoOpen(true)} className="hidden sm:flex gap-1.5 shadow-sm rounded-md">
              <Plus className="w-4 h-4" />
              <span>Criar orçamento</span>
            </Button>
            
            <Button size="icon" variant="default" onClick={() => setNovoOrcamentoOpen(true)} className="sm:hidden w-8 h-8 rounded-full shadow-sm">
              <Plus className="w-4 h-4" />
            </Button>

            {/* 2. Notificações */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground h-9 w-9 rounded-full">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-sm" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 shadow-xl rounded-xl border-border/60">
                <div className="p-3 border-b border-border/60 font-semibold text-sm">Notificações</div>
                <div className="p-6 text-sm text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p>Você não tem novas notificações no momento.</p>
                </div>
              </PopoverContent>
            </Popover>

            {/* 3. Alternador de Tema */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-full"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

            {/* 4. Avatar do Perfil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1 p-0">
                  <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all hover:ring-primary/50 cursor-pointer shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {usuario?.nome?.substring(0, 2).toUpperCase() || "PH"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl border-border/60 shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1 ">
                    <p className="text-sm font-semibold leading-none">{usuario?.nome || "Minha conta"}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">{usuario?.email || "Nenhum email cadastrado"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer py-2">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem onClick={logout} className="cursor-pointer py-2 text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <NovoOrcamentoDialog open={novoOrcamentoOpen} onOpenChange={setNovoOrcamentoOpen} />

        <div id="tour-dashboard" className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
