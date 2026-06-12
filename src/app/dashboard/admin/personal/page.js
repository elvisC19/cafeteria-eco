'use client';
import { useState, useEffect } from 'react';
import { usuariosAPI } from '@/lib/api';

export default function PersonalPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', rol: 'Cajero', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await usuariosAPI.listar();
      setUsuarios(data.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editando) {
        const updateData = { id_usuario: editando, nombre: form.nombre, rol: form.rol };
        if (form.password) updateData.password = form.password;
        await usuariosAPI.actualizar(updateData);
        setSuccess('Usuario actualizado exitosamente.');
      } else {
        if (!form.password) { setError('La contraseña es requerida.'); return; }
        await usuariosAPI.crear(form);
        setSuccess('Usuario creado exitosamente.');
      }
      setShowForm(false);
      setEditando(null);
      setForm({ nombre: '', rol: 'Cajero', password: '' });
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActivo(id_usuario, activo) {
    try {
      await usuariosAPI.actualizar({ id_usuario, activo: !activo });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(user) {
    setEditando(user.id_usuario);
    setForm({ nombre: user.nombre, rol: user.rol, password: '' });
    setShowForm(true);
  }

  const roles = ['SuperAdmin', 'Administrador', 'Mesero', 'Cajero', 'Barista', 'Cocina'];
  const rolBadge = {
    SuperAdmin: 'badge-danger',
    Administrador: 'badge-info',
    Cajero: 'badge-success',
    Barista: 'badge-warning',
    Cocina: 'badge-warning',
    Mesero: 'badge-info',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Gestión de Personal
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{usuarios.length} empleados registrados</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ nombre: '', rol: 'Cajero', password: '' }); }}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Empleado
        </button>
      </div>

      {success && (
        <div className="toast bg-[rgba(74,222,128,0.15)] border border-[var(--success)] text-[var(--success)]">
          ✓ {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            {editando ? '✏️ Editar Empleado' : '➕ Registrar Nuevo Empleado'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre Completo</label>
              <input
                className="input-field"
                placeholder="Nombre del empleado"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Rol</label>
              <select
                className="input-field"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Contraseña {editando && '(dejar vacío para no cambiar)'}
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editando}
              />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary">{editando ? 'Guardar Cambios' : 'Crear Empleado'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditando(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
          {error && <p className="text-sm text-[var(--danger)] mt-3">{error}</p>}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">ID</th>
                <th className="text-left p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nombre</th>
                <th className="text-left p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Rol</th>
                <th className="text-left p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Estado</th>
                <th className="text-left p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registro</th>
                <th className="text-right p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors">
                  <td className="p-4 text-[var(--text-muted)]">#{u.id_usuario}</td>
                  <td className="p-4 font-medium text-[var(--text-primary)]">{u.nombre}</td>
                  <td className="p-4"><span className={`badge ${rolBadge[u.rol] || 'badge-info'}`}>{u.rol}</span></td>
                  <td className="p-4">
                    <span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-muted)] text-xs">
                    {new Date(u.created_at).toLocaleDateString('es-BO')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)] hover:text-[var(--accent-secondary)]"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleActivo(u.id_usuario, u.activo)}
                        className={`p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors ${u.activo ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={u.activo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
