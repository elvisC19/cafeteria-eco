// ============================================================================
// API: POST /api/auth/login
// Autenticación de empleados - Verifica credenciales y retorna payload seguro
// ============================================================================
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'charcas_capital_secret_key_2026';

export default async function handler(req, res) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
      return res.status(400).json({
        error: 'Campos requeridos: nombre, password'
      });
    }

    // Buscar usuario activo por nombre
    const result = await query(
      'SELECT id_usuario, nombre, rol, password_hash FROM usuarios WHERE nombre = $1 AND activo = TRUE',
      [nombre]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas o usuario inactivo.'
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña con bcrypt
    // Supabase usa pgcrypto (crypt/bf), necesitamos comparar correctamente
    const passCheck = await query(
      "SELECT (password_hash = crypt($1, password_hash)) AS valid FROM usuarios WHERE id_usuario = $2",
      [password, usuario.id_usuario]
    );

    if (!passCheck.rows[0]?.valid) {
      return res.status(401).json({
        error: 'Credenciales inválidas.'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      success: true,
      message: `Bienvenido/a, ${usuario.nombre}`,
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar la autenticación.',
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
