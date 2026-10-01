import React, { useState, useEffect } from 'react';
import { api } from '../../../../api/client';

const EditarPerfil = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    edad: '',
    empresa: '',
    pais: '',
    rol_proyecto: ''
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    cargarDatosPerfil();
  }, []);

  const cargarDatosPerfil = async () => {
    try {
      const response = await api.get('/auth/me');
      const fullName = response.data.fullName || response.data.username || '';
      const parts = fullName.trim().split(/\s+/);
      setFormData((current) => ({ ...current, first_name: parts.shift() || '', last_name: parts.join(' '), email: response.data.employee?.email || '' }));
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cargar los datos del perfil' });
    } finally {
      setLoadingData(false);
    }
  };

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
      const response = await api.put('/auth/profile', formData);

      // Actualizar localStorage con el nuevo nombre
      const usuarioActual = JSON.parse(localStorage.getItem('usuario_pm') || '{}');
      const updatedUser = response.data?.usuario || {};
      localStorage.setItem('usuario_pm', JSON.stringify({
        ...usuarioActual,
        first_name: formData.first_name,
        last_name: formData.last_name,
        rol: formData.rol_proyecto,
        pais: formData.pais,
        timezone: updatedUser.timezone || usuarioActual.timezone
      }));

      setMensaje({ tipo: 'success', texto: response.data.detail });
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al actualizar el perfil';
      setMensaje({ tipo: 'error', texto: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando datos del perfil...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Editar Perfil</h1>

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombres *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              El correo electrónico no puede ser modificado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edad" className="block text-sm font-medium text-gray-700 mb-2">
                Edad
              </label>
              <input
                type="number"
                id="edad"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                min="18"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                value={formData.empresa}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <input
                type="text"
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="rol_proyecto" className="block text-sm font-medium text-gray-700 mb-2">
                Rol en Proyectos
              </label>
              <select
                id="rol_proyecto"
                name="rol_proyecto"
                value={formData.rol_proyecto}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                <option value="Director de Proyecto">Director de Proyecto</option>
                <option value="Gerente de Proyecto">Gerente de Proyecto</option>
                <option value="Coordinador de Proyecto">Coordinador de Proyecto</option>
                <option value="Analista">Analista</option>
                <option value="Ingeniero">Ingeniero</option>
                <option value="Arquitecto">Arquitecto</option>
                <option value="Consultor">Consultor</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 text-white rounded-md transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPerfil;



