import axios from 'axios';

// Crear instancia de axios con base config
const api = axios.create({
  baseURL: '/api/',
  headers: {
    Accept: 'application/json',
  },
});

// Interceptor para añadir token dinámicamente en cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('vc_hseq_access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;


