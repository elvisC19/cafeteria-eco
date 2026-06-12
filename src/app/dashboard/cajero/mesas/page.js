'use client';
import { useState, useEffect } from 'react';
import { mesasAPI } from '@/lib/api';

export default function MesasPage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({});

  useEffect(() => {
    loadMesas();
    const interval = setInterval(loadMesas, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadMesas() {
    try {
      const data = await mesasAPI.obtener();
      setMesas(data.mesas || []);
      setResumen(data.resumen || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(id_mesa, nuevoEstado) {
    try {
      await mesasAPI.actualizar(id_mesa, nuevoEstado);
      loadMesas();
    } catch (err) {
      alert(err.message);
    }
  }

  const estadoConfig = {
    Disponible: { color: 'bg-emerald-500', textColor: 'text-emerald-400', icon: '🟢', borderClass: 'mesa-disponible' },
    Ocupada: { color: 'bg-red-500', textColor: 'text-red-400', icon: '🔴', borderClass: 'mesa-ocupada' },
    Reservada: { color: 'bg-amber-500', textColor: 'text-amber-400', icon: '🟡', borderClass: 'mesa-reservada' },
    Inactiva: { color: 'bg-gray-500', textColor: 'text-gray-400', icon: '⚫', borderClass: 'mesa-inactiva' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Mapa del Salón
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Control visual de ocupación de mesas</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(estadoConfig).map(([estado, cfg]) => (
          <div key={estado} className="glass-card p-4 flex items-center gap-3">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">{resumen[estado.toLowerCase() + 's'] || 0}</p>
              <p className="text-xs text-[var(--text-muted)]">{estado}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {mesas.map(mesa => {
          const cfg = estadoConfig[mesa.estado] || estadoConfig.Disponible;
          return (
            <div key={mesa.id_mesa} className={`glass-card p-5 text-center border-2 ${cfg.borderClass} transition-all`}>
              <div className={`w-12 h-12 rounded-xl ${cfg.color} bg-opacity-20 flex items-center justify-center text-xl font-bold mx-auto mb-3`}>
                {mesa.numero_mesa}
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa {mesa.numero_mesa}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{mesa.capacidad} personas</p>
              <span className={`inline-block mt-2 badge ${
                mesa.estado === 'Disponible' ? 'badge-success' :
                mesa.estado === 'Ocupada' ? 'badge-danger' :
                mesa.estado === 'Reservada' ? 'badge-warning' : 'badge-info'
              }`}>
                {mesa.estado}
              </span>

              {/* Active order info */}
              {mesa.pedido_activo && (
                <div className="mt-3 p-2 rounded-lg bg-[var(--bg-secondary)] text-xs">
                  <p className="text-[var(--text-muted)]">Pedido #{mesa.pedido_activo.id_pedido}</p>
                  <p className="text-[var(--accent-secondary)] font-semibold">
                    Bs. {parseFloat(mesa.pedido_activo.total_pago).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Quick actions */}
              <div className="mt-3 flex gap-1 justify-center">
                {mesa.estado === 'Disponible' && (
                  <button onClick={() => cambiarEstado(mesa.id_mesa, 'Reservada')} className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--warning)] hover:bg-[var(--bg-card-hover)]">
                    Reservar
                  </button>
                )}
                {mesa.estado === 'Ocupada' && (
                  <button onClick={() => cambiarEstado(mesa.id_mesa, 'Disponible')} className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--success)] hover:bg-[var(--bg-card-hover)]">
                    Liberar
                  </button>
                )}
                {mesa.estado === 'Reservada' && (
                  <>
                    <button onClick={() => cambiarEstado(mesa.id_mesa, 'Disponible')} className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--success)] hover:bg-[var(--bg-card-hover)]">
                      Liberar
                    </button>
                    <button onClick={() => cambiarEstado(mesa.id_mesa, 'Ocupada')} className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--danger)] hover:bg-[var(--bg-card-hover)]">
                      Ocupar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
