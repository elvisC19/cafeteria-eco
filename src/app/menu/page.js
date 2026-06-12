'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MenuPublicoPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCarrito, setShowCarrito] = useState(false);
  const [tipoServicio, setTipoServicio] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');
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
  const productosFiltrados = categoriaActiva === 'Todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

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
      // Buscar mesa por número si aplica
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
    'Todas': '🍽️'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Cargando menú...</p>
        </div>
      </div>
    );
  }

  // Pedido exitoso
  if (pedidoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-10 max-w-md text-center animate-slide-up">
          <span className="text-6xl block mb-4">✅</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
            ¡Pedido Registrado!
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">Su pedido ha sido enviado a cocina.</p>
          
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
            <p className="text-sm text-[var(--text-muted)]">Número de Pedido</p>
            <p className="text-4xl font-bold text-[var(--accent-secondary)]">#{pedidoExitoso.id_pedido}</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">Total: <span className="font-semibold text-[var(--text-primary)]">Bs. {parseFloat(pedidoExitoso.total_pago).toFixed(2)}</span></p>
          </div>
          
          <button onClick={() => setPedidoExitoso(null)} className="btn-primary w-full py-3">
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
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gold)] flex items-center justify-center text-lg font-bold text-[var(--bg-primary)]">
              CC
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Charcas Capital</h1>
              <p className="text-xs text-[var(--text-muted)]">Menú Digital</p>
            </div>
          </Link>

          <button
            onClick={() => setShowCarrito(true)}
            className="btn-primary relative flex items-center gap-2"
          >
            🛒 Carrito
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--danger)] text-white text-xs flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className={`relative py-16 px-4 text-center transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-[120px] opacity-10" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Nuestro Menú
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Descubra nuestra selección artesanal de cafés, tés y delicias de repostería, preparados con ingredientes de la más alta calidad.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-[73px] z-20 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)] px-4 py-3">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                categoriaActiva === cat
                  ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] text-[var(--bg-primary)] shadow-lg'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {catEmojis[cat] || '🍴'} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {productosFiltrados.map((prod, i) => {
            const inCart = carrito.find(c => c.id_producto === prod.id_producto);
            return (
              <div
                key={prod.id_producto}
                className="glass-card p-5 flex flex-col animate-slide-up hover:border-[var(--accent-primary)]"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{catEmojis[prod.categoria] || '🍴'}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    {prod.categoria}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 flex-1">{prod.nombre_producto}</h3>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border-color)]">
                  <span className="text-xl font-bold text-[var(--accent-secondary)]">
                    Bs. {parseFloat(prod.precio_venta).toFixed(2)}
                  </span>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(prod.id_producto, -1)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--danger)]">-</button>
                      <span className="font-bold text-sm w-6 text-center">{inCart.qty}</span>
                      <button onClick={() => updateQty(prod.id_producto, 1)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--success)]">+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(prod)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      + Agregar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Drawer */}
      {showCarrito && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCarrito(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col animate-slide-up">
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">🛒 Mi Pedido</h3>
              <button onClick={() => setShowCarrito(false)} className="p-2 rounded-lg hover:bg-[var(--bg-card)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl block mb-4">🛍️</span>
                  <p className="text-[var(--text-muted)]">Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  {/* Service type selection */}
                  {!tipoServicio && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">📌 ¿Cómo desea su pedido?</p>
                      <button
                        onClick={() => setTipoServicio('Comer en el Lugar')}
                        className="w-full p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left"
                      >
                        <span className="text-2xl">🪑</span>
                        <p className="font-semibold text-[var(--text-primary)] mt-1">Comer en el Lugar</p>
                        <p className="text-xs text-[var(--text-muted)]">Indique su número de mesa</p>
                      </button>
                      <button
                        onClick={() => setTipoServicio('Para Llevar / Recoger')}
                        className="w-full p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all text-left"
                      >
                        <span className="text-2xl">📦</span>
                        <p className="font-semibold text-[var(--text-primary)] mt-1">Para Llevar / Recoger</p>
                        <p className="text-xs text-[var(--text-muted)]">Recoja su pedido en mostrador</p>
                      </button>
                    </div>
                  )}

                  {tipoServicio === 'Comer en el Lugar' && (
                    <div className="bg-[var(--bg-card)] rounded-xl p-4">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        🪑 Número de Mesa
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="input-field text-center text-lg font-bold"
                        placeholder="Ej: 5"
                        value={numeroMesa}
                        onChange={(e) => setNumeroMesa(e.target.value)}
                      />
                    </div>
                  )}

                  {tipoServicio === 'Para Llevar / Recoger' && (
                    <div className="bg-[rgba(96,165,250,0.1)] rounded-xl p-4 text-center">
                      <p className="text-sm text-[var(--info)]">📦 Se le asignará un ticket de retiro al confirmar su pedido.</p>
                    </div>
                  )}

                  {tipoServicio && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-info text-xs">{tipoServicio}</span>
                      <button onClick={() => { setTipoServicio(''); setNumeroMesa(''); }} className="text-xs text-[var(--danger)]">Cambiar</button>
                    </div>
                  )}

                  {/* Cart items */}
                  {carrito.map(item => (
                    <div key={item.id_producto} className="bg-[var(--bg-card)] rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm text-[var(--text-primary)]">{item.nombre_producto}</p>
                          <p className="text-xs text-[var(--text-muted)]">Bs. {parseFloat(item.precio_venta).toFixed(2)} c/u</p>
                        </div>
                        <p className="text-sm font-bold text-[var(--accent-secondary)]">
                          Bs. {(parseFloat(item.precio_venta) * item.qty).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id_producto, -1)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-sm">-</button>
                          <span className="font-bold w-6 text-center text-sm">{item.qty}</span>
                          <button onClick={() => updateQty(item.id_producto, 1)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-sm">+</button>
                        </div>
                        <button onClick={() => setCarrito(prev => prev.filter(i => i.id_producto !== item.id_producto))} className="text-xs text-[var(--danger)]">
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-[var(--border-color)]">
                {error && (
                  <p className="text-sm text-[var(--danger)] mb-3">{error}</p>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[var(--text-secondary)]">Total a Pagar</span>
                  <span className="text-2xl font-bold text-[var(--accent-secondary)]">Bs. {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={enviarPedido}
                  disabled={enviando || !tipoServicio}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : '📋 Confirmar Pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {totalItems > 0 && !showCarrito && (
        <button
          onClick={() => setShowCarrito(true)}
          className="fixed bottom-6 right-6 z-40 btn-primary py-4 px-6 shadow-2xl flex items-center gap-3 rounded-2xl"
        >
          🛒
          <span className="font-bold">{totalItems} items</span>
          <span className="text-xs opacity-80">|</span>
          <span className="font-bold">Bs. {total.toFixed(2)}</span>
        </button>
      )}

      {/* Footer */}
      <footer className="text-center py-8 px-4 border-t border-[var(--border-color)] mt-12">
        <p className="text-sm text-[var(--text-muted)]">☕ Charcas Capital — Cafetería & Salón de Té</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Chuquisaca, Bolivia • 2026</p>
      </footer>
    </div>
  );
}
