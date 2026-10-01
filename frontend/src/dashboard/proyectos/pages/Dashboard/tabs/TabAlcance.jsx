// src/pages/Dashboard/tabs/TabAlcance.jsx
import React, { useState } from 'react';

export default function TabAlcance({ proyecto }) {
  // WBS basado en EDT del cronograma - estructura jerárquica simple
  const [wbs, setWbs] = useState([
    {
      id: '1',
      codigo: '1.0',
      nombre: proyecto?.nombre || 'Proyecto Principal',
      descripcion: 'Alcance completo del proyecto',
      entregables: ['Charter del proyecto', 'Plan de gestión', 'Acta de constitución'],
      criterios: 'Aprobado por el sponsor',
      responsable: 'Gerente de Proyecto',
      nivel: 0,
      expandido: true,
      hijos: [
        {
          id: '1.1',
          codigo: '1.1',
          nombre: 'Iniciación',
          descripcion: 'Fase de inicio del proyecto',
          entregables: ['Acta de constitución', 'Registro de interesados'],
          criterios: 'Documentos firmados',
          responsable: 'Gerente de Proyecto',
          nivel: 1,
          expandido: false,
          hijos: [],
        },
        {
          id: '1.2',
          codigo: '1.2',
          nombre: 'Planificación',
          descripcion: 'Fase de planificación detallada',
          entregables: ['Plan de proyecto', 'Cronograma', 'Presupuesto'],
          criterios: 'Plan aprobado por comité',
          responsable: 'Equipo de Planificación',
          nivel: 1,
          expandido: true,
          hijos: [
            {
              id: '1.2.1',
              codigo: '1.2.1',
              nombre: 'Plan de Alcance',
              descripcion: 'Definición detallada del alcance',
              entregables: ['EDT/WBS', 'Diccionario WBS', 'Línea base de alcance'],
              criterios: 'Validado con stakeholders',
              responsable: 'Analista de Negocio',
              nivel: 2,
              expandido: false,
              hijos: [],
            },
            {
              id: '1.2.2',
              codigo: '1.2.2',
              nombre: 'Plan de Cronograma',
              descripcion: 'Planificación temporal del proyecto',
              entregables: ['Cronograma detallado', 'Ruta crítica', 'Hitos clave'],
              criterios: 'Cronograma realista y aprobado',
              responsable: 'Project Planner',
              nivel: 2,
              expandido: false,
              hijos: [],
            },
          ],
        },
        {
          id: '1.3',
          codigo: '1.3',
          nombre: 'Ejecución',
          descripcion: 'Fase de ejecución del trabajo',
          entregables: ['Entregables del proyecto', 'Informes de avance'],
          criterios: 'Cumple especificaciones técnicas',
          responsable: 'Equipo de Ejecución',
          nivel: 1,
          expandido: false,
          hijos: [],
        },
        {
          id: '1.4',
          codigo: '1.4',
          nombre: 'Monitoreo y Control',
          descripcion: 'Seguimiento y control del proyecto',
          entregables: ['Informes de desempeño', 'Solicitudes de cambio', 'Acciones correctivas'],
          criterios: 'Variaciones dentro de límites aceptables',
          responsable: 'PMO',
          nivel: 1,
          expandido: false,
          hijos: [],
        },
        {
          id: '1.5',
          codigo: '1.5',
          nombre: 'Cierre',
          descripcion: 'Fase de cierre formal del proyecto',
          entregables: ['Entrega formal', 'Lecciones aprendidas', 'Archivo del proyecto'],
          criterios: 'Aceptación formal del cliente',
          responsable: 'Gerente de Proyecto',
          nivel: 1,
          expandido: false,
          hijos: [],
        },
      ],
    },
  ]);

  const [seleccionado, setSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const toggleExpand = (path) => {
    const actualizar = (items) => {
      return items.map((item) => {
        if (item.id === path[0]) {
          if (path.length === 1) {
            return { ...item, expandido: !item.expandido };
          } else {
            return { ...item, hijos: actualizar(item.hijos) };
          }
        }
        return { ...item, hijos: actualizar(item.hijos) };
      });
    };
    setWbs(actualizar(wbs));
  };

  const renderNodo = (nodo, path = []) => {
    const currentPath = [...path, nodo.id];
    const indent = nodo.nivel * 24;

    return (
      <div key={nodo.id}>
        <div
          className={`flex items-center py-2 px-3 border-b hover:bg-gray-50 cursor-pointer ${
            seleccionado?.id === nodo.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => setSeleccionado(nodo)}
        >
          {nodo.hijos && nodo.hijos.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(currentPath);
              }}
              className="mr-2 text-gray-600 hover:text-gray-800"
            >
              {nodo.expandido ? '▼' : '▶'}
            </button>
          )}
          {(!nodo.hijos || nodo.hijos.length === 0) && <span className="mr-2 w-4"></span>}
          <span className="font-mono text-xs text-gray-600 mr-3">{nodo.codigo}</span>
          <span className="font-medium text-sm flex-1">{nodo.nombre}</span>
          <span className="text-xs text-gray-500">{nodo.entregables?.length || 0} entregables</span>
        </div>
        {nodo.expandido && nodo.hijos && nodo.hijos.map((hijo) => renderNodo(hijo, currentPath))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Estructura de Desglose del Trabajo (WBS/EDT)</h2>
        <div className="text-xs text-gray-500">
          {wbs.length} paquetes de trabajo principales
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Árbol WBS */}
        <div className="lg:col-span-2 rounded-xl border bg-white">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Árbol WBS</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {wbs.map((nodo) => renderNodo(nodo))}
          </div>
        </div>

        {/* Panel de detalles */}
        <div className="rounded-xl border bg-white">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Detalles del Paquete</h3>
          </div>
          <div className="p-4 space-y-3">
            {seleccionado ? (
              <>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Código WBS</div>
                  <div className="font-mono font-medium">{seleccionado.codigo}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Nombre</div>
                  <div className="font-medium">{seleccionado.nombre}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Descripción</div>
                  <div className="text-sm text-gray-700">{seleccionado.descripcion}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Responsable</div>
                  <div className="text-sm">{seleccionado.responsable}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Criterios de Aceptación</div>
                  <div className="text-sm text-gray-700">{seleccionado.criterios}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Entregables</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {seleccionado.entregables?.map((e, i) => (
                      <li key={i} className="text-gray-700">{e}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">
                Selecciona un paquete de trabajo del árbol para ver sus detalles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Alcance */}
      <div className="rounded-xl border p-4 bg-blue-50">
        <h3 className="font-semibold mb-3">Resumen del Alcance del Proyecto</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-600 mb-1">Paquetes de Trabajo</div>
            <div className="text-2xl font-bold text-blue-900">12</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Entregables Principales</div>
            <div className="text-2xl font-bold text-blue-900">28</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Fases del Proyecto</div>
            <div className="text-2xl font-bold text-blue-900">5</div>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="rounded-xl border p-4 bg-gray-50">
        <div className="text-xs text-gray-600">
          <strong>Nota:</strong> Esta es una estructura WBS de ejemplo basada en las fases estándar de PMI.
          Puedes modificar esta estructura según las necesidades específicas de tu proyecto.
          Los paquetes de trabajo se vinculan con las tareas del cronograma en la pestaña "Tiempo".
        </div>
      </div>
    </div>
  );
}




