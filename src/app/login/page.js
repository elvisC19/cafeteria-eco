'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(nombre, password);
      // Redirigir según rol
      const rol = data.usuario.rol;
      if (rol === 'SuperAdmin' || rol === 'Administrador') {
        router.push('/dashboard/admin');
      } else if (rol === 'Cajero') {
        router.push('/dashboard/cajero');
      } else if (rol === 'Barista' || rol === 'Cocina') {
        router.push('/dashboard/cocina');
      } else {
        router.push('/dashboard/almacen');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-[var(--color-bg-dark)] overflow-hidden select-none">
      
      {/* Decorative subtle ambient lights */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-cta)] rounded-full filter blur-[150px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-gold)] rounded-full filter blur-[150px] opacity-5" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-fade-in py-8">
        
        {/* Card central */}
        <div className="bg-[var(--color-bg-white)] rounded-[16px] shadow-[var(--shadow-modal)] p-12">
          
          {/* Logo arriba de la card */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <div className="w-16 h-16 rounded-[12px] bg-[var(--color-cta)] flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                CC
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Charcas Capital
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 font-sans">Acceso al Panel de Gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                Nombre de Usuario
              </label>
              <input
                id="login-nombre"
                type="text"
                className="input-field"
                placeholder="Ej: Carlos Mendoza"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded-lg p-3 text-xs text-[var(--color-danger)] flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Ingresar
                </>
              )}
            </button>
          </form>

          {/* Sección credenciales demo */}
          <div className="mt-8 bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] rounded-[12px] p-5">
            <p className="text-[11px] text-[var(--color-text-muted)] mb-3 text-center font-bold uppercase tracking-wider">
              Credenciales de Demostración
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { nombre: 'Administrador General', pass: 'admin123', rol: 'SuperAdmin' },
                { nombre: 'Carlos Mendoza', pass: 'cajero123', rol: 'Cajero' },
                { nombre: 'María Gutiérrez', pass: 'barista123', rol: 'Barista' },
                { nombre: 'José Flores', pass: 'cocina123', rol: 'Cocina' },
              ].map((cred, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setNombre(cred.nombre); setPassword(cred.pass); }}
                  className="text-left p-2.5 rounded-lg bg-white border border-[var(--color-border-warm)] hover:border-[var(--color-cta)] transition-all duration-150 cursor-pointer flex flex-col justify-between h-14"
                >
                  <span className="block text-[var(--color-text-primary)] font-bold truncate w-full">{cred.nombre}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{cred.rol}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer outside the card */}
        <p className="text-center text-xs text-white/40 mt-6 font-medium">
          IND210 — Universidad San Francisco Xavier
        </p>
      </div>
    </div>
  );
}
