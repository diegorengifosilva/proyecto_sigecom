import { useState, useEffect, useRef } from "react";
import api from "@/services/api";

export const useCotizacionClientes = (data, setData, isReadOnly) => {
  const clienteRef = useRef(null);
  const encargadosRef = useRef(null);

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteFocused, setClienteFocused] = useState(false);
  const [clienteSelected, setClienteSelected] = useState(false);
  const [highlightClienteIndex, setHighlightClienteIndex] = useState(-1);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);

  const [encargadoQuery, setEncargadoQuery] = useState("");
  const [encargadosResults, setEncargadosResults] = useState([]);
  const [encargadosLoading, setEncargadosLoading] = useState(false);
  const [encargadoFocused, setEncargadoFocused] = useState(false);
  const [showEncargadosDropdown, setShowEncargadosDropdown] = useState(false);
  const [highlightEncargadoIndex, setHighlightEncargadoIndex] = useState(-1);

  // Sync client query when data loads or changes from parent
  useEffect(() => {
    if (data?.cliente_nombre) {
      setClienteQuery(data.cliente_nombre);
      setClienteSelected(true);
    } else {
      setClienteQuery("");
      setClienteSelected(false);
    }
  }, [data?.id_cliente, data?.cliente_nombre]);

  // Sync representative query when data loads or changes from parent
  useEffect(() => {
    if (data?.representante_nombre) {
      setEncargadoQuery(data.representante_nombre);
    } else {
      setEncargadoQuery("");
    }
  }, [data?.id_representante, data?.representante_nombre]);

  const fetchClientesInline = async (q = "") => {
    setClienteLoading(true);
    try {
      const { data: res } = await api.get("core/clientes/buscar/", {
        params: { q }
      });
      setClienteResults(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("❌ Error buscando clientes:", err);
      setClienteResults([]);
    } finally {
      setClienteLoading(false);
    }
  };

  const fetchEncargadosInline = async (q = "") => {
    if (!data?.id_cliente) return;
    setEncargadosLoading(true);
    try {
      const { data: res } = await api.get("core/representantes/buscar/", {
        params: { cliente_id: data.id_cliente, q }
      });
      setEncargadosResults(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("❌ Error buscando encargados:", err);
      setEncargadosResults([]);
    } finally {
      setEncargadosLoading(false);
    }
  };

  // Debounce Clientes
  useEffect(() => {
    if (!clienteFocused || isReadOnly) return;

    const t = setTimeout(() => {
      fetchClientesInline(clienteQuery.trim());
      setShowClienteDropdown(true);
    }, 300);

    return () => clearTimeout(t);
  }, [clienteQuery, clienteFocused, isReadOnly]);

  // Reset clientes si query vacía
  useEffect(() => {
    if (!clienteQuery) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      setHighlightClienteIndex(-1);
    }
  }, [clienteQuery]);

  // Debounce Encargados
  useEffect(() => {
    if (!encargadoFocused || isReadOnly || !data?.id_cliente) return;

    const t = setTimeout(() => {
      fetchEncargadosInline(encargadoQuery.trim());
      setShowEncargadosDropdown(true);
    }, 300);

    return () => clearTimeout(t);
  }, [encargadoQuery, encargadoFocused, data?.id_cliente, isReadOnly]);

  // Reset encargados si query vacía
  useEffect(() => {
    if (!encargadoQuery) {
      setEncargadosResults([]);
      setShowEncargadosDropdown(false);
      setHighlightEncargadoIndex(-1);
    }
  }, [encargadoQuery]);

  // Click fuera de los dropdowns para cerrarlos y sincronizar el valor con el padre
  useEffect(() => {
    const handleClickOutside = (e) => {
      let isOutsideCliente = false;
      let isOutsideEncargado = false;

      if (clienteRef.current && !clienteRef.current.contains(e.target)) {
        setShowClienteDropdown(false);
        setHighlightClienteIndex(-1);
        setClienteFocused(false);
        isOutsideCliente = true;
      }
      if (encargadosRef.current && !encargadosRef.current.contains(e.target)) {
        setShowEncargadosDropdown(false);
        setHighlightEncargadoIndex(-1);
        setEncargadoFocused(false);
        isOutsideEncargado = true;
      }

      if (isOutsideCliente) {
        setData(prev => {
          if (!prev) return prev;
          if (prev.cliente_nombre === clienteQuery) return prev;
          return {
            ...prev,
            cliente_nombre: clienteQuery,
            id_cliente: clienteSelected ? prev.id_cliente : null
          };
        });
      }

      if (isOutsideEncargado) {
        setData(prev => {
          if (!prev) return prev;
          if (prev.representante_nombre === encargadoQuery) return prev;
          return {
            ...prev,
            representante_nombre: encargadoQuery
          };
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clienteQuery, encargadoQuery, clienteSelected, setData]);

  const handleClienteSelect = (cliente) => {
    setData(prev => ({
      ...prev,
      id_cliente: cliente.id_cliente,
      cliente_nombre: cliente.nombre,
      id_representante: null,
      representante_nombre: "",
      representante_cargo: "",
      representante_telefono: "",
      representante_movil: "",
      representante_correo: "",
    }));
    setClienteQuery(cliente.nombre);
    setShowClienteDropdown(false);
    setClienteSelected(true);
    setHighlightClienteIndex(-1);
    setEncargadoQuery("");
  };

  const handleEncargadoSelect = (enc) => {
    setData(prev => ({
      ...prev,
      id_representante: enc.id_representante,
      representante_nombre: enc.nombre_representante,
      representante_cargo: enc.cargo || "",
      representante_telefono: enc.telefono || "",
      representante_movil: enc.movil || "",
      representante_correo: enc.email || "",
    }));
    setEncargadoQuery(enc.nombre_representante);
    setShowEncargadosDropdown(false);
    setHighlightEncargadoIndex(-1);
  };

  const handleClienteQueryChange = (val) => {
    setClienteQuery(val);
    setClienteSelected(false);
  };

  const handleEncargadoQueryChange = (val) => {
    setEncargadoQuery(val);
  };

  const handleClienteKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      setShowClienteDropdown(false);
      setClienteFocused(false);
      setData(prev => {
        if (!prev) return prev;
        if (prev.cliente_nombre === clienteQuery) return prev;
        return {
          ...prev,
          cliente_nombre: clienteQuery,
          id_cliente: clienteSelected ? prev.id_cliente : null
        };
      });
    }
  };

  const handleEncargadoKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      setShowEncargadosDropdown(false);
      setEncargadoFocused(false);
      setData(prev => {
        if (!prev) return prev;
        if (prev.representante_nombre === encargadoQuery) return prev;
        return {
          ...prev,
          representante_nombre: encargadoQuery
        };
      });
    }
  };

  return {
    clienteRef,
    encargadosRef,
    clienteQuery,
    setClienteQuery,
    clienteResults,
    clienteFocused,
    setClienteFocused,
    clienteSelected,
    highlightClienteIndex,
    setHighlightClienteIndex,
    showClienteDropdown,
    setShowClienteDropdown,
    clienteLoading,

    encargadoQuery,
    setEncargadoQuery,
    encargadosResults,
    encargadoFocused,
    setEncargadoFocused,
    showEncargadosDropdown,
    setShowEncargadosDropdown,
    highlightEncargadoIndex,
    setHighlightEncargadoIndex,
    encargadosLoading,

    fetchClientesInline,
    fetchEncargadosInline,
    handleClienteSelect,
    handleEncargadoSelect,
    handleClienteQueryChange,
    handleEncargadoQueryChange,
    handleClienteKeyDown,
    handleEncargadoKeyDown
  };
};
