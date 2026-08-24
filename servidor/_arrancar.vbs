' Levanta el servidor SIN consola y sin quedar en el grupo de procesos de
' quien lo lanza. Hizo falta porque el servidor arrancaba bien y a los
' segundos recibia un Ctrl+C: el log terminaba en "^C". Cualquier forma de
' lanzarlo que comparta consola con el shell del agente se muere igual,
' incluidas Start-Process -WindowStyle Hidden, WMI y una tarea programada.
Set sh = CreateObject("WScript.Shell")
raiz = "C:\Users\memit\OneDrive - Universidad del Istmo\EMPRENDIMIENTO\API-UNIVERSAL"
sh.CurrentDirectory = raiz
sh.Run "cmd /c node servidor\servidor.js > servidor\_salida.log 2> servidor\_error.log", 0, False
