import { useMemo } from "react";
import { FileText, Users, TrendingUp, DollarSign, ArrowUpRight, Loader } from "lucide-react";
import { eachDayOfInterval, subDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import KpiCard from "@/components/KpiCard";
import StatusBadge, { type Status } from "@/components/StatusBadge";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useClientes } from "@/hooks/useClientes";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_META: Record<Status, { label: string; fill: string }> = {
  pendente: { label: "Pendente", fill: "hsl(var(--warning))" },
  enviado: { label: "Enviado", fill: "hsl(var(--primary))" },
  contratado: { label: "Contratado", fill: "hsl(var(--success))" },
  recusado: { label: "Recusado", fill: "hsl(var(--destructive))" },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const Dashboard = () => {
  const { data: orcamentos = [], isLoading: loadingOrcamentos } = useOrcamentos();
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const isLoading = loadingOrcamentos || loadingClientes;

  const contratosFechados = useMemo(
    () => orcamentos.filter((orc) => orc.status === "contratado"),
    [orcamentos]
  );

  const valorContratado = useMemo(
    () => contratosFechados.reduce((total, orc) => total + orc.valor, 0),
    [contratosFechados]
  );

  const taxaConversao = orcamentos.length
    ? (contratosFechados.length / orcamentos.length) * 100
    : 0;

  const weeklySeries = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map((day) => {
      const recebidos = orcamentos.filter((orc) =>
        isSameDay(new Date(orc.dataRecebido), day)
      ).length;
      const contratadosDia = contratosFechados.filter((orc) =>
        isSameDay(new Date(orc.dataAtualizado), day)
      ).length;
      return {
        dia: format(day, "EEE", { locale: ptBR }).replace(".", ""),
        recebidos,
        contratados: contratadosDia,
      };
    });
  }, [orcamentos, contratosFechados]);

  const statusDistributionData = useMemo(
    () =>
      (Object.keys(STATUS_META) as Status[]).map((status) => ({
        name: STATUS_META[status].label,
        value: orcamentos.filter((orc) => orc.status === status).length,
        fill: STATUS_META[status].fill,
      })),
    [orcamentos]
  );

  const recentOrcamentos = useMemo(
    () =>
      [...orcamentos]
        .sort((a, b) => new Date(b.dataRecebido).getTime() - new Date(a.dataRecebido).getTime())
        .slice(0, 5),
    [orcamentos]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader className="w-8 h-8 animate-spin" />
          <p>Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus orçamentos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          title="Total de Orçamentos"
          value={orcamentos.length.toString()}
          change={`${contratosFechados.length} contratados`}
          changeType="positive"
        />
        <KpiCard
          icon={TrendingUp}
          title="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          change={orcamentos.length ? `${orcamentos.length} recebidos` : "Sem dados"}
          changeType={taxaConversao >= 30 ? "positive" : "neutral"}
        />
        <KpiCard
          icon={Users}
          title="Clientes na Base"
          value={clientes.length.toString()}
          change="Dados do CRM"
          changeType="neutral"
        />
        <KpiCard
          icon={DollarSign}
          title="Valor Contratado"
          value={currencyFormatter.format(valorContratado)}
          change="Total de contratos ativos"
          changeType="positive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-card p-6 shadow-sm border border-transparent">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Orçamentos da Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklySeries} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="recebidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Recebidos" />
              <Bar dataKey="contratados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Contratados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-transparent">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Status dos Orçamentos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusDistributionData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                {statusDistributionData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Table */}
      <div className="rounded-2xl bg-card shadow-sm border border-transparent">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h3 className="text-sm font-semibold text-card-foreground">Orçamentos Recentes</h3>
          <a href="/orcamentos" className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors">
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrcamentos.map((orc) => (
                <tr key={orc.id} className="border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <td className="py-4 px-6 font-mono text-xs text-muted-foreground">{orc.id}</td>
                  <td className="py-4 px-6 font-medium text-card-foreground">{orc.cliente?.nome || "Cliente não informado"}</td>
                  <td className="py-4 px-6 text-muted-foreground truncate max-w-[200px]">{orc.descricao}</td>
                  <td className="py-4 px-6 font-medium text-card-foreground">
                    {orc.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-4 px-6"><StatusBadge status={orc.status as Status} /></td>
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
