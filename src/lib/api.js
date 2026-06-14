const API_BASE = '';

/**
 * Wrapper de fetch con manejo de errores y autenticación
 */
async function apiFetch(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.detalle || `Error ${res.status}`);
  }

  return data;
}

// ============ AUTH ============
export const authAPI = {
  login: (nombre, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nombre, password }),
    }),
};

// ============ PRODUCTOS ============
export const productosAPI = {
  listar: (disponible = true) =>
    apiFetch(`/api/productos?disponible=${disponible}`),
  actualizarImagenUrl: (id_producto, imagen_url) =>
    apiFetch('/api/productos', {
      method: 'PATCH',
      body: JSON.stringify({ id_producto, imagen_url }),
    }),
};

// ============ PEDIDOS ============
export const pedidosAPI = {
  crear: (pedido) =>
    apiFetch('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(pedido),
    }),
  listar: () => apiFetch('/api/pedidos'),
  colaFIFO: (estado) =>
    apiFetch(`/api/pedidos/cola-fifo${estado ? `?estado=${estado}` : ''}`),
  actualizarEstado: (id_pedido, estado_pedido) =>
    apiFetch('/api/pedidos/cola-fifo', {
      method: 'PATCH',
      body: JSON.stringify({ id_pedido, estado_pedido }),
    }),
};

// ============ MESAS ============
export const mesasAPI = {
  obtener: () => apiFetch('/api/mesas/status'),
  actualizar: (id_mesa, estado) =>
    apiFetch('/api/mesas/status', {
      method: 'PATCH',
      body: JSON.stringify({ id_mesa, estado }),
    }),
};

// ============ PAGOS ============
export const pagosAPI = {
  procesar: (pago) =>
    apiFetch('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify(pago),
    }),
};

// ============ INSUMOS ============
export const insumosAPI = {
  listar: () => apiFetch('/api/insumos'),
  reabastecer: (id_insumo, cantidad_agregar) =>
    apiFetch('/api/insumos', {
      method: 'PATCH',
      body: JSON.stringify({ id_insumo, cantidad_agregar }),
    }),
};

// ============ USUARIOS ============
export const usuariosAPI = {
  listar: () => apiFetch('/api/usuarios'),
  crear: (usuario) =>
    apiFetch('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuario),
    }),
  actualizar: (datos) =>
    apiFetch('/api/usuarios', {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};

// ============ REPORTES ============
export const reportesAPI = {
  ingresos: () => apiFetch('/api/reportes/ingresos'),
};
