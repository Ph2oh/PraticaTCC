import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoSgo from '@/assets/sgo_logo_crescimento_com_texto.svg';
import { ArrowRight, Percent, Banknote } from 'lucide-react';

export default function TelaInicial() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] font-sans selection:bg-[#0071E3]/20 selection:text-[#0071E3] overflow-x-hidden relative">

      {/* BACKGROUND VIBRANTE (Apple Style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[800px] opacity-[0.15] pointer-events-none -z-10 overflow-hidden flex justify-center">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
        <div className="absolute top-[10%] right-[20%] w-[600px] h-[600px] bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* BARRA DE NAVEGAÇÃO SUPERIOR (HEADER) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FBFBFD]/80 backdrop-blur-2xl border-b border-black/5 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <a href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <img src={logoSgo} alt="Logomarca do SGO" className="h-11 w-auto" />
          </a>

          {/* Links Centrais */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide text-[#1D1D1F]/80">
            <a href="#visao-geral" className="hover:text-[#1D1D1F] transition-colors">Visão Geral</a>
            <a href="#recursos" className="hover:text-[#1D1D1F] transition-colors">Recursos</a>
            <a href="#pesquisa" className="hover:text-[#1D1D1F] transition-colors">Pesquisa</a>
          </div>

          {/* Ações (Direita) */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-[#1D1D1F] hover:bg-black/5 font-semibold text-xs h-8 rounded-full px-4 transition-all">
                Entrar
              </Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button className="bg-[#1D1D1F] text-white hover:bg-black font-semibold text-xs h-8 rounded-full px-4 shadow-sm transition-all">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* APRESENTAÇÃO PRINCIPAL (HERO) */}
      <section id="visao-geral" className="pt-32 pb-10 px-6 relative z-10 text-center flex flex-col items-center justify-center min-h-[80vh]">
        <div className="max-w-5xl mx-auto">

          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-white border border-black/5 shadow-sm text-sm font-semibold tracking-wide text-[#1D1D1F]">
            O fim da bagunça e das planilhas
          </div>

          <h1 className="text-6xl md:text-[80px] lg:text-[100px] font-black tracking-tighter leading-[0.95] mb-8 text-[#1D1D1F]">
            INTELIGÊNCIA COMERCIAL<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">
              SIMPLICIDADE EXTREMA.
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-[#86868B] mb-12 max-w-3xl mx-auto leading-tight font-medium tracking-tight">
            Transforme solicitações recebidas pelo WhatsApp em oportunidades organizadas e acompanhadas do primeiro contato ao fechamento do contrato.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full px-10 h-14 bg-[#1D1D1F] text-white hover:bg-black font-semibold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                Explorar recursos
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-10 h-14 bg-white/50 backdrop-blur-md border-black/10 text-[#1D1D1F] hover:bg-white font-semibold text-lg group shadow-sm transition-all">
                Acessar o sistema
                <ArrowRight className="w-5 h-5 ml-2 opacity-60 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* REPRESENTAÇÃO VISUAL VIBRANTE (Mockup) */}
        <div className="mt-20 w-full max-w-4xl mx-auto relative group perspective-[2000px]">
          {/* Sombras Coloridas da Interface */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-orange-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

          <div className="relative w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white flex flex-col md:flex-row gap-6 transform rotate-x-[5deg] group-hover:rotate-x-0 transition-transform duration-700">

            {/* Cartão de Conversão (Visual Vivo) */}
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-8 rounded-3xl flex flex-col justify-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <Percent className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-purple-900/60 mb-2">Sua Taxa de Conversão</div>
              <div className="text-6xl font-black tracking-tighter text-purple-950">42.8<span className="text-3xl text-purple-400">%</span></div>
            </div>

            {/* Cartão de Receita (Visual Vivo) */}
            <div className="flex-1 bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-8 rounded-3xl flex flex-col justify-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <Banknote className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-orange-900/60 mb-2">Receita do Mês</div>
              <div className="text-6xl font-black tracking-tighter text-orange-950"><span className="text-3xl text-orange-400 mr-1">R$</span>24.5k</div>
            </div>

          </div>
        </div>
      </section>

      {/* AVISO DO PROJETO DE PESQUISA (DESTAQUE ABSOLUTO, MAS ELEGANTE) */}
      <section id="pesquisa" className="py-24 px-6 bg-white border-y border-black/5 relative overflow-hidden">
        {/* Elemento gráfico de fundo */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-[#F5F5F7] to-transparent pointer-events-none"></div>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[#1D1D1F] mb-6 leading-tight">
              Pesquisa e engenharia na prática.
            </h2>
            <p className="text-xl md:text-2xl text-[#86868B] font-medium leading-relaxed">
              Desenvolvido como projeto de pesquisa aplicada em Engenharia da Computação. Nosso foco é a <strong className="text-[#1D1D1F]">otimização da rastreabilidade e a inteligência de dados</strong> no processo comercial de profissionais independentes.
            </p>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <div className="w-40 h-40 rounded-full border-[12px] border-black/5 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-md opacity-20"></div>
              <span className="text-6xl font-black text-[#1D1D1F]">TCC</span>
            </div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES (TEXTOS DIRETOS E CURTOS) */}
      <section id="recursos" className="py-32 px-6 relative bg-[#FBFBFD]">
        <div className="max-w-6xl mx-auto">

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-black/5 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">Números que importam</h3>
              <p className="text-[#86868B] font-medium leading-relaxed text-lg">
                Esqueça planilhas confusas. Veja sua receita, metas e taxas de fechamento calculadas em tempo real.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-black/5 hover:shadow-xl transition-shadow duration-300 transform md:-translate-y-6">
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">Do WhatsApp pro sistema</h3>
              <p className="text-[#86868B] font-medium leading-relaxed text-lg">
                Conexão direta que agiliza o cadastro das solicitações. Menos digitação, mais agilidade para responder.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-black/5 hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">Tudo no seu lugar</h3>
              <p className="text-[#86868B] font-medium leading-relaxed text-lg">
                Arrastou, fechou. Controle visual de cada etapa da negociação para você nunca mais perder um retorno de cliente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="py-12 bg-white border-t border-black/5">
        <div className="max-w-6xl mx-auto px-6 text-center text-[#86868B] font-medium flex flex-col gap-2">
          <p className="text-sm">O Sistema de Gerenciamento de Orçamentos é uma ferramenta de código aberto.</p>
          <p className="text-xs opacity-60">Criado com foco em rastreabilidade de dados no processo comercial.</p>
        </div>
      </footer>
    </div>
  );
}
