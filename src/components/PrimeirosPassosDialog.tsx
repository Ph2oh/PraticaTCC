import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    TrendingUp,
    ArrowRight,
    PieChart,
    X,
    Rocket,
    ClipboardList,
    Send,
    MessageSquare,
    Users,
    XCircle,
    AlertTriangle,
    FolderSearch,
    User,
    Star,
    MessageCircle,
    SearchX,
    MessageSquareDashed,
    MousePointerClick,
    ArrowLeft,
    FileText
} from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";

// Refatorado o conteudo visual do modal para adotar uma UI/UX inspirada em onboarding
// de aplicativos, com prioridade para representacoes graficas na parte superior e textos na inferior.
// Agora contem os conteudos detalhados sobre as praticas do sistema.

declare global {
    interface Window {
        onOpenPrimeirosPassos?: () => void;
    }
}

export function PrimeirosPassosDialog() {
    const [open, setOpen] = useState(false);
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        dragFree: false,
        containScroll: "trimSnaps"
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeStatusDesc, setActiveStatusDesc] = useState<"pendente" | "enviado" | "contratado" | null>("pendente");

    // Estados animados para ilustrações dinâmicas
    const [animatedMetric, setAnimatedMetric] = useState(30);
    const [chatMessages, setChatMessages] = useState<number[]>([1]);
    const [isLaunching, setIsLaunching] = useState(false);
    const [isFastForward, setIsFastForward] = useState(false);
    const [documentStatusColor, setDocumentStatusColor] = useState<"pendente" | "enviado" | "contratado">("pendente");

    const colorTimerRef = useRef<NodeJS.Timeout>();
    const cycleIntervalRef = useRef<NodeJS.Timeout>();

    const startCycle = useCallback(() => {
        if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = setInterval(() => {
            setActiveStatusDesc(prev => {
                const next = prev === 'pendente' ? 'enviado' : prev === 'enviado' ? 'contratado' : 'pendente';
                if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
                colorTimerRef.current = setTimeout(() => setDocumentStatusColor(next), 3800);
                return next;
            });
        }, 7000);
    }, []);

    const handleStatusClick = useCallback((status: "pendente" | "enviado" | "contratado") => {
        if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
        setIsFastForward(true);
        setActiveStatusDesc(status);

        colorTimerRef.current = setTimeout(() => {
            setDocumentStatusColor(status);
            setIsFastForward(false);
        }, 1000);

        startCycle(); // Reinicia o ciclo automático pra evitar colisão imediata com cliques
    }, [startCycle]);

    // Lógica para variar as métricas, os chats caindo de cima, e o documento pulando
    useEffect(() => {
        if (!open) {
            setIsLaunching(false);
            if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
            if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
            return;
        }

        const metricInterval = setInterval(() => {
            setAnimatedMetric(prev => {
                if (prev === 30) return 65;
                if (prev === 65) return 85;
                return 30;
            });
        }, 2200);

        const chatInterval = setInterval(() => {
            setChatMessages(prev => {
                if (prev.length >= 3) return [1];
                return [...prev, prev.length + 1];
            });
        }, 1600);

        startCycle(); // Inicia auto-cycle seguro

        return () => {
            clearInterval(metricInterval);
            clearInterval(chatInterval);
            if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
            if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
        };
    }, [open, startCycle]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect]);

    useEffect(() => {
        window.onOpenPrimeirosPassos = () => setOpen(true);
        return () => {
            window.onOpenPrimeirosPassos = undefined;
        };
    }, []);

    const next = () => emblaApi && emblaApi.scrollNext();
    const prev = () => emblaApi && emblaApi.scrollPrev();

    const slides = [
        {
            title: "O fim da DESORGANIZAÇÃO",
            description: "Sem um sistema, pedidos se perdem no WhatsApp e não há como medir resultados. O SGO foi criado para resolver a falta de controle comercial.",
            content: (
                <div className="flex justify-center py-6">
                    <div className="relative w-64 md:w-72 h-44 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/50 flex items-center justify-center shadow-sm">
                        <div className="absolute top-6 left-8 animate-pulse text-red-500/70" style={{ animationDuration: '3s' }}>
                            <XCircle className="w-8 h-8" />
                        </div>
                        <div className="absolute bottom-8 right-8 text-orange-400/50 animate-bounce" style={{ animationDuration: '4s' }}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="w-24 h-24 bg-white dark:bg-muted rounded-2xl shadow-md border flex items-center justify-center relative translate-x-4 z-10 transition-transform hover:scale-110" style={{ animation: 'pulse 5s infinite' }}>
                            <FolderSearch className="w-10 h-10 text-red-500 transition-transform hover:scale-110" />
                        </div>
                        <div className="w-20 h-20 bg-background/80 rounded-2xl shadow-sm border flex items-center justify-center absolute left-10 top-10 -rotate-12 backdrop-blur-sm transition-transform hover:-translate-y-3" style={{ animation: 'pulse 6s infinite' }}>
                            <MessageSquareDashed className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "A base: O ORÇAMENTO",
            description: "No sistema, cada pedido de cliente vira um Card de orçamento. Ele centraliza dados, valores e em qual etapa exata a negociação está.",
            content: (
                <div className="flex justify-center py-6">
                    <div className="relative w-64 md:w-72 h-44 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/50 flex items-center justify-center shadow-sm">
                        <div className="w-48 h-28 bg-white dark:bg-muted rounded-2xl shadow-lg border flex flex-col p-4 gap-3 z-10 transition-transform hover:scale-105">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                                    <User className="w-3 h-3 text-amber-600" />
                                </div>
                                <div className="w-20 h-2.5 bg-muted-foreground/20 rounded-full" />
                            </div>
                            <div className="w-full h-2 bg-muted-foreground/10 rounded-full" />
                            <div className="w-3/4 h-2 bg-muted-foreground/10 rounded-full" />
                            <div className="mt-auto flex justify-between">
                                <div className="w-16 h-4 bg-amber-100/50 rounded" />
                                <div className="w-12 h-4 bg-green-100 rounded" />
                            </div>
                        </div>
                        <div className="absolute -top-3 -right-2 bg-amber-500 text-white rounded-full p-2 shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                            <Star className="w-5 h-5" />
                        </div>
                        <div className="absolute bottom-4 left-6 w-3 h-3 rounded-full bg-amber-300" />
                    </div>
                </div>
            )
        },
        {
            title: "Captação e automação",
            description: "Crie orçamentos manualmente, ou plugue a integração com WhatsApp. Ao conectar, novos pedidos entram como rascunhos direto na fila central.",
            content: (
                <div className="flex justify-center py-6">
                    <div className="relative w-64 md:w-72 h-44 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shadow-sm gap-2 sm:gap-4 px-4 overflow-hidden">
                        <div className="bg-white dark:bg-background p-3 rounded-2xl shadow-lg border z-20 animate-bounce shrink-0" style={{ animationDuration: '2s' }}>
                            <MessageCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <ArrowRight className="w-6 h-6 text-emerald-400 animate-pulse shrink-0" style={{ animationDuration: '1.5s' }} />
                        <div className="w-28 h-32 bg-white dark:bg-muted rounded-xl shadow-inner border flex flex-col p-2 overflow-hidden relative shrink-0">
                            {/* Static overlay styling to mask entries cleanly */}
                            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white dark:from-muted z-10 pointer-events-none" />
                            <div className="flex flex-col gap-2 w-full justify-end flex-1 pb-1">
                                {chatMessages.map((msg, i) => (
                                    <div key={`${msg}-${i}`} className="w-full shrink-0 h-7 bg-emerald-100/50 dark:bg-emerald-900/20 rounded border border-emerald-200/50 flex items-center px-2 relative animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                        <div className="w-10 h-1.5 bg-emerald-600/30 rounded-full ml-2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "",
            description: "",
            content: (
                <div className="flex flex-col items-center justify-start w-full min-h-[300px]">
                    {/* Título dinâmico posicionado ACIMA do conteúdo apenas para este slide */}
                    <div className="text-center mb-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            O ciclo de vida do Orçamento
                        </h2>
                        <p className="text-muted-foreground sm:text-[15px] max-w-[450px] mx-auto leading-relaxed">
                            <strong> Todo NOVO ORÇAMENTO é gerado como PENDENTE.</strong>
                            <br />
                            Clique nos ícones da trilha abaixo e veja como funciona o ciclo de vida dos orçamentos:
                            <br />
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 sm:gap-6 relative z-10 mb-4 w-fit mx-auto mt-10 px-2">

                        {/* Rastro tracejado SVG em arco */}
                        <div className="absolute top-0 left-0 w-full h-[60px] -translate-y-[15px] pointer-events-none z-0">
                            <svg className="w-full h-full text-muted-foreground/50 opacity-60" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M 16,80 Q 33,-20 50,80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"
                                    className="transition-all ease-in-out"
                                    style={{
                                        transitionDuration: isFastForward ? '1s' : '4s',
                                        opacity: (activeStatusDesc === 'enviado' || activeStatusDesc === 'pendente') ? 1 : 0,
                                        clipPath: activeStatusDesc === 'pendente' ? 'polygon(0% -50%, 0% -50%, 0% 150%, 0% 150%)' : 'polygon(0% -50%, 100% -50%, 100% 150%, 0% 150%)'
                                    }}
                                />
                                <path d="M 50,80 Q 67,-20 84,80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"
                                    className="transition-all ease-in-out"
                                    style={{
                                        transitionDuration: isFastForward ? '1s' : '4s',
                                        opacity: activeStatusDesc === 'contratado' ? 1 : 0,
                                        clipPath: activeStatusDesc === 'contratado' ? 'polygon(0% -50%, 100% -50%, 100% 150%, 0% 150%)' : 'polygon(0% -50%, 0% -50%, 0% 150%, 0% 150%)'
                                    }}
                                />
                            </svg>
                        </div>

                        {/* Ícone flutuante do Documento Pulando sobre as colunas DE FORMA LENTA */}
                        <div className={cn(
                            "absolute z-30 transition-all ease-in-out pointer-events-none drop-shadow-xl",
                            activeStatusDesc === 'pendente' && "left-[14%] sm:left-[16%] -top-8 -translate-x-1/2 scale-100",
                            activeStatusDesc === 'enviado' && "left-1/2 -top-12 -translate-x-1/2 scale-110",
                            activeStatusDesc === 'contratado' && "left-[86%] sm:left-[84%] -top-8 -translate-x-1/2 scale-95"
                        )} style={{ transitionDuration: isFastForward ? '1s' : '4s' }}>
                            <div className={cn("bg-background/90 backdrop-blur-sm rounded-lg p-2 border shadow-lg transition-colors duration-200", documentStatusColor === 'pendente' ? "border-amber-400/40" : documentStatusColor === 'enviado' ? "border-blue-400/40" : "border-success/40")}>
                                <FileText className={cn("w-5 h-5 transition-colors duration-200", documentStatusColor === 'pendente' ? "text-amber-500" : documentStatusColor === 'enviado' ? "text-blue-500" : "text-success")} />
                            </div>
                        </div>

                        <div
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => handleStatusClick('pendente')}
                        >
                            <div className={cn("w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center shadow-sm relative transition-all", activeStatusDesc === 'pendente' ? "bg-amber-100 dark:bg-amber-950/50 border-amber-400 ring-4 ring-amber-500/20 scale-110" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:-translate-y-1")}>
                                <ClipboardList className={cn("w-5 h-5 sm:w-6 sm:h-6 text-amber-500")} />
                            </div>
                            <span className={cn("text-[10px] sm:text-xs font-semibold mt-1", activeStatusDesc === 'pendente' ? "text-amber-600 dark:text-amber-400" : "text-amber-600/70 dark:text-amber-400/70")}>Pendente</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                        <div
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => handleStatusClick('enviado')}
                        >
                            <div className={cn("w-14 h-14 sm:w-20 sm:h-20 border rounded-2xl flex items-center justify-center shadow-sm relative transition-all", activeStatusDesc === 'enviado' ? "bg-blue-100 dark:bg-blue-900/50 border-blue-400 ring-4 ring-blue-500/20 scale-110" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:-translate-y-1")}>
                                <Send className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                            </div>
                            <span className={cn("text-[10px] sm:text-xs font-semibold mt-1", activeStatusDesc === 'enviado' ? "text-blue-600 dark:text-blue-400" : "text-blue-600/70 dark:text-blue-400/70")}>Enviado</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                        <div
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => handleStatusClick('contratado')}
                        >
                            <div className={cn("w-14 h-14 sm:w-20 sm:h-20 border rounded-2xl flex items-center justify-center shadow-sm relative transition-all", activeStatusDesc === 'contratado' ? "bg-success/20 border-success/50 ring-4 ring-success/20 scale-110" : "bg-success/10 border-success/20 hover:-translate-y-1")}>
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                            </div>
                            <span className={cn("text-[10px] sm:text-xs font-semibold mt-1", activeStatusDesc === 'contratado' ? "text-success" : "text-success/70")}>Contratado</span>
                        </div>
                    </div>

                    <div className="min-h-[120px] w-full max-w-[500px] relative">
                        {activeStatusDesc === 'pendente' && (
                            <div className="relative overflow-hidden bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 p-5 rounded-2xl text-left animate-in fade-in slide-in-from-top-4 duration-500 w-full shadow-lg shadow-amber-500/5">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
                                    <ClipboardList className="w-32 h-32 text-amber-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-amber-100 dark:bg-amber-500/20 p-1.5 rounded-lg text-amber-600 dark:text-amber-400">
                                            <ClipboardList className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[15px] font-bold text-amber-700 dark:text-amber-300">Orçamento: Pendente</h3>
                                    </div>
                                    <p className="text-[13px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed pl-1">
                                        O orçamento acabou de chegar. Calculou seu valor e mandou a proposta pelo WhatsApp? <strong className="text-amber-900 dark:text-amber-100">Arraste o card</strong> para a coluna <span className="text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200/50">Enviado</span> na sua tela de orçamentos.
                                    </p>
                                </div>
                            </div>
                        )}
                        {activeStatusDesc === 'enviado' && (
                            <div className="relative overflow-hidden bg-blue-50/30 dark:bg-blue-950/10 border border-blue-200/60 dark:border-blue-900/40 p-5 rounded-2xl text-left animate-in fade-in slide-in-from-top-4 duration-500 w-full shadow-lg shadow-blue-500/5">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
                                    <Send className="w-32 h-32 text-blue-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-blue-100 dark:bg-blue-500/20 p-1.5 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Send className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[15px] font-bold text-blue-700 dark:text-blue-300">Orçamento: Enviado</h3>
                                    </div>
                                    <p className="text-[13px] text-blue-800/80 dark:text-blue-200/80 leading-relaxed pl-1">
                                        Sua proposta está sendo avaliada. O cliente disse "sim" e vai fechar o serviço com você? <strong className="text-blue-900 dark:text-blue-100">Arraste o seu card</strong> e solte lá na coluna <span className="text-success font-semibold bg-success/10 px-1.5 py-0.5 rounded border border-success/20">Contratado</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                        {activeStatusDesc === 'contratado' && (
                            <div className="relative overflow-hidden bg-success/5 border border-success/30 p-5 rounded-2xl text-left animate-in fade-in slide-in-from-top-4 duration-500 w-full shadow-lg shadow-success/5">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-success" />
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
                                    <CheckCircle2 className="w-32 h-32 text-success" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-success/20 p-1.5 rounded-lg text-success">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[15px] font-bold text-success">Orçamento: Contratado</h3>
                                    </div>
                                    <p className="text-[13px] text-success/90 dark:text-success/90 leading-relaxed pl-1">
                                        Negócio fechado! Quando você solta o card aqui nesta coluna, a ferramenta <strong className="text-success">calcula aquele valor instantaneamente</strong> e o soma, trazendo as métricas de faturamento e lucro!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            title: "Entenda as métricas",
            description: "Se entram 10 pedidos, 3 fecham e 7 recusam, o sistema entende tudo sozinho: revela na hora a conversão de 30%, o faturamento gerado e sua noção de perdas.",
            content: (
                <div className="flex justify-center py-4">
                    <div className="relative w-64 md:w-72 h-48 bg-purple-50 dark:bg-purple-950/20 rounded-[2rem] border border-purple-100 dark:border-purple-900/50 flex items-center justify-center shadow-sm">
                        <div className="flex items-end gap-3 md:gap-4 h-24 mt-6">
                            <div className="w-8 md:w-10 bg-purple-200 dark:bg-purple-900/50 rounded-t-xl transition-all ease-in-out" style={{ height: `${animatedMetric - 12}%`, transitionDuration: '1.5s' }} />
                            <div className="w-8 md:w-10 bg-purple-300 dark:bg-purple-700/50 rounded-t-xl transition-all ease-in-out" style={{ height: `${animatedMetric - 5}%`, transitionDuration: '1.5s' }} />
                            <div className="w-8 md:w-10 bg-purple-500 dark:bg-purple-500 rounded-t-xl shadow-lg relative transition-all ease-in-out" style={{ height: `${animatedMetric + 5}%`, transitionDuration: '1.5s' }}>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-success rounded-full border-2 border-background animate-pulse" />
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-background text-xs font-bold px-2 py-1 rounded-md shadow-md border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-300 transition-all duration-300">
                                    {animatedMetric}%
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-6 right-6 bg-background rounded-full p-2.5 shadow-lg border group flex items-center justify-center">
                            {/* Gráfico Donut de Pizza Suave */}
                            <div className="relative flex items-center justify-center w-8 h-8">
                                <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                                    {/* Fundo do Donut */}
                                    <path className="text-purple-100 dark:text-purple-900/50" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    {/* Preenchimento Dinâmico do Donut */}
                                    <path className="text-purple-500 transition-all ease-in-out" style={{ transitionDuration: '1.5s' }} strokeDasharray={`${animatedMetric + 15}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                                {/* Porcentagem Centralizada */}
                                <div className="absolute inset-0 flex items-center justify-center pb-0.5">
                                    <span className="text-[7.5px] font-extrabold text-purple-700 dark:text-purple-300 transition-all" style={{ transitionDuration: '1.5s' }}>{animatedMetric + 15}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-6 left-6 bg-background rounded-full p-2.5 shadow-lg border animate-bounce" style={{ animationDuration: '3s' }}>
                            <TrendingUp className="w-4 h-4 text-success" />
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-success text-white text-[9px] font-bold px-1.5 rounded-sm transition-all duration-700">+{3 * (Math.floor(animatedMetric / 10))}</div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Descubra onde estão os gargalos",
            description: "Por que as pessoas desistem? Durante a recusa, anote o motivo real (Preço, sem retorno, etc). Depois identifique o erro dominante nos seus relatórios e corrija abordagens.",
            content: (
                <div className="flex justify-center py-6">
                    <div className="relative w-64 md:w-72 h-44 bg-rose-50 dark:bg-rose-950/20 rounded-[2rem] border border-rose-100 dark:border-rose-900/50 flex items-center justify-center shadow-sm">
                        <div className="absolute -top-4 bg-rose-500 text-white rounded-xl px-3 py-1.5 shadow-lg text-[11px] font-bold flex items-center gap-1.5 z-20">
                            <SearchX className="w-3.5 h-3.5" /> FATOR: PREÇO
                        </div>
                        <div className="w-44 h-28 bg-white dark:bg-muted rounded-2xl shadow-md border overflow-hidden flex flex-col mt-6">
                            <div className="flex-1 flex items-end justify-center gap-3 p-4 pb-0">
                                <div className="w-8 bg-muted-foreground/20 rounded-t transition-all" style={{ height: `${20 + (animatedMetric / 5)}%`, transitionDuration: '1.5s' }} />
                                <div className="w-8 bg-rose-400 rounded-t relative shadow-inner transition-all" style={{ height: `${100 - animatedMetric}%`, transitionDuration: '1.5s' }}>
                                    <div className="absolute -top-5 w-full text-center text-[10px] font-bold text-rose-500 opacity-90 transition-all duration-300">{100 - animatedMetric}%</div>
                                </div>
                                <div className="w-8 bg-muted-foreground/20 rounded-t transition-all" style={{ height: `${30 + (animatedMetric / 4)}%`, transitionDuration: '1.5s' }} />
                            </div>
                        </div>
                        <div className="absolute bottom-6 -right-2 bg-background p-2.5 rounded-full shadow-lg border animate-pulse" style={{ animationDuration: '3s' }}>
                            <Users className="w-4 h-4 text-rose-400" />
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Comece agora",
            description: "Ação inicial: crie alguns orçamentos fictícios na plataforma. Mova-os pelas colunas para fixar o funcionamento visualizando seu dashboard gerar gráficos reais.",
            content: (
                <div className="flex justify-center py-6 overflow-visible">
                    <div className={cn("w-32 h-32 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center relative shadow-inner border border-blue-100 dark:border-blue-900/50 transition-all duration-700", isLaunching ? "opacity-0 scale-50" : "opacity-100")}>
                        <div className="absolute inset-0 rounded-full bg-blue-100/50 dark:bg-blue-500/5 animate-pulse" />
                        <Rocket className={cn("w-14 h-14 text-blue-600 dark:text-blue-400 relative transition-all ease-in-out", isLaunching ? "translate-x-[30vw] -translate-y-[40vh] scale-150 rotate-[45deg] opacity-0" : "hover:-translate-y-2 hover:scale-110 z-10")} style={{ transitionDuration: '1.5s' }} />

                        {isLaunching && (
                            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                                <div className="w-16 h-16 bg-orange-400 blur-2xl animate-pulse rounded-full opacity-60" />
                            </div>
                        )}

                        <div className="absolute -top-2 right-2 w-4 h-4 rounded-full bg-amber-400 shadow-sm" />
                        <div className="absolute bottom-4 -left-2 w-3 h-3 rounded-full bg-purple-400 shadow-sm" />
                        <div className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-green-400" />
                    </div>
                </div>
            )
        }
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden border-none bg-card shadow-2xl flex flex-col">
                <style>{`
                    @keyframes barPulse1 { 0%, 100% { height: 40%; } 50% { height: 45%; } }
                    @keyframes barPulse2 { 0%, 100% { height: 60%; } 50% { height: 75%; } }
                    @keyframes barPulse3 { 0%, 100% { height: 90%; transform: translateY(0); } 50% { height: 100%; transform: translateY(-4px); } }
                    @keyframes barShrink { 0%, 100% { height: 80%; } 50% { height: 65%; } }
                    @keyframes barPulseSecondary { 0%, 100% { height: 30%; } 50% { height: 25%; } }
                    @keyframes barPulseTertiary { 0%, 100% { height: 50%; } 50% { height: 40%; } }
                `}</style>
                <div className="relative flex-1 flex flex-col min-h-0 bg-background/50">
                    <div className="flex-1 overflow-hidden" ref={emblaRef}>
                        <div className="flex h-full">
                            {slides.map((slide, index) => (
                                <div key={index} className="flex-[0_0_100%] min-w-0 p-8 md:p-12 flex flex-col h-full overflow-y-auto custom-scrollbar">
                                    <div className="flex flex-col items-center text-center flex-1 justify-center">
                                        <div className="w-full max-w-[550px] mx-auto mb-10 mt-6 transition-all duration-700 ease-out fill-mode-forwards animate-in zoom-in-95 fade-in">
                                            {slide.content}
                                        </div>
                                        {(slide.title || slide.description) && (
                                            <div className="space-y-4 max-w-[500px] mx-auto transition-all duration-700 delay-150 ease-out fill-mode-forwards animate-in slide-in-from-bottom-4 fade-in">
                                                {slide.title && <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{slide.title}</h2>}
                                                {slide.description && (
                                                    <p className="text-muted-foreground sm:text-[15px] leading-relaxed">
                                                        {slide.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 sm:px-10 pb-8 pt-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-1 sm:gap-2 w-[120px] sm:w-[130px]">
                            {selectedIndex > 0 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={prev}
                                    className="text-muted-foreground/80 hover:text-primary hover:bg-primary/10 rounded-full transition-colors hidden sm:flex shrink-0"
                                    title="Voltar etapa"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            {selectedIndex < slides.length - 1 && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setOpen(false)}
                                    className="text-muted-foreground font-medium hover:bg-muted/50 rounded-full px-4 sm:px-6 shrink-0 transition-colors"
                                >
                                    Pular
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2 h-6 items-center flex-1 justify-center">
                            {slides.map((_, i) => (
                                <div
                                    key={i}
                                    onClick={() => emblaApi?.scrollTo(i)}
                                    className={cn(
                                        "h-2 rounded-full cursor-pointer transition-all duration-300",
                                        i === selectedIndex ? "bg-primary w-6" : "bg-muted-foreground/20 hover:bg-muted-foreground/40 w-2"
                                    )}
                                />
                            ))}
                        </div>

                        {selectedIndex < slides.length - 1 ? (
                            <Button
                                size="icon"
                                onClick={next}
                                className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform active:scale-95"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    setIsLaunching(true);
                                    setTimeout(() => {
                                        setOpen(false);
                                    }, 1000);
                                }}
                                disabled={isLaunching}
                                className="rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-bold transition-all active:scale-95 disabled:opacity-80"
                            >
                                {isLaunching ? "Decolando..." : "Começar"}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
