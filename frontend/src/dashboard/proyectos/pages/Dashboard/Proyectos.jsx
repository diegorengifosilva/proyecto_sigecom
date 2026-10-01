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
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FolderKanban,
  CalendarClock,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpRight,
  Search,
  Plus,
  RefreshCw,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { proyectosService } from "../../api";
import { matchesSearch } from "../../../../utils/search";
import TabCronogramaGeneral from "./mis_proyectos/TabCronogramaGeneral";
import TabCostosGeneral from "./mis_proyectos/TabCostosGeneral";
import TabRecursosGeneral from "./mis_proyectos/TabRecursosGeneral";
import TabAvanceGeneral from "./mis_proyectos/TabAvanceGeneral";





/* ====================== utilidades b\u00e1sicas ====================== */
// --- Persistencia local SOLO para organigrama y usuarios ---
const K_ORG = "pm.organigrama";
const K_USERS = "pm.usuarios";

// --- load/save gen\u00e9ricos ---
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
  "Planificaci\u00f3n",
  "Ejecuci\u00f3n",
  "Cierre",
  "Cerrado",
  "Pausado",
];

const PAGE_SIZE = 10;

function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

// === Monedas, UNs y formateo ===

const MONEDAS = [

  { value: "USD", label: "USD $" },

  { value: "PEN", label: "PEN S/." },

];



const UNIDADES_NEGOCIO = ["Miner\u00eda", "Petroqu\u00edmica", "Industria", "Safety"];



const fmtMoney = (n, currency = "USD") =>

  isNaN(n)

    ? "-"

    : new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-PE", {

        style: "currency",

        currency,

        maximumFractionDigits: 0,

      }).format(Number(n || 0));



const normalizeText = (value = "") =>

  value

    .toString()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, " ")

    .trim()

    .replace(/\s+/g, " ");



// Fecha ISO a dd/mm/yyyy sin convertir zona horaria.

const fmtDMY = (iso) => {

  if (!iso) return "";
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;

};



// Suma segura

const num = (v) => Number(v || 0);



/* ====================== componentes UI peque�os ====================== */

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

const ORG_SEED = [

  { codigo: "0254", rol: "Gerencia General", dependencia: "" },

  { codigo: "02541", rol: "Gerencia Comercial", dependencia: "0254" },

  { codigo: "02542", rol: "Gerencia de Proyectos", dependencia: "0254" },

  { codigo: "02543", rol: "Gerencia HSEQ", dependencia: "0254" },

  { codigo: "02544", rol: "Gerencia de Administraci�n", dependencia: "0254" },

  { codigo: "025421", rol: "Coordinador de Proyectos", dependencia: "02542" },

  { codigo: "025422", rol: "L�der de proyecto", dependencia: "02542" },

  { codigo: "025423", rol: "Ing. de Servicios", dependencia: "02542" },

  { codigo: "025424", rol: "Ing. de Aplicaciones", dependencia: "02542" },

  { codigo: "025425", rol: "Tec. Electromec�nico", dependencia: "02542" },

  { codigo: "025441", rol: "Compras", dependencia: "02544" },

  { codigo: "025442", rol: "Recursos Humanos", dependencia: "02544" },

  { codigo: "025443", rol: "Log�stica", dependencia: "02544" },

  { codigo: "025444", rol: "Caja Chica", dependencia: "02544" },

];



const USERS_SEED = [

  {

    nombre: "Juan Jos� Castillo M.",

    email: "juan.castillo@vc-corporation.com",

    pais: "Per�",

    rol: "Gerencia General",

    verificado: true,

  },

  {

    nombre: "Frank De La Cruz",

    email: "frank.delacruz@vc-corporation.com",

    pais: "Per�",

    rol: "Gerencia de Proyectos",

    verificado: true,

  },

  {

    nombre: "Ruth Guadalupe",

    email: "ruth.guadalupe@vc-corporation.com",

    pais: "Per�",

    rol: "Coordinador de Proyectos",

    verificado: false,

  },

  {

    nombre: "Cristina Mart�nez V.",

    email: "compras@vc-corporation.com",

    pais: "Per�",

    rol: "Compras",

    verificado: false,

  },

];



/* ====================== Nuevo: �rea de proyectos ====================== */

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

  return roles; // nombres de rol del �rea de proyectos

}

function getEligibleLeaders(org, users) {

  const roles = getProjectAreaRoles(org);

  return users.filter((u) => roles.has(u.rol));

}



/* ====================== modales funcionales ====================== */

function NotasModal({ proyecto, onClose }) {
  const notas = Array.isArray(proyecto?.notas) ? proyecto.notas : [];

  return (
    <Modal title="Notas del proyecto" onClose={onClose} width="max-w-2xl">

      <div className="space-y-2">

        {notas.length ? (
          notas.map((n) => (
            <div
              key={n.id || `${n.titulo}-${n.fecha_creacion}`}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="font-semibold text-gray-800">
                {n.titulo || 'Sin t?tulo'}
              </div>
              {n.contenido && (
                <div className="text-gray-700 mt-1">{n.contenido}</div>
              )}
              <div className="text-xs text-gray-500 mt-1 flex gap-3">
                <span className="capitalize">{n.categoria || 'general'}</span>
                <span>{n.autor || 'An?nimo'}</span>
                <span>{(n.fecha_creacion || '').slice(0, 10)}</span>
              </div>
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



  // opciones de dependencia (ra�z + todos los c�digos)

  const depOptions = useMemo(() => {

    const base = [{ value: "", label: " Ra�z " }];



    const lista = data

      .filter((_, idx) => (editIndex >= 0 ? idx !== editIndex : true))

      .map((n) => ({ value: n.codigo, label: `${n.codigo}  ${n.rol}` }));



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

      alert("Ese c�digo ya existe.");

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



    // si cambi� el c�digo, actualizar dependencias hijas

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

        `�Eliminar el rol "${nodo.rol}" (${nodo.codigo})?\n` +

          " Sus dependientes se mover�n a Ra�z.\n" +

          " Los usuarios que tengan este rol quedar�n sin rol asignado."

      )

    )

      return;



    // 1) mover hijos a ra�z

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

    <Modal title="Organigrama  Roles y Dependencias" onClose={onClose}>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <Input label="C�digo" value={codigo} onChange={setCodigo} />

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

              <th className="px-4 py-2">C�digo</th>

              <th className="px-4 py-2">Rol</th>

              <th className="px-4 py-2">Dependencia</th>

              <th className="px-4 py-2 text-center">Acci�n</th>

            </tr>

          </thead>

          <tbody>

            {data.map((n, idx) => (

              <tr key={n.codigo} className="border-t">

                <td className="px-4 py-2">{n.codigo}</td>

                <td className="px-4 py-2">{n.rol}</td>

                <td className="px-4 py-2">

                  {n.dependencia ? n.dependencia : ""}

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

  const [pais, setPais] = useState("Per�");

  const [rol, setRol] = useState("");

  const [verificado, setVerificado] = useState(false);

  const [editIndex, setEditIndex] = useState(-1);



  const rolOptions = useMemo(

    () =>

      [{ value: "", label: "Seleccione" }].concat(

        roles.map((r) => ({ value: r.rol, label: r.rol }))

      ),

    [roles]

  );



  const limpiar = () => {

    setNombre("");

    setEmail("");

    setPais("Per�");

    setRol("");

    setVerificado(false);

    setEditIndex(-1);

  };



  const agregar = () => {

    if (!nombre.trim() || !emailOK(email)) {

      alert("Completa nombre y un email v�lido.");

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

      alert("Completa nombre y un email v�lido.");

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

    if (!confirm(`�Eliminar al usuario "${u.nombre}"?`)) return;

    setData((prev) => prev.filter((_, i) => i !== idx));

    if (editIndex === idx) limpiar();

  };



  const valido = nombre.trim() && emailOK(email);



  return (

    <Modal title="Gesti�n  Usuarios" onClose={onClose}>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

        <Input label="Nombres" value={nombre} onChange={setNombre} />

        <Input label="Email" value={email} onChange={setEmail} />

        <Select

          label="Pa�s"

          value={pais}

          onChange={setPais}

          options={[

            { value: "Per�", label: "Per�" },

            { value: "Chile", label: "Chile" },

            { value: "Colombia", label: "Colombia" },

            { value: "M�xico", label: "M�xico" },

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

              <th className="px-4 py-2">Pa�s</th>

              <th className="px-4 py-2">Rol</th>

              <th className="px-4 py-2">Verificado</th>

              <th className="px-4 py-2 text-center">Acci�n</th>

            </tr>

          </thead>

          <tbody>

            {data.map((u, idx) => (

              <tr key={`${u.email}-${idx}`} className="border-t">

                <td className="px-4 py-2">{u.nombre}</td>

                <td className="px-4 py-2">{u.email}</td>

                <td className="px-4 py-2">{u.pais}</td>

                <td className="px-4 py-2">{u.rol || ""}</td>

                <td className="px-4 py-2">{u.verificado ? "S�" : "No"}</td>

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

  // b�sicos

  const [codigo, setCodigo] = useState("");

  const [nombre, setNombre] = useState("");

  const [cliente, setCliente] = useState("");

  const [estado, setEstado] = useState("Apertura");

  const [unidadNegocio, setUnidadNegocio] = useState("Miner�a");

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

  const liderOptions = [{ value: "", label: " Sin asignar " }].concat(

    elegibles.map((u) => ({ value: u.email, label: `${u.nombre}  ${u.rol}` }))

  );



  // validaci�n m�nima de apertura

  const valido = codigo.trim() && nombre.trim() && inicio && fin;



  const guardar = () => {

    if (!valido) return;

    onCreate({

      // b�sicos

      codigo: codigo.trim(),

      nombre: nombre.trim(),

      estado,

      cliente: cliente.trim(),

      unidad_negocio: unidadNegocio,

      lider_email: liderEmail,



      // fechas

      fecha_inicio: inicio,

      fecha_fin: fin,



      // costos

      moneda,

      presupuesto_gastos: Number(presupuesto || 0),

      presupuesto_hh: Number(presupuestoHH || 0),

      presupuesto_contingencia: Number(contingenciaMonto || 0),

      presupuesto_utilidad: Number(utilidad || 0),



      // contacto

      contacto_cliente_nombre: contactoNombre.trim(),

      contacto_cliente_email: contactoEmail.trim(),

      contacto_cliente_telefono: contactoTelefono.trim(),



      // notas: serializadas como JSON string

      notas: JSON.stringify([]),

    });

    onClose();

  };



  return (

    <Modal title="Crear Proyecto" onClose={onClose}>

      {/* 2 columnas reales: cada fila = 1 par */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

        {/* fila 1 */}

        <Input label="C�digo del proyecto" value={codigo} onChange={setCodigo} />

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

        <Select label="L�der del Proyecto (�rea de Proyectos)" value={liderEmail} onChange={setLiderEmail}

                options={[{ value: "", label: " Sin asignar " }, ...elegibles.map(u => ({ value: u.email, label: `${u.nombre}  ${u.rol}` }))]} />

        <Input label="Contacto cliente  Nombres y apellidos" value={contactoNombre} onChange={setContactoNombre} />



        {/* fila 7 */}

        <Input label="Fecha de inicio" type="date" value={inicio} onChange={setInicio} />

        <Input label="Contacto cliente  Email" value={contactoEmail} onChange={setContactoEmail} />



        {/* fila 8 */}

        <Input label="Fecha fin" type="date" value={fin} onChange={setFin} />

        <Input label="Contacto cliente  Tel�fono" value={contactoTelefono} onChange={setContactoTelefono} />

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

/* ====================== página principal unificada - Mis Proyectos ====================== */

const fmtShortMoney = (val, currency = "USD") => {
  const n = Number(val || 0);
  const sym = currency === "USD" ? "$" : "S/.";
  if (Math.abs(n) >= 1_000_000) {
    return `${sym} ${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${sym} ${(n / 1_000).toFixed(1)}k`;
  }
  return `${sym} ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export default function Proyectos({ defaultTab = "general" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || defaultTab || "general";

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [organigrama, setOrganigrama] = useState(() => load(K_ORG, ORG_SEED));
  const [usuarios, setUsuarios] = useState(() => load(K_USERS, USERS_SEED));

  const [modalNotas, setModalNotas] = useState(null);
  const [openOrg, setOpenOrg] = useState(false);
  const [openUsers, setOpenUsers] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroMoneda, setFiltroMoneda] = useState("TODAS");
  const [pagina, setPagina] = useState(1);

  // Cargar proyectos desde API
  const cargarProyectos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectosService.listar();
      setProyectos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error cargando proyectos:", err);
      setError("Error al cargar proyectos: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProyectos();
  }, []);

  // Crear proyecto
  const onCreateProject = async (nuevo) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectosService.crear(nuevo);
      setProyectos((prev) => [...prev, response.data]);
      setOpenCrear(false);
    } catch (err) {
      console.error("Error creando proyecto:", err);
      setError("Error al crear proyecto: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Persistir organigrama y usuarios
  useEffect(() => save(K_ORG, organigrama), [organigrama]);
  useEffect(() => save(K_USERS, usuarios), [usuarios]);

  // Cálculos consolidados para los 5 KPIs
  const stats = useMemo(() => {
    if (!proyectos || proyectos.length === 0) {
      return {
        totalProyectos: 0,
        activos: 0,
        cerrados: 0,
        enEjecucion: 0,
        enPlanificacion: 0,
        totalPresupuesto: 0,
        totalGasto: 0,
        totalSaldo: 0,
        totalPV: 0,
        totalEV: 0,
        cpiGlobal: "1.00",
        spiGlobal: "1.00",
        enFecha: 0,
        enRiesgo: 0,
        cumplimientoPlazo: "100%",
        avanceGlobal: "0.0",
        totalRecursos: usuarios?.length || 14,
        lideresCount: 1,
        rolesCount: organigrama?.length || 14,
      };
    }

    let activos = 0;
    let cerrados = 0;
    let enEjecucion = 0;
    let enPlanificacion = 0;
    let totalPresupuesto = 0;
    let totalGasto = 0;
    let totalPV = 0;
    let totalEV = 0;
    let enFecha = 0;
    let enRiesgo = 0;
    let sumaAvances = 0;
    const lideresSet = new Set();

    proyectos.forEach((p) => {
      const estadoNorm = (p.estado || "").toLowerCase();
      const isCerrado = estadoNorm.includes("cerrad") || estadoNorm.includes("cierre");
      if (isCerrado) {
        cerrados++;
      } else {
        activos++;
      }

      if (estadoNorm.includes("ejecu")) enEjecucion++;
      if (estadoNorm.includes("planifi") || estadoNorm.includes("inicio") || estadoNorm.includes("apertur")) enPlanificacion++;

      const ppto = num(p.presupuesto_gastos) + num(p.presupuesto_hh) + num(p.presupuesto_contingencia) + num(p.presupuesto_utilidad);
      const gasto = num(p.gasto_real) + num(p.costo_hh_real);
      totalPresupuesto += ppto;
      totalGasto += gasto;

      let av = 0;
      if (p.porcentaje_avance !== undefined && p.porcentaje_avance !== null) {
        av = Number(p.porcentaje_avance);
      } else {
        const start = p.fecha_inicio ? new Date(p.fecha_inicio).getTime() : 0;
        const end = p.fecha_fin ? new Date(p.fecha_fin).getTime() : 0;
        const now = Date.now();
        if (start && end && end > start) {
          av = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
        } else if (isCerrado) {
          av = 100;
        } else {
          av = 35;
        }
      }
      sumaAvances += av;

      const pv = (ppto * av) / 100;
      const ev = gasto > 0 ? (ppto * av) / 100 : pv;
      totalPV += pv;
      totalEV += ev;

      const spi = pv > 0 ? (ev / pv) : 1;
      if (spi >= 0.95 || isCerrado) {
        enFecha++;
      } else {
        enRiesgo++;
      }

      const lider = p.lider || p.lider_proyecto || p.responsable;
      if (lider) lideresSet.add(lider);
    });

    const cpi = totalGasto > 0 ? (totalEV / totalGasto) : 1.0;
    const spi = totalPV > 0 ? (totalEV / totalPV) : 1.0;
    const avanceGlobal = proyectos.length > 0 ? (sumaAvances / proyectos.length).toFixed(1) : "0.0";
    const cumplimientoPlazo = proyectos.length > 0 ? Math.round((enFecha / proyectos.length) * 100) : 100;

    return {
      totalProyectos: proyectos.length,
      activos,
      cerrados,
      enEjecucion,
      enPlanificacion,
      totalPresupuesto,
      totalGasto,
      totalSaldo: totalPresupuesto - totalGasto,
      totalPV,
      totalEV,
      cpiGlobal: cpi.toFixed(2),
      spiGlobal: spi.toFixed(2),
      enFecha,
      enRiesgo,
      cumplimientoPlazo: `${cumplimientoPlazo}%`,
      avanceGlobal,
      totalRecursos: Math.max(lideresSet.size * 3, usuarios?.length || 14),
      lideresCount: Math.max(lideresSet.size, 1),
      rolesCount: organigrama?.length || 14,
    };
  }, [proyectos, usuarios, organigrama]);

  // Filtrado de proyectos para la tabla
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => {
      const matchSearch =
        !busqueda ||
        matchesSearch(
          busqueda,
          p.codigo,
          p.nombre,
          p.cliente,
          p.responsable,
          p.lider,
          p.lider_proyecto
        );
      const matchEstado =
        filtroEstado === "TODOS" || (p.estado || "").toLowerCase() === filtroEstado.toLowerCase();
      const matchMoneda =
        filtroMoneda === "TODAS" || (p.moneda || "USD") === filtroMoneda;
      return matchSearch && matchEstado && matchMoneda;
    });
  }, [busqueda, filtroEstado, filtroMoneda, proyectos]);

  const totalPaginas = Math.max(1, Math.ceil(proyectosFiltrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const proyectosPagina = proyectosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);
  const desde = proyectosFiltrados.length ? (paginaActual - 1) * PAGE_SIZE + 1 : 0;
  const hasta = Math.min(paginaActual * PAGE_SIZE, proyectosFiltrados.length);
  const numerosPagina = pageWindow(paginaActual, totalPaginas);

  const tabs = [
    {
      id: "general",
      label: "Panel General",
      icon: FolderKanban,
      badge: stats.totalProyectos,
    },
    {
      id: "cronograma",
      label: "Cronograma",
      icon: CalendarClock,
      badge: stats.cumplimientoPlazo,
    },
    {
      id: "costos",
      label: "Costos y EVM",
      icon: DollarSign,
      badge: `${stats.cpiGlobal} CPI`,
    },
    {
      id: "recursos",
      label: "Recursos",
      icon: Users,
      badge: stats.totalRecursos,
    },
    {
      id: "avance",
      label: "Estado de Avance",
      icon: TrendingUp,
      badge: `${stats.avanceGlobal}%`,
    },
  ];

  return (
    <div className="space-y-4 font-sans projects-module-scope p-1 sm:p-2">
      {/* 1. HEADER CORPORATIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Mis Proyectos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cartera Activa
            </span>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setOpenOrg(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all"
            title="Organigrama de roles"
          >
            <FaSitemap className="text-purple-600" />
            <span className="hidden sm:inline">Organigrama</span>
          </button>

          <button
            type="button"
            onClick={() => setOpenUsers(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all"
            title="Gestión de Personal"
          >
            <FaUsers className="text-indigo-600" />
            <span className="hidden sm:inline">Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setOpenCrear(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 h-9 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            Nuevo Proyecto
          </button>

          <button
            type="button"
            onClick={() => cargarProyectos()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-gray-200 bg-white shadow-sm"
            title="Refrescar lista"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVEGACIÓN HORIZONTAL ESTILO JIRA */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-3 sm:px-6">
        <div className="flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-teal-600 text-teal-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10.5px] font-black px-2 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? "bg-teal-50 text-teal-700 border border-teal-200/80"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 pl-4 py-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Portafolio Corporativo</span>
          </div>
        </div>
      </div>

      {/* 3. CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA */}
      {currentTab === "cronograma" && (
        <TabCronogramaGeneral
          proyectos={proyectos}
          onSelectProject={(id) => navigate(`/proyectos/mis-proyectos/${id}?tab=Tiempo`)}
        />
      )}

      {currentTab === "costos" && (
        <TabCostosGeneral
          proyectos={proyectos}
          onSelectProject={(id) => navigate(`/proyectos/mis-proyectos/${id}?tab=Costos`)}
        />
      )}

      {currentTab === "recursos" && (
        <TabRecursosGeneral
          proyectos={proyectos}
          organigrama={organigrama}
          usuarios={usuarios}
          onOpenOrg={() => setOpenOrg(true)}
          onOpenUsers={() => setOpenUsers(true)}
          onSelectProject={(id) => navigate(`/proyectos/mis-proyectos/${id}?tab=Recursos`)}
        />
      )}

      {currentTab === "avance" && (
        <TabAvanceGeneral
          proyectos={proyectos}
          onSelectProject={(id) => navigate(`/proyectos/mis-proyectos/${id}?tab=Informes`)}
        />
      )}

      {currentTab === "general" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Métricas consolidadas de Panel General (4 KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Cartera */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cartera Total</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{stats.totalProyectos} proyectos</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-emerald-600 block">Activos: {stats.activos}</span>
                <span className="text-slate-400 block">Cerrados: {stats.cerrados}</span>
              </div>
            </div>

            {/* 2. Presupuesto Total BAC */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Presupuesto (BAC)</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{fmtShortMoney(stats.totalPresupuesto)}</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-amber-600 block">Gasto: {fmtShortMoney(stats.totalGasto)}</span>
                <span className="text-emerald-600 block">Saldo: {fmtShortMoney(stats.totalSaldo)}</span>
              </div>
            </div>

            {/* 3. En Ejecución */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">En Ejecución</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{stats.enEjecucion} proyectos</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-purple-600 block">Planif.: {stats.enPlanificacion}</span>
                <span className="text-teal-600 block">Avance: {stats.avanceGlobal}%</span>
              </div>
            </div>

            {/* 4. Desempeño Global */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Desempeño</span>
                  <span className="text-xl font-black text-gray-900 leading-none">{stats.cumplimientoPlazo} a tiempo</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 hidden xl:block">
                <span className="text-indigo-600 block">SPI: {stats.spiGlobal}</span>
                <span className="text-emerald-600 block">CPI: {stats.cpiGlobal}</span>
              </div>
            </div>
          </div>

          <div className="projects-list">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-3 text-red-900 underline">
                Cerrar
              </button>
            </div>
          )}

          {/* Filtros para la tabla */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm mb-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="busqueda-proyectos"
                type="search"
                placeholder="Buscar por código, nombre, cliente o líder..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPagina(1);
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white"
              >
                <option value="TODOS">Todos los estados</option>
                {ESTADOS.map((est) => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>

              <select
                value={filtroMoneda}
                onChange={(e) => {
                  setFiltroMoneda(e.target.value);
                  setPagina(1);
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white"
              >
                <option value="TODAS">Todas las monedas</option>
                <option value="USD">USD $</option>
                <option value="PEN">PEN S/.</option>
              </select>
            </div>
          </div>

          {/* Tabla de proyectos */}
          <div className="projects-table-wrap">
            <table className="projects-table">
              <colgroup>
                <col className="col-codigo" />
                <col className="col-cliente" />
                <col className="col-nombre" />
                <col className="col-estado" />
                <col className="col-fecha" />
                <col className="col-fecha" />
                <col className="col-monto" />
                <col className="col-monto" />
                <col className="col-monto" />
                <col className="col-notas" />
              </colgroup>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th className="is-num">Presupuesto</th>
                  <th className="is-num">Programado</th>
                  <th className="is-num">Saldo</th>
                  <th className="is-center">Notas</th>
                </tr>
              </thead>
              <tbody>
                {proyectosPagina.map((p) => {
                  const moneda = p.moneda || "USD";
                  const totalPresupuesto =
                    num(p.presupuesto_gastos) +
                    num(p.presupuesto_hh) +
                    num(p.presupuesto_contingencia) +
                    num(p.presupuesto_utilidad);
                  const programado = num(p.gasto_real) + num(p.costo_hh_real);
                  const saldo = totalPresupuesto - programado;
                  const notas = Array.isArray(p.notas) ? p.notas : [];

                  return (
                    <tr key={p.id || p.codigo}>
                      <td>
                        <button
                          type="button"
                          className="projects-table-code"
                          title={p.codigo}
                          onClick={() => navigate(`/proyectos/mis-proyectos/${p.id}`)}
                        >
                          {p.codigo}
                        </button>
                      </td>
                      <td title={p.cliente || ""}>{p.cliente || ""}</td>
                      <td title={p.nombre || ""}>{p.nombre}</td>
                      <td>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            (p.estado || "").toLowerCase().includes("ejecu")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : (p.estado || "").toLowerCase().includes("planifi")
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : (p.estado || "").toLowerCase().includes("inicio") || (p.estado || "").toLowerCase().includes("apertur")
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td>{fmtDMY(p.fecha_inicio)}</td>
                      <td>{fmtDMY(p.fecha_fin)}</td>
                      <td className="is-num" title={fmtMoney(totalPresupuesto, moneda)}>
                        {fmtMoney(totalPresupuesto, moneda)}
                      </td>
                      <td className="is-num" title={fmtMoney(programado, moneda)}>
                        {fmtMoney(programado, moneda)}
                      </td>
                      <td className="is-num" title={fmtMoney(saldo, moneda)}>
                        {fmtMoney(saldo, moneda)}
                      </td>
                      <td className="is-center">
                        <button
                          type="button"
                          className="projects-table-notes"
                          title="Ver notas"
                          onClick={() => setModalNotas({ ...p, notas })}
                        >
                          <BiCommentDetail size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!proyectosFiltrados.length && (
                  <tr>
                    <td colSpan={10} className="is-empty">
                      Aún no hay proyectos con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {proyectosFiltrados.length > 0 && (
            <div className="projects-pagination" aria-label="Paginación de proyectos">
              <span className="projects-pagination-count">
                Mostrando {desde}–{hasta} de {proyectosFiltrados.length}
              </span>
              <div className="projects-pagination-controls">
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => setPagina(paginaActual - 1)}
                >
                  Anterior
                </button>
                {numerosPagina.map((n, i) => {
                  const prev = numerosPagina[i - 1];
                  return (
                    <span key={n} className="projects-pagination-pages">
                      {prev && n - prev > 1 && <span className="projects-pagination-ellipsis">…</span>}
                      <button
                        type="button"
                        className={n === paginaActual ? "is-active" : ""}
                        onClick={() => setPagina(n)}
                        aria-current={n === paginaActual ? "page" : undefined}
                      >
                        {n}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Modales */}
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




