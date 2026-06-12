'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const savedToken = localStorage.getItem('cc_token');
    const savedUser = localStorage.getItem('cc_usuario');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUsuario(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = async (nombre, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error de autenticación');
    
    setToken(data.token);
    setUsuario(data.usuario);
    localStorage.setItem('cc_token', data.token);
    localStorage.setItem('cc_usuario', JSON.stringify(data.usuario));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_usuario');
  };

  const isAuth = !!token && !!usuario;

  return (
    <AuthContext.Provider value={{ usuario, token, loading, login, logout, isAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
