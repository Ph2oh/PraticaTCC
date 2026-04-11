/*
 * Alteracao Estrutural: Redesign completo da LandingPage.
 * Motivacao: A versao anterior usava um design basico e generico sem potencial de conversao.
 * O novo design e inspirado no padrao visual do Kommo CRM: layout premium com hero split,
 * tipografia Inter profissional, paleta navy/azul sofisticada, animacoes CSS nativas,
 * secoes de prova social e CTA de alta conversao. Nao usa mais icones de chatbot nem
 * elementos visuais genericos. Todo o estilo e inline para evitar conflitos com Tailwind.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoSgo from '@/assets/sgo_logo_crescimento_com_texto.svg';
import logoSgoDark from '@/assets/sgo_logo_crescimento_darkmode.svg';

// ---------------------------------------------------------------------------
// Tipos e interfaces
// ---------------------------------------------------------------------------
interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Componente de contador animado
// ---------------------------------------------------------------------------
function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2000 }: CounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Estilos globais injetados no documento
// ---------------------------------------------------------------------------
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  .lp-root * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .lp-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0f172a;
    background: #ffffff;
    overflow-x: hidden;
  }

  /* Navegacao */
  .lp-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(15,23,42,0.08);
    transition: box-shadow 0.3s ease;
  }
  .lp-nav.scrolled {
    box-shadow: 0 4px 24px rgba(15,23,42,0.08);
  }
  .lp-nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    height: 88px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lp-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: #0f172a;
  }
  .lp-logo-mark {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #1e40af, #3b82f6);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 16px;
    color: #fff;
    letter-spacing: -0.5px;
  }
  .lp-logo-name {
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -0.5px;
    color: #0f172a;
  }
  .lp-nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lp-btn-ghost {
    padding: 9px 20px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    color: #334155;
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
    cursor: pointer;
    background: transparent;
    border: none;
  }
  .lp-btn-ghost:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .lp-btn-primary {
    padding: 10px 22px;
    background: #1e40af;
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .lp-btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(30,64,175,0.35);
  }
  .lp-btn-primary-lg {
    padding: 16px 32px;
    font-size: 16px;
    border-radius: 10px;
  }
  .lp-btn-outline {
    padding: 15px 30px;
    background: transparent;
    color: #1e40af;
    border: 1.5px solid #1e40af;
    border-radius: 10px;
    font-weight: 600;
    font-size: 16px;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.2s, color 0.2s, transform 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .lp-btn-outline:hover {
    background: #eff6ff;
    transform: translateY(-1px);
  }
  .lp-btn-white {
    padding: 16px 32px;
    background: #fff;
    color: #1e40af;
    border-radius: 10px;
    font-weight: 700;
    font-size: 16px;
    border: none;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }
  .lp-btn-white:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  }

  /* Hero */
  .lp-hero {
    padding-top: 110px;
    padding-bottom: 80px;
    background: linear-gradient(160deg, #f0f7ff 0%, #ffffff 60%, #f8faff 100%);
    position: relative;
    overflow: hidden;
  }
  .lp-hero::before {
    content: '';
    position: absolute;
    top: -200px;
    right: -200px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }
  .lp-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 24px;
    letter-spacing: 0.01em;
  }
  .lp-hero-badge-dot {
    width: 6px;
    height: 6px;
    background: #3b82f6;
    border-radius: 50%;
    animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
  .lp-hero-h1 {
    font-size: 54px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -2px;
    color: #0f172a;
    margin-bottom: 20px;
  }
  .lp-hero-h1 .accent {
    color: #1e40af;
    position: relative;
    display: inline-block;
  }
  .lp-hero-sub {
    font-size: 18px;
    color: #475569;
    line-height: 1.7;
    margin-bottom: 36px;
    max-width: 480px;
  }
  .lp-hero-cta {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 40px;
  }
  .lp-hero-trust {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .lp-trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
  .lp-trust-icon {
    width: 16px;
    height: 16px;
    color: #16a34a;
  }

  /* Hero visual - dashboard mockup */
  .lp-hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .lp-dashboard-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06);
    overflow: hidden;
    width: 100%;
    max-width: 520px;
    border: 1px solid rgba(15,23,42,0.06);
    transform: perspective(1000px) rotateY(-4deg) rotateX(2deg);
    transition: transform 0.4s ease;
  }
  .lp-dashboard-card:hover {
    transform: perspective(1000px) rotateY(-1deg) rotateX(1deg) scale(1.02);
  }
  .lp-db-header {
    background: #0f172a;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lp-db-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .lp-db-title {
    color: rgba(255,255,255,0.6);
    font-size: 12px;
    font-weight: 500;
    margin-left: 8px;
  }
  .lp-db-body {
    padding: 20px;
    background: #f8fafc;
  }
  .lp-db-kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .lp-db-kpi {
    background: #fff;
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #e2e8f0;
  }
  .lp-db-kpi-label {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 500;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .lp-db-kpi-value {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.5px;
  }
  .lp-db-kpi-delta {
    font-size: 10px;
    font-weight: 600;
    margin-top: 2px;
  }
  .lp-db-kpi-delta.up { color: #16a34a; }
  .lp-db-kpi-delta.down { color: #dc2626; }
  .lp-db-section-title {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }
  .lp-db-funnel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .lp-db-funnel-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .lp-db-funnel-label {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
    width: 70px;
    flex-shrink: 0;
  }
  .lp-db-funnel-bar-bg {
    flex: 1;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .lp-db-funnel-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease;
  }
  .lp-db-funnel-pct {
    font-size: 11px;
    font-weight: 600;
    color: #0f172a;
    width: 32px;
    text-align: right;
    flex-shrink: 0;
  }
  .lp-db-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lp-db-list-item {
    background: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #e2e8f0;
  }
  .lp-db-list-client {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
  }
  .lp-db-list-service {
    font-size: 10px;
    color: #94a3b8;
  }
  .lp-db-list-status {
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 100px;
  }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-sent { background: #dbeafe; color: #1e40af; }
  .status-hired { background: #dcfce7; color: #166534; }

  /* Secao de problema */
  .lp-problem {
    background: #0f172a;
    padding: 96px 24px;
  }
  .lp-problem-inner {
    max-width: 1000px;
    margin: 0 auto;
  }
  .lp-section-eyebrow {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #3b82f6;
    margin-bottom: 16px;
    display: block;
  }
  .lp-section-h2 {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .lp-section-h2.light { color: #fff; }
  .lp-section-h2.dark { color: #0f172a; }
  .lp-section-sub {
    font-size: 17px;
    line-height: 1.6;
    margin-bottom: 56px;
  }
  .lp-section-sub.light { color: #94a3b8; }
  .lp-section-sub.dark { color: #64748b; }
  .lp-problem-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .lp-problem-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 28px;
    transition: background 0.3s, border-color 0.3s;
  }
  .lp-problem-card:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(59,130,246,0.25);
  }
  .lp-problem-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(220,38,38,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    font-size: 18px;
  }
  .lp-problem-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }
  .lp-problem-desc {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
  }

  /* Secao de funcionalidades */
  .lp-features {
    padding: 96px 24px;
    background: #fff;
  }
  .lp-features-inner {
    max-width: 1200px;
    margin: 0 auto;
  }
  .lp-features-header {
    text-align: center;
    max-width: 640px;
    margin: 0 auto 64px;
  }
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .lp-feature-card {
    border: 1.5px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px 28px;
    transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
    background: #fff;
    position: relative;
    overflow: hidden;
  }
  .lp-feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 16px 16px 0 0;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .lp-feature-card.blue::before { background: linear-gradient(90deg, #1e40af, #3b82f6); }
  .lp-feature-card.green::before { background: linear-gradient(90deg, #166534, #22c55e); }
  .lp-feature-card.purple::before { background: linear-gradient(90deg, #5b21b6, #8b5cf6); }
  .lp-feature-card.orange::before { background: linear-gradient(90deg, #9a3412, #f97316); }
  .lp-feature-card.teal::before { background: linear-gradient(90deg, #0f766e, #14b8a6); }
  .lp-feature-card.rose::before { background: linear-gradient(90deg, #9f1239, #f43f5e); }
  .lp-feature-card:hover {
    border-color: transparent;
    box-shadow: 0 16px 48px rgba(15,23,42,0.1);
    transform: translateY(-4px);
  }
  .lp-feature-card:hover::before {
    opacity: 1;
  }
  .lp-feature-ic {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    font-size: 22px;
  }
  .ic-blue { background: #dbeafe; }
  .ic-green { background: #dcfce7; }
  .ic-purple { background: #ede9fe; }
  .ic-orange { background: #ffedd5; }
  .ic-teal { background: #ccfbf1; }
  .ic-rose { background: #ffe4e6; }
  .lp-feature-h3 {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 10px;
    letter-spacing: -0.3px;
  }
  .lp-feature-p {
    font-size: 14px;
    color: #64748b;
    line-height: 1.65;
  }

  /* Secao de metricas */
  .lp-metrics {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 80px 24px;
  }
  .lp-metrics-inner {
    max-width: 1000px;
    margin: 0 auto;
  }
  .lp-metrics-header {
    text-align: center;
    margin-bottom: 56px;
  }
  .lp-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: rgba(255,255,255,0.06);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .lp-metric-cell {
    background: rgba(15,23,42,0.8);
    padding: 40px 32px;
    text-align: center;
  }
  .lp-metric-value {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -2px;
    color: #fff;
    margin-bottom: 8px;
    line-height: 1;
  }
  .lp-metric-label {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .lp-metric-sub {
    font-size: 12px;
    color: #334155;
    font-style: italic;
  }

  /* Secao de como funciona */
  .lp-how {
    padding: 96px 24px;
    background: #f8fafc;
  }
  .lp-how-inner {
    max-width: 900px;
    margin: 0 auto;
  }
  .lp-how-header {
    text-align: center;
    margin-bottom: 64px;
  }
  .lp-steps {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }
  .lp-steps::before {
    content: '';
    position: absolute;
    left: 28px;
    top: 28px;
    bottom: 28px;
    width: 2px;
    background: linear-gradient(to bottom, #1e40af, #3b82f6, #93c5fd);
  }
  .lp-step {
    display: flex;
    gap: 32px;
    padding: 32px 0;
    align-items: flex-start;
  }
  .lp-step-num {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: #1e40af;
    color: #fff;
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 0 6px #f8fafc, 0 0 0 8px #1e40af40;
    position: relative;
    z-index: 1;
  }
  .lp-step-content {
    padding-top: 12px;
  }
  .lp-step-h3 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    letter-spacing: -0.4px;
  }
  .lp-step-p {
    font-size: 15px;
    color: #64748b;
    line-height: 1.65;
  }

  /* Depoimento */
  .lp-testimonial {
    padding: 96px 24px;
    background: #fff;
  }
  .lp-testimonial-inner {
    max-width: 780px;
    margin: 0 auto;
    text-align: center;
  }
  .lp-quote-mark {
    font-size: 80px;
    line-height: 0.6;
    color: #dbeafe;
    font-family: Georgia, serif;
    display: block;
    margin-bottom: 24px;
  }
  .lp-quote-text {
    font-size: 22px;
    font-weight: 500;
    color: #0f172a;
    line-height: 1.6;
    margin-bottom: 36px;
    letter-spacing: -0.3px;
  }
  .lp-quote-author {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .lp-author-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e40af, #3b82f6);
    color: #fff;
    font-weight: 700;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .lp-author-name {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    text-align: left;
  }
  .lp-author-role {
    font-size: 13px;
    color: #64748b;
    text-align: left;
  }

  /* Precos */
  .lp-pricing {
    padding: 96px 24px;
    background: #f0f7ff;
  }
  .lp-pricing-inner {
    max-width: 900px;
    margin: 0 auto;
  }
  .lp-pricing-header {
    text-align: center;
    max-width: 540px;
    margin: 0 auto 56px;
  }
  .lp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    align-items: stretch;
  }
  .lp-plan {
    background: #fff;
    border-radius: 18px;
    padding: 36px;
    border: 1.5px solid #e2e8f0;
    transition: box-shadow 0.3s, transform 0.3s;
    display: flex;
    flex-direction: column;
  }
  .lp-plan:hover {
    box-shadow: 0 16px 48px rgba(15,23,42,0.08);
    transform: translateY(-4px);
  }
  .lp-plan.featured {
    border-color: #1e40af;
    background: #0f172a;
    color: #fff;
    position: relative;
  }
  .lp-plan-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, #1e40af, #3b82f6);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 100px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .lp-plan-name {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .lp-plan-name.dark { color: #0f172a; }
  .lp-plan-name.light { color: #fff; }
  .lp-plan-desc {
    font-size: 14px;
    margin-bottom: 28px;
  }
  .lp-plan-desc.dark { color: #64748b; }
  .lp-plan-desc.light { color: #94a3b8; }
  .lp-plan-price {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -2px;
    margin-bottom: 6px;
    line-height: 1;
  }
  .lp-plan-price.dark { color: #0f172a; }
  .lp-plan-price.light { color: #fff; }
  .lp-plan-period {
    font-size: 14px;
    margin-bottom: 28px;
    display: block;
  }
  .lp-plan-period.dark { color: #94a3b8; }
  .lp-plan-period.light { color: #64748b; }
  .lp-plan-features {
    list-style: none;
    margin-bottom: 32px;
    flex: 1;
  }
  .lp-plan-features li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 14px;
    border-bottom: 1px solid;
  }
  .lp-plan-features.dark li {
    color: #334155;
    border-color: #f1f5f9;
  }
  .lp-plan-features.light li {
    color: #cbd5e1;
    border-color: rgba(255,255,255,0.06);
  }
  .lp-plan-features li:last-child {
    border-bottom: none;
  }
  .check-dark { color: #1e40af; }
  .check-light { color: #3b82f6; }
  .lp-plan-cta-dark {
    display: block;
    text-align: center;
    padding: 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-weight: 600;
    font-size: 15px;
    color: #0f172a;
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
    background: transparent;
  }
  .lp-plan-cta-dark:hover {
    background: #f8fafc;
    border-color: #94a3b8;
  }
  .lp-plan-cta-light {
    display: block;
    text-align: center;
    padding: 14px;
    background: linear-gradient(90deg, #1e40af, #3b82f6);
    border-radius: 10px;
    font-weight: 700;
    font-size: 15px;
    color: #fff;
    text-decoration: none;
    transition: opacity 0.2s, transform 0.2s;
    cursor: pointer;
    border: none;
    box-shadow: 0 8px 24px rgba(30,64,175,0.35);
  }
  .lp-plan-cta-light:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  /* CTA Final */
  .lp-cta {
    background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%);
    padding: 96px 24px;
    position: relative;
    overflow: hidden;
  }
  .lp-cta::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 400px;
    height: 400px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
    pointer-events: none;
  }
  .lp-cta::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: -80px;
    width: 300px;
    height: 300px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
    pointer-events: none;
  }
  .lp-cta-inner {
    max-width: 680px;
    margin: 0 auto;
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .lp-cta-h2 {
    font-size: 46px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1.5px;
    line-height: 1.15;
    margin-bottom: 20px;
  }
  .lp-cta-sub {
    font-size: 18px;
    color: rgba(255,255,255,0.75);
    margin-bottom: 40px;
    line-height: 1.6;
  }
  .lp-cta-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Footer */
  .lp-footer {
    background: #090e1a;
    padding: 64px 24px 32px;
  }
  .lp-footer-inner {
    max-width: 1200px;
    margin: 0 auto;
  }
  .lp-footer-top {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 48px;
    margin-bottom: 48px;
  }
  .lp-footer-brand-desc {
    font-size: 14px;
    color: #475569;
    line-height: 1.6;
    margin-top: 16px;
    max-width: 280px;
  }
  .lp-footer-col-title {
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 20px;
  }
  .lp-footer-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .lp-footer-links a {
    font-size: 14px;
    color: #475569;
    text-decoration: none;
    transition: color 0.2s;
  }
  .lp-footer-links a:hover {
    color: #94a3b8;
  }
  .lp-footer-divider {
    border: none;
    border-top: 1px solid #1e293b;
    margin-bottom: 28px;
  }
  .lp-footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  .lp-footer-copy {
    font-size: 13px;
    color: #334155;
  }

  /* Responsividade */
  @media (max-width: 900px) {
    .lp-hero-inner {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .lp-hero-h1 {
      font-size: 40px;
      letter-spacing: -1.5px;
    }
    .lp-features-grid {
      grid-template-columns: 1fr 1fr;
    }
    .lp-pricing-grid {
      grid-template-columns: 1fr;
    }
    .lp-metrics-grid {
      grid-template-columns: 1fr;
    }
    .lp-problem-grid {
      grid-template-columns: 1fr;
    }
    .lp-footer-top {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .lp-hero-h1 {
      font-size: 32px;
      letter-spacing: -1px;
    }
    .lp-section-h2 {
      font-size: 28px;
    }
    .lp-features-grid {
      grid-template-columns: 1fr;
    }
    .lp-nav-actions .lp-btn-ghost {
      display: none;
    }
    .lp-cta-h2 {
      font-size: 32px;
    }
    .lp-db-kpis {
      grid-template-columns: repeat(2, 1fr);
    }
    .lp-footer-top {
      grid-template-columns: 1fr;
    }
    .lp-steps::before {
      display: none;
    }
    .lp-footer-bottom {
      flex-direction: column;
      text-align: center;
    }
  }

  /* Entrada suave */
  .fade-up {
    opacity: 0;
    transform: translateY(24px);
    animation: fadeUp 0.6s ease forwards;
  }
  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
`;

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Injeta estilos no head apenas uma vez
  useEffect(() => {
    const id = 'lp-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = globalStyles;
      document.head.appendChild(tag);
    }
    return () => {
      // Nao remove ao desmontar para evitar flash ao navegar de volta
    };
  }, []);

  return (
    <div className="lp-root">
      {/* ------------------------------------------------------------------ */}
      {/* NAVEGACAO                                                            */}
      {/* ------------------------------------------------------------------ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <img src={logoSgo} alt="SGO Logo" style={{ height: '56px' }} />
          </a>
          <div className="lp-nav-actions">
            <a href="#features" className="lp-btn-ghost">Funcionalidades</a>
            <a href="#pricing" className="lp-btn-ghost">Precos</a>
            <Link to="/login" className="lp-btn-ghost">Entrar</Link>
            <Link to="/register" className="lp-btn-primary">
              Comecar Gratis
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* Coluna de texto */}
          <div>
            <div className="lp-hero-badge fade-up">
              <span className="lp-hero-badge-dot" />
              Gestão de Orçamentos e CRM Integrado
            </div>

            <h1 className="lp-hero-h1 fade-up delay-1">
              Aumente suas vendas com um{' '}
              <span className="accent">CRM inteligente</span>{' '}
            </h1>

            <p className="lp-hero-sub fade-up delay-2">
              SGO é o painel comercial definitivo que unifica suas negociações. Centralize propostas, saiba exatamente a sua taxa de conversão e não perca mais nenhuma oportunidade de alavancar seus lucros.
            </p>

            <div className="lp-hero-cta fade-up delay-3">
              <button
                className="lp-btn-primary lp-btn-primary-lg"
                onClick={() => navigate('/register')}
                id="hero-cta-primary"
              >
                Comecar Gratuitamente
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <a href="#how" className="lp-btn-outline" id="hero-cta-secondary">
                Ver como funciona
              </a>
            </div>

            <div className="lp-hero-trust fade-up delay-3">
              {[
                'Sem cartao de credito',
                'Acesso instantaneo',
                'Suporte em portugues'
              ].map((item) => (
                <div key={item} className="lp-trust-item">
                  <svg className="lp-trust-icon" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Coluna visual - mockup do dashboard */}
          <div className="lp-hero-visual">
            <div className="lp-dashboard-card">
              {/* Barra de titulo falsa estilo app */}
              <div className="lp-db-header">
                <div className="lp-db-dot" style={{ background: '#ef4444' }} />
                <div className="lp-db-dot" style={{ background: '#f59e0b' }} />
                <div className="lp-db-dot" style={{ background: '#22c55e' }} />
                <span className="lp-db-title">SGO — Dashboard</span>
              </div>

              <div className="lp-db-body">
                {/* KPIs */}
                <div className="lp-db-kpis">
                  <div className="lp-db-kpi">
                    <div className="lp-db-kpi-label">Receita</div>
                    <div className="lp-db-kpi-value">R$32k</div>
                    <div className="lp-db-kpi-delta up">+18% vs. mes ant.</div>
                  </div>
                  <div className="lp-db-kpi">
                    <div className="lp-db-kpi-label">Conversao</div>
                    <div className="lp-db-kpi-value">38%</div>
                    <div className="lp-db-kpi-delta up">+5pp melhor</div>
                  </div>
                  <div className="lp-db-kpi">
                    <div className="lp-db-kpi-label">Ticket Medio</div>
                    <div className="lp-db-kpi-value">R$4.2k</div>
                    <div className="lp-db-kpi-delta down">-2% vs. meta</div>
                  </div>
                </div>

                {/* Funil de conversao */}
                <div className="lp-db-section-title">Funil de vendas</div>
                <div className="lp-db-funnel">
                  {[
                    { label: 'Pendentes', pct: 100, color: '#64748b', width: '100%' },
                    { label: 'Enviados', pct: 72, color: '#3b82f6', width: '72%' },
                    { label: 'Contratados', pct: 38, color: '#22c55e', width: '38%' },
                    { label: 'Recusados', pct: 34, color: '#ef4444', width: '34%' }
                  ].map((row) => (
                    <div key={row.label} className="lp-db-funnel-row">
                      <span className="lp-db-funnel-label">{row.label}</span>
                      <div className="lp-db-funnel-bar-bg">
                        <div className="lp-db-funnel-bar" style={{ width: row.width, background: row.color }} />
                      </div>
                      <span className="lp-db-funnel-pct">{row.pct}%</span>
                    </div>
                  ))}
                </div>

                {/* Lista de orcamentos recentes */}
                <div className="lp-db-section-title">Ultimos orcamentos</div>
                <div className="lp-db-list">
                  {[
                    { client: 'Familia Rodrigues', service: 'Ensaio de Familia', status: 'Contratado', cls: 'status-hired' },
                    { client: 'Julia & Rafael', service: 'Casamento', status: 'Enviado', cls: 'status-sent' },
                    { client: 'Studio Moda Co.', service: 'Ensaio Corporativo', status: 'Pendente', cls: 'status-pending' }
                  ].map((item) => (
                    <div key={item.client} className="lp-db-list-item">
                      <div>
                        <div className="lp-db-list-client">{item.client}</div>
                        <div className="lp-db-list-service">{item.service}</div>
                      </div>
                      <span className={`lp-db-list-status ${item.cls}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PROBLEMA                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-problem">
        <div className="lp-problem-inner">
          <span className="lp-section-eyebrow">Diagnóstico de Vendas</span>
          <h2 className="lp-section-h2 light" style={{ maxWidth: 640, marginBottom: 16 }}>
            Por que você está perdendo dinheiro?
          </h2>
          <p className="lp-section-sub light" style={{ maxWidth: 580, marginBottom: 56 }}>
            Sem uma gestão comercial centralizada, você atende clientes de forma intuitiva, espalha informações e perde negócios para a concorrência sem sequer notar.
          </p>

          <div className="lp-problem-grid">
            {[
              {
                icon: '✕',
                title: 'Orcamentos espalhados',
                desc: 'WhatsApp, DM, email, chat — propostas sem rastreamento. Voce responde por chute, nao por dado.'
              },
              {
                icon: '✕',
                title: 'Taxa de conversao invisivel',
                desc: 'Quantos leads viraram clientes esse mes? Sem sistema, e impossivel saber e impossivel melhorar.'
              },
              {
                icon: '✕',
                title: 'Clientes esquecidos no funil',
                desc: 'Proposta enviada ha semanas. O cliente sumiu. Sem follow-up automatico, negocio morto.'
              },
              {
                icon: '✕',
                title: 'Sem analise de rejeicao',
                desc: 'Por que clientes dizem nao? Se voce nao registra, nao aprende e continua cometendo os mesmos erros.'
              }
            ].map((card) => (
              <div key={card.title} className="lp-problem-card">
                <div className="lp-problem-icon">
                  <span style={{ color: '#f87171', fontWeight: 700, fontSize: 20 }}>{card.icon}</span>
                </div>
                <h3 className="lp-problem-title">{card.title}</h3>
                <p className="lp-problem-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FUNCIONALIDADES                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-features" id="features">
        <div className="lp-features-inner">
          <div className="lp-features-header">
            <span className="lp-section-eyebrow">Funcionalidades</span>
            <h2 className="lp-section-h2 dark">
              Tudo que seu negocio precisa
            </h2>
            <p className="lp-section-sub dark" style={{ marginBottom: 0 }}>
              Do primeiro contato ao contrato assinado, o SGO acompanha cada etapa do seu funil comercial.
            </p>
          </div>

          <div className="lp-features-grid">
            {[
              {
                color: 'blue',
                ic: 'ic-blue',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                ),
                title: 'Dashboard Executivo',
                desc: 'Receita, ticket medio, taxa de conversao e tendencias em tempo real. Decisoes baseadas em dados, nao em intuicao.'
              },
              {
                color: 'green',
                ic: 'ic-green',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
                title: 'Kanban de Orcamentos',
                desc: 'Arraste propostas entre colunas visuais. Pendente, Enviado, Contratado — visibilidade total do pipeline com um olhar.'
              },
              {
                color: 'purple',
                ic: 'ic-purple',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: 'Deep Analytics',
                desc: 'Historico de 6 meses, funil de conversao detalhado, analise por tipo de servico e alertas inteligentes de performance.'
              },
              {
                color: 'orange',
                ic: 'ic-orange',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                ),
                title: 'Gestao de Clientes',
                desc: 'Base de clientes centralizada com historico de interacoes, orcamentos anteriores e dados de relacionamento comercial.'
              },
              {
                color: 'teal',
                ic: 'ic-teal',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                title: 'Metas e KPIs',
                desc: 'Defina metas mensais de receita e conversao. Acompanhe progresso e receba alertas quando performance estiver abaixo do esperado.'
              },
              {
                color: 'rose',
                ic: 'ic-rose',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
                  </svg>
                ),
                title: 'Configuracoes Avancadas',
                desc: 'Webhooks, permissoes por usuario e integracao com WhatsApp para centralizar todos os canais de leads em um unico painel.'
              }
            ].map((feat) => (
              <div key={feat.title} className={`lp-feature-card ${feat.color}`}>
                <div className={`lp-feature-ic ${feat.ic}`}>{feat.icon}</div>
                <h3 className="lp-feature-h3">{feat.title}</h3>
                <p className="lp-feature-p">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* METRICAS                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-metrics">
        <div className="lp-metrics-inner">
          <div className="lp-metrics-header">
            <span className="lp-section-eyebrow">Impacto Real</span>
            <h2 className="lp-section-h2 light">Numeros que falam por si</h2>
          </div>
          <div className="lp-metrics-grid">
            <div className="lp-metric-cell">
              <div className="lp-metric-value" style={{ color: '#3b82f6' }}>
                <AnimatedCounter end={38} suffix="%" />
              </div>
              <div className="lp-metric-label">Taxa de conversao media</div>
              <div className="lp-metric-sub">Voce sabe a sua?</div>
            </div>
            <div className="lp-metric-cell">
              <div className="lp-metric-value" style={{ color: '#22c55e' }}>
                R$<AnimatedCounter end={11} suffix="k" />
              </div>
              <div className="lp-metric-label">Ticket medio por contrato</div>
              <div className="lp-metric-sub">Conheca o seu potencial</div>
            </div>
            <div className="lp-metric-cell">
              <div className="lp-metric-value" style={{ color: '#f59e0b' }}>
                <AnimatedCounter end={4} suffix=" dias" />
              </div>
              <div className="lp-metric-label">Do primeiro contato ao fechamento</div>
              <div className="lp-metric-sub">Ciclo de venda medio</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* COMO FUNCIONA                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-how" id="how">
        <div className="lp-how-inner">
          <div className="lp-how-header">
            <span className="lp-section-eyebrow">Como Funciona</span>
            <h2 className="lp-section-h2 dark">Três passos ate o controle total</h2>
            <p className="lp-section-sub dark" style={{ marginBottom: 0 }}>
              Sem curva de aprendizado. Sem configuracoes complexas. Funciona desde o primeiro acesso.
            </p>
          </div>
          <div className="lp-steps">
            {[
              {
                num: 1,
                title: 'Cadastre o orcamento',
                desc: 'Registre cliente, servico, valor e canal de origem. Em segundos o sistema ja comeca a rastrear o ciclo comercial automaticamente.'
              },
              {
                num: 2,
                title: 'Mova pelo funil',
                desc: 'Use o Kanban para arrastar propostas entre etapas. Enviou? Mova. Cliente contratou? Registre. Recusou? Anote o motivo para aprender.'
              },
              {
                num: 3,
                title: 'Analise e decida melhor',
                desc: 'Com dados historicos, voce identifica quais servicos convertem mais, qual canal traz leads melhores e onde esta perdendo dinheiro.'
              }
            ].map((step) => (
              <div key={step.num} className="lp-step">
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-content">
                  <h3 className="lp-step-h3">{step.title}</h3>
                  <p className="lp-step-p">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DEPOIMENTO                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-testimonial">
        <div className="lp-testimonial-inner">
          <span className="lp-quote-mark">"</span>
          <blockquote className="lp-quote-text">
            Antes do SGO, perdia propostas em mensagens antigas do WhatsApp. Agora vejo tudo centralizado,
            minha taxa de conversao e clara, e nunca mais deixo cliente esquecido. Meu ticket medio
            subiu 15% em 3 meses so porque consegui identificar qual servico vendia melhor.
          </blockquote>
          <div className="lp-quote-author">
            <div className="lp-author-avatar">AC</div>
            <div>
              <div className="lp-author-name">Ana Carolina Menezes</div>
              <div className="lp-author-role">Fotografa de Casamentos — Sao Paulo, SP</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PRECOS                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner">
          <div className="lp-pricing-header">
            <span className="lp-section-eyebrow">Planos</span>
            <h2 className="lp-section-h2 dark">Simples, transparente, sem surpresas</h2>
            <p className="lp-section-sub dark" style={{ marginBottom: 0 }}>
              Cancele quando quiser. Sem multa. Sem fidelidade.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {/* Starter */}
            <div className="lp-plan">
              <div>
                <h3 className="lp-plan-name dark">Starter</h3>
                <p className="lp-plan-desc dark">Para quem esta comecando a organizar o negocio</p>
                <div className="lp-plan-price dark">Gratis</div>
                <span className="lp-plan-period dark">Para sempre</span>
              </div>
              <ul className="lp-plan-features dark">
                {[
                  'Ate 50 orcamentos por mes',
                  'Dashboard basico',
                  'Kanban visual',
                  'Gestao de clientes',
                  'Suporte por email'
                ].map((f) => (
                  <li key={f}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="lp-plan-cta-dark" id="plan-starter-cta">
                Comecar Agora
              </Link>
            </div>

            {/* Pro */}
            <div className="lp-plan featured" style={{ position: 'relative' }}>
              <div className="lp-plan-badge">Mais popular</div>
              <div>
                <h3 className="lp-plan-name light">Pro</h3>
                <p className="lp-plan-desc light">Para profissionais serios que querem crescer com dados</p>
                <div className="lp-plan-price light">R$ 97</div>
                <span className="lp-plan-period light">por mes</span>
              </div>
              <ul className="lp-plan-features light">
                {[
                  'Orcamentos ilimitados',
                  'Deep Analytics (6 meses)',
                  'Alertas inteligentes de performance',
                  'Exportacao Excel e PDF',
                  'Ate 3 usuarios na equipe',
                  'Integracao WhatsApp',
                  'Suporte prioritario'
                ].map((f) => (
                  <li key={f}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="lp-plan-cta-light" id="plan-pro-cta">
                Testar gratis por 14 dias
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: '#64748b' }}>
            Starter gratuito permanentemente. Faca upgrade para Pro quando precisar de mais potencia.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA FINAL                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-h2">
            Pronto para dominar seu funil de vendas?
          </h2>
          <p className="lp-cta-sub">
            Comece gratis hoje. Nenhum cartao de credito exigido. Resultados desde o primeiro acesso.
          </p>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn-white" id="cta-final-register">
              Criar conta gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login" style={{
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 500,
              fontSize: 15,
              textDecoration: 'none',
              padding: '16px 8px',
              transition: 'color 0.2s'
            }} id="cta-final-login">
              Ja tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div>
              <a href="/" className="lp-logo" style={{ textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
                <img src={logoSgoDark} alt="SGO Logo" style={{ height: '64px' }} />
              </a>
              <p className="lp-footer-brand-desc">
                Sistema de Gestao de Orcamentos para profissionais criativos e freelancers que querem crescer com dados.
              </p>
            </div>

            <div>
              <p className="lp-footer-col-title">Produto</p>
              <ul className="lp-footer-links">
                <li><a href="#features">Funcionalidades</a></li>
                <li><a href="#pricing">Precos</a></li>
                <li><a href="#how">Como funciona</a></li>
              </ul>
            </div>

            <div>
              <p className="lp-footer-col-title">Empresa</p>
              <ul className="lp-footer-links">
                <li><a href="#">Sobre</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Contato</a></li>
              </ul>
            </div>

            <div>
              <p className="lp-footer-col-title">Legal</p>
              <ul className="lp-footer-links">
                <li><a href="#">Privacidade</a></li>
                <li><a href="#">Termos de uso</a></li>
                <li><a href="#">LGPD</a></li>
              </ul>
            </div>
          </div>

          <hr className="lp-footer-divider" />

          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">2026 SGO. Todos os direitos reservados.</span>
            <span className="lp-footer-copy">Sao Paulo, Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
