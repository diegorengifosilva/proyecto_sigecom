// src/pages/Dashboard/tabs/TabCompras.jsx
import React, { useState, useEffect } from 'react';
import { comprasService } from '../../../api';

const TIPOS = ['orden_compra', 'contrato', 'requisicion', 'otro'];
const ESTADOS = ['solicitado', 'aprobado', 'emitido', 'recibido', 'pagado', 'cancelado'];
const MONEDAS = ['USD', 'PEN', 'EUR'];

const fmtMoney = (n, c = 'USD') =>
  new Intl.NumberFormat(c === 'USD' ? 'en-US' : 'es-PE', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
};

export default function TabCompras({ proyecto }) {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    numero: '',
    tipo: 'orden_compra',
    descripcion: '',
    proveedor: '',
    contacto_proveedor: '',
    moneda: proyecto?.moneda || 'USD',
    monto_total: '',
    monto_pagado: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_aprobacion: '',
    fecha_emision: '',
    fecha_entrega_estimada: '',
    fecha_entrega_real: '',
    estado: 'solicitado',
    solicitante: '',
    aprobador: '',
    terminos_condiciones: '',
    notas: '',
  });

  const cargarCompras = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await comprasService.listar(proyecto.id);
      setCompras(response.data);
    } catch (err) {
      console.error('Error cargando compras:', err);
      setError('Error al cargar compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyecto?.id) {
      cargarCompras();
    }
  }, [proyecto?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await comprasService.actualizar(proyecto.id, editando.id, form);
      } else {
        await comprasService.crear(proyecto.id, form);
      }
      await cargarCompras();
      resetForm();
    } catch (err) {
      console.error('Error guardando compra:', err);
      setError('Error al guardar compra');
    }
  };

  const handleEliminar = async (compraId) => {
    if (!window.confirm('¿Eliminar esta compra?')) return;
    try {
      await comprasService.eliminar(proyecto.id, compraId);
      await cargarCompras();
    } catch (err) {
      console.error('Error eliminando compra:', err);
      setError('Error al eliminar compra');
    }
  };

  const handleEditar = (compra) => {
    setEditando(compra);
    setForm({
      numero: compra.numero || '',
      tipo: compra.tipo || 'orden_compra',
      descripcion: compra.descripcion || '',
      proveedor: compra.proveedor || '',
      contacto_proveedor: compra.contacto_proveedor || '',
      moneda: compra.moneda || 'USD',
      monto_total: compra.monto_total || '',
      monto_pagado: compra.monto_pagado || '',
      fecha_solicitud: compra.fecha_solicitud || '',
      fecha_aprobacion: compra.fecha_aprobacion || '',
      fecha_emision: compra.fecha_emision || '',
      fecha_entrega_estimada: compra.fecha_entrega_estimada || '',
      fecha_entrega_real: compra.fecha_entrega_real || '',
      estado: compra.estado || 'solicitado',
      solicitante: compra.solicitante || '',
      aprobador: compra.aprobador || '',
      terminos_condiciones: compra.terminos_condiciones || '',
      notas: compra.notas || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      numero: '',
      tipo: 'orden_compra',
      descripcion: '',
      proveedor: '',
      contacto_proveedor: '',
      moneda: proyecto?.moneda || 'USD',
      monto_total: '',
      monto_pagado: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      fecha_aprobacion: '',
      fecha_emision: '',
      fecha_entrega_estimada: '',
      fecha_entrega_real: '',
      estado: 'solicitado',
      solicitante: '',
      aprobador: '',
      terminos_condiciones: '',
      notas: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-4">Cargando compras...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de Compras</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? 'Cancelar' : '+ Nueva Compra'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {editando ? 'Editar Compra' : 'Nueva Compra'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Número"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                required
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Descripción"
              rows="2"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Proveedor"
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Contacto Proveedor"
                value={form.contacto_proveedor}
                onChange={(e) => setForm({ ...form, contacto_proveedor: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              >
                {MONEDAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Monto Total"
                type="number"
                step="0.01"
                value={form.monto_total}
                onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                required
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Monto Pagado"
                type="number"
                step="0.01"
                value={form.monto_pagado}
                onChange={(e) => setForm({ ...form, monto_pagado: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Solicitante"
                value={form.solicitante}
                onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Aprobador"
                value={form.aprobador}
                onChange={(e) => setForm({ ...form, aprobador: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">F. Solicitud</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_solicitud}
                  onChange={(e) => setForm({ ...form, fecha_solicitud: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">F. Aprobación</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_aprobacion}
                  onChange={(e) => setForm({ ...form, fecha_aprobacion: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">F. Emisión</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_emision}
                  onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">F. Entrega Est.</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_entrega_estimada}
                  onChange={(e) => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">F. Entrega Real</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm"
                  type="date"
                  value={form.fecha_entrega_real}
                  onChange={(e) => setForm({ ...form, fecha_entrega_real: e.target.value })}
                />
              </div>
            </div>

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Términos y Condiciones"
              rows="2"
              value={form.terminos_condiciones}
              onChange={(e) => setForm({ ...form, terminos_condiciones: e.target.value })}
            />

            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Notas"
              rows="2"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {editando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-3">Órdenes y Contratos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Número</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">Monto Total</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">F. Entrega</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const saldo = (c.monto_total || 0) - (c.monto_pagado || 0);
                return (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{c.numero}</td>
                    <td className="px-3 py-2 capitalize">{c.tipo.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">{c.proveedor || '—'}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(c.monto_total, c.moneda)}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(saldo, c.moneda)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        c.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                        c.estado === 'recibido' ? 'bg-blue-100 text-blue-800' :
                        c.estado === 'cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">{fmtDate(c.fecha_entrega_estimada)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleEditar(c)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(c.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!compras.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    No hay compras registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}




