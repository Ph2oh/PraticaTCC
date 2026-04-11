import { useMemo } from "react";
import { FileText, Users, TrendingUp, DollarSign, Banknote, ArrowUpRight, Loader, Coins, CheckCircle2, XCircle, ArrowRight, PieChart as PieChartIcon } from "lucide-react";
import { eachDayOfInterval, subDays, format, isSameDay, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import StatusBadge, { type Status } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useAuth } from "@/contexts/AuthContext";
import { useConfig } from "@/hooks/useConfig";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, ReferenceLine, LabelList
} from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const STATUS_META: Record<Status, { label: string; fill: string }> = {
  contratado: { label: "Contratado", fill: "#10b981" }, // emerald-500
  enviado: { label: "Enviado", fill: "#3b82f6" }, // blue-500
  pendente: { label: "Pendente", fill: "#f59e0b" }, // amber-500
  recusado: { label: "Recusado", fill: "#ef4444" }, // red-500
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const formatterSemDecimais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const Dashboard = () => {
  const { usuario } = useAuth();
  const { data: orcamentos = [], isLoading: loadingOrcamentos } = useOrcamentos();
  const { data: config, isLoading: loadingConfig } = useConfig();
  const navigate = useNavigate();

  const isLoading = loadingOrcamentos || loadingConfig;

  // Metas provenientes do Banco (Configs) ou Default
  const META_CONVERSAO = config?.metaConversao ?? 45; // %
  const META_RECEITA = config?.metaReceita ?? 20000; // R$
  const META_CONTRATOS_SEMANA = config?.metaContratosSemana ?? 3; // Configuravel nas Configuracoes

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // ================= METRICAS E CALCULOS =================

  // Filtros de tempo
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Captações (Entradas de Leads baseadas na dataRecebido)
  const captacoesMesAtual = useMemo(() =>
    orcamentos.filter(o => isWithinInterval(new Date(o.dataRecebido), { start: currentMonthStart, end: currentMonthEnd })),
    [orcamentos, currentMonthStart, currentMonthEnd]);

  // Fechamentos (Receita Real baseada exclusivamente na dataFechamento)
  const fechamentosMesAtual = useMemo(() =>
    orcamentos.filter(o => o.dataFechamento && isWithinInterval(new Date(o.dataFechamento), { start: currentMonthStart, end: currentMonthEnd })),
    [orcamentos, currentMonthStart, currentMonthEnd]);

  const fechamentosMesPassado = useMemo(() =>
    orcamentos.filter(o => o.dataFechamento && isWithinInterval(new Date(o.dataFechamento), { start: lastMonthStart, end: lastMonthEnd })),
    [orcamentos, lastMonthStart, lastMonthEnd]);

  // Recusas (Perdas Reais baseadas exclusivamente na dataCancelamento)
  const recusasMesAtual = useMemo(() =>
    orcamentos.filter(o => o.dataCancelamento && isWithinInterval(new Date(o.dataCancelamento), { start: currentMonthStart, end: currentMonthEnd }) && o.status === "recusado"),
    [orcamentos, currentMonthStart, currentMonthEnd]);

  const recusasMesPassado = useMemo(() =>
    orcamentos.filter(o => o.dataCancelamento && isWithinInterval(new Date(o.dataCancelamento), { start: lastMonthStart, end: lastMonthEnd }) && o.status === "recusado"),
    [orcamentos, lastMonthStart, lastMonthEnd]);

  // CARD 1: Taxa de Conversão (Win Rate Pura do Mês Atual)
  // Baseia-se estritamente nas "Quedas de Braço" que resultaram em fechamento ou perda neste mês específico.
  const conversao = useMemo(() => {
    const totalFechadosAtual = fechamentosMesAtual.length;
    const totalRecusadosAtual = recusasMesAtual.length;
    const volumeDecididoAtual = totalFechadosAtual + totalRecusadosAtual;
    const taxaAtual = volumeDecididoAtual > 0 ? (totalFechadosAtual / volumeDecididoAtual) * 100 : 0;

    const totalFechadosPassado = fechamentosMesPassado.length;
    const totalRecusadosPassado = recusasMesPassado.length;
    const volumeDecididoPassado = totalFechadosPassado + totalRecusadosPassado;
    const taxaPassada = volumeDecididoPassado > 0 ? (totalFechadosPassado / volumeDecididoPassado) * 100 : 0;

    const diff = taxaAtual - taxaPassada;
    // O valor a ser mostrado é a taxa atual, progress against META_CONVERSAO
    const isAboveObjective = taxaAtual >= META_CONVERSAO;

    return { taxaAtual, diff, isAboveObjective };
  }, [fechamentosMesAtual, recusasMesAtual, fechamentosMesPassado, recusasMesPassado, META_CONVERSAO]);

  // CARD 2: Receita Contratada (Mês Atual - Fechamentos)
  const receita = useMemo(() => {
    const valorAtual = fechamentosMesAtual.reduce((acc, o) => acc + o.valor, 0);
    const valorPassado = fechamentosMesPassado.reduce((acc, o) => acc + o.valor, 0);

    let diffPct = 0;
    if (valorPassado > 0) {
      diffPct = ((valorAtual - valorPassado) / valorPassado) * 100;
    } else if (valorAtual > 0) {
      diffPct = 100;
    }

    const progressoMeta = Math.min((valorAtual / META_RECEITA) * 100, 100);

    return { valorAtual, diffPct, progressoMeta };
  }, [fechamentosMesAtual, fechamentosMesPassado, META_RECEITA]);

  // CARD 3: Receita Projetada (Pipeline Global Enviado)
  const orcamentosProjetados = useMemo(() => {
    return orcamentos.filter(o => o.status === "enviado");
  }, [orcamentos]);

  const projetada = useMemo(() => {
    return orcamentosProjetados.reduce((acc, o) => acc + o.valor, 0);
  }, [orcamentosProjetados]);

  // CARD 4: Motivos de Perda (Cancelamentos Reais do Mês)
  const motivosDePerda = useMemo(() => {
    // Contabiliza apenas o que foi perdido NESSA janela de tempo
    const recusados = recusasMesAtual.filter(o => o.motivoRecusa);
    const totalRecusados = recusados.length;

    const contagem = recusados.reduce((acc, curr) => {
      acc[curr.motivoRecusa!] = (acc[curr.motivoRecusa!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalRecusados,
      ranking: Object.entries(contagem)
        .map(([motivo, count]) => ({ motivo, count, pct: (count / totalRecusados) * 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3) // TOP 3
    };
  }, [recusasMesAtual]);

  // CHART 1: Eventos do Mês (Semanas Desacopladas)
  const monthSeries = useMemo(() => {
    const weeksInMonth = Math.ceil(currentMonthEnd.getDate() / 7);
    return Array.from({ length: weeksInMonth }, (_, i) => {
      const week = i + 1;

      const recebidosNaSemana = captacoesMesAtual.filter(o => Math.ceil(new Date(o.dataRecebido).getDate() / 7) === week).length;
      const fechadosNaSemana = fechamentosMesAtual.filter(o => Math.ceil(new Date(o.dataFechamento!).getDate() / 7) === week).length;
      const recusadosNaSemana = recusasMesAtual.filter(o => Math.ceil(new Date(o.dataCancelamento!).getDate() / 7) === week).length;

      return {
        semana: `Sem ${week}`,
        enviados: recebidosNaSemana,
        contratados: fechadosNaSemana,
        recusados: recusadosNaSemana,
        meta_semanal: META_CONTRATOS_SEMANA
      };
    });
  }, [captacoesMesAtual, fechamentosMesAtual, recusasMesAtual, currentMonthEnd, META_CONTRATOS_SEMANA]);

  const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  // Heurística de análise — identifica o tipo de serviço pela descrição
  const extractCategory = (desc: string) => {
    if (!desc) return "Outros";
    const b = desc.toLowerCase()
      .replace(/[áàâã]/g, "a").replace(/[éèê]/g, "e").replace(/[íì]/g, "i")
      .replace(/[óòôõ]/g, "o").replace(/[úù]/g, "u").replace(/ç/g, "c");
    if (/pre.?wed|prewedd|pre wedding/.test(b)) return "Pre Wedding";
    if (/casamento|noiva|noivo|bodas|civil/.test(b)) return "Casamentos";
    if (/15|debutante|quinze/.test(b)) return "15 Anos";
    if (/formatura|baile|colacao/.test(b)) return "Formaturas";
    if (/ensaio|book|gestante|bebe|newborn|infantil/.test(b)) return "Ensaios Diversos";
    if (/corp|marca|produt|comercial|empresa|instituc/.test(b)) return "Corporativo";
    return "Outros";
  };

  // Receita Potencial e Ticket Médio por Tipo de Serviço (Mês Atual)
  const servicosData = useMemo(() => {
    const categories: Record<string, { total: number, count: number }> = {};

    captacoesMesAtual.forEach(orc => {
      const cat = extractCategory(orc.descricao);
      if (!categories[cat]) categories[cat] = { total: 0, count: 0 };
      categories[cat].total += orc.valor;
      categories[cat].count += 1;
    });

    // Paleta de cores vibrantes modernas para o gráfico de pizza
    const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#64748b"];

    return Object.entries(categories)
      .map(([name, data], i) => ({
        name,
        value: data.total, // O tamanho da fatia será o volume financeiro
        ticket: data.count > 0 ? data.total / data.count : 0,
        count: data.count,
        fill: COLORS[i % COLORS.length]
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [captacoesMesAtual]);

  const ServicosLegend = (props: { payload?: { color: string; value: string; payload: { count: number; ticket: number } }[] }) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-medium text-muted-foreground w-full">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-md" style={{ backgroundColor: entry.color }} />
            <span className="text-card-foreground font-semibold">{entry.value}</span>
            <span className="opacity-60 text-[10px]">({entry.payload.count}x)</span>
          </li>
        ))}
      </ul>
    );
  };

  const ServicosTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; ticket: number; count: number } }[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card px-4 py-3 border border-border shadow-xl rounded-xl text-sm min-w-[200px] ring-1 ring-border/50">
          <p className="font-bold text-card-foreground mb-2 flex items-center justify-between">
            {data.name} <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] uppercase">{data.count} leads</span>
          </p>
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-muted-foreground">Vol. Total:</span>
            <span className="font-semibold text-primary">{currencyFormatter.format(data.value)}</span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1 pt-1 border-t border-border/40">
            <span className="text-muted-foreground">Ticket Médio:</span>
            <span className="font-semibold text-emerald-500">{currencyFormatter.format(data.ticket)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Histórico Mensal (6 meses) para a Accordeon de longo prazo - Completamente Desacoplado
  const monthlySeries = useMemo(() => {
    const inicioJanela = startOfMonth(subMonths(new Date(), 5));

    return Array.from({ length: 6 }, (_, index) => {
      const mesAtual = addMonths(inicioJanela, index);
      const chaveMes = `${mesAtual.getFullYear()}-${mesAtual.getMonth()}`;

      const recebidosMes = orcamentos.filter(o => {
        const d = new Date(o.dataRecebido);
        return `${d.getFullYear()}-${d.getMonth()}` === chaveMes;
      }).length;

      const contratadosMes = orcamentos.filter(o => {
        if (!o.dataFechamento) return false;
        const d = new Date(o.dataFechamento);
        return `${d.getFullYear()}-${d.getMonth()}` === chaveMes;
      }).length;

      const recusadosMes = orcamentos.filter(o => {
        if (!o.dataCancelamento || o.status !== "recusado") return false;
        const d = new Date(o.dataCancelamento);
        return `${d.getFullYear()}-${d.getMonth()}` === chaveMes;
      }).length;

      const pctNaoFechados = recebidosMes > 0 ? Math.round((recusadosMes / recebidosMes) * 100) : 0;

      return {
        mes: format(mesAtual, "MMM/yy", { locale: ptBR }).replace(".", ""),
        recebidos: recebidosMes,
        contratados: contratadosMes,
        naoFechados: recusadosMes,
        pctNaoFechados,
      };
    });
  }, [orcamentos]);


  const recentOrcamentos = useMemo(
    () =>
      [...orcamentos]
        .sort((a, b) => new Date(b.dataRecebido).getTime() - new Date(a.dataRecebido).getTime())
        .slice(0, 5),
    [orcamentos]
  );

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[380px] w-full rounded-2xl" />
          <Skeleton className="h-[380px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}, {usuario?.nome?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">VISÃO GERAL DE {format(now, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CARD 1: Taxa de Conversão */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className={cn("w-16 h-16", conversao.isAboveObjective ? "text-emerald-500" : "text-amber-500")} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-sm font-medium text-muted-foreground">Taxa de conversão</p>
            <div className="flex items-baseline gap-2">
              <p className={cn("text-3xl font-bold tracking-tight", conversao.isAboveObjective ? "text-emerald-500" : "text-amber-500")}>
                {conversao.taxaAtual.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground">| Meta: {META_CONVERSAO.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-4 relative z-10 space-y-2">
            <Progress value={(conversao.taxaAtual / META_CONVERSAO) * 100} className={cn("h-1.5", conversao.isAboveObjective && "[&>div]:bg-emerald-500")} />
            <p className="text-xs font-medium text-muted-foreground">
              <span className={cn(conversao.diff >= 0 ? "text-emerald-500" : "text-red-500")}>
                {conversao.diff >= 0 ? "+" : ""}{conversao.diff.toFixed(1)}%
              </span> vs mês anterior
            </p>
          </div>
        </div>

        {/* CARD 2: Receita Contratada */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:scale-110 transition-transform">
            <Banknote className="w-16 h-16 text-foreground" />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-sm font-medium text-muted-foreground">Orçamentos fechados (em reais) </p>
            <p className="text-3xl font-bold tracking-tight text-card-foreground">
              {currencyFormatter.format(receita.valorAtual)}
            </p>
          </div>
          <div className="mt-4 relative z-10 space-y-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
              <span>Progresso ({receita.progressoMeta.toFixed(0)}%)</span>
              <span>Meta: {formatterSemDecimais.format(META_RECEITA)}</span>
            </div>
            <Progress value={receita.progressoMeta} className="h-1.5" />
            <p className="text-[11px] font-medium text-muted-foreground pt-1">
              <span className={cn(receita.diffPct >= 0 ? "text-emerald-500" : "text-red-500")}>
                {receita.diffPct >= 0 ? "+" : ""}{receita.diffPct.toFixed(1)}%
              </span> vs mês anterior
            </p>
          </div>
        </div>

        {/* CARD 3: Receita Projetada (Novo) */}
        <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-20 p-2 group-hover:-translate-y-2 transition-transform duration-500">
            <Coins className="w-24 h-24" />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[14px] font-bold text-white">Orçamentos pendentes (em reais)</p>
            <p className="text-[32px] font-bold tracking-tight text-white drop-shadow-md pb-1">
              {currencyFormatter.format(projetada)}
            </p>
            <p className="text-[11px] font-semibold text-white/80 uppercase pt-1">
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <div className="mt-4 relative z-10 bg-white/10 rounded-lg p-2.5 backdrop-blur-sm border border-white/10 cursor-pointer hover:bg-white/20 transition-colors">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Pendente de fechamento ({orcamentosProjetados.length})</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Orçamentos em Negociação</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-2">
                {orcamentosProjetados.length > 0 ? (
                  orcamentosProjetados.map(o => (
                    <div
                      key={o.id}
                      onClick={() => navigate(`/orcamentos?highlight=${o.id}`)}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-medium text-sm truncate">{o.cliente?.nome || "Sem Nome"}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{o.descricao}</span>
                      </div>
                      <span className="font-semibold text-sm text-foreground shrink-0 pl-2">
                        {currencyFormatter.format(o.valor)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum orçamento pendente atual.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* CARD 4: Motivos de Perda */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative">
          <p className="text-sm font-medium text-muted-foreground mb-3">Orçamentos rejeitados</p>
          <div className="flex-1 space-y-3 mt-1">
            {motivosDePerda.ranking.length > 0 ? (
              motivosDePerda.ranking.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="text-foreground truncate pr-2 uppercase tracking-tight" title={item.motivo}>{item.motivo}</span>
                    <span className="shrink-0">{item.count}</span>
                  </div>
                  <Progress value={item.pct} className="h-1.5 [&>div]:bg-red-500" />
                </div>
              ))
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50 py-2">
                <XCircle className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground leading-tight">Nenhuma recusa registrada neste mês.</p>
              </div>
            )}
          </div>
          {motivosDePerda.total > 0 && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                Com base em <span className="text-foreground">{motivosDePerda.total}</span> orçamentos rejeitados (mês)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row — dois gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart (Orçamentos do Mês) */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-transparent">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Meta semanal de orçamentos contratados</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthSeries} barGap={4} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis
                domain={[0, (dataMax: number) => Math.max(dataMax, META_CONTRATOS_SEMANA + 1)]}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <RechartsTooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  fontSize: 13,
                  fontWeight: 500
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '15px' }} />

              <ReferenceLine
                y={META_CONTRATOS_SEMANA}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
                label={{
                  value: `Meta: ${META_CONTRATOS_SEMANA}`,
                  position: "insideTopRight",
                  fill: "#10b981",
                  fontSize: 12,
                  fontWeight: 600,
                  dy: -8,
                  dx: -5
                }}
              />

              <Bar dataKey="enviados" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Enviados">
                <LabelList dataKey="enviados" position="top" fill="#3b82f6" fontSize={11} fontWeight={600} formatter={(v: number) => v > 0 ? v : ""} />
              </Bar>
              <Bar dataKey="contratados" fill="#10b981" radius={[4, 4, 0, 0]} name="Contratados">
                <LabelList dataKey="contratados" position="top" fill="#10b981" fontSize={11} fontWeight={600} formatter={(v: number) => v > 0 ? v : ""} />
              </Bar>
              <Bar dataKey="recusados" fill="#ef4444" radius={[4, 4, 0, 0]} name="Recusados">
                <LabelList dataKey="recusados" position="top" fill="#ef4444" fontSize={11} fontWeight={600} formatter={(v: number) => v > 0 ? v : ""} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Distribuição financeira por Serviço */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-transparent">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-card-foreground lowercase first-letter:uppercase">Orçamentos contratados (por seguimento)</h3>
          </div>

          {servicosData.length > 0 ? (
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-full h-[240px] flex items-center justify-center mt-2 group">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={servicosData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {servicosData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="transition-all duration-300 hover:opacity-80" />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ServicosTooltip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Vol. Total</span>
                  <span className="text-lg font-bold text-foreground">
                    {currencyFormatter.format(servicosData.reduce((acc, crr) => acc + crr.value, 0))}
                  </span>
                </div>
              </div>
              <div className="w-full">
                <ServicosLegend payload={servicosData.map(d => ({ color: d.fill, value: d.name, payload: { count: d.count, ticket: d.ticket } }))} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-50 py-10">
              <XCircle className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground leading-tight">Nenhum orçamento valorizado identificado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Monthly Data (Expandable) */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="history" className="border-none bg-card rounded-2xl shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-6">
            Análise histórica e comparativo (últimos 6 meses)
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 pt-2">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-5">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Volume recebido vs fechado</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlySeries}>
                    <defs>
                      <linearGradient id="colorRecebidos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorContratados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "none", borderRadius: "12px", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="recebidos" stroke="#3b82f6" fill="url(#colorRecebidos)" name="Recebidos" strokeWidth={2} />
                    <Area type="monotone" dataKey="contratados" stroke="#10b981" fill="url(#colorContratados)" name="Contratados" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/10 p-5">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Recebidos vs recusados</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlySeries} barGap={4} margin={{ top: 24, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "none", borderRadius: "12px", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12 }}
                      formatter={(value: number, name: string, props: { payload: { pctNaoFechados: number } }) => {
                        if (name === "Recusados") {
                          return [`${value} (${props.payload.pctNaoFechados}%)`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                    <Bar dataKey="recebidos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Recebidos">
                      <LabelList
                        dataKey="recebidos"
                        position="top"
                        fill="#3b82f6"
                        fontSize={11}
                        fontWeight={600}
                        formatter={(v: number) => v > 0 ? v : ""}
                      />
                    </Bar>
                    <Bar dataKey="naoFechados" fill="#f51b0bff" radius={[4, 4, 0, 0]} name="Recusados">
                      <LabelList
                        dataKey="pctNaoFechados"
                        position="top"
                        fill="#f51b0bff"
                        fontSize={11}
                        fontWeight={700}
                        formatter={(v: number) => v > 0 ? `${v}%` : ""}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Recent Table */}
      <div className="rounded-2xl bg-card shadow-sm border border-transparent overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h3 className="text-sm font-semibold text-card-foreground">Orçamentos recentes</h3>
          <a href="/orcamentos" className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors">
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrcamentos.map((orc) => (
                <tr key={orc.id} className="border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <td className="py-4 px-6 font-mono text-xs text-muted-foreground/70">{orc.id.substring(0, 8)}...</td>
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
