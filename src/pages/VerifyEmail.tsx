import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Validando token seguro...');
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link de verificação inválido ou ausente.');
            return;
        }

        const verifyAccount = async () => {
            try {
                const BASE_URL = import.meta.env.VITE_API_URL || '/api';
                const response = await fetch(`${BASE_URL}/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Erro na verificação do e-mail.');
                }

                setStatus('success');
                setMessage('Perfeito! Seu e-mail foi confirmado com sucesso.');
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message);
            }
        };

        // Adiciona um pequeno atraso apenas para a animação não ser instantânea demais caso a rede seja rápida
        const timeout = setTimeout(() => {
            verifyAccount();
        }, 800);

        return () => clearTimeout(timeout);
    }, [token]);

    // Redireciona automaticamente para o dashboard após verificação bem-sucedida
    useEffect(() => {
        if (status !== 'success') return;

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Redireciona para /login pois o usuario ainda nao possui JWT.
                    // O /dashboard e uma rota protegida e exigiria autenticacao antes de carregar.
                    navigate('/login', { state: { emailVerificado: true } });
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-6 mt-4">
                        {status === 'loading' && (
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-destructive" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">Verificação de Conta</CardTitle>
                    <CardDescription className="text-base pt-2 text-foreground font-medium">
                        {message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4 pb-8">
                    {status === 'success' && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Redirecionando para o painel em <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
                            </p>
                            <Button
                                className="w-full font-bold"
                                onClick={() => navigate('/login', { state: { emailVerificado: true } })}
                            >
                                Entrar agora
                            </Button>
                        </>
                    )}
                    {status === 'error' && (
                        <Button
                            className="w-full font-bold"
                            variant="outline"
                            onClick={() => navigate('/login')}
                        >
                            Voltar para o Login
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default VerifyEmail;
