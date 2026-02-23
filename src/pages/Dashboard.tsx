import { FileText, Users, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { orcamentos, chartDataSemanal, statusDistribution } from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const Dashboard = () => {
  const recentOrcamentos = orcamentos.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus orçamentos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText} title="Total de Orçamentos" value="156" change="+12% vs mês anterior" changeType="positive" />
        <KpiCard icon={TrendingUp} title="Taxa de Conversão" value="37.5%" change="+5.2% vs mês anterior" changeType="positive" />
        <KpiCard icon={Users} title="Novos Clientes" value="23" change="+8 esta semana" changeType="positive" />
        <KpiCard icon={DollarSign} title="Valor Contratado" value="R$ 62.500" change="+18% vs mês anterior" changeType="positive" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Orçamentos da Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartDataSemanal} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="recebidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Recebidos" />
              <Bar dataKey="contratados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Contratados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Status dos Orçamentos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {statusDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-card-foreground">Orçamentos Recentes</h3>
          <a href="/orcamentos" className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrcamentos.map((orc) => (
                <tr key={orc.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-5 font-mono text-xs text-muted-foreground">{orc.id}</td>
                  <td className="py-3 px-5 font-medium text-card-foreground">{orc.cliente}</td>
                  <td className="py-3 px-5 text-muted-foreground truncate max-w-[200px]">{orc.descricao}</td>
                  <td className="py-3 px-5 font-medium text-card-foreground">
                    {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-3 px-5"><StatusBadge status={orc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
