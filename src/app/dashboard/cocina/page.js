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
            {usuario?.rol === 'Barista' ? '☕ Cola de Barismo' : usuario?.rol === 'Cocina' ? '🍳 Cola de Cocina' : '📋 Cola de Pedidos'}
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
          🗂️ Ver Todo
        </button>
        <button
          onClick={() => setFiltroCategoria('Bebidas')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filtroCategoria === 'Bebidas'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          ☕ Barismo (Bebidas)
        </button>
        <button
          onClick={() => setFiltroCategoria('Comida')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filtroCategoria === 'Comida'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🍳 Cocina (Comida)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-[var(--warning)]">
          <span className="text-3xl">⏳</span>
          <div>
            <p className="text-2xl font-bold text-[var(--warning)]">{pendientes.length}</p>
            <p className="text-sm text-[var(--text-muted)]">Pendientes</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-[var(--info)]">
          <span className="text-3xl">👨‍🍳</span>
          <div>
            <p className="text-2xl font-bold text-[var(--info)]">{enPreparacion.length}</p>
            <p className="text-sm text-[var(--text-muted)]">En Preparación</p>
          </div>
        </div>
      </div>

      {colaFiltrada.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="text-5xl block mb-4">✅</span>
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
                className={`glass-card p-5 border-l-4 ${
                  isPendiente
                    ? isUrgente ? 'border-[var(--danger)] animate-pulse-danger' : 'border-[var(--warning)]'
                    : 'border-[var(--info)]'
                } animate-slide-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--text-primary)]">
                      #{pedido.id_pedido}
                    </span>
                    <span className={`badge ${isPendiente ? (isUrgente ? 'badge-danger' : 'badge-warning') : 'badge-info'}`}>
                      {pedido.estado_pedido}
                    </span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${isUrgente ? 'text-[var(--danger)] animate-pulse' : 'text-[var(--text-muted)]'}`}>
                    ⏱️ {formatTime(tiempoEspera)}
                  </span>
                </div>

                {/* Service info */}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                  <span>{pedido.tipo_servicio === 'Comer en el Lugar' ? `🪑 Mesa ${pedido.numero_mesa}` : '📦 Para Llevar'}</span>
                  {pedido.atendido_por && <span>👤 {pedido.atendido_por}</span>}
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {pedido.items?.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 bg-[var(--bg-secondary)] rounded-lg p-2">
                      <span className="text-sm font-bold text-[var(--accent-secondary)] w-6">{item.cantidad}x</span>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text-primary)]">{item.nombre_producto}</p>
                        {item.observaciones && (
                          <p className="text-xs text-[var(--warning)] mt-0.5 italic">⚠️ {item.observaciones}</p>
                        )}
                        {filtroCategoria === 'Todo' && (
                          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block mt-0.5">
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
                      className="btn-primary flex-1 text-sm py-2"
                    >
                      👨‍🍳 Preparar
                    </button>
                  )}
                  {pedido.estado_pedido === 'En Preparación' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id_pedido, 'Listo')}
                      className="flex-1 text-sm py-2 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg transition-all"
                    >
                      ✅ Listo
                    </button>
                  )}
                  <button
                    onClick={() => cambiarEstado(pedido.id_pedido, 'Cancelado')}
                    className="btn-secondary text-xs px-3 text-[var(--danger)]"
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
