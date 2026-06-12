'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const menuItems = {
  SuperAdmin: [
    { href: '/dashboard/admin', label: 'Métricas', icon: '📊' },
    { href: '/dashboard/admin/personal', label: 'Personal', icon: '👥' },
    { href: '/dashboard/almacen', label: 'Inventario', icon: '📦' },
    { href: '/dashboard/cajero', label: 'Punto de Venta', icon: '💳' },
    { href: '/dashboard/cocina', label: 'Cola Cocina', icon: '🍳' },
  ],
  Administrador: [
    { href: '/dashboard/admin', label: 'Métricas', icon: '📊' },
    { href: '/dashboard/admin/personal', label: 'Personal', icon: '👥' },
    { href: '/dashboard/almacen', label: 'Inventario', icon: '📦' },
  ],
  Cajero: [
    { href: '/dashboard/cajero', label: 'Punto de Venta', icon: '💳' },
    { href: '/dashboard/cajero/mesas', label: 'Mapa de Mesas', icon: '🪑' },
  ],
  Barista: [
    { href: '/dashboard/cocina', label: 'Cola de Pedidos', icon: '☕' },
  ],
  Cocina: [
    { href: '/dashboard/cocina', label: 'Cola de Pedidos', icon: '🍳' },
  ],
  Mesero: [
    { href: '/dashboard/cajero', label: 'Tomar Pedido', icon: '📝' },
    { href: '/dashboard/cajero/mesas', label: 'Mesas', icon: '🪑' },
  ],
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
    <div className="min-h-screen flex">
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gold)] flex items-center justify-center text-lg font-bold text-[var(--bg-primary)]">
              CC
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Charcas Capital</h2>
              <p className="text-xs text-[var(--text-muted)]">{time}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 px-1">Módulos</p>
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
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rolColors[usuario?.rol] || 'from-gray-500 to-gray-700'} flex items-center justify-center text-white text-sm font-bold`}>
              {usuario?.nombre?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{usuario?.nombre}</p>
              <p className="text-xs text-[var(--text-muted)]">{usuario?.rol}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="btn-secondary w-full text-xs flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)]"
          >
            <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Charcas Capital</span>
          <span className="text-xs text-[var(--text-muted)]">{time}</span>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
