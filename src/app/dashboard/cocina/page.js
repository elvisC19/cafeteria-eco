'use client';
import { useState, useEffect } from 'react';
import { pedidosAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function CocinaPage() {
  const { usuario } = useAuth();
  const [cola, setCola] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEnCola, setTotalEnCola] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState('Todo');

  useEffect(() => {
    loadCola();
    const interval = setInterval(loadCola, 5000); // Refresh cada 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (usuario?.rol === 'Barista') {
      setFiltroCategoria('Bebidas');
    } else if (usuario?.rol === 'Cocina') {
      setFiltroCategoria('Comida');
    } else {
      setFiltroCategoria('Todo');
    }
  }, [usuario]);

  async function loadCola() {
    try {
      const data = await pedidosAPI.colaFIFO();
      setCola(data.cola || []);
      setTotalEnCola(data.total_en_cola || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(id_pedido, nuevoEstado) {
    try {
      await pedidosAPI.actualizarEstado(id_pedido, nuevoEstado);
      loadCola();
    } catch (err) {
      alert(err.message);
    }
  }

  function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  const categoriasBebidas = ['Bebidas Calientes', 'Bebidas Frías'];
  const categoriasComida = ['Repostería', 'Desayunos', 'Meriendas'];

  const colaFiltrada = cola.map(pedido => {
    let itemsFiltrados = pedido.items || [];
    if (filtroCategoria === 'Bebidas') {
      itemsFiltrados = itemsFiltrados.filter(item => categoriasBebidas.includes(item.categoria));
    } else if (filtroCategoria === 'Comida') {
      itemsFiltrados = itemsFiltrados.filter(item => categoriasComida.includes(item.categoria));
    }
    return { ...pedido, items: itemsFiltrados };
  }).filter(pedido => {
    if (filtroCategoria === 'Todo') return true;
    return pedido.items.length > 0;
  });

  const pendientes = colaFiltrada.filter(p => p.estado_pedido === 'Pendiente');
  const enPreparacion = colaFiltrada.filter(p => p.estado_pedido === 'En Preparación');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            {usuario?.rol === 'Barista' ? 'Cola de Barismo' : usuario?.rol === 'Cocina' ? 'Cola de Cocina' : 'Cola de Pedidos'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            FIFO — {totalEnCola} pedidos activos en total • Auto-refresh cada 5 segundos
          </p>
        </div>
        <button onClick={loadCola} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tabs Filtro de Categoría */}
      <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-fit">
        <button
          onClick={() => setFiltroCategoria('Todo')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filtroCategoria === 'Todo'
              ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] text-[var(--bg-primary)] shadow-lg'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Ver Todo
        </button>
        <button
          onClick={() => setFiltroCategoria('Bebidas')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filtroCategoria === 'Bebidas'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Barismo (Bebidas)
        </button>
        <button
          onClick={() => setFiltroCategoria('Comida')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filtroCategoria === 'Comida'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cocina (Comida)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-[var(--warning)]">
          <svg className="w-8 h-8 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-2xl font-bold text-[var(--warning)]">{pendientes.length}</p>
            <p className="text-sm text-[var(--text-muted)]">Pendientes</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-[var(--info)]">
          <svg className="w-8 h-8 text-[var(--info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <div>
            <p className="text-2xl font-bold text-[var(--info)]">{enPreparacion.length}</p>
            <p className="text-sm text-[var(--text-muted)]">En Preparación</p>
          </div>
        </div>
      </div>

      {colaFiltrada.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-[var(--text-primary)]">Cola vacía</p>
          <p className="text-sm text-[var(--text-muted)]">No hay pedidos pendientes para este sector</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colaFiltrada.map((pedido, i) => {
            const isPendiente = pedido.estado_pedido === 'Pendiente';
            const tiempoEspera = pedido.segundos_espera || 0;
            const isUrgente = tiempoEspera > 600; // > 10 min

            return (
              <div
                key={pedido.id_pedido}
                className={`border border-[var(--color-border-warm)] p-5 rounded-xl border-l-4 ${
                  isUrgente ? 'border-l-[var(--color-cta)] bg-[#FFF8F8]' : 'border-l-[var(--color-gold)] bg-white'
                } animate-slide-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--color-text-primary)]">
                      #{pedido.id_pedido}
                    </span>
                    <span className={`badge ${isPendiente ? 'state-pendiente' : 'state-preparacion'}`}>
                      {pedido.estado_pedido}
                    </span>
                  </div>
                  <span className={`text-sm font-mono font-bold flex items-center gap-1 ${
                    isUrgente ? 'text-[var(--color-cta)] animate-pulse-urgente' : 'text-[var(--color-text-muted)]'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(tiempoEspera)}
                  </span>
                </div>

                {/* Service info */}
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mb-4">
                  <span className="flex items-center gap-1">
                    {pedido.tipo_servicio === 'Comer en el Lugar' ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                        </svg>
                        <span>Mesa {pedido.numero_mesa}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Para Llevar</span>
                      </>
                    )}
                  </span>
                  {pedido.atendido_por && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{pedido.atendido_por}</span>
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-2 mb-5">
                  {pedido.items?.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 bg-[var(--color-bg-card)] rounded-lg p-2.5 border border-[var(--color-border-warm)]/40">
                      <span className="text-sm font-bold text-[var(--color-text-secondary)] w-6">{item.cantidad}x</span>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--color-text-primary)] font-medium">{item.nombre_producto}</p>
                        {item.observaciones && (
                          <p className="text-xs text-[var(--color-warning)] mt-1 italic font-medium flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{item.observaciones}</span>
                          </p>
                        )}
                        {filtroCategoria === 'Todo' && (
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider block mt-1">
                            {item.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isPendiente && (
                    <button
                      onClick={() => cambiarEstado(pedido.id_pedido, 'En Preparación')}
                      className="flex-1 text-sm py-2 rounded-[6px] font-bold bg-[var(--color-gold)] text-[var(--color-bg-dark)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
                    >
                      Preparar
                    </button>
                  )}
                  {pedido.estado_pedido === 'En Preparación' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id_pedido, 'Listo')}
                      className="flex-1 text-sm py-2 rounded-[6px] font-bold bg-[var(--color-success)] text-white hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
                    >
                      Listo
                    </button>
                  )}
                  <button
                    onClick={() => cambiarEstado(pedido.id_pedido, 'Cancelado')}
                    className="text-xs px-3 rounded-[6px] font-bold bg-transparent border border-[var(--color-cta)] text-[var(--color-cta)] hover:bg-[var(--color-cta)]/5 transition-all cursor-pointer flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
