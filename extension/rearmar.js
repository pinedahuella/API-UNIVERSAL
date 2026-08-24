/* EL ARMADOR de API UNIVERSAL.

   Recibe lo que saco el extractor y levanta HTML NUESTRO con eso.

   POR QUE SHADOW DOM:
   la pagina que estamos vistiendo tiene su propio CSS y no le podemos pedir
   permiso. Un `a{color:red}` suyo, o un `*{box-sizing}` raro, se nos mete en
   lo que dibujamos. Dentro de un shadow root el CSS del sitio NO entra, y el
   nuestro no se le escapa al sitio. Lo unico que cruza son las variables
   --au-*, porque las propiedades personalizadas se heredan, y eso es
   justamente lo que queremos que cruce: el tema.

   POR QUE ENCIMA Y NO EN LUGAR DE:
   no se borra ni se esconde nada del sitio. Nuestro contenedor va fijo y
   opaco arriba, y quitarlo es borrar UN nodo. Del sitio no se toca ni el
   HTML ni el CSS ni el scroll; lo unico que se le hace es PAUSAR lo que
   estuviera sonando -tapado y sonando es peor que tapado- y al quitarnos se
   le vuelve a dar play. Eso es todo lo que hay que restaurar, y se
   restaura.

   TRES COSAS QUE SE MIDIERON EN VIVO Y MANDAN SOBRE TODO LO DEMAS:

   1. NUNCA BLOQUEAR. Antes se le ponia overflow:hidden a <html> para que no
      se movieran dos scrolls a la vez. Eso CONGELA el documento de abajo
      (scrollHeight se queda pegado a innerHeight) y en una lista
      virtualizada -YouTube, Instagram- el sitio deja de renderizar items:
      "cargar mas" no puede funcionar nunca. Ahora no se toca el scroll de
      nadie y la rueda se contiene con overscroll-behavior en .marco.

   2. INCRUSTAR SOLO LO PROPIO. Un <iframe> de youtube-nocookie dentro de
      instagram.com se probo: el evento load SI dispara, pero lo que se ve es
      el icono de documento roto, porque la CSP del sitio manda sobre lo que
      podemos incrustar. Asi que se incrusta unicamente cuando el medio es
      del mismo sitio donde estamos parados. En cualquier otro caso:
      miniatura + enlace al original. Nunca se deja a la persona sin forma
      de ver el video.

   3. SI NO HAY NADA, SE DICE. Una home de YouTube con 3 items o un
      Instagram con 2 posts son un resultado normal, no un error. Lo que no
      se puede hacer es presentar una pagina vacia como si fuera un exito. */

/* ---------- el tema cuando la conexion no esta ----------
   Mismo criterio que en la pagina propia: la generacion es un extra, nunca
   un requisito. Si el servidor no responde, esto arma un tema decente con
   lo que dice la pagina, y la demostracion no se cae. */
const PALETAS = [
  { claves:['juego','juegos','game','gaming','arcade','jugar','play','consola','videojuego'],
    acento:'#7c4dff', acento2:'#c77dff', fondo:'#12102a', oscuro:true, radio:'4px',
    tit:'Bebas Neue', txt:'Space Grotesk', mayus:true,
    iconos:['joystick','control','trofeo','cohete'] },
  { claves:['wiki','enciclopedia','historia','articulo','biografia','universidad','ciencia','estudio'],
    acento:'#8a5a2b', acento2:'#c08a55', fondo:'#f6efe3', oscuro:false, radio:'6px',
    tit:'Playfair Display', txt:'Lora', mayus:false,
    iconos:['libro','pergamino','pluma','columna'] },
  { claves:['tienda','comprar','producto','precio','envio','oferta','carrito'],
    acento:'#0e8f6f', acento2:'#57d0ab', fondo:'#eafaf4', oscuro:false, radio:'14px',
    tit:'Space Grotesk', txt:'Space Grotesk', mayus:false,
    iconos:['maleta','llave','rueda','trofeo'] },
  { claves:['comida','receta','cocina','restaurante','menu','cafe','postre'],
    acento:'#e05a3a', acento2:'#f3a08a', fondo:'#fdefe6', oscuro:false, radio:'20px',
    tit:'Playfair Display', txt:'Lora', mayus:false,
    iconos:['taco','planta','flor','hoja'] },
  { claves:['musica','banda','cancion','disco','radio','podcast','sonido'],
    acento:'#e0407f', acento2:'#f37aa8', fondo:'#1c0f1a', oscuro:true, radio:'18px',
    tit:'Playfair Display', txt:'Lora', mayus:false,
    iconos:['nota','guitarra','microfono','piano'] },
  { claves:['noticia','diario','prensa','periodico','actualidad','politica'],
    acento:'#1f4e8c', acento2:'#5f92d6', fondo:'#f2f5fa', oscuro:false, radio:'2px',
    tit:'Playfair Display', txt:'Lora', mayus:false,
    iconos:['pergamino','pluma','libro','monitor'] },
  { claves:['tecnologia','software','codigo','programar','app','datos','nube','api'],
    acento:'#3b76f6', acento2:'#7aa5fb', fondo:'#0e1420', oscuro:true, radio:'8px',
    tit:'Space Grotesk', txt:'Space Grotesk', mayus:false,
    iconos:['engranaje','monitor','llave','cohete'] },
  { claves:['planta','jardin','vivero','flor','natural','bosque','animal','mascota','perro','gato'],
    acento:'#2f8f5b', acento2:'#6bc493', fondo:'#eaf6ee', oscuro:false, radio:'24px',
    tit:'Fredoka', txt:'Quicksand', mayus:false,
    iconos:['hoja','planta','flor','pajaro'] }
];

const NEUTRA = { acento:'#5b6cff', acento2:'#8b5cf6', fondo:'#f4f6fb', oscuro:false,
                 radio:'14px', tit:'Space Grotesk', txt:'Space Grotesk', mayus:false,
                 iconos:['nube','sol','hoja','montana'] };

/* por palabra completa, nunca por subcadena: 'api' vive dentro de 'rapido'
   y 'ola' dentro de 'chocolate'. Ya nos mordio en la pagina propia. */
function AU_TEMA_LOCAL(txt, titulo){
  const pal = String(txt || '').toLowerCase().normalize('NFD')
                .replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  let elegida = NEUTRA;
  for(const p of PALETAS){
    if(p.claves.some(k => pal.some(w => w === k || (k.length >= 5 && w.startsWith(k))))){
      elegida = p; break;
    }
  }
  return {
    titulo: titulo || 'Tu página',
    acento: elegida.acento, acento2: elegida.acento2, fondo: elegida.fondo,
    oscuro: elegida.oscuro, radio: elegida.radio,
    fuente_tit: elegida.tit, fuente_txt: elegida.txt, mayus: elegida.mayus,
    iconos: elegida.iconos,
    local: true
  };
}

/* ---------- las tipografias que traemos nosotros ----------
   Se midio en esta maquina: de 100 tipografias probadas hay 91 instaladas,
   pero NI UNA de pixeles. Press Start 2P, Pixelify Sans, Small Fonts,
   Terminal y Fixedsys: ninguna. Asi que pedir "8 bits" caia a Courier New,
   que de 8 bits no tiene nada. Estas cuatro viajan con la extension.

   Se registran con la API FontFace y no con @font-face dentro de la hoja:
   en una hoja construida las direcciones relativas se resuelven contra la
   pagina del SITIO, no contra la extension, y no cargarian nunca. Y se
   agregan a document.fonts, que es lo que ve tambien el shadow root. */
const FUENTES_PROPIAS = [
  ['Press Start 2P', 'fuentes/press-start-2p.woff2'],
  ['Silkscreen',     'fuentes/silkscreen.woff2'],
  ['VT323',          'fuentes/vt323.woff2'],
  ['Bungee',         'fuentes/bungee.woff2']
];
let _fuentesPuestas = false;
function ponerFuentes(){
  if(_fuentesPuestas || !document.fonts) return;
  _fuentesPuestas = true;
  for(const [nombre, archivo] of FUENTES_PROPIAS){
    try {
      const cara = new FontFace(nombre, 'url("' + chrome.runtime.getURL(archivo) + '")');
      cara.load().then(c => document.fonts.add(c)).catch(() => {});
    } catch(e){}
  }
}
ponerFuentes();

/* ---------- la hoja de estilos del shadow ----------
   No se usa <link href="chrome-extension://...">: cargar un recurso dentro
   de la pagina pasa por la CSP del sitio, y hay sitios que la tienen
   cerrada. Se trae el texto con fetch (un content script SI puede leer sus
   propios archivos) y se adopta como hoja construida, que no toca el DOM
   del documento ni la CSP.

   Se pide apenas carga el script, no cuando se arma: cuando la persona
   aprieta el boton ya esta lista y no se ve un parpadeo sin estilos. */
let _hoja = null;
const _hojaLista = (async () => {
  try {
    const css = await fetch(chrome.runtime.getURL('pagina.css')).then(r => r.text());
    const h = new CSSStyleSheet();
    h.replaceSync(css);
    _hoja = h;
  } catch(e){ _hoja = null; }
})();

/* ---------- el CSS que escribe la conexion ----------
   Aca esta la respuesta a "no debe haber una limitacion": en vez de
   ofrecerle al modelo cuatro perillas, se le deja ESCRIBIR CSS. Con dos
   colores y ocho tipografias no se puede hacer barro antiguo, ni Windows
   95, ni Hello Kitty; escribiendo reglas, si.

   Y es seguro justamente por el shadow: lo que escriba no puede salir de
   nuestra pagina ni tocar el sitio. Igual se filtra lo que no tiene por
   que estar: @import y url() a la red (que la CSP del sitio bloquearia y
   ademas le avisaria a un tercero que estas aca). Las data: quedan. */
const VELO_TOPE = 0.6;

/* UN rem VALE 16px Y NO OTRA COSA: .marco declara font-size:16px en
   pagina.css, asi que 16px es exactamente lo que el modelo cree que esta
   escribiendo cuando pone 1rem. Convertir por este numero no cambia ningun
   diseño, solo lo deja medir contra lo nuestro. */
const REM_EN_PX = 16;

function cssLimpio(css){
  let t = String(css || '');
  if(t.length > 16000) t = t.slice(0, 16000);
  t = t.replace(/@import[^;]*;?/gi, '');
  t = t.replace(/url\(\s*(['"]?)\s*(https?:)?\/\//gi, 'none(');
  t = t.replace(/expression\s*\(/gi, 'x(');
  t = t.replace(/javascript\s*:/gi, 'x:');
  t = t.replace(/<\/?[a-z]/gi, ' ');

  /* EL rem NO PUEDE ENTRAR, Y NO ES UNA MANIA: NO MIDE CONTRA LO NUESTRO.
     Dentro de un shadow root el rem NO se resuelve contra .marco -que es
     nuestro y vale 16px- sino contra el <html> DEL SITIO, que no es nuestro,
     no lo podemos tocar y cambia de pagina en pagina. Medido en vivo con la
     MISMA hoja: parados en huellagames.com, con el <html> del sitio en 16px,
     el titulo salia 40px y el cuerpo 11.2px; en un sitio con el truco
     html{font-size:62.5%} -que usan miles- esa misma hoja daba 25px y 7px.
     Ilegible, distinto en cada sitio, y sin forma de enterarse: el CSS es
     identico y nadie da error. Aca se pasa a px multiplicando por
     REM_EN_PX, que es lo que el modelo creia estar escribiendo.

     'em' NO SE TOCA, y es a proposito: el em se resuelve contra el elemento
     padre, que ya vive dentro de nuestro shadow, asi que mide bien; y el
     modelo lo usa queriendo (el padding en em de un boton crece con la letra
     de ese boton). Convertirlo seria romper algo que funciona.

     Y ESTO ARREGLA TAMBIEN LOS DISEÑOS VIEJOS, sin migrar nada. El diseño se
     guarda por sitio en chrome.storage y se vuelve a aplicar sin volver a
     preguntarle al servidor, asi que los que se guardaron antes de hoy
     siguen teniendo rem adentro. Como la conversion vive en cssLimpio, que
     corre CADA VEZ que se adopta la hoja, esos diseños quedan arreglados
     solos la proxima vez que se vista esa pagina.

     El signo se deja fuera del match a proposito: en 'margin:-1rem' se
     convierte el 1 y el '-' se queda donde estaba, que da -16px. */
  t = t.replace(/(^|[^\w.#])(\d*\.?\d+)rem\b/gi, (todo, antes, n) => {
    const px = parseFloat(n) * REM_EN_PX;
    /* redondeado a milesimas: 0.7rem da 11.2 y no 11.200000000000001 */
    return antes + (isNaN(px) ? '0' : String(Math.round(px * 1000) / 1000)) + 'px';
  });

  /* EL VELO NO PUEDE LLEGAR A TAPAR.
     .marco::after es position:fixed, inset:0, z-index:9: va ENCIMA del
     reproductor. Con --velo-op:1 y una textura opaca -var(--tex-barro) lo
     es, y el prompt se la ofrece- el video sigue ahi y no se ve. El prompt
     ahora lo dice, pero un aviso no es un mecanismo: aca se recorta.
     El otro mecanismo, independiente de este, esta en pagina.css: .medio
     lleva z-index por encima del velo. */
  t = t.replace(/(--velo-op\s*:\s*)([0-9]*\.?[0-9]+)/gi, (todo, ini, n) => {
    const v = parseFloat(n);
    return ini + (isNaN(v) ? '0' : String(Math.min(Math.max(v, 0), VELO_TOPE)));
  });

  /* LA FIRMA NO SE PUEDE APAGAR, y esto es un mecanismo, no un aviso.
     .escrito y su .sello son la unica condicion de todo lo que el modelo
     inventa: si se borran, las 9 tarjetas y las 5 secciones escritas quedan
     indistinguibles de lo que si se leyo del sitio. Se recorta cualquier
     declaracion que las apague dentro de una regla que las nombre; lo que
     venga por un selector mas ancho (*::after, .tarjeta ::after) lo tapa
     GUARDA_FIRMA, que se adopta despues y va con !important. */
  t = t.replace(/([^{}]*)\{([^{}]*)\}/g, (todo, sel, cuerpo) => {
    if(!/\.escrito|\.sello/i.test(sel)) return todo;
    const limpio = cuerpo.replace(APAGA_FIRMA, '');
    return sel + '{' + limpio + '}';
  });
  /* --escrito-sello:"" deja el ::after sin nada: es apagarla por la perilla
     que el propio prompt le regala. Con la perilla vacia se cae al valor por
     defecto, que es el signo de siempre. */
  t = t.replace(/--escrito-sello\s*:\s*(?:""|''|none|normal)\s*(;|(?=\}))/gi, '$1');
  return t;
}

/* el signo de la firma. Va aca arriba y no al lado de firmar() porque
   GUARDA_FIRMA lo mete en su texto: un const que se lee antes de declararse
   revienta el archivo entero al cargar. */
const SELLO = '✎';

/* las formas de dejar algo sin verse; se recortan SOLO dentro de una regla
   que nombre la firma, para no tocarle el estilo al resto de la pagina */
const APAGA_FIRMA = new RegExp(
  '(?:^|;)\\s*(?:' +
  'display\\s*:\\s*none|' +
  'visibility\\s*:\\s*(?:hidden|collapse)|' +
  'opacity\\s*:\\s*0?\\.?0+|' +
  'content\\s*:\\s*(?:none|normal|""|\'\')|' +
  'font-size\\s*:\\s*0[a-z%]*|' +
  '(?:max-)?(?:width|height)\\s*:\\s*0[a-z%]*|' +
  'content-visibility\\s*:\\s*hidden|' +
  'color\\s*:\\s*transparent|' +
  'text-indent\\s*:\\s*-\\s*[0-9]|' +
  'clip-path\\s*:\\s*inset\\s*\\(\\s*(?:50%|100%)|' +
  'transform\\s*:\\s*scale\\s*\\(\\s*0' +
  ')[^;}]*', 'gi');

/* EL SEGUNDO MECANISMO, y el que aguanta un selector que no nombra la firma.
   Se adopta DESPUES de la hoja del modelo. Aca si va !important -pagina.css
   sigue sin llevar ni uno, que es lo que le deja al modelo re-escribirla
   entera-: esto no es estilo, es la condicion. Lo que NO se fija es el color
   ni la posicion en el flujo, para que el modelo la pueda seguir vistiendo. */
const GUARDA_FIRMA =
  '.sello{display:inline-block !important;visibility:visible !important;' +
  'opacity:1 !important;position:static !important;float:none !important;' +
  'width:auto !important;height:auto !important;max-width:none !important;' +
  'max-height:none !important;min-width:0 !important;min-height:0 !important;' +
  'overflow:visible !important;clip-path:none !important;transform:none !important;' +
  'text-indent:0 !important;white-space:nowrap !important;font-size:12px !important;' +
  'line-height:1 !important;letter-spacing:normal !important;text-transform:none !important;' +
  'content-visibility:visible !important;pointer-events:none !important;' +
  'margin-left:.5em !important;align-self:center !important;font-family:var(--txt);}' +
  '.sello::after{content:var(--escrito-sello, "' + SELLO + '") !important;' +
  'display:inline !important;visibility:visible !important;opacity:1 !important;' +
  'font-size:12px !important;color:inherit !important;}';

/* EL SCROLL DE LA PAGINA NO SE PUEDE TOCAR, Y ESTO ES UN MECANISMO.
   .marco es el unico que scrollea: position:absolute, inset:0 y overflow-y
   auto. El prompt ya le dice al modelo "no le pongas alto fijo a .marco ni
   saques el scroll", y eso es un AVISO. Paso lo que pasa siempre con los
   avisos: un diseño salio con la pagina cortada, sin barra y sin forma de
   bajar, teniendo contenido abajo. En la misma corrida, otros disenos del
   mismo sitio salieron sanos -medido: scrollHeight 2131 contra clientHeight
   674, barra de 12px-, o sea que es de las que fallan A VECES, que son las
   peores de encontrar.

   Va con !important y en la hoja que se adopta AL FINAL porque no es
   estilo: es la condicion para que la pagina se pueda leer. Y no le quita
   nada al modelo, que no tiene por que decidir la caja del contenedor que
   scrollea; todo lo que si es suyo -fondo, color, tipografia, las perillas
   de las motas- sigue entrando por .marco sin que esto lo estorbe.

   Se fija tambien `inset` y `position`: con position:static el inset no
   aplica, el alto lo pone el contenido y el que termina scrolleando es el
   documento del sitio, que esta tapado. Se ve igual que no poder bajar. */
const GUARDA_SCROLL =
  '.marco{position:absolute !important;inset:0 !important;' +
  'overflow-y:auto !important;overflow-x:hidden !important;' +
  'height:auto !important;min-height:0 !important;max-height:none !important;' +
  'transform:none !important;}';

let _guarda = null;
function hojaGuarda(){
  if(_guarda) return _guarda;
  try { _guarda = new CSSStyleSheet(); _guarda.replaceSync(GUARDA_FIRMA + GUARDA_SCROLL); }
  catch(e){ _guarda = null; }
  return _guarda;
}

function vestirShadow(raiz, css){
  const propia = () => {
    if(!css) return null;
    try {
      const h = new CSSStyleSheet();
      h.replaceSync(cssLimpio(css));
      return h;
    } catch(e){
      console.warn('[API UNIVERSAL] el CSS de la conexión no se pudo usar:', e.message);
      return null;
    }
  };
  /* el orden importa: primero el piso, despues lo que escribio la conexion,
     y AL FINAL la guarda de la firma, que tiene que ganarle a las dos */
  const poner = () => {
    const extra = propia();
    const guarda = hojaGuarda();
    raiz.adoptedStyleSheets = [_hoja, extra, guarda].filter(Boolean);
  };
  if(_hoja){ poner(); return; }
  /* si todavia no llego (o el navegador no soporta hojas construidas),
     un <link> que igual funciona en la mayoria de los sitios */
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = chrome.runtime.getURL('pagina.css');
  raiz.appendChild(l);
  _hojaLista.then(() => { if(_hoja){ poner(); l.remove(); } });
}

/* ---------- armar ---------- */
const cr = (tag, clase, txt) => {
  const e = document.createElement(tag);
  if(clase) e.className = clase;
  /* SIEMPRE textContent con lo que sale del sitio: si se pega como HTML,
     entra el marcado ajeno y ademas se cuela cualquier cosa que ese sitio
     tenga escrita. Lo unico que va por innerHTML es nuestro propio SVG. */
  if(txt != null) e.textContent = txt;
  return e;
};

/* Toda direccion que sale del sitio pasa por aca. Un href "javascript:..."
   leido de la pagina y pegado en un enlace NUESTRO corre codigo del sitio
   cuando la persona lo clickea, y encima dentro de algo que dice API
   UNIVERSAL. Solo se dejan pasar http y https; las imagenes ademas pueden
   ser data: o blob:, que es como muchos sitios sirven sus fotos. */
function urlOk(u, esImagen){
  const t = String(u == null ? '' : u).trim();
  if(!t) return null;
  try {
    const x = new URL(t, location.href);
    if(x.protocol === 'http:' || x.protocol === 'https:') return x.href;
    if(esImagen && x.protocol === 'blob:') return x.href;
    if(esImagen && x.protocol === 'data:' && /^data:image\//i.test(t)) return t;
  } catch(e){}
  return null;
}

/* ---------- que el diseño cruce con la persona ----------
   El diseño se guarda POR SITIO, y esta bien: nadie quiere que un tema
   puesto en Instagram le salte a la pagina del banco. Pero cuando la persona
   toca un enlace de NUESTRA pagina armada, la que decide es ella, y hasta
   ahora el destino aparecia pelado porque su origen nunca tuvo nada
   guardado.

   Los enlaces del MISMO origen no pasan por aca: ese caso ya andaba, porque
   la memoria del sitio la encuentra el destino sola.

   Se navega desde AU_LLEVAR (contenido.js) y no desde aca, porque hay que
   ESPERAR a que la escritura en el almacenamiento termine antes de irse. */
function cruzaDeSitio(href){
  try { return new URL(href, location.href).origin !== location.origin; }
  catch(e){ return false; }
}

function conViaje(a){
  if(!a || !a.href || !cruzaDeSitio(a.href)) return a;
  a.addEventListener('click', ev => {
    /* ctrl/cmd/shift/alt es "abrilo aparte" y el gesto de toda la vida no se
       toca; ademas ahi esta pestaña se queda donde esta y no hay viaje que
       hacer. El clic del medio ni llega: dispara auxclick, no click. */
    if(ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    if(ev.button) return;
    /* si contenido.js no esta -o cambio de nombre- el enlace sigue siendo un
       enlace: se navega normal y se pierde el diseño, nunca el destino */
    if(typeof AU_LLEVAR !== 'function') return;
    ev.preventDefault();
    AU_LLEVAR(a.href);
  });
  return a;
}

/* devuelve null si la direccion no sirve: quien llama decide si arma la
   figura o no. Antes se armaba igual y quedaba el icono roto del navegador. */
function imagen(src, alt, clase){
  const u = urlOk(src, true);
  if(!u) return null;
  const f = cr('figure', clase);
  const im = cr('img');
  im.src = u;
  im.alt = alt || '';
  im.loading = 'lazy';
  im.referrerPolicy = 'no-referrer';
  /* una foto que no carga deja un hueco con el icono roto del navegador:
     mejor que la figura entera desaparezca */
  im.onerror = () => f.remove();
  f.appendChild(im);
  return f;
}

/* ---------- los medios ---------- */

/* Solo se usa cuando el extractor NO mando el campo. El dominio se compara
   por sus dos ultimas etiquetas: m.youtube.com y www.youtube.com son el
   mismo sitio, y en la practica alcanza. */
function raizDominio(h){
  const p = String(h || '').toLowerCase().replace(/^www\./, '').split('.');
  return p.slice(-2).join('.');
}

function esDeAqui(m){
  if(m && typeof m.mismoSitio === 'boolean') return m.mismoSitio;
  const aqui = raizDominio(location.hostname);
  if(!m) return false;
  if(m.tipo === 'youtube') return aqui === 'youtube.com' || aqui === 'youtu.be';
  try { return raizDominio(new URL(m.src, location.href).hostname) === aqui; }
  catch(e){ return false; }
}

/* la direccion PROPIA del medio, o null si no tiene ninguna. Un blob: llega
   sin src justamente porque no se puede reusar, y entonces aca no hay nada
   que devolver: quien llama decide si vale la pena caer a la pagina. */
function urlDirectaDelMedio(m){
  if(m && m.tipo === 'youtube' && m.id){
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(m.id);
  }
  return (m && urlOk(m.src)) || null;
}

/* SIEMPRE tiene que haber a donde ir a ver el medio de verdad */
function urlDelMedio(m, c){
  return urlDirectaDelMedio(m) || urlOk(c && c.url) || location.href;
}

const SVG_PLAY = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
                 '<path fill="currentColor" d="M8 5.2v13.6L19 12z"/></svg>';
const SVG_FUERA = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
                  '<path fill="currentColor" d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3z"/>' +
                  '<path fill="currentColor" d="M5 5h5v2H7v10h10v-3h2v5H5V5z"/></svg>';

function enlaceFuera(href, txt){
  const a = cr('a', 'medio-enlace');
  a.href = href;
  /* MISMA PESTAÑA. Abrir en otra era lo que rompia la sensacion de estar
     dentro de una pagina: te sacaba del diseño a un YouTube pelado. Yendo
     en la misma, la extension re-arma sola la pagina de destino y se
     navega como si el sitio fuera nuestro. */
  a.rel = 'noopener';
  conViaje(a);
  const ico = cr('span', 'medio-ico');
  ico.innerHTML = SVG_FUERA;
  a.append(ico, cr('span', null, txt));
  return a;
}

/* El reproductor, con la regla que se midio: incrustar SOLO lo del mismo
   sitio. Un iframe de YouTube dentro de Instagram no da error, da un marco
   roto, y eso es peor que no ponerlo. */
function medioNodo(m, c){
  const caja = cr('figure', 'medio');
  const href = urlDelMedio(m, c);
  const aqui = esDeAqui(m);

  /* YOUTUBE NUNCA SE INCRUSTA. Se probaron cuatro combinaciones en vivo
     -nocookie y dominio normal, dos videos distintos, dentro de youtube.com
     y dentro de instagram.com- y TODAS dan "Error code: 152 - 4" o un marco
     roto. Ni siquiera parado en youtube.com. Y el evento load del iframe
     dispara igual con el marco vacio, asi que tampoco se puede detectar y
     caer para atras: hay que no intentarlo. Ver MEDICIONES.md.
     Va la miniatura de verdad, que siempre carga. */
  if(aqui && m.tipo === 'iframe' && urlOk(m.src)){
    const marco = cr('div', 'video');
    const f = document.createElement('iframe');
    f.src = urlOk(m.src);
    f.allowFullscreen = true;
    f.loading = 'lazy';
    marco.appendChild(f);
    caja.appendChild(marco);
  } else if(aqui && m.tipo === 'video' && urlOk(m.src, true)){
    const marco = cr('div', 'video');
    const v = document.createElement('video');
    v.src = urlOk(m.src, true);
    v.controls = true;
    v.preload = 'metadata';
    const p = urlOk(m.poster, true);
    if(p) v.poster = p;
    marco.appendChild(v);
    caja.appendChild(marco);
  } else {
    /* de otro sitio: miniatura clickeable. El fondo de .video es negro, asi
       que aunque no haya foto se ve un reproductor apagado, no un hueco. */
    const mini = cr('a', 'video miniatura');
    mini.href = href;
    mini.rel = 'noopener';
    /* si el video es de esta misma pagina no cruza nada y esto no hace nada:
       mas abajo ese caso se queda sin href y llama a AU_ASOMARSE */
    conViaje(mini);
    /* la miniatura oficial de YouTube existe siempre y no pide sesion */
    const deYoutube = m.tipo === 'youtube' && m.id
      ? 'https://i.ytimg.com/vi/' + encodeURIComponent(m.id) + '/hqdefault.jpg'
      : null;
    const foto = urlOk(m.poster, true) || deYoutube ||
                 urlOk(c && c.portada && c.portada.src, true);
    if(foto){
      const im = cr('img');
      im.src = foto;
      im.alt = '';
      im.loading = 'lazy';
      im.referrerPolicy = 'no-referrer';
      im.onerror = () => im.remove();
      mini.appendChild(im);
    }
    const bola = cr('span', 'play');
    bola.innerHTML = SVG_PLAY;
    mini.appendChild(bola);

    /* Si el video ES el de esta misma pagina -una de YouTube, un reel-
       mandarlo a abrir otra pestaña en la MISMA direccion es absurdo, y era
       lo que hacia que darle al play no hiciera nada util. El reproductor de
       verdad ya esta ahi abajo: nos corremos para que se vea. */
    if(esEstaPagina(href)){
      mini.removeAttribute('target');
      mini.removeAttribute('rel');
      mini.addEventListener('click', ev => { ev.preventDefault(); AU_ASOMARSE(); });
      mini.appendChild(cr('span', 'play-txt', 'Reproducir aquí'));
      caja.appendChild(mini);
      caja.appendChild(botonAsomarse('Ver el reproductor de ' + (c.sitio || 'el sitio')));
      return caja;
    }
    mini.appendChild(cr('span', 'play-txt', 'Se ve en el sitio original'));
    caja.appendChild(mini);
  }

  /* incrustado o no, siempre hay salida al original */
  if(esEstaPagina(href)) caja.appendChild(botonAsomarse('Ver el reproductor de ' + (c.sitio || 'el sitio')));
  else caja.appendChild(enlaceFuera(href, aqui ? 'Abrir en ' + (c.sitio || 'el sitio')
                                               : 'Ver el video en ' + (dominioDe(href) || 'el sitio original')));
  return caja;
}

function esEstaPagina(u){
  try { return new URL(u, location.href).href.split('#')[0] === location.href.split('#')[0]; }
  catch(e){ return false; }
}

function botonAsomarse(txt){
  const a = cr('button', 'medio-enlace');
  a.type = 'button';
  const ico = cr('span', 'medio-ico');
  ico.innerHTML = SVG_FUERA;
  a.append(ico, cr('span', null, txt));
  a.addEventListener('click', AU_ASOMARSE);
  return a;
}

/* ---------- asomarse ----------
   Esconde la pagina re-armada SIN desarmarla, para que se vea el sitio de
   abajo con su reproductor, y deja una pastilla para volver. Es la salida a
   "bloquea las reproducciones": nunca te quedas encerrado, y volver es un
   clic, no re-armar todo de nuevo.

   Se usa display:none y no un remove(), porque el vigilante de contenido.js
   repone la pagina cuando el nodo no esta, y se pelearia con esto.

   Y SE ANUNCIA, porque esconderse no alcanzaba: releerCuandoAsiente() seguia
   disparando a los 700/1800/3600/6000 ms y, si la relectura traia mas
   contenido, llamaba a AU_ARMAR, que borra el host escondido, monta uno nuevo
   VISIBLE y vuelve a llamar callarElSitio -o sea, pausa el video que la
   persona acababa de poner-. Se asomaba, le daba play, y a los pocos segundos
   la capa volvia sola y el video se apagaba sin que tocara nada. Con los
   enlaces en la misma pestaña esas relecturas son el camino normal, no el
   raro. La bandera es de contenido.js porque es quien las dispara. */
function AU_ASOMARSE(){
  const host = document.getElementById('au-pagina');
  if(!host) return;
  const AUasom = siExiste(() => AU);
  if(AUasom) AUasom.asomado = true;
  try { if(typeof cortarRelecturas === 'function') cortarRelecturas(); } catch(e){}
  host.style.setProperty('display', 'none', 'important');
  devolverSonido();
  document.getElementById('au-volver-armada')?.remove();
  const pastilla = document.createElement('button');
  pastilla.id = 'au-volver-armada';
  pastilla.textContent = 'Volver a la página armada';
  pastilla.style.cssText =
    'position:fixed !important;left:16px !important;bottom:16px !important;' +
    'z-index:2147483000 !important;padding:10px 16px !important;' +
    'border:0 !important;border-radius:999px !important;cursor:pointer !important;' +
    'font:600 13px "Segoe UI",system-ui,sans-serif !important;' +
    'background:#12171f !important;color:#fff !important;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.35) !important;';
  pastilla.addEventListener('click', () => {
    pastilla.remove();
    if(AUasom) AUasom.asomado = false;
    const h = document.getElementById('au-pagina');
    if(h) h.style.removeProperty('display');
    callarElSitio(h);
  });
  document.documentElement.appendChild(pastilla);
}

function dominioDe(u){
  try { return new URL(u, location.href).hostname.replace(/^www\./, ''); }
  catch(e){ return ''; }
}

/* ---------- no bloquear nunca el documento de abajo ----------
   Se midio: con overflow:hidden en <html> el scrollHeight del sitio se
   queda pegado a innerHeight y una lista virtualizada no vuelve a
   renderizar. Sin scroll abajo no hay "cargar mas" posible.

   ACA NO HAY NADA QUE HACER, Y ESO ES EL ARREGLO. Antes vivia aca un
   vigilante que le borraba a <html> cualquier overflow:hidden, porque
   contenido.js se lo volvia a poner en cada mutacion. Peleaban por una
   propiedad GLOBAL que tambien usa el sitio, y eso rompia por los dos
   lados: si el sitio abria su modal estando nosotros encima le
   desactivabamos su candado (al salir, el modal quedaba con el fondo
   scrolleando), y si el candado del sitio ya estaba puesto al armar, al
   quitar se lo RE-APLICABAMOS aunque el modal ya estuviera cerrado (la
   pagina original quedaba sin scroll). La cura fue quitar la causa:
   contenido.js ya no pone el candado, asi que no hay nada que soltar ni
   que restaurar. El scroll de arriba se contiene con overscroll-behavior
   en .marco, que no toca al sitio.
   Si alguna vez vuelve a hacer falta un candado propio, tiene que ir
   MARCADO (un data-au-lock en <html>) para poder distinguirlo del ajeno. */

/* El video del sitio queda tapado por nosotros pero SIGUE SONANDO -medido:
   pausado:false, segundo 7.7-. Se pausa lo que hay y se queda escuchando,
   porque YouTube lo vuelve a arrancar solo al navegar. En captura, que los
   eventos de medios no burbujean. Al quitar la pagina se vuelve a arrancar
   lo que estaba sonando: el pie promete que el sitio no fue modificado. */
let _hostActual = null;
let _frenar = null;
let _sonaban = [];

/* nuestro propio reproductor vive DENTRO del shadow, y Node.contains() no
   cruza ese borde: `host.contains(video)` da false y el guardia pausaria lo
   nuestro. Hoy no muerde porque el evento 'play' no es composed y no sale
   del shadow root, pero eso es un detalle del DOM del que no conviene
   colgarse: se compara por RAIZ, que si dice la verdad. */
function esNuestro(n){
  if(!_hostActual || !n) return false;
  if(_hostActual.contains(n)) return true;
  let r = n.getRootNode ? n.getRootNode() : null;
  while(r && r.host){
    if(r.host === _hostActual) return true;
    r = r.host.getRootNode ? r.host.getRootNode() : null;
  }
  return false;
}

function callarElSitio(host){
  const primera = !_frenar;   // en un re-armado ya esta todo pausado por nosotros
  _hostActual = host;
  document.querySelectorAll('video,audio').forEach(v => {
    try { if(primera && !v.paused && !v.ended) _sonaban.push(v); } catch(e){}
    try { v.pause(); } catch(e){}
  });
  if(_frenar) return;
  _frenar = ev => {
    /* si nuestra pagina ya no esta, el sitio vuelve a ser suyo: nos vamos
       solos en vez de quedar pausando videos para siempre. Se pregunta por
       el host que registro ESTE gancho y no por el id #au-pagina: el id
       sobrevive a un re-armado ajeno y ahi el gancho quedaba vivo pausando
       todo video del sitio para siempre. */
    if(!_hostActual || !_hostActual.isConnected){ devolverSonido(); return; }
    const t = ev.target;
    if(!t || typeof t.pause !== 'function') return;
    if(esNuestro(t)) return;
    try { t.pause(); } catch(e){}
  };
  document.addEventListener('play', _frenar, true);
}

function devolverSonido(){
  if(_frenar){ document.removeEventListener('play', _frenar, true); _frenar = null; }
  /* lo que estaba sonando cuando nos montamos vuelve a sonar. El navegador
     puede negarse si no hubo gesto de la persona, y esta bien: el boton que
     nos quita ES un gesto, asi que en el camino normal arranca. */
  const lista = _sonaban;
  _sonaban = [];
  lista.forEach(v => { try { const p = v.play(); if(p && p.catch) p.catch(() => {}); } catch(e){} });
  /* sin esto, el div #au-pagina ya desprendido -con su shadow entero: las
     12+ tarjetas, sus <img>, los <iframe> y el objeto de contenido que
     retienen los closures- se quedaba vivo colgando de este puntero
     despues de que la persona dijo "quitar" */
  _hostActual = null;
}

/* ---------- lo que llego, ordenado ----------
   El extractor lo escribe otro archivo y puede estar a medio camino: si
   falta un campo se arma igual con un valor sensato en vez de reventar en
   la primera propiedad. */
function normalizar(c){
  const n = c && typeof c === 'object' ? c : {};
  const lista = v => Array.isArray(v) ? v : [];
  /* tarjetas se deja como LA MISMA lista que trajo el extractor: "cargar
     mas" empuja ahi, y esa lista es la que guarda contenido.js, asi que lo
     agregado sobrevive si la pagina se re-arma sola. */
  if(!Array.isArray(n.tarjetas)) n.tarjetas = [];
  const bloques = lista(n.bloques);
  const palabras = (n.medida && typeof n.medida.palabras === 'number')
    ? n.medida.palabras
    : bloques.filter(b => b && b.tipo === 'parrafo')
             .reduce((a, b) => a + String(b.txt || '').split(/\s+/).filter(Boolean).length, 0);
  let clase = n.clase;
  if(clase !== 'documento' && clase !== 'catalogo' && clase !== 'app'){
    /* si todavia no viene, se deduce igual que lo haria el extractor: mucha
       tarjeta y poco texto es una rejilla, no una lectura */
    clase = (n.tarjetas.length >= 3 && palabras < 140) ? 'catalogo' : 'documento';
  }
  return {
    sitio: n.sitio || location.hostname,
    url: n.url || location.href,
    titulo: n.titulo || '',
    lema: n.lema || '',
    marca: n.marca || '',
    portada: n.portada || null,
    menu: lista(n.menu),
    bloques,
    tarjetas: n.tarjetas,
    medios: lista(n.medios),
    clase,
    palabras,
    /* Punto 4 del contrato. Sale de la MEDIDA del extractor, no de mirar el
       diseño: si la pagina dio poco de donde agarrarse, al modelo se le abrio
       la mano para inventar (eso lo decide el prompt) y aca lo unico que
       cambia es que lo inventado lleve firma. Si el extractor todavia no
       manda el campo, esto queda en false y no se marca nada. */
    flaco: !!(n.medida && n.medida.flaco === true),
    porQueFlaco: (n.medida && n.medida.porQueFlaco) || '',
    /* TODO lo que se lee, no solo lo que vino en un <p>. `palabras` mide la
       columna de lectura y con eso se decide el ancho y el enfoque; el cartel
       de "aqui no habia casi nada" tiene que mirar esto otro, porque una
       pagina de <ul> tiene 0 palabras y renglones de sobra: se dibujaban esos
       renglones y arriba se leia "y 0 palabras de texto". */
    lectura: (n.medida && typeof n.medida.lectura === 'number')
      ? n.medida.lectura
      : bloques.reduce((a, b) => {
          const pal = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
          if(!b) return a;
          if(b.tipo === 'parrafo' || b.tipo === 'cita') return a + pal(b.txt);
          if(b.tipo === 'lista') return a + (b.items || []).reduce((x, i) => x + pal(i), 0);
          return a;
        }, 0)
  };
}

/* De quien es lo que estoy leyendo.
   Al dueño LE GUSTA que la conexion invente, y cuanto mas flaca la pagina
   mas tiene que inventar: eso NO se recorta. Lo unico que se agrega es la
   firma, para que se vea de quien es. Por eso es una CLASE y un title, no un
   cartel: el titulo inventado se sigue mostrando entero y en grande, y quien
   quiera saber de donde salio lo tiene ahi. */
function firmar(nodo, c){
  if(!nodo || !c || !c.flaco) return nodo;
  if(nodo.classList.contains('escrito')) return nodo;
  nodo.classList.add('escrito');
  nodo.title = 'Esto lo escribió la conexión: ' +
               (c.porQueFlaco || 'la página daba poco de donde agarrarse') + '.';
  /* LA FIRMA ES UN NODO PROPIO, NO UN ::after DE LA PIEZA FIRMADA.
     Antes el signo salia de .escrito::after, y .escrito se le SUMA a la
     misma pieza que ya estiliza el modelo: .escrito::after y .tarjeta::after
     eran el MISMO pseudo-elemento con la MISMA especificidad (0,0,1,0), y la
     hoja del modelo se adopta despues, asi que ganaba el modelo. No hacia
     falta mala fe: el prompt le pide justo eso ("::before y ::after con
     content", "cada .tarjeta es una ventanita con su propia barrita"), y una
     sola regla decorativa borraba la unica condicion de todo el invento.
     Con un <span> aparte el choque no existe, y lo que quede de riesgo lo
     tapan los dos mecanismos de al lado: cssLimpio() recorta lo que la
     apague y GUARDA_FIRMA la vuelve a encender con !important. */
  const sello = cr('span', 'sello');
  sello.setAttribute('aria-hidden', 'true');
  nodo.appendChild(sello);
  return nodo;
}

const claveTarjeta = t => String((t && (t.href || t.img || t.titulo)) || '');

/* Los tres archivos comparten un mismo ambito, asi que desde aca se ven
   AU_LEER, AU_DESPERTAR y AU. Pero si alguno se declara con const y su
   archivo todavia no corrio, hasta preguntar por typeof revienta. Por eso
   se pregunta adentro de un try: si no esta, no esta, y la pagina se arma
   igual sin esa parte.

   EL NOMBRE IMPORTA, Y CARO: esto se llamaba `pedir`, igual que el fetch de
   contenido.js. Los content scripts comparten UN solo ambito global y las
   dos eran `function`, asi que no hubo ni un error: el manifest carga
   contenido.js despues y su `pedir` pisaba a este en silencio. Resultado,
   en TODA pagina: `pedir(() => AU)` hacia fetch('http://localhost:4321() =>
   AU'), AUok quedaba null, desaparecian todos los iconos y "Cargar mas"
   fallaba siempre. Antes de agregar un nombre de nivel superior a
   iconos/extractor/rearmar/contenido, correr servidor/verificar_contrato.js,
   que justamente busca duplicados. */
function siExiste(dame){ try { return dame() || null; } catch(e){ return null; } }

/* ---------- SEMBRAR LAS MOTAS ----------
   El azar tiene que nacer ACA. La hoja de estilos no puede inventar un
   numero, asi que lo unico que tenia para separar una cajita de otra era
   --i, su indice: `left: --i * 3.57%` y `delay: --i * -0.41s`. Dos
   progresiones lineales del mismo numero dibujan una recta, y eso es
   exactamente lo que se veia: las cajitas bajaban en DIAGONAL, todas
   igual de rapido y siempre en el mismo orden. Parecia una regla
   inclinada, no algo cayendo.

   Aca cada una recibe lo suyo: su columna, en que punto de su ciclo
   arranca, que tan rapido cae y que tan grande es. En pagina.css eso se
   gradua con --mota-azar, para que el modo Tetris -que necesita justo lo
   contrario, todas en fila y en fase- pueda apagarlo.

   Y ADEMAS SE SIEMBRA EL TABLERO, EN FILAS DE VERDAD. En Tetris las piezas
   no caen todas juntas: cae una fila, se queda abajo, cae la siguiente y se
   apoya encima. Para poder dibujar eso con puro CSS, cada fila tiene que
   ser un NODO propio -asi corre su animacion, con su turno- y cada pieza
   tiene que saber en que columna cae.

   Aca se siembra TODO lo que necesita cada efecto, aunque ese dia se use
   uno solo: la columna del tablero, la posicion suelta, la altura, el
   reparto parejo del ecualizador y los tres numeros de azar. Son cinco
   propiedades por nodo y no cuesta nada; lo que si costaria es que un
   efecto nuevo necesite un dato que aca no se puso y haya que tocar los
   dos archivos. */
/* MOTAS_COLS decide de que tamaño son las piezas -el ancho de pantalla
   partido entre las columnas- y por lo tanto QUE ALTO llega la pila. Con 20
   columnas las piezas salian de 70px y la pila subia cinco filas: 350px,
   mas de media pantalla, y las de arriba se quedaban quietas encima del
   texto durante medio ciclo. Con 26 la pieza queda en unos 55px y la pila
   se queda en el tercio de abajo, que es donde una animacion de fondo no
   le estorba a nadie. */
const MOTAS_COLS = 20;

/* SEIS FILAS, Y LAS SEIS COMPLETAS. Antes eran cuatro y la de arriba tenia
   una sola pieza: se armaban tres filas y media, se borraba UNA, y el
   tablero se apagaba entero para volver a empezar. Se veia el corte y no
   parecia una partida.
   Ahora se llenan las seis, y despues se borran de abajo hacia arriba, una
   por una, bajando todo un renglon cada vez. Al terminar el tablero queda
   VACIO, que es justo como empieza: por eso el bucle no tiene costura y se
   ve como si el juego no parara nunca.
   Y las seis completas porque solo una fila completa se puede borrar: si
   alguna viniera con huecos, se estaria borrando una linea que el juego no
   habria dejado borrar.

   SON SEIS PORQUE HAY SEIS @keyframes (au-tetris-0 a au-tetris-5) en
   pagina.css. Los porcentajes de un keyframes no aceptan variables, asi
   que el turno de cada fila -cuando cae, cuando baja y cuando le toca
   borrarse- esta escrito ahi a mano. Una septima fila se quedaria quieta
   arriba de la pantalla sin que nada avise. */
const MOTAS_FILAS = 6;
const MOTAS_N = MOTAS_COLS * MOTAS_FILAS;

function sembrarMotas(cont){
  const columnas = [];
  for(let c = 0; c < MOTAS_COLS; c++) columnas.push(c);

  let n = 0;
  for(let fila = 0; fila < MOTAS_FILAS; fila++){
    /* CADA FILA ES UN NODO, y esa es toda la diferencia entre una lluvia de
       cuadraditos y una partida: un @keyframes mueve igual a todo el que lo
       corre, asi que con las piezas colgando sueltas no habia forma de que
       una cayera antes que otra y bajaba el tablero entero de una sola vez.
       Puestas en filas, cada fila corre la suya, con su turno. */
    const f = cr('div', 'fila');
    columnas.forEach(col => {
      const m = document.createElement('i');
      const s = m.style;
      s.setProperty('--i', String(n));
      /* PARA LOS EFECTOS QUE CAEN, SUBEN O CRUZAN: cada una con lo suyo.
         Hasta 97 y no 100: pegada al borde derecho se ve media cajita. */
      s.setProperty('--x', (Math.random() * 97).toFixed(2) + '%');
      /* y su altura, para los que no se mueven en vertical -titilar- o que
         entran de costado: sin esto saldrian todas en la misma linea */
      s.setProperty('--y', (Math.random() * 96).toFixed(2) + 'vh');
      /* negativo: arranca ya metida en su ciclo, y por eso se ven
         repartidas desde el primer cuadro */
      s.setProperty('--d', (-Math.random()).toFixed(3));
      s.setProperty('--v', ((Math.random() - 0.5) * 0.7).toFixed(3));
      s.setProperty('--z', ((Math.random() - 0.5) * 0.8).toFixed(3));
      /* PARA EL TETRIS: su columna del tablero */
      s.setProperty('--gx', (col * 100 / MOTAS_COLS).toFixed(4) + '%');
      /* PARA EL ECUALIZADOR: repartidas parejo de un borde al otro. El azar
         de --x ahi no sirve: un ecualizador con las barras amontonadas de
         un lado no se lee como un ecualizador. */
      s.setProperty('--bx', (n * 99 / Math.max(1, MOTAS_N - 1)).toFixed(3) + '%');
      f.appendChild(m);
      n++;
    });
    cont.appendChild(f);
  }
}

function AU_ARMAR(c, d, alQuitar){
  document.getElementById('au-pagina')?.remove();
  /* la pastilla de "volver a la pagina armada" es de la pagina que se estaba
     escondiendo: si se re-arma, queda flotando sobre la pagina nueva sin
     nada que hacer. El unico que la borraba era AU_DESARMAR. */
  document.getElementById('au-volver-armada')?.remove();
  const AUarm = siExiste(() => AU);
  if(AUarm) AUarm.asomado = false;
  c = normalizar(c);
  d = d || {};
  const rejilla = c.clase === 'catalogo' || c.clase === 'app';

  /* ---- lo que la conexion ESCRIBIO, no leyo ----
     Cuando la pagina vino flaca, el prompt le suelta la mano al modelo y la
     respuesta trae cuatro campos mas (los describe prompt_rearmar.js). Se
     dibujan completos y en grande -que invente es lo que se le pidio- y cada
     pieza lleva .escrito, que es la unica condicion.

     SE MIRA c.flaco, NO SI LOS CAMPOS VINIERON: si el modelo los manda en
     una pagina que si tenia contenido, no se dibujan. Un invento que se
     cuela entre lo leido de verdad es justo lo que la marca viene a evitar. */
  const texto = v => String(v == null ? '' : v).trim();

  /* LO ESCRITO ES SOBRE UNA PAGINA, NO SOBRE UN SITIO.
     El diseño se guarda bajo sitio:<origen> y se vuelve a aplicar en
     CUALQUIER pagina de ese origen sin volver a preguntarle nada al
     servidor. Las secciones y tarjetas que el modelo escribio mirando la home
     terminaban encabezando el perfil de una persona, con el mismo aire de
     dato leido. Es palabra por palabra el argumento que ya esta escrito en
     AU_LLEVAR para el salto entre sitios, y vale igual entre dos paginas del
     mismo. Si el diseño no dice para que pagina se escribio -uno guardado
     antes de este cambio, o uno que llego de viaje- se deja pasar: quien
     llega de viaje ya viene sin nada de esto. */
  const sinAncla = u => String(u || '').split('#')[0];
  const mismaPagina = !d.para || sinAncla(d.para) === sinAncla(c.url || location.href);
  const inventar = c.flaco && mismaPagina;

  const inventadas = (v, tope) => (inventar && Array.isArray(v))
    ? v.filter(x => x && typeof x === 'object').slice(0, tope) : [];
  const bienvenida  = inventar ? texto(d.bienvenida) : '';
  const avisoEscrito = inventar ? texto(d.aviso_propuesta) : '';
  const secciones   = inventadas(d.secciones_inventadas, 5);
  const tarjetasInv = inventadas(d.tarjetas_inventadas, 9);
  const hayInvento = !!(bienvenida || avisoEscrito || secciones.length || tarjetasInv.length);

  const host = cr('div');
  host.id = 'au-pagina';
  host.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483000 !important;' +
                       'margin:0 !important;padding:0 !important;border:0 !important;' +
                       'display:block !important;visibility:visible !important;opacity:1 !important;';
  const raiz = host.attachShadow({ mode: 'open' });

  vestirShadow(raiz, d.css);
  callarElSitio(host);

  const marco = cr('div', 'marco');
  if(d.oscuro) marco.classList.add('oscuro');
  raiz.appendChild(marco);

  /* la capa que cae: cajitas vacias que el tema convierte en lo que quiera
     (ver .motas en pagina.css). Van SIEMPRE, apagadas: si se crearan solo
     cuando el tema las pide, el modelo tendria que pedirlas con un campo
     aparte y una respuesta vieja nunca las tendria. Apagadas no cuestan
     nada: opacity 0 y sin pintar. */
  const motas = cr('div', 'motas');
  motas.setAttribute('aria-hidden', 'true');
  motas.style.setProperty('--au-cols', String(MOTAS_COLS));
  sembrarMotas(motas);
  marco.appendChild(motas);

  const AUok = siExiste(() => AU);
  const leer = siExiste(() => (typeof AU_LEER === 'function') ? AU_LEER : null);
  const despertar = siExiste(() => (typeof AU_DESPERTAR === 'function') ? AU_DESPERTAR : null);
  const ico = (AUok && AUok.iconos && AUok.iconos.length) ? AUok.iconos : [];
  const svgDe = (i, tam) => ico.length
    ? '<svg viewBox="0 0 24 24" width="' + tam + '" height="' + tam + '" aria-hidden="true">' +
      '<path fill="currentColor" d="' + ico[i % ico.length] + '"/></svg>'
    : '';

  const salir = () => {
    if(typeof alQuitar === 'function') alQuitar();
    else AU_DESARMAR();
  };

  /* ---- cabecera ---- */
  const cab = cr('header', 'cab');
  const marca = cr('div', 'marca');
  const mIco = cr('span', 'marca-ico');
  mIco.innerHTML = svgDe(0, 20);
  marca.append(mIco, cr('span', 'marca-txt', c.marca || c.sitio));
  cab.appendChild(marca);

  if(c.menu.length){
    const nav = cr('nav', 'menu');
    c.menu.slice(0, 6).forEach(m => {
      const href = urlOk(m && m.href);
      if(!href || !m.txt) return;
      const a = cr('a', null, m.txt);
      a.href = href;
      conViaje(a);
      nav.appendChild(a);
    });
    if(nav.children.length) cab.appendChild(nav);
  }
  const volver = cr('button', 'volver', 'Ver la original');
  volver.onclick = salir;
  cab.appendChild(volver);
  marco.appendChild(cab);

  /* ---- portada ---- */
  const hero = cr('section', 'hero');
  if(rejilla) hero.classList.add('compacta');
  const hTxt = cr('div', 'hero-txt');
  /* NUESTRA MARCA NO VA EN SU PAGINA. Aca decia "<sitio> · re-armado por
     API UNIVERSAL", justo encima del titulo y en el color del acento: era
     una firma nuestra pegada en la portada de otro, y no hace falta para
     nada. El renglon se queda -es la pieza que el prompt describe y el
     modelo estiliza- pero dice lo unico que le corresponde decir, que es
     de que sitio salio lo que estas leyendo. Quien quiera saber quien la
     armo lo tiene en el pie. */
  hTxt.appendChild(cr('p', 'ojo', c.sitio));
  /* Lo que escribio la conexion manda sobre lo que decia el sitio: para eso
     se le mando el contenido. Si no llego nada, queda lo que se leyo. */
  const h1 = cr('h1', null, d.titulo || c.titulo || c.sitio);
  /* solo se firma lo que de verdad escribio la conexion: si el titulo salio
     del sitio, es del sitio y no lleva marca */
  if(d.titulo) firmar(h1, c);
  hTxt.appendChild(h1);
  /* la bienvenida escrita gana sobre el lema: es la voz del estilo que se
     pidio, y en una pagina flaca el lema del sitio casi nunca existe */
  const lema = bienvenida || d.lema || c.lema;
  if(lema){
    const pLema = cr('p', 'lema', lema);
    if(bienvenida || d.lema) firmar(pLema, c);
    hTxt.appendChild(pLema);
  }
  hero.appendChild(hTxt);

  /* si hay video, el video ES la portada: una foto muerta donde deberia
     haber un reproductor es lo que hacia que clicar la miniatura no
     hiciera nada. El nodo se guarda porque al clickear una tarjeta con
     video se cambia ESTE, sin salir de la pagina. */
  let cajaMedio = null;
  function ponerMedio(m){
    const nodo = medioNodo(m, c);
    if(cajaMedio) cajaMedio.replaceWith(nodo);
    else hTxt.appendChild(nodo);
    cajaMedio = nodo;
    hero.classList.add('con-video');
  }
  const med = c.medios[0];
  if(med) ponerMedio(med);
  else if(c.portada){
    const f = imagen(c.portada.src, c.portada.alt, 'hero-img');
    if(f) hero.appendChild(f); else hero.classList.add('sin-foto');
  }
  else hero.classList.add('sin-foto');
  marco.appendChild(hero);

  /* ---- el aviso honesto ----
     Una home de YouTube con 3 items o un Instagram con 2 posts son estados
     normales de esta maquina. Lo que no se puede hacer es dibujar una
     pagina bonita y vacia y llamarla resultado. */
  const vacia = !c.tarjetas.length && !c.medios.length && c.lectura < 40;

  /* ---- el renglon que separa proponer de mentir ----
     Va apenas debajo de la portada y antes de todo lo inventado, porque un
     aviso que aparece despues de que ya leiste la pagina no avisa nada.

     Y NO ES OPCIONAL. Salia solo si el modelo se acordaba de devolver
     aviso_propuesta -cuatro campos extra pegados al final del JSON, y el
     servidor no valida ninguno-, mientras que el otro cartel que explica la
     situacion, .vacio, tiene una condicion MAS ESTRECHA que flaco: flaco
     admite hasta 2 tarjetas, hasta 79 palabras y medios presentes. En ese
     hueco -2 tarjetas y 60 palabras- se dibujaban 5 secciones y 9 tarjetas
     escritas por la conexion y no habia en toda la pagina un solo renglon que
     lo dijera. Depende de la MEDIDA, igual que la firma. */
  if(hayInvento && (avisoEscrito || !vacia)){
    /* si el modelo escribio el suyo, gana: esta en el tono del estilo. Si no,
       va el nuestro, que dice lo mismo con los numeros que se midieron -salvo
       cuando el cartel .vacio de aca abajo ya lo esta diciendo, para no poner
       dos avisos pegados que explican lo mismo. */
    const txtNota = avisoEscrito ||
      ('Lo marcado con ' + SELLO + ' no estaba en ' + (c.sitio || 'este sitio') +
       ': lo escribió la conexión porque de la página se leyeron ' +
       (c.porQueFlaco || 'muy pocas piezas') + '.');
    marco.appendChild(firmar(cr('p', 'nota', txtNota), c));
  }
  if(vacia){
    const av = cr('section', 'vacio');
    av.appendChild(cr('h2', null, 'Aquí no había casi nada que re-armar'));
    /* la ultima frase cambia cuando SI hay invento debajo: prometer que no
       te enseño una pagina inventada mientras se la enseñas es exactamente
       la mentira que este bloque existe para no decir */
    av.appendChild(cr('p', null,
      'Leí ' + c.sitio + ' y salieron 0 tarjetas, 0 videos y ' + c.lectura +
      ' palabras de texto. Puede que la página cargue su contenido al bajar, ' +
      'que haya que iniciar sesión, o que de verdad esté casi vacía. ' +
      (hayInvento
        ? 'Lo de abajo es lo que la conexión propone para un sitio así: va marcado pieza por pieza, y la original sigue a un clic.'
        : 'Prefiero decírtelo antes que enseñarte una página inventada.')));
    const bts = cr('div', 'vacio-bts');
    const b1 = cr('button', 'bt', 'Ver la página original');
    b1.onclick = salir;
    bts.appendChild(b1);
    if(despertar && leer){
      const b2 = cr('button', 'bt flojo', 'Buscar otra vez');
      b2.onclick = async () => {
        b2.disabled = true;
        b2.classList.add('cargando');
        b2.textContent = 'Buscando…';
        b1.disabled = true;             /* que no se pueda salir a medias */
        try {
          await conTope(despertar(3), 15000);
          /* LA SESION PUDO MORIR EN ESTOS 15 SEGUNDOS. Sin esta linea,
             quitar la pagina mientras dice "Buscando…" -desde el boton de al
             lado o desde el popup- la RESUCITABA unos segundos despues:
             volvia a colgar #au-pagina, a registrar el gancho del sonido y a
             quedar como una capa opaca que contenido.js ya no sabia que
             existia. Este nodo es el que borra AU_DESARMAR: si no esta
             conectado, la persona ya se fue. */
          if(!host.isConnected) return;
          const nuevo = leer();
          if(AUok) AUok.contenido = nuevo;
          AU_ARMAR(nuevo, d, alQuitar);
          return;                       /* esta pagina ya no existe */
        } catch(e){
          /* aca solo se cae si despertar fallo o tardo demasiado; si
             desperto y de verdad no habia nada, se re-armo y este boton ya
             no existe. Asi que se puede volver a intentar. */
          if(!host.isConnected) return;
          b2.classList.remove('cargando');
          b2.disabled = false;
          b1.disabled = false;
          b2.textContent = 'No pude, probá otra vez';
        }
      };
      bts.appendChild(b2);
    }
    av.appendChild(bts);
    marco.appendChild(av);
  }

  /* ---- tarjetas ---- */
  /* en catalogo y app la rejilla ES la pagina: tarjetas grandes, texto
     corto, y todo lo demas pasa a segundo plano */
  const zona = cr('section', rejilla ? 'tarjetas grande' : 'tarjetas');
  const vistas = new Set();

  function hacerTarjeta(t){
    const conVideo = t.video && typeof t.video === 'object';
    const propio = conVideo && esDeAqui(t.video);
    /* Una chapa de play que no lleva a ningun lado es la peor version de la
       foto muerta: invita a pulsar y no pasa nada. La celda puede venir SIN
       enlace (tarjetasPorMedida arma celdas donde el `en` queda null y aun
       asi encuentra el <video> de adentro), asi que el destino se busca en
       dos lugares: el enlace de la celda o la direccion del propio video.
       Si el video es de casa no hace falta destino: el click cambia el
       reproductor de arriba, que es mejor todavia. */
    const href = urlOk(t.href) || (conVideo && !propio ? urlDirectaDelMedio(t.video) : null);
    const fuera = !urlOk(t.href) && !!href;   // el destino salio del video, no de la celda
    const card = href ? cr('a', 'tarjeta') : cr('div', 'tarjeta');
    if(rejilla) card.classList.add('grande');
    if(href){
      card.href = href;
      /* siempre en la MISMA pestaña: al llegar, la extension re-arma la
         pagina de destino sola, asi que se navega de una pagina armada a
         la siguiente sin salirse nunca del diseño. */
      card.rel = 'noopener';
      /* si el video es de casa el clic NO navega -cambia el reproductor de
         arriba-, asi que ahi no hay viaje que guardar y poner el gancho
         seria pelearse con el de mas abajo por el mismo clic */
      if(!propio) conViaje(card);
    }
    if(t.img){
      const f = imagen(t.img, t.titulo, 'tarjeta-img');
      if(f){
        /* la chapa SOLO si de verdad se puede llegar al video */
        if(conVideo && (propio || href)){
          const p = cr('span', 'tarjeta-play');
          p.innerHTML = SVG_PLAY;
          f.appendChild(p);
        }
        card.appendChild(f);
      }
    }
    const cuerpo = cr('div', 'tarjeta-txt');
    cuerpo.appendChild(cr('h3', null, t.titulo || 'Sin título'));
    if(t.txt) cuerpo.appendChild(cr('p', null, t.txt));
    if(propio) cuerpo.appendChild(cr('span', 'tarjeta-marca', 'Se ve aquí mismo'));
    card.appendChild(cuerpo);

    if(propio){
      /* cambiar el reproductor de arriba SIN salir de la pagina */
      card.addEventListener('click', ev => {
        /* ctrl/cmd/shift click es "abrilo en otra pestaña": si se le hace
           preventDefault, el gesto de toda la vida deja de funcionar */
        if(ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        ponerMedio(t.video);
        zona.querySelectorAll('.sonando').forEach(x => x.classList.remove('sonando'));
        card.classList.add('sonando');
        try { marco.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch(e){ marco.scrollTop = 0; }
      });
    }
    return card;
  }

  /* una tarjeta escrita por la conexion: sin enlace y sin foto, porque no
     hay adonde llevar ni que foto poner. Es texto, y va con textContent
     como todo lo que no escribimos nosotros. */
  function tarjetaEscrita(t){
    const card = cr('div', rejilla ? 'tarjeta grande' : 'tarjeta');
    const cuerpo = cr('div', 'tarjeta-txt');
    cuerpo.appendChild(cr('h3', null, texto(t.titulo) || 'Sin título'));
    const linea = texto(t.linea);
    if(linea) cuerpo.appendChild(cr('p', null, linea));
    card.appendChild(cuerpo);
    return firmar(card, c);
  }

  if(c.tarjetas.length || tarjetasInv.length){
    if(d.seccion_tarjetas){
      const h = cr('h2', 'seccion suelta');
      const hIco = cr('span', 'seccion-ico');
      hIco.innerHTML = svgDe(2, 18);
      h.append(hIco, cr('span', null, d.seccion_tarjetas));
      /* el nombre de la seccion siempre lo pone la conexion: el sitio no
         tiene ninguno que decir ahi */
      firmar(h, c);
      marco.appendChild(h);
    }
    c.tarjetas.forEach(t => {
      if(!t) return;
      vistas.add(claveTarjeta(t));
      zona.appendChild(hacerTarjeta(t));
    });
    /* las escritas van al final: primero lo que de verdad estaba */
    tarjetasInv.forEach(t => zona.appendChild(tarjetaEscrita(t)));
    marco.appendChild(zona);
  }

  /* ---- cargar mas ----
     Solo tiene sentido donde la pagina es una lista que sigue: catalogo y
     app. Y solo funciona porque ya no congelamos el scroll de abajo. */
  if(rejilla && !vacia && leer){
    const pie2 = cr('div', 'zona-mas');
    const mas = cr('button', 'mas', 'Cargar más');
    mas.onclick = async () => {
      if(mas.disabled) return;
      mas.disabled = true;
      mas.classList.add('cargando');
      mas.textContent = 'Buscando más…';
      let nuevas = [];
      try {
        if(despertar) await conTope(despertar(2), 15000);
        /* misma trampa que en "Buscar otra vez": quitar la pagina mientras
           esto espera no puede dejarnos escribiendo en un DOM que ya no
           existe ni resucitando nada */
        if(!host.isConnected) return;
        const leido = leer();
        const lista = (leido && Array.isArray(leido.tarjetas)) ? leido.tarjetas : [];
        nuevas = lista.filter(t => t && !vistas.has(claveTarjeta(t)));
      } catch(e){
        if(!host.isConnected) return;
        mas.classList.remove('cargando');
        mas.disabled = false;
        mas.textContent = 'No pude buscar más, probá otra vez';
        return;
      }
      mas.classList.remove('cargando');
      if(!nuevas.length){
        mas.classList.add('agotado');
        mas.textContent = 'No apareció nada nuevo';
        return;                                  /* queda deshabilitado */
      }
      nuevas.forEach(t => {
        vistas.add(claveTarjeta(t));
        c.tarjetas.push(t);                      /* para que sobreviva un re-armado */
        const card = hacerTarjeta(t);
        card.classList.add('nueva');
        zona.appendChild(card);
      });
      if(!zona.isConnected) marco.insertBefore(zona, pie2);
      mas.disabled = false;
      mas.textContent = 'Cargar más';
    };
    pie2.appendChild(mas);
    marco.appendChild(pie2);
  }

  /* ---- cuerpo ---- */
  const art = cr('article', 'cuerpo');
  let nTit = 0, hayLectura = false, nFotos = 0;
  c.bloques.forEach(b => {
    if(!b) return;
    if(b.tipo === 'titulo'){
      const h = cr(b.nivel <= 2 ? 'h2' : 'h3', 'seccion');
      const marca2 = cr('span', 'seccion-ico');
      marca2.innerHTML = svgDe(++nTit, b.nivel <= 2 ? 18 : 14);
      h.append(marca2, cr('span', null, b.txt));
      art.appendChild(h);
      return;
    }
    if(b.tipo === 'parrafo'){ hayLectura = true; art.appendChild(cr('p', null, b.txt)); return; }
    if(b.tipo === 'cita'){ hayLectura = true; art.appendChild(cr('blockquote', null, b.txt)); return; }
    if(b.tipo === 'lista'){
      const ul = cr('ul');
      (b.items || []).forEach(i => ul.appendChild(cr('li', null, i)));
      if(ul.children.length){ hayLectura = true; art.appendChild(ul); }
      return;
    }
    if(b.tipo === 'imagen'){
      const f = imagen(b.src, b.alt, 'foto');
      if(!f) return;
      if(b.alt) f.appendChild(cr('figcaption', null, b.alt));
      /* una foto SI es contenido. El extractor ya saco de los bloques toda
         imagen que este en la portada o en una tarjeta, asi que las que
         llegan aca no se ven en ningun otro lado de la pagina re-armada: si
         el cuerpo se descarta por "no hay lectura", se pierden en silencio.
         Lo que se queria tirar eran los titulos sueltos que son restos del
         menu del sitio, no las fotos. */
      nFotos++;
      art.appendChild(f);
    }
  });
  /* ---- las secciones escritas, despues de lo que si se leyo ---- */
  secciones.forEach(s => {
    const tit = texto(s.titulo), cuerpoTxt = texto(s.texto);
    if(!tit && !cuerpoTxt) return;
    /* UNA chapita por seccion, en la primera pieza. Si se firma cada
       parrafo, la pagina se vuelve una fila de avisos y no se lee nada:
       la marca tiene que decir de quien es, no interrumpir. */
    let marcada = false;
    if(tit){
      const h = cr('h2', 'seccion');
      const marca3 = cr('span', 'seccion-ico');
      marca3.innerHTML = svgDe(++nTit, 18);
      h.append(marca3, cr('span', null, tit));
      art.appendChild(firmar(h, c));
      marcada = true;
    }
    /* el modelo manda 2 a 4 frases en un solo campo: si las separo con
       saltos de linea son parrafos distintos, y pegarlos en uno es un
       ladrillo. Sin saltos, queda un parrafo y ya esta. */
    cuerpoTxt.split(/\n+/).map(x => x.trim()).filter(Boolean).forEach(p => {
      /* sin esta linea, en catalogo y app el cuerpo entero se descarta por
         "no hay nada que leer" y las secciones escritas desaparecian */
      hayLectura = true;
      const nodo = cr('p', null, p);
      if(!marcada){ firmar(nodo, c); marcada = true; }
      art.appendChild(nodo);
    });
  });

  /* los demas videos de la pagina, despues del texto */
  let otros = 0;
  c.medios.slice(1).forEach(m => { art.appendChild(medioNodo(m, c)); otros++; });

  if(art.children.length){
    if(!rejilla) marco.appendChild(art);
    else if(hayLectura || otros || nFotos){
      /* en una rejilla el texto suelto es contexto, no la pagina */
      art.classList.add('segundo');
      marco.appendChild(art);
    }
    /* si es rejilla y no hay nada que leer de verdad, el cuerpo desaparece:
       titulos sueltos sin parrafos son restos del menu del sitio */
  }

  /* ---- pie ---- */
  const pie = cr('footer', 'pie');
  const pIco = cr('span', 'pie-ico');
  pIco.innerHTML = svgDe(1, 16);
  pie.append(pIco, cr('span', null,
    'Esta página la armó API UNIVERSAL con el contenido de ' + c.sitio +
    '. El sitio original no fue modificado.'));
  marco.appendChild(pie);

  document.documentElement.appendChild(host);
  /* la barra del navegador scrollea un documento que esta tapado: se
     esconde (que no es congelarlo). Ver vestido.css. */
  document.documentElement.setAttribute('data-au-armado', '1');
  desahogar(raiz);
  revisarMotas(raiz);
  revisarEscala(raiz);
  revisarScroll(raiz);
  /* la pagina de abajo queda viva: se scrollea, sigue renderizando y por eso
     "cargar mas" puede funcionar. La rueda no se le escapa al sitio porque
     .marco lleva overscroll-behavior:contain, que es de nuestro lado: no se
     le escribe NADA al <html> del sitio. */
  return host;
}

/* una promesa de otro archivo no puede dejar el boton colgado para siempre.
   El temporizador se limpia al ganar la promesa: si no, quedaba un
   setTimeout vivo hasta 15 s despues de AU_DESARMAR. Era inerte -al vencer
   solo rechazaba una carrera ya resuelta- pero un temporizador que
   sobrevive a la salida es exactamente lo que no queremos tener suelto. */
function conTope(promesa, ms){
  let id = null;
  const tarde = new Promise((_, no) => {
    id = setTimeout(() => no(new Error('tardó demasiado')), ms);
  });
  return Promise.race([Promise.resolve(promesa), tarde])
                .finally(() => { if(id !== null) clearTimeout(id); });
}

/* ---------- que no se coma el texto ----------
   .tarjeta.grande recorta la descripcion a dos renglones, y para una
   tarjeta leida del sitio esta bien: ahi el texto es de apoyo y tres
   renglones tapan la lista. Pero cuando la tarjeta la ESCRIBIO la conexion,
   esa linea ES el contenido, y salia cortada con puntos suspensivos.

   No se arregla con una regla mas -el CSS del modelo tambien puede
   recortar- sino midiendo despues de dibujar: si el texto no entra y es
   corto, se le saca el recorte. Un estilo inline le gana a cualquier hoja
   que no use !important, y las nuestras no usan. */
/* ---------- UN @keyframes QUE NO EXISTE NO DA ERROR: DEJA TODO QUIETO ----------
   Desde que el movimiento del fondo lo escribe la conexion -su propio
   @keyframes y su nombre en --mota-anim-, hay una forma nueva de fallar en
   silencio: que escriba la animacion y nombre otra, o que nombre una y no
   la escriba. CSS no se queja de eso. animation-name se queda apuntando a
   un nombre que no existe, no corre nada, y las 120 cajitas se quedan
   clavadas donde nacieron: un sarpullido de cuadritos quietos repartidos
   por la pantalla, que se ve peor que no tener fondo animado.

   El prompt ya se lo dice, pero un aviso no es un mecanismo. Esto lo mide
   -getComputedStyle obliga a resolver el estilo, y las animaciones nacen
   ahi, asi que se puede preguntar en el acto- y cae a au-caer, que siempre
   existe. Inline y en cada pieza, porque tiene que ganarle a la regla que
   haya escrito el modelo.

   CORRE DOS VECES, Y NINGUNA CON requestAnimationFrame. La segunda es por
   la hoja del modelo, que puede adoptarse DESPUES de montar (vestirShadow
   la espera si todavia no llego): en esa vuelta la primera medicion
   todavia no habia visto su --mota-anim. Y con rAF esto no servia de nada
   en una pestaña que no esta a la vista -el navegador lo congela- que es
   justo cuando el vigilante re-arma sola una pagina de fondo. */
function revisarMotas(raiz){
  const mirar = () => {
    try {
      const capa = raiz.querySelector('.motas');
      const piezas = capa ? capa.querySelectorAll('i') : [];
      if(!piezas.length) return;
      /* apagadas no es un fallo: es un tema que decidio no mover nada */
      if(parseFloat(getComputedStyle(capa).opacity) < 0.02) return;
      /* en el modo Tetris la pieza corre au-pieza y quien se mueve es la
         fila, asi que esto tambien da 1 y no hay nada que arreglar */
      if(piezas[0].getAnimations().length) return;
      piezas.forEach(p => p.style.setProperty('--mota-anim', 'au-caer'));
      console.warn('[API UNIVERSAL] el fondo nombraba un @keyframes que no existe: se cae a au-caer');
    } catch(e){}
  };
  mirar();
  setTimeout(mirar, 400);
}

/* ---------- UNA PORTADA SIN JERARQUIA NO SE LEE COMO PORTADA ----------
   El mismo prompt, el mismo modelo y el mismo sitio dieron dos respuestas
   opuestas, y la tibia se midio asi: .hero h1 en 16px, MAS CHICO que su
   propio .seccion, que media 27px; y el lema, el menu, el cuerpo y los
   botones todos en el mismo 11px. Nada estaba roto -ninguna regla fallaba,
   la hoja se adoptaba entera- y sin embargo la pagina quedaba plana: si el
   titulo de portada no le gana al texto que tiene debajo, no hay portada,
   hay una lista de renglones del mismo tamaño.

   El prompt ya se lo pide, pero un aviso no es un mecanismo: eso depende de
   como salga la respuesta ese dia, y ese dia salio de las dos maneras. Aca
   se MIDE despues de montar, que es lo unico que no opina.

   DOS MEDIDAS, Y LAS DOS TIENEN QUE FALLAR PARA QUE ESTO TOQUE ALGO: el
   titulo por debajo de TITULO_MIN_PX (28px, que es donde un titulo todavia
   se lee como titulo en una portada a pantalla completa), o el titulo por
   debajo del DOBLE del cuerpo. La segunda existe porque un titulo de 20px no
   esta mal en si mismo: esta mal al lado de un cuerpo de 16px. Se mide el
   cuerpo real -.cuerpo p- y si esa pagina no tiene cuerpo (un catalogo se
   queda sin el) se cae al .lema, que es el otro texto largo de la portada.

   INLINE, y no una regla nuestra: la hoja del modelo se adopta DESPUES de
   pagina.css, asi que cualquier regla nuestra la pisa el. El estilo inline le
   gana a las dos sin necesidad de un !important, que es lo que le deja al
   modelo seguir re-escribiendo todo lo demas.

   CORRE DOS VECES Y NINGUNA CON requestAnimationFrame, por lo mismo que
   revisarMotas: la hoja del modelo puede adoptarse despues de montar
   (vestirShadow la espera si todavia no llego) y en la primera medicion el
   titulo todavia no tiene el tamaño que va a tener; y en una pestaña que no
   esta a la vista el navegador CONGELA rAF, que es justo el caso en que la
   pagina se re-arma sola.

   Y LA SEGUNDA PASADA VUELVE A MEDIR DE VERDAD, QUITANDO EL PARCHE PRIMERO.
   Antes se salia con `if(h1.style.fontSize) return`, y eso convertia la red
   en una trampa: en el arranque automatico -contenido.js arrancar() llama a
   rearmar() desde el callback de chrome.storage, que corre contra el fetch de
   pagina.css- la primera pasada mide un h1 SIN NINGUNA hoja adoptada, con el
   2em del navegador contra el <html> del sitio. En un sitio con
   html{font-size:62.5%} eso da 20px con el cuerpo en 10px: la red se
   disparaba, y la segunda pasada ya no volvia a mirar. Un diseño con el
   titulo en 62px quedaba clavado en el parche PARA SIEMPRE, en el mismo tipo
   de sitio para el que se escribio todo esto. Medido con el arnes: pasada 1
   en 20px, pasada 2 en 60px, resultado clamp(30px...) puesto. Ahora el parche
   se quita antes de medir, asi que la pasada 2 mide el diseño real y, si ya
   esta bien, el parche NO se repone. El aviso sale una sola vez porque solo
   se escribe cuando no habia parche puesto antes.

   ESTO ES UNA RED, NO UN ESTILO: si el diseño esta bien -y con el prompt de
   hoy lo normal es que lo este- no toca NADA y no dice NADA. */
const TITULO_MIN_PX = 28;
const TITULO_TOPE_PX = 56;
const TITULO_VW = 4.2;

/* EL PARCHE TIENE QUE APROBAR EL EXAMEN QUE ACABA DE REPROBAR EL DISEÑO.
   Era un texto fijo, clamp(30px, 4.2vw, 56px), y 30px NO cumple el propio
   criterio de aca arriba en cuanto el cuerpo pasa de 15px: con .cuerpo p en
   17px -lo que dice pagina.css- el doble es 34px, asi que en una ventana de
   menos de 810px el clamp se queda en su piso de 30px y el titulo sigue por
   debajo del doble. Se corregia a un tamaño que el mismo revisor volveria a
   rechazar. El piso ahora sale de la medida. */
function pisoDelTitulo(cue){
  return Math.max(TITULO_MIN_PX + 2, Math.ceil(cue * 2));
}
function redDelTitulo(cue){
  const piso = pisoDelTitulo(cue);
  return 'clamp(' + piso + 'px, ' + TITULO_VW + 'vw, ' +
         Math.max(piso, TITULO_TOPE_PX) + 'px)';
}

function revisarEscala(raiz){
  const mirar = () => {
    try {
      const h1 = raiz.querySelector('.hero h1');
      if(!h1) return;
      const px = n => parseFloat(getComputedStyle(n).fontSize) || 0;
      /* se mide el DISEÑO, no el parche: si la pasada anterior puso uno, se
         saca antes de preguntar el tamaño. Nadie mas le escribe font-size
         inline a este nodo, asi que lo que haya aca es nuestro. */
      const previa = h1.style.fontSize;
      if(previa) h1.style.removeProperty('font-size');
      const tit = px(h1);
      /* 0 es "todavia no hay estilo resuelto", no "quedo chico": no se toca,
         y si habia parche se devuelve tal cual estaba */
      if(!tit){ if(previa) h1.style.setProperty('font-size', previa); return; }
      const cuerpo = raiz.querySelector('.cuerpo p') || raiz.querySelector('.lema');
      const cue = cuerpo ? px(cuerpo) : 0;
      /* el diseño se defiende solo: el parche queda quitado, que es como se
         desarma esto cuando la hoja del modelo llego tarde. Y si ya se habia
         avisado, se dice que se retiro: si no, en la consola queda un
         "se le pone clamp(...)" que dejo de ser cierto y manda a buscar un
         estilo inline que ya no existe. */
      if(tit >= TITULO_MIN_PX && (!cue || tit >= cue * 2)){
        if(previa) console.warn('[API UNIVERSAL] el aviso de arriba se midió antes de que ' +
                                'llegara la hoja del diseño: el título ya trae ' +
                                tit.toFixed(1) + 'px, se le quita el arreglo');
        return;
      }
      const red = redDelTitulo(cue);
      h1.style.setProperty('font-size', red);
      if(previa) return;   /* ya se aviso cuando se puso la primera vez */
      console.warn('[API UNIVERSAL] el título de portada salió en ' + tit.toFixed(1) + 'px' +
                   (cue ? ' y el cuerpo en ' + cue.toFixed(1) + 'px' : '') +
                   ': por debajo de ' + TITULO_MIN_PX + 'px o del doble del cuerpo, ' +
                   'se le pone ' + red);
    } catch(e){}
  };
  mirar();
  setTimeout(mirar, 400);
}

/* ---------- LA RED DEL SCROLL ----------
   GUARDA_SCROLL le gana a cualquier regla que el modelo escriba SOBRE
   .marco, y con eso alcanza para la causa que ya vimos. Pero hay otras
   maneras de dejar el contenido fuera de alcance que no pasan por .marco:
   un hijo en position:fixed sale del flujo y no suma alto, y entonces la
   pagina no tiene a donde bajar aunque el contenedor este perfecto.
   Eso no se puede arreglar a ciegas -pisarle el position a una pieza le
   rompe el diseño a proposito del modelo-, asi que esto MIDE y NOMBRA al
   culpable. Un bug mudo se vuelve un bug con nombre y apellido en la
   consola, que es la diferencia entre buscarlo media hora y verlo.

   Corre dos veces y sin requestAnimationFrame, por lo mismo que
   revisarMotas: la hoja del modelo puede adoptarse despues de montar, y en
   una pestaña que no esta a la vista rAF esta congelado. */
function revisarScroll(raiz){
  const mirar = () => {
    try {
      const marco = raiz.querySelector('.marco');
      if(!marco) return;
      /* SE MIDE MOVIENDOLO, NO PREGUNTANDOLE.
         Comparar scrollHeight con clientHeight NO alcanza, y esto se midio:
         con overflow:hidden el navegador sigue reportando scrollHeight 1827
         contra clientHeight 584 -o sea "hay de sobra para bajar"- y la rueda
         no mueve nada. Esta red se escribio primero asi y se le pasaba de
         largo justo el caso que vino a cazar. La verdad es si el scrollTop
         se queda donde lo pusimos: eso no se puede fingir. */
      const donde = marco.scrollTop;
      marco.scrollTop = donde + 120;
      const se_movio = marco.scrollTop > donde;
      marco.scrollTop = donde;
      if(se_movio) return;                /* se puede bajar: no hay nada que decir */
      /* y si estaba abajo del todo, no es que no se pueda: es que ya llego */
      if(donde > 0) return;
      /* nadie puede bajar, pero puede que de verdad no haya nada abajo.
         Se pregunta por las piezas: si la ultima termina dentro de la
         ventana, la pagina es corta y esta bien asi. */
      let fondo = 0, culpable = null;
      for(const h of marco.children){
        if(h.classList.contains('motas')) continue;   /* capa de fondo, es fixed a proposito */
        const r = h.getBoundingClientRect();
        if(r.bottom > fondo){ fondo = r.bottom; }
        if(getComputedStyle(h).position === 'fixed') culpable = h.className || h.tagName;
      }
      if(fondo <= marco.clientHeight + 4 && !culpable) return;   /* pagina corta de verdad */
      console.warn('[API UNIVERSAL] la pagina armada no se puede bajar y tiene ' +
        'contenido abajo: el contenedor mide ' + marco.clientHeight + 'px y lo dibujado ' +
        'llega a ' + Math.round(fondo) + 'px' +
        (culpable ? '. Hay una pieza fuera del flujo (position:fixed): ' + culpable : '') +
        '. El scroll de .marco lo defiende GUARDA_SCROLL, asi que esto viene de una pieza.');
    } catch(e){}
  };
  mirar();
  setTimeout(mirar, 400);
}

function desahogar(raiz){
  requestAnimationFrame(() => {
    try {
      for(const p of raiz.querySelectorAll('.tarjeta-txt p, .escrito p')){
        if(p.scrollHeight <= p.clientHeight + 2) continue;
        if((p.textContent || '').length > 220) continue;   // ese si es largo de verdad
        p.style.display = 'block';
        p.style.webkitLineClamp = 'unset';
        p.style.overflow = 'visible';
      }
    } catch(e){}
  });
}

function AU_DESARMAR(){
  document.documentElement.removeAttribute('data-au-armado');
  document.getElementById('au-volver-armada')?.remove();
  document.getElementById('au-pagina')?.remove();
  /* corta el despertador ANTES de nada: si hay un AU_DESPERTAR corriendo,
     sigue haciendo scrollTo sobre el sitio hasta 7 s, y con nuestra capa ya
     quitada eso se ve como la pagina original moviendose sola. */
  try { if(typeof AU_CORTAR === 'function') AU_CORTAR(); } catch(e){}
  devolverSonido();
}
