import { Download, Calendar } from "lucide-react";
import { chartDataMensal, statusDistribution } from "@/data/mockData";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const Relatorios = () => {
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
          <p className="text-3xl font-bold text-card-foreground mt-1">268</p>
          <p className="text-xs text-success mt-1">orçamentos recebidos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">Taxa de Conversão Média</p>
          <p className="text-3xl font-bold text-card-foreground mt-1">32.8%</p>
          <p className="text-xs text-success mt-1">+4.2% vs período anterior</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">Ticket Médio</p>
          <p className="text-3xl font-bold text-card-foreground mt-1">R$ 7.450</p>
          <p className="text-xs text-success mt-1">+12% vs período anterior</p>
        </div>
      </div>

      {/* Area Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartDataMensal}>
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
            <BarChart data={chartDataMensal}>
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
              <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} dataKey="value">
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
    </div>
  );
};

export default Relatorios;
