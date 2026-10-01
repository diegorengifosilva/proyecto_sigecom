/**
 * Abre el Outlook INSTALADO en el PC (ventana de mensaje), como el 4.0.
 * Opera GX intercepta mailto → Gmail, así que usamos el protocolo COM
 * sigecom-outlook: con un <a> real (gesto del usuario). La primera vez
 * hay que registrar el protocolo ejecutando el .vbs que se descarga.
 */

const STORAGE_KEY = "sigecom_outlook_protocol_v1";

function parseRecipients(to) {
  return (Array.isArray(to) ? to : String(to || "").split(/[;,]/))
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function vbsQuote(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function vbsBodyExpr(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  if (!lines.length) return '""';
  return lines
    .map((line, i) => (i < lines.length - 1 ? `${vbsQuote(line)} & vbCrLf` : vbsQuote(line)))
    .join(" & ");
}

export function buildOutlookProtocolUri({ to, subject = "", body = "" }) {
  const recipients = parseRecipients(to);
  if (!recipients.length) return "";
  const q = new URLSearchParams();
  q.set("to", recipients.join(";"));
  q.set("subject", String(subject || ""));
  q.set("body", String(body || ""));
  return `sigecom-outlook:?${q.toString()}`;
}

export function isOutlookProtocolReady() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function marcarOutlookProtocoloListo() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function buildAbridorVbs({ to, subject, body }) {
  const toVal = vbsQuote(parseRecipients(to).join(";"));
  const subjectVal = vbsQuote(subject);
  const bodyVal = vbsBodyExpr(body);

  return `Option Explicit

Dim gSh, gFso, gDest, gScript
Set gSh = CreateObject("WScript.Shell")
Set gFso = CreateObject("Scripting.FileSystemObject")
gDest = gSh.ExpandEnvironmentStrings("%LOCALAPPDATA%\\SIGECOM")
gScript = gDest & "\\abrir_outlook.vbs"

If WScript.Arguments.Count > 0 Then
  If InStr(1, WScript.Arguments(0), "sigecom-outlook:", vbTextCompare) = 1 Then
    EnsureInstalled False
    OpenMail WScript.Arguments(0)
    WScript.Quit 0
  End If
End If

EnsureInstalled False
OpenHardcoded
WScript.Quit 0

Sub EnsureInstalled(showOk)
  Dim cmd
  On Error Resume Next
  If Not gFso.FolderExists(gDest) Then gFso.CreateFolder gDest
  gFso.CopyFile WScript.ScriptFullName, gScript, True
  gSh.RegWrite "HKCU\\Software\\Classes\\sigecom-outlook\\", "URL:SIGECOM Outlook", "REG_SZ"
  gSh.RegWrite "HKCU\\Software\\Classes\\sigecom-outlook\\URL Protocol", "", "REG_SZ"
  gSh.RegWrite "HKCU\\Software\\Classes\\sigecom-outlook\\DefaultIcon\\", "outlook.exe,0", "REG_SZ"
  cmd = "wscript.exe """ & gScript & """ ""%1"""
  gSh.RegWrite "HKCU\\Software\\Classes\\sigecom-outlook\\shell\\", "open", "REG_SZ"
  gSh.RegWrite "HKCU\\Software\\Classes\\sigecom-outlook\\shell\\open\\command\\", cmd, "REG_SZ"
  If showOk Then
    If Err.Number <> 0 Then
      MsgBox "No se pudo activar Outlook: " & Err.Description, 16, "SIGECOM"
    End If
  End If
  On Error GoTo 0
End Sub

Sub OpenHardcoded
  Dim ol, mail, safe, bodyTxt
  On Error Resume Next
  Set ol = CreateObject("Outlook.Application")
  If Err.Number <> 0 Then
    MsgBox "No se encontro Microsoft Outlook de escritorio en este equipo.", 16, "SIGECOM"
    Exit Sub
  End If
  Err.Clear
  Set mail = ol.CreateItem(0)
  mail.To = ${toVal}
  mail.Subject = ${subjectVal}
  bodyTxt = ${bodyVal}
  safe = Replace(Replace(Replace(bodyTxt, "&", "&amp;"), "<", "&lt;"), ">", "&gt;")
  safe = Replace(safe, vbCrLf, "<br>")
  safe = Replace(safe, vbLf, "<br>")
  mail.HTMLBody = "<html><body style=""font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:12pt;color:#111827;line-height:1.5;"">" & safe & "</body></html>"
  mail.Display False
  If Not ol.ActiveWindow Is Nothing Then ol.ActiveWindow.Activate
  If Err.Number <> 0 Then
    MsgBox "Outlook esta instalado pero no se pudo abrir el nuevo mensaje: " & Err.Description, 16, "SIGECOM"
  End If
End Sub

Sub OpenMail(rawUri)
  Dim qs, toAddr, subject, body, html, ol, mail, parts, i, kv, k, v, safe
  On Error Resume Next
  qs = Mid(rawUri, Len("sigecom-outlook:") + 1)
  If Left(qs, 2) = "//" Then qs = Mid(qs, 3)
  If Left(qs, 1) = "?" Then qs = Mid(qs, 2)
  toAddr = ""
  subject = ""
  body = ""
  html = ""
  parts = Split(qs, "&")
  For i = 0 To UBound(parts)
    kv = Split(parts(i), "=", 2)
    If UBound(kv) >= 0 Then
      k = LCase(Trim(kv(0)))
      v = ""
      If UBound(kv) >= 1 Then v = Utf8UrlDecode(kv(1))
      If k = "to" Then toAddr = v
      If k = "subject" Then subject = v
      If k = "body" Then body = v
      If k = "html" Then html = v
    End If
  Next
  Err.Clear
  Set ol = CreateObject("Outlook.Application")
  If Err.Number <> 0 Then
    MsgBox "No se encontro Microsoft Outlook de escritorio en este equipo.", 16, "SIGECOM"
    Exit Sub
  End If
  Err.Clear
  Set mail = ol.CreateItem(0)
  mail.To = toAddr
  mail.Subject = subject
  If Len(html) > 0 Then
    mail.HTMLBody = html
  Else
    safe = Replace(Replace(Replace(body, "&", "&amp;"), "<", "&lt;"), ">", "&gt;")
    safe = Replace(safe, vbCrLf, "<br>")
    safe = Replace(safe, vbLf, "<br>")
    mail.HTMLBody = "<html><body style=""font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:12pt;color:#111827;line-height:1.5;"">" & safe & "</body></html>"
  End If
  mail.Display False
  If Not ol.ActiveWindow Is Nothing Then ol.ActiveWindow.Activate
End Sub

Function Utf8UrlDecode(ByVal s)
  Dim i, ch, hexv, bin, stm
  s = Replace(s, "+", " ")
  bin = ""
  i = 1
  Do While i <= Len(s)
    ch = Mid(s, i, 1)
    If ch = "%" And i + 2 <= Len(s) Then
      hexv = Mid(s, i + 1, 2)
      bin = bin & Chr(CLng("&H" & hexv))
      i = i + 3
    Else
      bin = bin & ch
      i = i + 1
    End If
  Loop
  On Error Resume Next
  Set stm = CreateObject("ADODB.Stream")
  stm.Type = 2
  stm.Open
  stm.Charset = "iso-8859-1"
  stm.WriteText bin
  stm.Position = 0
  stm.Charset = "utf-8"
  Utf8UrlDecode = stm.ReadText
  stm.Close
  If Err.Number <> 0 Then Utf8UrlDecode = bin
  On Error GoTo 0
End Function
`;
}

function downloadUtf16Vbs(filename, content) {
  const bom = new Uint8Array([0xff, 0xfe]);
  const chars = new Uint16Array(content.length);
  for (let i = 0; i < content.length; i += 1) chars[i] = content.charCodeAt(i);
  const blob = new Blob([bom, chars], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function descargarAbridorOutlookVbs({ to, subject = "", body = "" }) {
  const recipients = parseRecipients(to);
  if (!recipients.length) {
    const err = new Error("NO_RECIPIENTS");
    err.code = "NO_RECIPIENTS";
    throw err;
  }
  downloadUtf16Vbs(
    "SIGECOM-Abrir-Outlook.vbs",
    buildAbridorVbs({ to: recipients, subject, body })
  );
}

export function abrirBorradorOutlook({ to, subject = "", body = "" }) {
  const uri = buildOutlookProtocolUri({ to, subject, body });
  if (!uri) {
    const err = new Error("NO_RECIPIENTS");
    err.code = "NO_RECIPIENTS";
    throw err;
  }
  return uri;
}

export function cerrarBorradorOutlook() {}

export function buildCorreoApertura({
  codigo,
  area,
  referencia,
  cliente,
  ordenes,
  esVenta = false,
}) {
  const codigoTxt = String(codigo || "").trim() || "S/N";
  const areaTxt = String(area || "").trim() || "---";
  const referenciaTxt = String(referencia || "").trim() || "---";
  const clienteTxt = String(cliente || "").trim() || "---";
  const ordenList = (Array.isArray(ordenes) ? ordenes : [ordenes])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  const ordenTxt = ordenList.length ? ordenList.join(" / ") : "S/N";

  const subject = `${codigoTxt}: Apertura de la Cotización - Orden No.: ${ordenTxt}`;

  let body =
    "Mediante la presente se informa la apertura de la siguiente Cotización para su Ejecución y Solicitudes de Gastos Correspondientes en el Sistema.";

  if (!esVenta) {
    body +=
      "\n\nLa presente apertura no implica la liberación de gastos, la cual queda pendiente a la aprobación de HSEQ de acuerdo al cumplimiento de la documentación según corresponda.";
  }

  body +=
    "\n\nCODIGO: " +
    codigoTxt +
    "\nAREA : " +
    areaTxt +
    "\nREFERENCIA : " +
    referenciaTxt +
    "\nCLIENTE : " +
    clienteTxt +
    "\nORDEN No.: " +
    ordenTxt +
    "\n\nGERENCIA COMERCIAL";

  return { subject, body, ordenTxt };
}
