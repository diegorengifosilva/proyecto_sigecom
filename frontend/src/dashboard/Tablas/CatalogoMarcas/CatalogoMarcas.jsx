import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FolderPlus, Loader, Search, Edit2, Trash2, Tag, ShoppingBag, 
  ChevronLeft, ChevronRight, Save, Plus, X 
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InputField from "@/components/ui/InputField";

// FETCH FUNCTIONS
const fetchMarcas = async () => {
  const { data } = await api.get("core/tipo_marca/");
  return data;
};

const fetchMedidas = async () => {
  const { data } = await api.get("core/unidades_medida/");
  return data;
};

const fetchProductosPorMarca = async ({ queryKey }) => {
  const [_, marcaId, search, page] = queryKey;
  if (!marcaId) return { data: [], total: 0, total_pages: 1 };
  const { data } = await api.get("core/productos/", {
    params: {
      id_marca: marcaId,
      search: search || undefined,
      page: page || 1,
      page_size: 15
    }
  });
  return data;
};

export default function CatalogoMarcas() {
  const queryClient = useQueryClient();
  const [selectedMarca, setSelectedMarca] = useState(null);
  const [marcaSearch, setMarcaSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);

  // Modals state
  const [marcaModalOpen, setMarcaModalOpen] = useState(false);
  const [selectedMarcaForEdit, setSelectedMarcaForEdit] = useState(null);
  const [newMarcaName, setNewMarcaName] = useState("");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);
  const [productForm, setProductForm] = useState({
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
    queryKey: ["maestra-marcas"],
    queryFn: fetchMarcas
  });

  const { data: medidas = [] } = useQuery({
    queryKey: ["maestra-medidas"],
    queryFn: fetchMedidas
  });

  const activeMarcaId = selectedMarca?.id_marca;

  const { data: productsData = { data: [], total: 0, total_pages: 1 }, isLoading: loadingProducts } = useQuery({
    queryKey: ["maestra-productos", activeMarcaId, productSearch, productPage],
    queryFn: fetchProductosPorMarca,
    enabled: !!activeMarcaId
  });

  // Automatically select first brand on load
  useEffect(() => {
    if (marcas.length > 0 && !selectedMarca) {
      setSelectedMarca(marcas[0]);
    }
  }, [marcas, selectedMarca]);

  // Reset page when brand or search query changes
  useEffect(() => {
    setProductPage(1);
  }, [activeMarcaId, productSearch]);

  // BRANDS MUTATIONS
  const saveMarcaMutation = useMutation({
    mutationFn: async (payload) => {
      if (selectedMarcaForEdit) {
        return await api.put("core/tipo_marca/", {
          id_marca: selectedMarcaForEdit.id_marca,
          nombre: payload.nombre
        });
      } else {
        return await api.post("core/tipo_marca/", {
          nombre: payload.nombre
        });
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["maestra-marcas"]);
      toast.success(
        selectedMarcaForEdit 
          ? "Marca actualizada correctamente" 
          : "Marca creada correctamente"
      );
      setMarcaModalOpen(false);
      setSelectedMarcaForEdit(null);
      setNewMarcaName("");
      if (res.data?.registro) {
        setSelectedMarca(res.data.registro);
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al procesar la marca";
      toast.error(msg);
    }
  });

  const deleteMarcaMutation = useMutation({
    mutationFn: async (marcaId) => {
      return await api.delete("core/tipo_marca/", {
        data: { id_marca: marcaId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-marcas"]);
      toast.success("Marca desactivada con éxito");
      setSelectedMarca(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo desactivar la marca";
      toast.error(msg);
    }
  });

  // PRODUCTS MUTATIONS
  const saveProductMutation = useMutation({
    mutationFn: async (payload) => {
      const formatted = {
        ...payload,
        id_marca: activeMarcaId,
        precio_dolares: parseFloat(payload.precio_dolares) || 0,
        precio_soles: parseFloat(payload.precio_soles) || 0
      };
      if (selectedProductForEdit) {
        return await api.put("core/productos/", {
          id_producto: selectedProductForEdit.id_producto,
          ...formatted
        });
      } else {
        return await api.post("core/productos/", formatted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-productos", activeMarcaId]);
      toast.success(
        selectedProductForEdit 
          ? "Producto actualizado correctamente" 
          : "Producto registrado correctamente"
      );
      setProductModalOpen(false);
      setSelectedProductForEdit(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Error al guardar el producto";
      toast.error(msg);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId) => {
      return await api.delete("core/productos/", {
        data: { id_producto: productId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["maestra-productos", activeMarcaId]);
      toast.success("Producto eliminado o desactivado correctamente");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "No se pudo eliminar el producto";
      toast.error(msg);
    }
  });

  // HANDLERS
  const handleEditMarca = (marca, e) => {
    e.stopPropagation();
    setSelectedMarcaForEdit(marca);
    setNewMarcaName(marca.nombre);
    setMarcaModalOpen(true);
  };

  const handleNewMarca = () => {
    setSelectedMarcaForEdit(null);
    setNewMarcaName("");
    setMarcaModalOpen(true);
  };

  const handleEditProduct = (prod, e) => {
    e.stopPropagation();
    setSelectedProductForEdit(prod);
    setProductForm({
      codigo: prod.codigo || "",
      codigo2: prod.codigo2 || "",
      nombre: prod.nombre || "",
      precio_dolares: prod.precio_dolares || "",
      precio_soles: prod.precio_soles || "",
      id_medida: prod.id_medida || "",
      activo: prod.activo === 1 || prod.activo === true
    });
    setProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProductForEdit(null);
    setProductForm({
      codigo: "",
      codigo2: "",
      nombre: "",
      precio_dolares: "",
      precio_soles: "",
      id_medida: medidas[0]?.id_medida || "",
      activo: true
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.codigo.trim() || !productForm.nombre.trim()) {
      toast.warning("Código y Nombre son campos requeridos");
      return;
    }
    saveProductMutation.mutate(productForm);
  };

  const marcasFiltradas = marcas.filter(m =>
    m.nombre?.toLowerCase().includes(marcaSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-120px)] font-sans bg-slate-50/20">
      
      {/* BRAND PANEL (LEFT SIDEBAR) */}
      <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={16} className="text-cyan-600" />
              Marcas
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fabricantes de Suministros</p>
          </div>
          <Button 
            onClick={handleNewMarca}
            size="sm" 
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 h-8 rounded-lg animate-in"
          >
            <FolderPlus size={16} />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Buscar marca..." 
            value={marcaSearch}
            onChange={(e) => setMarcaSearch(e.target.value)}
            className="pl-8 bg-slate-50 border-slate-250/60 focus:bg-white text-xs h-8.5 rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px] lg:max-h-[600px] pr-1">
          {loadingMarcas ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Loader className="w-6 h-6 animate-spin text-cyan-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando</span>
            </div>
          ) : marcasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-slate-400">Ninguna marca encontrada</div>
          ) : (
            marcasFiltradas.map((marca) => {
              const isSelected = activeMarcaId === marca.id_marca;
              return (
                <div
                  key={marca.id_marca}
                  onClick={() => setSelectedMarca(marca)}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-100" 
                      : "bg-white hover:bg-slate-50 border-slate-150 text-slate-700"
                  }`}
                >
                  <span className="truncate">{marca.nombre}</span>
                  
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditMarca(marca, e)}
                      className={`p-1 rounded-md transition-colors ${
                        isSelected 
                          ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Está seguro de desactivar la marca "${marca.nombre}"?`)) {
                          deleteMarcaMutation.mutate(marca.id_marca);
                        }
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isSelected 
                          ? "text-red-400 hover:text-red-300 hover:bg-slate-800" 
                          : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PRODUCTS PANEL (RIGHT VIEW) */}
      <div className="flex-1 p-6 flex flex-col min-w-0">
        {selectedMarca ? (
          <div className="h-full flex flex-col space-y-4">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-3">
              <div>
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <ShoppingBag size={18} className="text-cyan-600" />
                  Productos: {selectedMarca.nombre}
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Catálogo técnico y precios base</p>
              </div>
              <Button
                onClick={handleNewProduct}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 h-9 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={14} strokeWidth={3} />
                Nuevo Producto
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Buscar por código o descripción..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8 bg-white border-slate-200 text-xs h-8.5 rounded-lg shadow-sm"
              />
            </div>

            {/* Table wrapper */}
            <div className="flex-1 overflow-auto relative border border-slate-150 rounded-xl bg-white shadow-xs">
              {(loadingProducts || saveProductMutation.isPending) && (
                <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader className="w-8 h-8 animate-spin text-cyan-600" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando</span>
                  </div>
                </div>
              )}

              <Table
                headers={[
                  "P/N / Código", "Código Alternativo", "Descripción / Nombre", "Precio base", "U.M.", "Estado"
                ].map((h) => (
                  <span key={h} className="text-[10px] font-black py-2 uppercase tracking-widest text-slate-600 text-center block">
                    {h}
                  </span>
                ))}
                data={productsData.data || []}
                onRowClick={handleEditProduct}
                renderRow={(prod) => [
                  <span className="text-xs font-bold text-slate-800 text-center block font-mono">
                    {prod.codigo}
                  </span>,
                  <span className="text-xs font-semibold text-slate-500 text-center block font-mono">
                    {prod.codigo2 || "-"}
                  </span>,
                  <span className="text-xs font-medium text-slate-700 text-left block px-4 truncate max-w-[280px]">
                    {prod.nombre}
                  </span>,
                  <div className="flex flex-col text-center">
                    <span className="text-xs font-bold text-emerald-600 font-mono">
                      ${Number(prod.precio_dolares || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    {prod.precio_soles > 0 && (
                      <span className="text-[10px] font-medium text-slate-400 font-mono">
                        S/ {Number(prod.precio_soles).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>,
                  <span className="text-[10px] font-bold text-slate-500 text-center block uppercase bg-slate-100 rounded px-1.5 py-0.5 mx-auto w-fit">
                    {medidas.find(m => m.id_medida === prod.id_medida)?.nombre || prod.id_medida || "U.M."}
                  </span>,
                  <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      prod.activo === 1 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-slate-50 text-slate-500 border-slate-100"
                    }`}>
                      {prod.activo === 1 ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ]}
              />
            </div>

            {/* Pagination */}
            {productsData.total_pages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Total: {productsData.total} Productos
                </span>
                
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => setProductPage(prev => Math.max(prev - 1, 1))}
                    disabled={productPage === 1}
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                    {productPage} / {productsData.total_pages}
                  </span>
                  <Button
                    onClick={() => setProductPage(prev => Math.min(prev + 1, productsData.total_pages))}
                    disabled={productPage === productsData.total_pages}
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic">
            Seleccione o cree una marca para comenzar a gestionar sus productos.
          </div>
        )}
      </div>

      {/* BRAND MODAL */}
      <Dialog open={marcaModalOpen} onOpenChange={() => setMarcaModalOpen(false)}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedMarcaForEdit ? "Editar Marca" : "Nueva Marca"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gestión del fabricante</p>
            </div>
          </div>

          <div className="p-6">
            <InputField
              label="Nombre de Marca:"
              name="nombre"
              value={newMarcaName}
              onChange={(e) => setNewMarcaName(e.target.value)}
              placeholder="Escriba el nombre del fabricante..."
              inline
              size="sm"
              className="font-bold text-slate-800"
            />
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setMarcaModalOpen(false)}
              className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!newMarcaName.trim()) {
                  toast.warning("El nombre de la marca es requerido");
                  return;
                }
                saveMarcaMutation.mutate({ nombre: newMarcaName });
              }}
              className="text-[10px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 px-8 flex items-center gap-1.5 shadow-lg shadow-cyan-100"
            >
              <Save size={14} />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PRODUCT MODAL */}
      <Dialog open={productModalOpen} onOpenChange={() => setProductModalOpen(false)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl shadow-2xl border-none p-0 overflow-hidden font-sans">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {selectedProductForEdit ? "Editar Producto" : "Nuevo Producto"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Ficha técnica del suministro para la marca: {selectedMarca?.nombre}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <InputField
              label="P/N / Código:"
              value={productForm.codigo}
              onChange={(e) => setProductForm(prev => ({ ...prev, codigo: e.target.value }))}
              placeholder="Código único del fabricante..."
              inline
              size="sm"
              className="font-bold text-slate-800"
            />

            <InputField
              label="Código Alternativo:"
              value={productForm.codigo2}
              onChange={(e) => setProductForm(prev => ({ ...prev, codigo2: e.target.value }))}
              placeholder="Código secundario opcional..."
              inline
              size="sm"
              className="font-semibold text-slate-700"
            />

            <InputField
              label="Descripción:"
              value={productForm.nombre}
              onChange={(e) => setProductForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Descripción del suministro..."
              inline
              size="sm"
              className="font-medium text-slate-800"
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <InputField
                  label="Precio base ($):"
                  type="number"
                  step="0.01"
                  value={productForm.precio_dolares}
                  onChange={(e) => setProductForm(prev => ({ ...prev, precio_dolares: e.target.value }))}
                  placeholder="Precio base en USD..."
                  inline
                  size="sm"
                  className="font-mono font-bold text-emerald-600 text-center"
                />
              </div>
              <div className="flex-1">
                <InputField
                  label="Precio base (S/):"
                  type="number"
                  step="0.01"
                  value={productForm.precio_soles}
                  onChange={(e) => setProductForm(prev => ({ ...prev, precio_soles: e.target.value }))}
                  placeholder="Precio base en Soles..."
                  inline
                  size="sm"
                  className="font-mono font-bold text-slate-600 text-center"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 py-1.5 px-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                Unidad Medida:
              </label>
              <select
                value={productForm.id_medida}
                onChange={(e) => setProductForm(prev => ({ ...prev, id_medida: e.target.value }))}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-0 uppercase transition-colors"
              >
                {medidas.map(m => (
                  <option key={m.id_medida} value={m.id_medida}>{m.nombre}</option>
                ))}
              </select>
            </div>

            {selectedProductForEdit && (
              <div className="flex items-center gap-4 py-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase min-w-[100px]">
                  Estado:
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={productForm.activo}
                    onChange={(e) => setProductForm(prev => ({ ...prev, activo: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className={`ml-2 text-[10px] font-black uppercase ${productForm.activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {productForm.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
            {selectedProductForEdit ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`¿Está seguro de eliminar el producto "${selectedProductForEdit.codigo}"?`)) {
                    deleteProductMutation.mutate(selectedProductForEdit.id_producto);
                  }
                }}
                className="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
              >
                Eliminar
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setProductModalOpen(false)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveProduct}
                className="text-[10px] font-black uppercase tracking-widest bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-9 px-8 flex items-center gap-1.5 shadow-lg shadow-cyan-100"
              >
                <Save size={14} />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}