import { useEffect, useState } from "react";
import api, { toApiRequestPath } from "@/services/api";

function injectBaseHref(html) {
  const origin = window.location.origin;
  const tag = `<base href="${origin}/">`;
  if (/<base\s/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
  }
  return `<head>${tag}</head>${html}`;
}

function looksLikeSpaShell(html) {
  return /id=["']root["']/.test(html) && /\/assets\/index-/.test(html);
}

export default function ReportIframe({ src, title, className, style, scrolling, onLoad }) {
  const [srcDoc, setSrcDoc] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setSrcDoc(null);
    setBlobUrl("");
    setError("");
    if (!src) return undefined;

    const path = toApiRequestPath(src);

    (async () => {
      try {
        const res = await api.get(path, {
          responseType: "blob",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*",
          },
        });
        if (cancelled) return;

        const blob = res.data;
        const mime = `${blob.type || res.headers?.["content-type"] || ""}`.toLowerCase();
        if (mime.includes("json")) {
          setError("No se encontró el archivo de la orden de compra.");
          return;
        }
        const peek = mime.includes("html") || mime.includes("text/")
          ? ""
          : await blob.slice(0, 256).text();
        const isHtml =
          mime.includes("html") ||
          mime.includes("text/plain") ||
          /<!doctype html|<html[\s>]/i.test(peek);

        if (isHtml) {
          const html = await blob.text();
          if (cancelled) return;
          if (looksLikeSpaShell(html) || html.trimStart().startsWith("{") || mime.includes("json")) {
            setError("El servidor no devolvió el documento. Recargue la página (Ctrl+F5) e intente de nuevo.");
            return;
          }
          if (html.charCodeAt(0) === 0x25 && html.charCodeAt(1) === 0x50) {
            // %PDF
            const pdfBlob = new Blob([html], { type: "application/pdf" });
            objectUrl = URL.createObjectURL(pdfBlob);
            setBlobUrl(objectUrl);
            return;
          }
          setSrcDoc(injectBaseHref(html));
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar el reporte. Intente de nuevo.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-red-600 bg-white rounded-xl border border-red-100 px-6 text-center">
        {error}
      </div>
    );
  }

  if (!srcDoc && !blobUrl) {
    return (
      <div className="w-full h-full bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">
          Cargando reporte...
        </span>
      </div>
    );
  }

  if (srcDoc) {
    return (
      <iframe
        srcDoc={srcDoc}
        className={className}
        style={style}
        title={title}
        scrolling={scrolling}
        onLoad={onLoad}
      />
    );
  }

  return (
    <iframe
      src={blobUrl}
      className={className}
      style={style}
      title={title}
      scrolling={scrolling}
      onLoad={onLoad}
    />
  );
}
