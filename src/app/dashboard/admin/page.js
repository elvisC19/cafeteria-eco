'use client';
import { useState, useEffect } from 'react';
import { reportesAPI, productosAPI } from '@/lib/api';

export default function AdminPage() {
  const [metricas, setMetricas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [urlEdits, setUrlEdits] = useState({});
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'catalog', 'attendance', 'cashflow'
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
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  Ingresos Últimos 7 Días
                </h3>
                <div className="space-y-3">
                  {(metricas?.semanal || []).map((dia, i) => {
                    const maxIngreso = Math.max(...(metricas?.semanal || []).map(d => parseFloat(d.ingresos) || 1));
                    const percentage = ((parseFloat(dia.ingresos) || 0) / maxIngreso) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-primary)] w-20 flex-shrink-0">
                          {new Date(dia.fecha).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-neutral-100 rounded-full h-6 overflow-hidden border border-[#EBE3D5]">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--color-cta)] to-[var(--color-gold)] rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              Bs. {parseFloat(dia.ingresos).toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] w-12 text-right">{dia.pedidos}p</span>
                      </div>
                    );
                  })}
                  {(!metricas?.semanal || metricas.semanal.length === 0) && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Sin datos esta semana</p>
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
