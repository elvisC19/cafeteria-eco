'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-gold)] rounded-full mix-blend-multiply filter blur-[128px] opacity-8 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-5 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gold)] flex items-center justify-center text-lg font-bold text-[var(--bg-primary)]">
            CC
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Charcas Capital</h1>
            <p className="text-xs text-[var(--text-muted)]">Cafetería & Salón de Té</p>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/menu" className="btn-secondary text-sm">
            🍽️ Ver Menú
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Ingresar al Sistema
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="mb-6">
          <span className="badge badge-info text-xs tracking-wider uppercase">Sistema ERP/POS</span>
        </div>

        <h2 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
          <span className="text-[var(--text-primary)]">El Sabor de</span>
          <br />
          <span className="bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gold)] bg-clip-text text-transparent">
            Chuquisaca
          </span>
        </h2>

        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-10 leading-relaxed">
          Sistema integral de gestión para la cafetería Charcas Capital.
          Punto de venta, control de inventarios, gestión de pedidos y métricas en tiempo real.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/menu" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Explorar Menú
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Panel de Empleados
          </Link>
        </div>

        {/* Feature cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { icon: '☕', title: 'Punto de Venta', desc: 'POS táctil para gestionar pedidos del salón y para llevar' },
            { icon: '📊', title: 'Métricas en Vivo', desc: 'Dashboard de ingresos, productos top y reportes diarios' },
            { icon: '📦', title: 'Control de Stock', desc: 'Inventario inteligente con alertas automáticas de reabastecimiento' },
          ].map((f, i) => (
            <div key={i} className="glass-card p-6 text-left" style={{ animationDelay: `${i * 0.15}s` }}>
              <span className="text-3xl mb-3 block">{f.icon}</span>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-xs text-[var(--text-muted)]">
        <p>Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca</p>
        <p className="mt-1">Ingeniería Económica (IND210) — Cafetería "Charcas Capital" © 2026</p>
      </footer>
    </div>
  );
}
