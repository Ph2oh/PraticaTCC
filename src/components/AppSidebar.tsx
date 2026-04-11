import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import LogoIcon from "@/assets/sgo_logo_crescimento_v2.svg";
import LogoText from "@/assets/sgo_logo_crescimento_com_texto.svg";

const navItems = [
  // Alteracao: rota do Dashboard atualizada de '/' para '/dashboard' (landing publica agora ocupa '/')
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside
      id="tour-sidebar"
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-6 border-b border-sidebar-border min-h-[90px] px-4">
        {collapsed ? (
          <img src={LogoIcon} alt="SGO Logo" className="w-10 h-10 shrink-0" />
        ) : (
          <img src={LogoText} alt="SGO Gerenciamento de Orçamentos" className="w-48 h-auto max-h-16 object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.to === '/orcamentos' ? 'tour-menu-orcamentos' : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary shadow-sm font-semibold"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout & Collapse buttons */}
      <div className="px-3 py-4 flex flex-col gap-2 border-t border-sidebar-border">

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>Recolher</span>}
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair do sistema</span>}
        </button>


      </div>
    </aside>
  );
};

export default AppSidebar;
