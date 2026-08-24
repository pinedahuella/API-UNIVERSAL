# API-UNIVERSAL

Demostracion de API UNIVERSAL. Son dos cosas, y la segunda es la importante.

## 1. La extension: re-armar una pagina que ya existe

Una extension de Chrome que LEE cualquier pagina -no una preparada por
nosotros- y la vuelve a levantar completa con un diseño que escribe la
conexion. El sitio original no se toca: todo pasa en el navegador, y con un
boton la pagina vuelve a ser la de siempre.

Se le dice de que se quiere que se vea ("arcade de 8 bits", "periodico
viejo", "barro antiguo") y devuelve la pagina armada con ese estilo: los
colores, la tipografia, la forma de las cajas y el fondo animado.

Como instalarla: `extension/COMO_INSTALAR.txt`.
Lo que se midio y no hay que volver a suponer: `MEDICIONES.md`.

Que la calidad no dependa de la suerte es un mecanismo, no una promesa: cada
diseño que vuelve pasa por nueve pruebas y sale con una nota de 0 a 100, se
piden varios en paralelo y gana el de mejor nota. Las herramientas para
medirlo estan listadas en `SETUP_MAQUINA_NUEVA.md`.

## 2. La pagina propia: la foca

La pagina arranca vacia, con una foca que hace cinco preguntas. Con las
respuestas arma la pagina completa: tema, colores, tipografia, formas,
videos y publicaciones. Despues sigue cambiando con lo que la persona abre,
marca y comenta.

## Como correrlo

    node servidor/servidor.js

Y abrir http://localhost:4321

El servidor le pide el diseño a Claude CLI con el modelo Haiku. Si Claude no
esta disponible o tarda demasiado, la pagina se arma igual con el generador
local: la generacion es un extra, nunca un requisito.

## Sin servidor

Abriendo el index.html directamente (o en GitHub Pages) funciona todo menos
el diseño hecho por Claude, que lo reemplaza el generador local. La extension
si necesita el servidor local.

https://pinedahuella.github.io/API-UNIVERSAL/
