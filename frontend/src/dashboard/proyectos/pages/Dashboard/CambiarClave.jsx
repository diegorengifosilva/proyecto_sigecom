import React, { useState } from 'react';
import { api } from '../../../../api/client';

const CambiarClave = () => {
  const [formData, setFormData] = useState({
    password_actual: '',
    password_nueva: '',
    password_nueva_confirmacion: ''
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);

    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: formData.password_actual,
        newPassword: formData.password_nueva,
      });

      setMensaje({ tipo: 'success', texto: response.data?.success ? 'Contraseña actualizada. Inicie sesión nuevamente.' : 'Contraseña actualizada.' });

      // Limpiar formulario
      setFormData({
        password_actual: '',
        password_nueva: '',
        password_nueva_confirmacion: ''
      });

    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al cambiar la contraseña';
      setMensaje({ tipo: 'error', texto: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cambiar Contraseña</h1>

      {mensaje.texto && (
        <div className={`p-4 mb-6 rounded-md ${
          mensaje.tipo === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password_actual" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña Actual *
            </label>
            <input
              type="password"
              id="password_actual"
              name="password_actual"
              value={formData.password_actual}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div>
            <label htmlFor="password_nueva" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña *
            </label>
            <input
              type="password"
              id="password_nueva"
              name="password_nueva"
              value={formData.password_nueva}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres"
            />
            <p className="text-xs text-gray-500 mt-1">
              La contraseña debe tener al menos 8 caracteres
            </p>
          </div>

          <div>
            <label htmlFor="password_nueva_confirmacion" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              id="password_nueva_confirmacion"
              name="password_nueva_confirmacion"
              value={formData.password_nueva_confirmacion}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repite la nueva contraseña"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 text-white rounded-md transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Requisitos de seguridad:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Mínimo 8 caracteres</li>
            <li>Recomendado: usar mayúsculas, minúsculas y números</li>
            <li>Evita usar información personal obvia</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CambiarClave;



