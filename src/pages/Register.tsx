import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LogoText from "@/assets/sgo_logo_crescimento_com_texto.svg";

export const Register: React.FC = () => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [telefone, setTelefone] = useState('');
    const [loading, setLoading] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (senha.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setLoading(true);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha, empresa, telefone }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar conta.');
            }

            if (data.requireVerification) {
                setRegisteredEmail(email);
            } else {
                // Ativa o Onboarding Tour apenas para esta sessão (novo usuário)
                localStorage.setItem('sgo_is_new_user', 'true');
                login(data.token, data.usuario);
                navigate('/dashboard');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (registeredEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-6 mt-4">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <Mail className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center">Verifique seu e-mail</CardTitle>
                        <CardDescription className="text-center text-base pt-2">
                            Enviamos um link de confirmação para:<br/>
                            <strong className="text-foreground">{registeredEmail}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4 pb-8">
                        <p className="text-sm text-muted-foreground pb-4">
                            Por razões de segurança, você precisa confirmar que este e-mail pertence a você antes de acessar o painel.
                        </p>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                            Já confirmei, ir para Login <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <img src={LogoText} alt="SGO - Sistema de Gestão" className="h-14" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mt-2">Criar Conta</CardTitle>
                    <CardDescription className="text-center">
                        Crie de graça sua conta no SGO. Prometemos não encher sua caixa de entrada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome Completo</Label>
                            <Input
                                id="nome"
                                type="text"
                                placeholder="João da Silva"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="joao@empresa.com"
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
                                placeholder="No mínimo 6 caracteres"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="empresa">Empresa (Opcional)</Label>
                                <Input
                                    id="empresa"
                                    type="text"
                                    placeholder="Nome da Agência"
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefone">Telefone WhatsApp</Label>
                                <Input
                                    id="telefone"
                                    type="text"
                                    placeholder="(11) 90000-0000"
                                    value={telefone}
                                    onChange={(e) => setTelefone(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Criando Conta...' : 'Cadastrar e Acessar Painel'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Já possui uma conta?{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            Entrar agora
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
