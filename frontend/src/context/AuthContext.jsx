// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ==========================================================
     🔄 Obtener usuario actual
     ========================================================== */
  const fetchUser = async () => {
    try {
      setLoading(true);

      const res = await api.get("users/usuario-actual/");
      setAuthUser(res.data);
      localStorage.setItem("auth_user", JSON.stringify(res.data));
    } catch (err) {
      console.error(
        "❌ No se pudo obtener usuario actual:",
        err.response?.status,
        err
      );

      if (err.response?.status === 401) logout();
      else setAuthUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     🚀 Inicialización desde token / cache
     ========================================================== */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("auth_user");

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      if (userData) {
        try {
          setAuthUser(JSON.parse(userData));
        } catch {
          logout();
          return;
        }
      }

      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  /* ==========================================================
     🔐 Login
     ========================================================== */
  const login = async ({ usuario, password }) => {
    try {
      console.log("🔹 Enviando login:", { usuario });

      const res = await api.post("users/login/", {
        usuario: usuario,
        contrasena: password,
      });

      const { access, refresh, user } = res.data;

      if (!access || !user) throw new Error("Token o usuario no recibido");

      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("auth_user", JSON.stringify(user));

      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      setAuthUser(user);

      console.log("✅ Login exitoso:", user);
      return { success: true };
    } catch (err) {
      console.error(
        "❌ Error de inicio de sesión:",
        err.response?.data || err.message
      );

      return {
        success: false,
        message:
          err.response?.data?.error ||
          "Credenciales inválidas o servidor no disponible",
      };
    }
  };

  /* ==========================================================
     🚪 Logout
     ========================================================== */
  const logout = () => {
    localStorage.clear();
    if (api.defaults.headers.common["Authorization"]) {
      delete api.defaults.headers.common["Authorization"];
    }
    setAuthUser(null);
  };

  /* ==========================================================
     ♻️ Refresh token
     ========================================================== */
  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) throw new Error("No hay refresh token");

      const res = await api.post("users/refresh/", { refresh });
      const { access } = res.data;

      localStorage.setItem("access_token", access);
      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      await fetchUser();
    } catch (err) {
      console.error("❌ Error al refrescar token:", err);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        setAuthUser,
        login,
        logout,
        refreshToken,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
