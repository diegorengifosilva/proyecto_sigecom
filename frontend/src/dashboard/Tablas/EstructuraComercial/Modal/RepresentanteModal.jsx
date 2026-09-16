import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InputField from "@/components/ui/InputField";
import SelectField from "@/components/ui/SelectField";
import { UserCheck, Save, Mail, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export default function RepresentanteModal({ open, onClose, onGuardar, onEliminar, repData, representantes = [] }) {
    const [formData, setFormData] = useState({});

    // Cargamos las empresas para el Select
    const { data: empresas = [] } = useQuery({
        queryKey: ["maestra-clientes-nombres"],
        queryFn: async () => {
            const { data } = await api.get("core/clientes/");
            return data.map(c => ({
                id: c.id_cliente,
                nombre: c.nombre
            }));
        },
        enabled: open
    });

    useEffect(() => {
        if (open) {
            if (repData) {
                // MODO EDICIÓN
                setFormData({
                    ...repData,
                    codigo: repData.id_rep_formateado || String(repData.id_representante).padStart(5, '0'),
                    nombre_representante: repData.nombre_representante || repData.representante || "",
                    id_cliente: repData.id_cliente || "",
                    cargo: repData.cargo || "",
                    telefono: repData.telefono || "",
                    movil: repData.movil || "",
                    email: repData.email || "",
                    direccion: repData.direccion || "",
                    activo: repData.activo === true || repData.activo === 1 || repData.activo === "1" ? "1" : "0",
                });
            } else {
                setFormData({
                    codigo: "Auto",
                    nombre_representante: "",
                    cargo: "",
                    telefono: "",
                    movil: "",
                    email: "",
                    id_cliente: empresas[0]?.id || "",
                    direccion: "",
                    activo: "1",
                });
            }
        }
    }, [open, repData, empresas]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (checked ? "1" : "0") : value,
        }));
    };

    const handleSubmit = () => {
        if (!formData.nombre_representante?.trim()) {
            alert("El nombre del representante es obligatorio");
            return;
        }
        if (!formData.id_cliente) {
            alert("Debe seleccionar una empresa cliente");
            return;
        }

        const payload = {
            id_cliente: parseInt(formData.id_cliente),
            nombre_representante: formData.nombre_representante,
            cargo: formData.cargo || "",
            telefono: formData.telefono || "",
            movil: formData.movil || "",
            email: formData.email || "",
            direccion: formData.direccion || "",
            activo: formData.activo === "1" || formData.activo === 1 ? 1 : 0
        };

        if (repData?.id_representante) {
            payload.id_representante = repData.id_representante;
        }

        onGuardar(payload);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">

                {/* HEADER */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                            <UserCheck size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                {repData ? "Editar Representante" : "Nuevo Representante"}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                Gestión de contactos por empresa
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {/* BLOQUE 1: INFORMACIÓN PROFESIONAL */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Identificación y Cargo
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
                                label="Cargo:"
                                name="cargo"
                                value={formData.cargo || ""}
                                onChange={handleChange}
                                inline size="sm"
                                className="font-bold text-slate-800"
                            />
                        </div>

                        <InputField
                            label="Representante:"
                            name="nombre_representante"
                            value={formData.nombre_representante || ""}
                            onChange={handleChange}
                            inline size="sm"
                            className="font-bold text-slate-800"
                        />
                    </div>

                    {/* BLOQUE 2: CONTACTO */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Medios de Contacto
                        </span>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Teléfono:"
                                name="telefono"
                                value={formData.telefono || ""}
                                onChange={handleChange}
                                inline size="sm"
                            />
                            <InputField
                                label="Móvil:"
                                name="movil"
                                value={formData.movil || ""}
                                onChange={handleChange}
                                inline size="sm"
                                className="font-bold text-slate-800"
                            />
                        </div>

                        <InputField
                            label="Email:"
                            name="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={handleChange}
                            inline size="sm"
                            icon={<Mail size={14} className="text-slate-400" />}
                        />
                    </div>

                    {/* BLOQUE 3: VINCULACIÓN Y ESTADO */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block border-b border-slate-200 pb-2">
                            Vinculación Laboral y Estado
                        </span>

                        <SelectField
                            label="Empresa:"
                            name="id_cliente"
                            value={formData.id_cliente || ""}
                            onChange={handleChange}
                            inline size="sm"
                            options={empresas}
                        />

                        <InputField
                            label="Dirección:"
                            name="direccion"
                            value={formData.direccion || ""}
                            onChange={handleChange}
                            inline size="sm"
                        />

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
                    {repData && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (window.confirm(`¿Estás seguro de eliminar a ${formData.nombre_representante}?`)) {
                                    onEliminar(repData.id_representante);
                                }
                            }}
                            className="mr-auto text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        Cancelar
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        className="text-[11px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-10 px-8 shadow-lg shadow-cyan-100 flex items-center gap-2 transition-all"
                    >
                        <Save size={16} />
                        Guardar Representante
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}