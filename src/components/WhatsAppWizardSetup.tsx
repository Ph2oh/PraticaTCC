import React from 'react';
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, QrCode, Smartphone, Wifi, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WhatsAppWizardSetup() {
    const { status, loading, startConnection, disconnect } = useWhatsApp();

    // Fluxo simplificado em 3 etapas reais:
    // Etapa 1: Aguardando início (sem sessão ativa)
    // Etapa 2: Sessão iniciada — Chromium subindo (sem QR) ou QR disponível (aguardando escaneamento)
    // Etapa 3: Conectado e pronto
    let currentStep = 1;
    if (status.activeSession && !status.ready) currentStep = 2;
    if (status.activeSession && status.ready) currentStep = 3;

    const isBootingUp = currentStep === 2 && !status.qrCode;
    const hasQrCode = currentStep === 2 && !!status.qrCode;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3 pt-6 border-b pb-8">
                <h2 className="text-3xl font-bold tracking-tight">Conecte seu WhatsApp</h2>
                <p className="text-muted-foreground w-3/4 mx-auto">
                    Integre seu WhatsApp Business ao sistema de gestão de orçamentos
                </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {/* Lateral Esquerda - Steps */}
                <div className="md:col-span-1 space-y-4 pt-6">
                    <StepIndicator
                        number={1}
                        title="Inicialização"
                        active={currentStep >= 1}
                        completed={currentStep > 1}
                    />
                    <div className="h-6 border-l-2 border-dashed ml-4 border-muted" />

                    <StepIndicator
                        number={2}
                        title="Autenticação"
                        active={currentStep >= 2}
                        completed={currentStep > 2}
                    />
                    <div className="h-6 border-l-2 border-dashed ml-4 border-muted" />

                    <StepIndicator
                        number={3}
                        title="Conectado"
                        active={currentStep >= 3}
                        completed={currentStep >= 3}
                    />
                </div>

                {/* Conteúdo Central */}
                <div className="md:col-span-3">
                    <Card className="shadow-lg border-primary/20">
                        {status.disabled ? (
                            <CardContent className="p-12 text-center space-y-4">
                                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                                <h3 className="text-xl font-semibold">Integração Desligada</h3>
                                <p className="text-muted-foreground">
                                    O administrador não habilitou o WhatsApp neste ambiente. Contacte o suporte.
                                </p>
                            </CardContent>
                        ) : (
                            <>
                                {/* ETAPA 1: Botão com loading inline ao clicar */}
                                {currentStep === 1 && (
                                    <div className="animate-in fade-in zoom-in duration-500">
                                        <CardHeader className="text-center pb-0 space-y-3 mt-6">
                                            <div className="mx-auto bg-primary/10 p-4 rounded-full w-20 h-20 flex items-center justify-center">
                                                <Smartphone className="w-10 h-10 text-primary" />
                                            </div>
                                            <CardTitle className="text-2xl">Vamos começar</CardTitle>
                                            <CardDescription className="text-base px-6">
                                                Clique para estabelecer uma conexão segura com seu WhatsApp Business.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-8 pb-10 flex justify-center">
                                            <Button
                                                size="lg"
                                                onClick={startConnection}
                                                disabled={loading}
                                                className="w-full sm:w-1/2 h-14 text-lg"
                                            >
                                                {loading
                                                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Iniciando...</>
                                                    : "Iniciar autenticação"
                                                }
                                            </Button>
                                        </CardContent>
                                    </div>
                                )}

                                {/* ETAPA 2a: Chromium ainda inicializando (sem QR) */}
                                {isBootingUp && (
                                    <div className="animate-in fade-in duration-500">
                                        <CardContent className="flex flex-col items-center justify-center py-20 space-y-6">
                                            <div className="mx-auto bg-primary/10 p-5 rounded-full w-24 h-24 flex items-center justify-center">
                                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-xl font-semibold">Preparando sessão segura...</h3>
                                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                                    Estamos iniciando o canal de conexão. O QR Code aparecerá em instantes.
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={disconnect} disabled={loading} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                Cancelar
                                            </Button>
                                        </CardContent>
                                    </div>
                                )}

                                {/* ETAPA 2b: QR Code disponível */}
                                {hasQrCode && (
                                    <div className="animate-in slide-in-from-right-8 duration-500">
                                        <CardHeader className="text-center">
                                            <CardTitle className="text-2xl flex items-center justify-center gap-2">
                                                <QrCode className="w-6 h-6 text-primary" /> QR Code Pronto
                                            </CardTitle>
                                            <CardDescription>Escaneie o código abaixo com seu celular</CardDescription>
                                        </CardHeader>

                                        {/* CardContent com posicionamento relativo para suportar overflow */}
                                        <CardContent className="py-8 px-4 sm:px-8 relative overflow-visible">
                                            <div className="relative w-full">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                                                    {/* Coluna Esquerda - Instruções */}
                                                    <div className="bg-muted/30 p-6 sm:p-8 rounded-xl border border-muted/50 z-0">
                                                        <div className="space-y-4">
                                                            <h4 className="font-semibold text-primary">Passo a passo:</h4>
                                                            <ol className="text-sm space-y-4 text-muted-foreground w-full">
                                                                <li className="flex gap-3 items-start">
                                                                    <span className="bg-primary/20 text-primary px-2 rounded-md font-medium shrink-0">1</span>
                                                                    <span className="flex-1 leading-relaxed mt-0.5">Abra o WhatsApp no seu smartphone</span>
                                                                </li>
                                                                <li className="flex gap-3 items-start">
                                                                    <span className="bg-primary/20 text-primary px-2 rounded-md font-medium shrink-0">2</span>
                                                                    <span className="flex-1 leading-relaxed mt-0.5">Toque em <b>Configurações</b> ou no Ícone de Três Pontinhos ⋮</span>
                                                                </li>
                                                                <li className="flex gap-3 items-start">
                                                                    <span className="bg-primary/20 text-primary px-2 rounded-md font-medium shrink-0">3</span>
                                                                    <span className="flex-1 leading-relaxed mt-0.5">Entre em <b>Aparelhos Conectados</b></span>
                                                                </li>
                                                                <li className="flex gap-3 items-start">
                                                                    <span className="bg-primary/20 text-primary px-2 rounded-md font-medium shrink-0">4</span>
                                                                    <span className="flex-1 leading-relaxed mt-0.5">Toque em <b>Conectar um Aparelho</b> e aponte</span>
                                                                </li>
                                                            </ol>
                                                        </div>
                                                    </div>

                                                    {/* Coluna Direita - QR Code sobreposto (desktop) */}
                                                    <div className="hidden lg:flex justify-center relative h-full">
                                                        <div className="absolute -right-20 top-1/2 -translate-y-1/2 z-20">
                                                            <div className="bg-white p-5 rounded-xl shadow-2xl border border-black/5 ring-1 ring-black/5 flex items-center justify-center animate-in slide-in-from-right-8 duration-500">
                                                                <img
                                                                    src={status.qrCode}
                                                                    alt="WhatsApp QR Code"
                                                                    className="w-72 h-72 object-contain"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mobile - QR Code centralizado */}
                                                    <div className="lg:hidden flex justify-center">
                                                        <div className="bg-white p-5 rounded-xl shadow-xl border border-black/5 ring-1 ring-black/5 flex items-center justify-center">
                                                            <img
                                                                src={status.qrCode}
                                                                alt="WhatsApp QR Code"
                                                                className="w-64 h-64 object-contain"
                                                            />
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="bg-muted/30 border-t py-4 justify-between">
                                            <p className="text-xs text-muted-foreground">* O código atualiza automaticamente a cada 30 segundos.</p>
                                            <Button variant="ghost" size="sm" onClick={disconnect} disabled={loading} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                Cancelar Sincronização
                                            </Button>
                                        </CardFooter>
                                    </div>
                                )}

                                {/* ETAPA 3: Conectado */}
                                {currentStep === 3 && (
                                    <div className="animate-in fade-in zoom-in-95 duration-500">
                                        <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center">
                                                <CheckCircle2 className="w-14 h-14 text-green-500" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-bold bg-gradient-to-br from-green-500 to-green-700 bg-clip-text text-transparent">CONECTADO</h3>
                                                <p className="text-muted-foreground text-sm max-w-[300px] mx-auto">
                                                    Seu número está ativo e recebendo mensagens através do painel.
                                                </p>
                                            </div>

                                            <Alert className="max-w-md mx-auto bg-green-500/5 border-green-500/20">
                                                <AlertDescription className="text-green-700/80 dark:text-green-500/80">
                                                    Mantenha a aba de Orçamentos aberta para gerenciar os novos leads do seu WhatsApp.
                                                </AlertDescription>
                                            </Alert>

                                            <Button
                                                variant="outline"
                                                onClick={disconnect}
                                                disabled={loading}
                                                className="mt-6 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                                                Desconectar Dispositivo
                                            </Button>
                                        </CardContent>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Subcomponente lateral para steps
function StepIndicator({ number, title, active, completed }: { number: number, title: string, active: boolean, completed: boolean }) {
    return (
        <div className={`flex items-center gap-3 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40 grayscale'}`}>
            <div className={`
                flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border-2
                ${completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : active
                        ? 'border-primary text-primary bg-background'
                        : 'border-muted-foreground text-muted-foreground'
                }
            `}>
                {completed ? <CheckCircle2 className="w-5 h-5" /> : number}
            </div>
            <span className={`font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {title}
            </span>
        </div>
    );
}