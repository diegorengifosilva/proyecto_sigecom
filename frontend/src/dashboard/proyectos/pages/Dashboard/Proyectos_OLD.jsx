import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaPlus,
  FaProjectDiagram,
  FaSitemap,
  FaUserTie,
  FaUsers,
  FaRegEdit,
  FaTrashAlt,
} from "react-icons/fa";
import { BiCommentDetail } from "react-icons/bi";
import { FiEdit3 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";


/* ====================== utilidades básicas ====================== */
// --- Persistencia local (proyectos) ---
// --- claves de almacenamiento ---
const K_PROYECTOS = "pm.proyectos";
const K_ORG = "pm.organigrama";
const K_USERS = "pm.usuarios";

// --- load/save genéricos ---
const load = (k, fallback) => {
  try { const r = JSON.parse(localStorage.getItem(k) || "null"); return r ?? fallback; }
  catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const emailOK = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const ESTADOS = [
  "Apertura",
  "Inicio",
  "Planificación",
  "Ejecución",
  "Cierre",
  "Cerrado",
  "Pausado",
];

// === Monedas, UNs y formateo ===
const MONEDAS = [
  { value: "USD", label: "USD $" },
  { value: "PEN", label: "PEN S/." },
];

const UNIDADES_NEGOCIO = ["Minería", "Petroquímica", "Industria", "Safety"];

const fmtMoney = (n, currency = "USD") =>
  isNaN(n)
    ? "—"
    : new Intl.NumberFormat(
        currency === "USD" ? "en-US" : "es-PE",
        { style: "currency", currency, maximumFractionDigits: 0 }
      ).format(Number(n || 0));

// Fecha a dd/mm/yy (sin problemas de zona horaria)
const fmtDMY = (iso) => {
  if (!iso || typeof iso !== "string" || !iso.includes("-")) return "—";
  const [y, m, d] = iso.split("-");
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String(y).slice(-2)}`;
};

// Suma segura
const num = (v) => Number(v || 0);
      
/* ====================== componentes UI pequeños ====================== */
function Modal({ title, children, onClose, width = "max-w-4xl" }) {
  const ref = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={ref}
        className={`relative w-full ${width} mx-4 rounded-xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-2 text-black hover:bg-gray-100"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="border-t px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}
function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-gray-700">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ====================== datos simulados ====================== */
const PROYECTOS_SEED = [
  {
    codigo: "PROY-001",
    nombre: "Construcción Planta Sur",
    estado: "En Progreso",
    inicio: "2025-06-01",
    fin: "2025-09-15",
    notas: [
      "2025-07-01: Proyecto pausado por falta de insumos.",
      "2025-07-10: Reanudado tras resolución logística.",
    ],
  },
  {
    codigo: "PROY-002",
    nombre: "Sistema de Monitoreo Norte",
    estado: "Pausado",
    inicio: "2025-05-10",
    fin: "2025-10-20",
    notas: [],
  },
];

const ORG_SEED = [
  { codigo: "0254", rol: "Gerencia General", dependencia: "" },
  { codigo: "02541", rol: "Gerencia Comercial", dependencia: "0254" },
  { codigo: "02542", rol: "Gerencia de Proyectos", dependencia: "0254" },
  { codigo: "02543", rol: "Gerencia HSEQ", dependencia: "0254" },
  { codigo: "02544", rol: "Gerencia de Administración", dependencia: "0254" },
  { codigo: "025421", rol: "Coordinador de Proyectos", dependencia: "02542" },
  { codigo: "025422", rol: "Líder de proyecto", dependencia: "02542" },
  { codigo: "025423", rol: "Ing. de Servicios", dependencia: "02542" },
  { codigo: "025424", rol: "Ing. de Aplicaciones", dependencia: "02542" },
  { codigo: "025425", rol: "Tec. Electromecánico", dependencia: "02542" },
  { codigo: "025441", rol: "Compras", dependencia: "02544" },
  { codigo: "025442", rol: "Recursos Humanos", dependencia: "02544" },
  { codigo: "025443", rol: "Logística", dependencia: "02544" },
  { codigo: "025444", rol: "Caja Chica", dependencia: "02544" },
];

const USERS_SEED = [
  {
    nombre: "Juan José Castillo M.",
    email: "juan.castillo@vc-corporation.com",
    pais: "Perú",
    rol: "Gerencia General",
    verificado: true,
  },
  {
    nombre: "Frank De La Cruz",
    email: "frank.delacruz@vc-corporation.com",
    pais: "Perú",
    rol: "Gerencia de Proyectos",
    verificado: true,
  },
  {
    nombre: "Ruth Guadalupe",
    email: "ruth.guadalupe@vc-corporation.com",
    pais: "Perú",
    rol: "Coordinador de Proyectos",
    verificado: false,
  },
  {
    nombre: "Cristina Martínez V.",
    email: "compras@vc-corporation.com",
    pais: "Perú",
    rol: "Compras",
    verificado: false,
  },
];

/* ====================== Nuevo: área de proyectos ====================== */
function buildCodeIndex(org) {
  const idx = new Map();
  org.forEach((n) => idx.set(n.codigo, n));
  return idx;
}
function findByRol(org, rolName) {
  return org.find((n) => n.rol.toLowerCase() === rolName.toLowerCase());
}
function isDescendantOf(orgIndex, nodeCode, targetCode) {
  let current = orgIndex.get(nodeCode);
  while (current) {
    if (current.codigo === targetCode) return true;
    if (!current.dependencia) return false;
    current = orgIndex.get(current.dependencia);
  }
  return false;
}
function getProjectAreaRoles(org) {
  const target = findByRol(org, "Gerencia de Proyectos");
  if (!target) return new Set();
  const idx = buildCodeIndex(org);
  const roles = new Set();
  org.forEach((n) => {
    if (n.codigo === target.codigo || isDescendantOf(idx, n.codigo, target.codigo)) {
      roles.add(n.rol);
    }
  });
  return roles; // nombres de rol del área de proyectos
}
function getEligibleLeaders(org, users) {
  const roles = getProjectAreaRoles(org);
  return users.filter((u) => roles.has(u.rol));
}

/* ====================== modales funcionales ====================== */
function NotasModal({ proyecto, onClose }) {
  return (
    <Modal title="Notas del proyecto" onClose={onClose} width="max-w-2xl">
      <div className="space-y-2">
        {proyecto.notas?.length ? (
          proyecto.notas.map((n, i) => (
            <div
              key={i}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              {n}
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-8 text-center text-sm text-gray-500">
            No hay notas registradas.
          </div>
        )}
      </div>
    </Modal>
  );
}

function OrganigramaModal({ data, setData, usuarios, setUsuarios, onClose }) {
  // formulario
  const [codigo, setCodigo] = useState("");
  const [rol, setRol] = useState("");
  const [dep, setDep] = useState("");
  const [editIndex, setEditIndex] = useState(-1);

  // opciones de dependencia (raíz + todos los códigos)
  const depOptions = useMemo(() => {
    const base = [{ value: "", label: "— Raíz —" }];

    const lista = data
      .filter((_, idx) => (editIndex >= 0 ? idx !== editIndex : true))
      .map((n) => ({ value: n.codigo, label: `${n.codigo} — ${n.rol}` }));

    return base.concat(lista);
  }, [data, editIndex]);

  const limpiar = () => {
    setCodigo("");
    setRol("");
    setDep("");
    setEditIndex(-1);
  };

  const agregar = () => {
    if (!codigo.trim() || !rol.trim()) return;
    if (data.some((d) => d.codigo === codigo.trim())) {
      alert("Ese código ya existe.");
      return;
    }
    setData((prev) => [...prev, { codigo: codigo.trim(), rol: rol.trim(), dependencia: dep }]);
    limpiar();
  };

  const guardarEdicion = () => {
    if (editIndex < 0) return;
    const old = data[editIndex];
    const nuevo = { codigo: codigo.trim(), rol: rol.trim(), dependencia: dep };

    // actualizar usuarios que usaban el nombre de rol previo
    if (old.rol !== nuevo.rol) {
      setUsuarios((prev) =>
        prev.map((u) => (u.rol === old.rol ? { ...u, rol: nuevo.rol } : u))
      );
    }

    // si cambió el código, actualizar dependencias hijas
    const codigoAnterior = old.codigo;
    setData((prev) =>
      prev.map((n, idx) => {
        if (idx === editIndex) return nuevo;
        if (n.dependencia === codigoAnterior) {
          return { ...n, dependencia: nuevo.codigo };
        }
        return n;
      })
    );
    limpiar();
  };

  const editar = (idx) => {
    const n = data[idx];
    setCodigo(n.codigo);
    setRol(n.rol);
    setDep(n.dependencia || "");
    setEditIndex(idx);
  };

  const eliminar = (idx) => {
    const nodo = data[idx];

    if (
      !confirm(
        `¿Eliminar el rol "${nodo.rol}" (${nodo.codigo})?\n` +
          "• Sus dependientes se moverán a Raíz.\n" +
          "• Los usuarios que tengan este rol quedarán sin rol asignado."
      )
    )
      return;

    // 1) mover hijos a raíz
    const codigoPadre = nodo.codigo;
    // 2) quitar rol a usuarios que lo usaban
    setUsuarios((prev) =>
      prev.map((u) => (u.rol === nodo.rol ? { ...u, rol: "" } : u))
    );

    setData((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((n) =>
          n.dependencia === codigoPadre ? { ...n, dependencia: "" } : n
        )
    );

    // si estaba editando este, limpiar
    if (editIndex === idx) limpiar();
  };

  const valido = codigo.trim() && rol.trim();

  return (
    <Modal title="Organigrama — Roles y Dependencias" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input label="Código" value={codigo} onChange={setCodigo} />
        <Input label="Rol" value={rol} onChange={setRol} />
        <Select
          label="Dependencia (opcional)"
          value={dep}
          onChange={setDep}
          options={depOptions}
        />
      </div>

      <div className="mt-3 flex justify-end">
        {editIndex >= 0 ? (
          <button
            onClick={guardarEdicion}
            disabled={!valido}
            className="rounded-md bg-blue-600 px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
          >
            Guardar
          </button>
        ) : (
          <button
            onClick={agregar}
            disabled={!valido}
            className="rounded-md bg-blue-600 px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
          >
            Agregar
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Dependencia</th>
              <th className="px-4 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {data.map((n, idx) => (
              <tr key={n.codigo} className="border-t">
                <td className="px-4 py-2">{n.codigo}</td>
                <td className="px-4 py-2">{n.rol}</td>
                <td className="px-4 py-2">
                  {n.dependencia ? n.dependencia : "—"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      title="Editar"
                      className="text-black hover:opacity-70"
                      onClick={() => editar(idx)}
                    >
                      <FaRegEdit size={18} />
                    </button>
                    <button
                      title="Eliminar"
                      className="text-black hover:text-red-600"
                      onClick={() => eliminar(idx)}
                    >
                      <FaTrashAlt size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={4}>
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function UsuariosModal({ data, setData, roles, onClose }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pais, setPais] = useState("Perú");
  const [rol, setRol] = useState("");
  const [verificado, setVerificado] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  const rolOptions = useMemo(
    () =>
      [{ value: "", label: "Seleccione…" }].concat(
        roles.map((r) => ({ value: r.rol, label: r.rol }))
      ),
    [roles]
  );

  const limpiar = () => {
    setNombre("");
    setEmail("");
    setPais("Perú");
    setRol("");
    setVerificado(false);
    setEditIndex(-1);
  };

  const agregar = () => {
    if (!nombre.trim() || !emailOK(email)) {
      alert("Completa nombre y un email válido.");
      return;
    }
    setData((prev) => [
      ...prev,
      { nombre: nombre.trim(), email: email.trim(), pais, rol, verificado },
    ]);
    limpiar();
  };

  const editar = (idx) => {
    const u = data[idx];
    setNombre(u.nombre);
    setEmail(u.email);
    setPais(u.pais);
    setRol(u.rol || "");
    setVerificado(!!u.verificado);
    setEditIndex(idx);
  };

  const guardar = () => {
    if (editIndex < 0) return;
    if (!nombre.trim() || !emailOK(email)) {
      alert("Completa nombre y un email válido.");
      return;
    }
    setData((prev) =>
      prev.map((u, i) =>
        i === editIndex ? { nombre, email, pais, rol, verificado } : u
      )
    );
    limpiar();
  };

  const eliminar = (idx) => {
    const u = data[idx];
    if (!confirm(`¿Eliminar al usuario "${u.nombre}"?`)) return;
    setData((prev) => prev.filter((_, i) => i !== idx));
    if (editIndex === idx) limpiar();
  };

  const valido = nombre.trim() && emailOK(email);

  return (
    <Modal title="Gestión — Usuarios" onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Input label="Nombres" value={nombre} onChange={setNombre} />
        <Input label="Email" value={email} onChange={setEmail} />
        <Select
          label="País"
          value={pais}
          onChange={setPais}
          options={[
            { value: "Perú", label: "Perú" },
            { value: "Chile", label: "Chile" },
            { value: "Colombia", label: "Colombia" },
            { value: "México", label: "México" },
          ]}
        />
        <Select
          label="Rol (desde organigrama)"
          value={rol}
          onChange={setRol}
          options={rolOptions}
        />
        <label className="col-span-full flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verificado}
            onChange={(e) => setVerificado(e.target.checked)}
          />
          <span>Usuario verificado</span>
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        {editIndex >= 0 ? (
          <button
            onClick={guardar}
            disabled={!valido}
            className="rounded-md bg-blue-600 px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
          >
            Guardar
          </button>
        ) : (
          <button
            onClick={agregar}
            disabled={!valido}
            className="rounded-md bg-blue-600 px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
          >
            Agregar
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">Nombres</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">País</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Verificado</th>
              <th className="px-4 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u, idx) => (
              <tr key={`${u.email}-${idx}`} className="border-t">
                <td className="px-4 py-2">{u.nombre}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.pais}</td>
                <td className="px-4 py-2">{u.rol || "—"}</td>
                <td className="px-4 py-2">{u.verificado ? "Sí" : "No"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      title="Editar"
                      className="text-black hover:opacity-70"
                      onClick={() => editar(idx)}
                    >
                      <FaRegEdit size={18} />
                    </button>
                    <button
                      title="Eliminar"
                      className="text-black hover:text-red-600"
                      onClick={() => eliminar(idx)}
                    >
                      <FaTrashAlt size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ====================== NUEVO: modal Crear Proyecto ====================== */
function CrearProyectoModal({ onClose, onCreate, org, users }) {
  // básicos
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cliente, setCliente] = useState("");
  const [estado, setEstado] = useState("Apertura");
  const [unidadNegocio, setUnidadNegocio] = useState("Minería");
  const elegibles = useMemo(() => getEligibleLeaders(org, users), [org, users]);
  const [liderEmail, setLiderEmail] = useState("");

  // fechas
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");

  // costos
  const [presupuesto, setPresupuesto] = useState("");        // Gastos (base)
  const [presupuestoHH, setPresupuestoHH] = useState("");    // HH (monto)
  const [contingenciaMonto, setContingenciaMonto] = useState(""); // Contingencia (monto)
  const [utilidad, setUtilidad] = useState("");              // Utilidad (monto)
  const [moneda, setMoneda] = useState("USD");

  // contacto cliente
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  // opciones
  const estadoOptions = ESTADOS.map((e) => ({ value: e, label: e }));
  const monedaOptions = MONEDAS;
  const unidadOptions = UNIDADES_NEGOCIO.map((u) => ({ value: u, label: u }));
  const liderOptions = [{ value: "", label: "— Sin asignar —" }].concat(
    elegibles.map((u) => ({ value: u.email, label: `${u.nombre} — ${u.rol}` }))
  );

  // validación mínima de apertura
  const valido = codigo.trim() && nombre.trim() && inicio && fin;

  const guardar = () => {
    if (!valido) return;
    onCreate({
      // básicos
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      estado,
      cliente: cliente.trim(),
      unidadNegocio,
      liderEmail,

      // fechas
      inicio,
      fin,

      // costos
      moneda,
      presupuesto: Number(presupuesto || 0),         // gastos base
      presupuestoHH: Number(presupuestoHH || 0),     // HH (monto)
      contingencia: Number(contingenciaMonto || 0),  // contingencia (monto)
      utilidad: Number(utilidad || 0),               // utilidad (monto)

      // contacto
      contactoCliente: {
        nombre: contactoNombre.trim(),
        email: contactoEmail.trim(),
        telefono: contactoTelefono.trim(),
      },

      // programado arranca en 0 (se acumulará con los gastos reales)
      programado: 0,

      notas: [],
    });
    onClose();
  };

  return (
    <Modal title="Crear Proyecto" onClose={onClose}>
      {/* 2 columnas reales: cada fila = 1 par */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* fila 1 */}
        <Input label="Código del proyecto" value={codigo} onChange={setCodigo} />
        <Input label={`Presupuesto (${moneda})`} type="number" value={presupuesto} onChange={setPresupuesto} />

        {/* fila 2 */}
        <Input label="Nombre del proyecto" value={nombre} onChange={setNombre} />
        <Input label={`Presupuesto HH (${moneda})`} type="number" value={presupuestoHH} onChange={setPresupuestoHH} />

        {/* fila 3 */}
        <Input label="Cliente" value={cliente} onChange={setCliente} />
        <Input label={`Contingencia (${moneda})`} type="number" value={contingenciaMonto} onChange={setContingenciaMonto} />

        {/* fila 4 */}
        <Select label="Estado" value={estado} onChange={setEstado}
                options={ESTADOS.map(e => ({ value: e, label: e }))} />
        <Input label={`Utilidad (${moneda})`} type="number" value={utilidad} onChange={setUtilidad} />

        {/* fila 5 */}
        <Select label="Unidad de negocio" value={unidadNegocio} onChange={setUnidadNegocio}
                options={UNIDADES_NEGOCIO.map(u => ({ value: u, label: u }))} />
        <Select label="Moneda" value={moneda} onChange={setMoneda} options={MONEDAS} />

        {/* fila 6 */}
        <Select label="Líder del Proyecto (área de Proyectos)" value={liderEmail} onChange={setLiderEmail}
                options={[{ value: "", label: "— Sin asignar —" }, ...elegibles.map(u => ({ value: u.email, label: `${u.nombre} — ${u.rol}` }))]} />
        <Input label="Contacto cliente — Nombres y apellidos" value={contactoNombre} onChange={setContactoNombre} />

        {/* fila 7 */}
        <Input label="Fecha de inicio" type="date" value={inicio} onChange={setInicio} />
        <Input label="Contacto cliente — Email" value={contactoEmail} onChange={setContactoEmail} />

        {/* fila 8 */}
        <Input label="Fecha fin" type="date" value={fin} onChange={setFin} />
        <Input label="Contacto cliente — Teléfono" value={contactoTelefono} onChange={setContactoTelefono} />
      </div>

      <div className="mt-4 text-right">
        <button
          onClick={guardar}
          disabled={!valido}
          className="rounded-md bg-blue-600 px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
        >
          Crear
        </button>
      </div>
    </Modal>
  );
}

/* ====================== página principal — tabla proyectos ====================== */
export default function Proyectos() {
  const navigate = useNavigate();
  // 1) debe ser de lectura/escritura
  const [proyectos, setProyectos] = useState(() => load(K_PROYECTOS, PROYECTOS_SEED));

  const [organigrama, setOrganigrama] = useState(() => load(K_ORG, ORG_SEED));
  const [usuarios, setUsuarios] = useState(() => load(K_USERS, USERS_SEED));

  const [modalNotas, setModalNotas] = useState(null);
  const [openOrg, setOpenOrg] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);

  // 2) FALTABA declarar este estado
  const [openCrear, setOpenCrear] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((s) => !s);

  // 3) handler para crear proyectos
  const onCreateProject = (nuevo) => {
    if (proyectos.some(p => p.codigo.toLowerCase() === nuevo.codigo.toLowerCase())) {
      alert("Ya existe un proyecto con ese código.");
      return;
    }
    setProyectos(prev => [...prev, nuevo]);
  };

  // --- Persistir automáticamente en localStorage cuando cambien ---
  useEffect(() => save(K_PROYECTOS, proyectos), [proyectos]);
  useEffect(() => save(K_ORG,        organigrama), [organigrama]);
  useEffect(() => save(K_USERS,      usuarios),    [usuarios]);

  return (
    <div className="p-6">
      {/* tabla principal */}
      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left font-semibold text-gray-700">
            <tr>
              <th className="px-6 py-3">Código</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Inicio</th>
              <th className="px-6 py-3">Fin</th>
              <th className="px-6 py-3">Presupuesto</th>
              <th className="px-6 py-3">Programado</th>
              <th className="px-6 py-3">Saldo</th>
              <th className="px-6 py-3">Notas</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p) => {
              const moneda = p.moneda || "USD";
              const totalPresupuesto =
                num(p.presupuesto) + num(p.presupuestoHH) + num(p.contingencia) + num(p.utilidad);
              const programado = num(p.programado); // sumatoria de gastos realizados (por ahora 0 hasta conectar)
              const saldo = totalPresupuesto - programado;

              return (
                <tr key={p.codigo} className="border-t">
                  {/* Código clickeable para abrir detalle */}
                  <td
                    className="px-6 py-3 cursor-pointer underline decoration-dotted underline-offset-4"
                    title="Abrir detalle del proyecto"
                    onClick={() => {
                      sessionStorage.setItem("pm.project", JSON.stringify(p));
                      navigate(`/proyectos/mis-proyectos/${encodeURIComponent(p.codigo)}`);
                    }}
                    
                  >
                    {p.codigo}
                  </td>
                  <td className="px-6 py-3">{p.cliente || "—"}</td>
                  <td className="px-6 py-3">{p.nombre}</td>
                  <td className="px-6 py-3">{p.estado}</td>
                  <td className="px-6 py-3">{fmtDMY(p.inicio)}</td>
                  <td className="px-6 py-3">{fmtDMY(p.fin)}</td>

                  {/* Presupuesto (Gastos + HH + Contingencia + Utilidad) */}
                  <td className="px-6 py-3">{fmtMoney(totalPresupuesto, moneda)}</td>

                  {/* Programado (real ejecutado) */}
                  <td className="px-6 py-3">{fmtMoney(programado, moneda)}</td>

                  {/* Saldo */}
                  <td className="px-6 py-3">{fmtMoney(saldo, moneda)}</td>

                  {/* Notas */}
                  <td className="px-6 py-3">
                    <button
                      title="Ver notas"
                      className="text-black hover:opacity-70"
                      onClick={() => setModalNotas(p)}
                    >
                      <BiCommentDetail size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!proyectos.length && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aún no hay proyectos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* botón flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="rounded-full bg-blue-600 p-4 text-white shadow-lg hover:bg-blue-700"
          onClick={toggleMenu}
        >
          <FaPlus />
        </button>

        {menuOpen && (
          <div className="absolute bottom-0 right-16 w-64 space-y-2 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
            <button
              className="flex w-full items-center gap-2 text-left text-sm text-gray-800 hover:text-blue-600"
              onClick={() => { setOpenCrear(true); setMenuOpen(false); }}   // <-- abrir modal
            >
              <FaProjectDiagram /> Crear Proyecto
            </button>
            <button className="flex w-full items-center gap-2 text-left text-sm text-gray-800 hover:text-blue-600"
              onClick={() => { setOpenOrg(true); setMenuOpen(false); }}>
              <FaSitemap /> Organigrama (Roles)
            </button>
            <button className="flex w-full items-center gap-2 text-left text-sm text-gray-800 hover:text-blue-600"
              onClick={() => { setOpenUsers(true); setMenuOpen(false); }}>
              <FaUsers /> Gestión de Usuarios
            </button>
          </div>
        )}
      </div>

      {/* modales */}
      {modalNotas && (
        <NotasModal proyecto={modalNotas} onClose={() => setModalNotas(null)} />
      )}
      {openOrg && (
        <OrganigramaModal
          data={organigrama}
          setData={setOrganigrama}
          usuarios={usuarios}
          setUsuarios={setUsuarios}
          onClose={() => setOpenOrg(false)}
        />
      )}
      {openUsers && (
        <UsuariosModal
          data={usuarios}
          setData={setUsuarios}
          roles={organigrama}
          onClose={() => setOpenUsers(false)}
        />
      )}

      {/* 4) props correctas para el modal: org/users */}
      {openCrear && (
        <CrearProyectoModal
          org={organigrama}
          users={usuarios}
          onCreate={onCreateProject}
          onClose={() => setOpenCrear(false)}
        />
      )}
    </div>
  );
}


