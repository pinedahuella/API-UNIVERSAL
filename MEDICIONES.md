# Lo que se midio en el navegador, y no hay que volver a suponer

Cada linea de aca salio de una medicion en vivo, no de leer codigo.
Fecha: 2026-08-23.

## El reproductor de YouTube NO se puede incrustar. En ningun lado.

Se probaron tres variantes, todas dentro de un shadow root:

| variante | donde | resultado |
|---|---|---|
| `youtube-nocookie.com/embed/ID` | instagram.com | marco roto (CSP del sitio) |
| `youtube-nocookie.com/embed/ID` | youtube.com | "This video is unavailable. Error code: 152 - 4" |
| `youtube.com/embed/ID` | youtube.com | mismo error 152 - 4 |
| `youtube.com/embed/OTRO_ID` | youtube.com | mismo error 152 - 4 |

Verificado por captura de pantalla, no por el evento `load`: **el evento
`load` SI dispara aunque el marco este vacio**, asi que no sirve para
detectar el fallo.

Consecuencia de diseño: nunca poner un `<iframe>` de YouTube. Va la
miniatura de verdad con un boton de play, y el play lleva al original.
Un `<video src="archivo.mp4">` de verdad SI se puede recrear y reproduce.

## Un `blob:` no se puede reusar

El `<video>` de YouTube tiene `src` tipo `blob:`. Esa fuente esta atada por
MediaSource al elemento original: copiar la URL a otro `<video>` no
reproduce nada.

## Nuestra capa no bloqueaba el feed de YouTube

Se sospecho que `overflow:hidden` en `<html>` congelaba la lista
virtualizada. **Control hecho apagando la extension del todo: YouTube home
sigue mostrando 3 items y 663px de alto.** Esa home esta casi vacia en este
Chrome. El `overflow:hidden` sigue estando mal (impide despertar una lista
virtualizada a proposito), pero no era la causa de eso.

## El video seguia sonando debajo

Medido en una pagina de YouTube re-armada: `video.paused === false`,
`currentTime 7.7`, con nuestra capa opaca encima. Se oia y no se veia.

## YouTube no usa HTML clasico

Su contenido vive en `ytd-rich-item-renderer`, `ytd-masthead`, `ytd-app`.
Buscar `<nav>`, `<article>`, `<p>` devuelve cero. Medido: la pagina
re-armada de YouTube tenia 0 tarjetas, 0 enlaces y 0 menu.

## Tipografias instaladas

De 100 probadas por medicion de ancho en canvas, **91 estan instaladas**:
Papyrus, Old English Text MT, Cooper Black, MS Sans Serif, Curlz MT,
Jokerman, Edwardian Script ITC, Broadway, Stencil, Chiller, Ravie...
No estan: Small Fonts, Terminal, Fixedsys, OCR A Extended, Eras Bold ITC,
Script MT Bold, Rockwell Extra Bold, Gloucester MT Extra Condensed,
Harlow Solid Italic.

## Instagram, feed real

2 posts, 4 imagenes visibles, el scroll no hace crecer el documento.
"Poco contenido" es un estado normal y hay que decirlo, no disimularlo.
