'use client';
import { useState, useEffect } from 'react';
import { reportesAPI, productosAPI, insumosAPI, fetchRentabilidadMenu, postSimulacionInflacion, fetchPuntoEquilibrio } from '@/lib/api';

export default function AdminPage() {
  const [metricas, setMetricas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [urlEdits, setUrlEdits] = useState({});
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'catalog', 'attendance', 'cashflow', 'economic_intelligence'
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Nuevos estados para asistencia y flujo de caja
  const [asistencias, setAsistencias] = useState([]);
  const [filtroAsistencia, setFiltroAsistencia] = useState('');
  const [ventas, setVentas] = useState([]);
  const [filtroVentas, setFiltroVentas] = useState('todos'); // 'todos', 'Efectivo', 'Pago QR Simple'
  const [busquedaVenta, setBusquedaVenta] = useState('');

  // ═══════════════════════════════════════════════════════════════════
  // ESTADOS DEL MÓDULO DE INTELIGENCIA ECONÓMICA
  // ═══════════════════════════════════════════════════════════════════
  const [rentabilidadData, setRentabilidadData] = useState(null);
  const [rentabilidadLoading, setRentabilidadLoading] = useState(false);
  const [equilibrioData, setEquilibrioData] = useState(null);
  const [equilibrioLoading, setEquilibrioLoading] = useState(false);
  const [insumosList, setInsumosList] = useState([]);
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [incremento, setIncremento] = useState(15);
  const [simulacionResult, setSimulacionResult] = useState(null);
  const [simulacionLoading, setSimulacionLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (activeTab === 'metrics') {
        loadMetricsOnly();
      }
    }, 30000); // Refresh metrics cada 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    } else if (activeTab === 'cashflow') {
      loadVentas();
    } else if (activeTab === 'catalog') {
      loadCatalogOnly();
    } else if (activeTab === 'metrics') {
      loadData();
    } else if (activeTab === 'economic_intelligence') {
      loadEconomicIntelligence();
    }
  }, [activeTab]);

  async function loadData() {
    try {
      const [metricsData, prodData] = await Promise.all([
        reportesAPI.ingresos(),
        productosAPI.listar(true)
      ]);
      setMetricas(metricsData.metricas);
      setProductos(prodData.productos || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetricsOnly() {
    try {
      const metricsData = await reportesAPI.ingresos();
      setMetricas(metricsData.metricas);
    } catch (err) {
      console.error('Error refreshing metrics:', err.message);
    }
  }

  async function loadCatalogOnly() {
    try {
      const prodData = await productosAPI.listar(true);
      setProductos(prodData.productos || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAttendance() {
    setLoading(true);
    try {
      const res = await fetch('/api/asistencia');
      const data = await res.json();
      if (data.success) {
        setAsistencias(data.asistencias || []);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los registros de asistencia');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadVentas() {
    setLoading(true);
    try {
      const res = await fetch('/api/pedidos');
      const data = await res.json();
      if (data.success) {
        setVentas(data.pedidos || []);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los registros de ventas');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CARGA DE DATOS DE INTELIGENCIA ECONÓMICA
  // ═══════════════════════════════════════════════════════════════════
  async function loadEconomicIntelligence() {
    setRentabilidadLoading(true);
    setEquilibrioLoading(true);
    try {
      const [rentData, eqData, insData] = await Promise.all([
        fetchRentabilidadMenu(),
        fetchPuntoEquilibrio(),
        insumosAPI.listar()
      ]);
      setRentabilidadData(rentData);
      setEquilibrioData(eqData);
      setInsumosList(insData.insumos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRentabilidadLoading(false);
      setEquilibrioLoading(false);
    }
  }

  async function ejecutarSimulacion() {
    if (!selectedInsumo) {
      setError('Seleccione un insumo para simular.');
      return;
    }
    setSimulacionLoading(true);
    setError('');
    try {
      const result = await postSimulacionInflacion({
        id_insumo: parseInt(selectedInsumo),
        incremento_porcentual: incremento
      });
      setSimulacionResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSimulacionLoading(false);
    }
  }

  async function guardarImagenUrl(prod) {
    const newUrl = urlEdits[prod.id_producto];
    if (newUrl === undefined) return;
    
    setProcesando(true);
    setError('');
    try {
      await productosAPI.actualizarImagenUrl(prod.id_producto, newUrl);
      setSuccess(`Imagen de '${prod.nombre_producto}' actualizada.`);
      setTimeout(() => setSuccess(''), 3000);
      await loadCatalogOnly();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBOB = (value) => {
    const num = parseFloat(value || 0);
    return num.toFixed(2) + ' BOB';
  };

  const parseDateLocally = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">Cargando datos del panel...</p>
        </div>
      </div>
    );
  }

  const hoy = metricas?.hoy || {};

  // Filtrado de Asistencias
  const asistenciasFiltradas = asistencias.filter(a => {
    const matchTerm = filtroAsistencia.toLowerCase();
    return (
      a.nombre.toLowerCase().includes(matchTerm) ||
      a.rol.toLowerCase().includes(matchTerm) ||
      a.fecha.toLowerCase().includes(matchTerm)
    );
  });

  // Filtrado de Ventas
  const ventasFiltradas = ventas.filter(v => {
    const matchesSearch = 
      String(v.id_pedido).includes(busquedaVenta) ||
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(busquedaVenta.toLowerCase())) ||
      (v.razon_social_factura && v.razon_social_factura.toLowerCase().includes(busquedaVenta.toLowerCase())) ||
      (v.nit_factura && String(v.nit_factura).includes(busquedaVenta));
    
    const matchesMethod = filtroVentas === 'todos' || v.metodo_pago === filtroVentas;
    return matchesSearch && matchesMethod;
  });

  // Totales de Flujo de Caja (en base a los pedidos cargados y filtrados)
  const totalTransacciones = ventasFiltradas.length;
  const totalEfectivo = ventasFiltradas
    .filter(v => v.estado_pago === 'Pagado' && v.metodo_pago === 'Efectivo')
    .reduce((sum, v) => sum + parseFloat(v.total_pago || 0), 0);
  
  const totalQR = ventasFiltradas
    .filter(v => v.estado_pago === 'Pagado' && v.metodo_pago === 'Pago QR Simple')
    .reduce((sum, v) => sum + parseFloat(v.total_pago || 0), 0);

  const totalIngresosCobrados = ventasFiltradas
    .filter(v => v.estado_pago === 'Pagado')
    .reduce((sum, v) => sum + parseFloat(v.total_pago || 0), 0);

  const totalPorCobrar = ventasFiltradas
    .filter(v => v.estado_pago === 'No Pagado' && v.estado_pedido !== 'Cancelado')
    .reduce((sum, v) => sum + parseFloat(v.total_pago || 0), 0);

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS DE SEMÁFORO DE RENTABILIDAD
  // ═══════════════════════════════════════════════════════════════════
  const getMargenBadge = (margen) => {
    const m = parseFloat(margen);
    if (m > 60) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2E7D32' }}></span>
          Rentabilidad Alta
        </span>
      );
    }
    if (m >= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFF8E1', color: '#F57F17' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F9A825' }}></span>
          Rentabilidad Media
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse" style={{ background: '#FFEBEE', color: '#B71C1C' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C62828' }}></span>
        Alerta: Margen Crítico
      </span>
    );
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-warm)] pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
              Panel de Administración
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Gestión global de la cafetería — {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Tab switcher navigation */}
          <div className="flex flex-wrap gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'metrics' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              Métricas
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'catalog' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              Img Catálogo
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              Asistencia
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'cashflow' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              Flujo de Caja
            </button>
            <button
              onClick={() => setActiveTab('economic_intelligence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'economic_intelligence' ? 'bg-[#8B1A1A] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Inteligencia Económica
            </button>
          </div>

        </div>

        {error && (
          <div className="bg-[rgba(248,113,113,0.1)] border border-[var(--color-cta)] rounded-xl p-3 text-xs text-[var(--color-cta)] flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-[10px] font-bold">✕</button>
          </div>
        )}

        {success && (
          <div className="toast bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-semibold">{success}</span>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────
            TAB 1: METRICAS Y RESUMEN
            ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'metrics' && (
          <div className="space-y-8 animate-fade-in">
            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Ingresos del Día"
                value={`Bs. ${parseFloat(hoy.ingresos_pagados || 0).toFixed(2)}`}
                subtitle="Pagados confirmados"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Pedidos Hoy"
                value={hoy.total_pedidos || 0}
                subtitle="Pedidos registrados"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
              />
              <MetricCard
                title="Efectivo en Caja"
                value={`Bs. ${parseFloat(hoy.efectivo || 0).toFixed(2)}`}
                subtitle="Pagos en efectivo"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Pagos QR"
                value={`Bs. ${parseFloat(hoy.qr || 0).toFixed(2)}`}
                subtitle="Transferencias QR"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly revenue */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[var(--color-cta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2M2 12h2a10 10 0 0110 10v0M22 12a10 10 0 01-10 10" />
                        </svg>
                        Ingresos Últimos 7 Días
                      </h3>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Evolución de ventas y facturación diaria</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-text-muted)] font-medium">Total de la Semana</p>
                      <p className="text-sm font-bold text-[var(--color-cta)] font-mono">
                        {formatBOB((metricas?.semanal || []).reduce((acc, d) => acc + parseFloat(d.ingresos || 0), 0))}
                      </p>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3 mb-6 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EBE3D5] text-[10px]">
                    <div>
                      <span className="text-[9px] text-[var(--color-text-muted)] block uppercase tracking-wider">Promedio Diario</span>
                      <span className="font-bold text-[var(--color-text-secondary)] font-mono">
                        {formatBOB((metricas?.semanal || []).length > 0 
                          ? (metricas.semanal.reduce((acc, d) => acc + parseFloat(d.ingresos || 0), 0) / metricas.semanal.length)
                          : 0
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[var(--color-text-muted)] block uppercase tracking-wider">Mayor Ingreso</span>
                      <span className="font-bold text-[#B8860B] font-mono">
                        {(() => {
                          const semanal = metricas?.semanal || [];
                          if (semanal.length === 0) return '0.00 BOB';
                          const maxObj = semanal.reduce((max, d) => parseFloat(d.ingresos || 0) > parseFloat(max.ingresos || 0) ? d : max, { ingresos: 0, fecha: '' });
                          return maxObj.fecha 
                            ? `${parseDateLocally(maxObj.fecha).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })} (${parseFloat(maxObj.ingresos).toFixed(0)} BOB)`
                            : '0 BOB';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vertical Bar Chart Container */}
                <div className="h-48 flex items-end justify-between gap-2 px-1 pb-2 border-b border-[#EBE3D5] mt-2">
                  {(metricas?.semanal || []).map((dia, i) => {
                    const parsedDate = parseDateLocally(dia.fecha);
                    const semanal = metricas?.semanal || [];
                    const maxIngreso = Math.max(...semanal.map(d => parseFloat(d.ingresos) || 1));
                    const percentage = maxIngreso > 0 ? ((parseFloat(dia.ingresos) || 0) / maxIngreso) * 100 : 0;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 bg-[#3B2B24] text-white text-[10px] rounded-lg py-1.5 px-2.5 shadow-md flex flex-col items-center min-w-[90px] after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-[#3B2B24]">
                          <span className="font-bold">{formatBOB(dia.ingresos)}</span>
                          <span className="text-[8px] text-[#F3EAD8]">{dia.pedidos} pedidos</span>
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[20px] sm:max-w-[28px] flex flex-col justify-end h-full">
                          <span className="text-[9px] font-bold text-[#6B3020] text-center mb-1 block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {parseFloat(dia.ingresos) > 0 ? parseFloat(dia.ingresos).toFixed(0) : ''}
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-[var(--color-cta)] to-[var(--color-gold)] rounded-t-[4px] sm:rounded-t-md transition-all duration-500 ease-out hover:brightness-110 shadow-sm relative cursor-pointer"
                            style={{ 
                              height: `${Math.max(percentage, 2)}%`,
                              minHeight: '4px'
                            }}
                          >
                            {parseFloat(dia.ingresos) === 0 && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#EBE3D5] rounded-t-[4px] sm:rounded-t-md border-t border-dashed border-[#B8860B]"></div>
                            )}
                          </div>
                        </div>

                        {/* Label */}
                        <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-secondary)] mt-2 group-hover:text-[var(--color-cta)] transition-colors uppercase">
                          {parsedDate.toLocaleDateString('es-BO', { weekday: 'short' })}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
                          {parsedDate.getDate()}
                        </span>
                      </div>
                    );
                  })}
                  {(!metricas?.semanal || metricas.semanal.length === 0) && (
                    <div className="w-full text-center py-16 text-sm text-[var(--color-text-muted)]">Sin datos esta semana</div>
                  )}
                </div>
              </div>

              {/* Top products */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  Top 5 Productos del Mes
                </h3>
                <div className="space-y-3">
                  {(metricas?.top_productos || []).map((prod, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D5] hover:bg-white hover:shadow-sm transition-all">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-cta)] to-[var(--color-gold)] flex items-center justify-center text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{prod.nombre_producto}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">{prod.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--color-text-secondary)]">{prod.total_vendido} uds</p>
                        <p className="text-[11px] font-mono text-[var(--color-text-primary)]">Bs. {parseFloat(prod.ingresos_generados).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {(!metricas?.top_productos || metricas.top_productos.length === 0) && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Sin datos disponibles</p>
                  )}

                </div>
              </div>
            </div>

            {/* Orders by status */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                Pedidos por Estado (Hoy)
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
        )}

        {/* ────────────────────────────────────────────────────────────────
            TAB 2: GESTIONAR IMÁGENES DEL CATÁLOGO
            ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                Gestionar URLs de Imágenes del Menú
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">Pegue la URL de la imagen en formato web (Unsplash, etc.) para cada producto del catálogo.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {productos.map(p => (
                <div key={p.id_producto} className="bg-white border border-[var(--color-border-warm)] rounded-xl p-5 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow">
                  {/* Thumb image */}
                  <div className="w-16 h-16 rounded-lg bg-[var(--color-bg-card)] relative overflow-hidden flex items-center justify-center flex-shrink-0 border border-[var(--color-border-warm)]/40">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre_producto} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">☕</span>
                    )}
                  </div>

                  {/* Edit Form */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">{p.nombre_producto}</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">{p.categoria}</p>
                    
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        className="input-field !py-1 !px-2 text-[10px] flex-1 bg-neutral-50 focus:bg-white"
                        placeholder="Pegar URL de Imagen"
                        value={urlEdits[p.id_producto] !== undefined ? urlEdits[p.id_producto] : (p.imagen_url || '')}
                        onChange={(e) => setUrlEdits({ ...urlEdits, [p.id_producto]: e.target.value })}
                      />
                      <button
                        onClick={() => guardarImagenUrl(p)}
                        disabled={procesando}
                        className="bg-[#3B2B24] hover:bg-[#8A6F57] text-white text-[10px] font-bold py-1 px-2.5 rounded-[4px] cursor-pointer disabled:opacity-50 border-none transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────
            TAB 3: REGISTRO DE ASISTENCIA
            ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                  Registro de Asistencia del Personal
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">Monitoreo de horas de entrada y salida marcadas por los trabajadores.</p>
              </div>

              {/* Filtro de búsqueda */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar empleado o rol..."
                  value={filtroAsistencia}
                  onChange={(e) => setFiltroAsistencia(e.target.value)}
                  className="input-field text-xs !py-2"
                />
              </div>
            </div>

            {/* Listado de asistencias */}
            <div className="bg-white border border-[var(--color-border-warm)] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-[var(--color-border-warm)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Empleado</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Entrada</th>
                      <th className="py-3 px-4">Salida</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {asistenciasFiltradas.map((a) => {
                      const finalizado = !!a.hora_salida;
                      return (
                        <tr key={a.id_asistencia} className="hover:bg-neutral-50/50">
                          <td className="py-3.5 px-4 font-medium">{formatDateOnly(a.fecha)}</td>
                          <td className="py-3.5 px-4 font-bold text-[var(--color-text-primary)]">{a.nombre}</td>
                          <td className="py-3.5 px-4">
                            <span className="badge badge-warning">{a.rol}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">{formatTimeOnly(a.hora_entrada)}</td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-rose-600">
                            {finalizado ? formatTimeOnly(a.hora_salida) : '--:--'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${finalizado ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-700 animate-pulse'}`}>
                              {finalizado ? 'Turno Terminado' : 'En Turno'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {asistenciasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                          No se encontraron registros de asistencia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────
            TAB 4: FLUJO DE CAJA Y VENTAS (CON IMPRESIÓN)
            ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                  Flujo de Caja y Registro de Ventas
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">Consolidado general de ingresos de caja, formas de pago y facturas emitidas.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#3B2B24] hover:bg-[#4F3E35] text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 border-none"
                >
                  Imprimir Flujo de Caja
                </button>
              </div>

            </div>

            {/* Caja Stat overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm">
                <p className="text-2xl font-bold text-[#3B2B24]">{totalTransacciones}</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Transacciones</p>
              </div>
              <div className="bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                <p className="text-2xl font-bold text-amber-700">Bs. {totalEfectivo.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Ventas en Efectivo</p>
              </div>
              <div className="bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm border-l-4 border-l-purple-500">
                <p className="text-2xl font-bold text-purple-700">Bs. {totalQR.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Ventas en QR Simple</p>
              </div>
              <div className="bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm border-l-4 border-l-emerald-500">
                <p className="text-2xl font-bold text-emerald-700">Bs. {totalIngresosCobrados.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Total Cobrado (Flujo)</p>
              </div>
              <div className="bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm border-l-4 border-l-rose-500">
                <p className="text-2xl font-bold text-rose-700">Bs. {totalPorCobrar.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">Cuentas por Cobrar</p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white border border-[var(--color-border-warm)] p-4 rounded-xl shadow-sm">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Buscar venta</label>
                <input
                  type="text"
                  placeholder="ID pedido, cliente, NIT o razón social..."
                  value={busquedaVenta}
                  onChange={(e) => setBusquedaVenta(e.target.value)}
                  className="input-field text-xs !py-1.5"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Método de pago</label>
                <select
                  value={filtroVentas}
                  onChange={(e) => setFiltroVentas(e.target.value)}
                  className="input-field text-xs !py-1.5 bg-white cursor-pointer"
                >
                  <option value="todos">Todos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Pago QR Simple">Pago QR Simple</option>
                </select>
              </div>
            </div>

            {/* Ventas registry table */}
            <div className="bg-white border border-[var(--color-border-warm)] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-[var(--color-border-warm)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <th className="py-3 px-4">Pedido ID</th>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Estado Pago</th>
                      <th className="py-3 px-4">Estado Pedido</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {ventasFiltradas.map((v) => {
                      const isPaid = v.estado_pago === 'Pagado';
                      return (
                        <tr key={v.id_pedido} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-[#3B2B24]">#{v.id_pedido}</td>
                          <td className="py-3 px-4 text-[11px] text-[var(--color-text-muted)]">{formatDateTime(v.fecha_hora)}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--color-text-primary)]">
                              {v.razon_social_factura || v.cliente_nombre || 'Local / Mostrador'}
                            </div>
                            {(v.nit_factura && v.nit_factura !== '0') && (
                              <div className="text-[10px] text-[var(--color-text-muted)]">NIT: {v.nit_factura}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-[11px]">{v.metodo_pago || 'No especificado'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {v.estado_pago}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-medium">{v.estado_pedido}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[var(--color-text-primary)]">
                            Bs. {parseFloat(v.total_pago).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {ventasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                          No se encontraron registros de ventas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 5: MÓDULO DE INTELIGENCIA ECONÓMICA
            Ingeniería Económica (IND210) — USFX
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'economic_intelligence' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header del módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#2C0E06] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                  <svg className="w-6 h-6 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Módulo de Inteligencia Económica
                </h2>
                <p className="text-xs text-[#6B3020] mt-1">
                  Análisis financiero avanzado — Ingeniería Económica (IND210) · USFX de Chuquisaca
                </p>
              </div>
              <button
                onClick={loadEconomicIntelligence}
                disabled={rentabilidadLoading || equilibrioLoading}
                className="bg-[#8B1A1A] hover:bg-[#6E1414] text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 border-none disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar Datos
              </button>
            </div>

            {/* ──────────────────────────────────────────────
                FILA 1: 3 KPI CARDS DESTACADOS
                ────────────────────────────────────────────── */}
            {rentabilidadLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white border border-[var(--color-border-warm)] rounded-xl p-6 animate-pulse">
                    <div className="h-3 bg-[#F3EAD8] rounded w-2/3 mb-3"></div>
                    <div className="h-7 bg-[#F3EAD8] rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-[#F3EAD8] rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : rentabilidadData ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* KPI 1: Producto Líder */}
                <div className="bg-white border border-[var(--color-border-warm)] rounded-xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06]">
                    <svg viewBox="0 0 24 24" fill="#1B5E20"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-2">
                    🏆 Producto Líder en Margen
                  </p>
                  <p className="text-lg font-bold text-[#2C0E06]" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {rentabilidadData.producto_mas_rentable?.nombre || '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-bold" style={{ color: '#B8860B' }}>
                      {rentabilidadData.producto_mas_rentable?.margen?.toFixed(2) || '0.00'}%
                    </span>
                    <span className="text-[10px] text-[#6B3020] font-medium">margen de contribución</span>
                  </div>
                </div>

                {/* KPI 2: Producto Crítico */}
                <div className="bg-white border border-[var(--color-border-warm)] rounded-xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06]">
                    <svg viewBox="0 0 24 24" fill="#B71C1C"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-2">
                    ⚠️ Producto Crítico
                  </p>
                  <p className="text-lg font-bold text-[#2C0E06]" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {rentabilidadData.producto_menos_rentable?.nombre || '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-bold" style={{ color: '#8B1A1A' }}>
                      {rentabilidadData.producto_menos_rentable?.margen?.toFixed(2) || '0.00'}%
                    </span>
                    <span className="text-[10px] text-[#6B3020] font-medium">margen de contribución</span>
                  </div>
                </div>

                {/* KPI 3: Margen Promedio */}
                <div className="bg-white border border-[var(--color-border-warm)] rounded-xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06]">
                    <svg viewBox="0 0 24 24" fill="#B8860B"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-2">
                    📊 Margen Promedio del Negocio
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#B8860B', fontFamily: 'var(--font-playfair)' }}>
                    {rentabilidadData.margen_promedio_cafeteria?.toFixed(2) || '0.00'}%
                  </p>
                  <p className="text-[10px] text-[#6B3020] font-medium mt-1">
                    Promedio aritmético del catálogo completo
                  </p>
                </div>
              </div>
            ) : null}

            {/* ──────────────────────────────────────────────
                FILA 2: BENTO GRID ASIMÉTRICO
                Col 1-2: Tabla de Rentabilidad (2/3)
                Col 3: Simulador de Inflación (1/3)
                ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ═══════════ COMPONENTE 1 & 2: TABLA DE RENTABILIDAD + SEMÁFORO ═══════════ */}
              <div className="lg:col-span-2 bg-white border border-[var(--color-border-warm)] rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="px-6 py-4 border-b border-[var(--color-border-warm)] bg-gradient-to-r from-[#FAF6EE] to-white">
                  <h3 className="text-sm font-bold text-[#2C0E06] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                    <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Rentabilidad por Producto — Análisis de Ingeniería de Menú
                  </h3>
                  <p className="text-[10px] text-[#6B3020] mt-0.5">Vista consolidada de costos, precios y márgenes con semáforo financiero automático.</p>
                </div>

                {rentabilidadLoading ? (
                  <div className="p-6 space-y-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-4 bg-[#F3EAD8] rounded w-1/4"></div>
                        <div className="h-4 bg-[#F3EAD8] rounded w-1/6"></div>
                        <div className="h-4 bg-[#F3EAD8] rounded w-1/6"></div>
                        <div className="h-4 bg-[#F3EAD8] rounded w-1/6"></div>
                        <div className="h-4 bg-[#F3EAD8] rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#FAF6EE] border-b border-[var(--color-border-warm)] text-[10px] font-bold uppercase tracking-wider text-[#6B3020]">
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4 text-right">Costo MP</th>
                          <th className="py-3 px-4 text-right">Precio Venta</th>
                          <th className="py-3 px-4 text-right">Utilidad Neta</th>
                          <th className="py-3 px-4 text-right">Margen %</th>
                          <th className="py-3 px-4 text-center">Estado Financiero</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-xs">
                        {(rentabilidadData?.productos || []).map((prod, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF6EE]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#2C0E06]">{prod.nombre_producto}</div>
                              <div className="text-[10px] text-[#9C7060]">{prod.categoria}</div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[#6B3020]">
                              {formatBOB(prod.costo_materia_prima)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#2C0E06]">
                              {formatBOB(prod.precio_venta)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold" style={{ color: '#B8860B' }}>
                              {formatBOB(prod.utilidad_por_unidad)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#2C0E06]">
                              {parseFloat(prod.margen_contribucion_porcentual).toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getMargenBadge(prod.margen_contribucion_porcentual)}
                            </td>
                          </tr>
                        ))}
                        {(!rentabilidadData?.productos || rentabilidadData.productos.length === 0) && (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                              No hay datos de rentabilidad disponibles. Verifique la vista &apos;vista_ingenieria_menu&apos;.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ═══════════ COMPONENTE 3: SIMULADOR DE INFLACIÓN ═══════════ */}
              <div className="lg:col-span-1 bg-white border border-[var(--color-border-warm)] rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col">
                <div className="px-5 py-4 border-b border-[var(--color-border-warm)] bg-gradient-to-r from-[#FAF6EE] to-white">
                  <h3 className="text-sm font-bold text-[#2C0E06] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                    <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Simulador de Inflación
                  </h3>
                  <p className="text-[10px] text-[#6B3020] mt-0.5">Proyecte el impacto de un incremento de costo en un insumo.</p>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  {/* Selector de Insumo */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1.5">
                      Insumo a simular
                    </label>
                    <select
                      value={selectedInsumo}
                      onChange={(e) => setSelectedInsumo(e.target.value)}
                      className="input-field text-xs !py-2 bg-white cursor-pointer"
                    >
                      <option value="">— Seleccionar insumo —</option>
                      {insumosList.map(ins => (
                        <option key={ins.id_insumo} value={ins.id_insumo}>
                          {ins.nombre_insumo} ({parseFloat(ins.costo_unitario).toFixed(2)} BOB/{ins.unidad_medida})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Slider + Input de incremento */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1.5">
                      Incremento de costo: <span className="text-[#8B1A1A] text-sm font-bold">{incremento}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={incremento}
                      onChange={(e) => setIncremento(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #8B1A1A 0%, #B8860B ${incremento}%, #D4C4B0 ${incremento}%, #D4C4B0 100%)`
                      }}
                    />
                    <div className="flex justify-between text-[9px] text-[#9C7060] mt-1 font-mono">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Input numérico alternativo */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1.5">
                      Valor exacto (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={incremento}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) setIncremento(val);
                      }}
                      className="input-field text-xs !py-2 font-mono"
                      placeholder="Ej: 15"
                    />
                  </div>

                  {/* Botón de simulación */}
                  <button
                    onClick={ejecutarSimulacion}
                    disabled={simulacionLoading || !selectedInsumo}
                    className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: '#8B1A1A', boxShadow: '0 2px 8px rgba(139, 26, 26, 0.35)' }}
                  >
                    {simulacionLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Calculando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Ejecutar Simulación
                      </>
                    )}
                  </button>
                </div>

                {/* Resultado de la simulación */}
                {simulacionResult && simulacionResult.productos_afectados && simulacionResult.productos_afectados.length > 0 && (
                  <div className="border-t border-[var(--color-border-warm)]">
                    <div className="px-5 py-3 bg-[#FAF6EE]">
                      <p className="text-[10px] font-bold text-[#2C0E06] uppercase tracking-wider">
                        Impacto en {simulacionResult.total_productos_impactados} producto{simulacionResult.total_productos_impactados > 1 ? 's' : ''}
                      </p>
                      <p className="text-[9px] text-[#6B3020] mt-0.5">
                        {simulacionResult.insumo?.nombre}: {simulacionResult.insumo?.costo_original?.toFixed(2)} → {simulacionResult.insumo?.costo_nuevo?.toFixed(2)} BOB (+{simulacionResult.insumo?.incremento_porcentual}%)
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {simulacionResult.productos_afectados.map((prod, idx) => (
                        <div key={idx} className="px-5 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-[#FAF6EE]/50 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-[#2C0E06]">{prod.nombre_producto}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: prod.delta_margen < -5 ? '#FFEBEE' : '#FFF8E1', color: prod.delta_margen < -5 ? '#B71C1C' : '#F57F17' }}>
                              {prod.delta_margen > 0 ? '+' : ''}{prod.delta_margen.toFixed(2)}% margen
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <div className="text-[#9C7060]">
                              Costo MP: <span className="font-mono font-bold text-[#6B3020]">{prod.costo_mp_antes.toFixed(2)} → {prod.costo_mp_despues.toFixed(2)}</span>
                            </div>
                            <div className="text-[#9C7060]">
                              Margen: <span className="font-mono font-bold text-[#6B3020]">{prod.margen_antes.toFixed(1)}% → {prod.margen_despues.toFixed(1)}%</span>
                            </div>
                            <div className="col-span-2 mt-1 pt-1 border-t border-dashed border-[#D4C4B0]">
                              <span className="text-[#6B3020]">Precio Recomendado: </span>
                              <span className="font-mono font-bold" style={{ color: '#B8860B' }}>{prod.precio_venta_sugerido.toFixed(2)} BOB</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {simulacionResult && simulacionResult.productos_afectados && simulacionResult.productos_afectados.length === 0 && (
                  <div className="p-5 border-t border-[var(--color-border-warm)] text-center">
                    <p className="text-xs text-[#9C7060]">
                      {simulacionResult.mensaje || 'Este insumo no está asociado a ninguna receta activa.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ──────────────────────────────────────────────
                FILA 3: PUNTO DE EQUILIBRIO OPERACIONAL
                Bento Card ancha (full width)
                ────────────────────────────────────────────── */}
            {equilibrioLoading ? (
              <div className="bg-white border border-[var(--color-border-warm)] rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-[#F3EAD8] rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-[#F3EAD8] rounded w-full mb-3"></div>
                <div className="h-3 bg-[#F3EAD8] rounded w-2/3"></div>
              </div>
            ) : equilibrioData ? (
              <div className="bg-white border border-[var(--color-border-warm)] rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="px-6 py-4 border-b border-[var(--color-border-warm)] bg-gradient-to-r from-[#FAF6EE] to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#2C0E06] flex items-center gap-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                      <svg className="w-4 h-4 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                      Punto de Equilibrio Operacional — Termómetro de Salud Financiera
                    </h3>
                    <p className="text-[10px] text-[#6B3020] mt-0.5">
                      Ecuación de Ingeniería Económica: PE = Gastos Fijos ÷ Margen de Contribución Promedio Ponderado
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${equilibrioData.porcentaje_cobertura >= 100 ? 'bg-[#E8F5E9] text-[#1B5E20]' : equilibrioData.porcentaje_cobertura >= 50 ? 'bg-[#FFF8E1] text-[#F57F17]' : 'bg-[#FFEBEE] text-[#B71C1C] animate-pulse'}`}>
                      {equilibrioData.porcentaje_cobertura >= 100 ? '✅ Meta Alcanzada' : equilibrioData.porcentaje_cobertura >= 50 ? '🔶 En Progreso' : '🔴 Bajo Riesgo'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-[#FAF6EE]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1">Gastos Fijos Mensuales</p>
                      <p className="text-xl font-bold text-[#8B1A1A]" style={{ fontFamily: 'var(--font-playfair)' }}>
                        {equilibrioData.gastos_fijos_totales?.toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-xs">BOB</span>
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#FAF6EE]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1">Punto de Equilibrio</p>
                      <p className="text-xl font-bold" style={{ color: '#B8860B', fontFamily: 'var(--font-playfair)' }}>
                        {equilibrioData.punto_equilibrio_bob?.toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-xs">BOB</span>
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#FAF6EE]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1">Ventas Acumuladas del Mes</p>
                      <p className="text-xl font-bold text-[#2C0E06]" style={{ fontFamily: 'var(--font-playfair)' }}>
                        {equilibrioData.ventas_actuales_mes?.toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-xs">BOB</span>
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#FAF6EE]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-1">Margen Contrib. Ponderado</p>
                      <p className="text-xl font-bold text-[#2C0E06]" style={{ fontFamily: 'var(--font-playfair)' }}>
                        {equilibrioData.margen_contribucion_ponderado?.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progreso Premium */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020]">
                        Cobertura del Punto de Equilibrio
                      </span>
                      <span className="text-sm font-bold" style={{ color: equilibrioData.porcentaje_cobertura >= 100 ? '#1B5E20' : '#B8860B' }}>
                        {equilibrioData.porcentaje_cobertura?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-5 bg-[#F3EAD8] rounded-full overflow-hidden border border-[#D4C4B0] relative">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out relative"
                        style={{
                          width: `${Math.min(equilibrioData.porcentaje_cobertura || 0, 100)}%`,
                          background: equilibrioData.porcentaje_cobertura >= 100
                            ? 'linear-gradient(90deg, #2E7D32, #4CAF50)'
                            : 'linear-gradient(90deg, #B8860B, #DAA520)',
                          minWidth: equilibrioData.porcentaje_cobertura > 0 ? '2rem' : '0',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-[9px] font-bold text-white drop-shadow-sm">
                            {equilibrioData.ventas_actuales_mes?.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} BOB
                          </span>
                        </div>
                      </div>
                      {/* Marcador del punto de equilibrio */}
                      {equilibrioData.porcentaje_cobertura < 100 && (
                        <div className="absolute right-0 top-0 h-full flex items-center" style={{ right: '0' }}>
                          <div className="w-0.5 h-full bg-[#8B1A1A]"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-[#9C7060] font-mono">0 BOB</span>
                      <span className="text-[9px] text-[#8B1A1A] font-mono font-bold">
                        Meta: {equilibrioData.punto_equilibrio_bob?.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} BOB
                      </span>
                    </div>
                  </div>

                  {/* Detalle de Gastos Fijos */}
                  {equilibrioData.detalle_gastos && equilibrioData.detalle_gastos.length > 0 && (
                    <div className="mb-4 p-4 bg-[#FAF6EE] rounded-lg border border-[#D4C4B0]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B3020] mb-2">Composición de Gastos Fijos</p>
                      <div className="space-y-1.5">
                        {equilibrioData.detalle_gastos.map((g, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{
                                background: g.categoria === 'Sueldos' ? '#8B1A1A' : g.categoria === 'Alquiler' ? '#B8860B' : '#6B3020'
                              }}></span>
                              <span className="text-[#2C0E06] font-medium">{g.nombre_gasto}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white border border-[#D4C4B0] text-[#9C7060] font-medium">{g.categoria}</span>
                            </div>
                            <span className="font-mono font-bold text-[#2C0E06]">{parseFloat(g.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Texto Analítico Obligatorio */}
                  <div className="p-4 rounded-lg border-l-4" style={{ borderLeftColor: '#B8860B', background: 'linear-gradient(90deg, rgba(184,134,11,0.06), transparent)' }}>
                    <p className="text-xs text-[#2C0E06] leading-relaxed">
                      <span className="font-bold" style={{ color: '#B8860B' }}>📋 Conclusión Analítica:</span>{' '}
                      La cafetería <span className="font-bold">Charcas Capital</span> requiere facturar un mínimo de{' '}
                      <span className="font-bold" style={{ color: '#8B1A1A' }}>
                        {equilibrioData.punto_equilibrio_bob?.toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB
                      </span>{' '}
                      mensuales para cubrir sus costos operativos estables y no registrar pérdidas operativas.
                      {equilibrioData.porcentaje_cobertura >= 100 && (
                        <span className="font-bold" style={{ color: '#1B5E20' }}> Actualmente, la cafetería ha superado su punto de equilibrio con una cobertura del {equilibrioData.porcentaje_cobertura?.toFixed(1)}%.</span>
                      )}
                      {equilibrioData.porcentaje_cobertura < 100 && equilibrioData.porcentaje_cobertura > 0 && (
                        <span className="font-bold" style={{ color: '#F57F17' }}> Las ventas actuales cubren el {equilibrioData.porcentaje_cobertura?.toFixed(1)}% del punto de equilibrio. Se requieren {((equilibrioData.punto_equilibrio_bob || 0) - (equilibrioData.ventas_actuales_mes || 0)).toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB adicionales.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────
          SECCIÓN IMPRIMIBLE: FLUJO DE CAJA (Solo visible al imprimir)
          ──────────────────────────────────────────────────────────────── */}
      <div className="printable-section hidden">
        <div style={{ borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>CHARCAS CAPITAL</h1>
          <p style={{ fontSize: '11px', margin: '3px 0 0 0' }}>Reporte Consolidado de Flujo de Caja y Ventas</p>
          <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Materia: Ingeniería Económica (IND210) — USFX</p>
          <p style={{ fontSize: '10px', margin: '5px 0 0 0', fontStyle: 'italic' }}>
            Fecha Reporte: {new Date().toLocaleString('es-BO')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '11px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #000' }}>Resumen Financiero</h3>
            <table style={{ width: '100%', border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Ventas Totales Registradas:</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>{totalTransacciones} uds</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Ingresos Cobrados en Efectivo:</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Bs. {totalEfectivo.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Ingresos Cobrados en QR:</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Bs. {totalQR.toFixed(2)}</td>
                </tr>
                <tr style={{ fontSize: '12px', fontWeight: 'bold', borderTop: '1px double #000' }}>
                  <td style={{ padding: '5px 0 0 0', border: 'none' }}>Total Ingresos de Caja (Efectivo + QR):</td>
                  <td style={{ padding: '5px 0 0 0', border: 'none', textAlign: 'right' }}>Bs. {totalIngresosCobrados.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #000' }}>Cuentas y Auditoría</h3>
            <table style={{ width: '100%', border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Total Cuentas por Cobrar (No Pagado):</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Bs. {totalPorCobrar.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Estado del Turno:</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Consolidado</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', border: 'none' }}>Responsable de Reporte:</td>
                  <td style={{ padding: '3px 0', border: 'none', textAlign: 'right', fontWeight: 'bold' }}>Administración</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3 style={{ fontSize: '12px', margin: '20px 0 5px 0', borderBottom: '1px solid #000' }}>Detalle de Transacciones (Filtro: {filtroVentas})</h3>
        <table style={{ width: '100%', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ padding: '5px', textAlign: 'left' }}>Pedido ID</th>
              <th style={{ padding: '5px', textAlign: 'left' }}>Fecha y Hora</th>
              <th style={{ padding: '5px', textAlign: 'left' }}>Cliente/Razón Social</th>
              <th style={{ padding: '5px', textAlign: 'left' }}>Forma Pago</th>
              <th style={{ padding: '5px', textAlign: 'left' }}>Estado Pago</th>
              <th style={{ padding: '5px', textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map((v) => (
              <tr key={v.id_pedido}>
                <td style={{ padding: '4px 5px' }}>#{v.id_pedido}</td>
                <td style={{ padding: '4px 5px' }}>{formatDateTime(v.fecha_hora)}</td>
                <td style={{ padding: '4px 5px' }}>
                  {v.razon_social_factura || v.cliente_nombre || 'Local / Mostrador'} 
                  {v.nit_factura && v.nit_factura !== '0' ? ` (NIT: ${v.nit_factura})` : ''}
                </td>
                <td style={{ padding: '4px 5px' }}>{v.metodo_pago || 'No especificado'}</td>
                <td style={{ padding: '4px 5px' }}>{v.estado_pago}</td>
                <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: 'bold' }}>Bs. {parseFloat(v.total_pago).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', fontSize: '10px', textAlign: 'center' }}>
          <div style={{ width: '200px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>Firma Administrador</div>
          </div>
          <div style={{ width: '200px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px' }}>Firma Cajero Auxiliar</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html, main, aside, header, nav, .no-print {
            display: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          .printable-section {
            display: block !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px !important;
            text-align: left !important;
            color: black !important;
          }
          th {
            background-color: #f2f2f2 !important;
          }
        }

        /* Custom range slider thumb for the inflation simulator */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B1A1A;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          transition: all 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 8px rgba(139, 26, 26, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8B1A1A;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
      `}} />
    </>
  );
}

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-[var(--color-bg-white)] border border-[var(--color-border-warm)] rounded-xl p-6 transition-all hover:shadow-card-hover select-none">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 bg-[rgba(139,26,26,0.08)] text-[var(--color-cta)] rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
        {value}
      </p>
      <p className="text-sm font-medium text-[var(--color-text-primary)] mt-4">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
