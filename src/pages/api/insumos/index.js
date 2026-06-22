// ============================================================================
// API: GET/PATCH/POST/DELETE /api/insumos
// Gestión completa de inventario de insumos/materia prima
// Incluye precios (costo_unitario), CRUD completo
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar todos los insumos con alertas de stock
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT *,
          CASE 
            WHEN stock_actual <= stock_minimo THEN TRUE
            ELSE FALSE
          END AS alerta_stock,
          CASE
            WHEN stock_actual <= 0 THEN 'AGOTADO'
            WHEN stock_actual <= stock_minimo THEN 'CRITICO'
            WHEN stock_actual <= (stock_minimo * 1.5) THEN 'BAJO'
            ELSE 'NORMAL'
          END AS nivel_stock
        FROM insumos
        ORDER BY 
          CASE WHEN stock_actual <= stock_minimo THEN 0 ELSE 1 END,
          nombre_insumo`,
        []
      );

      const resumen = {
        total: result.rows.length,
        criticos: result.rows.filter(i => i.stock_actual <= i.stock_minimo).length,
        normales: result.rows.filter(i => i.stock_actual > i.stock_minimo).length
      };

      return res.status(200).json({ success: true, insumos: result.rows, resumen });

    } catch (error) {
      console.error('[GET Insumos Error]:', error);
      return res.status(500).json({ error: 'Error al obtener insumos.', detalle: error.message });
    }
  }

  // POST - Crear nuevo insumo
  if (req.method === 'POST') {
    try {
      const { nombre_insumo, stock_actual, stock_minimo, unidad_medida, costo_unitario } = req.body;

      if (!nombre_insumo || !unidad_medida) {
        return res.status(400).json({ error: 'Se requieren nombre_insumo y unidad_medida.' });
      }

      const validUnidades = ['kilos', 'litros', 'unidades', 'piezas'];
      if (!validUnidades.includes(unidad_medida)) {
        return res.status(400).json({ error: `unidad_medida debe ser: ${validUnidades.join(', ')}` });
      }

      const result = await query(
        `INSERT INTO insumos (nombre_insumo, stock_actual, stock_minimo, unidad_medida, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          nombre_insumo,
          parseFloat(stock_actual) || 0,
          parseFloat(stock_minimo) || 0,
          unidad_medida,
          parseFloat(costo_unitario) || 0
        ]
      );

      return res.status(201).json({
        success: true,
        message: `Insumo "${nombre_insumo}" creado exitosamente.`,
        insumo: result.rows[0]
      });

    } catch (error) {
      console.error('[POST Insumo Error]:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe un insumo con ese nombre.' });
      }
      return res.status(500).json({ error: 'Error al crear insumo.', detalle: error.message });
    }
  }

  // PATCH - Actualizar insumo (reabastecimiento o edición de datos)
  if (req.method === 'PATCH') {
    try {
      const { id_insumo, cantidad_agregar, costo_unitario, stock_minimo, nombre_insumo } = req.body;

      if (!id_insumo) {
        return res.status(400).json({ error: 'Se requiere id_insumo.' });
      }

      // Si es reabastecimiento aditivo
      if (cantidad_agregar !== undefined) {
        const cantidad = parseFloat(cantidad_agregar);
        if (isNaN(cantidad) || cantidad <= 0) {
          return res.status(400).json({ error: 'cantidad_agregar debe ser un número positivo.' });
        }

        let result;
        if (costo_unitario !== undefined) {
          const costo = parseFloat(costo_unitario);
          if (isNaN(costo) || costo < 0) {
            return res.status(400).json({ error: 'costo_unitario debe ser un número >= 0.' });
          }
          result = await query(
            `UPDATE insumos 
             SET stock_actual = stock_actual + $1,
                 costo_unitario = $2
             WHERE id_insumo = $3
             RETURNING *`,
            [cantidad, costo, id_insumo]
          );
        } else {
          result = await query(
            `UPDATE insumos 
             SET stock_actual = stock_actual + $1
             WHERE id_insumo = $2
             RETURNING *`,
            [cantidad, id_insumo]
          );
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Insumo no encontrado.' });
        }

        return res.status(200).json({
          success: true,
          message: `Se agregaron ${cantidad} ${result.rows[0].unidad_medida} a "${result.rows[0].nombre_insumo}".`,
          insumo: result.rows[0]
        });
      }

      // Si es edición de datos (precio, stock_minimo, nombre)
      const updateFields = [];
      const params = [];
      let paramCount = 1;

      if (costo_unitario !== undefined) {
        const costo = parseFloat(costo_unitario);
        if (isNaN(costo) || costo < 0) {
          return res.status(400).json({ error: 'costo_unitario debe ser un número >= 0.' });
        }
        updateFields.push(`costo_unitario = $${paramCount++}`);
        params.push(costo);
      }

      if (stock_minimo !== undefined) {
        const minimo = parseFloat(stock_minimo);
        if (isNaN(minimo) || minimo < 0) {
          return res.status(400).json({ error: 'stock_minimo debe ser un número >= 0.' });
        }
        updateFields.push(`stock_minimo = $${paramCount++}`);
        params.push(minimo);
      }

      if (nombre_insumo !== undefined) {
        if (!nombre_insumo.trim()) {
          return res.status(400).json({ error: 'nombre_insumo no puede estar vacío.' });
        }
        updateFields.push(`nombre_insumo = $${paramCount++}`);
        params.push(nombre_insumo.trim());
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No se enviaron campos para actualizar. Use cantidad_agregar para reabastecer, o costo_unitario/stock_minimo/nombre_insumo para editar.' });
      }

      params.push(id_insumo);
      const result = await query(
        `UPDATE insumos SET ${updateFields.join(', ')} WHERE id_insumo = $${paramCount} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Insumo "${result.rows[0].nombre_insumo}" actualizado exitosamente.`,
        insumo: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Insumo Error]:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe un insumo con ese nombre.' });
      }
      return res.status(500).json({ error: 'Error al actualizar insumo.', detalle: error.message });
    }
  }

  // DELETE - Eliminar insumo
  if (req.method === 'DELETE') {
    try {
      const { id_insumo } = req.body || {};

      if (!id_insumo) {
        return res.status(400).json({ error: 'Se requiere id_insumo para eliminar.' });
      }

      // Verificar si el insumo está asociado a recetas
      const recetasCheck = await query(
        `SELECT COUNT(*) as total FROM recetas WHERE id_insumo = $1`,
        [id_insumo]
      );

      if (parseInt(recetasCheck.rows[0].total) > 0) {
        return res.status(400).json({
          error: `No se puede eliminar: este insumo está asociado a ${recetasCheck.rows[0].total} receta(s) activa(s). Primero elimine las recetas asociadas.`
        });
      }

      const result = await query(
        `DELETE FROM insumos WHERE id_insumo = $1 RETURNING *`,
        [id_insumo]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: `Insumo "${result.rows[0].nombre_insumo}" eliminado exitosamente.`,
        insumo: result.rows[0]
      });

    } catch (error) {
      console.error('[DELETE Insumo Error]:', error);
      return res.status(500).json({ error: 'Error al eliminar insumo.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
