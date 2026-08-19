$Trigger1 = New-ScheduledTaskTrigger -Once -At "2026-08-12T09:00:00"
$Trigger2 = New-ScheduledTaskTrigger -Once -At "2026-08-12T13:00:00"
$Trigger3 = New-ScheduledTaskTrigger -Once -At "2026-08-12T16:00:00"
$Action = New-ScheduledTaskAction -Execute "C:\Users\VC-23031\PROYECTOS\SIGECOM_5\enviar_reporte_prueba.bat" -WorkingDirectory "C:\Users\VC-23031\PROYECTOS\SIGECOM_5"
Register-ScheduledTask -TaskName "Envio Prueba Reporte SIGECOM" -Trigger @($Trigger1, $Trigger2, $Trigger3) -Action $Action -Description "Ejecuta el reporte de prueba hoy a las 9am, 1pm y 4pm." -Force
