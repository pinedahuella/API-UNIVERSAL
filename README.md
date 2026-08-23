# API-UNIVERSAL

Demostracion de API UNIVERSAL.

La pagina arranca vacia, con una foca que hace cinco preguntas. Con las respuestas
arma la pagina completa: tema, colores, tipografia, formas, videos y publicaciones.
Despues sigue cambiando con lo que la persona abre, marca y comenta.

## Como correrlo con Claude

    node servidor/servidor.js

Y abrir http://localhost:4321

El servidor le pide el diseno a Claude CLI con el modelo Haiku. Si Claude no esta
disponible o tarda demasiado, la pagina se arma igual con el generador local: la
generacion es un extra, nunca un requisito.

## Sin servidor

Abriendo el index.html directamente (o en GitHub Pages) funciona todo menos el diseno
hecho por Claude, que lo reemplaza el generador local.

https://pinedahuella.github.io/API-UNIVERSAL/
