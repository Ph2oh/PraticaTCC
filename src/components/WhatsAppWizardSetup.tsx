import React from 'react';
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Button, CancelButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, QrCode, Loader2, AlertCircle, MessageCircle, ShieldCheck } from 'lucide-react';

export function WhatsAppWizardSetup() {
    const { status, loading, startConnection, disconnect } = useWhatsApp();

    let currentStep = 1;
    if (status.activeSession && !status.ready) currentStep = 2;
    if (status.activeSession && status.ready) currentStep = 3;

    const isBootingUp = currentStep === 2 && !status.qrCode;
    const hasQrCode = currentStep === 2 && !!status.qrCode;

    return (
        <div className="w-full max-w-5xl mx-auto py-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                
                {/* Coluna Esquerda: Textos e Persuasão */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-primary font-semibold">
                            <div className="bg-primary/10 p-2 rounded-lg">
                            </div>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
                            {currentStep === 3 ? "Whatsapp conectado" : "Conecte seu whatsapp"}
                        </h1>

                        <ul className="space-y-4 text-muted-foreground w-full">
                            <li className="flex gap-3 items-center">
                                <span>Gerencie conversas, leads e orçamentos em um único painel</span>
                            </li>
                            <li className="flex gap-3 items-center">
                                <span>Captura via espelhamento em tempo real</span>
                            </li>
                        </ul>
                    </div>

                    {/* Segurança Avançada Card */}
                    <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Segurança avançada
                        </h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-2 items-start">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>Criptografia local</strong> para o armazenamento seguro das chaves de sessão no servidor.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                <span><strong>Comunicação isolada</strong> via espelhamento, dispensando intermédio da API Cloud de terceiros.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Coluna Direita: O Painel de Conexão */}
                <div className="flex justify-center lg:justify-end">
                    <Card className="w-full max-w-md shadow-2xl rounded-2xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur-sm">
                        {status.disabled ? (
                            <CardContent className="p-12 text-center space-y-4">
                                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
                                <h3 className="text-xl font-semibold">Integração Desligada</h3>
                                <p className="text-muted-foreground">
                                    O administrador não habilitou o WhatsApp neste ambiente. Contacte o suporte.
                                </p>
                            </CardContent>
                        ) : (
                            <div className="p-8 space-y-8">
                                {/* Cabeçalho do Card */}
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-semibold tracking-tight">Status da Conexão</h3>
                                    <p className="text-sm text-muted-foreground">Autenticação Web Bridge</p>
                                </div>

                                {/* ETAPA 1: Botão Iniciar */}
                                {currentStep === 1 && (
                                    <div className="animate-in fade-in zoom-in duration-500 space-y-6 pt-4">
                                        <div className="bg-muted min-h-[220px] rounded-xl flex items-center justify-center p-6 border border-dashed border-primary/30">
                                            <p className="text-muted-foreground text-center text-sm">
                                                Aguardando inicialização da verificação de pareamento.
                                            </p>
                                        </div>
                                        <Button
                                            size="lg"
                                            onClick={startConnection}
                                            disabled={loading}
                                            className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors"
                                        >
                                            {loading
                                                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando Token...</>
                                                : "Gerar QR Code"
                                            }
                                        </Button>
                                    </div>
                                )}

                                {/* ETAPA 2: Loader ou QR Code */}
                                {currentStep === 2 && (
                                    <div className="animate-in fade-in duration-500 space-y-6">
                                        {isBootingUp ? (
                                            <div className="bg-muted min-h-[220px] rounded-xl flex flex-col items-center justify-center space-y-4 p-6">
                                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                                <p className="text-sm text-muted-foreground text-center">Preparando sessão de criptografia...</p>
                                            </div>
                                        ) : hasQrCode ? (
                                            <div className="space-y-4">
                                                <div className="bg-white p-4 rounded-xl shadow-inner border mx-auto w-fit">
                                                    <img
                                                        src={status.qrCode}
                                                        alt="WhatsApp QR Code"
                                                        className="w-56 h-56 object-contain"
                                                    />
                                                </div>
                                                <div className="bg-primary/5 rounded-lg p-3 text-sm text-center text-primary/80 font-medium">
                                                    Abra o WhatsApp em seu celular e escaneie o código
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
                                                <div className="flex gap-3 items-start">
                                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold text-red-900">Não foi possível gerar QR Code</h4>
                                                        <p className="text-sm text-red-800">
                                                            {status.message && status.message.includes('conectar a novos')
                                                                ? "O WhatsApp bloqueou novas conexões para este número. Isso pode ser temporário. Aguarde algumas horas entre as tentativas e evite múltiplas conexões simultâneas."
                                                                : status.message || "Verifique sua conexão e tente novamente."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <CancelButton className="w-full" onClick={disconnect} disabled={loading} />
                                    </div>
                                )}

                                {/* ETAPA 3: Conectado */}
                                {currentStep === 3 && (
                                    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8 py-4">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                                            </div>
                                            <span className="font-semibold text-lg text-foreground">Conexão estabelecida</span>
                                            
                                            {status.connectedNumber && (
                                                <div className="text-center">
                                                    <p className="text-sm text-muted-foreground mb-1">Número conectado:</p>
                                                    <p className="text-base font-mono font-semibold text-foreground">
                                                        +{status.connectedNumber.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '$1 $2 $3-$4')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="bg-muted/50 rounded-lg p-4 text-xs text-center text-muted-foreground">
                                            Identificador de espelhamento ativo e sincronizado. Você pode fechar esta tela.
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={disconnect}
                                            disabled={loading}
                                            className="w-full h-12 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        >
                                            Desconectar Sessão
                                        </Button>
                                    </div>
                                )}

                                {/* Rodapé do Card */}
                                <div className="pt-4 border-t border-border/50 text-center">
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}