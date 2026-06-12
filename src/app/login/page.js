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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-[120px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-[var(--accent-gold)] rounded-full mix-blend-multiply filter blur-[120px] opacity-8" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gold)] flex items-center justify-center text-2xl font-bold text-[var(--bg-primary)] mx-auto mb-4 shadow-lg">
              CC
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Charcas Capital
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Acceso al Panel de Gestión</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
              <div className="bg-[rgba(248,113,113,0.1)] border border-[var(--danger)] rounded-xl p-3 text-sm text-[var(--danger)] flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] mb-3 text-center font-medium uppercase tracking-wider">
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
                className="text-left p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors border border-transparent hover:border-[var(--accent-primary)]"
              >
                <span className="block text-[var(--text-primary)] font-medium truncate">{cred.nombre}</span>
                <span className="text-[var(--text-muted)]">{cred.rol}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          IND210 — Universidad San Francisco Xavier
        </p>
      </div>
    </div>
  );
}
