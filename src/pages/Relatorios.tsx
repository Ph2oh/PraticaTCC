import { useState, useMemo } from "react";
import { Download, Search, Calendar, Loader, Filter, Users, TrendingUp, BarChart3, Banknote } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useClientes } from "@/hooks/useClientes";
import StatusBadge, { type Status } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, subMonths, endOfDay, isAfter, isBefore } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
  const [periodoGlobal, setPeriodoGlobal] = useState("todos"); // 'mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'todos'

  // Filtros Globais Adicionais 
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchLtv, setSearchLtv] = useState("");

  // Sort State para a Tabela LTV
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientPerformanceEntry;
    direction: "asc" | "desc";
  }>({ key: "receitaGanha", direction: "desc" }); // Padrão: Maior receita real ganha primeiro

  const orcamentosFiltradosGlobalmente = useMemo(() => {
    return orcamentos.filter((orc) => {
      const dataOrc = new Date(orc.dataRecebido);
      let isValidTime = true;
      const hoje = new Date();

      if (periodoGlobal === "mes_atual") {
        isValidTime = dataOrc >= startOfMonth(hoje);
      } else if (periodoGlobal === "ultimos_3_meses") {
        isValidTime = dataOrc >= subMonths(hoje, 3);
      } else if (periodoGlobal === "ultimos_6_meses") {
        isValidTime = dataOrc >= subMonths(hoje, 6);
      } else if (periodoGlobal === "custom") {
        const matchesDateFrom = dateFrom ? dataOrc >= new Date(dateFrom) : true;
        let matchesDateTo = true;
        if (dateTo) {
          matchesDateTo = dataOrc <= endOfDay(new Date(dateTo));
        }
        isValidTime = matchesDateFrom && matchesDateTo;
      }

      return isValidTime;
    });
  }, [orcamentos, periodoGlobal, dateFrom, dateTo]);

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

  const totalPeriodo = filteredOrcamentos.length;
  const filteredContratados = filteredOrcamentos.filter(o => o.status === "contratado").length;
  const taxaConversao = totalPeriodo ? (filteredContratados / totalPeriodo) * 100 : 0;

  const receitaFechada = filteredOrcamentos
    .filter(o => o.status === "contratado")
    .reduce((total, orc) => total + orc.valor, 0);

  const ticketMedio = totalPeriodo
    ? currencyFormatter.format(filteredOrcamentos.reduce((total, orc) => total + orc.valor, 0) / totalPeriodo)
    : currencyFormatter.format(0);

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
      pipelineTotal: 0 // Dinheiro na mesa (pendente + negociacao)
    };

    // Analisa funil baseado no intervalo de tempo global definido
    orcamentosFiltradosGlobalmente.forEach(orc => {
      if (orc.status === "pendente") {
        funil.pendentes.qtd++; funil.pendentes.valor += orc.valor;
        funil.pipelineTotal += orc.valor;
      } else if (orc.status === "enviado") {
        funil.emNegociacao.qtd++; funil.emNegociacao.valor += orc.valor;
        funil.pipelineTotal += orc.valor;
      } else if (orc.status === "contratado") {
        funil.ganhos.qtd++; funil.ganhos.valor += orc.valor;
      } else if (orc.status === "recusado") {
        funil.perdidos.qtd++; funil.perdidos.valor += orc.valor;
      }
    });

    return funil;
  }, [orcamentosFiltradosGlobalmente]);


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

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deep Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise, previsão de faturamento e LTV</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          {/* Seletor Global de Tempo */}
          <div className="flex items-center gap-2 bg-background border rounded-md px-3 h-10 shrink-0">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              className="bg-transparent text-sm outline-none text-foreground w-[160px] cursor-pointer"
              value={periodoGlobal}
              onChange={(e) => {
                setPeriodoGlobal(e.target.value);
                if (e.target.value !== 'custom') {
                  setDateFrom(''); setDateTo('');
                }
              }}
            >
              <option value="todos">Todo o Período</option>
              <option value="mes_atual">Mês Atual</option>
              <option value="ultimos_3_meses">Últimos 3 Meses</option>
              <option value="ultimos_6_meses">Últimos 6 Meses</option>
              <option value="custom">Data Customizada</option>
            </select>
          </div>

          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md h-10 hover:opacity-90 transition-opacity">
            <Download className="w-4 h-4" /> Exportar Relatório
          </button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-[700px] mb-6 border bg-card">
          <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><BarChart3 className="w-4 h-4" /> Base de Orçamentos</TabsTrigger>
          <TabsTrigger value="ltv" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Users className="w-4 h-4" /> Desempenho de Clientes</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><TrendingUp className="w-4 h-4" /> Funil & Pipeline</TabsTrigger>
        </TabsList>

        {/* ======================= ABA 1: BASE GERAL ======================= */}
        <TabsContent value="geral" className="space-y-6 animate-in fade-in-50">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <p className="text-sm text-muted-foreground">Volume</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">{totalPeriodo}</p>
              <p className="text-xs text-muted-foreground mt-1">orçamentos</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <p className="text-sm text-muted-foreground">Conversão</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">{taxaConversao.toFixed(1)}%</p>
              <p className="text-xs text-success mt-1">{filteredContratados} contratos fechado</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <p className="text-sm text-muted-foreground">Receita Fechada</p>
              <p className="text-3xl font-bold text-success mt-1">{currencyFormatter.format(receitaFechada)}</p>
              <p className="text-xs text-muted-foreground mt-1">faturamento</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <p className="text-sm text-muted-foreground">Receita Projetada</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">{ticketMedio}</p>
              <p className="text-xs text-muted-foreground mt-1">estimativa de faturamento</p>
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
                  <option value="enviado">Em Negociação</option>
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
                    filteredOrcamentos.map((orc) => (
                      <tr key={orc.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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
                    ))
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
              <h3 className="text-lg font-semibold text-foreground mb-1">Melhores Clientes</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-warning/5 border border-warning/20 p-5 rounded-xl text-center shadow-sm" title="Orçamentos pendentes de contato inicial">
              <h4 className="text-warning font-semibold text-sm mb-2 uppercase tracking-wide">Pendente</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.pendentes.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pipelineStats.pendentes.qtd} oportunidades</p>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-xl text-center shadow-sm" title="Propostas ativamente em negociação com clientes">
              <h4 className="text-blue-500 font-semibold text-sm mb-2 uppercase tracking-wide">Em Negociação</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.emNegociacao.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pipelineStats.emNegociacao.qtd} aguardando resposta
              </p>
            </div>

            <div className="bg-success/5 border border-success/20 p-5 rounded-xl text-center shadow-sm" title="Orçamentos efetivamente ganhos e contratados">
              <h4 className="text-success font-semibold text-sm mb-2 uppercase tracking-wide">Valor Fechado</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.ganhos.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1 text-success font-medium">Você fechou {pipelineStats.ganhos.qtd} negócios</p>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 p-5 rounded-xl text-center shadow-sm relative overflow-hidden" title="Orçamentos que os clientes não aprovaram">
              <h4 className="text-destructive font-semibold text-sm mb-2 uppercase tracking-wide">Valor Perdido</h4>
              <p className="text-2xl font-bold text-foreground">{currencyFormatter.format(pipelineStats.perdidos.valor)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pipelineStats.perdidos.qtd} recusados permanentemente</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border p-6 bg-card">
            <h3 className="text-sm font-semibold mb-6 uppercase text-muted-foreground tracking-wide">Termômetro do Funil R$</h3>
            <div className="w-full h-8 rounded-full overflow-hidden flex bg-muted/30 border border-border shadow-inner">
              <div className="bg-warning/80 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.pendentes.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-blue-500 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.emNegociacao.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-success h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.ganhos.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
              <div className="bg-destructive/60 h-full transition-all group relative cursor-pointer" style={{ width: `${(pipelineStats.perdidos.valor / Math.max(pipelineStats.pipelineTotal + pipelineStats.ganhos.valor + pipelineStats.perdidos.valor, 1)) * 100}%` }}></div>
            </div>
            <div className="flex flex-wrap items-center mt-3 gap-4 text-[11px] font-medium text-muted-foreground justify-center">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-warning/80"></div> Pendente</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Em Negociação</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-success"></div> Ganho</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-destructive/60"></div> Recusado</span>
            </div>
          </div>

        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Relatorios;
