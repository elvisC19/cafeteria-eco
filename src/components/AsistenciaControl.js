'use client';
import { useState, useEffect } from 'react';

export default function AsistenciaControl({ usuario }) {
  const [registro, setRegistro] = useState(null);
  const [turnoAnterior, setTurnoAnterior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (usuario?.id_usuario) {
      obtenerEstadoAsistencia();
    }
  }, [usuario]);

  async function obtenerEstadoAsistencia() {
    try {
      const res = await fetch(`/api/asistencia?id_usuario=${usuario.id_usuario}`);
      const data = await res.json();
      if (data.success) {
        setRegistro(data.registro);
        setTurnoAnterior(data.turno_anterior || null);
      }
    } catch (err) {
      console.error('Error al obtener estado de asistencia:', err);
    } finally {
      setLoading(false);
    }
  }

  async function registrarAsistencia(accion) {
    setProcesando(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          accion
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar asistencia');
      }
      setSuccess(data.message);
      setRegistro(data.registro);
      setTurnoAnterior(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setProcesando(false);
    }
  }

  if (!usuario) return null;
  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
      <div className="w-3 h-3 border border-t-transparent border-[var(--color-text-muted)] rounded-full animate-spin" />
      <span>Verificando asistencia...</span>
    </div>
  );

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const hasEntrada = !!registro?.hora_entrada;
  const hasSalida = !!registro?.hora_salida;
  // Si no hay registro activo pero hay turno anterior completado, mostrar opción de nuevo turno
  const canStartNewShift = !registro && !!turnoAnterior;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#FAF7F2] border border-[#EBE3D5] rounded-xl p-3 shadow-sm select-none">
      <div className="flex flex-col justify-center">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Registro de Asistencia</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`w-2 h-2 rounded-full ${hasSalida ? 'bg-neutral-400' : hasEntrada ? 'bg-emerald-500 animate-pulse' : canStartNewShift ? 'bg-amber-500' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            {hasSalida ? 'Jornada Completada' : hasEntrada ? 'Trabajando' : canStartNewShift ? 'Turno Anterior Completado' : 'Fuera de Turno'}
          </span>
        </div>
      </div>

      {/* Markers details */}
      <div className="flex items-center gap-4 border-l border-r border-[#EBE3D5] px-4 py-1 text-[11px] text-[var(--color-text-muted)] font-medium">
        <div>
          <span>Entrada: </span>
          <span className="font-bold text-[var(--color-text-primary)]">
            {hasEntrada ? formatTime(registro.hora_entrada) : canStartNewShift ? formatTime(turnoAnterior.hora_entrada) : '--:--'}
          </span>
        </div>
        <div>
          <span>Salida: </span>
          <span className="font-bold text-[var(--color-text-primary)]">
            {hasSalida ? formatTime(registro.hora_salida) : canStartNewShift ? formatTime(turnoAnterior.hora_salida) : '--:--'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!hasEntrada && !canStartNewShift && (
          <button
            onClick={() => registrarAsistencia('entrada')}
            disabled={procesando}
            className="flex items-center gap-1.5 bg-[#4F3E35] hover:bg-[#3B2B24] text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors border-none disabled:opacity-50"
          >
            Marcar Entrada
          </button>
        )}

        {hasEntrada && !hasSalida && (
          <button
            onClick={() => registrarAsistencia('salida')}
            disabled={procesando}
            className="flex items-center gap-1.5 bg-[var(--color-cta)] hover:bg-[var(--color-cta)]/90 text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors border-none disabled:opacity-50 shadow-sm"
          >
            Marcar Salida
          </button>
        )}

        {canStartNewShift && (
          <button
            onClick={() => registrarAsistencia('entrada')}
            disabled={procesando}
            className="flex items-center gap-1.5 bg-[#4F3E35] hover:bg-[#3B2B24] text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors border-none disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Iniciar Nuevo Turno
          </button>
        )}


        {/* Status Messages inside the widget */}
        {(success || error) && (
          <div className={`text-[10px] font-bold px-2 py-1 rounded ${success ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
            {success || error}
          </div>
        )}
      </div>
    </div>
  );
}
