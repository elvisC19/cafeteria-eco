'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MenuPublicoPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCarrito, setShowCarrito] = useState(false);
  const [tipoServicio, setTipoServicio] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [enviando, setEnviando] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [nitFactura, setNitFactura] = useState('');
  const [razonSocialFactura, setRazonSocialFactura] = useState('');
  const [horaRecojo, setHoraRecojo] = useState('');

  useEffect(() => {
    setMounted(true);
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      const res = await fetch('/api/productos?disponible=true');
      const data = await res.json();
      setProductos(data.productos || []);
      setCategorias(data.por_categoria || {});
    } catch (err) {
      setError('No se pudo cargar el menú.');
    } finally {
      setLoading(false);
    }
  }

  const allCats = ['Todas', ...Object.keys(categorias)];
  
  const productosFiltrados = productos.filter(p => {
    const matchCat = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
    const matchSearch = p.nombre_producto.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = carrito.reduce((sum, item) => sum + parseFloat((parseFloat(item.precio_venta) * item.qty).toFixed(2)), 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(prod) {
    setCarrito(prev => {
      const ex = prev.find(i => i.id_producto === prod.id_producto);
      if (ex) return prev.map(i => i.id_producto === prod.id_producto ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...prod, qty: 1 }];
    });
  }

  function updateQty(id, delta) {
    setCarrito(prev => prev.map(i => i.id_producto === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  }

  async function enviarPedido() {
    if (!tipoServicio) { setError('Seleccione el canal de distribución.'); return; }
    if (tipoServicio === 'Comer en el Lugar' && !numeroMesa) { setError('Ingrese el número de mesa.'); return; }
    if (carrito.length === 0) { setError('Agregue productos al carrito.'); return; }
    if (!clienteNombre.trim()) { setError('Por favor, ingrese su nombre completo.'); return; }
    if (!clienteTelefono.trim()) { setError('Por favor, ingrese su número de teléfono.'); return; }
    if (tipoServicio === 'Para Llevar / Recoger' && metodoPago === 'Efectivo' && !horaRecojo.trim()) {
      setError('Por favor, indique la hora aproximada de recogida.');
      return;
    }

    setEnviando(true);
    setError('');
    try {
      let mesaId = null;
      if (tipoServicio === 'Comer en el Lugar') {
        const mesaRes = await fetch('/api/mesas/status');
        const mesaData = await mesaRes.json();
        const mesa = mesaData.mesas?.find(m => m.numero_mesa === parseInt(numeroMesa));
        if (!mesa) { setError('Mesa no encontrada.'); setEnviando(false); return; }
        if (mesa.estado !== 'Disponible') { setError('Esa mesa no está disponible.'); setEnviando(false); return; }
        mesaId = mesa.id_mesa;
      }

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_servicio: tipoServicio,
          id_mesa: mesaId,
          metodo_pago: metodoPago,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          nit_factura: nitFactura || '0',
          razon_social_factura: razonSocialFactura || clienteNombre,
          hora_recojo: tipoServicio === 'Para Llevar / Recoger' ? horaRecojo : null,
          items: carrito.map(i => ({
            id_producto: i.id_producto,
            cantidad: i.qty,
            observaciones: i.observaciones || null
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detalle);

      setPedidoExitoso(data.pedido);
      setCarrito([]);
      setShowCarrito(false);
      setTipoServicio('');
      setNumeroMesa('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  // No emojis needed for categories

  const catColors = {
    'Bebidas Calientes': 'bg-emerald-50 text-emerald-800 border-emerald-100',
    'Bebidas Frías': 'bg-blue-50 text-blue-800 border-blue-100',
    'Repostería': 'bg-amber-50 text-amber-800 border-amber-100',
    'Desayunos': 'bg-orange-50 text-orange-800 border-orange-100',
    'Meriendas': 'bg-yellow-50 text-yellow-800 border-yellow-100',
    'Todas': 'bg-stone-50 text-stone-800 border-stone-100'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF3E8]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4 border-[#E6DBC8] border-t-[#8A6F57]" />
          <p className="text-[#8E7A6E] font-medium text-sm">Cargando menú digital...</p>
        </div>
      </div>
    );
  }

  // Pedido exitoso
  if (pedidoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF3E8] px-4 py-8 text-[#3B2B24]">
        <div className="glass-card shadow-neomorph-out p-8 max-w-md w-full text-center animate-slide-up border-t-8 border-[#607C5B] relative bg-white">
          <div className="w-16 h-16 bg-[#607C5B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-[#607C5B]">⏱</span>
          </div>

          <h2 className="text-2xl font-bold text-[#3B2B24] mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            ¡Pedido Registrado!
          </h2>
          <p className="text-[#6B564C] text-xs mb-6">Tu orden ha sido enviada a caja y está en espera de validación por el cajero.</p>
          
          <div className="bg-[#F3EAD8] rounded-2xl p-5 mb-6 text-left border border-[#E6DBC8] shadow-neomorph-in space-y-2 text-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-[#8E7A6E] uppercase font-bold tracking-wider">Estado de Validación</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#607C5B]/20 text-[#607C5B] animate-pulse">
                Espera Validación
              </span>
            </div>
            
            <p className="text-3xl font-extrabold text-[#3B2B24] tracking-tight">#{pedidoExitoso.id_pedido}</p>
            
            <div className="border-t border-[#E6DBC8] my-2 pt-2 flex justify-between">
              <span className="text-[#6B564C]">Cliente:</span>
              <span className="font-bold">{pedidoExitoso.cliente_nombre}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B564C]">Teléfono:</span>
              <span className="font-bold">{pedidoExitoso.cliente_telefono}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B564C]">Razón Social:</span>
              <span className="font-bold">{pedidoExitoso.razon_social_factura}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B564C]">NIT/CI:</span>
              <span className="font-bold">{pedidoExitoso.nit_factura}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B564C]">Canal:</span>
              <span className="font-bold">{pedidoExitoso.tipo_servicio}</span>
            </div>

            {pedidoExitoso.id_mesa && (
              <div className="flex justify-between">
                <span className="text-[#6B564C]">Mesa:</span>
                <span className="font-bold">Mesa {numeroMesa || pedidoExitoso.id_mesa}</span>
              </div>
            )}

            {pedidoExitoso.hora_recojo && (
              <div className="flex justify-between text-[#607C5B] font-bold">
                <span>Hora Recojo Aprox:</span>
                <span>{pedidoExitoso.hora_recojo}</span>
              </div>
            )}
            
            <div className="border-t border-[#E6DBC8] pt-2 flex justify-between text-sm">
              <span className="text-[#6B564C] font-bold">Total:</span>
              <span className="font-bold text-[#3B2B24]">Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Section */}
          {pedidoExitoso.metodo_pago === 'Pago QR Simple' ? (
            <div className="mb-6 p-4 bg-white rounded-2xl border border-[#E6DBC8] flex flex-col items-center shadow-sm">
              <p className="text-xs font-semibold text-[#8E7A6E] mb-3 font-medium">Escanea el código QR y realiza tu transferencia</p>
              <div className="w-40 h-40 bg-neutral-100 p-2 rounded-xl flex items-center justify-center border border-dashed border-[#8A6F57] relative">
                <svg className="w-36 h-36 text-[#3B2B24]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                </svg>
                <div className="absolute w-8 h-8 bg-white border border-[#E6DBC8] rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-[#3B2B24]">CC</span>
                </div>
              </div>
              <span className="text-[10px] text-[#607C5B] bg-[#607C5B]/10 px-2.5 py-1 rounded-full font-bold mt-3 animate-pulse">
                Pago enviado. Verificando en caja...
              </span>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-left">
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                👉 **Pago en Efectivo**: Pagarás un total de **Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}** al momento de recoger tu pedido. El cajero te enviará la factura de tu compra por WhatsApp.
              </p>
            </div>
          )}

          <p className="text-[11px] text-[#8E7A6E] mb-6">
            Una vez aprobado, el cajero registrará la factura fiscal SIN y te la enviará por WhatsApp al teléfono **{pedidoExitoso.cliente_telefono}**.
          </p>

          <button onClick={() => setPedidoExitoso(null)} className="btn-primary w-full py-3 shadow-neomorph-hover">
            Hacer Otro Pedido
          </button>
          <Link href="/" className="btn-secondary w-full mt-3 block text-center">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#FBF3E8] text-[#3B2B24] flex flex-col">
      {/* Sunlight decoration */}
      <div className="absolute top-0 right-0 w-2/3 h-80 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-0 filter blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#E6DBC8] px-6 py-4 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B2B24] flex items-center justify-center text-lg font-bold text-[#FBF3E8] shadow-sm">
              CC
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>Charcas Capital</h1>
              <p className="text-[10px] text-[#8A6F57] uppercase font-bold tracking-wider">Menú Digital</p>
            </div>
          </Link>

          <button
            onClick={() => setShowCarrito(true)}
            className="btn-primary relative flex items-center gap-2 text-xs py-2 px-4 shadow-neomorph-hover"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Carrito</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#A64B4B] text-white text-[10px] flex items-center justify-center font-bold animate-bounce">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Header */}
      <section className={`relative py-12 px-6 text-center transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'} z-10`}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-bold text-[#3B2B24] mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Nuestra Carta
          </h2>
          <p className="text-xs sm:text-sm text-[#6B564C] leading-relaxed">
            Cafés de especialidad, infusiones seleccionadas y repostería artesanal servidos en un ambiente iluminado, amplio y sofisticado.
          </p>
        </div>
      </section>

      {/* Search and Category Pills Bar (Z-pattern secondary scan point) */}
      <div className="sticky top-[73px] z-20 bg-white/85 backdrop-blur-md border-y border-[#E6DBC8] px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Categories Horizontal Scroller */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  categoriaActiva === cat
                    ? 'bg-[#3B2B24] text-white shadow-sm'
                    : 'bg-[#FBF3E8] text-[#6B564C] hover:bg-[#F8F0E2] border border-[#E6DBC8]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar (Neomorphic shadow in) */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input-field !py-1.5 !pl-9 !pr-4 text-xs border-[#E6DBC8] shadow-neomorph-in"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-xs text-[#8E7A6E] flex items-center">
              <svg className="w-3.5 h-3.5 text-[#8E7A6E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

        </div>
      </div>

      {/* Products Grid (Bento cards look for all items) */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full z-10">
        {productosFiltrados.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto shadow-neomorph-out flex flex-col items-center">
            <svg className="w-12 h-12 text-[#8E7A6E] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-[#8E7A6E]">No hay productos en esta selección.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productosFiltrados.map((prod, i) => {
              const inCart = carrito.find(c => c.id_producto === prod.id_producto);
              return (
                <div
                  key={prod.id_producto}
                  className="bento-card p-0 flex flex-col justify-between group bg-white overflow-hidden"
                >
                  <div>
                    {/* Product Image */}
                    <div className="w-full h-40 bg-[#FBF3E8] relative overflow-hidden flex items-center justify-center border-b border-[#E6DBC8]/50">
                      {prod.imagen_url ? (
                        <img
                          src={prod.imagen_url}
                          alt={prod.nombre_producto}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentNode.querySelector('.fallback-icon');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${prod.imagen_url ? 'hidden' : ''}`}>
                        <span className="p-3 bg-white/90 rounded-xl shadow-sm border border-[#E6DBC8]/30 animate-pulse">
                          <svg className="w-6 h-6 text-[#8A6F57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c0-1.1.9-2 2-2h8a2 2 0 012 2v6a5 5 0 01-5 5H9a5 5 0 01-5-5V5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 7h1a2 2 0 012 2v2a2 2 0 01-2 2h-1M6 19h12" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColors[prod.categoria] || 'bg-stone-100 text-stone-800'}`}>
                          {prod.categoria}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#3B2B24] mb-1 group-hover:text-[#8A6F57] transition-colors">
                        {prod.nombre_producto}
                      </h3>
                      <p className="text-[11px] text-[#8E7A6E] leading-relaxed line-clamp-2">
                        Granos selectos e insumos frescos de primera calidad para una taza perfecta.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 pt-4 border-t border-[#FBF3E8] mt-auto">
                    <div>
                      <span className="text-[9px] text-[#8E7A6E] block font-bold uppercase tracking-wider">Precio</span>
                      <span className="text-base font-extrabold text-[#3B2B24]">
                        Bs. {parseFloat(prod.precio_venta).toFixed(2)}
                      </span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-1 bg-[#FBF3E8] rounded-xl p-1 border border-[#E6DBC8]">
                        <button onClick={() => updateQty(prod.id_producto, -1)} className="w-6 h-6 rounded-lg bg-white text-xs font-bold text-[#A64B4B] flex items-center justify-center">-</button>
                        <span className="font-bold text-xs w-5 text-center text-[#3B2B24]">{inCart.qty}</span>
                        <button onClick={() => updateQty(prod.id_producto, 1)} className="w-6 h-6 rounded-lg bg-white text-xs font-bold text-[#607C5B] flex items-center justify-center">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(prod)}
                        className="bg-[#3B2B24] hover:bg-[#8A6F57] text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-colors shadow-sm"
                      >
                        + Añadir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer Panel (Mobile responsive: 100% width) */}
      {showCarrito && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowCarrito(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-md bg-white border-l border-[#E6DBC8] flex flex-col animate-slide-up shadow-2xl z-10">
            <div className="p-5 border-b border-[#E6DBC8] flex items-center justify-between bg-[#FBF3E8]">
              <h3 className="text-base font-bold text-[#3B2B24] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#3B2B24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Mi Pedido Digital</span>
              </h3>
              <button onClick={() => setShowCarrito(false)} className="p-1.5 rounded-full hover:bg-neutral-200 text-[#3B2B24] text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <svg className="w-12 h-12 text-[#8E7A6E] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-xs font-semibold text-[#8E7A6E]">El carrito está vacío</p>
                </div>
              ) : (
                <>
                  {/* Service selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Canal de distribución</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTipoServicio('Comer en el Lugar')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-1.5 ${
                          tipoServicio === 'Comer en el Lugar'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                        </svg>
                        <span>En el Lugar</span>
                      </button>
                      <button
                        onClick={() => { setTipoServicio('Para Llevar / Recoger'); setNumeroMesa(''); }}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-1.5 ${
                          tipoServicio === 'Para Llevar / Recoger'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Para Llevar</span>
                      </button>
                    </div>
                  </div>

                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[#FBF3E8] rounded-xl p-4 border border-[#E6DBC8] animate-fade-in shadow-neomorph-in">
                      <label className="block text-xs font-bold text-[#8A6F57] uppercase tracking-wider mb-2">
                        Selecciona Mesa
                      </label>
                      <select
                        className="input-field text-xs font-bold text-center border-[#E6DBC8] bg-white cursor-pointer"
                        value={numeroMesa}
                        onChange={(e) => setNumeroMesa(e.target.value)}
                      >
                        <option value="">-- Elige Mesa --</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n}>Mesa {n}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Efectivo', 'Pago QR Simple'].map(met => (
                        <button
                          key={met}
                          onClick={() => setMetodoPago(met)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                            metodoPago === met
                              ? 'bg-[#607C5B] border-[#607C5B] text-white shadow-sm'
                              : 'bg-white border-[#E6DBC8] text-[#6B564C] hover:bg-[#F8F0E2]'
                          }`}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            {met === 'Pago QR Simple' ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span>QR Simple</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Efectivo</span>
                              </>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div className="space-y-3 pt-3 border-t border-[#E6DBC8]/40">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Datos de Contacto</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Nombre Completo (ej: Juan Perez)"
                        value={clienteNombre}
                        onChange={(e) => { setClienteNombre(e.target.value); setError(''); }}
                      />
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Número de Teléfono (ej: 78945612)"
                        value={clienteTelefono}
                        onChange={(e) => { setClienteTelefono(e.target.value); setError(''); }}
                      />
                    </div>
                  </div>

                  {/* Facturación */}
                  <div className="space-y-3 pt-3 border-t border-[#E6DBC8]/40">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Datos de Facturación</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Razón Social (opcional)"
                        value={razonSocialFactura}
                        onChange={(e) => setRazonSocialFactura(e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="NIT o CI (opcional)"
                        value={nitFactura}
                        onChange={(e) => setNitFactura(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Detalle para llevar */}
                  {tipoServicio === 'Para Llevar / Recoger' && metodoPago === 'Efectivo' && (
                    <div className="bg-[#FBF3E8] rounded-xl p-4 border border-[#E6DBC8] space-y-2 animate-fade-in shadow-neomorph-in">
                      <label className="block text-xs font-bold text-[#8A6F57] uppercase tracking-wider">
                        ¿A qué hora pasará a recoger?
                      </label>
                      <input
                        type="text"
                        className="input-field text-center text-sm font-bold border-[#E6DBC8] bg-white"
                        placeholder="Ej: 15:30"
                        value={horaRecojo}
                        onChange={(e) => { setHoraRecojo(e.target.value); setError(''); }}
                      />
                      <p className="text-[10px] text-[#8E7A6E] italic">Pagarás en efectivo en caja al momento de retirar tu pedido.</p>
                    </div>
                  )}

                  {/* QR Code simple instructions */}
                  {metodoPago === 'Pago QR Simple' && (
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-center space-y-2 animate-fade-in">
                      <p className="text-xs font-bold text-blue-900">Código QR de Pago Simple</p>
                      
                      <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center border border-dashed border-blue-300 mx-auto relative shadow-sm">
                        <svg className="w-32 h-32 text-blue-950" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                        </svg>
                        <div className="absolute w-6 h-6 bg-white border border-blue-200 rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold text-blue-950">CC</span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-blue-950 font-medium">Realice la transferencia de **Bs. {total.toFixed(2)}** y luego confirme su pedido.</p>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="space-y-3 pt-3 border-t border-[#E6DBC8]/40">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Productos</p>
                    {carrito.map(item => (
                      <div key={item.id_producto} className="bg-[#FBF3E8]/50 border border-[#E6DBC8] rounded-2xl p-4 space-y-2 shadow-sm">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-bold text-xs text-[#3B2B24]">{item.nombre_producto}</p>
                            <p className="text-[10px] text-[#8E7A6E]">Bs. {parseFloat(item.precio_venta).toFixed(2)} c/u</p>
                          </div>
                          <p className="text-xs font-extrabold text-[#3B2B24]">
                            Bs. {(parseFloat(item.precio_venta) * item.qty).toFixed(2)}
                          </p>
                        </div>

                        <input
                          type="text"
                          className="text-[10px] bg-white border border-[#E6DBC8] rounded-lg px-2 py-1.5 text-[#3B2B24] w-full focus:outline-none"
                          placeholder="Observaciones de preparación..."
                          value={item.observaciones || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCarrito(prev => prev.map(i => i.id_producto === item.id_producto ? { ...i, observaciones: val } : i));
                          }}
                        />

                        <div className="flex items-center justify-between border-t border-[#E6DBC8]/30 pt-2">
                          <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[#E6DBC8]">
                            <button onClick={() => updateQty(item.id_producto, -1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center">-</button>
                            <span className="font-bold text-xs w-5 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id_producto, 1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center">+</button>
                          </div>
                          <button onClick={() => setCarrito(prev => prev.filter(i => i.id_producto !== item.id_producto))} className="text-[10px] font-bold text-[#A64B4B]">
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Cart Footer */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-[#E6DBC8] bg-[#FBF3E8]">
                {error && (
                  <p className="text-xs text-[#A64B4B] bg-[#A64B4B]/15 p-2.5 rounded-xl mb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                  </p>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-[#8E7A6E] font-medium block">Total a Pagar</span>
                    <span className="text-xl font-bold text-[#3B2B24]">Bs. {total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={enviarPedido}
                  disabled={enviando || !tipoServicio || (tipoServicio === 'Comer en el Lugar' && !numeroMesa)}
                  className="btn-primary w-full py-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50 shadow-neomorph-hover"
                >
                  {enviando ? 'Enviando orden...' : 'Confirmar Compra'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 px-6 border-t border-[#E6DBC8] bg-white relative z-10 mt-auto">
        <p className="text-xs font-semibold text-[#8E7A6E]">☕ Charcas Capital — Cafetería & Salón de Té</p>
        <p className="text-[10px] text-[#8E7A6E] mt-1">Chuquisaca, Bolivia • IND210 USFX</p>
      </footer>
    </div>
  );
}
