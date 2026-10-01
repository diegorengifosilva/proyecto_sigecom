import React, { useMemo } from "react";

export default function OutlookLauncher() {
  const { msOutlook } = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return {
      msOutlook: `ms-outlook://compose?${q.toString()}`,
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-sm">
        <p className="text-teal-900 font-black text-lg mb-2">Abrir Outlook</p>
        <p className="text-slate-600 text-sm mb-6">
          Pulsa el botón para abrir Outlook de escritorio.
        </p>
        <a
          href={msOutlook}
          className="inline-flex items-center justify-center w-full rounded-xl bg-teal-700 text-white font-black uppercase text-sm py-3.5 hover:bg-teal-800"
        >
          Abrir Outlook
        </a>
      </div>
    </div>
  );
}

export function isOutlookLaunchPath() {
  const path = window.location.pathname || "";
  return /\/outlook\.html$/i.test(path);
}
