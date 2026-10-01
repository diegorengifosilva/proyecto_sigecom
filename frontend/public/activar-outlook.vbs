Option Explicit

' SIGECOM 5.0: abre Outlook de escritorio (nuevo mensaje) via COM.
' Sin argumentos instala el protocolo sigecom-outlook:

Dim gSh, gFso, gDest, gScript

Set gSh = CreateObject("WScript.Shell")
Set gFso = CreateObject("Scripting.FileSystemObject")
gDest = gSh.ExpandEnvironmentStrings("%LOCALAPPDATA%\SIGECOM")
gScript = gDest & "\abrir_outlook.vbs"

If WScript.Arguments.Count > 0 Then
  If InStr(1, WScript.Arguments(0), "sigecom-outlook:", vbTextCompare) = 1 Then
    EnsureInstalled False
    OpenMail WScript.Arguments(0)
    WScript.Quit 0
  End If
End If

EnsureInstalled True
WScript.Quit 0

Sub EnsureInstalled(showOk)
  Dim cmd
  On Error Resume Next
  If Not gFso.FolderExists(gDest) Then gFso.CreateFolder gDest
  gFso.CopyFile WScript.ScriptFullName, gScript, True

  gSh.RegWrite "HKCU\Software\Classes\sigecom-outlook\", "URL:SIGECOM Outlook", "REG_SZ"
  gSh.RegWrite "HKCU\Software\Classes\sigecom-outlook\URL Protocol", "", "REG_SZ"
  gSh.RegWrite "HKCU\Software\Classes\sigecom-outlook\DefaultIcon\", "outlook.exe,0", "REG_SZ"
  cmd = "wscript.exe """ & gScript & """ ""%1"""
  gSh.RegWrite "HKCU\Software\Classes\sigecom-outlook\shell\", "open", "REG_SZ"
  gSh.RegWrite "HKCU\Software\Classes\sigecom-outlook\shell\open\command\", cmd, "REG_SZ"

  If showOk Then
    If Err.Number <> 0 Then
      MsgBox "No se pudo activar Outlook: " & Err.Description, 16, "SIGECOM"
    Else
      MsgBox "Outlook quedo vinculado a SIGECOM." & vbCrLf & vbCrLf & _
             "Vuelve a la apertura y pulsa ENVIAR CORREO." & vbCrLf & _
             "Si Chrome pregunta, elige Abrir y marca Siempre permitir.", 64, "SIGECOM"
    End If
  End If
  On Error GoTo 0
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
  If Err.Number <> 0 Then
    MsgBox "Outlook esta instalado pero no se pudo abrir el nuevo mensaje: " & Err.Description, 16, "SIGECOM"
  End If
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
