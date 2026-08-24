
## El servidor local se muere si lo levanta el agente

`node servidor/servidor.js` como tarea de fondo del agente se corta al
terminar el turno. Y NO alcanza con esconder la ventana: se probaron
`Start-Process -WindowStyle Hidden`, WMI (`Win32_Process.Create`) y una
tarea programada, y las tres se mueren igual, porque el proceso sigue
compartiendo consola con el shell del agente. El log terminaba en `^C`.
Ya paso varias veces, y la unica pista era que un diseño salia gris y con
Segoe UI, porque la extension caia a su generador local.

Lo que SI sobrevive es `servidor/_arrancar.vbs`, que lanza el proceso sin
consola y fuera del arbol de quien lo llama:

```powershell
& wscript.exe "C:\Users\memit\OneDrive - Universidad del Istmo\EMPRENDIMIENTO\API-UNIVERSAL\servidor\_arrancar.vbs"
```

Pararlo:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*servidor.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Comprobar: `curl -s http://localhost:4321/api/estado`
El registro queda en `servidor/_salida.log` y `servidor/_error.log`.

OJO AL EDITAR EL PROMPT O EL MEDIDOR: node cachea los `require`, asi que un
servidor que ya estaba corriendo sigue usando la version vieja de
`prompt_rearmar.js` y de `medir_diseno.js`. Hay que reiniciarlo o se mide un
cambio que no esta aplicado. Paso: una prueba entera salio invalida porque el
proceso llevaba una hora arriba.

Para Meme, lo de siempre sigue valiendo: `INICIAR.bat`.

## Las herramientas del repo, y para que sirve cada una

Todas son node sin dependencias: no hay que instalar nada.

```
node servidor/verificar_contrato.js
```
Los 15 contratos entre archivos que se rompieron alguna vez sin dar un solo
error (nombres duplicados entre content scripts, clases que el prompt le
promete al modelo y nadie crea, los numeros de las motas, que la hoja base
se pueda pisar). Correlo ANTES de dar por bueno cualquier cambio en
extension/ o en el prompt. Sale con codigo 1 si algo falla.

```
node servidor/medir_diseno.js <archivo.css>
```
La nota de un diseño, de 0 a 100, con sus nueve puertas duras. Imprime la
tabla y sale con 1 si no pasa. Los dos fixtures de control estan en
`servidor/fixtures/`: `css_tibio.css` TIENE que fallar (41/100) y
`css_joya.css` TIENE que pasar (100/100). Si el tibio pasa, el medidor esta
roto.

```
node servidor/banco_disenos.js              (todos los casos)
node servidor/banco_disenos.js arcade       (uno)
node servidor/banco_disenos.js --remedir    (sin servidor, re-mide lo guardado)
```
Le pide al servidor un diseño por cada caso de `servidor/fixtures/*.json`
-cinco, que cubren las tres clases de pagina- y saca la tabla con la nota de
cada uno. Tarda: cada caso son entre 40 y 200 segundos. Guarda el CSS en
`servidor/fixtures/salidas/` para mirarlo con los ojos. Si el servidor no
esta arriba dice que no midio nada y sale con 2: nunca imprime una tabla
vacia que se pueda confundir con un verde.

```
CANDIDATOS=3 node servidor/servidor.js
```
Cuantos diseños se piden en paralelo por cada pedido (1 a 4, por defecto 2).
Gana el de mas puntos. Van a la vez, asi que pedir tres no tarda mas que
pedir uno: medido, 104s los tres contra 106s de mediana uno solo.

## Python, solo para los entregables y los iconos

`python servidor/hacer_iconos.py` regenera el icono de la extension.
Para tocar el informe y la presentacion hacen falta `python-docx` y
`python-pptx`, que ya estan instalados en esta maquina.
