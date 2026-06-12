'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [showCarrito, setShowCarrito] = useState(false);
  const [tipoServicio, setTipoServicio] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [enviando, setEnviando] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Initial load
  useEffect(() => {
    setMounted(true);
    // Mimic loading splash screen for 1.8 seconds for premium feel
    const timer = setTimeout(() => {
      loadProductos();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  async function loadProductos() {
    try {
      const res = await fetch('/api/productos?disponible=true');
      if (res.ok) {
        const data = await res.json();
        setProductos(data.productos || []);
        setCategorias(data.por_categoria || {});
      } else {
        setError('No se pudieron cargar los productos.');
      }
    } catch (err) {
      setError('Error al comunicarse con la cafetería.');
    } finally {
      setLoading(false);
    }
  }

  // Categories helper
  const allCats = ['Todas', ...Object.keys(categorias)];

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

  // Filter products based on active category AND search query
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
    if (!tipoServicio) { setError('Seleccione el tipo de servicio.'); return; }
    if (tipoServicio === 'Comer en el Lugar' && !numeroMesa) { setError('Ingrese su número de mesa.'); return; }
    if (carrito.length === 0) { setError('El carrito está vacío.'); return; }

    setEnviando(true);
    setError('');
    try {
      let mesaId = null;
      if (tipoServicio === 'Comer en el Lugar') {
        const mesaRes = await fetch('/api/mesas/status');
        const mesaData = await mesaRes.json();
        const mesa = mesaData.mesas?.find(m => m.numero_mesa === parseInt(numeroMesa));
        if (!mesa) { setError('Mesa no encontrada en el sistema.'); setEnviando(false); return; }
        if (mesa.estado !== 'Disponible') { setError('La mesa elegida se encuentra ocupada o reservada.'); setEnviando(false); return; }
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

  if (!mounted) return null;

  // Custom Loading Splash Screen
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FBF3E8] text-[#3B2B24]">
        <div className="relative flex flex-col items-center">
          {/* Steam waves */}
          <div className="flex gap-2 mb-2 justify-center h-10 w-20 relative">
            <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 bg-[#8A6F57] rounded-full animate-steam-wave-tall" style={{ animationDelay: '0.3s' }} />
            <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Cup */}
          <div className="relative w-24 h-20 bg-[#FFFFFF] border-4 border-[#3B2B24] rounded-b-3xl flex items-end overflow-hidden shadow-md">
            <div className="w-full bg-[#3B2B24] animate-fill-coffee" style={{ height: '75%' }} />
            <div className="absolute top-1 left-2 w-2 h-10 bg-white/40 rounded-full blur-[1px]" />
          </div>
          <div className="absolute right-[-14px] top-6 w-5 h-10 border-4 border-[#3B2B24] border-l-0 rounded-r-full" />
          <div className="w-32 h-3 bg-[#3B2B24] rounded-full mt-2 shadow-sm" />

          {/* Leaves drifting */}
          <div className="absolute -top-12 -left-12 opacity-80 animate-bounce" style={{ animationDuration: '3s' }}>
            <span className="text-3xl">🌿</span>
          </div>
          <div className="absolute -bottom-8 -right-12 opacity-80 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
            <span className="text-2xl">🌱</span>
          </div>
        </div>

        <div className="mt-16 text-center animate-pulse">
          <h2 className="text-2xl font-bold tracking-widest text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            CHARCAS CAPITAL
          </h2>
          <p className="text-xs text-[#8A6F57] uppercase tracking-widest mt-2 font-semibold">
            CAFÉ DE ESPECIALIDAD & REPOSTERÍA
          </p>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[#6B564C]">
            <span>Moliendo granos selectos</span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 bg-[#8A6F57] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </span>
          </div>
        </div>

        <style jsx global>{`
          @keyframes steam-wave {
            0%, 100% { height: 10px; opacity: 0.3; transform: translateY(0); }
            50% { height: 25px; opacity: 0.8; transform: translateY(-8px); }
          }
          @keyframes steam-wave-tall {
            0%, 100% { height: 15px; opacity: 0.3; transform: translateY(0); }
            50% { height: 35px; opacity: 0.9; transform: translateY(-12px); }
          }
          @keyframes fill-coffee {
            0% { height: 0%; }
            100% { height: 75%; }
          }
          .animate-steam-wave { animation: steam-wave 2s infinite ease-in-out; }
          .animate-steam-wave-tall { animation: steam-wave-tall 2s infinite ease-in-out; }
          .animate-fill-coffee { animation: fill-coffee 2.5s infinite alternate ease-in-out; }
        `}</style>
      </div>
    );
  }

  // Success view with Receipt & Simulated QR
  if (pedidoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF3E8] p-4 text-[#3B2B24]">
        {/* Plant leaf background detail */}
        <div className="absolute top-4 left-4 text-6xl opacity-10 select-none">🌿</div>
        <div className="absolute bottom-4 right-4 text-7xl opacity-10 select-none">🌱</div>

        <div className="glass-card p-8 max-w-md w-full text-center animate-slide-up shadow-2xl relative border-t-8 border-[#607C5B]">
          <div className="w-16 h-16 bg-[#607C5B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-[#607C5B]">✓</span>
          </div>
          
          <h2 className="text-2xl font-bold text-[#3B2B24] mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            ¡Pedido Enviado!
          </h2>
          <p className="text-sm text-[#6B564C] mb-6">Tu orden se está preparando en la barra de especialidad.</p>

          <div className="bg-[#F3EAD8] rounded-2xl p-5 mb-6 text-left border border-[#E6DBC8]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[#8E7A6E] uppercase font-bold tracking-wider">Número de Pedido</span>
              <span className="text-xs font-bold px-2 py-1 rounded bg-[#607C5B]/20 text-[#607C5B]">
                {pedidoExitoso.tipo_servicio}
              </span>
            </div>
            <p className="text-4xl font-extrabold text-[#3B2B24] tracking-tight">#{pedidoExitoso.id_pedido}</p>
            
            <div className="border-t border-[#E6DBC8] my-3 pt-3 flex justify-between text-sm">
              <span className="text-[#6B564C]">Mesa:</span>
              <span className="font-bold">{pedidoExitoso.id_mesa ? `Mesa ${numeroMesa || pedidoExitoso.id_mesa}` : 'Para Llevar'}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-[#6B564C]">Total a Pagar:</span>
              <span className="font-bold text-[#3B2B24]">Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Section */}
          {pedidoExitoso.metodo_pago === 'Pago QR Simple' && (
            <div className="mb-6 p-4 bg-white rounded-2xl border border-[#E6DBC8] flex flex-col items-center">
              <p className="text-xs font-semibold text-[#8E7A6E] mb-3">Escanea el código QR para pagar su orden</p>
              
              {/* Simulated QR vector SVG */}
              <div className="w-44 h-44 bg-neutral-100 p-2 rounded-xl flex items-center justify-center border border-dashed border-[#8A6F57] relative">
                <svg className="w-40 h-40 text-[#3B2B24]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                </svg>
                {/* Brand dot in center of QR */}
                <div className="absolute w-8 h-8 bg-white border border-[#E6DBC8] rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-[#3B2B24]">CC</span>
                </div>
              </div>
              
              <span className="text-[10px] text-[#607C5B] bg-[#607C5B]/10 px-2 py-0.5 rounded-full font-bold mt-2 animate-pulse">
                Esperando confirmación bancaria
              </span>
            </div>
          )}

          <div className="space-y-2">
            <button onClick={() => setPedidoExitoso(null)} className="btn-primary w-full py-3">
              ☕ Realizar Nueva Compra
            </button>
            <Link href="/menu" className="btn-secondary w-full py-3 block text-center">
              🎴 Ver Carta Completa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#FBF3E8] text-[#3B2B24] selection:bg-[#8A6F57] selection:text-white">
      
      {/* Sunlight effect */}
      <div className="absolute top-0 right-0 w-full lg:w-2/3 h-[700px] bg-gradient-to-bl from-white via-white/50 to-transparent opacity-60 pointer-events-none z-0 transform origin-top-right rotate-12 filter blur-3xl" />

      {/* Floating Leaves */}
      <div className="absolute top-24 left-[10%] opacity-15 select-none animate-sway pointer-events-none text-4xl">🌿</div>
      <div className="absolute top-96 right-[5%] opacity-20 select-none animate-sway pointer-events-none text-3xl" style={{ animationDelay: '1.5s' }}>🌱</div>
      <div className="absolute bottom-32 left-[5%] opacity-10 select-none animate-sway pointer-events-none text-5xl" style={{ animationDelay: '3s' }}>🍃</div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#E6DBC8] bg-white/70 backdrop-blur-md sticky top-0 px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B2B24] flex items-center justify-center text-lg font-bold text-[#FBF3E8] shadow-sm">
            CC
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Charcas Capital
            </h1>
            <p className="text-[10px] font-semibold text-[#8A6F57] uppercase tracking-wider">Café de Especialidad</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-3">
          <button 
            onClick={() => {
              const el = document.getElementById('catalogo');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-xs font-semibold text-[#3B2B24] hover:text-[#8A6F57] transition-colors cursor-pointer hidden sm:inline-block"
          >
            Nuestros Cafés
          </button>
          
          <button
            onClick={() => setShowCarrito(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 relative border-[#E6DBC8]"
          >
            🛒 Carrito
            {totalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#607C5B] text-white text-[10px] flex items-center justify-center font-bold absolute -top-2 -right-2 animate-bounce">
                {totalItems}
              </span>
            )}
          </button>

          <Link href="/login" className="btn-primary text-xs py-2 px-4">
            Ingresar
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full max-w-6xl px-6 pt-16 pb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#607C5B]/10 border border-[#607C5B]/20 text-[#607C5B] text-xs font-medium mb-6">
            <span>🌿 Amplitud, Luz Natural & Calidez</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-[#3B2B24] leading-tight max-w-4xl tracking-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Un oasis de tranquilidad y <br className="hidden md:inline"/>
            <span className="text-[#8A6F57] italic font-serif font-normal">café de especialidad</span>
          </h2>

          <p className="text-[#6B564C] max-w-2xl text-base sm:text-lg mt-6 leading-relaxed">
            Descubre nuestro menú digital diseñado con la pulcritud y sofisticación de las mejores cafeterías. Realiza tu pedido en línea de forma rápida, segura y disfruta en un entorno iluminado.
          </p>

          {/* Quick Stats / Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full max-w-4xl">
            {[
              { label: 'Granos Orgánicos', value: '100%', icon: '☕' },
              { label: 'Luz Natural', value: 'Espacioso', icon: '☀️' },
              { label: 'Plantas de Interior', value: 'Natural', icon: '🌿' },
              { label: 'Pedidos Directos', value: 'Digital', icon: '📱' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/80 border border-[#E6DBC8] p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-2xl mb-1">{stat.icon}</span>
                <span className="text-sm font-bold text-[#3B2B24]">{stat.value}</span>
                <span className="text-xs text-[#8E7A6E] mt-0.5 text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* E-commerce Storefront & Catalog Section */}
        <section id="catalogo" className="w-full max-w-6xl px-6 py-12 border-t border-[#E6DBC8]/60">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Nuestra Selección
              </h3>
              <p className="text-xs text-[#8A6F57] font-medium mt-0.5">Explora y ordena en línea de forma interactiva</p>
            </div>

            {/* Live Search Bar */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                className="input-field pl-10 pr-4 py-2 border-[#E6DBC8]"
                placeholder="Buscar tu café o postre favorito..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3.5 top-3.5 text-xs text-[#8E7A6E]">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-xs text-[#A64B4B] font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 border-b border-[#E6DBC8]/40">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  categoriaActiva === cat
                    ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-md'
                    : 'bg-white border-[#E6DBC8] text-[#6B564C] hover:bg-[#F8F0E2]'
                }`}
              >
                {catEmojis[cat] || '🍽️'} {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {productosFiltrados.length === 0 ? (
            <div className="bg-white/50 border border-[#E6DBC8] rounded-3xl p-12 text-center">
              <span className="text-4xl block mb-2">🍃</span>
              <p className="text-sm font-semibold text-[#8E7A6E]">No encontramos productos que coincidan con la búsqueda.</p>
              <button onClick={() => { setSearchQuery(''); setCategoriaActiva('Todas'); }} className="text-xs font-bold text-[#607C5B] mt-2 underline">
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productosFiltrados.map((prod, i) => {
                const inCart = carrito.find(c => c.id_producto === prod.id_producto);
                return (
                  <div
                    key={prod.id_producto}
                    className="bg-white border border-[#E6DBC8]/80 hover:border-[#8A6F57] rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg group"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div>
                      {/* Product Header */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-3xl p-2 bg-[#FBF3E8] rounded-2xl group-hover:scale-110 transition-transform">
                          {catEmojis[prod.categoria] || '☕'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catColors[prod.categoria] || 'bg-stone-100 text-stone-800'}`}>
                          {prod.categoria}
                        </span>
                      </div>
                      
                      {/* Product Body */}
                      <h4 className="font-bold text-base text-[#3B2B24] mb-1 group-hover:text-[#8A6F57] transition-colors">
                        {prod.nombre_producto}
                      </h4>
                      <p className="text-xs text-[#8E7A6E] line-clamp-2 leading-relaxed mb-4">
                        Preparado fresco con ingredientes seleccionados. Café de especialidad en taza.
                      </p>
                    </div>

                    {/* Product Footer */}
                    <div className="border-t border-[#FBF3E8] pt-4 flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-[10px] text-[#8E7A6E] block font-bold uppercase tracking-wider">Precio</span>
                        <span className="text-lg font-extrabold text-[#3B2B24]">
                          Bs. {parseFloat(prod.precio_venta).toFixed(2)}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-1 bg-[#FBF3E8] rounded-xl p-1 border border-[#E6DBC8]">
                          <button
                            onClick={() => updateQty(prod.id_producto, -1)}
                            className="w-7 h-7 rounded-lg bg-white text-xs font-bold text-[#A64B4B] hover:bg-neutral-100 flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs w-6 text-center text-[#3B2B24]">{inCart.qty}</span>
                          <button
                            onClick={() => updateQty(prod.id_producto, 1)}
                            className="w-7 h-7 rounded-lg bg-white text-xs font-bold text-[#607C5B] hover:bg-neutral-100 flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="bg-[#3B2B24] hover:bg-[#8A6F57] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm"
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
        </section>

        {/* Cafe Atmosphere Presentation */}
        <section className="w-full bg-white py-16 px-6 border-y border-[#E6DBC8]/60 flex flex-col items-center">
          <div className="max-w-4xl flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-4">
              <span className="text-xs font-bold text-[#607C5B] uppercase tracking-widest block">Espacio Físico</span>
              <h3 className="text-3xl font-bold text-[#3B2B24] leading-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Luz natural, aire fresco y plantas ornamentales
              </h3>
              <p className="text-sm text-[#6B564C] leading-relaxed">
                Nuestra cafetería física está diseñada con techos altos y amplios ventanales para permitir que la luz natural ilumine cada rincón. Las plantas aromáticas y ornamentales purifican el aire, brindándote un espacio de desconexión y sofisticación idóneo para disfrutar tu café de especialidad.
              </p>
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#607C5B] text-lg">✔</span>
                  <span className="text-xs font-semibold text-[#3B2B24]">Wifi de alta velocidad</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#607C5B] text-lg">✔</span>
                  <span className="text-xs font-semibold text-[#3B2B24]">Ambiente Pet Friendly</span>
                </div>
              </div>
            </div>

            {/* Creative plants/atmosphere placeholder SVG */}
            <div className="w-full md:w-80 h-64 bg-[#FBF3E8] border border-[#E6DBC8] rounded-3xl overflow-hidden relative flex items-center justify-center p-6 shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="text-center relative z-10 space-y-3">
                <span className="text-6xl block animate-pulse">🌿</span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#8A6F57] block">Charcas Capital</span>
                <p className="text-[10px] text-[#6B564C] max-w-[200px] mx-auto leading-relaxed">
                  Un lugar acogedor donde la luz del sol y el aroma a café de altura se encuentran.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Cart Sidebar Drawer */}
      {showCarrito && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowCarrito(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-[#E6DBC8] flex flex-col animate-slide-up shadow-2xl">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E6DBC8] flex items-center justify-between bg-[#FBF3E8]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <h3 className="text-lg font-bold text-[#3B2B24]">Mi Orden</h3>
              </div>
              <button 
                onClick={() => setShowCarrito(false)} 
                className="w-8 h-8 rounded-full hover:bg-[#3B2B24]/10 flex items-center justify-center text-[#3B2B24] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-6xl block mb-4 animate-bounce">☕</span>
                  <p className="text-sm font-semibold text-[#8E7A6E]">Tu carrito está listo para ser llenado</p>
                  <p className="text-xs text-[#8E7A6E] mt-1">Explora nuestros productos y agrega tus favoritos.</p>
                </div>
              ) : (
                <>
                  {/* Service Selection */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">📌 Canal de entrega</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setTipoServicio('Comer en el Lugar'); setError(''); }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          tipoServicio === 'Comer en el Lugar'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24] hover:bg-[#F8F0E2]'
                        }`}
                      >
                        <span className="text-lg">🪑</span>
                        <p className="font-bold text-xs mt-1">Comer en el Lugar</p>
                      </button>

                      <button
                        onClick={() => { setTipoServicio('Para Llevar / Recoger'); setError(''); }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          tipoServicio === 'Para Llevar / Recoger'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24] hover:bg-[#F8F0E2]'
                        }`}
                      >
                        <span className="text-lg">📦</span>
                        <p className="font-bold text-xs mt-1">Para Llevar / Recoger</p>
                      </button>
                    </div>
                  </div>

                  {/* Mesa Number for Dine-in */}
                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[#FBF3E8] rounded-2xl p-4 border border-[#E6DBC8] animate-fade-in">
                      <label className="block text-xs font-bold text-[#8A6F57] uppercase tracking-wider mb-2">
                        🪑 Número de Mesa
                      </label>
                      <select
                        className="input-field text-center text-sm font-bold border-[#E6DBC8]"
                        value={numeroMesa}
                        onChange={(e) => { setNumeroMesa(e.target.value); setError(''); }}
                      >
                        <option value="">-- Selecciona Mesa --</option>
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
                              ? 'bg-[#607C5B] border-[#607C5B] text-white'
                              : 'bg-white border-[#E6DBC8] text-[#6B564C] hover:bg-[#F8F0E2]'
                          }`}
                        >
                          {met === 'Pago QR Simple' ? '📱 QR Simple' : '💵 Efectivo'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cart List */}
                  <div className="space-y-3 pt-4 border-t border-[#E6DBC8]/60">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">🛒 Productos en Carrito</p>
                    {carrito.map(item => (
                      <div key={item.id_producto} className="bg-[#FBF3E8]/50 border border-[#E6DBC8] rounded-2xl p-4 flex flex-col justify-between gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-xs text-[#3B2B24]">{item.nombre_producto}</p>
                            <p className="text-[10px] text-[#8E7A6E]">Bs. {parseFloat(item.precio_venta).toFixed(2)} c/u</p>
                          </div>
                          <p className="text-xs font-extrabold text-[#3B2B24]">
                            Bs. {(parseFloat(item.precio_venta) * item.qty).toFixed(2)}
                          </p>
                        </div>
                        
                        {/* Notes field */}
                        <input
                          type="text"
                          className="text-[10px] bg-white border border-[#E6DBC8] rounded-lg px-2.5 py-1 text-[#3B2B24] placeholder:text-[#8E7A6E]/60 focus:outline-[#8A6F57]"
                          placeholder="Observaciones (ej: sin azúcar, leche deslactosada)..."
                          value={item.observaciones || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCarrito(prev => prev.map(i => i.id_producto === item.id_producto ? { ...i, observaciones: val } : i));
                          }}
                        />

                        <div className="flex items-center justify-between border-t border-[#E6DBC8]/40 pt-2">
                          <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[#E6DBC8]">
                            <button onClick={() => updateQty(item.id_producto, -1)} className="w-6 h-6 rounded bg-neutral-50 text-xs font-bold text-[#A64B4B] flex items-center justify-center">-</button>
                            <span className="font-bold text-xs w-5 text-center text-[#3B2B24]">{item.qty}</span>
                            <button onClick={() => updateQty(item.id_producto, 1)} className="w-6 h-6 rounded bg-neutral-50 text-xs font-bold text-[#607C5B] flex items-center justify-center">+</button>
                          </div>
                          
                          <button 
                            onClick={() => setCarrito(prev => prev.filter(i => i.id_producto !== item.id_producto))} 
                            className="text-[10px] font-bold text-[#A64B4B] hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-[#E6DBC8] bg-[#FBF3E8]">
                {error && (
                  <p className="text-xs font-semibold text-[#A64B4B] bg-[#A64B4B]/10 p-2.5 rounded-xl mb-3 flex items-center gap-1.5 border border-[#A64B4B]/20">
                    ⚠️ {error}
                  </p>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-[#8E7A6E] font-medium block">Monto Total</span>
                    <span className="text-2xl font-black text-[#3B2B24]">Bs. {total.toFixed(2)}</span>
                  </div>
                  <span className="text-xs bg-[#607C5B]/15 text-[#607C5B] border border-[#607C5B]/30 px-3 py-1.5 rounded-xl font-bold">
                    {totalItems} Ítems
                  </span>
                </div>

                <button
                  onClick={enviarPedido}
                  disabled={enviando || !tipoServicio || (tipoServicio === 'Comer en el Lugar' && !numeroMesa)}
                  className="btn-primary w-full py-3.5 text-xs font-bold tracking-widest uppercase disabled:opacity-50"
                >
                  {enviando ? 'Procesando pedido...' : '📋 Confirmar & Pedir'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating cart bar for customer convenience */}
      {totalItems > 0 && !showCarrito && (
        <button
          onClick={() => setShowCarrito(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#3B2B24] hover:bg-[#8A6F57] text-white py-4 px-6 shadow-2xl flex items-center gap-3 rounded-2xl border border-white/20 transition-all scale-100 hover:scale-105 active:scale-95"
        >
          <span>🛒</span>
          <span className="font-bold text-xs">{totalItems} Cafés/Productos</span>
          <span className="opacity-40">|</span>
          <span className="font-bold text-xs text-[#C2A388]">Bs. {total.toFixed(2)}</span>
        </button>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E6DBC8] py-8 text-center bg-white px-6 mt-16">
        <p className="text-xs font-bold text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          ☕ Cafetería Charcas Capital
        </p>
        <p className="text-[10px] text-[#8E7A6E] mt-1 leading-relaxed">
          Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca
          <br />
          Materia IND210 — Ingeniería Económica © 2026. Todos los derechos reservados.
        </p>
      </footer>

      {/* Style Animations for Sway/Leaf effects */}
      <style jsx>{`
        @keyframes sway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(8deg); }
        }
        .animate-sway {
          animation: sway 6s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
