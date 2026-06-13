'use client';
import { useState, useEffect } from 'react';
import { productosAPI, mesasAPI, pedidosAPI, pagosAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function CajeroPage() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [tipoServicio, setTipoServicio] = useState('');
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPago, setShowPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [resultadoPago, setResultadoPago] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [observaciones, setObservaciones] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodData, mesaData] = await Promise.all([
        productosAPI.listar(true),
        mesasAPI.obtener()
      ]);
      setProductos(prodData.productos || []);
      setMesas(mesaData.mesas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const categorias = ['Todas', 'Bebidas Calientes', 'Bebidas Frías', 'Repostería', 'Desayunos', 'Meriendas'];
  const productosFiltrados = categoriaActiva === 'Todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  const total = carrito.reduce((sum, item) => sum + parseFloat((item.precio * item.cantidad).toFixed(2)), 0);

  function addToCart(producto) {
    setCarrito(prev => {
      const exists = prev.find(i => i.id_producto === producto.id_producto);
      if (exists) {
        return prev.map(i =>
          i.id_producto === producto.id_producto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { ...producto, precio: parseFloat(producto.precio_venta), cantidad: 1 }];
    });
  }

  function updateQuantity(id, delta) {
    setCarrito(prev => prev
      .map(i => i.id_producto === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
      .filter(i => i.cantidad > 0)
    );
  }

  function removeFromCart(id) {
    setCarrito(prev => prev.filter(i => i.id_producto !== id));
  }

  async function enviarPedido() {
    if (!tipoServicio) { setError('Seleccione el tipo de servicio.'); return; }
    if (tipoServicio === 'Comer en el Lugar' && !mesaSeleccionada) { setError('Seleccione una mesa.'); return; }
    if (carrito.length === 0) { setError('Agregue productos al pedido.'); return; }

    setProcesando(true);
    setError('');
    try {
      const pedidoData = {
        id_usuario: usuario?.id_usuario,
        id_mesa: tipoServicio === 'Comer en el Lugar' ? mesaSeleccionada : null,
        tipo_servicio: tipoServicio,
        items: carrito.map(item => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          observaciones: observaciones[item.id_producto] || null
        }))
      };

      const result = await pedidosAPI.crear(pedidoData);
      setSuccess(`Pedido #${result.pedido.id_pedido} registrado. Total: Bs. ${parseFloat(result.pedido.total_pago).toFixed(2)}`);

      // Mostrar opciones de pago
      setShowPago(true);
      setResultadoPago({ id_pedido: result.pedido.id_pedido, total: parseFloat(result.pedido.total_pago) });
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function procesarPago() {
    if (!metodoPago) { setError('Seleccione método de pago.'); return; }
    if (metodoPago === 'Efectivo' && (!montoRecibido || parseFloat(montoRecibido) < resultadoPago.total)) {
      setError(`Monto insuficiente. Total: Bs. ${resultadoPago.total.toFixed(2)}`);
      return;
    }

    setProcesando(true);
    try {
      const pagoResult = await pagosAPI.procesar({
        id_pedido: resultadoPago.id_pedido,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'Efectivo' ? parseFloat(montoRecibido) : undefined
      });

      if (metodoPago === 'Pago QR Simple') {
        setShowQR(true);
      }

      setSuccess(
        metodoPago === 'Efectivo'
          ? `Pago procesado. Cambio: Bs. ${pagoResult.pago.cambio}`
          : `Pago QR confirmado. Ref: ${pagoResult.pago.referencia_qr}`
      );

      // Reset
      setTimeout(() => {
        setCarrito([]);
        setShowPago(false);
        setShowQR(false);
        setMetodoPago('');
        setMontoRecibido('');
        setResultadoPago(null);
        setObservaciones({});
        setTipoServicio('');
        setMesaSeleccionada(null);
        setSuccess('');
        loadData();
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const mesasDisponibles = mesas.filter(m => m.estado === 'Disponible');
  // No icons needed for tabs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Punto de Venta
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sistema POS — Charcas Capital</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-[rgba(248,113,113,0.1)] border border-[var(--danger)] rounded-xl p-3 text-sm text-[var(--danger)] flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-xs hover:opacity-75">✕</button>
        </div>
      )}

      {success && (
        <div className="toast bg-[rgba(74,222,128,0.15)] border border-[var(--success)] text-[var(--success)] flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Payment modal */}
      {showPago && resultadoPago && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full animate-slide-up">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Procesar Pago</span>
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Pedido #{resultadoPago.id_pedido} — Total: <span className="text-[var(--accent-secondary)] font-bold text-lg">Bs. {resultadoPago.total.toFixed(2)}</span>
            </p>

            {!metodoPago ? (
              <div className="space-y-3">
                <button
                  onClick={() => setMetodoPago('Efectivo')}
                  className="w-full p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--success)] transition-colors text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Efectivo</p>
                    <p className="text-xs text-[var(--text-muted)]">Calcular cambio automáticamente</p>
                  </div>
                </button>
                <button
                  onClick={() => setMetodoPago('Pago QR Simple')}
                  className="w-full p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--info)] transition-colors text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Pago QR Simple</p>
                    <p className="text-xs text-[var(--text-muted)]">Transferencia QR interbancaria</p>
                  </div>
                </button>
                <button onClick={() => { setShowPago(false); setCarrito([]); setTipoServicio(''); setMesaSeleccionada(null); setObservaciones({}); loadData(); }} className="btn-secondary w-full mt-2">
                  Pagar Después
                </button>
              </div>
            ) : metodoPago === 'Efectivo' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Monto Recibido (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field text-2xl text-center font-bold"
                    placeholder="0.00"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    autoFocus
                  />
                </div>

                {montoRecibido && parseFloat(montoRecibido) >= resultadoPago.total && (
                  <div className="bg-[rgba(74,222,128,0.1)] rounded-xl p-4 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">Cambio a devolver</p>
                    <p className="text-3xl font-bold text-[var(--success)]">
                      Bs. {(parseFloat(montoRecibido) - resultadoPago.total).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100, 200].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setMontoRecibido(String(amt))}
                      className="numpad-btn text-sm !aspect-auto py-2"
                    >
                      Bs.{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setMontoRecibido(String(resultadoPago.total))}
                    className="numpad-btn text-xs !aspect-auto py-2 col-span-3 !bg-[rgba(74,222,128,0.1)] text-[var(--success)]"
                  >
                    Monto Exacto (Bs. {resultadoPago.total.toFixed(2)})
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={procesarPago} disabled={procesando} className="btn-primary flex-1 py-3">
                    {procesando ? 'Procesando...' : 'Confirmar Pago'}
                  </button>
                  <button onClick={() => setMetodoPago('')} className="btn-secondary">Atrás</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                {/* QR Code simulation */}
                <div className="qr-container mx-auto">
                  <svg viewBox="0 0 200 200" className="w-48 h-48">
                    <rect width="200" height="200" fill="white"/>
                    {/* Simulated QR pattern */}
                    {Array.from({length: 10}).map((_, row) =>
                      Array.from({length: 10}).map((_, col) => {
                        const fill = ((row + col) % 3 === 0 || (row * col) % 5 === 0) ? '#000' : '#fff';
                        return <rect key={`${row}-${col}`} x={20 + col*16} y={20 + row*16} width="14" height="14" fill={fill} rx="2"/>;
                      })
                    )}
                    {/* Corner markers */}
                    <rect x="16" y="16" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="24" y="24" width="34" height="34" fill="#000" rx="2"/>
                    <rect x="134" y="16" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="142" y="24" width="34" height="34" fill="#000" rx="2"/>
                    <rect x="16" y="134" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="24" y="142" width="34" height="34" fill="#000" rx="2"/>
                  </svg>
                  <p className="text-xs text-gray-600 font-medium">Banco Unión — QR Simple</p>
                  <p className="text-lg font-bold text-gray-900">Bs. {resultadoPago.total.toFixed(2)}</p>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Escanee el código QR para pagar</p>
                <div className="flex gap-3">
                  <button onClick={procesarPago} disabled={procesando} className="btn-primary flex-1 py-3">
                    {procesando ? 'Verificando...' : 'Confirmar Pago QR'}
                  </button>
                  <button onClick={() => setMetodoPago('')} className="btn-secondary">Atrás</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Service type selector */}
          {!tipoServicio && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Canal de Distribución</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setTipoServicio('Comer en el Lugar')}
                  className="p-5 rounded-xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left flex flex-col items-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(139,26,26,0.08)] text-[var(--color-cta)] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[var(--text-primary)]">Comer en el Lugar</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Seleccionar mesa del salón</p>
                </button>
                <button
                  onClick={() => setTipoServicio('Para Llevar / Recoger')}
                  className="p-5 rounded-xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left flex flex-col items-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(139,26,26,0.08)] text-[var(--color-cta)] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[var(--text-primary)]">Para Llevar / Recoger</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Ticket de retiro automático</p>
                </button>
              </div>
            </div>
          )}

          {/* Mesa selector */}
          {tipoServicio === 'Comer en el Lugar' && !mesaSeleccionada && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Seleccionar Mesa</h3>
              <div className="grid grid-cols-5 gap-3">
                {mesas.map(mesa => (
                  <button
                    key={mesa.id_mesa}
                    disabled={mesa.estado !== 'Disponible'}
                    onClick={() => setMesaSeleccionada(mesa.id_mesa)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      mesa.estado === 'Disponible'
                        ? 'mesa-disponible cursor-pointer hover:scale-105'
                        : mesa.estado === 'Ocupada'
                          ? 'mesa-ocupada cursor-not-allowed'
                          : 'mesa-inactiva cursor-not-allowed'
                    }`}
                  >
                    <p className="text-lg font-bold">{mesa.numero_mesa}</p>
                    <p className="text-xs opacity-70">{mesa.capacidad}p</p>
                    <div className="mt-1 flex items-center justify-center">
                      <span className={`w-2 h-2 rounded-full ${mesa.estado === 'Disponible' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category tabs & products */}
          {tipoServicio && (tipoServicio !== 'Comer en el Lugar' || mesaSeleccionada) && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      categoriaActiva === cat
                        ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {productosFiltrados.map(prod => (
                  <button
                    key={prod.id_producto}
                    onClick={() => addToCart(prod)}
                    className="glass-card p-4 text-left hover:border-[var(--accent-primary)] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                        {prod.categoria.split(' ')[0]}
                      </span>
                      <svg className="w-5 h-5 text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm text-[var(--text-primary)] mb-1 line-clamp-2">{prod.nombre_producto}</p>
                    <p className="text-[var(--accent-secondary)] font-bold">Bs. {parseFloat(prod.precio_venta).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cart / Order summary */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                Comanda
              </h3>
              {tipoServicio && (
                <span className="badge badge-info text-xs">
                  {tipoServicio === 'Comer en el Lugar' ? `Mesa ${mesas.find(m => m.id_mesa === mesaSeleccionada)?.numero_mesa || ''}` : 'Para Llevar'}
                </span>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-sm text-[var(--text-muted)]">Comanda vacía</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Agregue productos del menú</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {carrito.map(item => (
                  <div key={item.id_producto} className="bg-[var(--bg-secondary)] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.nombre_producto}</p>
                        <p className="text-xs text-[var(--text-muted)]">Bs. {item.precio.toFixed(2)} c/u</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--accent-secondary)]">
                        Bs. {(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id_producto, -1)} className="w-7 h-7 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors text-sm">-</button>
                        <span className="text-sm font-semibold w-6 text-center">{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.id_producto, 1)} className="w-7 h-7 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--success)] transition-colors text-sm">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id_producto)} className="text-xs text-[var(--danger)] hover:underline">
                        Quitar
                      </button>
                    </div>

                    {/* Observaciones */}
                    <input
                      className="mt-2 w-full text-xs bg-[var(--bg-card)] border border-transparent focus:border-[var(--accent-primary)] rounded-lg px-2 py-1.5 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] outline-none"
                      placeholder="Observación (ej: sin azúcar)"
                      value={observaciones[item.id_producto] || ''}
                      onChange={(e) => setObservaciones({ ...observaciones, [item.id_producto]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {carrito.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[var(--text-secondary)]">Total</span>
                  <span className="text-2xl font-bold text-[var(--accent-secondary)]">
                    Bs. {total.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={enviarPedido}
                  disabled={procesando || !tipoServicio}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50"
                >
                  {procesando ? 'Procesando...' : 'Enviar Pedido'}
                </button>
              </div>
            )}

            {/* Reset */}
            {tipoServicio && (
              <button
                onClick={() => { setTipoServicio(''); setMesaSeleccionada(null); setCarrito([]); setObservaciones({}); }}
                className="btn-secondary w-full mt-3 text-xs"
              >
                Reiniciar Pedido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
