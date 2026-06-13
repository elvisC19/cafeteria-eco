'use client';
import { useState, useEffect } from 'react';
import { insumosAPI } from '@/lib/api';

export default function AlmacenPage() {
  const [insumos, setInsumos] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [showReabastecer, setShowReabastecer] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => { loadInsumos(); }, []);

  async function loadInsumos() {
    try {
      const data = await insumosAPI.listar();
      setInsumos(data.insumos || []);
      setResumen(data.resumen || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function reabastecer(id_insumo) {
    if (!cantidadAgregar || parseFloat(cantidadAgregar) <= 0) {
      setError('Ingrese una cantidad válida.');
      return;
    }
    try {
      const result = await insumosAPI.reabastecer(id_insumo, parseFloat(cantidadAgregar));
      setSuccess(result.message);
      setShowReabastecer(null);
      setCantidadAgregar('');
      loadInsumos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  const insumosFiltrados = filtro === 'criticos'
    ? insumos.filter(i => parseFloat(i.stock_actual) <= parseFloat(i.stock_minimo))
    : insumos;

  const porcentajeStock = (actual, minimo) => {
    const pct = (parseFloat(actual) / (parseFloat(minimo) * 3)) * 100;
    return Math.min(pct, 100);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
            <svg className="w-7 h-7 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Control de Inventario</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Gestión de materia prima y alertas de stock</p>
        </div>
        <button onClick={loadInsumos} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {success && (
        <div className="toast bg-[rgba(74,222,128,0.15)] border border-[var(--success)] text-[var(--success)] flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-[rgba(248,113,113,0.1)] border border-[var(--danger)] rounded-xl p-3 text-sm text-[var(--danger)]">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-xs">✕</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-l-4 border-[var(--info)]">
          <p className="text-3xl font-bold text-[var(--text-primary)]">{resumen.total || 0}</p>
          <p className="text-sm text-[var(--text-muted)]">Total Insumos</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-[var(--success)]">
          <p className="text-3xl font-bold text-[var(--success)]">{resumen.normales || 0}</p>
          <p className="text-sm text-[var(--text-muted)]">Stock Normal</p>
        </div>
        <div className={`glass-card p-5 border-l-4 border-[var(--danger)] ${resumen.criticos > 0 ? 'animate-pulse-danger' : ''}`}>
          <p className="text-3xl font-bold text-[var(--danger)]">{resumen.criticos || 0}</p>
          <p className="text-sm text-[var(--text-muted)]">Stock Crítico</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFiltro('todos')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filtro === 'todos'
              ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] text-[var(--bg-primary)]'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
          }`}
        >
          Todos ({insumos.length})
        </button>
        <button
          onClick={() => setFiltro('criticos')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
            filtro === 'criticos'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Críticos ({insumos.filter(i => parseFloat(i.stock_actual) <= parseFloat(i.stock_minimo)).length})</span>
        </button>
      </div>

      {/* Inventory list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insumosFiltrados.map(insumo => {
          const isCritico = parseFloat(insumo.stock_actual) <= parseFloat(insumo.stock_minimo);
          const isAgotado = parseFloat(insumo.stock_actual) <= 0;
          const pct = porcentajeStock(insumo.stock_actual, insumo.stock_minimo);

          return (
            <div
              key={insumo.id_insumo}
              className={`glass-card p-5 ${isCritico ? 'border-[var(--danger)] animate-pulse-danger' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{insumo.nombre_insumo}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{insumo.unidad_medida}</p>
                </div>
                {isAgotado ? (
                  <span className="badge badge-danger">AGOTADO</span>
                ) : isCritico ? (
                  <span className="badge badge-danger">CRÍTICO</span>
                ) : insumo.nivel_stock === 'BAJO' ? (
                  <span className="badge badge-warning">BAJO</span>
                ) : (
                  <span className="badge badge-success">NORMAL</span>
                )}
              </div>

              {/* Stock bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--text-muted)]">Stock Actual</span>
                  <span className={`font-bold ${isCritico ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                    {parseFloat(insumo.stock_actual).toFixed(2)} {insumo.unidad_medida}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritico ? 'bg-[var(--danger)]' : pct < 40 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Mínimo requerido: {parseFloat(insumo.stock_minimo).toFixed(2)} {insumo.unidad_medida}
                </p>
              </div>

              {/* Restock */}
              {showReabastecer === insumo.id_insumo ? (
                <div className="flex gap-2 animate-slide-up">
                  <input
                    type="number"
                    step="0.01"
                    className="input-field flex-1 text-sm"
                    placeholder={`Cantidad en ${insumo.unidad_medida}`}
                    value={cantidadAgregar}
                    onChange={(e) => setCantidadAgregar(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => reabastecer(insumo.id_insumo)} className="btn-primary text-sm px-4">
                    Agregar
                  </button>
                  <button onClick={() => { setShowReabastecer(null); setCantidadAgregar(''); }} className="btn-secondary text-sm px-3">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowReabastecer(insumo.id_insumo); setCantidadAgregar(''); }}
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Reabastecer
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
