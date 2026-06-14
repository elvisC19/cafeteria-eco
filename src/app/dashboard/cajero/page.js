'use client';
import { useState, useEffect } from 'react';
import { productosAPI, mesasAPI, pedidosAPI, pagosAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AsistenciaControl from '@/components/AsistenciaControl';

export default function CajeroPage() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
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

  // New States
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'validations', 'history', 'catalog'
  const [selectedPedido, setSelectedPedido] = useState(null); // for printable invoice modal
  const [urlEdits, setUrlEdits] = useState({}); // catalog image URLs inputs state

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (activeTab === 'validations' || activeTab === 'history') {
        loadPedidos();
      }
    }, 10000); // Poll orders every 10s on validation/history tabs
    return () => clearInterval(interval);
  }, [activeTab]);

  async function loadData() {
    try {
      const [prodData, mesaData] = await Promise.all([
        productosAPI.listar(true),
        mesasAPI.obtener()
      ]);
      setProductos(prodData.productos || []);
      setMesas(mesaData.mesas || []);
      await loadPedidos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPedidos() {
    try {
      const data = await pedidosAPI.listar();
      setPedidos(data.pedidos || []);
    } catch (err) {
      console.error('Error al cargar pedidos:', err.message);
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

      // POS orders automatically pass to processing, trigger payment options
      setShowPago(true);
      setResultadoPago({ id_pedido: result.pedido.id_pedido, total: parseFloat(result.pedido.total_pago) });
      
      setTimeout(() => setSuccess(''), 4000);
      await loadPedidos();
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

      // Generate invoice info for POS order
      const invoiceData = generarDatosFactura({
        id_pedido: resultadoPago.id_pedido,
        total_pago: resultadoPago.total,
        fecha_hora: new Date().toISOString(),
        nit_factura: '0',
        razon_social_factura: 'Cliente General'
      });

      await pedidosAPI.actualizarEstado(resultadoPago.id_pedido, 'Pendiente');
      
      // Update details
      await fetch('/api/pedidos/cola-fifo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pedido: resultadoPago.id_pedido,
          estado_pago: 'Pagado',
          ...invoiceData
        })
      });

      setSuccess(
        metodoPago === 'Efectivo'
          ? `Pago procesado. Cambio: Bs. ${pagoResult.pago.cambio}`
          : `Pago QR confirmado. Ref: ${pagoResult.pago.referencia_qr}`
      );

      const printedPedido = {
        id_pedido: resultadoPago.id_pedido,
        total_pago: resultadoPago.total,
        fecha_hora: new Date().toISOString(),
        nit_factura: '0',
        razon_social_factura: 'Cliente General',
        metodo_pago: metodoPago,
        cliente_telefono: '',
        detalles: carrito.map(item => ({
          cantidad: item.cantidad,
          nombre_producto: item.nombre_producto,
          subtotal: item.precio * item.cantidad
        })),
        ...invoiceData
      };

      setTimeout(async () => {
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
        
        // Prompt for POS invoice print
        const printConfirm = window.confirm("Pago registrado con éxito.\n¿Desea imprimir la factura?");
        if (printConfirm) {
          setSelectedPedido(printedPedido);
        }
        await loadData();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  // Generate Bolivian SIN Invoice metadata helper
  function generarDatosFactura(p) {
    const numeroFactura = String(41000 + p.id_pedido);
    const codeParts = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')
    );
    const codigoControl = codeParts.join('-');
    const nitEmisor = '1028347021';
    const leyenda = 'ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LEY. Ley N° 453: El proveedor deberá suministrar el servicio en las condiciones acordadas.';
    
    const fecha = new Date(p.fecha_hora).toLocaleDateString('es-BO');
    const totalVal = parseFloat(p.total_pago).toFixed(2);
    const nitComprador = p.nit_factura || '0';
    const qrData = `${nitEmisor}|${numeroFactura}|4004018302194|${fecha}|${totalVal}|${totalVal}|${codigoControl}|${nitComprador}|0|0|0|0`;

    return {
      numero_factura: numeroFactura,
      codigo_control: codigoControl,
      nit_emisor: nitEmisor,
      qr_factura: qrData,
      leyenda_factura: leyenda
    };
  }

  // Cashier Validation of Client Orders
  async function validarPedidoCliente(pedido, aprobar) {
    setProcesando(true);
    setError('');
    try {
      if (aprobar) {
        // Generate SIN Invoice details
        const invoiceDetails = generarDatosFactura(pedido);
        
        // Approve order: set to Pendiente, mark paid if QR, or unpaid if cash to collect later
        const res = await fetch('/api/pedidos/cola-fifo', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_pedido: pedido.id_pedido,
            estado_pedido: 'Pendiente',
            estado_pago: pedido.metodo_pago === 'Pago QR Simple' ? 'Pagado' : 'No Pagado',
            ...invoiceDetails
          })
        });

        if (!res.ok) {
          const rData = await res.json();
          throw new Error(rData.error || 'No se pudo aprobar el pedido.');
        }

        setSuccess(`Pedido #${pedido.id_pedido} aprobado y enviado a cocina.`);
        
        // Prompt for invoice print
        const printConfirm = window.confirm(`Pedido #${pedido.id_pedido} aprobado con éxito.\n¿Desea imprimir la factura?`);
        if (printConfirm) {
          setSelectedPedido({
            ...pedido,
            estado_pago: pedido.metodo_pago === 'Pago QR Simple' ? 'Pagado' : 'No Pagado',
            ...invoiceDetails
          });
        }
      } else {
        // Reject/Cancel order
        await pedidosAPI.actualizarEstado(pedido.id_pedido, 'Cancelado');
        setSuccess(`Pedido #${pedido.id_pedido} rechazado.`);
      }
      setTimeout(() => setSuccess(''), 4000);
      await loadPedidos();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }



  // WhatsApp share logic
  const shareInvoiceWhatsApp = (p) => {
    const telf = p.cliente_telefono || '';
    const cleanPhone = telf.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
    
    const text = `*CHARCAS CAPITAL - FACTURA FISCAL*
---------------------------------------------
*Factura N°:* ${p.numero_factura}
*Código de Control:* ${p.codigo_control}
*NIT Emisor:* ${p.nit_emisor}
*Autorización:* 4004018302194
---------------------------------------------
*Cliente:* ${p.razon_social_factura}
*NIT/CI:* ${p.nit_factura}
*Fecha:* ${new Date(p.fecha_hora).toLocaleString('es-BO')}
---------------------------------------------
${p.detalles?.map(i => `- ${i.cantidad}x ${i.nombre_producto} (Bs. ${(parseFloat(i.subtotal)/i.cantidad).toFixed(2)}) -> Bs. ${parseFloat(i.subtotal).toFixed(2)}`).join('\n')}
---------------------------------------------
*TOTAL: Bs. ${parseFloat(p.total_pago).toFixed(2)}*
*Forma de Pago:* ${p.metodo_pago}
---------------------------------------------
*Leyenda:* ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LEY.

¡Gracias por su preferencia! ☕`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encoded}`, '_blank');
  };

  const pendingValidations = pedidos.filter(p => p.estado_pedido === 'Espera Validación');
  const historyOrders = pedidos.filter(p => p.estado_pedido !== 'Espera Validación');
  const mesasDisponibles = mesas.filter(m => m.estado === 'Disponible');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-[var(--color-border-warm)] pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] animate-pulse-slow" style={{ fontFamily: 'var(--font-playfair)' }}>
            Panel de Control del Cajero
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">Ventas del local (POS), validación de pedidos en línea y facturación fiscal.</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <AsistenciaControl usuario={usuario} />

          {/* Tab switcher navigation */}
          <div className="flex gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'pos' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              🛒 POS Ventas
            </button>
            <button
              onClick={() => setActiveTab('validations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${activeTab === 'validations' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              ⏱ Pedidos en Línea
              {pendingValidations.length > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-[var(--color-cta)] text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-bounce">
                  {pendingValidations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'history' ? 'bg-[#3B2B24] text-white' : 'text-[#6B564C] hover:bg-[#F3EAD8]'}`}
            >
              📋 Facturación y Ventas
            </button>
          </div>
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
          TAB 1: POS / PUNTO DE VENTA
          ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          {pendingValidations.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse shadow-sm no-print">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-lg">⏱</span>
                <span>Atención: Hay <strong>{pendingValidations.length} {pendingValidations.length === 1 ? 'pedido en línea esperando' : 'pedidos en línea esperando'}</strong> validación de pago/datos.</span>
              </div>
              <button
                onClick={() => setActiveTab('validations')}
                className="bg-[#3B2B24] hover:bg-[#8A6F57] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors border-none"
              >
                Validar Pedidos ahora
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Service type selector */}
            {!tipoServicio && (
              <div className="glass-card p-6">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Canal de Distribución</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setTipoServicio('Comer en el Lugar')}
                    className="p-5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] hover:border-[#3B2B24] transition-all text-left flex flex-col items-start cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[rgba(139,26,26,0.08)] text-[var(--color-cta)] flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm text-[var(--color-text-primary)]">Comer en el Lugar</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Registrar mesa del salón</p>
                  </button>
                  <button
                    onClick={() => setTipoServicio('Para Llevar / Recoger')}
                    className="p-5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] hover:border-[#3B2B24] transition-all text-left flex flex-col items-start cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[rgba(139,26,26,0.08)] text-[var(--color-cta)] flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm text-[var(--color-text-primary)]">Para Llevar / Recoger</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Ticket de retiro rápido</p>
                  </button>
                </div>
              </div>
            )}

            {/* Mesa selector */}
            {tipoServicio === 'Comer en el Lugar' && !mesaSeleccionada && (
              <div className="glass-card p-6">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Seleccionar Mesa</h3>
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
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        categoriaActiva === cat
                          ? 'bg-[#3B2B24] text-white'
                          : 'bg-[var(--color-bg-card)] text-[#6B564C] hover:bg-[#F3EAD8]'
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
                      className="glass-card p-2 text-left hover:border-[#3B2B24] hover:shadow-md transition-all group flex gap-3 items-center min-h-[96px] relative overflow-hidden cursor-pointer"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-card)] relative overflow-hidden flex items-center justify-center flex-shrink-0 border border-[var(--color-border-warm)]/40">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre_producto}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              // show fallback
                              const fallback = e.target.parentNode.querySelector('.fallback-icon');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${prod.imagen_url ? 'hidden' : ''}`}>
                          <span className="text-lg">☕</span>
                        </div>
                      </div>

                      {/* Product Text Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                        <div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border-warm)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] uppercase">
                            {prod.categoria.split(' ')[0]}
                          </span>
                          <p className="font-bold text-[11px] text-[var(--color-text-primary)] mt-1 truncate group-hover:text-[var(--color-cta)] transition-colors">{prod.nombre_producto}</p>
                        </div>
                        <p className="text-[var(--color-gold)] font-extrabold text-xs">Bs. {parseFloat(prod.precio_venta).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* POS Cart comanda summary */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                  Carrito de Compras
                </h3>
                {tipoServicio && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                    {tipoServicio === 'Comer en el Lugar' ? `Mesa ${mesas.find(m => m.id_mesa === mesaSeleccionada)?.numero_mesa || ''}` : 'Para Llevar'}
                  </span>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Carrito vacío</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {carrito.map(item => (
                    <div key={item.id_producto} className="bg-[var(--color-bg-card)] rounded-xl p-3 border border-[var(--color-border-warm)]/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{item.nombre_producto}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Bs. {item.precio.toFixed(2)} c/u</p>
                        </div>
                        <p className="text-xs font-extrabold text-[var(--color-text-primary)]">
                          Bs. {(item.precio * item.cantidad).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border-warm)]/30">
                        <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[var(--color-border-warm)]">
                          <button onClick={() => updateQuantity(item.id_producto, -1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center hover:bg-neutral-100 cursor-pointer">-</button>
                          <span className="text-xs font-bold w-5 text-center text-[var(--color-text-primary)]">{item.cantidad}</span>
                          <button onClick={() => updateQuantity(item.id_producto, 1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center hover:bg-neutral-100 cursor-pointer">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id_producto)} className="text-[10px] font-bold text-[var(--color-cta)] hover:underline cursor-pointer">
                          Quitar
                        </button>
                      </div>

                      <input
                        className="mt-2 w-full text-[10px] bg-white border border-[var(--color-border-warm)] rounded-lg px-2 py-1.5 text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] outline-none"
                        placeholder="Observación de preparación..."
                        value={observaciones[item.id_producto] || ''}
                        onChange={(e) => setObservaciones({ ...observaciones, [item.id_producto]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {carrito.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-warm)]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">Monto Total</span>
                    <span className="text-xl font-bold text-[var(--color-gold)]">
                      Bs. {total.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={enviarPedido}
                    disabled={procesando || !tipoServicio}
                    className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {procesando ? 'Procesando...' : 'Confirmar & Registrar'}
                  </button>
                </div>
              )}

              {tipoServicio && (
                <button
                  onClick={() => { setTipoServicio(''); setMesaSeleccionada(null); setCarrito([]); setObservaciones({}); }}
                  className="btn-secondary w-full mt-3 text-[11px] py-2 cursor-pointer"
                >
                  Reiniciar Carrito
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Payment processing modal inside POS Tab */}
      {showPago && resultadoPago && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full animate-slide-up bg-white">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--color-cta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Registrar Pago POS</span>
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6 font-medium">
              Pedido #{resultadoPago.id_pedido} — Monto: <span className="text-[var(--color-gold)] font-bold text-sm">Bs. {resultadoPago.total.toFixed(2)}</span>
            </p>

            {!metodoPago ? (
              <div className="space-y-3">
                <button
                  onClick={() => setMetodoPago('Efectivo')}
                  className="w-full p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] hover:border-emerald-500 hover:bg-emerald-50/10 transition-colors text-left flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">Bs</div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">Efectivo</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Calcular cambio inmediatamente</p>
                  </div>
                </button>
                <button
                  onClick={() => setMetodoPago('Pago QR Simple')}
                  className="w-full p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] hover:border-blue-500 hover:bg-blue-50/10 transition-colors text-left flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">Pago QR Simple</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Transferencia QR Simple simulada</p>
                  </div>
                </button>
                <button onClick={() => { setShowPago(false); setCarrito([]); setTipoServicio(''); setMesaSeleccionada(null); setObservaciones({}); loadData(); }} className="btn-secondary w-full mt-2 py-2 cursor-pointer text-xs">
                  Pagar en el Salón Después
                </button>
              </div>
            ) : metodoPago === 'Efectivo' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Monto Recibido (Bs.)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field text-xl text-center font-bold"
                    placeholder="0.00"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    autoFocus
                  />
                </div>

                {montoRecibido && parseFloat(montoRecibido) >= resultadoPago.total && (
                  <div className="bg-emerald-50/50 rounded-xl p-3 text-center border border-emerald-100">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Cambio a Entregar</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      Bs. {(parseFloat(montoRecibido) - resultadoPago.total).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100, 200].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setMontoRecibido(String(amt))}
                      className="btn-secondary !py-1 text-xs cursor-pointer"
                    >
                      Bs.{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setMontoRecibido(String(resultadoPago.total))}
                    className="btn-secondary !py-1 text-xs col-span-3 bg-emerald-50/50 text-emerald-800 border-emerald-300 font-bold cursor-pointer"
                  >
                    Exacto (Bs. {resultadoPago.total.toFixed(2)})
                  </button>
                </div>

                <div className="flex gap-2">
                  <button onClick={procesarPago} disabled={procesando} className="btn-primary flex-1 py-2 text-xs font-bold cursor-pointer">
                    {procesando ? 'Procesando...' : 'Confirmar Pago'}
                  </button>
                  <button onClick={() => setMetodoPago('')} className="btn-secondary py-2 text-xs cursor-pointer">Atrás</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-3 border border-dashed border-[var(--color-border-warm)] bg-white rounded-xl mx-auto w-fit">
                  <svg viewBox="0 0 200 200" className="w-40 h-40">
                    <rect width="200" height="200" fill="white"/>
                    {Array.from({length: 10}).map((_, row) =>
                      Array.from({length: 10}).map((_, col) => {
                        const fill = ((row + col) % 3 === 0 || (row * col) % 5 === 0) ? '#000' : '#fff';
                        return <rect key={`${row}-${col}`} x={20 + col*16} y={20 + row*16} width="14" height="14" fill={fill} rx="2"/>;
                      })
                    )}
                    <rect x="16" y="16" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="24" y="24" width="34" height="34" fill="#000" rx="2"/>
                    <rect x="134" y="16" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="142" y="24" width="34" height="34" fill="#000" rx="2"/>
                    <rect x="16" y="134" width="50" height="50" fill="none" stroke="#000" strokeWidth="4" rx="4"/>
                    <rect x="24" y="142" width="34" height="34" fill="#000" rx="2"/>
                  </svg>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Banco Unión — QR Simple</p>
                  <p className="text-base font-extrabold text-gray-900">Bs. {resultadoPago.total.toFixed(2)}</p>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">Verifique la transferencia en su aplicación bancaria.</p>
                <div className="flex gap-2">
                  <button onClick={procesarPago} disabled={procesando} className="btn-primary flex-1 py-2 text-xs font-bold cursor-pointer">
                    {procesando ? 'Verificando...' : 'Confirmar Pago QR'}
                  </button>
                  <button onClick={() => setMetodoPago('')} className="btn-secondary py-2 text-xs cursor-pointer">Atrás</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 2: VALIDAR PEDIDOS ENTRANTES DE CLIENTES
          ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'validations' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Aprobación de Pedidos del Cliente</h2>
          {pendingValidations.length === 0 ? (
            <div className="glass-card p-12 text-center bg-white border border-[var(--color-border-warm)]">
              <span className="text-4xl block mb-2">📥</span>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">No hay pedidos pendientes de validación</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Los nuevos pedidos de la carta digital de clientes llegarán aquí en tiempo real.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingValidations.map(p => (
                <div key={p.id_pedido} className="bg-white border border-[var(--color-border-warm)] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black text-[var(--color-text-primary)]">Pedido #{p.id_pedido}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 animate-pulse">
                        Espera Validación
                      </span>
                    </div>

                    {/* Customer info */}
                    <div className="bg-[var(--color-bg-card)] rounded-xl p-3 border border-[var(--color-border-warm)]/40 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                      <p><strong className="text-[var(--color-text-primary)]">Cliente:</strong> {p.cliente_nombre}</p>
                      <p><strong className="text-[var(--color-text-primary)]">Teléfono:</strong> {p.cliente_telefono}</p>
                      <p><strong className="text-[var(--color-text-primary)]">Factura:</strong> {p.razon_social_factura} (NIT: {p.nit_factura})</p>
                      <p><strong className="text-[var(--color-text-primary)]">Canal:</strong> {p.tipo_servicio} {p.numero_mesa ? `(Mesa ${p.numero_mesa})` : ''}</p>
                      {p.hora_recojo && (
                        <p className="text-[var(--color-cta)] font-semibold"><strong className="text-[var(--color-text-primary)]">Hora Recojo:</strong> {p.hora_recojo}</p>
                      )}
                      <p><strong className="text-[var(--color-text-primary)]">Pago:</strong> {p.metodo_pago}</p>
                    </div>

                    {/* Items comanda list */}
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Productos en Orden</p>
                      {p.detalles?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs border-b border-[var(--color-border-warm)]/20 pb-1.5">
                          <span className="font-semibold">{item.cantidad}x {item.nombre_producto}</span>
                          <span className="text-[var(--color-text-muted)]">Bs. {parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border-warm)]/60">
                      <span className="text-xs font-bold text-[var(--color-text-secondary)]">Total a Cobrar</span>
                      <span className="text-base font-extrabold text-[var(--color-gold)]">Bs. {parseFloat(p.total_pago).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Approve/Reject Actions */}
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => validarPedidoCliente(p, true)}
                      disabled={procesando}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors border-none disabled:opacity-50"
                    >
                      Aprobar y Mandar a Cocina
                    </button>
                    <button
                      onClick={() => validarPedidoCliente(p, false)}
                      disabled={procesando}
                      className="px-3 border border-[var(--color-cta)] text-[var(--color-cta)] hover:bg-[var(--color-cta)]/5 font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 3: HISTORIAL DE VENTAS Y FACTURACIÓN FISCAL
          ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Historial de Ventas y Emisión de Facturas</h2>
          
          <div className="bg-white border border-[var(--color-border-warm)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--color-border-warm)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                    <th className="p-4">ID Pedido</th>
                    <th className="p-4">Fecha/Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Factura N°</th>
                    <th className="p-4">Canal</th>
                    <th className="p-4">Pago</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-warm)]/45">
                  {historyOrders.map(p => (
                    <tr key={p.id_pedido} className="hover:bg-[var(--color-bg-card)]/40 transition-colors">
                      <td className="p-4 font-bold text-[var(--color-text-primary)]">#{p.id_pedido}</td>
                      <td className="p-4 text-[var(--color-text-secondary)]">{new Date(p.fecha_hora).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="p-4">
                        <p className="font-bold text-[var(--color-text-primary)]">{p.cliente_nombre || 'Cliente POS'}</p>
                        {p.cliente_telefono && <p className="text-[10px] text-[var(--color-text-muted)]">{p.cliente_telefono}</p>}
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-700">{p.numero_factura || 'POS - Directo'}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-semibold">
                          {p.tipo_servicio} {p.numero_mesa ? `(Mesa ${p.numero_mesa})` : ''}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${p.estado_pago === 'Pagado' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                          {p.estado_pago}
                        </span>
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{p.metodo_pago || 'POS'}</p>
                      </td>
                      <td className="p-4 font-extrabold text-[var(--color-text-primary)]">Bs. {parseFloat(p.total_pago).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-[4px] font-bold text-[9px] uppercase ${
                          p.estado_pedido === 'Cancelado' ? 'bg-red-50 text-red-800' :
                          p.estado_pedido === 'Listo' || p.estado_pedido === 'Entregado' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {p.estado_pedido}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedPedido(p)}
                            className="bg-[#3B2B24] hover:bg-[#8A6F57] text-white text-[10px] font-bold py-1.5 px-3 rounded-[4px] transition-colors cursor-pointer border-none"
                          >
                            🖨 Ver Factura
                          </button>
                          
                          {p.cliente_telefono && (
                            <button
                              onClick={() => shareInvoiceWhatsApp(p)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-[4px] transition-colors cursor-pointer border-none"
                              title="Compartir por WhatsApp"
                            >
                              💬 Enviar WA
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {historyOrders.length === 0 && (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-[var(--color-text-muted)]">No hay registros de ventas.</td>
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
          MODAL: LEGAL BOLIVIAN SIN INVOICE TICKET VIEW & PRINT
          ──────────────────────────────────────────────────────────────── */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start overflow-y-auto p-4 md:p-6 no-print-modal-container">
          <div className="bg-white border border-[var(--color-border-warm)] rounded-xl max-w-sm w-full p-5 relative shadow-2xl space-y-4 animate-slide-up my-auto no-print-modal-card">
            <button
              onClick={() => setSelectedPedido(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-base cursor-pointer border-none bg-transparent no-print"
            >
              ✕
            </button>

            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 no-print">Factura Fiscal SIN</h3>
            
            {/* Legal Ticket Render Zone */}
            <div className="print-receipt-container bg-white p-5 rounded-xl border border-neutral-200 font-mono text-[11px] text-black space-y-3 leading-relaxed shadow-md overflow-y-auto max-h-[45vh] lg:max-h-[50vh] select-text">
              <div className="text-center space-y-0.5">
                <p className="font-bold text-xs uppercase">CHARCAS CAPITAL S.R.L.</p>
                <p className="font-bold">SUCURSAL CENTRAL SUCRE</p>
                <p>Calle España esq. Junín</p>
                <p>Sucre - Chuquisaca - Bolivia</p>
                <p>Telf: +591 64-51234</p>
                <p className="border-t border-dashed border-neutral-400 my-1 pt-1 font-bold text-[12px]">FACTURA</p>
                <p className="text-[10px] uppercase font-bold tracking-wider">CON DERECHO A CRÉDITO FISCAL</p>
              </div>

              <div className="border-t border-dashed border-neutral-400 py-1 space-y-0.5 text-[10px]">
                <p><strong>NIT EMISOR:</strong> {selectedPedido.nit_emisor || '1028347021'}</p>
                <p><strong>FACTURA N°:</strong> {selectedPedido.numero_factura || '41001'}</p>
                <p><strong>AUTORIZACIÓN:</strong> 4004018302194</p>
              </div>

              <div className="border-t border-dashed border-neutral-400 py-1 space-y-0.5 text-[10px]">
                <p><strong>FECHA:</strong> {selectedPedido.fecha_hora ? new Date(selectedPedido.fecha_hora).toLocaleString('es-BO') : new Date().toLocaleString('es-BO')}</p>
                <p><strong>R. SOCIAL:</strong> {selectedPedido.razon_social_factura || 'Cliente General'}</p>
                <p><strong>NIT/CI:</strong> {selectedPedido.nit_factura || '0'}</p>
              </div>

              <div className="border-t border-dashed border-neutral-400 py-1">
                <div className="grid grid-cols-12 gap-0.5 font-bold border-b border-neutral-300 pb-1 mb-1 text-[10px]">
                  <span className="col-span-2">CANT</span>
                  <span className="col-span-6">DETALLE</span>
                  <span className="col-span-2 text-right">P.U.</span>
                  <span className="col-span-2 text-right">SUBT</span>
                </div>
                {selectedPedido.detalles?.map((item, idx) => {
                  if (!item) return null;
                  const qty = parseInt(item.cantidad) || 1;
                  const sub = parseFloat(item.subtotal) || 0;
                  const unitPrice = sub / qty;
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-0.5 py-0.5 border-b border-neutral-200/50 text-[10px]">
                      <span className="col-span-2">{qty}</span>
                      <span className="col-span-6 truncate">{item.nombre_producto || 'Desconocido'}</span>
                      <span className="col-span-2 text-right">Bs.{unitPrice.toFixed(2)}</span>
                      <span className="col-span-2 text-right">Bs.{sub.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="py-1 text-right space-y-0.5 text-[11px] font-bold">
                <p>TOTAL BS: {parseFloat(selectedPedido.total_pago || 0).toFixed(2)}</p>
                <p>PAGO: {selectedPedido.metodo_pago || 'Efectivo'}</p>
              </div>

              {selectedPedido.codigo_control && (
                <div className="border-t border-dashed border-neutral-400 py-1.5 space-y-0.5 text-[9px]">
                  <p><strong>CÓDIGO DE CONTROL:</strong> {selectedPedido.codigo_control}</p>
                  <p><strong>FECHA LÍMITE EMISIÓN:</strong> 15/09/2026</p>
                </div>
              )}

              {/* QR Code Graphic simulation */}
              <div className="border-t border-dashed border-neutral-400 py-2 flex flex-col items-center gap-1.5">
                <div className="w-24 h-24 bg-white p-1 rounded border border-neutral-300 relative flex items-center justify-center">
                  <svg className="w-22 h-22 text-neutral-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                  </svg>
                  <div className="absolute w-6 h-6 bg-white border border-neutral-200 rounded flex items-center justify-center font-bold text-[8px]">CC</div>
                </div>
                <p className="text-[7px] text-neutral-400 select-all break-all text-center leading-none max-w-[180px]">
                  {selectedPedido.qr_factura}
                </p>
              </div>

              <div className="text-center text-[8.5px] border-t border-neutral-300 pt-1.5 space-y-1">
                <p className="leading-tight text-neutral-600">"{selectedPedido.leyenda_factura || 'ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LEY.'}"</p>
                <p className="font-bold uppercase tracking-wider mt-1">GRACIAS POR SU PREFERENCIA</p>
              </div>
            </div>

            {/* Print CSS override */}
            <style jsx global>{`
              @media print {
                html, body, main, div, section, article {
                  overflow: visible !important;
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                  position: static !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                body {
                  background: white !important;
                  color: black !important;
                }
                body * {
                  visibility: hidden !important;
                }
                .print-receipt-container, .print-receipt-container * {
                  visibility: visible !important;
                }
                .print-receipt-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 80mm !important;
                  max-height: none !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 10px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                }
                .no-print, aside, header, nav, button {
                  display: none !important;
                  visibility: hidden !important;
                }
              }
            `}</style>

            <div className="flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#3B2B24] hover:bg-[#8A6F57] text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors border-none"
              >
                🖨 Imprimir Ticket
              </button>
              
              {selectedPedido.cliente_telefono && (
                <button
                  onClick={() => shareInvoiceWhatsApp(selectedPedido)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors border-none"
                >
                  💬 Enviar WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
