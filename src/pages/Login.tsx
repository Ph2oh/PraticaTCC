// Alteração Estrutural: Criação da interface de Login usando componentes shadcn/ui.
// Esta página chama o endpoint `/api/auth/login` e armazena o token via AuthContext.
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LogoText from "@/assets/sgo_logo_crescimento_com_texto.svg";

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.requireVerification) {
                    setUnverifiedEmail(email);
                    throw new Error(data.error);
                }
                throw new Error(data.error || 'Erro ao fazer login');
            }

            login(data.token, data.usuario);
            toast.success('Login realizado com sucesso!');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (!unverifiedEmail) return;
        setResendLoading(true);
        try {
            const BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${BASE_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: unverifiedEmail }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao reenviar e-mail');
            
            toast.success('Novo link de confirmação enviado para seu e-mail!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <img src={LogoText} alt="SGO - Sistema de Gestão" className="h-14" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mt-2">Acesso ao Painel</CardTitle>
                    <CardDescription className="text-center">
                        Insira suas credenciais para acessar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@sgo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                required
                            />
                        </div>
                        
                        {unverifiedEmail && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-3 rounded-md text-sm space-y-2">
                                <p>Sua conta requer confirmação para acessar o sistema.</p>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full text-xs h-8 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                    onClick={handleResendEmail}
                                    disabled={resendLoading}
                                >
                                    {resendLoading ? 'Enviando...' : 'Reenviar E-mail de Confirmação'}
                                </Button>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar no Sistema'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                        Ainda não possui uma conta? {' '}
                        <Link to="/register" className="text-primary font-medium hover:underline">
                            Crie aqui de graça
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
