import React from 'react';
import { toast as originalToast } from 'react-toastify';
import { CheckCircle2, AlertCircle, Info, Trash2, Save, AlertTriangle, RefreshCw } from 'lucide-react';

const ToastContent = ({ title, message, config, closeToast }) => {
  const Icon = config.icon;
  const content = typeof message === 'function' ? message({ closeToast }) : message;

  return (
    <div className="flex items-start gap-3">
      <div className={`p-1.5 rounded-lg bg-white/90 shadow-sm ${config.iconColor} flex-shrink-0 flex items-center justify-center`}>
        <Icon className="h-4.5 w-4.5 stroke-[2.5]" />
      </div>
      <div className="flex flex-col gap-0.5 select-none pr-4">
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${config.textColor}`}>
          {title}
        </span>
        <div className="text-[11.5px] font-semibold text-gray-700 leading-tight">
          {content}
        </div>
      </div>
    </div>
  );
};

const toastFunction = (message, options) => {
  return originalToast(message, options);
};

const configs = {
  add: {
    borderColor: 'border-l-emerald-500',
    bgColor: '!bg-emerald-50/95',
    iconColor: 'text-emerald-500',
    icon: CheckCircle2,
    textColor: 'text-emerald-800'
  },
  update: {
    borderColor: 'border-l-indigo-500',
    bgColor: '!bg-indigo-50/95',
    iconColor: 'text-indigo-500',
    icon: RefreshCw,
    textColor: 'text-indigo-800'
  },
  delete: {
    borderColor: 'border-l-rose-500',
    bgColor: '!bg-rose-50/95',
    iconColor: 'text-rose-500',
    icon: Trash2,
    textColor: 'text-rose-800'
  },
  save: {
    borderColor: 'border-l-sky-500',
    bgColor: '!bg-sky-50/95',
    iconColor: 'text-sky-500',
    icon: Save,
    textColor: 'text-sky-800'
  },
  info: {
    borderColor: 'border-l-cyan-500',
    bgColor: '!bg-cyan-50/95',
    iconColor: 'text-cyan-500',
    icon: Info,
    textColor: 'text-cyan-800'
  },
  warning: {
    borderColor: 'border-l-amber-500',
    bgColor: '!bg-amber-50/95',
    iconColor: 'text-amber-500',
    icon: AlertTriangle,
    textColor: 'text-amber-800'
  },
  error: {
    borderColor: 'border-l-red-500',
    bgColor: '!bg-red-50/95',
    iconColor: 'text-red-500',
    icon: AlertCircle,
    textColor: 'text-red-800'
  }
};

toastFunction.success = (message, title = "Operación Exitosa", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Operación Exitosa";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.add;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.add = (message, title = "Ítem Añadido", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Ítem Añadido";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.add;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.update = (message, title = "Cambios Actualizados", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Cambios Actualizados";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.update;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.delete = (message, title = "Elemento Eliminado", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Elemento Eliminado";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.delete;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.save = (message, title = "Guardado Automático", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Guardado Automático";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.save;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.info = (message, title = "Información", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Información";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.info;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.warning = (message, title = "Advertencia", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Advertencia";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.warning;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2500,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.warn = (message, title = "Advertencia", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Advertencia";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.warning;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 2500,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

toastFunction.error = (message, title = "Error de Sistema", options = {}) => {
  if (typeof title === 'object' && title !== null) {
    options = title;
    title = "Error de Sistema";
  }
  if (typeof message === 'function') {
    return originalToast(message, options);
  }
  const config = configs.error;
  return originalToast(<ToastContent title={title} message={message} config={config} />, {
    position: "top-right",
    autoClose: 3500,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: `!p-3.5 !min-h-0 !rounded-xl !shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} backdrop-blur-md`,
    bodyClassName: "!p-0 !m-0",
    ...options
  });
};

// Expose all other react-toastify properties/methods on toastFunction
Object.keys(originalToast).forEach(key => {
  if (!toastFunction[key]) {
    toastFunction[key] = originalToast[key];
  }
});

export const toast = toastFunction;
