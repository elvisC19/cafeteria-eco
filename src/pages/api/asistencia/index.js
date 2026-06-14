// ============================================================================
// API: GET/POST /api/asistencia
// Registro de asistencia (Entrada y Salida) del personal
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar registros de asistencia o verificar estado de hoy
  if (req.method === 'GET') {
    const { id_usuario } = req.query;

    try {
      if (id_usuario) {
        // Verificar estado de hoy para un usuario específico
        const result = await query(
          `SELECT id_asistencia, id_usuario, fecha, hora_entrada, hora_salida
           FROM registro_asistencia
           WHERE id_usuario = $1 
             AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date`,
          [id_usuario]
        );
        return res.status(200).json({
          success: true,
          registro: result.rows[0] || null
        });
      } else {
        // Listar todos los registros de asistencia (para admin y superadmin)
        const result = await query(
          `SELECT r.id_asistencia, r.id_usuario, u.nombre, u.rol, r.fecha, r.hora_entrada, r.hora_salida
           FROM registro_asistencia r
           JOIN usuarios u ON u.id_usuario = r.id_usuario
           ORDER BY r.fecha DESC, r.hora_entrada DESC`,
          []
        );
        return res.status(200).json({
          success: true,
          asistencias: result.rows
        });
      }
    } catch (error) {
      console.error('[GET Asistencia Error]:', error);
      return res.status(500).json({ error: 'Error al obtener registros de asistencia.', detalle: error.message });
    }
  }

  // POST - Registrar entrada o salida
  if (req.method === 'POST') {
    const { id_usuario, accion } = req.body;

    if (!id_usuario || !accion) {
      return res.status(400).json({ error: 'Campos requeridos: id_usuario, accion' });
    }

    if (accion !== 'entrada' && accion !== 'salida') {
      return res.status(400).json({ error: "La acción debe ser 'entrada' o 'salida'." });
    }

    try {
      if (accion === 'entrada') {
        // Registrar Entrada
        const insertResult = await query(
          `INSERT INTO registro_asistencia (id_usuario, fecha, hora_entrada)
           VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date, NOW())
           ON CONFLICT (id_usuario, fecha) DO NOTHING
           RETURNING *`,
          [id_usuario]
        );

        if (insertResult.rows.length === 0) {
          return res.status(400).json({ error: 'Ya has registrado tu entrada para el día de hoy.' });
        }

        return res.status(200).json({
          success: true,
          message: 'Entrada registrada con éxito.',
          registro: insertResult.rows[0]
        });

      } else {
        // Registrar Salida
        const updateResult = await query(
          `UPDATE registro_asistencia
           SET hora_salida = NOW()
           WHERE id_usuario = $1 
             AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
           RETURNING *`,
          [id_usuario]
        );

        if (updateResult.rows.length === 0) {
          return res.status(400).json({ error: 'Debe marcar entrada antes de poder registrar la salida.' });
        }

        return res.status(200).json({
          success: true,
          message: 'Salida registrada con éxito.',
          registro: updateResult.rows[0]
        });
      }
    } catch (error) {
      console.error('[POST Asistencia Error]:', error);
      return res.status(500).json({ error: 'Error al registrar la asistencia.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
