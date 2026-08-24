/* LO QUE SE LE PIDE A CLAUDE PARA RE-ARMAR UNA PAGINA.

   Vive aparte porque es lo que define el techo del proyecto entero: si aca
   solo se piden dos colores y una tipografia, todo sale igual por mas que
   pidas "barro antiguo". La queja fue exactamente esa, y tenia razon.

   Asi que ademas del tema se le pide CSS. Escribir CSS es seguro porque la
   pagina re-armada vive dentro de un shadow root: lo que escriba no puede
   salir de ahi ni tocar el sitio. Del lado de la extension se filtran los
   @import y las url() a la red, y listo.

   Las tipografias NO se bajan: son las que Windows ya trae. De 100 que se
   probaron en la maquina, 91 estaban instaladas.

   ---------------------------------------------------------------------
   CAMPOS QUE VUELVEN SOLO CUANDO LA PAGINA VINO FLACA
   (esto lo lee el armador, no lo borres al editar el prompt)

   El extractor mide si la pagina dio poco de donde agarrarse y lo manda en
   r.contenido.flaco (y la frase en r.contenido.porQueFlaco). Cuando eso es
   true, aca se le suelta la mano al modelo y el JSON de respuesta trae
   CUATRO campos mas. Cuando es false no vienen: ni el prompt los pide ni el
   armador tiene que buscarlos.

     bienvenida          string. Una frase de bienvenida con voz propia.
                         Se dibuja en .lema, en lugar del lema de siempre.

     aviso_propuesta     string. Un renglon corto que avisa que lo de abajo
                         lo escribio la conexion. Se dibuja en .nota.
                         SIN ESTE RENGLON EL INVENTO SE LEE COMO UN DATO
                         DEL SITIO: es la unica pieza que sostiene la
                         diferencia entre proponer y mentir.

     secciones_inventadas   [{ titulo, texto }]  de 3 a 5.
                         Se dibujan dentro de .cuerpo, cada una como el
                         encabezado .seccion mas sus parrafos.

     tarjetas_inventadas    [{ titulo, linea }]  de 6 a 9.
                         Se dibujan como .tarjeta dentro de .tarjetas, sin
                         href y sin foto.

   Todo lo dibujado a partir de esos cuatro campos lleva ADEMAS la clase
   .escrito, que es la marca de que eso no se leyo del sitio. Los cuatro son
   texto suelto: van con textContent, como todo lo demas.
   --------------------------------------------------------------------- */

const FUENTES = `
DE PIXELES, Y ESTAS VIAJAN CON LA EXTENSION (siempre estan, aunque la
maquina no las tenga instaladas):
  Press Start 2P   8 bits de arcade, la de los juegos de fichas
  Silkscreen       pixeles finos, se lee mejor en tamaños chicos
  VT323            terminal de tubo, monitor verde
  Bungee           cartel de neon, letrero de calle
  OJO: si te piden 8 bits, arcade, pixel art, NES, Game Boy o Tetris, la
  tipografia es Press Start 2P o Silkscreen. NO es MS Sans Serif: esa es
  Windows 95, que es otra cosa. Press Start 2P es MUY ancha: usala en los
  titulos y dejale al cuerpo Silkscreen o VT323, y bajale el tamaño.
ANTIGUAS Y CLASICAS: Papyrus, Old English Text MT, Castellar, Engravers MT,
  Felix Titling, Copperplate Gothic Light, Perpetua, Baskerville Old Face,
  Centaur, Garamond, Book Antiqua, Palatino Linotype, Bookman Old Style,
  Goudy Old Style, High Tower Text, Cambria, Constantia, Georgia
IMPRENTA VIEJA Y CARTEL: Cooper Black, Broadway, Elephant, Playbill, Onyx,
  Modern No. 20, Rockwell, Berlin Sans FB, Bell MT, Colonna MT,
  Imprint MT Shadow, Wide Latin, Showcard Gothic, Stencil, Poor Richard
MANUSCRITAS: Edwardian Script ITC, Kunstler Script, French Script MT,
  Vivaldi, Vladimir Script, Monotype Corsiva, Brush Script MT,
  Lucida Calligraphy, Lucida Handwriting, Bradley Hand ITC, Segoe Script,
  Ink Free, MV Boli, Mistral, Freestyle Script, Gigi, Parchment
JUGUETONAS: Comic Sans MS, Curlz MT, Jokerman, Kristen ITC, Chiller,
  Juice ITC, Tempus Sans ITC, Viner Hand ITC, Magneto, Ravie, Snap ITC,
  Harrington, Forte, Niagara Solid, Informal Roman
DE COMPUTADORA VIEJA: MS Sans Serif, Microsoft Sans Serif, Tahoma,
  Courier New, Consolas, Lucida Console
LIMPIAS: Segoe UI, Century Gothic, Candara, Corbel, Franklin Gothic Medium,
  Gill Sans MT, Trebuchet MS, Verdana, Arial Narrow, Arial Black, Impact,
  Haettenschweiler, Maiandra GD, Lucida Bright`;

const PIEZAS = `
.marco        toda la pagina (el fondo vive aca)
.cab          la barra de arriba, pegada al scroll
.marca-txt    el nombre del sitio, arriba a la izquierda
.marca-ico    su icono
.menu a       cada enlace del menu
.volver       el boton "Ver la original"
.hero         la portada
.hero h1      el titulo grande
.ojo          el renglon chico ARRIBA del titulo. LLEVA TEXTO (el nombre del
              sitio). No es una linea decorativa: no le pongas alto fijo
.lema         el parrafo de presentacion
.hero-img     el marco de la foto de portada     .hero-img img  la foto
.medio        la caja del video entero (el reproductor mas su enlace de salida)
.video        el reproductor (lleva aspect-ratio 16/9, no lo rompas)
.video.miniatura  la miniatura con boton de play que se muestra cuando el video
              no se puede incrustar. Junto con .medio-enlace es la UNICA forma
              que le queda a la persona de llegar al video
.play         la bola del play sobre la miniatura   .play-txt  su renglon de abajo, LLEVA TEXTO
.medio-enlace el enlace que abre el video en el sitio original. LLEVA TEXTO
              .medio-ico  su iconito
.seccion      cada encabezado de seccion          .seccion-ico  su icono
.tarjetas     la rejilla                          .tarjeta      cada tarjeta
.tarjeta-img  el marco de su foto                 .tarjeta-img img  la foto
.tarjeta-txt h3   su titulo                       .tarjeta-play  su chapa de play
.mas          el boton "Cargar mas", debajo de la rejilla. LLEVA TEXTO
.vacio        el cartel que avisa que esta pagina casi no tiene contenido.
              LLEVA TEXTO, es un parrafo corto: no lo achiques ni lo escondas
              .vacio h2  su titulo    .bt  sus botones, LLEVAN TEXTO
.cuerpo       la columna de lectura
.cuerpo p     cada parrafo                        .cuerpo li    cada renglon de lista
.cuerpo blockquote  las citas
.foto         cada foto del cuerpo                .foto figcaption  su pie
.escrito      la firma de lo que escribiste vos porque el sitio no lo tenia.
              No es una pieza aparte: se le SUMA a otra (a una .tarjeta, a un
              encabezado .seccion, al titulo, a un parrafo). Cae sobre varias
              piezas a la vez: que se note de quien es la escritura, sin
              volverse una fila de advertencias. Solo aparece cuando la
              pagina venia flaca
.sello        el signo chiquito de esa firma. Es un elemento propio adentro de
              la pieza .escrito, va en el flujo y no tapa nada. Estilizalo
              todo lo que quieras -es tuyo tambien-, pero tiene que verse
.nota         el renglon que avisa que eso es una propuesta y no un dato del
              sitio. LLEVA TEXTO y no se esconde. Tambien solo cuando venia
              flaca
.pie          el pie de pagina
.motas        120 cajitas vacias que CAEN. No son nada hasta que vos decidas
              que son: gotas de sangre, piezas de Tetris, ceniza, nieve,
              hojas, chispas, monedas. Vienen apagadas. Ver abajo.
.motas .fila  las cajitas vienen repartidas en seis filas de 20, y cada fila
              es un nodo. Es lo que le da su turno a cada una en el Tetris.
              No hace falta que la toques
.motas i      cada cajita. Trae --i con su numero (0 a 119). Su posicion, su
              velocidad y su tamaño ya vienen sorteados uno por uno: NO
              tenes que repartirlas vos. Apuntale con \`.motas i\`, nunca con
              \`.motas > i\`, que ahora cuelgan de su fila`;

const PERILLAS = `
--velo, --velo-op, --velo-tam, --velo-mezcla
    una textura ENCIMA de todo (grano de pelicula, papel, lineas de tele).
    Ejemplo: --velo: var(--tex-grano); --velo-op: .45; --velo-mezcla: multiply;
--fondo-tex, --fondo-tex-tam    una textura en el fondo, debajo del contenido
--filtro-foto   se aplica a TODAS las fotos. Ejemplo: sepia(.75) contrast(1.15)
--foto-marco    borde interno blanco de las fotos, tipo polaroid. Ejemplo: 14px
--papel-borde   el color de todos los bordes
--cab-fondo, --cab-tinta   fondo y tinta de la barra de arriba
--escrito-sello  la firma que deja .escrito, entre comillas. Por defecto es un
    signo chiquito. Ejemplo: --escrito-sello: " (asi podria ser)";
--radio, --sombra, --papel, --tinta, --tinta2, --acento, --acento2, --linea

TEXTURAS YA HECHAS (no bajan nada de la red, se usan tal cual):
  var(--tex-grano)      grano de pelicula
  var(--tex-papel)      fibra de papel
  var(--tex-barro)      superficie de arcilla, con relieve
  var(--tex-lino)       trama de tela
  var(--tex-rayas)      rayas diagonales
  var(--tex-cuadricula) cuadricula   (pone --velo-tam: 24px 24px)
  var(--tex-puntos)     puntos       (pone --velo-tam: 8px 8px)
  var(--tex-scan)       lineas de television vieja`;

/* QUE ES LO PROTAGONISTA SEGUN LO QUE RESULTO SER LA PAGINA.
   El extractor ya la clasifico. Sin esto, a una pagina de YouTube o de
   Instagram se le pedia una columna de lectura que ahi no existe, y el
   diseño salia vacio por mas bonito que fuera el CSS. */
const ENFOQUE = {
  documento: `ESTA PAGINA ES UN DOCUMENTO: se lee de corrido.
Lo protagonista es .cuerpo, la columna de lectura. Trabajala en serio:
el ancho de linea, el tamaño y el interlineado del parrafo, la primera
letra si el estilo lo pide, como se ven las citas y los pies de foto.
La rejilla de tarjetas aca es secundaria, o puede no haber ninguna.`,

  catalogo: `ESTA PAGINA ES UN CATALOGO: son muchas piezas una al lado de la otra.
LO PROTAGONISTA ES LA REJILLA, .tarjetas y .tarjeta. Ahi va tu esfuerzo:
cuantas columnas y de que ancho minimo, el espacio entre tarjetas, la forma
de la miniatura (.tarjeta-img, su proporcion y su recorte), la sombra, el
borde, que pasa al pasar el mouse encima (:hover), como se ve el titulo
sobre la foto o debajo de ella, y el boton .mas al final.
NO gastes reglas en .cuerpo: aca casi no hay parrafos que estilizar.`,

  app: `ESTA PAGINA ES UNA APLICACION: es una lista viva de piezas, no un texto.
LO PROTAGONISTA ES LA REJILLA, .tarjetas y .tarjeta. Ahi va tu esfuerzo:
cuantas columnas y de que ancho minimo, el espacio entre tarjetas, la forma
de la miniatura (.tarjeta-img, su proporcion y su recorte), la sombra, el
borde, el :hover, el titulo, y el boton .mas al final. Cuidale tambien la
barra .cab, que en una aplicacion es lo primero que se mira.
NO gastes reglas en .cuerpo: aca casi no hay parrafos que estilizar.`
};

function promptRearmar(r){
  const c = r.contenido || {};
  const enfoque = ENFOQUE[c.clase] || ENFOQUE.documento;
  const corto = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const lista = (a, n) => (Array.isArray(a) ? a : []).slice(0, n)
                            .map(x => '- ' + corto(typeof x === 'string' ? x : x.titulo || x.txt))
                            .join('\n') || '- (ninguno)';
  const cuantas = (Array.isArray(c.tarjetas) ? c.tarjetas : []).length;

  /* DOS CASOS DISTINTOS, Y SE EXCLUYEN.
     "Poco" es una pagina que trajo algo pero poco: se diseña para eso y no
     se inventa nada. "Flaca" -lo mide el extractor, ver medidaFlaca()- es
     que casi no hubo pagina que leer: ahi describirla no da nada y se le
     suelta la mano al modelo para que la imagine entera. Poner los dos
     textos juntos seria pedirle que invente y prohibirselo en el mismo
     renglon, que es como estaba antes de que existiera esta medida. */
  const flaco = c.flaco === true;
  const porQue = corto(c.porQueFlaco) || 'se leyeron muy pocas piezas';

  /* Poco contenido es normal, no un fallo: una home de YouTube recien abierta
     trae 3 items. El diseño tiene que verse digno asi, sin fingir que esta
     llena. */
  const poco = (!flaco && cuantas <= 4) ? `
OJO, HAY POCO CONTENIDO: se pudieron leer ${cuantas} tarjeta(s). Es normal y
no es un error. Diseña para eso: la rejilla tiene que verse bien con dos o
tres tarjetas, no supongas una pantalla llena. No te inventes contenido que
no esta, y no escondas el hueco: el armador puede mostrar .vacio
avisandolo, dale un aspecto digno dentro del estilo en vez de disimularlo.
` : '';

  const licencia = !flaco ? '' : `
ESTA PAGINA VINO FLACA, Y ESO TE CAMBIA EL TRABAJO
De este sitio se leyo muy poco: ${porQue}.
No es un error del sitio ni tuyo. Lo que NO vas a hacer es disimularlo con un
titulo, un lema y una pantalla con dos frases sueltas: eso es lo tibio que
estamos sacando de en medio.

TENES LICENCIA AMPLIA. No describas esta pagina: IMAGINALA. Escribi entera
la pagina que este sitio deberia tener con el estilo que te pidieron, como
si te hubieran contratado para rehacerlo de cero. Inventa el mundo completo:
la voz, como se llama cada seccion, de que habla, que se ve en la rejilla.
Mientras mas lejos llegues, mejor. Nadie te va a pedir que te contengas.

Ademas de todo lo de siempre, devolve estos cuatro campos:
- "bienvenida": una frase de bienvenida con voz propia, en español de
  Guatemala, tuteando. Que suene a una persona y no a una agencia.
- "secciones_inventadas": de 3 a 5 secciones, cada una { "titulo", "texto" },
  en el tono del estilo que te pidieron. El titulo corto; el texto de 2 a 4
  frases, escrito de verdad, no un relleno.
- "tarjetas_inventadas": de 6 a 9 tarjetas para llenar la rejilla, cada una
  { "titulo", "linea" }. Una sola linea por tarjeta, con gracia.
- "aviso_propuesta": un renglon corto, en el tono del estilo, diciendole a la
  persona que lo que sigue lo escribiste vos y no se leyo del sitio.

LA UNICA CONDICION, Y NO ES UN LIMITE CREATIVO
Nada de lo que inventes puede presentarse como un HECHO sobre este sitio.
Nada de precios, fechas, horarios, cifras, porcentajes, direcciones, nombres
de personas, premios ni noticias: eso suena a dato verdadero y no lo es.
Escribi en propuesta, no en reporte. El tono, las formas, los nombres de las
secciones, el mundo entero: todo eso es libre.

DONDE CAE LO QUE ESCRIBAS, PARA QUE LE APUNTES CON EL CSS
La bienvenida va en .lema; el aviso en .nota; cada seccion inventada es un
encabezado .seccion con sus parrafos dentro de .cuerpo; cada tarjeta
inventada es una .tarjeta dentro de .tarjetas. Todas ellas llevan ademas la
clase .escrito. Asi que aca SI vale gastar reglas en .cuerpo aunque esta
pagina sea una aplicacion, y vale trabajar .escrito para que se note de
quien es la escritura sin convertirla en un cartel de advertencia.
`;

  return `Vas a RE-ESCRIBIR una pagina web con el contenido que ya tiene.
No es cambiarle los colores: es diseñarla de nuevo.

LO QUE SE LEYO DE LA PAGINA
SITIO: ${c.sitio || '?'}
MARCA: ${corto(c.marca)}
TITULO: ${corto(c.titulo)}
DESCRIPCION: ${corto(c.lema) || '(no tiene)'}
MENU: ${(c.menu || []).slice(0, 8).join(', ') || '(no tiene)'}
SECCIONES:
${lista(c.titulos, 8)}
TARJETAS:
${lista(c.tarjetas, 6)}
COMO ESCRIBE:
${lista(c.muestra, 2)}

QUE CLASE DE PAGINA RESULTO SER
${enfoque}
${poco}${licencia}${r.tema ? '\nEL ESTILO QUE PIDIO LA PERSONA, Y ESTO MANDA SOBRE TODO LO DEMAS:\n"' + corto(r.tema) + '"\n' : ''}
SE LIBRE. Si te piden un estilo, tenes que poder hacerlo de verdad, no
insinuarlo. "Barro antiguo" es terracota, textura de arcilla con relieve,
tipografia con serifas gastadas, bordes irregulares y fotos en sepia; no es
un azul con las esquinas mas cuadradas. "Windows 95" es gris #c0c0c0,
bordes biselados de 2px, barra de titulo azul con degradado, MS Sans Serif
y CERO esquinas redondeadas. "Hello Kitty" es rosa pastel, todo redondo,
Curlz MT, lunares y bordes gruesos blancos. "Foto vieja" es blanco y negro
o sepia, grano encima de toda la pagina, marco de polaroid en las fotos.
Nadie te esta pidiendo que respetes la forma que ya tiene la pagina: si el
estilo pide que la barra de arriba sea una barra de titulo de Windows, o
que las tarjetas esten torcidas como fotos tiradas sobre una mesa, hacelo.

Y AHORA VA MAS LEJOS: QUE EL ESTILO SE VEA EN LA FORMA, NO SOLO EN EL COLOR
Cambiar la paleta y la tipografia es la mitad del trabajo, y es la mitad que
menos se nota. Un estilo de verdad cambia la FORMA de la pagina: cuantas
columnas hay y de que ancho, como esta alineado el texto, que forma tiene una
tarjeta, si estan todas derechas o cada una un poco torcida, si la barra de
arriba es una barra, una placa o una cinta. Mira estos ejemplos y despues
hace el tuyo, que no tiene por que parecerse a ninguno:
- Windows 95: .cab es una barra de titulo con biseles de 2px (borde blanco
  arriba y a la izquierda, gris oscuro abajo y a la derecha), cada .tarjeta
  es una ventanita con su propia barrita de titulo, .mas es un boton que se
  hunde al pulsarlo, radio 0 en todo y ni una sombra suave.
- Periodico viejo: .tarjetas en cinco columnas angostas con una linea
  vertical entre ellas, .cuerpo a dos columnas con column-count y
  column-rule, titulares en condensada y mayusculas, un filete grueso y otro
  fino debajo de .cab.
- Fotos tiradas sobre una mesa: cada .tarjeta con un rotate distinto segun
  su :nth-child (-2deg, 1.5deg, -1deg, .5deg), marco blanco grueso con
  --foto-marco y una sombra dura y corta, no difusa.
- Barro antiguo: bordes irregulares con border-radius de cuatro valores que
  no coinciden (18px 7px 24px 9px), .seccion como una franja estampada a
  todo lo ancho, relieve con var(--tex-barro) y las esquinas comidas.
- Ficha de museo: una sola columna angosta, la foto grande y el texto chico
  muy abajo, todo alineado a la izquierda, cada .tarjeta numerada con
  counter-reset y counter-increment.
Herramientas para lograrlo, y ninguna baja nada de la red: ::before y ::after
con content (comillas, flechas, un guion largo, un ">" antes de cada
seccion), transform con rotate o skew, clip-path, :nth-child para que no
todas las tarjetas sean iguales, column-count y column-rule, grid-column:
span 2 para una tarjeta que mande mas que las otras, counter() para numerar,
border-radius de cuatro valores, box-shadow duro sin blur, outline con
outline-offset, y degradados repetidos para rayas, biseles y franjas.

LO QUE SEPARA UNA JOYA DE UN DISEÑO TIBIO, MEDIDO
Esto no es teoria. Son DOS respuestas tuyas al MISMO sitio, las dos con la
misma paleta y la misma tipografia, medidas en el navegador:

   la que quedo como una joya          la que quedo tibia
   h1 de 85px con una sombra de tres   h1 de 16px, sin sombra, MAS CHICO
   colores desplazada                  que su propio .seccion, que media 27
   .hero-img con su marco propio       .hero-img sin UNA SOLA regla
   el cuerpo en 17px, se lee de lejos  lema, menu, cuerpo y botones: todos
                                       en el mismo 11px
   38 reglas, con hover y ::after      20 reglas, cero hover, cero ::after
   las 34 piezas vestidas              15 de 34 piezas SIN vestir

No las separa el gusto: las separa la ESCALA y la COBERTURA. Una pagina
donde todo mide lo mismo no se lee como un estilo, se lee como un error.

LA ESCALA ES LO PRIMERO QUE SE VE DESDE LA OTRA PUNTA DEL CUARTO
- El h1 de la portada es la pieza mas grande de la pagina, SIEMPRE. Nunca
  por debajo de clamp(40px, 6vw, 86px). Con Press Start 2P -que es muy
  ancha- usa el extremo bajo, clamp(28px, 4vw, 52px), pero jamas 16px.
- Ese h1 tiene que medir por lo menos CUATRO VECES el parrafo del cuerpo.
- Ningun texto por debajo de 13px. Con Silkscreen, VT323 o Press Start 2P
  el piso sube a 15px: a 11px esas tres no se leen, se adivinan.
- Por lo menos TRES tamaños distintos en la pagina. Si le pones el mismo
  font-size a .lema, a .menu a, a .cuerpo p y a .mas, ya perdiste.
- LOS TAMAÑOS EN px O EN clamp(), NUNCA EN rem NI EN em. Tu CSS vive
  dentro de una pagina ajena, y ahi el rem no se mide contra lo nuestro:
  se mide contra el <html> DE ESE SITIO. Miles de sitios usan el truco de
  html{font-size:62.5%} para que 1rem sean 10px. Medido en el navegador:
  un diseño escrito con 2.5rem de titulo y .7rem de cuerpo se ve a 40px y
  11px en un sitio normal, y a 25px y 7px en uno de esos. El mismo CSS,
  ilegible, y del lado de aca no hay forma de enterarse.
- El titulo lleva SU PROPIO efecto, no solo un color: text-shadow
  desplazada en dos colores, -webkit-text-stroke, un ::after corrido por
  detras. Es la firma del estilo y es lo que se recuerda de la pagina.

LAS NUEVE PIEZAS QUE NO PUEDEN QUEDAR SIN VESTIR
  .cab   .hero h1   .hero-img   .seccion   .tarjeta
  .cuerpo p   .mas   .pie   .volver
Cada una tiene que aparecer en tu CSS con al menos una regla propia.
.hero-img es la foto de portada y se lleva media pantalla: dejarla sin
marco es lo que hace que la pagina se vea a medio vestir. Si el sitio trae
video, .medio, .miniatura y .play entran tambien en esa lista.

Y LAS TRES HERRAMIENTAS QUE HACEN QUE UN ESTILO SE RECONOZCA. Una de cada
una como MINIMO, y la primera es la que siempre te olvidas:

  1. un ::before o ::after con content. Es lo que pone la marca del estilo
     donde el HTML no tiene ningun nodo: un ">" antes de cada .seccion, un
     numerito con counter() en cada .tarjeta, comillas en la cita, una
     franja diagonal sobre la .cab, la sombra corrida del titulo. Ejemplo:
       .seccion::before{content:"> ";color:var(--acento2)}
  2. un :hover. Una tarjeta que no reacciona se siente muerta.
  3. el efecto propio del titulo, el del punto de arriba.

DEVOLVE SOLO ESTE JSON
{
 "titulo":"titulo para la pagina re-armada, 2 a 6 palabras",
 "lema":"una o dos frases presentando la pagina, en español de Guatemala, tuteando. Si ya trae descripcion, mejorala; si no, escribila con lo que leiste",
 "seccion_tarjetas":"encabezado de 1 a 3 palabras para la rejilla de tarjetas, o \\"\\" si no hay",
 "acento":"#hex", "acento2":"#hex", "fondo":"#hex", "oscuro":true|false,
 "fuente_tit":"nombre exacto de una fuente de la lista",
 "fuente_txt":"nombre exacto de una fuente de la lista",
 "radio":"0px a 40px", "mayus":true|false,
 "iconos":[4 nombres exactos de la lista de iconos],
 "css":"reglas CSS que terminan de darle el estilo. Es lo mas importante de todo"${flaco ? `,
 "bienvenida":"la frase de bienvenida con voz propia, en español de Guatemala",
 "aviso_propuesta":"un renglon corto avisando que lo que sigue lo escribiste vos",
 "secciones_inventadas":[{"titulo":"corto","texto":"2 a 4 frases"}],
 "tarjetas_inventadas":[{"titulo":"corto","linea":"una sola linea"}]` : ''}
}

FUENTES (van sin bajar nada, ya estan en la maquina):${FUENTES}

ICONOS (elegi 4 por su nombre exacto):
arbol, auto, caballo, cactus, camara, cohete, columna, conejo, control,
engranaje, flor, gato, guitarra, hoja, huella, hueso, joystick, libro,
llave, luna, maceta, maleta, mariposa, microfono, monitor, montana, nota,
nube, ola, pajaro, paleta, pelicula, pelota, pergamino, perro, pez, piano,
pincel, planta, pluma, raton, rueda, semilla, sol, taco, tortuga, trofeo

EL CSS
Se aplica DENTRO de la pagina re-armada, encima de una hoja base. No podes
romper nada del sitio: esto vive aislado. Estas son las piezas que podes
tocar:${PIEZAS}

Y estas las variables, que resuelven de una sola linea lo que en CSS suelto
te costaria veinte:${PERILLAS}

LA MARCA DE LO ESCRITO
Lo que vos escribas se dibuja ya con una marquita al final (.sello). No le
agregues OTRO signo con .escrito::after: salen dos juntos y se ve sucio.
Si querés otro simbolo, cambiale el suyo: --escrito-sello: "*";
y el estilo de la marca se toca en .sello.

EL FONDO SE MUEVE
Tenes 120 cajitas vacias en una capa DE FONDO -van detras de todo el
contenido, asi que nunca tapan una letra- listas para que las conviertas en
lo que pida el tema. Vienen apagadas.

  --motas-op      0 apagadas, 1 encendidas (.5 para que sean sutiles)
  --mota-ancho    --mota-alto     --mota-radio     --mota-color
  --mota-tiempo   cuanto dura una vuelta (7s por defecto)
  --mota-giro-de  --mota-giro-a   giran mientras se mueven
  --mota-curva    la curva del movimiento (linear por defecto). steps(18)
                  da un movimiento a saltos, de pantalla vieja
  --mota-azar     cuanto se desordenan entre si, de 0 a 1. Por defecto 1:
                  cada una va por su lado, a su ritmo y a su tamaño. En 0
                  van todas iguales y a la vez
  --mota-desfase  un escalonado a proposito, encima de lo anterior
  --mota-anim     QUE MOVIMIENTO hacen. Aca esta lo bueno, mira abajo
  --mota-tetris   enciende la partida de Tetris y dice cuanto dura

EL MOVIMIENTO NO SE ELIGE DE UNA LISTA: LO ESCRIBIS VOS
Aca no hay un cajon de efectos hechos, y es a proposito. Un menu de seis
opciones termina con seis sitios distintos moviendose igual, que es
exactamente el techo del que este proyecto viene escapando. Lo unico que
hay hecho es au-caer, que es lo que hacen si no les decis nada.

Vos escribis el @keyframes y le pasas el nombre en --mota-anim. Y lo que te
lo hace posible es esto: CADA UNA DE LAS 120 CAJITAS VIENE CON SU PROPIO
AZAR YA SORTEADO, en variables que podes usar dentro de tu @keyframes. Eso
es lo que separa una animacion viva de 120 cajitas moviendose identicas:

  --x   su columna suelta, de 0% a 97%     --y   su altura, de 0vh a 96vh
  --z   de -.4 a .4: para tamaño, desvio lateral, giro, retraso, lo que sea
  --v   de -.35 a .35: ya le cambia la velocidad a cada una
  --d   de -1 a 0: en que punto de su vuelta arranca. Ya esta aplicado
  --i   su numero, de 0 a 119              --bx  repartidas parejo de borde
                                                 a borde (para barras)

Meté --z en un calc y la misma regla deja de verse repetida: cada cajita
tiene el suyo.

Pensa que se mueve en el mundo de ESTE sitio y hacelo. Un vivero: polen y
hojas girando. Un bar de la costa: burbujas subiendo con desvio. Una web de
astronomia: estrellas titilando quietas, cada una a su ritmo. Un estudio de
grabacion: barras de ecualizador rebotando desde abajo (usa --bx). Una
tienda de cafe: vapor. Un diario: una cinta cruzando de lado a lado. Una
casa embrujada: gotas cayendo lento y torcidas. Un cerro nevado: nieve. Un
sitio de dinero: monedas girando. Ninguno de esos esta hecho: hacelos.

Asi se ve la forma -NO LO COPIES, es para que veas como se usa el azar-:

  .marco{--motas-op:.8; --mota-anim:au-zigzag; --mota-ancho:12px;
         --mota-alto:12px; --mota-tiempo:8s}
  @keyframes au-zigzag{
    0%  {transform:translate(0,-14vh) rotate(0deg)}
    25% {transform:translate(calc(40px + var(--z)*90px),25vh) rotate(90deg)}
    50% {transform:translate(calc(-40px - var(--z)*90px),50vh) rotate(180deg)}
    75% {transform:translate(calc(40px + var(--z)*90px),75vh) rotate(270deg)}
    100%{transform:translate(0,114vh) rotate(360deg)}
  }

Cuatro avisos que valen para todos los efectos:
- El nombre de tu @keyframes tiene que ir SI O SI en --mota-anim. Si lo
  escribis y no lo nombras ahi, las cajitas se quedan quietas.
- Apuntales con \`.motas i\`, nunca con \`.motas > i\`: cuelgan de su fila.
- Dentro del @keyframes mové SOLO transform, opacity y filter. Son 120
  cajitas: esas tres las dibuja la tarjeta de video sola, pero animar
  height, width, top, left o margin obliga al navegador a recalcular la
  pagina entera 120 veces por cuadro y la deja a los tirones. Todo lo que
  quieras hacer sale de transform: translate, rotate, scale y skew.
- Si el tema no pide movimiento -un papel viejo, una ficha de museo-
  dejalas apagadas. No todo tiene que moverse.

LA UNICA EXCEPCION: UNA PARTIDA DE TETRIS DE VERDAD (arcade, 8 bits, NES)
Esta si viene hecha, porque NO se puede escribir desde el CSS: necesita que
cada fila sea un nodo aparte y seis animaciones encastradas entre si. Es
estructura, no estilo.

Y no es "cajitas cuadradas cayendo". Es la partida entera: caen seis filas,
una detras de otra, cada una apoyandose sobre la anterior. Cuando el
tablero esta lleno, la fila de abajo parpadea, se borra, y todo lo que
estaba encima BAJA UN RENGLON. Y otra vez, y otra, de abajo hacia arriba,
hasta vaciar el tablero. Ahi vuelve a empezar, sin costura.

Vos le ponés el color, el radio y el ritmo. Copiá este bloque tal cual y
cambiale los colores:

  .marco{--motas-op:.55; --mota-tetris:9s; --mota-anim:au-pieza;
         --mota-radio:0; --mota-curva:steps(20)}
  .motas i:nth-child(4n){--mota-color:#00ffff}
  .motas i:nth-child(4n+1){--mota-color:#ffff00}
  .motas i:nth-child(4n+2){--mota-color:#ff00ff}
  .motas i:nth-child(4n+3){--mota-color:#00ff66}

  Las tres primeras van juntas o no funciona: --mota-tetris enciende la
  partida y dice cuanto dura, --mota-anim:au-pieza deja quieta a cada pieza
  en su celda -si no, cae por su cuenta ADEMAS de con su fila- y --motas-op
  por debajo de 1 la deja de fondo, que es donde tiene que estar.
  El ancho y el alto NO los pongas: las piezas tienen que embonar entre
  ellas o la fila queda con huecos y no se completa nunca.

Y si el tema no pide movimiento -un papel viejo, una ficha de museo- dejalas
apagadas: no todo tiene que moverse.

LA FORMA TAMBIEN ES EL ESTILO
No alcanza con cambiar colores y tipografia: el borde, la sombra y la
esquina son lo que hace que un estilo se reconozca. Recetas que funcionan y
que podes escribir tal cual:

- Marco de pixeles / Tetris (para 8 bits, arcade, NES): la esquina no se
  redondea, se ESCALONA. Se hace con sombras apiladas de 4px sin difuminar,
  que dibujan bloques:
    border-radius:0; border:0;
    box-shadow: 0 -4px 0 0 #fff, 0 4px 0 0 #fff, -4px 0 0 0 #fff,
                4px 0 0 0 #fff, 0 0 0 4px #000;
  Para una pieza de Tetris, sombra dura en dos colores desplazada en
  diagonal: box-shadow: 4px 4px 0 0 #0ff, 8px 8px 0 0 #f0f;
  Y en las fotos, image-rendering:pixelated.
- Ventana de sistema (Windows 95): borde de 2px con los cuatro lados de
  distinto color -claro arriba e izquierda, oscuro abajo y derecha- y al
  presionar, invertidos.
- Papel viejo: sin sombra, borde fino irregular, y el velo de grano encima.
- Polaroid: --foto-marco de 14px y una rotacion chica y distinta en cada
  tarjeta con :nth-child.

REGLAS DEL CSS
- Escribilo como texto plano en un solo campo JSON, con \\n entre reglas.
- Nada de @import ni de url() a internet: no hay red. Las texturas de arriba
  y los degradados son todo lo que necesitas, y alcanzan.
- Se lee: el texto tiene que contrastar contra su fondo. Un estilo oscuro
  lleva tinta clara. Si el estilo pide una fuente dificil de leer, usala en
  los titulos y dejale al cuerpo una legible.
- No le pongas alto fijo a .marco ni saques el scroll.
- EL MEDIO NO SE ESCONDE. Sobre .medio, .video, .miniatura, .play, .play-txt
  y el enlace al original (.medio-enlace) esta PROHIBIDO display:none,
  visibility:hidden, opacity:0, height:0, max-height:0, width:0, font-size:0,
  content-visibility:hidden y cualquier cosa que los deje sin tamaño o fuera
  de la pantalla. Muchas veces ese enlace es la unica manera que le queda a
  la persona de ver el video: si lo tapas, la dejaste sin nada. Estilizalos
  todo lo que quieras, pero tienen que quedar visibles y pulsables.
- LA FIRMA NO SE BORRA. Sobre .escrito y .sello esta PROHIBIDO display:none,
  visibility:hidden, opacity:0, content:none, font-size:0, height:0, width:0,
  color:transparent y --escrito-sello vacio. Esa firma es la unica condicion
  de que puedas inventar: es lo que separa una propuesta de una mentira sobre
  una pagina real. Vestila como quieras, pero tiene que quedar visible.
- Y NO LO TAPES CON EL VELO. El velo (--velo-op) es una capa que va ENCIMA de
  toda la pagina, reproductor incluido, y hay texturas que son opacas
  (var(--tex-barro) lo es). Con la opacidad alta el video sigue ahi y no se
  ve. Usalo como textura, no como pintura: de .5 no pasa.
- Entre 30 y 80 reglas, y se cuentan. La respuesta tibia de arriba se quedo
  en 20: con eso dejo el titulo en 16px, 15 piezas sin vestir y ni un hover.
  Tibio es exactamente lo que no queremos: esto tiene que verse desde la
  otra punta del cuarto.
- Todas las piezas de la lista llevan TEXTO adentro, menos las que dicen
  "icono". No las conviertas en adornos ni les pongas un alto fijo: el texto
  se corta y no se entiende que decia.

Nada de texto fuera del JSON.`;
}

module.exports = { promptRearmar };
