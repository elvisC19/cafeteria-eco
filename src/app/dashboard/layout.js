'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const menuItems = {
  SuperAdmin: [
    { href: '/dashboard/admin', label: 'Métricas' },
    { href: '/dashboard/admin/personal', label: 'Personal' },
    { href: '/dashboard/almacen', label: 'Inventario' },
    { href: '/dashboard/cajero', label: 'Punto de Venta' },
    { href: '/dashboard/cocina', label: 'Cola Cocina' },
  ],
  Administrador: [
    { href: '/dashboard/admin', label: 'Métricas' },
    { href: '/dashboard/admin/personal', label: 'Personal' },
    { href: '/dashboard/almacen', label: 'Inventario' },
  ],
  Cajero: [
    { href: '/dashboard/cajero', label: 'Punto de Venta' },
    { href: '/dashboard/cajero/mesas', label: 'Mapa de Mesas' },
  ],
  Barista: [
    { href: '/dashboard/cocina', label: 'Cola de Pedidos' },
  ],
  Cocina: [
    { href: '/dashboard/cocina', label: 'Cola de Pedidos' },
  ],
  Mesero: [
    { href: '/dashboard/cajero', label: 'Tomar Pedido' },
    { href: '/dashboard/cajero/mesas', label: 'Mesas' },
  ],
};

const getSidebarIcon = (label) => {
  const c = "w-5 h-5 flex-shrink-0";
  switch (label) {
    case 'Métricas':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'Personal':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'Inventario':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'Punto de Venta':
    case 'Tomar Pedido':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'Cola Cocina':
    case 'Cola de Pedidos':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case 'Mapa de Mesas':
    case 'Mesas':
      return (
        <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function DashboardLayout({ children }) {
  const { usuario, loading, logout, isAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!loading && !isAuth) {
      router.push('/login');
    }
  }, [loading, isAuth, router]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) return null;

  const items = menuItems[usuario?.rol] || [];

  const rolColors = {
    SuperAdmin: 'from-purple-500 to-purple-700',
    Administrador: 'from-blue-500 to-blue-700',
    Cajero: 'from-green-500 to-green-700',
    Barista: 'from-amber-500 to-amber-700',
    Cocina: 'from-orange-500 to-orange-700',
    Mesero: 'from-teal-500 to-teal-700',
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-card)] select-none">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[var(--color-bg-dark)] border-r border-[var(--color-border-dark)] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-[var(--color-border-dark)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-cta)] flex items-center justify-center text-lg font-bold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
              CC
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>Charcas Capital</h2>
              <p className="text-[11px] text-white/50 font-medium">{time}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3 px-1 font-bold">Módulos</p>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-[var(--color-border-dark)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-cta)] flex items-center justify-center text-white text-sm font-bold">
              {usuario?.nombre?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">{usuario?.nombre}</p>
              <p className="text-xs text-white/50">{usuario?.rol}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="btn-secondary w-full text-xs flex items-center justify-center gap-2 !border-white/20 !text-white hover:!bg-white hover:!text-black hover:!border-white transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen bg-[var(--color-bg-card)]">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-[var(--color-bg-dark)] border-b border-[var(--color-border-dark)] px-4 py-3 flex items-center justify-between text-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>Charcas Capital</span>
          <span className="text-xs text-white/60">{time}</span>
        </header>

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
