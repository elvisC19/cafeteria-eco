// ============================================================================
// API: GET/POST/PATCH/DELETE /api/usuarios
// CRUD de gestión de cuentas del personal
// ============================================================================
import { query } from '@/lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Listar todos los usuarios (sin password_hash)
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id_usuario, nombre, rol, activo, created_at
         FROM usuarios ORDER BY created_at DESC`,
        []
      );
      return res.status(200).json({ success: true, usuarios: result.rows });
    } catch (error) {
      console.error('[GET Usuarios Error]:', error);
      return res.status(500).json({ error: 'Error al obtener usuarios.', detalle: error.message });
    }
  }

  // POST - Crear nuevo usuario
  if (req.method === 'POST') {
    try {
      const { nombre, rol, password } = req.body;

      if (!nombre || !rol || !password) {
        return res.status(400).json({ error: 'Campos requeridos: nombre, rol, password' });
      }

      const validRoles = ['SuperAdmin', 'Administrador', 'Mesero', 'Cajero', 'Barista', 'Cocina'];
      if (!validRoles.includes(rol)) {
        return res.status(400).json({ error: `Rol debe ser: ${validRoles.join(', ')}` });
      }

      const result = await query(
        `INSERT INTO usuarios (nombre, rol, password_hash)
         VALUES ($1, $2, crypt($3, gen_salt('bf')))
         RETURNING id_usuario, nombre, rol, activo, created_at`,
        [nombre, rol, password]
      );

      return res.status(201).json({
        success: true,
        message: `Usuario "${nombre}" creado exitosamente.`,
        usuario: result.rows[0]
      });

    } catch (error) {
      console.error('[POST Usuario Error]:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese nombre.' });
      }
      return res.status(500).json({ error: 'Error al crear usuario.', detalle: error.message });
    }
  }

  // PATCH - Actualizar usuario
  if (req.method === 'PATCH') {
    try {
      const { id_usuario, nombre, rol, activo, password } = req.body;

      if (!id_usuario) {
        return res.status(400).json({ error: 'Se requiere id_usuario.' });
      }

      let updates = [];
      let params = [];
      let paramCount = 0;

      if (nombre !== undefined) {
        paramCount++;
        updates.push(`nombre = $${paramCount}`);
        params.push(nombre);
      }
      if (rol !== undefined) {
        paramCount++;
        updates.push(`rol = $${paramCount}`);
        params.push(rol);
      }
      if (activo !== undefined) {
        paramCount++;
        updates.push(`activo = $${paramCount}`);
        params.push(activo);
      }
      if (password) {
        paramCount++;
        updates.push(`password_hash = crypt($${paramCount}, gen_salt('bf'))`);
        params.push(password);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
      }

      paramCount++;
      params.push(id_usuario);

      const result = await query(
        `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = $${paramCount}
         RETURNING id_usuario, nombre, rol, activo, created_at`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado.',
        usuario: result.rows[0]
      });

    } catch (error) {
      console.error('[PATCH Usuario Error]:', error);
      return res.status(500).json({ error: 'Error al actualizar.', detalle: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
