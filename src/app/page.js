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

  useEffect(() => {
    setMounted(true);
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
        if (!mesa) { setError('Mesa no encontrada.'); setEnviando(false); return; }
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
          <div className="flex gap-2 mb-2 justify-center h-10 w-20 relative">
            <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 bg-[#8A6F57] rounded-full animate-steam-wave-tall" style={{ animationDelay: '0.3s' }} />
            <div className="w-1 bg-[#8A6F57] rounded-full animate-steam-wave" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="relative w-24 h-20 bg-[#FFFFFF] border-4 border-[#3B2B24] rounded-b-3xl flex items-end overflow-hidden shadow-md">
            <div className="w-full bg-[#3B2B24] animate-fill-coffee" style={{ height: '75%' }} />
            <div className="absolute top-1 left-2 w-2 h-10 bg-white/40 rounded-full blur-[1px]" />
          </div>
          <div className="absolute right-[-14px] top-6 w-5 h-10 border-4 border-[#3B2B24] border-l-0 rounded-r-full" />
          <div className="w-32 h-3 bg-[#3B2B24] rounded-full mt-2 shadow-sm" />

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
        <div className="absolute top-4 left-4 text-6xl opacity-10 select-none">🌿</div>
        <div className="absolute bottom-4 right-4 text-7xl opacity-10 select-none">🌱</div>

        <div className="glass-card shadow-neomorph-out p-8 max-w-md w-full text-center animate-slide-up relative border-t-8 border-[#607C5B]">
          <div className="w-16 h-16 bg-[#607C5B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-[#607C5B]">✓</span>
          </div>
          
          <h2 className="text-2xl font-bold text-[#3B2B24] mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            ¡Pedido Enviado!
          </h2>
          <p className="text-sm text-[#6B564C] mb-6">Tu orden se está preparando en la barra de especialidad.</p>

          <div className="bg-[#F3EAD8] rounded-2xl p-5 mb-6 text-left border border-[#E6DBC8] shadow-neomorph-in">
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

          {pedidoExitoso.metodo_pago === 'Pago QR Simple' && (
            <div className="mb-6 p-4 bg-white rounded-2xl border border-[#E6DBC8] flex flex-col items-center shadow-sm">
              <p className="text-xs font-semibold text-[#8E7A6E] mb-3">Escanea el código QR para pagar su orden</p>
              
              <div className="w-44 h-44 bg-neutral-100 p-2 rounded-xl flex items-center justify-center border border-dashed border-[#8A6F57] relative">
                <svg className="w-40 h-40 text-[#3B2B24]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                </svg>
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
            <button onClick={() => setPedidoExitoso(null)} className="btn-primary w-full py-3 shadow-neomorph-hover">
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
      
      {/* Sunlight glow decoration */}
      <div className="absolute top-0 right-0 w-full lg:w-2/3 h-[600px] bg-gradient-to-bl from-white via-white/40 to-transparent opacity-60 pointer-events-none z-0 transform origin-top-right rotate-12 filter blur-3xl" />

      {/* Floating plant leaves (Organic decoration) */}
      <div className="absolute top-28 left-[8%] opacity-15 select-none animate-sway-slow pointer-events-none text-4xl">🌿</div>
      <div className="absolute top-[480px] right-[4%] opacity-20 select-none animate-sway-slow pointer-events-none text-3xl" style={{ animationDelay: '1.5s' }}>🌱</div>
      <div className="absolute bottom-40 left-[4%] opacity-10 select-none animate-sway-slow pointer-events-none text-5xl" style={{ animationDelay: '3.5s' }}>🍃</div>

      {/* 1. Header (La Cabecera - Standard Anatomical Structure, Z-Pattern Start) */}
      <header className="relative z-10 border-b border-[#E6DBC8] bg-white/70 backdrop-blur-md sticky top-0 px-4 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
        {/* Z-Pattern Element 1: Logo & Brand (Top-Left) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3B2B24] flex items-center justify-center text-lg font-bold text-[#FBF3E8] shadow-sm">
            CC
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Charcas Capital
            </h1>
            <p className="text-[9px] font-semibold text-[#8A6F57] uppercase tracking-wider">Café de Especialidad</p>
          </div>
        </div>
        
        {/* Z-Pattern Element 2: Navigation & Primary CTA (Top-Right) */}
        <nav className="flex items-center gap-2 sm:gap-3">
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
            className="btn-secondary text-xs flex items-center gap-1.5 relative border-[#E6DBC8] shadow-sm"
          >
            🛒 <span className="hidden xs:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#607C5B] text-white text-[10px] flex items-center justify-center font-bold absolute -top-2 -right-2 animate-bounce">
                {totalItems}
              </span>
            )}
          </button>

          <Link href="/login" className="btn-primary text-xs py-2 px-3.5 shadow-neomorph-hover">
            Ingresar
          </Link>
        </nav>
      </header>

      {/* 2. Zona Héroe (Hero Section - Z-Pattern Focal Flow & Clean Aesthetic) */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        
        <section className="w-full max-w-6xl px-6 pt-16 pb-12 text-center flex flex-col items-center z-10">
          <div className="inline-flex items-center gap-2 px-3 .shadow-neomorph-out py-1 rounded-full bg-[#607C5B]/10 border border-[#607C5B]/20 text-[#607C5B] text-xs font-medium mb-6">
            <span>🌿 Amplitud, Luz Natural & Calidez</span>
          </div>

          {/* Hero Headline (Eye lands diagonal center) */}
          <h2 className="text-4xl sm:text-6xl font-black text-[#3B2B24] leading-tight max-w-4xl tracking-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Un oasis de tranquilidad y <br className="hidden md:inline"/>
            <span className="text-[#8A6F57] italic font-serif font-normal">café de especialidad</span>
          </h2>

          <p className="text-[#6B564C] max-w-xl text-sm sm:text-base mt-6 leading-relaxed">
            Descubre nuestro menú digital diseñado con la pulcritud y sofisticación de las mejores cafeterías. Realiza tu pedido en línea de forma rápida, segura y disfruta en un entorno iluminado.
          </p>

          {/* Hero CTA Action (Z-Pattern final action point) */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <button 
              onClick={() => {
                const el = document.getElementById('catalogo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary py-3 px-8 text-xs uppercase tracking-wider font-bold shadow-neomorph-hover flex items-center justify-center gap-2"
            >
              🌱 Ordenar Menú Digital
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('espacio-bento');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary py-3 px-8 text-xs uppercase tracking-wider font-bold border-[#E6DBC8] flex items-center justify-center gap-2"
            >
              ☀️ Conocer el Espacio
            </button>
          </div>
        </section>

        {/* 3. El Cuerpo (Body/Content - Bento Grid & Soft Neomorphism Layout) */}
        
        {/* Bento Grid Section */}
        <section id="espacio-bento" className="w-full max-w-6xl px-6 py-12">
          <div className="mb-8 text-center sm:text-left">
            <span className="text-xs font-bold text-[#607C5B] uppercase tracking-widest block">Nuestra Identidad</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Concepto Charcas Capital
            </h3>
            <p className="text-xs text-[#8E7A6E] mt-1">Organización visual inspirada en la sencillez y el orden Bento</p>
          </div>

          {/* Bento Grid Container (CSS Grid 2D) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Box 1: Large Featured Coffee Card (Col-span 2 on medium+) */}
            <div className="bento-card md:col-span-2 flex flex-col justify-between bg-gradient-to-br from-white to-[#FBF3E8] min-h-[280px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8A6F57]/5 rounded-bl-full pointer-events-none" />
              <div>
                <span className="text-xs font-bold text-[#607C5B] bg-[#607C5B]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Plato Destacado de la Semana</span>
                <h4 className="text-2xl font-black text-[#3B2B24] mt-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                  Cappuccino Clásico de Altura
                </h4>
                <p className="text-xs text-[#6B564C] mt-2 max-w-md leading-relaxed">
                  Preparado con café molido arábica seleccionado de los valles chuquisaqueños, leche emulsionada a la temperatura perfecta y un toque sutil de cacao orgánico en polvo.
                </p>
              </div>
              <div className="flex items-end justify-between mt-6 border-t border-[#E6DBC8]/40 pt-4">
                <div>
                  <span className="text-[10px] text-[#8E7A6E] block font-bold uppercase">Precio Especial</span>
                  <span className="text-xl font-black text-[#3B2B24]">Bs. 18.00</span>
                </div>
                <button
                  onClick={() => {
                    const cappuccino = productos.find(p => p.nombre_producto.includes('Cappuccino'));
                    if (cappuccino) {
                      addToCart(cappuccino);
                      setShowCarrito(true);
                    } else {
                      const el = document.getElementById('catalogo');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="btn-primary py-2.5 px-5 text-xs shadow-neomorph-hover"
                >
                  + Agregar al Pedido
                </button>
              </div>
            </div>

            {/* Bento Box 2: Atmosphere & Plant Concept (1 Col vertical) */}
            <div className="bento-card bg-white flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#607C5B]/15 flex items-center justify-center text-xl text-[#607C5B] mb-4">
                  🌿
                </div>
                <h4 className="text-lg font-bold text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                  Luz & Vegetación
                </h4>
                <p className="text-xs text-[#6B564C] mt-2 leading-relaxed">
                  Espacios de arquitectura abierta y vegetación interior que garantizan frescura, tranquilidad y pulcritud para tus sentidos.
                </p>
              </div>
              <div className="text-xs text-[#8A6F57] font-semibold border-t border-[#E6DBC8]/40 pt-4 flex items-center gap-1">
                <span>Espacio Pet & Eco Friendly</span>
                <span className="animate-pulse">●</span>
              </div>
            </div>

            {/* Bento Box 3: Technical Metrics (Small card, 1 col) */}
            <div className="bento-card bg-white flex flex-col justify-between min-h-[160px]">
              <div>
                <span className="text-2xl">⚡</span>
                <h4 className="text-sm font-bold text-[#3B2B24] mt-2">Conexión Premium</h4>
                <p className="text-[11px] text-[#6B564C] mt-1">
                  Wifi simétrico de fibra óptica en todo el salón para teletrabajo y estudio cómodo.
                </p>
              </div>
              <span className="text-[10px] text-[#8E7A6E] font-bold uppercase tracking-wider block">Zona Cowork</span>
            </div>

            {/* Bento Box 4: Quality Bean Metric (Small card, 1 col) */}
            <div className="bento-card bg-[#3B2B24] text-white flex flex-col justify-between min-h-[160px]">
              <div>
                <span className="text-2xl">☕</span>
                <h4 className="text-sm font-bold text-[#FBF3E8] mt-2">100% Granos Arábica</h4>
                <p className="text-[11px] text-[#F3EAD8]/80 mt-1">
                  Granos cosechados de forma responsable y tostados artesanalmente.
                </p>
              </div>
              <span className="text-[10px] text-[#C2A388] font-bold uppercase tracking-wider block">Café de Altura</span>
            </div>

            {/* Bento Box 5: Happy Customers Metric (Small card, 1 col) */}
            <div className="bento-card bg-white flex flex-col justify-between min-h-[160px]">
              <div>
                <span className="text-2xl text-[#607C5B]">★</span>
                <h4 className="text-sm font-bold text-[#3B2B24] mt-2">Calificación 4.9</h4>
                <p className="text-[11px] text-[#6B564C] mt-1">
                  Reconocidos por la pulcritud de nuestro servicio y la sofisticación del sabor.
                </p>
              </div>
              <span className="text-[10px] text-[#8E7A6E] font-bold uppercase tracking-wider block">Opiniones Reales</span>
            </div>

          </div>
        </section>

        {/* E-commerce Storefront (Grid Layout & Responsive Catalog) */}
        <section id="catalogo" className="w-full max-w-6xl px-6 py-12 border-t border-[#E6DBC8]/60 z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-[#3B2B24]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Nuestra Selección de Especialidad
              </h3>
              <p className="text-xs text-[#8A6F57] font-medium mt-0.5">Explora el menú digital y realiza tu pedido al instante</p>
            </div>

            {/* Live Search Bar (Neomorphic Shadow Inset) */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                className="input-field pl-10 pr-4 py-2 border-[#E6DBC8] shadow-neomorph-in"
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

          {/* Category Scroller pills (Flexbox layout) */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 border-b border-[#E6DBC8]/40 scrollbar-none">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  categoriaActiva === cat
                    ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                    : 'bg-white border-[#E6DBC8] text-[#6B564C] hover:bg-[#F8F0E2]'
                }`}
              >
                {catEmojis[cat] || '🍽️'} {cat}
              </button>
            ))}
          </div>

          {/* Product Items Responsive CSS Grid Layout */}
          {productosFiltrados.length === 0 ? (
            <div className="bg-white/50 border border-[#E6DBC8] rounded-3xl p-12 text-center shadow-neomorph-out">
              <span className="text-4xl block mb-2 animate-bounce">🍃</span>
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
                    className="bento-card p-5 flex flex-col justify-between group bg-white"
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
                        Ingredientes selectos y preparación sofisticada. Café de especialidad.
                      </p>
                    </div>

                    {/* Product Footer */}
                    <div className="border-t border-[#FBF3E8] pt-4 flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-[10px] text-[#8E7A6E] block font-bold uppercase tracking-wider">Precio</span>
                        <span className="text-base font-extrabold text-[#3B2B24]">
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

      </main>

      {/* 4. Pie de Página (Footer - Standard Anatomical Section) */}
      <footer className="relative z-10 border-t border-[#E6DBC8] py-8 text-center bg-white px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs mb-4">
          <div className="text-left">
            <p className="font-bold text-[#3B2B24]">📍 Sucursal Central</p>
            <p className="text-[#8E7A6E] mt-0.5">Calle España esq. Junín, Chuquisaca, Bolivia</p>
          </div>
          <div className="text-right md:text-right text-center">
            <p className="font-bold text-[#3B2B24]">🕒 Horarios de Atención</p>
            <p className="text-[#8E7A6E] mt-0.5">Lunes a Sábado: 07:30 - 21:30</p>
          </div>
        </div>
        <div className="border-t border-[#E6DBC8]/40 pt-6">
          <p className="text-[10px] text-[#8E7A6E]">
            Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca
            <br />
            Materia IND210 — Ingeniería Económica © 2026. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Responsive Cart Drawer Panel (Mobile: 100% full screen / Desktop: Slide-out panel) */}
      {showCarrito && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowCarrito(false)} />
          {/* Responsive Drawer width container */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-md bg-white border-l border-[#E6DBC8] flex flex-col animate-slide-up shadow-2xl z-10">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E6DBC8] flex items-center justify-between bg-[#FBF3E8]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <h3 className="text-lg font-bold text-[#3B2B24]">Mi Orden</h3>
              </div>
              <button 
                onClick={() => setShowCarrito(false)} 
                className="w-8 h-8 rounded-full hover:bg-[#3B2B24]/10 flex items-center justify-center text-[#3B2B24] transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {carrito.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-6xl block mb-4 animate-bounce">☕</span>
                  <p className="text-sm font-semibold text-[#8E7A6E]">Tu carrito está vacío</p>
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
                        className={`p-3 rounded-2xl border text-left transition-all font-bold text-xs ${
                          tipoServicio === 'Comer en el Lugar'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24] hover:bg-[#F8F0E2]'
                        }`}
                      >
                        🪑 En el Lugar
                      </button>

                      <button
                        onClick={() => { setTipoServicio('Para Llevar / Recoger'); setError(''); }}
                        className={`p-3 rounded-2xl border text-left transition-all font-bold text-xs ${
                          tipoServicio === 'Para Llevar / Recoger'
                            ? 'bg-[#3B2B24] border-[#3B2B24] text-white shadow-sm'
                            : 'bg-white border-[#E6DBC8] text-[#3B2B24] hover:bg-[#F8F0E2]'
                        }`}
                      >
                        📦 Para Llevar
                      </button>
                    </div>
                  </div>

                  {/* Mesa Selection */}
                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[#FBF3E8] rounded-2xl p-4 border border-[#E6DBC8] animate-fade-in shadow-neomorph-in">
                      <label className="block text-xs font-bold text-[#8A6F57] uppercase tracking-wider mb-2">
                        🪑 Seleccione su Número de Mesa
                      </label>
                      <select
                        className="input-field text-center text-sm font-bold border-[#E6DBC8] bg-white cursor-pointer"
                        value={numeroMesa}
                        onChange={(e) => { setNumeroMesa(e.target.value); setError(''); }}
                      >
                        <option value="">-- Elige Mesa --</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n}>Mesa {n}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Payment Method selection */}
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

                  {/* Cart Items List */}
                  <div className="space-y-3 pt-4 border-t border-[#E6DBC8]/60">
                    <p className="text-xs font-bold text-[#8A6F57] uppercase tracking-wider">Productos en Carrito</p>
                    {carrito.map(item => (
                      <div key={item.id_producto} className="bg-[#FBF3E8]/60 border border-[#E6DBC8] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm">
                        <div className="flex justify-between items-start">
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
                          className="text-[10px] bg-white border border-[#E6DBC8] rounded-lg px-2.5 py-1.5 text-[#3B2B24] placeholder:text-[#8E7A6E]/60 focus:outline-[#8A6F57]"
                          placeholder="Observaciones de preparación..."
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

            {/* Drawer Sticky Footer */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-[#E6DBC8] bg-[#FBF3E8]">
                {error && (
                  <p className="text-xs font-semibold text-[#A64B4B] bg-[#A64B4B]/10 p-2.5 rounded-xl mb-3 border border-[#A64B4B]/20">
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
                  className="btn-primary w-full py-3.5 text-xs font-bold tracking-widest uppercase disabled:opacity-50 shadow-neomorph-hover"
                >
                  {enviando ? 'Procesando pedido...' : '📋 Confirmar & Pedir'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button for mobile checkout comfort */}
      {totalItems > 0 && !showCarrito && (
        <button
          onClick={() => setShowCarrito(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#3B2B24] hover:bg-[#8A6F57] text-white py-3.5 px-5 shadow-2xl flex items-center gap-3 rounded-2xl border border-white/20 transition-all scale-100 hover:scale-105 active:scale-95"
        >
          <span>🛒</span>
          <span className="font-bold text-xs">{totalItems} Cafés</span>
          <span className="opacity-40">|</span>
          <span className="font-bold text-xs text-[#C2A388]">Bs. {total.toFixed(2)}</span>
        </button>
      )}
    </div>
  );
}
