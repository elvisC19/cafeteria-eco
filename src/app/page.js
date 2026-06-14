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
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [nitFactura, setNitFactura] = useState('');
  const [razonSocialFactura, setRazonSocialFactura] = useState('');
  const [horaRecojo, setHoraRecojo] = useState('');

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

  function handleOrderFeatured(nombreClave) {
    const prod = productos.find(p => p.nombre_producto.toLowerCase().includes(nombreClave.toLowerCase()));
    if (prod) {
      addToCart(prod);
      setShowCarrito(true);
    } else {
      const el = document.getElementById('catalogo');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function updateQty(id, delta) {
    setCarrito(prev => prev.map(i => i.id_producto === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  }

  async function enviarPedido() {
    if (!tipoServicio) { setError('Seleccione el tipo de servicio.'); return; }
    if (tipoServicio === 'Comer en el Lugar' && !numeroMesa) { setError('Ingrese su número de mesa.'); return; }
    if (carrito.length === 0) { setError('El carrito está vacío.'); return; }
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

  if (!mounted) return null;

  // Custom Loading Splash Screen
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-card)] text-[var(--color-text-primary)] select-none">
        <div className="relative flex flex-col items-center">
          <div className="flex gap-2 mb-2 justify-center h-10 w-20 relative">
            <div className="w-1 bg-[var(--color-text-muted)] rounded-full animate-steam-wave" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 bg-[var(--color-text-muted)] rounded-full animate-steam-wave-tall" style={{ animationDelay: '0.3s' }} />
            <div className="w-1 bg-[var(--color-text-muted)] rounded-full animate-steam-wave" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="relative w-24 h-20 bg-white border-4 border-[var(--color-text-primary)] rounded-b-3xl flex items-end overflow-hidden shadow-md">
            <div className="w-full bg-[var(--color-text-primary)] animate-fill-coffee" style={{ height: '75%' }} />
            <div className="absolute top-1 left-2 w-2 h-10 bg-white/40 rounded-full blur-[1px]" />
          </div>
          <div className="absolute right-[-14px] top-6 w-5 h-10 border-4 border-[var(--color-text-primary)] border-l-0 rounded-r-full" />
          <div className="w-32 h-3 bg-[var(--color-text-primary)] rounded-full mt-2 shadow-sm" />
        </div>

        <div className="mt-16 text-center animate-pulse">
          <h2 className="text-2xl font-bold tracking-widest text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-serif)' }}>
            CHARCAS CAPITAL
          </h2>
          <p className="text-xs text-[var(--color-cta)] uppercase tracking-widest mt-2 font-semibold">
            CAFÉ DE ESPECIALIDAD & REPOSTERÍA
          </p>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
            <span>Moliendo granos selectos</span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-[var(--color-cta)] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 bg-[var(--color-cta)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 bg-[var(--color-cta)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
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

  const renderCategoryIcon = (category) => {
    if (category === 'Bebidas Calientes' || category === 'Bebidas Frías') {
      return (
        <svg className="w-5 h-5 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M3 8h14v7a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v2M10 3v2M14 3v2" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm-3 5a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 019 7zm6 2a1 1 0 11-1 1 1 1 0 011-1zm-4 4a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 0111 13zm4 2a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 0115 15z" />
      </svg>
    );
  };

  // Success view with Receipt & Simulated QR
  if (pedidoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-card)] p-4 text-[var(--color-text-primary)] selection:bg-[var(--color-cta)] selection:text-white select-none">
        <div className="bg-white border border-[var(--color-border-warm)] rounded-xl p-8 max-w-md w-full text-center animate-slide-up relative border-t-8 border-[var(--color-gold)] shadow-lg">
          <div className="w-16 h-16 bg-[rgba(184,134,11,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-[var(--color-gold)] font-bold">⏱</span>
          </div>
          
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            ¡Pedido Registrado!
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-6 font-medium">Tu orden ha sido enviada a caja y está en espera de validación por el cajero.</p>

          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] rounded-xl p-5 mb-6 text-left shadow-sm space-y-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider">Estado de Validación</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)] animate-pulse">
                Espera Validación
              </span>
            </div>
            
            <p className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">#{pedidoExitoso.id_pedido}</p>
            
            <div className="border-t border-[var(--color-border-warm)]/60 my-2 pt-2 flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">Cliente:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{pedidoExitoso.cliente_nombre}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">Teléfono:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{pedidoExitoso.cliente_telefono}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">Razón Social:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{pedidoExitoso.razon_social_factura}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">NIT/CI:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{pedidoExitoso.nit_factura}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">Canal:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{pedidoExitoso.tipo_servicio}</span>
            </div>

            {pedidoExitoso.id_mesa && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-secondary)] font-medium">Mesa:</span>
                <span className="font-bold text-[var(--color-text-primary)]">Mesa {numeroMesa || pedidoExitoso.id_mesa}</span>
              </div>
            )}

            {pedidoExitoso.hora_recojo && (
              <div className="flex justify-between text-xs text-[var(--color-cta)] font-semibold">
                <span>Hora Recojo Aprox:</span>
                <span>{pedidoExitoso.hora_recojo}</span>
              </div>
            )}
            
            <div className="border-t border-[var(--color-border-warm)]/60 pt-2 flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)] font-bold">Total a Pagar:</span>
              <span className="font-bold text-[var(--color-gold)]">Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}</span>
            </div>
          </div>

          {pedidoExitoso.metodo_pago === 'Pago QR Simple' ? (
            <div className="mb-6 p-4 bg-white rounded-xl border border-[var(--color-border-warm)] flex flex-col items-center shadow-sm">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] mb-3">Escanea el código QR y realiza tu transferencia</p>
              
              <div className="w-40 h-40 bg-neutral-100 p-2 rounded-xl flex items-center justify-center border border-dashed border-[var(--color-border-warm)] relative">
                <svg className="w-36 h-36 text-[var(--color-text-primary)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm10 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm4 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm-2 0h2v2h-2v-2zm-4-4h2v2h-2V7zm2 2h2v2h-2V9zm-4 2h2v2H9v-2zm6-6h2v2h-2V5zm-2 2h2v2h-2V7zm-2 2h2v2H9V9zm4 4h2v2h-2v-2zm-6 2h2v2H7v-2zm2 2h2v2H9v-2zm2-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                </svg>
                <div className="absolute w-8 h-8 bg-white border border-[var(--color-border-warm)] rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">CC</span>
                </div>
              </div>
              
              <span className="text-[10px] text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2.5 py-1 rounded-full font-bold mt-3 animate-pulse">
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

          <p className="text-[11px] text-[var(--color-text-muted)] mb-6">
            Una vez aprobado, el cajero registrará la factura fiscal SIN y te la enviará por WhatsApp al teléfono **{pedidoExitoso.cliente_telefono}**.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-sans selection:bg-[var(--color-cta)] selection:text-white">
      
      {/* 3.1 Barra Informativa Superior (NUEVA) */}
      <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] text-[12px] h-[40px] px-4 sm:px-8 lg:px-12 flex items-center justify-between border-b border-[var(--color-border-dark)] z-20 font-medium select-none">
        <div className="flex items-center gap-1.5">
          <span>Café de Especialidad — Sucre, Bolivia</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">Telf: +591 64-51234</span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span className="flex items-center gap-1">Horario: Lun–Sáb 07:30 a 21:30</span>
        </div>
      </div>

      {/* 3.2 Navbar Principal */}
      <header className="z-30 border-b border-[var(--color-border-warm)] bg-[var(--color-bg-white)] sticky top-0 px-4 sm:px-8 lg:px-12 py-3.5 flex items-center justify-between shadow-sm">
        {/* Logo izquierda */}
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M3 8h14v7a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v2M10 3v2M14 3v2" />
          </svg>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-serif)' }}>
              CHARCAS CAPITAL
            </h1>
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">CAFÉ DE ESPECIALIDAD</p>
          </div>
        </div>
        
        {/* Links de navegación y acciones */}
        <nav className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => {
                const el = document.getElementById('catalogo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-cta)] transition-colors cursor-pointer"
            >
              Menú Digital
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('destacados');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-cta)] transition-colors cursor-pointer"
            >
              Destacados
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Ícono carrito */}
            <button
              onClick={() => setShowCarrito(true)}
              className="text-[var(--color-text-primary)] hover:text-[var(--color-cta)] transition-colors relative cursor-pointer"
              title="Ver Carrito"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="w-5 h-5 rounded-full bg-[var(--color-cta)] text-white text-[10px] flex items-center justify-center font-bold absolute -top-2 -right-2 animate-bounce">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Botón Ingresar */}
            <Link href="/login" className="btn-primary">
              Ingresar
            </Link>
          </div>
        </nav>
      </header>

      {/* 3.3 Hero — Fotografía de Fondo a Pantalla Completa */}
      <section className="relative w-full min-h-[88vh] flex items-center justify-start bg-[var(--color-bg-dark)] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero_coffee_bg.png" 
            alt="Charcas Capital Cafetería" 
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Fallback to dark gradient if image fails
              e.target.style.display = 'none';
              e.target.parentNode.style.background = 'linear-gradient(135deg, #1A0A05 0%, #3B1000 100%)';
            }}
          />
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-[var(--color-bg-overlay)] z-10" />

        {/* Content */}
        <div className="relative z-20 w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20 flex flex-col items-start text-left">
          <span className="text-[13px] font-semibold uppercase tracking-[0.15em] text-white/70 mb-4 block">
            Sucre, Bolivia
          </span>

          <h2 className="text-4xl sm:text-6xl font-black text-[var(--color-text-on-dark)] leading-tight max-w-3xl tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Un Oasis de Tranquilidad y <br/>
            Café de Especialidad
          </h2>

          <p className="text-white/80 max-w-xl text-base sm:text-lg mt-6 leading-relaxed">
            Descubre nuestro menú digital diseñado con la pulcritud y sofisticación de las mejores cafeterías. Realiza tu pedido en línea de forma rápida, segura y disfruta de nuestro espacio.
          </p>

          <div className="mt-10 flex flex-row gap-4 w-full max-w-md">
            <button 
              onClick={() => {
                const el = document.getElementById('catalogo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary py-3.5 px-7 text-xs uppercase tracking-wider font-bold cursor-pointer"
            >
              Ordenar Ahora
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('destacados');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary py-3.5 px-7 text-xs uppercase tracking-wider font-bold !border-white/50 !text-white hover:!bg-white hover:!text-black hover:!border-white cursor-pointer"
            >
              Conocer el Espacio
            </button>
          </div>
        </div>
      </section>

      {/* 3.4 Sección de Destacados (Debajo del Hero) */}
      <section id="destacados" className="w-full bg-[var(--color-bg-card)] py-16 border-b border-[var(--color-border-warm)]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Columna 1: Cappuccino */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm md:border-r md:border-[var(--color-border-warm)] md:rounded-none md:bg-transparent md:shadow-none">
              <div className="mb-4">
                <svg className="w-12 h-12 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v2a2 2 0 01-2 2h-2M3 8h14v7a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v2M10 3v2M14 3v2" />
                </svg>
              </div>
              <h4 className="font-bold text-[15px] uppercase tracking-[0.08em] text-[var(--color-text-primary)] mb-2">
                Cappuccino Clásico
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs leading-relaxed">
                Delicioso café espresso con leche emulsionada y una fina capa de espuma de cacao.
              </p>
              <button 
                onClick={() => handleOrderFeatured('Cappuccino')}
                className="mt-auto bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-bold text-[12px] uppercase py-2.5 px-5 rounded-[4px] transition-colors cursor-pointer"
              >
                ORDENAR AHORA
              </button>
            </div>

            {/* Columna 2: Café Negro */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm md:border-r md:border-[var(--color-border-warm)] md:rounded-none md:bg-transparent md:shadow-none">
              <div className="mb-4">
                <svg className="w-12 h-12 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0c-2 2-3 5-1 9s5 3 7 1" />
                </svg>
              </div>
              <h4 className="font-bold text-[15px] uppercase tracking-[0.08em] text-[var(--color-text-primary)] mb-2">
                Café Negro
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs leading-relaxed">
                Extracción pura de granos selectos tostados artesanalmente con notas cítricas y dulces.
              </p>
              <button 
                onClick={() => handleOrderFeatured('Negro')}
                className="mt-auto bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-bold text-[12px] uppercase py-2.5 px-5 rounded-[4px] transition-colors cursor-pointer"
              >
                ORDENAR AHORA
              </button>
            </div>

            {/* Columna 3: Cookies */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm md:rounded-none md:bg-transparent md:shadow-none">
              <div className="mb-4">
                <svg className="w-12 h-12 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm-3 5a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 019 7zm6 2a1 1 0 11-1 1 1 1 0 011-1zm-4 4a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 0111 13zm4 2a1.5 1.5 0 11-1.5 1.5A1.5 1.5 0 0115 15z" />
                </svg>
              </div>
              <h4 className="font-bold text-[15px] uppercase tracking-[0.08em] text-[var(--color-text-primary)] mb-2">
                Repostería Fina
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs leading-relaxed">
                Horneada diariamente con chocolate belga semi-amargo y un toque de sal marina.
              </p>
              <button 
                onClick={() => handleOrderFeatured('Galleta')}
                className="mt-auto bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-bold text-[12px] uppercase py-2.5 px-5 rounded-[4px] transition-colors cursor-pointer"
              >
                ORDENAR AHORA
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 3.5 Sección Menú Digital */}
      <section id="catalogo" className="w-full bg-[var(--color-bg-white)] py-20 z-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-[11px] font-bold text-[var(--color-cta)] uppercase tracking-[0.12em] block">
                NUESTRA SELECCIÓN DE ESPECIALIDAD
              </span>
              <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-primary)] mt-1.5" style={{ fontFamily: 'var(--font-serif)' }}>
                Carta Digital
              </h3>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                className="input-field !pl-10 !pr-10 !py-3 bg-[var(--color-bg-card)] border-[var(--color-border-warm)] rounded-lg focus:border-[var(--color-cta)] focus:bg-[var(--color-bg-white)]"
                placeholder="Buscar tu café o postre favorito..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3.5 top-3.5 text-[var(--color-text-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-xs text-[var(--color-danger)] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Categorías (Tabs de Categoría) */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-10 border-b border-[var(--color-border-warm)]/60 scrollbar-none">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex-shrink-0 px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  categoriaActiva === cat
                    ? 'bg-[var(--color-cta)] text-white rounded-[4px] shadow-sm'
                    : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tarjetas de Producto */}
          {productosFiltrados.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] rounded-xl p-12 text-center">
              <span className="text-4xl block mb-2">
                <svg className="w-12 h-12 text-[var(--color-text-muted)] mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-[var(--color-text-muted)] mt-4">No encontramos productos que coincidan con la búsqueda.</p>
              <button onClick={() => { setSearchQuery(''); setCategoriaActiva('Todas'); }} className="text-xs font-bold text-[var(--color-cta)] mt-3 underline cursor-pointer">
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productosFiltrados.map((prod) => {
                const inCart = carrito.find(c => c.id_producto === prod.id_producto);
                return (
                  <div
                    key={prod.id_producto}
                    className="bg-white border border-[var(--color-border-warm)] rounded-xl p-0 flex flex-col justify-between group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="w-full h-40 bg-[var(--color-bg-card)] relative overflow-hidden flex items-center justify-center border-b border-[var(--color-border-warm)]/40">
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
                          <span className="p-3 bg-white/90 rounded-xl shadow-sm border border-[var(--color-border-warm)]/30">
                            {renderCategoryIcon(prod.categoria)}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        {/* Product Category Badge */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--color-border-warm)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]">
                            {prod.categoria}
                          </span>
                        </div>
                        
                        {/* Product Name */}
                        <h4 className="font-bold text-sm text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--color-cta)] transition-colors">
                          {prod.nombre_producto}
                        </h4>
                        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                          Ingredientes selectos y preparación sofisticada. Café de especialidad premium de Charcas Capital.
                        </p>
                      </div>
                    </div>

                    {/* Product Footer */}
                    <div className="border-t border-[var(--color-border-warm)]/40 pt-4 flex flex-col gap-3 mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-text-muted)] block font-bold uppercase tracking-wider">Precio</span>
                        <span className="text-lg font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-serif)' }}>
                          Bs. {parseFloat(prod.precio_venta).toFixed(2)}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border-warm)]">
                          <button
                            onClick={() => updateQty(prod.id_producto, -1)}
                            className="w-7 h-7 rounded-md bg-white text-xs font-bold text-[var(--color-cta)] hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs text-[var(--color-text-primary)]">{inCart.qty}</span>
                          <button
                            onClick={() => updateQty(prod.id_producto, 1)}
                            className="w-7 h-7 rounded-md bg-white text-xs font-bold text-[var(--color-success)] hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white text-xs font-bold py-2.5 rounded-md transition-colors cursor-pointer w-full"
                        >
                          + Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3.6 Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border-dark)] py-12 bg-[var(--color-bg-dark)] px-6 sm:px-8 lg:px-12 text-[var(--color-text-on-dark)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 text-xs mb-8">
          <div className="text-left max-w-sm">
            <h4 className="text-base font-bold text-[var(--color-text-on-dark)] tracking-wider mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              CHARCAS CAPITAL
            </h4>
            <p className="text-white/55 leading-relaxed">
              Café de especialidad en Sucre, ofreciendo un entorno premium de tranquilidad, luz natural y alta calidad en cada grano de café.
            </p>
          </div>
          <div className="text-left">
            <p className="font-bold text-[var(--color-text-on-dark)] mb-2">Sucursal Central</p>
            <p className="text-white/55">Calle España esq. Junín, Sucre, Bolivia</p>
          </div>
          <div className="text-left">
            <p className="font-bold text-[var(--color-text-on-dark)] mb-2">Horarios de Atención</p>
            <p className="text-white/55">Lunes a Sábado: 07:30 - 21:30</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-[var(--color-border-dark)] pt-8 text-center text-white/35">
          <p className="text-[12px] leading-relaxed">
            Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca
            <br />
            Materia IND210 — Ingeniería Económica © 2026. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Cart Drawer Panel */}
      {showCarrito && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowCarrito(false)} />
          <div className="relative w-full sm:max-w-md bg-white border-l border-[var(--color-border-warm)] flex flex-col animate-slide-up shadow-2xl h-full z-10">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[var(--color-border-warm)] flex items-center justify-between bg-[var(--color-bg-card)]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-cta)]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Mi Orden</h3>
              </div>
              <button 
                onClick={() => setShowCarrito(false)} 
                className="w-8 h-8 rounded-full hover:bg-[var(--color-text-primary)]/10 flex items-center justify-center text-[var(--color-text-primary)] transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white">
              {carrito.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-[var(--color-text-muted)]">Tu carrito está vacío</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Explora nuestros productos y agrega tus favoritos.</p>
                </div>
              ) : (
                <>
                  {/* Service Selection */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Canal de entrega</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setTipoServicio('Comer en el Lugar'); setError(''); }}
                        className={`p-3 rounded-lg border text-left transition-all font-bold text-xs cursor-pointer flex items-center gap-2 justify-center ${
                          tipoServicio === 'Comer en el Lugar'
                            ? 'bg-[var(--color-cta)] border-[var(--color-cta)] text-white shadow-sm'
                            : 'bg-white border-[var(--color-border-warm)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
                        }`}
                      >
                        En el Lugar
                      </button>

                      <button
                        onClick={() => { setTipoServicio('Para Llevar / Recoger'); setError(''); }}
                        className={`p-3 rounded-lg border text-left transition-all font-bold text-xs cursor-pointer flex items-center gap-2 justify-center ${
                          tipoServicio === 'Para Llevar / Recoger'
                            ? 'bg-[var(--color-cta)] border-[var(--color-cta)] text-white shadow-sm'
                            : 'bg-white border-[var(--color-border-warm)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
                        }`}
                      >
                        Para Llevar
                      </button>
                    </div>
                  </div>

                  {/* Mesa Selection */}
                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border-warm)] animate-fade-in">
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Seleccione su Número de Mesa
                      </label>
                      <select
                        className="input-field text-center text-sm font-bold border-[var(--color-border-warm)] bg-white cursor-pointer"
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
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Efectivo', 'Pago QR Simple'].map(met => (
                        <button
                          key={met}
                          onClick={() => setMetodoPago(met)}
                          className={`py-2.5 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                            metodoPago === met
                              ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white shadow-sm'
                              : 'bg-white border-[var(--color-border-warm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]'
                          }`}
                        >
                          {met === 'Pago QR Simple' ? 'QR Simple' : 'Efectivo'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div className="space-y-3 pt-3 border-t border-[var(--color-border-warm)]/60">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Datos de Contacto</p>
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
                  <div className="space-y-3 pt-3 border-t border-[var(--color-border-warm)]/60">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Datos de Facturación</p>
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
                    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border-warm)] space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        ¿A qué hora pasará a recoger?
                      </label>
                      <input
                        type="text"
                        className="input-field text-center text-sm font-bold border-[var(--color-border-warm)] bg-white"
                        placeholder="Ej: 15:30"
                        value={horaRecojo}
                        onChange={(e) => { setHoraRecojo(e.target.value); setError(''); }}
                      />
                      <p className="text-[10px] text-[var(--color-text-muted)] italic">Pagarás en efectivo en caja al momento de retirar tu pedido.</p>
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

                  {/* Cart Items List */}
                  <div className="space-y-3 pt-4 border-t border-[var(--color-border-warm)]/60">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Productos en Carrito</p>
                    {carrito.map(item => (
                      <div key={item.id_producto} className="bg-[var(--color-bg-card)] border border-[var(--color-border-warm)] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-xs text-[var(--color-text-primary)]">{item.nombre_producto}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Bs. {parseFloat(item.precio_venta).toFixed(2)} c/u</p>
                          </div>
                          <p className="text-xs font-extrabold text-[var(--color-text-primary)]">
                            Bs. {(parseFloat(item.precio_venta) * item.qty).toFixed(2)}
                          </p>
                        </div>
                        
                        <input
                          type="text"
                          className="text-[10px] bg-white border border-[var(--color-border-warm)] rounded-lg px-2.5 py-1.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-[var(--color-cta)]"
                          placeholder="Observaciones de preparación..."
                          value={item.observaciones || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCarrito(prev => prev.map(i => i.id_producto === item.id_producto ? { ...i, observaciones: val } : i));
                          }}
                        />

                        <div className="flex items-center justify-between border-t border-[var(--color-border-warm)]/40 pt-2">
                          <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-[var(--color-border-warm)]">
                            <button onClick={() => updateQty(item.id_producto, -1)} className="w-6 h-6 rounded bg-neutral-50 text-xs font-bold text-[var(--color-cta)] flex items-center justify-center cursor-pointer">-</button>
                            <span className="font-bold text-xs w-5 text-center text-[var(--color-text-primary)]">{item.qty}</span>
                            <button onClick={() => updateQty(item.id_producto, 1)} className="w-6 h-6 rounded bg-neutral-50 text-xs font-bold text-[var(--color-success)] flex items-center justify-center cursor-pointer">+</button>
                          </div>
                          
                          <button 
                            onClick={() => setCarrito(prev => prev.filter(i => i.id_producto !== item.id_producto))} 
                            className="text-[10px] font-bold text-[var(--color-danger)] hover:underline cursor-pointer"
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
              <div className="p-5 border-t border-[var(--color-border-warm)] bg-[var(--color-bg-card)]">
                {error && (
                  <p className="text-xs font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/5 p-2.5 rounded-lg mb-3 border border-[var(--color-danger)]/20">
                    {error}
                  </p>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] font-medium block">Monto Total</span>
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">Bs. {total.toFixed(2)}</span>
                  </div>
                  <span className="text-xs bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 px-3 py-1.5 rounded-lg font-bold">
                    {totalItems} Ítems
                  </span>
                </div>

                <button
                  onClick={enviarPedido}
                  disabled={enviando || !tipoServicio || (tipoServicio === 'Comer en el Lugar' && !numeroMesa)}
                  className="btn-primary w-full py-3.5 text-xs font-bold tracking-widest uppercase disabled:opacity-50 cursor-pointer"
                >
                  {enviando ? 'Procesando pedido...' : 'Confirmar & Pedir'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {totalItems > 0 && !showCarrito && (
        <button
          onClick={() => setShowCarrito(true)}
          className="fixed bottom-6 right-6 z-40 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white py-3.5 px-6 shadow-2xl flex items-center gap-3 rounded-xl border border-white/20 transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs uppercase"
        >
          <span>Ver Carrito ({totalItems})</span>
          <span className="opacity-40">|</span>
          <span className="text-[var(--color-gold-light)]">Bs. {total.toFixed(2)}</span>
        </button>
      )}
    </div>
  );
}
