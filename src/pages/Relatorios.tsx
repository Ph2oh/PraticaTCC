import { useState, useMemo } from "react";
import { Download, Search, Calendar, Loader, Filter, Users, TrendingUp, BarChart3, Banknote } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useClientes } from "@/hooks/useClientes";
import StatusBadge, { type Status } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, subMonths, endOfDay, subDays } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, MousePointerClick, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportarExcel, exportarPDF, exportarCSV, DadosExportacao } from "@/lib/exportUtils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

type ClientPerformanceEntry = {
  id: string;
  nome: string;
  totalPedidos: number;
  pedidosGanhos: number;
  receitaGerada: number;
  receitaGanha: number;
  ticketMedio: number;
  conversao: number;
};

const Relatorios = () => {
  const { data: orcamentos = [], isLoading: loadingOrcamentos } = useOrcamentos();
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const isLoading = loadingOrcamentos || loadingClientes;

  // Filtro Global de Período
  const [periodoGlobal, setPeriodoGlobal] = useState("mes_atual"); // 'mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'todos'

  // Métricas globais Adicionais
  const [searchTerm, setSearchTerm] = useState("");
  // Controla qual alerta está com o painel de explicação expandido
  const [alertExpandido, setAlertExpandido] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchLtv, setSearchLtv] = useState("");

  // Sort State para a Tabela LTV
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientPerformanceEntry;
    direction: "asc" | "desc";
  }>({ key: "receitaGanha", direction: "desc" }); // Padrão: Maior receita real ganha primeiro

  // Define time bounds based on the global filter
  const { startDate, endDate, pastStartDate, pastEndDate } = useMemo(() => {
    const hoje = new Date();
    let start = new Date(0);
    let end = new Date(8640000000000000); // Distant future
    let pastStart = new Date(0);
    let pastEnd = new Date(0);

    if (periodoGlobal === "mes_atual") {
      start = startOfMonth(hoje);
      pastEnd = subDays(start, 1);
      pastStart = startOfMonth(pastEnd);
    } else if (periodoGlobal === "ultimos_3_meses") {
      start = subMonths(hoje, 3);
      pastEnd = subDays(start, 1);
      pastStart = subMonths(start, 3);
    } else if (periodoGlobal === "ultimos_6_meses") {
      start = subMonths(hoje, 6);
      pastEnd = subDays(start, 1);
      pastStart = subMonths(start, 6);
    } else if (periodoGlobal === "custom") {
      start = dateFrom ? new Date(dateFrom) : new Date(0);
      end = dateTo ? endOfDay(new Date(dateTo)) : new Date(8640000000000000);
      if (dateFrom && dateTo) {
        const span = differenceInDays(end, start);
        pastEnd = subDays(start, 1);
        pastStart = subDays(pastEnd, span);
      }
    }
    return { startDate: start, endDate: end, pastStartDate: pastStart, pastEndDate: pastEnd };
  }, [periodoGlobal, dateFrom, dateTo]);

  const { filtGlobais, statsAtuais, statsPassadas, alerts, rankingServicos } = useMemo(() => {
    const filtGlobais: typeof orcamentos = [];
    const statsA = { volume: 0, contratos: 0, recusas: 0, receita: 0, somaCiclos: 0 };
    const statsP = { volume: 0, contratos: 0, recusas: 0, receita: 0, somaCiclos: 0 };

    // Heuristica de análise — avalia a descricao do orcamento para categorizar o tipo de servico.
    // O ranking conta todos os orcamentos do periodo (nao so fechados) para refletir a demanda real.
    const servicosCount: Record<string, { qtd: number, receita: number }> = {};
    const extractCategory = (desc: string) => {
      if (!desc) return "Outros";
      const b = desc.toLowerCase()
        // Normaliza acentos para facilitar o match sem depender de encoding
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

    orcamentos.forEach((orc) => {
      const dataOrc = new Date(orc.dataRecebido);
      const dataFechamento = orc.dataFechamento ? new Date(orc.dataFechamento) : null;
      const dataCancelamento = orc.dataCancelamento ? new Date(orc.dataCancelamento) : null;

      // Classifica Atuais
      const recIn = dataOrc >= startDate && dataOrc <= endDate;
      const fecIn = dataFechamento && (dataFechamento >= startDate && dataFechamento <= endDate);
      const canIn = dataCancelamento && (dataCancelamento >= startDate && dataCancelamento <= endDate) && orc.status === "recusado";

      if (recIn || fecIn || canIn) {
        filtGlobais.push(orc);
      }

      if (recIn) {
        statsA.volume++;
        // Alimenta Ranking Heuristico: conta todo orcamento recebido no periodo (independente de status)
        const cat = extractCategory(orc.descricao);
        if (!servicosCount[cat]) servicosCount[cat] = { qtd: 0, receita: 0 };
        servicosCount[cat].qtd++;
        servicosCount[cat].receita += orc.valor;
      }
      if (fecIn && orc.status === "contratado") {
        statsA.contratos++;
        statsA.receita += orc.valor;
        statsA.somaCiclos += Math.max(differenceInDays(dataFechamento!, dataOrc), 0);
      }
      if (canIn) statsA.recusas++;

      // Classifica Passados (Deltas)
      const recPast = dataOrc >= pastStartDate && dataOrc <= pastEndDate;
      const fecPast = dataFechamento && (dataFechamento >= pastStartDate && dataFechamento <= pastEndDate);
      const canPast = dataCancelamento && (dataCancelamento >= pastStartDate && dataCancelamento <= pastEndDate) && orc.status === "recusado";

      if (recPast) statsP.volume++;
      if (fecPast && orc.status === "contratado") {
        statsP.contratos++;
        statsP.receita += orc.valor;
        statsP.somaCiclos += Math.max(differenceInDays(dataFechamento!, dataOrc), 0);
      }
      if (canPast) statsP.recusas++;
    });

    const decisoesA = statsA.contratos + statsA.recusas;
    const conversaoA = decisoesA > 0 ? (statsA.contratos / decisoesA) * 100 : 0;

    // Alertas de Inteligência — campo 'detail' sustenta o painel explicativo do botão "O que isso significa?"
    const alertas: { id: string; type: string; msg: string; detail: string }[] = [];
    if (statsA.recusas > statsA.contratos * 1.5 && statsA.recusas > 5) {
      alertas.push({
        id: 'alta-recusa',
        type: 'destructive',
        msg: 'Atenção: O volume de orçamentos perdidos é superior aos orçamentos contratados. Pode haver desalinhamento nos valores ou objeção.',
        detail: 'Este alerta é disparado quando o número de recusas ultrapassa 1,5× o total de contratos fechados e há mais de 5 recusas no período. Para cada proposta aceita, mais de uma e meia está sendo rejeitada — uma taxa que compromete a saúde comercial. Possíveis causas: precificação acima da expectativa do mercado, proposta pouco convincente ou ausência de follow-up. Recomendação: revise os motivos de recusa cadastrados na aba Funil e identifique padrões recorrentes.'
      });
    } else if (statsA.receita > 0 && statsP.receita > 0 && statsA.receita < statsP.receita * 0.5) {
      alertas.push({
        id: 'queda-receita',
        type: 'warning',
        msg: 'Aviso Temporal: Faturamento do período atual está despencando comparado ao espelho passado.',
        detail: 'Este alerta aparece quando a receita apurada no período atual é inferior a 50% da receita do período anterior equivalente. Isso sugere uma queda expressiva no volume de fechamentos ou no ticket médio. Verifique se houve redução no volume de entradas, aumento na taxa de perda ou mudança no perfil de clientes atendidos neste ciclo.'
      });
    }

    const rankingServicos = Object.entries(servicosCount)
      .map(([k, v]) => ({ cat: k, ...v }))
      .sort((a, b) => b.receita - a.receita);

    return { filtGlobais, statsAtuais: statsA, statsPassadas: statsP, alerts: alertas, rankingServicos };
  }, [orcamentos, startDate, endDate, pastStartDate, pastEndDate]);

  const orcamentosFiltradosGlobalmente = filtGlobais;

  // Helper de cálculo Delta
  const calcDelta = (atual: number, passado: number, invertaBomERuim: boolean = false) => {
    // Retorna "Sem dados" em caso de ausência de informações no período anterior para evitar a exibição "travada" em 100% (Infinito Matemático).
    if (passado === 0 && atual === 0) return { pct: 0, text: '0%', trend: 'neutral', icon: Minus, isNull: false };
    if (passado === 0) return { pct: null, text: '', trend: 'neutral', icon: Minus, isNull: true };

    const diff = ((atual - passado) / passado) * 100;
    let trend = 'neutral';
    if (diff > 0) trend = invertaBomERuim ? 'bad' : 'good';
    else if (diff < 0) trend = invertaBomERuim ? 'good' : 'bad';

    const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
    const prefix = diff > 0 ? '+' : '';
    return { pct: diff, text: `${prefix}${diff.toFixed(1)}%`, trend, icon: Icon, isNull: false };
  };

  // Aba 1: Filtros finos baseados na lista Global
  const filteredOrcamentos = useMemo(() => {
    return orcamentosFiltradosGlobalmente.filter((orc) => {
      const matchesSearch =
        (orc.cliente?.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        orc.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || orc.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.dataRecebido).getTime() - new Date(a.dataRecebido).getTime());
  }, [orcamentosFiltradosGlobalmente, searchTerm, statusFilter]);

  const totalPeriodo = statsAtuais.volume;
  const filteredContratados = statsAtuais.contratos;
  const decisoes = statsAtuais.contratos + statsAtuais.recusas;
  const taxaConversao = decisoes > 0 ? (statsAtuais.contratos / decisoes) * 100 : 0;
  const receitaFechada = statsAtuais.receita;

  const ticketMedioReal = statsAtuais.contratos > 0 ? statsAtuais.receita / statsAtuais.contratos : 0;
  const ticketMedioP = statsPassadas.contratos > 0 ? statsPassadas.receita / statsPassadas.contratos : 0;

  const cicloAprovacaoMedio = statsAtuais.contratos > 0 ? (statsAtuais.somaCiclos / statsAtuais.contratos) : 0;
  const cicloAprovacaoMedioP = statsPassadas.contratos > 0 ? (statsPassadas.somaCiclos / statsPassadas.contratos) : 0;

  const getDiasNegociacao = (dataRecebido: string | Date, dataAtualizado: string | Date, status: string) => {
    if (status === "pendente" || status === "enviado") {
      const dias = differenceInDays(new Date(), new Date(dataRecebido));
      return dias === 0 ? "Hoje" : `${dias} dias`;
    }
    const duration = differenceInDays(new Date(dataAtualizado), new Date(dataRecebido));
    return duration === 0 ? "Mesmo dia" : `${duration} dias`;
  };

  // --- LTV Calculations (Aba Clientes) ---
  const clientPerformance = useMemo(() => {
    const perfMap = new Map<string, ClientPerformanceEntry>();

    // Inicializa com todos os clientes
    clientes.forEach(c => {
      perfMap.set(c.id, {
        id: c.id,
        nome: c.nome,
        totalPedidos: 0,
        pedidosGanhos: 0,
        receitaGerada: 0,
        receitaGanha: 0,
        ticketMedio: 0,
        conversao: 0
      });
    });

    // Popula com orçamentos reais filtrados globalmente (respeitando o tempo)
    orcamentosFiltradosGlobalmente.forEach(orc => {
      if (!orc.clienteId) return;
      const entry = perfMap.get(orc.clienteId) || {
        id: orc.clienteId,
        nome: orc.cliente?.nome || "Desconhecido",
        totalPedidos: 0,
        pedidosGanhos: 0,
        receitaGerada: 0,
        receitaGanha: 0,
        ticketMedio: 0,
        conversao: 0,
      };

      entry.totalPedidos += 1;
      entry.receitaGerada += orc.valor; // Sum all orders to show the total money moving around this client

      if (orc.status === "contratado") {
        entry.pedidosGanhos += 1;
        entry.receitaGanha += orc.valor;
      }
      perfMap.set(orc.clienteId, entry);
    });

    return Array.from(perfMap.values())
      .filter(c => c.totalPedidos > 0) // Só mostra quem já pediu algo no período
      .filter(c => c.nome.toLowerCase().includes(searchLtv.toLowerCase())) // Filtro da busca
      .map(c => ({
        ...c,
        ticketMedio: c.pedidosGanhos > 0 ? c.receitaGanha / c.pedidosGanhos : 0, // Corrigido para calcular ticket só sob o ganho real
        conversao: c.totalPedidos > 0 ? (c.pedidosGanhos / c.totalPedidos) * 100 : 0
      }))
      .sort((a, b) => {
        // Lógica de Ordenação Dinâmica
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "string" && typeof valB === "string") {
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }); // Ordena dependendo do Header Clicado
  }, [orcamentosFiltradosGlobalmente, clientes, searchLtv, sortConfig]);

  // Handler para cliques no Cabeçalho da Tabela
  const requestSort = (key: keyof ClientPerformanceEntry) => {
    let direction: "asc" | "desc" = "desc"; // Default para desc ao clicar a primeira vez numa nova coluna
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ClientPerformanceEntry) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-primary" />;
  };


  // --- Pipeline Forecast (Aba Funil) ---
  const pipelineStats = useMemo(() => {
    const funil = {
      pendentes: { qtd: 0, valor: 0 },
      emNegociacao: { qtd: 0, valor: 0 },
      ganhos: { qtd: 0, valor: 0 },
      perdidos: { qtd: 0, valor: 0 },
      estagnados: { qtd: 0, valor: 0 }, // Analise de Aging (Pipelines envelhecidos)
      motivosRecusa: {} as Record<string, { qtd: number; valor: number }>,
      pipelineTotal: 0 // Dinheiro na mesa (pendente + negociacao)
    };

    // Analisa funil baseado no intervalo de tempo global definido
    orcamentosFiltradosGlobalmente.forEach(orc => {
      // Captacoes do periodo selecionado
      const dRecebido = new Date(orc.dataRecebido);
      const belongsRecebido = dRecebido >= startDate && dRecebido <= endDate;

      // Fechamentos e Perdas do periodo selecionado
      const dFechamento = orc.dataFechamento ? new Date(orc.dataFechamento) : null;
      const belongsFechado = dFechamento && dFechamento >= startDate && dFechamento <= endDate;

      const dCancelamento = orc.dataCancelamento ? new Date(orc.dataCancelamento) : null;
      const belongsCancelado = dCancelamento && dCancelamento >= startDate && dCancelamento <= endDate;

      if (orc.status === "pendente" && belongsRecebido) {
        funil.pendentes.qtd++; funil.pendentes.valor += orc.valor;
        funil.pipelineTotal += orc.valor;
      } else if (orc.status === "enviado" && belongsRecebido) {
        funil.emNegociacao.qtd++; funil.emNegociacao.valor += orc.valor;
        funil.pipelineTotal += orc.valor;
      }

      // Checagem de Estagnação (Aging)
      if ((orc.status === "pendente" || orc.status === "enviado") && belongsRecebido) {
        const dias = differenceInDays(new Date(), dRecebido);
        if (dias >= 20) {
          funil.estagnados.qtd++;
          funil.estagnados.valor += orc.valor;
        }
      }

      if (orc.status === "contratado" && belongsFechado) {
        funil.ganhos.qtd++; funil.ganhos.valor += orc.valor;
      } else if (orc.status === "recusado" && belongsCancelado) {
        funil.perdidos.qtd++; funil.perdidos.valor += orc.valor;
        // Agrupa pelos motivos de recusa informados
        const motivo = orc.motivoRecusa || "Não informado";
        if (!funil.motivosRecusa[motivo]) {
          funil.motivosRecusa[motivo] = { qtd: 0, valor: 0 };
        }
        funil.motivosRecusa[motivo].qtd++;
        funil.motivosRecusa[motivo].valor += orc.valor;
      }
    });

    return funil;
  }, [orcamentosFiltradosGlobalmente, startDate, endDate]);

  // Export Handlers
  const handleExport = (format: 'xlxs' | 'csv' | 'pdf') => {
    const payload: DadosExportacao = {
      periodo: periodoGlobal,
      resumo: {
        totalOrcamentos: totalPeriodo,
        receitaFechada: receitaFechada,
        ticketMedio: ticketMedioReal,
        taxaConversao: pipelineStats.pipelineTotal > 0 ? ((pipelineStats.ganhos.valor / pipelineStats.pipelineTotal) * 100).toFixed(1) + "%" : "0%"
      },
      clientes: clientPerformance.map(c => ({
        nome: c.nome,
        pedidosFechados: c.pedidosGanhos,
        receitaGerada: c.receitaGanha,
        ultimaAtividade: new Date()
      })),
      pipeline: filteredOrcamentos.map(orc => ({
        id: orc.id,
        cliente: orc.cliente?.nome || 'Desconhecido',
        descricao: orc.descricao || '',
        status: orc.status,
        valor: orc.valor,
        dataRecebido: orc.dataRecebido,
        dataFechamento: orc.dataFechamento || ''
      }))
    };

    if (format === 'xlxs') exportarExcel(payload);
    if (format === 'csv') exportarCSV(payload);
    if (format === 'pdf') exportarPDF(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader className="w-8 h-8 animate-spin" />
          <p>Processando analytics central...</p>
        </div>
      </div>
    );
  }

  const deltaVolume = calcDelta(totalPeriodo, statsPassadas.volume);
  const deltaConversao = calcDelta(Math.round(taxaConversao), (statsPassadas.contratos + statsPassadas.recusas) > 0 ? Math.round((statsPassadas.contratos / (statsPassadas.contratos + statsPassadas.recusas)) * 100) : 0);
  const deltaReceita = calcDelta(receitaFechada, statsPassadas.receita);
  const deltaTicket = calcDelta(ticketMedioReal, ticketMedioP);
  const deltaCiclo = calcDelta(Number(cicloAprovacaoMedio), Math.round(cicloAprovacaoMedioP), true);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deep Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise, previsão de faturamento e LTV</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          {/* Seletor Global de Tempo */}
          <div className="flex bg-card p-1 rounded-lg border border-border shadow-sm">
            <select
              value={periodoGlobal}
              onChange={(e) => {
                setPeriodoGlobal(e.target.value);
                if (e.target.value !== 'custom') {
                  setDateFrom(''); setDateTo('');
                }
              }}
              className="bg-transparent text-sm font-medium pr-8 pl-3 py-2 outline-none cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
              title="Período"
            >
              <option value="mes_atual">Este Mês</option>
              <option value="ultimos_3_meses">Últimos 3 Meses</option>
              <option value="ultimos_6_meses">Últimos 6 Meses</option>
              <option value="todos">Todos os Orçamentos</option>
              <option value="custom">Data Customizada</option>
            </select>
          </div>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden sm:flex items-center justify-center border border-border bg-card hover:bg-muted/50 px-4 gap-2 text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer h-10">
                <Download className="w-4 h-4" /> Exportar Relatório
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">Exportar como CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlxs')} className="cursor-pointer">Exportar Excel (XLSX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">Exportar como PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-[700px] mb-6 border bg-card">
          <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><BarChart3 className="w-4 h-4" /> Base de Orçamentos</TabsTrigger>
          <TabsTrigger value="ltv" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Users className="w-4 h-4" /> Desempenho de clientes</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><TrendingUp className="w-4 h-4" /> Funil de vendas</TabsTrigger>
        </TabsList>

        {/* ======================= ABA 1: BASE GERAL ======================= */}
        <TabsContent value="geral" className="space-y-6 animate-in fade-in-50">

          {alerts.length > 0 && (
            <div className="space-y-2 mb-4">
              {alerts.map((a) => (
                <Alert key={a.id} variant={a.type as "default" | "destructive" | null | undefined} className="bg-background/80 backdrop-blur-sm shadow-sm py-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 ml-1">
                    <AlertTitle className="text-sm font-semibold mb-0.5">Insight automatizado</AlertTitle>
                    <AlertDescription className="text-xs opacity-90">{a.msg}</AlertDescription>
                    <button
                      onClick={() => setAlertExpandido(alertExpandido === a.id ? null : a.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <HelpCircle className="w-3 h-3" />
                      O que isso significa?
                      {alertExpandido === a.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {alertExpandido === a.id && (
                      <div className="mt-2 p-3 rounded-md bg-background/60 border border-border/60 text-[12px] text-foreground/80 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                        {a.detail}
                      </div>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Block 1: Analise Estratégica Híbrida */}
          {rankingServicos.length > 0 && (
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 animate-in fade-in">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Orçamentos por seguimento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rankingServicos.slice(0, 4).map((srv, idx) => (
                  <div key={idx} className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-[11px] uppercase text-muted-foreground font-bold tracking-wider truncate mb-1">{srv.cat}</p>
                    <p className="text-lg font-bold text-foreground">{currencyFormatter.format(srv.receita)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded font-medium">{srv.qtd} fechados</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Cards - Atualizados com Deltas Temporais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1 */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Volume geral</h4>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-5xl font-medium text-foreground leading-none mb-2">{totalPeriodo}</p>
                <p className="text-xs font-semibold text-muted-foreground">oportunidades</p>
              </div>
              <div className="mt-4 mb-3 h-px bg-border w-3/4"></div>
              {!deltaVolume.isNull && (
                <p className={`text-[10px] flex items-center shrink-0 uppercase tracking-wide font-black ${deltaVolume.trend === 'good' ? 'text-success' : deltaVolume.trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <deltaVolume.icon className="w-3 h-3 mr-1 shrink-0" />
                  {deltaVolume.text} <span className="text-muted-foreground/80 font-medium ml-1 lowercase">últ. pe.</span>
                </p>
              )}
            </div>

            {/* Card 2 */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Conversão</h4>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-5xl font-medium text-foreground leading-none mb-2">{taxaConversao.toFixed(1)}<span className="text-2xl text-foreground/70">%</span></p>
                <p className="text-xs font-semibold text-muted-foreground">{filteredContratados} fechados</p>
              </div>
              <div className="mt-4 mb-3 h-px bg-border w-3/4"></div>
              {!deltaConversao.isNull && (
                <p className={`text-[10px] flex items-center shrink-0 uppercase tracking-wide font-black ${deltaConversao.trend === 'good' ? 'text-success' : deltaConversao.trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <deltaConversao.icon className="w-3 h-3 mr-1 shrink-0" />
                  {deltaConversao.text} <span className="text-muted-foreground/80 font-medium ml-1 lowercase">últ. pe.</span>
                </p>
              )}
            </div>

            {/* Card 3 */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Receita fechada</h4>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-5xl font-medium text-primary leading-none mb-2">{filteredContratados}</p>
                <p className="text-xs font-semibold text-muted-foreground">{currencyFormatter.format(receitaFechada)}</p>
              </div>
              <div className="mt-4 mb-3 h-px bg-border w-3/4"></div>
              {!deltaReceita.isNull && (
                <p className={`text-[10px] flex items-center shrink-0 uppercase tracking-wide font-black ${deltaReceita.trend === 'good' ? 'text-success' : deltaReceita.trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <deltaReceita.icon className="w-3 h-3 mr-1 shrink-0" />
                  {deltaReceita.text} <span className="text-muted-foreground/80 font-medium ml-1 lowercase">últ. pe.</span>
                </p>
              )}
            </div>

            {/* Card 4 */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Ticket médio</h4>
              <div className="flex-1 flex flex-col justify-center mt-2">
                <p className="text-[26px] font-medium text-primary leading-none mb-2 truncate" title={currencyFormatter.format(ticketMedioReal)}>
                  {currencyFormatter.format(ticketMedioReal)}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">por contrato fechado</p>
              </div>
              <div className="mt-4 mb-3 h-px bg-border w-3/4"></div>
              {!deltaTicket.isNull && (
                <p className={`text-[10px] flex items-center shrink-0 uppercase tracking-wide font-black ${deltaTicket.trend === 'good' ? 'text-success' : deltaTicket.trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <deltaTicket.icon className="w-3 h-3 mr-1 shrink-0" />
                  {deltaTicket.text} <span className="text-muted-foreground/80 font-medium ml-1 lowercase">últ. pe.</span>
                </p>
              )}
            </div>

            {/* Card 5 */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-shadow">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Vida Útil</h4>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-5xl font-medium text-foreground leading-none mb-2">{cicloAprovacaoMedio}</p>
                <p className="text-xs font-semibold text-muted-foreground">dias até a contratação</p>
              </div>
              <div className="mt-4 mb-3 h-px bg-border w-3/4"></div>
              {!deltaCiclo.isNull && (
                <p className={`text-[10px] flex items-center shrink-0 uppercase tracking-wide font-black ${deltaCiclo.trend === 'good' ? 'text-success' : deltaCiclo.trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <deltaCiclo.icon className="w-3 h-3 mr-1 shrink-0" />
                  {deltaCiclo.text} <span className="text-muted-foreground/80 font-medium ml-1 lowercase">últ. pe.</span>
                </p>
              )}
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou ID..."
                className="pl-9 bg-background h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-2 bg-background border rounded-md px-3 h-10 shrink-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  className="bg-transparent text-sm outline-none text-foreground w-[150px] cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="enviado">Em negociação</option>
                  <option value="contratado">Contratado</option>
                  <option value="recusado">Recusado</option>
                </select>
              </div>

              {periodoGlobal === "custom" && (
                <div className="flex items-center bg-background border rounded-md h-10 px-3 text-sm focus-within:ring-1 focus-within:ring-primary shrink-0 animate-in fade-in duration-300">
                  <Calendar className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="date"
                    className="bg-transparent outline-none text-muted-foreground cursor-pointer min-w-[110px]"
                    title="Data Inicial"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <span className="mx-2 text-muted-foreground">até</span>
                  <input
                    type="date"
                    className="bg-transparent outline-none text-muted-foreground cursor-pointer min-w-[110px]"
                    title="Data Final"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-left">
                    <th className="py-3 px-4 font-medium text-muted-foreground">Data</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Serviço/Descrição</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Projeção em R$</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 font-medium text-muted-foreground text-center w-[100px]">Ciclo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrcamentos.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum orçamento corresponde aos filtros.</td></tr>
                  ) : (
                    filteredOrcamentos.map((orc) => {
                      const isAging = (orc.status === "pendente" || orc.status === "enviado") && differenceInDays(new Date(), new Date(orc.dataRecebido)) >= 20;
                      const isRecemFechado = orc.status === "contratado" && orc.valor > 0 && differenceInDays(new Date(), new Date(orc.dataFechamento || orc.dataAtualizado)) <= 5;

                      let trClass = "border-b border-border/50 transition-colors ";
                      if (isAging) trClass += "bg-warning/5 hover:bg-warning/15";
                      else if (isRecemFechado) trClass += "bg-success/5 hover:bg-success/10";
                      else trClass += "hover:bg-muted/20";

                      return (
                        <tr key={orc.id} className={trClass}>
                          <td className="py-3 px-4 font-medium text-card-foreground">
                            <span className="block text-foreground">{format(new Date(orc.dataRecebido), "dd/MM/yy", { locale: ptBR })}</span>
                            <span className="block text-[10px] uppercase font-mono text-muted-foreground mt-0.5">{orc.id.split('-')[0]}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-card-foreground whitespace-nowrap">
                            {orc.cliente?.nome || "Desconhecido"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={orc.descricao}>
                            {orc.descricao}
                          </td>
                          <td className="py-3 px-4 font-medium text-card-foreground whitespace-nowrap">
                            {currencyFormatter.format(orc.valor)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <StatusBadge status={orc.status as Status} />
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground text-[12px] font-medium whitespace-nowrap">
                            <span className="bg-muted px-2 py-1 rounded-md">{getDiasNegociacao(orc.dataRecebido, orc.dataAtualizado, orc.status)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ======================= ABA 2: CLTV ======================= */}
        <TabsContent value="ltv" className="space-y-6 animate-in fade-in-50">
          <div className="bg-card p-6 rounded-xl border border-border/50 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Melhores clientes</h3>
              <p className="text-sm text-muted-foreground">O <i>Customer Lifetime Value</i> mostra quais clientes investiram na sua empresa ao longo do tempo.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente na lista..."
                className="pl-9 bg-background"
                value={searchLtv}
                onChange={(e) => setSearchLtv(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-left select-none">
                    <th className="py-3 px-4 font-medium text-muted-foreground w-12 text-center">#</th>
                    <th
                      className="py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors group"
                      onClick={() => requestSort("nome")}
                    >
                      <div className="flex items-center">Cliente {getSortIcon("nome")}</div>
                    </th>
                    <th
                      className="py-3 px-4 font-medium text-muted-foreground text-center cursor-pointer hover:bg-muted/80 transition-colors group"
                      onClick={() => requestSort("totalPedidos")}
                    >
                      <div className="flex items-center justify-center">Total de Pedidos {getSortIcon("totalPedidos")}</div>
                    </th>
                    <th
                      className="py-3 px-4 font-medium text-muted-foreground text-center cursor-pointer hover:bg-muted/80 transition-colors group"
                      onClick={() => requestSort("pedidosGanhos")}
                    >
                      <div className="flex items-center justify-center">Contratos Fechados {getSortIcon("pedidosGanhos")}</div>
                    </th>
                    <th
                      className="py-3 px-4 font-medium text-muted-foreground text-center cursor-pointer hover:bg-muted/80 transition-colors group"
                      onClick={() => requestSort("conversao")}
                    >
                      <div className="flex items-center justify-center">Taxa de Conversão {getSortIcon("conversao")}</div>
                    </th>
                    <th
                      className="py-3 px-4 font-medium text-muted-foreground text-right ring-1 ring-border/50 bg-muted/10 cursor-pointer hover:bg-muted/30 transition-colors group"
                      onClick={() => requestSort("receitaGanha")}
                    >
                      <div className="flex items-center justify-end">Volume de Negócios (R$) {getSortIcon("receitaGanha")}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientPerformance.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Ainda não há clientes com pedidos.</td></tr>
                  ) : (
                    clientPerformance.map((cliente, i) => (
                      <tr
                        key={cliente.id}
                        className={`border-b border-border/50 transition-all ${cliente.pedidosGanhos === 0
                          ? 'opacity-60 bg-muted/10 grayscale-[0.3] hover:opacity-100 hover:grayscale-0'
                          : 'hover:bg-muted/20'
                          }`}
                      >
                        <td className="py-4 px-4 font-semibold text-muted-foreground text-center">{i + 1}º</td>
                        <td className="py-4 px-4 font-bold text-card-foreground">
                          {cliente.nome}
                          {i === 0 && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 font-bold uppercase">Top 1</span>}
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-muted-foreground text-lg">{cliente.totalPedidos}</td>
                        <td className="py-4 px-4 text-center font-medium text-success text-lg">{cliente.pedidosGanhos}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-medium ${cliente.pedidosGanhos === 0 ? 'text-muted-foreground' : 'text-card-foreground'}`}>{cliente.conversao.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${cliente.pedidosGanhos === 0 ? 'bg-muted-foreground/30' : 'bg-primary'}`}
                                style={{ width: `${cliente.conversao}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={`py-2 px-4 text-right ring-1 ring-border/50 ${cliente.pedidosGanhos === 0 ? 'bg-transparent' : 'bg-muted/10'}`}>
                          <div className="flex flex-col items-end justify-center">
                            <span className={cliente.pedidosGanhos === 0 ? "text-muted-foreground font-medium text-sm opacity-80" : "font-bold text-foreground text-base"}>
                              {currencyFormatter.format(cliente.receitaGanha)}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] leading-tight flex items-center gap-1">
                              {currencyFormatter.format(cliente.receitaGerada)} em orçamentos passados
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ======================= ABA 3: PIPELINE ======================= */}
        <TabsContent value="pipeline" className="space-y-6 animate-in fade-in-50">
          <div className="bg-muted/20 p-6 rounded-xl border border-border/50 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <Banknote className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                Receitas
              </h3>
              <p className="text-sm text-muted-foreground">A soma de tudo que está nas suas mãos aguardando negociação.</p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <p className="text-4xl font-black text-foreground drop-shadow-sm">{currencyFormatter.format(pipelineStats.pipelineTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize font-medium">{pipelineStats.emNegociacao.qtd + pipelineStats.pendentes.qtd} negociações abertas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-warning/5 border border-warning/20 p-5 rounded-xl text-center shadow-sm" title="Orçamentos pendentes de contato inicial">
              <h4 className="text-warning font-semibold text-sm mb-2 uppercase tracking-wide">Pendente</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.pendentes.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pipelineStats.pendentes.qtd} oportunidades</p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-xl text-center shadow-sm" title="Propostas ativamente em negociação com clientes">
              <h4 className="text-blue-500 font-semibold text-sm mb-2 uppercase tracking-wide">Em negociação</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.emNegociacao.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pipelineStats.emNegociacao.qtd} aguardando resposta
              </p>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/30 p-5 rounded-xl text-center shadow-sm relative" title="Orçamentos que não avançaram nos últimos 20 dias">
              <div className="absolute -top-2.5 -right-2.5 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">Aging</div>
              <h4 className="text-orange-600 font-semibold text-sm mb-2 uppercase tracking-wide">Congelados</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.estagnados.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{pipelineStats.estagnados.qtd} travados {`>`} 20 dias</p>
            </div>

            <div className="bg-success/5 border border-success/20 p-5 rounded-xl text-center shadow-sm" title="Orçamentos efetivamente ganhos e contratados">
              <h4 className="text-success font-semibold text-sm mb-2 uppercase tracking-wide">Valor fechado</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.ganhos.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1 text-success font-medium">Você fechou {pipelineStats.ganhos.qtd} negócios</p>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 p-5 rounded-xl text-center shadow-sm" title="Orçamentos que os clientes não aprovaram">
              <h4 className="text-destructive font-semibold text-sm mb-2 uppercase tracking-wide">Valor perdido</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.perdidos.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pipelineStats.perdidos.qtd} recusados definitivamente</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border p-6 bg-card">
            <h3 className="text-sm font-semibold mb-6 uppercase text-muted-foreground tracking-wide">Termômetro do funil R$</h3>
            <div className="w-full h-8 rounded-full overflow-hidden flex bg-muted/30 border border-border shadow-inner">
              <div className="bg-warning/80 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.pendentes.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-blue-500 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.emNegociacao.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-success h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.ganhos.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-destructive/60 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.perdidos.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
            </div>
            <div className="flex flex-wrap items-center mt-3 gap-4 text-[11px] font-medium text-muted-foreground justify-center">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-warning/80"></div> Pendente</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Em negociação</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-success"></div> Ganho</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-destructive/60"></div> Recusado</span>
            </div>
          </div>

          {/* Gráfico do Funil 3 Steps (Recharts) */}
          <div className="mt-8 rounded-xl border border-border p-6 bg-card shadow-sm animate-in fade-in">
            <h3 className="text-sm font-semibold mb-6 uppercase text-muted-foreground tracking-wide"> Conversão de orçamentos (Recebido {`>`} Enviado {`>`} Fechado)
            </h3>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { step: "Orçamentos recebidos", qtd: pipelineStats.pendentes.qtd + pipelineStats.emNegociacao.qtd + pipelineStats.ganhos.qtd + pipelineStats.perdidos.qtd, color: "hsl(var(--muted-foreground))" },
                    { step: "Orçamentos enviados", qtd: pipelineStats.emNegociacao.qtd + pipelineStats.ganhos.qtd + pipelineStats.perdidos.qtd, color: "#3b82f6" },
                    { step: "Orçamentos fechados", qtd: pipelineStats.ganhos.qtd, color: "hsl(var(--success))" }
                  ]}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="step" type="category" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }} width={170} />
                  <RechartsTooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  />
                  <Bar dataKey="qtd" barSize={40} radius={[0, 4, 4, 0]}>
                    {
                      [0, 1, 2].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={["hsl(var(--muted-foreground))", "#3b82f6", "hsl(var(--success))"][index]} />
                      ))
                    }
                    <LabelList dataKey="qtd" position="right" style={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 16 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {pipelineStats.pendentes.qtd + pipelineStats.emNegociacao.qtd + pipelineStats.ganhos.qtd + pipelineStats.perdidos.qtd > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Conversão em orçamentos contratados: <span className="font-bold text-foreground">
                  {((pipelineStats.ganhos.qtd / (pipelineStats.pendentes.qtd + pipelineStats.emNegociacao.qtd + pipelineStats.ganhos.qtd + pipelineStats.perdidos.qtd)) * 100).toFixed(1)}%
                </span>
              </p>
            )}
          </div>

          {/* Breakdown de Motivos de Recusa */}
          {pipelineStats.perdidos.qtd > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(pipelineStats.motivosRecusa).sort((a, b) => b[1].qtd - a[1].qtd).map(([motivo, stats], idx) => (
                <div key={idx} className="bg-destructive/5 border border-destructive/10 p-5 rounded-xl shadow-sm text-center">
                  <h4 className="text-destructive font-semibold text-[13px] mb-2 uppercase tracking-wide">{motivo}</h4>
                  <p className="text-xl font-bold text-foreground">{currencyFormatter.format(stats.valor)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.qtd} orçamento{stats.qtd !== 1 ? 's' : ''} perdido{stats.qtd !== 1 ? 's' : ''}</p>
                  <div className="mt-4 bg-muted/30 h-1.5 w-full rounded-full overflow-hidden">
                    <div
                      className="bg-destructive/60 h-full rounded-full"
                      style={{ width: `${(stats.qtd / pipelineStats.perdidos.qtd) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Relatorios;
