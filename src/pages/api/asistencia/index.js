// ============================================================================
// API: GET/POST /api/asistencia
// Registro de asistencia (Entrada y Salida) del personal
// Soporta múltiples turnos por día
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar registros de asistencia o verificar estado de hoy
  if (req.method === 'GET') {
    const { id_usuario, mes, anio } = req.query;

    try {
      if (id_usuario) {
        // Verificar estado de hoy para un usuario específico
        // Obtener el ÚLTIMO registro del día (permite múltiples turnos)
        const result = await query(
          `SELECT id_asistencia, id_usuario, fecha, hora_entrada, hora_salida
           FROM registro_asistencia
           WHERE id_usuario = $1 
             AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
           ORDER BY hora_entrada DESC
           LIMIT 1`,
          [id_usuario]
        );

        const registro = result.rows[0] || null;

        // Si el último registro ya tiene salida, devolver null para permitir nuevo turno
        if (registro && registro.hora_salida) {
          return res.status(200).json({
            success: true,
            registro: null,
            turno_anterior: registro
          });
        }

        return res.status(200).json({
          success: true,
          registro
        });
      } else {
        // Listar registros de asistencia (para admin y superadmin)
        // Soporta filtro por mes y año
        let whereClause = '';
        const params = [];

        if (mes && anio) {
          params.push(parseInt(mes), parseInt(anio));
          whereClause = `WHERE EXTRACT(MONTH FROM r.fecha) = $1 AND EXTRACT(YEAR FROM r.fecha) = $2`;
        } else if (anio) {
          params.push(parseInt(anio));
          whereClause = `WHERE EXTRACT(YEAR FROM r.fecha) = $1`;
        }

        const result = await query(
          `SELECT r.id_asistencia, r.id_usuario, u.nombre, u.rol, r.fecha, r.hora_entrada, r.hora_salida
           FROM registro_asistencia r
           JOIN usuarios u ON u.id_usuario = r.id_usuario
           ${whereClause}
           ORDER BY r.fecha DESC, r.hora_entrada DESC`,
          params
        );

        // Calcular resumen
        const registros = result.rows;
        let totalHorasTrabajadas = 0;
        let turnosCompletos = 0;
        let turnosActivos = 0;

        registros.forEach(r => {
          if (r.hora_entrada && r.hora_salida) {
            const entrada = new Date(r.hora_entrada);
            const salida = new Date(r.hora_salida);
            totalHorasTrabajadas += (salida - entrada) / (1000 * 60 * 60);
            turnosCompletos++;
          } else if (r.hora_entrada && !r.hora_salida) {
            turnosActivos++;
          }
        });

        return res.status(200).json({
          success: true,
          asistencias: registros,
          resumen: {
            total_registros: registros.length,
            turnos_completos: turnosCompletos,
            turnos_activos: turnosActivos,
            horas_totales: Math.round(totalHorasTrabajadas * 100) / 100
          }
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
        // Verificar si hay un turno activo (entrada sin salida) hoy
        const activeCheck = await query(
          `SELECT id_asistencia FROM registro_asistencia
           WHERE id_usuario = $1 
             AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
             AND hora_salida IS NULL
           LIMIT 1`,
          [id_usuario]
        );

        if (activeCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Ya tienes un turno activo. Marca tu salida antes de iniciar un nuevo turno.' });
        }

        // Insertar nuevo registro de entrada (permite múltiples por día)
        const insertResult = await query(
          `INSERT INTO registro_asistencia (id_usuario, fecha, hora_entrada)
           VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date, NOW())
           RETURNING *`,
          [id_usuario]
        );

        return res.status(200).json({
          success: true,
          message: 'Entrada registrada con éxito.',
          registro: insertResult.rows[0]
        });

      } else {
        // Registrar Salida — actualizar el registro más reciente sin salida
        const updateResult = await query(
          `UPDATE registro_asistencia
           SET hora_salida = NOW()
           WHERE id_asistencia = (
             SELECT id_asistencia FROM registro_asistencia
             WHERE id_usuario = $1 
               AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
               AND hora_salida IS NULL
             ORDER BY hora_entrada DESC
             LIMIT 1
           )
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
