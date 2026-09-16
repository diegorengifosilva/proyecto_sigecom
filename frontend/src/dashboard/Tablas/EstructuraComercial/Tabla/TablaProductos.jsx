import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader, Search, Plus, Edit2, Trash2, ShoppingBag, Tag 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InputField from "@/components/ui/InputField";
import useResponsivePageSize from "@/hook/useResponsivePageSize";

const fetchMarcas = async () => {
  const { data } = await api.get("core/tipo_marca/");
  return Array.isArray(data) ? data : [];
};

const fetchMedidas = async () => {
  const { data } = await api.get("core/unidades_medida/");
  return Array.isArray(data) ? data : [];
};

const fetchProductosPorMarca = async ({ queryKey }) => {
  const [_, marcaId, search, page, pageSize] = queryKey;
  if (!marcaId) return { data: [], total: 0, total_pages: 1 };
  const { data } = await api.get("core/productos/", {
    params: {
      id_marca: marcaId === "TODAS" ? undefined : marcaId,
      search: search || undefined,
      page: page || 1,
      page_size: pageSize || 15
    }
  });
  return data;
};

export default function TablaProductos() {
  const queryClient = useQueryClient();
  const [pageSize, tableAreaRef] = useResponsivePageSize();
  const [selectedMarcaId, setSelectedMarcaId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    id_marca: "",
    codigo: "",
    codigo2: "",
    nombre: "",
    precio_dolares: "",
    precio_soles: "",
    id_medida: "",
    activo: true
  });

  // Queries
  const { data: marcas = [], isLoading: loadingMarcas } = useQuery({
    queryKey: ["maestra-marcas-short"],
    queryFn: fetchMarcas
  });

  const { data: medidas = [] } = useQuery({
    queryKey: ["maestra-medidas-short"],
    queryFn: fetchMedidas
  });

  // Automatically select first brand on load
  useEffect(() => {
    if (marcas.length > 0 && !selectedMarcaId) {
      setSelectedMarcaId(marcas[0].id_marca);
    }
  }, [marcas, selectedMarcaId]);

  // Reset page when brand or search changes
  useEffect(() => {
    setProductPage(1);
  }, [selectedMarcaId, productSearch]);

  const { data: productsData = { data: [], total: 0, total_pages: 1 }, isLoading: loadingProducts, isFetching } = useQuery({
    queryKey: ["maestra-productos-list", selectedMarcaId, productSearch, productPage, pageSize],
    queryFn: fetchProductosPorMarca,
    enabled: !!selectedMarcaId
  });

  useEffect(() => {
    const max = Math.max(1, productsData.total_pages || 1);
    setProductPage((p) => Math.min(p, max));
  }, [pageSize, productsData.total_pages]);

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const formatted = {
        ...payload,
        id_marca: payload.id_marca || selectedMarcaId,
        precio_dolares: parseFloat(payload.precio_dolares) || 0,
        precio_soles: parseFloat(payload.precio_soles) || 0
      };
      if (selectedProduct) {
        return await api.put("core/productos/", {
          id_producto: selectedProduct.id_producto,
          ...formatted
        });
      } else {
        return await api.post("core/productos/", formatted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-productos-list"]);
      toast.success(selectedProduct ? "Producto actualizado correctamente" : "Producto registrado con éxito");
      setModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al guardar el producto";
      toast.error(msg);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId) => {
      return await api.delete("core/productos/", {
        data: { id_producto: productId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-productos-list"]);
      toast.success("Producto desactivado correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar el producto";
      toast.error(msg);
    }
  });

  const handleNew = () => {
    setSelectedProduct(null);
    setProductForm({
      id_marca: selectedMarcaId !== "TODAS" ? selectedMarcaId : (marcas[0]?.id_marca || ""),
      codigo: "",
      codigo2: "",
      nombre: "",
      precio_dolares: "",
      precio_soles: "",
      id_medida: medidas[0]?.id_medida || "",
      activo: true
    });
    setModalOpen(true);
  };

  const handleEdit = (prod, e) => {
    if (e) e.stopPropagation();
    setSelectedProduct(prod);
    setProductForm({
      id_marca: prod.id_marca || selectedMarcaId,
      codigo: prod.codigo || "",
      codigo2: prod.codigo2 || "",
      nombre: prod.nombre || "",
      precio_dolares: prod.precio_dolares || "",
      precio_soles: prod.precio_soles || "",
      id_medida: prod.id_medida || "",
      activo: prod.activo === 1 || prod.activo === "1" || prod.activo === true
    });
    setModalOpen(true);
  };

  const handleDelete = (prod, e) => {
    if (e) e.stopPropagation();
    if (confirm(`¿Está seguro de desactivar el producto "${prod.nombre}"?`)) {
      deleteMutation.mutate(prod.id_producto);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      
      {/* TOOLBAR UNIFICADO: FILTRO DE MARCA Y BÚSQUEDA A LA IZQUIERDA, BOTÓN ACCIÓN A LA DERECHA */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 max-w-xl">
          {/* Selector de marca */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedMarcaId}
              onChange={(e) => setSelectedMarcaId(e.target.value)}
              className="w-full h-8.5 pl-3 pr-8 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg focus:outline-none focus:border-cyan-600 shadow-xs"
            >
              {marcas.map(m => (
                <option key={m.id_marca} value={m.id_marca}>
                  Marca: {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda de producto */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Buscar por código o descripción..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-8 bg-white border-slate-200 text-xs h-8.5 rounded-lg shadow-xs"
            />
          </div>
        </div>

        <Button
          onClick={handleNew}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-8.5 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus size={14} strokeWidth={3} />
          Nuevo Producto
        </Button>
      </div>

      {/* CONTENEDOR DE TABLA */}
      <div ref={tableAreaRef} className="flex-1 min-h-0 overflow-hidden relative border border-slate-150 rounded-xl bg-white shadow-xs flex flex-col">
        {(loadingProducts || isFetching || saveMutation.isPending || deleteMutation.isPending) && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-8 h-8 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
            </div>
          </div>
        )}

        <Table
          disablePagination={false}
          pagination={{
            currentPage: productPage,
            totalPages: productsData.total_pages || 1,
            total: productsData.total || 0,
            from: productsData.total > 0 ? (productPage - 1) * pageSize + 1 : 0,
            to: Math.min(productPage * pageSize, productsData.total || 0),
            onPageChange: (p) => setProductPage(p)
          }}
          headers={[
            "P/N / Código", "Código Alternativo", "Descripción / Nombre", "Precio Base", "U.M.", "Estado", "Acciones"
          ]}
          data={productsData.data || []}
          onRowClick={handleEdit}
          renderRow={(prod) => {
            const isActivo = prod.activo === 1 || prod.activo === "1" || prod.activo === true;
            const medNombre = medidas.find(m => m.id_medida === prod.id_medida)?.nombre || prod.id_medida || "U.M.";

            return [
              <span key="cod" className="text-xs font-bold text-slate-800 text-center block font-mono">
                {prod.codigo}
              </span>,
              <span key="cod2" className="text-xs font-semibold text-slate-500 text-center block font-mono">
                {prod.codigo2 || "-"}
              </span>,
              <span key="nom" className="text-xs font-medium text-slate-700 text-left block px-4 truncate max-w-[300px]">
                {prod.nombre}
              </span>,
              <div key="pre" className="flex flex-col text-center">
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  ${Number(prod.precio_dolares || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                {prod.precio_soles > 0 && (
                  <span className="text-[10px] font-medium text-slate-400 font-mono">
                    S/ {Number(prod.precio_soles).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>,
              <span key="um" className="text-[10px] font-bold text-slate-500 text-center block uppercase bg-slate-100 rounded px-1.5 py-0.5 mx-auto w-fit">
                {medNombre}
              </span>,
              <div key="est" className="flex justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  isActivo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                  {isActivo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>,
              <div key="acc" className="flex items-center justify-center gap-2">
                <button
                  onClick={(e) => handleEdit(prod, e)}
                  title="Editar Producto"
                  className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={(e) => handleDelete(prod, e)}
                  title="Desactivar Producto"
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ];
          }}
        />
      </div>

      {/* MODAL PRODUCTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedProduct ? "Editar Producto" : "Nuevo Producto"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Catálogo técnico y precios base</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {/* Seleccionar Marca en Modal */}
            <div className="flex items-center gap-4 py-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[120px]">
                Marca:
              </label>
              <select
                value={productForm.id_marca}
                onChange={(e) => setProductForm(prev => ({ ...prev, id_marca: e.target.value }))}
                className="flex-1 h-8.5 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg focus:outline-none focus:border-cyan-600"
              >
                {marcas.map(m => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <InputField
              label="P/N / Código:"
              value={productForm.codigo}
              onChange={(e) => setProductForm(prev => ({ ...prev, codigo: e.target.value }))}
              placeholder="Ej. C9300-24P-A"
              inline
              size="sm"
              className="font-mono font-bold text-slate-800"
            />

            <InputField
              label="Código Alt:"
              value={productForm.codigo2}
              onChange={(e) => setProductForm(prev => ({ ...prev, codigo2: e.target.value }))}
              placeholder="Ej. ALT-001"
              inline
              size="sm"
              className="font-mono text-slate-700"
            />

            <InputField
              label="Descripción / Nombre:"
              value={productForm.nombre}
              onChange={(e) => setProductForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. SWITCH CISCO CATALYST 9300 24 PORT POE+..."
              inline
              size="sm"
              className="font-bold text-slate-800 uppercase"
            />

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Precio Base ($ USD):"
                type="number"
                step="0.01"
                value={productForm.precio_dolares}
                onChange={(e) => setProductForm(prev => ({ ...prev, precio_dolares: e.target.value }))}
                placeholder="0.00"
                inline
                size="sm"
                className="font-mono font-bold text-emerald-600"
              />
              <InputField
                label="Precio Base (S/ PEN):"
                type="number"
                step="0.01"
                value={productForm.precio_soles}
                onChange={(e) => setProductForm(prev => ({ ...prev, precio_soles: e.target.value }))}
                placeholder="0.00"
                inline
                size="sm"
                className="font-mono font-bold text-slate-700"
              />
            </div>

            {/* Unidad Medida */}
            <div className="flex items-center gap-4 py-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[120px]">
                Unidad de Medida:
              </label>
              <select
                value={productForm.id_medida}
                onChange={(e) => setProductForm(prev => ({ ...prev, id_medida: e.target.value }))}
                className="flex-1 h-8.5 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg focus:outline-none focus:border-cyan-600"
              >
                {medidas.map(m => (
                  <option key={m.id_medida} value={m.id_medida}>
                    {m.nombre} ({m.id_medida})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-4 py-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[120px]">
                  Estado:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={productForm.activo}
                    onChange={(e) => setProductForm(prev => ({ ...prev, activo: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700">
                    {productForm.activo ? "Activo" : "Inactivo"}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-8.5 px-4 text-xs font-bold text-slate-600 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!productForm.codigo.trim() || !productForm.nombre.trim()) {
                  toast.warning("Código P/N y Nombre son requeridos");
                  return;
                }
                saveMutation.mutate(productForm);
              }}
              disabled={saveMutation.isPending}
              className="h-8.5 px-4 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
