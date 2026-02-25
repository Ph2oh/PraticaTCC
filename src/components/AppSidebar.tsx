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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { to: "/mensagens", icon: MessageSquare, label: "Mensagens" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">SGO</h1>
            <p className="text-xs text-sidebar-muted truncate">Gerenciamento de Orçamentos</p>
          </div>
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
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm font-semibold"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
