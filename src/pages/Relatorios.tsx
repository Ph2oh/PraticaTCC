import { useMemo } from "react";
import { Download, Calendar, Loader } from "lucide-react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { type Status } from "@/components/StatusBadge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
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

const Relatorios = () => {
  const { data: orcamentos = [], isLoading } = useOrcamentos();

  const contratosFechados = useMemo(
    () => orcamentos.filter((orc) => orc.status === "contratado"),
    [orcamentos]
  );

  const monthlySeries = useMemo(() => {
    const inicioJanela = startOfMonth(subMonths(new Date(), 5));

    return Array.from({ length: 6 }, (_, index) => {
      const mesAtual = addMonths(inicioJanela, index);
      const chaveMes = `${mesAtual.getFullYear()}-${mesAtual.getMonth()}`;

      const recebidos = orcamentos.filter((orc) => {
        const dataRecebido = new Date(orc.dataRecebido);
        return `${dataRecebido.getFullYear()}-${dataRecebido.getMonth()}` === chaveMes;
      }).length;

      const contratados = orcamentos.filter((orc) => {
        const dataRecebido = new Date(orc.dataRecebido);
        return (
          `${dataRecebido.getFullYear()}-${dataRecebido.getMonth()}` === chaveMes &&
          orc.status === "contratado"
        );
      }).length;

      return {
        mes: format(mesAtual, "MMM/yy", { locale: ptBR }).replace(".", ""),
        recebidos,
        contratados,
      };
    });
  }, [orcamentos]);

  const statusDistributionData = useMemo(
    () =>
      (Object.keys(STATUS_META) as Status[]).map((status) => ({
        name: STATUS_META[status].label,
        value: orcamentos.filter((orc) => orc.status === status).length,
        fill: STATUS_META[status].fill,
      })),
    [orcamentos]
  );

  const totalPeriodo = orcamentos.length;
  const taxaConversao = totalPeriodo ? (contratosFechados.length / totalPeriodo) * 100 : 0;
  const ticketMedio = totalPeriodo
    ? currencyFormatter.format(orcamentos.reduce((total, orc) => total + orc.valor, 0) / totalPeriodo)
    : currencyFormatter.format(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader className="w-8 h-8 animate-spin" />
          <p>Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de desempenho e métricas</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-card text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Calendar className="w-4 h-4" /> Últimos 6 meses
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">Total do Período</p>
          <p className="text-3xl font-bold text-card-foreground mt-1">{totalPeriodo}</p>
          <p className="text-xs text-success mt-1">orçamentos recebidos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">Taxa de Conversão Média</p>
          <p className="text-3xl font-bold text-card-foreground mt-1">{taxaConversao.toFixed(1)}%</p>
          <p className="text-xs text-success mt-1">{contratosFechados.length} contratos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">Ticket Médio</p>
          <p className="text-3xl font-bold text-card-foreground mt-1">{ticketMedio}</p>
          <p className="text-xs text-success mt-1">baseado em todos os orçamentos</p>
        </div>
      </div>

      {/* Area Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlySeries}>
            <defs>
              <linearGradient id="colorRecebidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorContratados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            <Area type="monotone" dataKey="recebidos" stroke="hsl(var(--primary))" fill="url(#colorRecebidos)" name="Recebidos" strokeWidth={2} />
            <Area type="monotone" dataKey="contratados" stroke="hsl(var(--success))" fill="url(#colorContratados)" name="Contratados" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Comparativo Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
              <Bar dataKey="recebidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Recebidos" />
              <Bar dataKey="contratados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Contratados" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusDistributionData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} dataKey="value">
                {statusDistributionData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
