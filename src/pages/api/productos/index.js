// ============================================================================
// API: GET/POST/PATCH/DELETE /api/productos
// Gestión completa del catálogo de productos (Menú)
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: Crear nuevo producto
  if (req.method === 'POST') {
    try {
      const { nombre_producto, precio_venta, categoria, disponible, imagen_url } = req.body;

      if (!nombre_producto || precio_venta === undefined || !categoria) {
        return res.status(400).json({ error: 'Se requieren nombre_producto, precio_venta y categoria.' });
      }

      const precio = parseFloat(precio_venta);
      if (isNaN(precio) || precio < 0) {
        return res.status(400).json({ error: 'precio_venta debe ser un número positivo.' });
      }

      const disp = disponible !== undefined ? disponible === true || disponible === 'true' : true;

      const result = await query(
        `INSERT INTO productos (nombre_producto, precio_venta, categoria, disponible, imagen_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [nombre_producto, precio, categoria, disp, imagen_url || null]
      );

      return res.status(201).json({
        success: true,
        message: `Producto "${nombre_producto}" creado exitosamente.`,
        producto: result.rows[0]
      });

    } catch (error) {
      console.error('[POST Productos Error]:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe un producto con ese nombre.' });
      }
      return res.status(500).json({ error: 'Error al crear el producto.', detalle: error.message });
    }
  }

  // PATCH: Actualizar producto (cualquier campo)
  if (req.method === 'PATCH') {
    try {
      const { id_producto, nombre_producto, precio_venta, categoria, disponible, imagen_url } = req.body;

      if (!id_producto) {
        return res.status(400).json({ error: 'Se requiere id_producto.' });
      }

      const updateFields = [];
      const params = [];
      let paramCount = 1;

      if (nombre_producto !== undefined) {
        if (!nombre_producto.trim()) {
          return res.status(400).json({ error: 'nombre_producto no puede estar vacío.' });
        }
        updateFields.push(`nombre_producto = $${paramCount++}`);
        params.push(nombre_producto.trim());
      }

      if (precio_venta !== undefined) {
        const precio = parseFloat(precio_venta);
        if (isNaN(precio) || precio < 0) {
          return res.status(400).json({ error: 'precio_venta debe ser un número positivo.' });
        }
        updateFields.push(`precio_venta = $${paramCount++}`);
        params.push(precio);
      }

      if (categoria !== undefined) {
        if (!categoria.trim()) {
          return res.status(400).json({ error: 'categoria no puede estar vacía.' });
        }
        updateFields.push(`categoria = $${paramCount++}`);
        params.push(categoria.trim());
      }

      if (disponible !== undefined) {
        const disp = disponible === true || disponible === 'true';
        updateFields.push(`disponible = $${paramCount++}`);
        params.push(disp);
      }

      if (imagen_url !== undefined) {
        updateFields.push(`imagen_url = $${paramCount++}`);
        params.push(imagen_url ? imagen_url.trim() : null);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
      }

      params.push(id_producto);
      const result = await query(
        `UPDATE productos SET ${updateFields.join(', ')} WHERE id_producto = $${paramCount} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Producto "${result.rows[0].nombre_producto}" actualizado exitosamente.`,
        producto: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Productos Error]:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe un producto con ese nombre.' });
      }
      return res.status(500).json({ error: 'Error al actualizar el producto.', detalle: error.message });
    }
  }

  // DELETE: Eliminar producto
  if (req.method === 'DELETE') {
    try {
      const { id_producto } = req.body || {};

      if (!id_producto) {
        return res.status(400).json({ error: 'Se requiere id_producto.' });
      }

      const result = await query(
        `DELETE FROM productos WHERE id_producto = $1 RETURNING *`,
        [id_producto]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Producto "${result.rows[0].nombre_producto}" eliminado exitosamente.`,
        producto: result.rows[0]
      });

    } catch (error) {
      console.error('[DELETE Productos Error]:', error);
      if (error.code === '23503') {
        return res.status(400).json({
          error: 'No se puede eliminar: este producto está asociado a recetas activas o historial de ventas (pedidos).'
        });
      }
      return res.status(500).json({ error: 'Error al eliminar el producto.', detalle: error.message });
    }
  }

  // GET: Listar productos
  if (req.method === 'GET') {
    try {
      const { disponible, categoria } = req.query;
      let whereConditions = [];
      let params = [];

      if (disponible === 'true') {
        whereConditions.push('disponible = TRUE');
      }

      if (categoria) {
        params.push(categoria);
        whereConditions.push(`categoria = $${params.length}`);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const result = await query(
        `SELECT * FROM productos ${whereClause} ORDER BY categoria, nombre_producto`,
        params
      );

      // Agrupar por categoría
      const categorias = {};
      result.rows.forEach(prod => {
        if (!categorias[prod.categoria]) {
          categorias[prod.categoria] = [];
        }
        categorias[prod.categoria].push(prod);
      });

      return res.status(200).json({
        success: true,
        productos: result.rows,
        por_categoria: categorias,
        total: result.rows.length
      });

    } catch (error) {
      console.error('[GET Productos Error]:', error);
      return res.status(500).json({ error: 'Error al obtener productos.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
