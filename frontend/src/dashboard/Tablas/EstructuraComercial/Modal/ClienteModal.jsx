import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/InputField";
import SelectField from "@/components/ui/SelectField";
import { Building2, Save, Trash2 } from "lucide-react";
import api from "../../../../services/api";
import { generarIniciales } from "@/utils/formatters";

export default function ClienteModal({ open, onClose, onGuardar, onEliminar, clienteData, clientes = [] }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (open) {
            if (clienteData) {
                // MODO EDICIÓN
                setFormData({
                    ...clienteData,
                    activo: String(clienteData.activo === true || clienteData.activo === "1" ? "1" : "0"),
                });
            } else {
                // MODO NUEVO: Cálculo del siguiente código
                const codigosNumericos = clientes
                    .map(c => parseInt(c.codigo))
                    .filter(n => !isNaN(n));

                const proximoCodigo = codigosNumericos.length > 0
                    ? Math.max(...codigosNumericos) + 1
                    : 10001;

                setFormData({
                    codigo: String(proximoCodigo),
                    nombre: "",
                    iniciales: "",
                    ruc: "",
                    dir: "",
                    tipo: "1",
                    forma_pago: "",
                    fecha: new Date().toISOString().split('T')[0],
                    rub: "",
                    eva: "",
                    web: "",
                    rleg: "",
                    ubic: "",
                    logo: "",
                    activo: "1",
                });
            }
        }
    }, [open, clienteData, clientes]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Bloqueo de longitud para RUC
        if (name === "ruc" && value.length > 11) return;

        setFormData((prev) => {
            const nextData = {
                ...prev,
                [name]: name === "activo"
                    ? (checked ? "1" : "0")
                    : (type === "checkbox" ? (checked ? "1" : "0") : value),
            };
            if (name === "nombre" && (!prev.iniciales || prev.iniciales === generarIniciales(prev.nombre || ""))) {
                nextData.iniciales = generarIniciales(value);
            }
            return nextData;
        });
    };

    const handleSubmit = () => {
        if (!formData.nombre?.trim()) {
            alert("El nombre de la empresa es obligatorio");
            return;
        }

        // VALIDACIÓN EXACTA
        if (!formData.ruc || formData.ruc.length !== 11) {
            alert("El RUC debe tener exactamente 11 dígitos");
            return;
        }

        const dataParaEnviar = {
            ...formData,
            // Convertimos a entero para evitar el error 1366 de MySQL
            codigo: parseInt(formData.codigo),
            // Si tienes otros campos numéricos como 'tipo', asegúralos también
            tipo: parseInt(formData.tipo)
        };

        onGuardar(dataParaEnviar);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
                {/* HEADER */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                            <Building2 size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                {clienteData ? "Editar Empresa" : "Nueva Empresa / Cliente"}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                Mantenimiento de registro maestro
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {/* BLOQUE 1: IDENTIFICACIÓN */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Identificación y Razón Social
                        </span>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Código:"
                                name="codigo"
                                value={formData.codigo || ""}
                                readOnly
                                inline size="sm"
                                className="bg-transparent border-none font-mono font-bold text-slate-500"
                            />
                            <InputField
                                label="RUC:"
                                name="ruc"
                                value={formData.ruc || ""}
                                onChange={handleChange}
                                inline size="sm"
                                className="font-bold text-slate-800"
                            />
                        </div>

                        <InputField
                            label="Nombre:"
                            name="nombre"
                            value={formData.nombre || ""}
                            onChange={handleChange}
                            inline size="sm"
                            className="font-bold text-slate-800"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Iniciales:"
                                name="iniciales"
                                value={formData.iniciales || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                            <SelectField
                                label="Tipo:"
                                name="tipo"
                                value={formData.tipo || ""}
                                onChange={handleChange}
                                inline size="sm"
                                options={[
                                    { id: "0", nombre: "Cliente" },
                                    { id: "1", nombre: "Proveedor" },
                                    { id: "2", nombre: "Cliente / Proveedor" },
                                ]}
                            />
                        </div>
                    </div>

                    {/* BLOQUE 2: DATOS OPERATIVOS */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Información de Contacto y Operación
                        </span>

                        <InputField
                            label="Dirección:"
                            name="dir"
                            value={formData.dir || ""}
                            onChange={handleChange}
                            inline size="sm"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Ubicación:"
                                name="ubic"
                                value={formData.ubic || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                            <InputField
                                label="Página Web:"
                                name="web"
                                value={formData.web || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                        </div>
                    </div>

                    {/* BLOQUE 3: COMERCIAL Y ESTADO */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Detalles Comerciales
                        </span>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Forma Pago:"
                                name="forma_pago"
                                value={formData.forma_pago || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                            <InputField
                                label="Fecha Reg:"
                                name="fecha"
                                type="date"
                                value={formData.fecha || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                        </div>

                        <div className="flex items-center gap-4 py-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                                Estado Activo:
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="activo"
                                    checked={formData.activo === "1"}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                <span className={`ml-2 text-[10px] font-black uppercase ${formData.activo === "1" ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.activo === "1" ? 'Activo' : 'Inactivo'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">

                    {/* BOTÓN ELIMINAR: Solo se muestra si estamos editando */}
                    {clienteData && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (window.confirm(`¿Estás seguro de eliminar a ${formData.nombre}?`)) {
                                    onEliminar(formData.codigo);
                                }
                            }}
                            className="mr-auto text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} /> {/* No olvides importar Trash2 de lucide-react */}
                            Eliminar
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 rounded-xl"
                    >
                        Cancelar
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        className="text-[11px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-10 px-8 shadow-lg shadow-cyan-100 flex items-center gap-2"
                    >
                        <Save size={16} />
                        Guardar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}