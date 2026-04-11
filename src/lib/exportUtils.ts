import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ResumoExportacao {
  totalOrcamentos: number;
  receitaFechada: number;
  ticketMedio: number;
  taxaConversao: string;
}

export interface ClienteLTVExportacao {
  nome: string;
  pedidosFechados: number;
  receitaGerada: number;
  ultimaAtividade: Date | string;
}

export interface OrcamentoPipelineExportacao {
  id: string;
  cliente: string;
  descricao: string;
  status: string;
  valor: number;
  dataRecebido: Date | string;
  dataFechamento?: Date | string | null;
}

export interface DadosExportacao {
  periodo: string;
  resumo: ResumoExportacao;
  clientes: ClienteLTVExportacao[];
  pipeline: OrcamentoPipelineExportacao[];
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// -------------------------------------------------------------
// EXCEL (XLSX) EXPORT
// -------------------------------------------------------------
export const exportarExcel = (dados: DadosExportacao, nomeArquivo = 'Relatorio_DeepAnalytics') => {
  const wb = XLSX.utils.book_new();

  // 1. Aba Resumo
  const resumoSheetData = [
    ["Resumo de Desempenho", dados.periodo],
    [],
    ["Métrica", "Valor"],
    ["Oportunidades Recebidas", dados.resumo.totalOrcamentos],
    ["Receita Fechada", currencyFmt.format(dados.resumo.receitaFechada)],
    ["Ticket Médio", currencyFmt.format(dados.resumo.ticketMedio)],
    ["Taxa de Conversão", dados.resumo.taxaConversao],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoSheetData);
  // Styling adjustments for columns (basic width)
  wsResumo['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Executivo");

  // 2. Aba Clientes (LTV)
  const ltvSheetData = dados.clientes.map(c => ({
    "Nome do Cliente": c.nome,
    "Contratos Fechados": c.pedidosFechados,
    "Receita Gerada (LTV)": c.receitaGerada, // Mantém numérico para uso nativo no Excel
    "Última Atividade": c.ultimaAtividade instanceof Date ? format(c.ultimaAtividade, 'dd/MM/yyyy') : format(new Date(c.ultimaAtividade), 'dd/MM/yyyy')
  }));
  const wsLTV = XLSX.utils.json_to_sheet(ltvSheetData);
  wsLTV['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsLTV, "Radar de Clientes");

  // 3. Aba Funil (Pipeline Raw)
  const pipelineSheetData = dados.pipeline.map(o => {
    let statusMapped = o.status;
    switch (o.status) {
      case 'pendente': statusMapped = 'Pendente'; break;
      case 'enviado': statusMapped = 'Em Negociação'; break;
      case 'contratado': statusMapped = 'Contratado'; break;
      case 'recusado': statusMapped = 'Recusado/Perdido'; break;
    }

    return {
      "ID Orçamento": o.id,
      "Cliente": o.cliente,
      "Serviço/Descrição": o.descricao,
      "Status Atual": statusMapped,
      "Valor Orçado": o.valor,
      "Data do Pedido": o.dataRecebido instanceof Date ? format(o.dataRecebido, 'dd/MM/yyyy') : format(new Date(o.dataRecebido), 'dd/MM/yyyy'),
      "Data Fechamento": o.dataFechamento ? (o.dataFechamento instanceof Date ? format(o.dataFechamento, 'dd/MM/yyyy') : format(new Date(o.dataFechamento), 'dd/MM/yyyy')) : "-"
    };
  });
  const wsPipeline = XLSX.utils.json_to_sheet(pipelineSheetData);
  wsPipeline['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 40 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPipeline, "Pipeline Bruto");

  // Escrever arquivo
  XLSX.writeFile(wb, `${nomeArquivo}_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`);
};


// -------------------------------------------------------------
// PDF EXPORT
// -------------------------------------------------------------
export const exportarPDF = (dados: DadosExportacao, nomeArquivo = 'Relatorio_DeepAnalytics') => {
  // Configurado para modo Paisagem (landscape) e papel A4
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const primaryColor = [59, 130, 246]; // Azul Tailwind (text-blue-500 equivalent) para headers

  // Cabeçalho Principal do Relatório
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // text-slate-800
  doc.text('Relatório Deep Analytics (SGO)', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // text-slate-500
  doc.text(`Período analisado: ${dados.periodo}`, 40, 56);
  doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 40, 68);

  let currentY = 100;

  // -- CAPÍTULO 1: RESUMO EXEC --
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Resumo Executivo', 40, currentY);
  currentY += 15;

  autoTable(doc, {
    startY: currentY,
    head: [['Oportunidades Inseridas', 'Receita Fechada', 'Ticket Médio', 'Conversão (Vitórias)']],
    body: [[
      dados.resumo.totalOrcamentos.toString(),
      currencyFmt.format(dados.resumo.receitaFechada),
      currencyFmt.format(dados.resumo.ticketMedio),
      dados.resumo.taxaConversao
    ]],
    theme: 'grid',
    headStyles: { fillColor: primaryColor as [number, number, number] },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 40;

  // -- CAPÍTULO 2: RADAR DE CLIENTES (LTV TOP 10) --
  // Limita a tabela de LTV aos 10 melhores para não alongar absurdamente o PDF caso existam milhares
  const melhoresLtv = dados.clientes.slice(0, 10);
  if (melhoresLtv.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Clientes (LTV)', 40, currentY);
    currentY += 15;

    autoTable(doc, {
      startY: currentY,
      head: [['Nome', 'Contratos', 'Lifetime Value', 'Última Atividade']],
      body: melhoresLtv.map(c => [
        c.nome,
        c.pedidosFechados.toString(),
        currencyFmt.format(c.receitaGerada),
        c.ultimaAtividade instanceof Date ? format(c.ultimaAtividade, 'dd/MM/yyyy') : format(new Date(c.ultimaAtividade), 'dd/MM/yyyy')
      ]),
      theme: 'grid',
      headStyles: { fillColor: primaryColor as [number, number, number] },
      margin: { left: 40, right: 40 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 40;
  }

  // Verifica se a tabela de Pipeline vai estourar a página. Adiciona nova se precisar.
  if (currentY > 400) {
    doc.addPage();
    currentY = 40;
  }

  // -- CAPÍTULO 3: PIPELINE EFETIVO --
  const pipelineResumido = dados.pipeline.map(o => {
    let statusMapped = o.status;
    switch (o.status) {
      case 'pendente': statusMapped = 'Pendente'; break;
      case 'enviado': statusMapped = 'Em Negociação'; break;
      case 'contratado': statusMapped = 'Contratado'; break;
      case 'recusado': statusMapped = 'Recusado/Perdido'; break;
    }
    return [
      o.id.substring(0, 7), // ID curto
      o.cliente,
      o.descricao.length > 60 ? o.descricao.substring(0, 57) + '...' : o.descricao, // truncate
      currencyFmt.format(o.valor),
      statusMapped,
      o.dataRecebido instanceof Date ? format(o.dataRecebido, 'dd/MM/yyyy') : format(new Date(o.dataRecebido), 'dd/MM/yyyy')
    ];
  });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Acompanhamento Geral (Pipeline Selecionado)', 40, currentY);
  currentY += 15;

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Cliente', 'Serviço Solicitado', 'Valor (R$)', 'Status Atual', 'Data de Entrada']],
    body: pipelineResumido,
    theme: 'grid',
    headStyles: { fillColor: primaryColor as [number, number, number] },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 150 },
      2: { cellWidth: 320 },
    }
  });

  doc.save(`${nomeArquivo}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
};

// -------------------------------------------------------------
// CSV EXPORT (Apenas o Pipeline cru + informações atreladas para versatilidade)
// -------------------------------------------------------------
export const exportarCSV = (dados: DadosExportacao, nomeArquivo = 'Relatorio_DeepAnalytics') => {
  // Apesar de Excel ser multi-aba, CSV carrega 1 dataset principal. 
  // Faremos o merge do CSV contendo a fotografia principal que é o Pipeline (incluindo header que mostra o período).

  const separator = ';';
  const csvFormatStr = (str: string) => `"${str.replace(/"/g, '""')}"`;

  let csvContent = '\uFEFF'; // BOM para garantir UTF-8 no Excel automático

  // Contexto Metadados no Topo
  csvContent += `PERIODO ANALISADO${separator}${csvFormatStr(dados.periodo)}\r\n`;
  csvContent += `\r\n`;
  csvContent += `OPORTUNIDADES (FUNIL E PERFORMANCE)\r\n`;

  // Headers do Dataframe
  const headers = ['ID do Orçamento', 'Nome do Cliente', 'Descricao', 'Status no Funil', 'Valor (R$)', 'Data Recebido', 'Data Fechamento'];
  csvContent += headers.join(separator) + '\r\n';

  // Body Rows
  for (const o of dados.pipeline) {
    let statusMapped = o.status;
    switch (o.status) {
      case 'pendente': statusMapped = 'Pendente'; break;
      case 'enviado': statusMapped = 'Em Negociação'; break;
      case 'contratado': statusMapped = 'Contratado'; break;
      case 'recusado': statusMapped = 'Recusado/Perdido'; break;
    }

    const dtRec = o.dataRecebido instanceof Date ? format(o.dataRecebido, 'dd/MM/yyyy') : format(new Date(o.dataRecebido), 'dd/MM/yyyy');
    const dtFec = o.dataFechamento ? (o.dataFechamento instanceof Date ? format(o.dataFechamento, 'dd/MM/yyyy') : format(new Date(o.dataFechamento), 'dd/MM/yyyy')) : "N/D";

    const row = [
      o.id,
      csvFormatStr(o.cliente),
      csvFormatStr(o.descricao.replace(/\n|\r/g, ' ')), // Wipe newlines
      statusMapped,
      o.valor.toString().replace('.', ','), // Brazilian localization for csv reading
      dtRec,
      dtFec
    ];
    csvContent += row.join(separator) + '\r\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${nomeArquivo}_${format(new Date(), 'ddMMyyyy_HHmm')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
