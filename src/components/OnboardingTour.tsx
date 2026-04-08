import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from 'react-joyride';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({
  index,
  step,
  backProps,
  primaryProps,
  tooltipProps,
  skipProps,
  isLastStep,
}: TooltipRenderProps) => {
  return (
    <div
      {...tooltipProps}
      className="bg-card border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[20px] p-6 max-w-[360px] w-full animate-in fade-in zoom-in-95 duration-200"
    >
      {step.title && (
        <h3 className="text-base font-semibold text-foreground tracking-tight mb-2">
          {step.title}
        </h3>
      )}
      
      <div className="text-sm font-medium text-muted-foreground leading-relaxed mb-6">
        {step.content}
      </div>

      <div className="flex items-center justify-between mt-4">
        {!isLastStep && (
          <button
            {...skipProps}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-all"
            >
              Voltar
            </button>
          )}
          <button
            {...primaryProps}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            {isLastStep ? 'Explorar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Agora só ativa o tour se a flag de novo usuário houver sido injetada no momento do cadastro!
    // Ignoramos qualquer cache antigo de `hasSeenTour` que outro usuário possa ter deixado na máquina.
    const isNewUser = localStorage.getItem('sgo_is_new_user') === 'true';
    
    if (isNewUser) {
      setRun(true);
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo ao SGO! ',
      content: 'Preparamos um sistema ágil para o seu fluxo de orçamentos e captação pelo WhatsApp. Vamos fazer um rápido tour.',
      disableBeacon: true,
    },
    {
      target: '#tour-sidebar',
      title: 'Navegação Principal',
      content: 'Este é o menu central. Aqui você tem controle absoluto para alternar os módulos do sistema.',
      placement: 'right',
    },
    {
      target: '#tour-search',
      title: 'Busca Global',
      content: 'Pressione "Cmd+K" (Apple) ou "Ctrl+K" (Windows). A Busca Global permite encontrar clientes pelo nome ou histórico instantaneamente.',
      placement: 'bottom',
    },
    {
      target: '#tour-dashboard',
      title: 'Acompanhamento em tempo real',
      content: 'Nesta área ficam os balanços diários e acompanhamento direto dos seus orçament mensais em tempo real.',
      placement: 'top',
    },
    {
      target: '#tour-menu-orcamentos',
      title: 'Rota de Orçamentos',
      content: 'O verdadeiro coração do sistema! Clique em próximo que iremos te levar para dentro dela.',
      placement: 'right',
    },
    {
      target: '#tour-kanban-board',
      title: 'O Board Kanban Interativo',
      content: 'Trabalhe visualmente. Você arrasta e solta os cartões ("Em Negociação", "Contratado") para mudar seus status e faturamentos. Simples assim!',
      placement: 'top',
    },
    {
      target: '#tour-kanban-board',
      title: 'Controle de Histórico',
      content: 'Ao Clicar em qualquer cartão nesta tela, ele abrirá de lado. Lá você rastreia o Histórico passo-a-passo (com mudanças de fase) e tem atalhos diretos de MENSAGENS ao cliente via WhatsApp Web Integrado.',
      placement: 'bottom',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('sgo_has_seen_tour', 'true');
      localStorage.removeItem('sgo_is_new_user'); // Limpa a flag restritiva
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Quando clica 'Próximo' no passo "Rota de Orçamentos", joga o usr pro path da dashboard pra tela orçamentos
      if (index === 4 && action === ACTIONS.NEXT) {
        navigate('/orcamentos');
        // Dá um tempinho suave pra renderização antes do popup apontar o kanban
        setTimeout(() => {
          setStepIndex(nextStepIndex);
        }, 500);
      }
      else if (index === 5 && action === ACTIONS.PREV) {
        navigate('/');
        setTimeout(() => {
          setStepIndex(nextStepIndex);
        }, 500);
      }
      else {
        setStepIndex(nextStepIndex);
      }
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress={false}
      showSkipButton
      stepIndex={stepIndex}
      steps={steps}
      tooltipComponent={CustomTooltip}
      disableOverlayClose
      spotlightPadding={8}
      styles={{
        options: {
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        }
      }}
    />
  );
}
