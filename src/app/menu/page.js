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

  const catEmojis = {
    'Bebidas Calientes': '☕',
    'Bebidas Frías': '🧊',
    'Repostería': '🧁',
    'Desayunos': '🍳',
    'Meriendas': '🫖',
    'Todas': '🌱'
  };

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
            <span className="text-3xl text-[#607C5B]">✓</span>
          </div>

          <h2 className="text-2xl font-bold text-[#3B2B24] mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            ¡Pedido Registrado!
          </h2>
          <p className="text-[#6B564C] text-sm mb-6">Su orden ha sido enviada directamente a la cocina.</p>
          
          <div className="bg-[#F3EAD8] rounded-2xl p-5 mb-6 text-left border border-[#E6DBC8] shadow-neomorph-in">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[#8E7A6E] uppercase font-bold tracking-wider">Número de Pedido</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#607C5B]/20 text-[#607C5B]">
                {pedidoExitoso.tipo_servicio}
              </span>
            </div>
            <p className="text-4xl font-extrabold text-[#3B2B24] tracking-tight">#{pedidoExitoso.id_pedido}</p>
            
            <div className="border-t border-[#E6DBC8] my-3 pt-3 flex justify-between text-sm">
              <span className="text-[#6B564C]">Mesa:</span>
              <span className="font-bold">{pedidoExitoso.id_mesa ? `Mesa ${numeroMesa || pedidoExitoso.id_mesa}` : 'Para Llevar'}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-[#6B564C]">Total:</span>
              <span className="font-bold text-[#3B2B24]">Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Section */}
          {pedidoExitoso.metodo_pago === 'Pago QR Simple' && (
            <div className="mb-6 p-4 bg-white rounded-2xl border border-[#E6DBC8] flex flex-col items-center shadow-sm">
              <p className="text-xs font-semibold text-[#8E7A6E] mb-3">Escanee el código QR para pagar su orden</p>
              <div className="w-40 h-40 bg-neutral-100 p-2 rounded-xl flex items-center justify-center border border-dashed border-[#8A6F57] relative">
                <svg className="w-36 h-36 text-[#3B2B24]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                </svg>
                <div className="absolute w-8 h-8 bg-white border border-[#E6DBC8] rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-[#3B2B24]">CC</span>
                </div>
              </div>
              <span className="text-[10px] text-[#607C5B] bg-[#607C5B]/10 px-2 py-0.5 rounded-full font-bold mt-2 animate-pulse">
                Esperando pago simple QR
              </span>
            </div>
          )}
          
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
      <div className="absolute top-12 left-4 text-4xl opacity-10 select-none animate-sway-slow pointer-events-none">🌿</div>
      <div className="absolute top-96 right-4 text-4xl opacity-15 select-none animate-sway-slow pointer-events-none">🌱</div>

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
            🛒 Carrito
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
                {catEmojis[cat] || '🍴'} {cat}
              </button>
            ))}
          </div>

          {/* Search bar (Neomorphic shadow in) */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              className="input-field py-1.5 pl-9 pr-4 text-xs border-[#E6DBC8] shadow-neomorph-in"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-xs text-[#8E7A6E]">🔍</span>
          </div>

        </div>
      </div>

      {/* Products Grid (Bento cards look for all items) */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full z-10">
        {productosFiltrados.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto shadow-neomorph-out">
            <span className="text-4xl block mb-2">🍃</span>
            <p className="text-sm font-semibold text-[#8E7A6E]">No hay productos en esta selección.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productosFiltrados.map((prod, i) => {
              const inCart = carrito.find(c => c.id_producto === prod.id_producto);
              return (
                <div
                  key={prod.id_producto}
                  className="bento-card p-5 flex flex-col justify-between group bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl p-1.5 bg-[#FBF3E8] rounded-xl">{catEmojis[prod.categoria] || '🍴'}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColors[prod.categoria] || 'bg-stone-100 text-stone-800'}`}>
                        {prod.categoria}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#3B2B24] mb-1 group-hover:text-[#8A6F57] transition-colors">
                      {prod.nombre_producto}
                    </h3>
                    <p className="text-[11px] text-[#8E7A6E] leading-relaxed line-clamp-2 mb-4">
                      Granos selectos e insumos frescos de primera calidad para una taza perfecta.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#FBF3E8] mt-auto">
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
              <h3 className="text-base font-bold text-[#3B2B24]">🛒 Mi Pedido Digital</h3>
              <button onClick={() => setShowCarrito(false)} className="p-1.5 rounded-full hover:bg-neutral-200 text-[#3B2B24] text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl block mb-3 animate-pulse">🛒</span>
                  <p className="text-xs font-semibold text-[#8E7A6E]">El carrito está vacío</p>
                </div>
              ) : (
                <>
                  {/* Service selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">📌 Canal de distribución</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTipoServicio('Comer en el Lugar')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                          tipoServicio === 'Comer en el Lugar'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24]'
                        }`}
                      >
                        🪑 En el Lugar
                      </button>
                      <button
                        onClick={() => { setTipoServicio('Para Llevar / Recoger'); setNumeroMesa(''); }}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                          tipoServicio === 'Para Llevar / Recoger'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24]'
                        }`}
                      >
                        📦 Para Llevar
                      </button>
                    </div>
                  </div>

                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[#FBF3E8] rounded-xl p-4 border border-[#E6DBC8] animate-fade-in shadow-neomorph-in">
                      <label className="block text-xs font-bold text-[#8A6F57] uppercase tracking-wider mb-2">
                        🪑 Selecciona Mesa
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
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">💳 Método de Pago</p>
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
                          {met === 'Pago QR Simple' ? '📱 QR Simple' : '💵 Efectivo'}
                        </button>
                      ))}
                    </div>
                  </div>

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
                  <p className="text-xs text-[#A64B4B] bg-[#A64B4B]/15 p-2.5 rounded-xl mb-3">⚠️ {error}</p>
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
                  {enviando ? 'Enviando orden...' : '📋 Confirmar Compra'}
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
