'use client';
import { useState, useEffect } from 'react';
import { reportesAPI, pedidosAPI } from '@/lib/api';

export default function AdminPage() {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh cada 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const data = await reportesAPI.ingresos();
      setMetricas(data.metricas);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-[var(--danger)] mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary">Reintentar</button>
      </div>
    );
  }

  const hoy = metricas?.hoy || {};

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Panel de Administración
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Resumen de operaciones del día — {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingresos del Día"
          value={`Bs. ${parseFloat(hoy.ingresos_pagados || 0).toFixed(2)}`}
          subtitle="Pagados confirmados"
          icon="💰"
          color="from-emerald-500/20 to-emerald-600/5"
          borderColor="border-emerald-500/30"
        />
        <MetricCard
          title="Pedidos Hoy"
          value={hoy.total_pedidos || 0}
          subtitle="Comandas registradas"
          icon="📋"
          color="from-blue-500/20 to-blue-600/5"
          borderColor="border-blue-500/30"
        />
        <MetricCard
          title="Efectivo en Caja"
          value={`Bs. ${parseFloat(hoy.efectivo || 0).toFixed(2)}`}
          subtitle="Pagos en efectivo"
          icon="💵"
          color="from-amber-500/20 to-amber-600/5"
          borderColor="border-amber-500/30"
        />
        <MetricCard
          title="Pagos QR"
          value={`Bs. ${parseFloat(hoy.qr || 0).toFixed(2)}`}
          subtitle="Transferencias QR"
          icon="📱"
          color="from-purple-500/20 to-purple-600/5"
          borderColor="border-purple-500/30"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly revenue */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            📈 Ingresos Últimos 7 Días
          </h3>
          <div className="space-y-3">
            {(metricas?.semanal || []).map((dia, i) => {
              const maxIngreso = Math.max(...(metricas?.semanal || []).map(d => parseFloat(d.ingresos) || 1));
              const percentage = ((parseFloat(dia.ingresos) || 0) / maxIngreso) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] w-20 flex-shrink-0">
                    {new Date(dia.fecha).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-xs font-semibold text-[var(--bg-primary)]">
                        {parseFloat(dia.ingresos).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] w-12 text-right">{dia.pedidos}p</span>
                </div>
              );
            })}
            {(!metricas?.semanal || metricas.semanal.length === 0) && (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">Sin datos esta semana</p>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            🏆 Top 5 Productos del Mes
          </h3>
          <div className="space-y-3">
            {(metricas?.top_productos || []).map((prod, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gold)] flex items-center justify-center text-sm font-bold text-[var(--bg-primary)]">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{prod.nombre_producto}</p>
                  <p className="text-xs text-[var(--text-muted)]">{prod.categoria}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--accent-secondary)]">{prod.total_vendido} uds</p>
                  <p className="text-xs text-[var(--text-muted)]">Bs. {parseFloat(prod.ingresos_generados).toFixed(2)}</p>
                </div>
              </div>
            ))}
            {(!metricas?.top_productos || metricas.top_productos.length === 0) && (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">Sin datos disponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders by status */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          📊 Pedidos por Estado (Hoy)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['Pendiente', 'En Preparación', 'Listo', 'Entregado', 'Cancelado'].map((estado) => {
            const found = (metricas?.por_estado || []).find(e => e.estado_pedido === estado);
            const cantidad = found ? parseInt(found.cantidad) : 0;
            const colors = {
              Pendiente: 'text-[var(--warning)] bg-[rgba(251,191,36,0.1)]',
              'En Preparación': 'text-[var(--info)] bg-[rgba(96,165,250,0.1)]',
              Listo: 'text-emerald-400 bg-[rgba(52,211,153,0.1)]',
              Entregado: 'text-[var(--success)] bg-[rgba(74,222,128,0.1)]',
              Cancelado: 'text-[var(--danger)] bg-[rgba(248,113,113,0.1)]',
            };
            return (
              <div key={estado} className={`rounded-xl p-4 text-center ${colors[estado]}`}>
                <p className="text-2xl font-bold">{cantidad}</p>
                <p className="text-xs mt-1 opacity-80">{estado}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color, borderColor }) {
  return (
    <div className={`metric-card bg-gradient-to-br ${color} border ${borderColor}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm font-medium text-[var(--text-primary)] mt-1">{title}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
    </div>
  );
}
