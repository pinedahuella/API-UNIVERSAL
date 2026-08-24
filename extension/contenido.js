/* API UNIVERSAL sobre una pagina que ya existe.
   No toca el servidor de nadie: solo cambia el DOM en este navegador.

   COMO FUNCIONA
   1. Lee la ESTRUCTURA de la pagina (etiquetas, tamaños, posiciones).
   2. Se la manda a la conexion, que devuelve un diseño completo.
   3. CLASIFICA cada elemento midiendolo, y le pone la clase que le toca.
      Adivinar por selector no sirve: en Instagram cada conversacion es un
      div[role="button"] de 400px, y si se estiliza como boton la lista
      entera se vuelve un bloque de color.
   4. Se reaplica sola cuando el sitio redibuja al navegar. */

const AU = {
  SERVIDOR: 'http://localhost:4321',
  guardado: null,
  puesto: false,
  modo: null,            // 'vestido' (CSS encima del sitio) | 'rearmado' (HTML nuestro)
  observador: null,
  iconos: [],
  contenido: null,
  /* la persona pidio ver el sitio de abajo (AU_ASOMARSE). Mientras este en
     true NADA vuelve a armar: las relecturas seguian disparando y, al
     encontrar mas contenido, montaban una capa nueva VISIBLE encima del
     reproductor que la persona acababa de poner, y de paso lo pausaban. */
  asomado: false
};

/* La memoria va POR SITIO. Con la extension corriendo en cualquier pagina,
   una sola bandera "activo" hacia que el tema guardado en un sitio se
   aplicara solo al abrir cualquier otro. */
const LLAVE = 'sitio:' + location.origin;

/* ============ 1. LEER LA ESTRUCTURA ============ */
function estructura(){
  const visible = e => {
    const r = e.getBoundingClientRect();
    return r.width > 60 && r.height > 30 && r.top < 4000;
  };
  const nombrar = e => {
    if(e.id) return '#' + e.id;
    const rol = e.getAttribute('role'), al = e.getAttribute('aria-label');
    if(rol) return e.tagName.toLowerCase() + '[role="' + rol + '"]';
    if(al && al.length < 26) return e.tagName.toLowerCase() + '[aria-label="' + al + '"]';
    /* NUNCA nuestras propias clases: la nav vestida se llamaba
       "nav._ab8c.au-panel" y ese selector solo existe mientras esta puesto */
    const c = [...e.classList].filter(x => !x.startsWith('au-'))
                              .slice(0,2).map(x => '.' + x).join('');
    return e.tagName.toLowerCase() + c;
  };

  const zonas = [...document.querySelectorAll('nav,header,main,section,aside,article,div[role]')]
    .filter(visible).slice(0, 22).map(e => {
      const r = e.getBoundingClientRect();
      return { s:nombrar(e), w:Math.round(r.width), h:Math.round(r.height),
               x:Math.round(r.left), y:Math.round(r.top + scrollY),
               img:e.querySelectorAll('img').length,
               a:e.querySelectorAll('a').length,
               btn:e.querySelectorAll('button').length };
    });

  const rejillas = [...document.querySelectorAll('div,section,ul')].filter(e => {
    const cs = getComputedStyle(e);
    return (cs.display === 'grid' || cs.display === 'flex') && e.querySelectorAll('img').length >= 3;
  }).slice(0, 5).map(e => ({ s:nombrar(e), display:getComputedStyle(e).display,
                             img:e.querySelectorAll('img').length }));

  return { sitio: location.hostname, ancho: innerWidth, zonas, rejillas };
}

/* ============ 2. CLASIFICAR MIDIENDO ============ */
/* au-tocado va en TODO lo que clasificamos. La regla que vuelve transparentes
   los contenedores del sitio le gana en especificidad a las clases sueltas
   (main div = mas peso que .au-btn.au-btn), asi que en vez de perseguir caso
   por caso, esa regla excluye .au-tocado y cada clase define su propio fondo. */
const CLASES = ['au-btn','au-fila','au-caja','au-avatar','au-media',
                'au-panel','au-entrada','au-icono','au-nota','au-enlace',
                'au-grande','au-flotante','au-tocado'];

function clasificar(){
  document.querySelectorAll('.' + CLASES.join(',.')).forEach(e => e.classList.remove(...CLASES));
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const n = { btn:0, fila:0, caja:0, avatar:0, media:0, panel:0, entrada:0, icono:0, nota:0, enlace:0, flotante:0 };

  /* fotos: por tamaño. Un avatar de 32px no se marca igual que una foto de 500px */
  document.querySelectorAll('img, video').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    const r = e.getBoundingClientRect(), lado = Math.min(r.width, r.height);
    if(lado <= 76){
      e.classList.add('au-avatar');
      if(lado >= 44) e.classList.add('au-grande');
      n.avatar++;
    }
    else if(Math.max(r.width, r.height) >= 150){ e.classList.add('au-media'); n.media++; }
  });

  /* Clicables. La distincion que importa: un <a href> es un ENLACE, nunca un boton
     de accion. En Instagram el nombre de usuario, la hora ("2d") y el audio de un
     reel son <a role="link"> cortos; si se estilizan como boton, la pagina se llena
     de pastillas de color donde deberia haber texto. Solo <button> y [role=button]
     sin href pueden ser botones. */
  document.querySelectorAll('[role="button"], button, [role="link"], a[href]').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    if(e.parentElement && e.parentElement.closest('[role="button"],button,[role="link"]')) return;
    const r = e.getBoundingClientRect();
    const txt = (e.innerText || '').trim();
    const tieneSvg = !!e.querySelector('svg');
    const tieneImg = !!e.querySelector('img,canvas');
    const enMenu = !!e.closest('nav');
    const esEnlace = e.tagName === 'A' && e.hasAttribute('href');
    const esAccion = !esEnlace && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button');

    if(enMenu || tieneSvg || !txt){ e.classList.add('au-icono'); n.icono++; return; }
    if(r.width >= 240 || r.height >= 64 || tieneImg){ e.classList.add('au-fila'); n.fila++; return; }
    /* un boton de accion de verdad: "Seguir", "Enviar mensaje". Texto de 3 letras
       para arriba, asi las burbujitas de conteo ("1", "9") no se vuelven botones. */
    if(esAccion && txt.length >= 3 && txt.length <= 22 && r.height <= 52){
      e.classList.add('au-btn'); n.btn++; return;
    }
    if(esEnlace){ e.classList.add('au-enlace'); n.enlace++; return; }
    e.classList.add('au-icono'); n.icono++;
  });

  /* notas y globitos de medida justa: al cambiar la tipografia el texto crece
     y el sitio saca una barra de scroll que parece un control roto */
  document.querySelectorAll('main div, [role="dialog"] div').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    const r = e.getBoundingClientRect();
    if(r.width > 220 || r.width < 40 || r.height > 140) return;
    const cs = getComputedStyle(e);
    const desborda = e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth;
    if((cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowX === 'auto') && desborda){
      e.classList.add('au-nota'); n.nota++;
    }
  });

  document.querySelectorAll('input[type="text"],input[type="search"],input:not([type]),textarea,[role="textbox"],[contenteditable="true"]')
    .forEach(e => { if(vis(e) && !e.closest('[id^="au-"]')){ e.classList.add('au-entrada'); n.entrada++; } });
  /* widgets flotantes (la burbuja de mensajes). Se detectan por position:fixed
     medido, no por el atributo style: el sitio los pinta con clases. */
  document.querySelectorAll('body div').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    if(getComputedStyle(e).position !== 'fixed') return;
    const r = e.getBoundingClientRect();
    if(r.width < 120 || r.width > 560 || r.height < 36 || r.height > 200) return;
    if(e.querySelector('div[style*="position: fixed"]')) return;
    e.classList.add('au-flotante'); n.flotante++;
  });

  document.querySelectorAll('article, aside, [role="article"]')
    .forEach(e => { if(vis(e)){ e.classList.add('au-caja'); n.caja++; } });
  document.querySelectorAll('nav, [role="navigation"]')
    .forEach(e => { if(vis(e)){ e.classList.add('au-panel'); n.panel++; } });

  document.querySelectorAll('.au-btn,.au-fila,.au-caja,.au-panel,.au-entrada,.au-nota,.au-flotante,.au-icono,.au-enlace')
    .forEach(e => e.classList.add('au-tocado'));
  return n;
}

/* ============ 2c. LOS ICONOS DEL TEMA ============
   Los dibuja la conexion, porque el tema puede ser cualquier cosa: si alguien
   pide "serpientes en un desierto" no hay biblioteca fija que lo cubra.
   Aqui se valida lo que llega y, si no sirve, se cae a marcas geometricas
   que igual se ven intencionales. */
const D_VALIDO = /^[MmLlHhVvCcSsQqTtAaZz0-9eE ,.\-+]+$/;

/* marcas neutras: si no llega nada usable, esto no parece un error */
const RESPALDO = ['rombo', 'anillo', 'marco', 'estrella'];
const NEUTROS = {
  rombo:    'M12 2 22 12 12 22 2 12Z',
  anillo:   'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  marco:    'M3 3h18v18H3Zm4 4v10h10V7Z',
  estrella: 'M12 2 15 9l7 .6-5.3 4.6L18.3 21 12 17.3 5.7 21l1.6-6.8L2 9.6 9 9Z'
};

/* Un path dibujado al vuelo puede salirse del lienzo o quedar en un hilo.
   La caja se MIDE en el navegador con getBBox: contar los numeros del texto no
   sirve, porque en los comandos relativos (c, l, a en minuscula) los negativos
   son desplazamientos, no posiciones, y un path perfectamente bueno se
   rechazaba por tener un -11. */
let _medidor = null;
function pathUsable(d){
  const p = String(d || '').trim().replace(/\s+/g, ' ');
  if(p.length < 20 || p.length > 4000) return null;
  if(!/^[Mm]/.test(p) || !D_VALIDO.test(p)) return null;
  try {
    /* quitar() borra #au-medidor y este puntero queda apuntando a un path
       suelto. getBBox() sobre algo desprendido devuelve 0x0 SIN lanzar error,
       asi que despues de un quitar+vestir TODO path dibujado se rechazaba en
       silencio y siempre salian las marcas neutras. */
    if(!_medidor || !_medidor.isConnected){
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
      svg.id = 'au-medidor';
      _medidor = document.createElementNS('http://www.w3.org/2000/svg','path');
      svg.appendChild(_medidor);
      document.documentElement.appendChild(svg);
    }
    _medidor.setAttribute('d', p);
    const b = _medidor.getBBox();
    if(b.x < -0.5 || b.y < -0.5) return null;
    if(b.x + b.width > 24.5 || b.y + b.height > 24.5) return null;
    if(b.width < 4 || b.height < 4) return null;   // un hilo no se ve a 16px
    return p;
  } catch(e){ return null; }
}

/* La conexion elige por nombre de la biblioteca; solo dibuja cuando de verdad
   no hay nada que sirva. Se probo pedirle que dibujara siempre y salia pobre. */
function iconosDe(d){
  const lib = (typeof ICONOS !== 'undefined') ? ICONOS : {};
  const salida = [];
  (Array.isArray(d.iconos) ? d.iconos : []).forEach(x => {
    if(typeof x === 'string'){
      if(lib[x]) salida.push(lib[x]);
      return;
    }
    if(x && typeof x === 'object'){
      if(x.id && lib[x.id]){ salida.push(lib[x.id]); return; }
      const p = pathUsable(x.d);
      if(p) salida.push(p);
    }
  });
  let i = 0;
  while(salida.length < 4){
    salida.push(NEUTROS[RESPALDO[i % RESPALDO.length]]);
    i++;
  }
  return salida.slice(0, 4);
}

/* un <svg> como texto, para meterlo en innerHTML o en un data URI */
function svgIcono(d, tam, color, op){
  return '<svg viewBox="0 0 24 24" width="' + tam + '" height="' + tam +
    '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="' + color + '"' + (op != null ? ' opacity="' + op + '"' : '') +
    ' d="' + d + '"/></svg>';
}

/* ============ 3. FUENTES QUE EXISTEN SIN BAJAR NADA ============ */
const PILAS = {
  'Fredoka':          '"Segoe UI Rounded","Trebuchet MS",Verdana,sans-serif',
  'Quicksand':        '"Trebuchet MS",Verdana,"Segoe UI",sans-serif',
  'Bebas Neue':       '"Haettenschweiler","Arial Narrow",Impact,sans-serif',
  'Space Grotesk':    '"Segoe UI",system-ui,Arial,sans-serif',
  'Playfair Display': 'Georgia,"Times New Roman",serif',
  'Lora':             'Georgia,"Book Antiqua",serif',
  /* estas cuatro viajan DENTRO de la extension (ver extension/fuentes):
     no hay ni una tipografia de pixeles instalada en Windows, asi que
     sin empaquetarlas "8 bits" terminaba en Courier New */
  'Press Start 2P':   '"Press Start 2P","Silkscreen","Courier New",monospace',
  'Silkscreen':       '"Silkscreen","Press Start 2P","Courier New",monospace',
  'VT323':            '"VT323","Lucida Console","Courier New",monospace',
  'Bungee':           '"Bungee",Impact,"Arial Black",sans-serif',
  'Pixel':            '"Press Start 2P","Silkscreen","Courier New",monospace',
  'Mono':             '"Courier New",Consolas,monospace',
  /* atajos con nombre, para que la conexion no tenga que acordarse de la
     pila entera. Cualquier otro nombre de fuente instalada tambien vale. */
  'Windows 95':       '"MS Sans Serif","Microsoft Sans Serif",Tahoma,sans-serif',
  'Antigua':          'Papyrus,"Old English Text MT","Book Antiqua",serif',
  'Manuscrita':       '"Edwardian Script ITC","Brush Script MT","Segoe Script",cursive',
  'Infantil':         '"Curlz MT","Comic Sans MS","Ink Free",cursive',
  'Titular':          '"Cooper Black",Broadway,Elephant,"Arial Black",sans-serif',
  'Maquina':          '"Courier New",Consolas,"Lucida Console",monospace'
};
/* Ocho tipografias no alcanzan. Windows trae 91 de las 100 que probe
   -Papyrus, Old English Text MT, Cooper Black, MS Sans Serif, Curlz MT,
   Jokerman, Edwardian Script...- y estan TODAS instaladas, no hay que bajar
   nada. Asi que la conexion puede mandar cualquier nombre de fuente y aca
   se acepta, con respaldo por si en esa maquina no esta.

   Se limpia el nombre porque va derecho a una propiedad CSS: una comilla o
   un punto y coma sueltos cierran la declaracion y abren otra. */
function pila(n){
  const nombre = String(n == null ? '' : n).trim();
  if(PILAS[nombre]) return PILAS[nombre];
  if(/^[\w .\-]{2,42}$/.test(nombre)){
    const generica = /script|hand|corsiva|vivaldi|brush|gigi|curlz|mistral/i.test(nombre) ? 'cursive'
                   : /courier|consolas|console|mono|terminal|fixedsys/i.test(nombre) ? 'monospace'
                   : /papyrus|old english|garamond|antiqua|palatino|bookman|goudy|centaur|perpetua|baskerville|georgia|cambria|constantia|rockwell|elephant|castellar|engravers|felix|colonna|bell mt|high tower|times/i.test(nombre) ? 'serif'
                   : 'sans-serif';
    return '"' + nombre + '",' + generica;
  }
  return PILAS['Space Grotesk'];
}

/* ============ 4. VESTIR ============
   Dos modos, y la diferencia es de fondo:

   - VESTIDO: el CSS del sitio se pisa y sus elementos se clasifican. La
     pagina sigue siendo la suya, con nuestra ropa.
   - REARMADO: se LEE su contenido y se levanta HTML nuestro encima. No se
     le toca un solo nodo, asi que no hay nada que restaurar despues.

   Los dos comparten el tema, que es lo que sigue. */
function ponerTema(d, marcarSitio){
  const raiz = document.documentElement;
  if(marcarSitio) raiz.setAttribute('data-au', '1');
  const p = raiz.style;
  const oscuro = d.oscuro === true;

  p.setProperty('--au-acento',  d.acento);
  p.setProperty('--au-acento2', d.acento2);
  p.setProperty('--au-fondo',   d.fondo);
  p.setProperty('--au-papel',   oscuro ? aclarar(d.fondo, 18) : '#ffffff');
  p.setProperty('--au-tinta',   oscuro ? '#f4f6fb' : '#12171f');
  p.setProperty('--au-tinta2',  oscuro ? '#c3c9d8' : '#5b6272');
  p.setProperty('--au-linea',   oscuro ? aclarar(d.fondo, 34) : mezclar(d.acento, .74));
  p.setProperty('--au-radio',   d.radio || '14px');
  p.setProperty('--au-tit',     pila(d.fuente_tit));
  p.setProperty('--au-txt',     pila(d.fuente_txt));
  p.setProperty('--au-tt',      (d.mayus === true || d.fuente_tit === 'Bebas Neue') ? 'uppercase' : 'none');

  /* Los temas duros (arcade, taller, deportes) llevan borde grueso y sombra dura.
     No se depende de que la conexion mande el campo: si no viene, se deduce de
     lo que si mando. Un radio de 2px con Bebas Neue ya es un tema duro. */
  const radioNum = parseFloat(d.radio) || 14;
  const fuenteDura = ['Pixel','Mono','Bebas Neue'].includes(d.fuente_tit)
                  || ['Pixel','Mono'].includes(d.fuente_txt);
  const duro = (d.duro === true) || radioNum <= 5 || fuenteDura;
  p.setProperty('--au-borde',  duro ? '3px' : '1px');
  p.setProperty('--au-sombra', duro ? '4px 4px 0 0 ' + d.acento2
                                    : '0 6px 20px rgba(0,0,0,' + (oscuro ? '.35' : '.10') + ')');
  p.setProperty('--au-ls',     duro ? '.03em' : 'normal');
  p.setProperty('--au-pixel',  duro ? 'pixelated' : 'auto');
  p.setProperty('--au-avatar-r', duro ? (d.radio || '0px') : '50%');
  p.setProperty('--au-acento-suave', oscuro ? aclarar(d.fondo, 30) : mezclar(d.acento, .86));
  p.setProperty('--au-sobre-acento', sobre(d.acento));

  AU.iconos = iconosDe(d);
  fondo(d);
}

function vestir(d){
  ponerTema(d, true);
  boton(d);
  clasificar();
  AU.puesto = true;
  AU.modo = 'vestido';
}

/* El re-armado NO pone data-au: el sitio de abajo queda tal cual, asi
   "Ver la original" muestra de verdad la original. */
function rearmar(d, contenido){
  ponerTema(d, false);
  /* ya leido por quien pidio el re-armado: leerlo dos veces cuesta y
     ademas puede dar distinto si el sitio se movio en el medio */
  AU.contenido = contenido || AU.contenido || AU_LEER();
  AU_ARMAR(AU.contenido, d, quitar);
  AU.puesto = true;
  AU.modo = 'rearmado';
  return AU.contenido.medida;
}

/* el fondo va en el body: en un div encima tapa la barra */
function fondo(d){
  const a = conAlfa(d.acento, d.oscuro ? .26 : .40);
  const b = conAlfa(d.acento2, d.oscuro ? .22 : .34);
  /* el patron se dibuja con los paths del tema, no con emojis: un emoji
     partido a la mitad rompe encodeURIComponent, y ademas se ve generico */
  const ic = AU.iconos;
  const tinta = d.oscuro ? '%23ffffff' : '%23000000';
  const pon = (p, x, y, esc, o) =>
    '<g transform="translate(' + x + ',' + y + ') scale(' + esc + ')">' +
    '<path fill="' + (d.oscuro ? '#ffffff' : '#000000') + '" opacity="' + o + '" d="' + p + '"/></g>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="200">' +
    pon(ic[0], 22, 26, 1.15, .075) +
    pon(ic[1], 140, 96, .95, .06) +
    pon(ic[2], 64, 150, 1.05, .065) +
    pon(ic[3], 182, 12, .8, .05) +
    '</svg>';
  let patron = '';
  try { patron = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '"),'; }
  catch(e){ patron = ''; }
  const capas = patron +
    'radial-gradient(900px 620px at 10% -6%,' + a + ',transparent 62%),' +
    'radial-gradient(760px 560px at 104% 106%,' + b + ',transparent 60%)';
  /* las mismas capas, como variables, para que la pagina re-armada tenga
     el mismo aire sin volver a calcular nada */
  const rz = document.documentElement.style;
  rz.setProperty('--au-vel1', a);
  rz.setProperty('--au-vel2', b);
  rz.setProperty('--au-patron', patron ? patron.replace(/,$/, '') : 'none');

  const e = document.body.style;
  e.setProperty('background-image', capas, 'important');
  e.setProperty('background-repeat', patron ? 'repeat,no-repeat,no-repeat' : 'no-repeat,no-repeat', 'important');
  e.setProperty('background-attachment', patron ? 'scroll,fixed,fixed' : 'fixed,fixed', 'important');
  e.setProperty('background-color', d.fondo, 'important');
}

/* Lo unico nuestro que queda en la pagina. Nada de barra ni de tarjeta: tapaban
   el logo del sitio y hacian que se viera intervenida en vez de re-vestida.
   Un circulo discreto que se abre a "Quitar" cuando le pasas el mouse. */
function boton(d){
  let b = document.getElementById('au-boton');
  if(!b){ b = document.createElement('button'); b.id = 'au-boton'; document.body.appendChild(b); }
  b.innerHTML = '';
  b.title = 'Quitar el diseño';
  b.setAttribute('aria-label', 'Quitar el diseño');
  const ico = document.createElement('span'); ico.className = 'au-b-ico';
  ico.innerHTML = svgIcono(AU.iconos[0], 17, 'currentColor');
  const txt = document.createElement('span'); txt.className = 'au-b-txt';
  txt.textContent = 'Quitar';
  b.append(ico, txt);
  b.onclick = quitar;
}

function quitar(){
  document.documentElement.removeAttribute('data-au');
  AU_DESARMAR();
  ['au-boton','au-aviso','au-intro','au-medidor'].forEach(id => document.getElementById(id)?.remove());
  ['background-image','background-repeat','background-attachment','background-color']
    .forEach(k => document.body.style.removeProperty(k));
  ['--au-vel1','--au-patron','--au-vel2']
    .forEach(k => document.documentElement.style.removeProperty(k));
  document.querySelectorAll('.' + CLASES.join(',.')).forEach(e => e.classList.remove(...CLASES));
  if(AU.observador){ AU.observador.disconnect(); AU.observador = null; }
  cortarRelecturas();
  AU.puesto = false;
  AU.modo = null;
  AU.asomado = false;
  /* {activo:false} NO es "este sitio no tiene memoria": es el registro de que
     la persona dijo QUITALO AQUI, y la llegada de un viaje tiene que
     respetarlo. Va sin `guardado` adentro, asi que ocupa nada. */
  guardarSitio({ activo:false });
  /* si habia un viaje a medio salir, se cancela: quitar el diseño y que
     igual aparezca en la pagina siguiente seria lo contrario de quitarlo */
  chrome.storage.local.remove(LLAVE_VIAJE);
}

/* ============ 5. COLORES ============ */
/* El color lo elige un modelo: puede venir de 3 digitos ("#abc"), sin
   numeral, o no ser hex. Sin normalizar, "#abc" daba rgb(0,10,188) -otro
   color- y "coral" daba negro, los dos sin un solo error. */
function hex6(h){
  let s = String(h == null ? '' : h).trim().replace(/^#/, '');
  if(/^[0-9a-fA-F]{3}$/.test(s)) s = s[0]+s[0]+s[1]+s[1]+s[2]+s[2];
  return /^[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
}
function color(h, respaldo){ const s = hex6(h); return s ? '#' + s : respaldo; }
function nums(h){
  const s = hex6(h) || '5b6cff';
  const n = parseInt(s, 16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}

/* todo diseño pasa por aqui antes de tocar la pagina */
function sanear(d){
  const s = Object.assign({}, d || {});
  s.oscuro  = s.oscuro === true;
  s.acento  = color(s.acento,  '#5b6cff');
  s.acento2 = color(s.acento2, '#8b5cf6');
  s.fondo   = color(s.fondo,   s.oscuro ? '#12141c' : '#f6f7fb');
  return s;
}

/* Que color de texto va SOBRE un fondo dado. Los colores los elige un modelo,
   asi que no se puede clavar blanco: crema sobre terracota daba 2.9:1 y a 10px
   no se leia. Se calcula el contraste y gana el que mas de. */
function luminancia(h){
  const [r,g,b] = nums(h).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function sobre(fondoHex){
  const L = luminancia(fondoHex);
  const conBlanco = (1.05) / (L + 0.05);
  const conNegro  = (L + 0.05) / 0.05;
  return conBlanco >= conNegro ? '#ffffff' : '#111111';
}
function conAlfa(h,a){ const [r,g,b] = nums(h); return `rgba(${r},${g},${b},${a})`; }
function mezclar(h,blanco){ const [r,g,b] = nums(h); const m = v => Math.round(v+(255-v)*blanco); return `rgb(${m(r)},${m(g)},${m(b)})`; }
function aclarar(h,cuanto){ const [r,g,b] = nums(h); const s = v => Math.min(255, v+cuanto); return `rgb(${s(r)},${s(g)},${s(b)})`; }

/* ============ 6. LA INTRO =============
   Es tambien la pantalla de carga: la conexion tarda entre 20 y 45 segundos,
   asi que la animacion cuenta el proceso mientras tanto y remata con el
   nombre del diseño y confeti. */
function intro(tema){
  document.getElementById('au-intro')?.remove();
  const cap = document.createElement('div');
  cap.id = 'au-intro';
  cap.innerHTML =
    '<canvas id="au-confeti"></canvas><div id="au-rejilla"></div><div id="au-scan"></div>' +
    '<div id="au-centro"><div id="au-logo">API UNIVERSAL</div>' +
    '<div id="au-sub">está armando tu página</div>' +
    '<div id="au-linea1"></div><div id="au-nombre"></div>' +
    '<div id="au-barrita"><i></i></div></div><div id="au-crt"></div>';
  document.documentElement.appendChild(cap);

  const cv = cap.querySelector('#au-confeti');
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  let colores = ['#5b6cff', '#8b5cf6', '#ffffff'];
  const trozos = [];
  let vivo = true;

  const estallar = n => {
    const cx = cv.width / 2, cy = cv.height * .46;
    for(let i = 0; i < n; i++){
      const ang = Math.random() * Math.PI * 2;
      const fu = (2 + Math.random() * 11) * dpr;
      trozos.push({ x:cx + (Math.random()-.5)*160*dpr, y:cy,
        vx:Math.cos(ang)*fu, vy:Math.sin(ang)*fu - 3*dpr,
        s:(4 + Math.random()*8)*dpr, g:Math.random()*Math.PI, vg:(Math.random()-.5)*.24,
        c:colores[(Math.random()*colores.length)|0] });
    }
  };
  const pintar = () => {
    if(!vivo) return;
    ctx.clearRect(0,0,cv.width,cv.height);
    for(const t of trozos){
      t.x+=t.vx; t.y+=t.vy; t.g+=t.vg; t.vy+=.16*dpr; t.vx*=.992;
      ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.g);
      ctx.fillStyle=t.c; ctx.fillRect(-t.s/2,-t.s/2,t.s,t.s*.68); ctx.restore();
    }
    for(let i=trozos.length-1;i>=0;i--) if(trozos[i].y>cv.height+50) trozos.splice(i,1);
    requestAnimationFrame(pintar);
  };
  pintar();

  const l1 = cap.querySelector('#au-linea1');
  const nom = cap.querySelector('#au-nombre');
  const sub = cap.querySelector('#au-sub');
  const barrita = cap.querySelector('#au-barrita');
  const FRASES = [
    'leyendo cómo está hecha esta página',
    'midiendo botones, fotos y menús',
    'pensando qué colores te van',
    'eligiendo la tipografía',
    'armando el diseño de ' + (tema || 'lo tuyo'),
    'acomodando cada elemento'
  ];
  let i = 0, tecleo = null;
  const decir = txt => {
    clearInterval(tecleo);
    l1.textContent = '';
    let k = 0;
    tecleo = setInterval(() => {
      l1.textContent = '> ' + txt.slice(0, ++k);
      if(k >= txt.length) clearInterval(tecleo);
    }, 20);
  };
  decir(FRASES[i++]);
  const ciclo = setInterval(() => decir(FRASES[i++ % FRASES.length]), 2600);

  const fin = { cerrada:false };
  const cerrar = espera => {
    setTimeout(() => cap.classList.add('au-sale'), espera);
    setTimeout(() => { vivo = false; cap.remove(); }, espera + 850);
  };
  fin.listo = d => {
    if(fin.cerrada) return; fin.cerrada = true;
    clearInterval(ciclo); clearInterval(tecleo);
    const s = cap.style;
    s.background = d.fondo;
    s.setProperty('--a', d.acento);
    s.setProperty('--b', d.acento2);
    s.setProperty('--t', d.oscuro ? '#f4f6fb' : '#ffffff');
    s.setProperty('--ft', pila(d.fuente_txt));
    s.setProperty('--fx', pila(d.fuente_tit));
    colores = [d.acento, d.acento2, '#ffffff'];
    sub.textContent = 'tu página quedó así';
    l1.textContent = '> listo';
    nom.textContent = d.titulo || '';
    nom.classList.add('au-ver');
    barrita.classList.add('au-full');
    estallar(120);
    setTimeout(() => estallar(60), 260);
    cerrar(1500);
  };
  fin.fallo = msg => {
    if(fin.cerrada) return; fin.cerrada = true;
    clearInterval(ciclo); clearInterval(tecleo);
    l1.textContent = '> ' + (msg || 'no se pudo hablar con la conexión');
    cerrar(900);
  };
  return fin;
}

/* ============ 7. PEDIRLE EL DISEÑO A LA CONEXION ============
   Con un tope propio: el fetch no trae timeout, asi que si el servidor se
   cuelga la intro se queda tapando la pagina para siempre. */
/* Medido: un re-armado de YouTube tardo 105.7 s y el tope estaba en 100, o
   sea que el cliente cortaba una respuesta que el servidor iba a entregar y
   caia al tema local sin que se notara el motivo. Desde que ademas de los
   colores se le pide CSS, esto tarda mas. El tope del cliente va POR ENCIMA
   del tope del servidor, para que gane el mensaje de error del servidor.

   SUBIDO OTRA VEZ, y esta es la medicion: con un tema que le pide al modelo
   ESCRIBIR una animacion propia (un vivero con polen y hojas girando), tres
   candidatos tardaron 150.1s, 164.8s y uno se paso de los 170s del servidor
   y lo mataron. Escribir un @keyframes cuesta tokens de salida, y el arcade
   -que usa el Tetris ya hecho- salia en 96-104s. El tope viejo cortaba justo
   los disenos mas trabajados. Ahora el servidor corta a los 200s y esto a
   los 215s. Y desde que se piden N candidatos en paralelo, que uno se pase
   ya no tumba el pedido: alcanza con que vuelva otro. */
const TOPE = 215000;

async function pedir(ruta, cuerpo){
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), TOPE);
  try {
    const r = await fetch(AU.SERVIDOR + ruta, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(cuerpo), signal:corte.signal
    });
    if(!r.ok) throw new Error('la conexión no respondió');
    return r.json();
  } catch(e){
    throw new Error(e.name === 'AbortError' ? 'la conexión tardó demasiado' : e.message);
  } finally { clearTimeout(reloj); }
}

/* Lo que se le manda a la conexion para que analice la pagina: nombres y
   titulos, no el texto entero. Con eso le alcanza para entender de que es,
   y el pedido viaja chico. */
function resumen(c){
  return {
    /* la clase va SIEMPRE: el prompt elige con ella que es lo protagonista
       -la columna de lectura o la rejilla-. Se calcula en el extractor y se
       perdia justo aca, asi que a YouTube y a Instagram se les seguia
       pidiendo una columna de lectura que ahi no existe, y el bloque ENFOQUE
       entero era codigo muerto sin dar un solo error. */
    clase: c.clase,
    /* Punto 1 y 2 del contrato. La MEDIDA -no una corazonada- dice si la
       pagina dio poco de donde agarrarse, y eso viaja con el pedido: con
       flaco:true el prompt le abre la mano al modelo para inventar. Se manda
       tambien el POR QUE en numeros, porque una licencia sin motivo es una
       bandera que nadie puede auditar despues. */
    flaco: !!(c.medida && c.medida.flaco === true),
    porQueFlaco: (c.medida && c.medida.porQueFlaco) || '',
    sitio: c.sitio, titulo: c.titulo, lema: c.lema, marca: c.marca,
    menu: c.menu.map(m => m.txt),
    tarjetas: c.tarjetas.map(t => t.titulo),
    titulos: c.bloques.filter(b => b.tipo === 'titulo').map(b => b.txt),
    muestra: c.bloques.filter(b => b.tipo === 'parrafo').slice(0, 2)
                      .map(b => b.txt.slice(0, 240))
  };
}

/* El diseño de la conexion es un EXTRA, nunca un requisito: si no esta el
   servidor, si Claude no responde o si tarda, el tema se arma aca mismo y
   la demostracion no se cae. Mismo criterio que la pagina propia. */
async function disenoDe(tema, titulo, c){
  /* Vestir y re-armar no le preguntan lo mismo a la conexion:
     - VESTIR manda el ESQUELETO (cajas y medidas). El contenido no hace
       falta para elegir colores.
     - RE-ARMAR manda el CONTENIDO, porque la pagina se vuelve a escribir:
       ahi Claude si lee de que habla el sitio y decide como presentarlo. */
  const ruta = c ? '/api/rearmar' : '/api/vestir';
  const cuerpo = c ? { tema, contenido: resumen(c) }
                   : { tema, estructura: estructura() };
  try {
    const res = await pedir(ruta, cuerpo);
    return { d: sanear(res.diseno), fuente: 'conexión' };
  } catch(e){
    console.warn('[API UNIVERSAL] sin conexión (' + e.message + '), tema local');
    return { d: sanear(AU_TEMA_LOCAL(tema, titulo)), fuente: 'local', motivo: e.message };
  }
}

function aviso(txt, ms){
  let a = document.getElementById('au-aviso');
  if(!a){ a = document.createElement('div'); a.id = 'au-aviso'; document.body.appendChild(a); }
  a.textContent = txt;
  if(ms) setTimeout(() => a.remove(), ms);
  return a;
}

/* ---------- cuando el diseño no lo hizo la conexion ----------
   Esto se avisaba con un cartel de 6 segundos y se perdia: el servidor se
   habia caido, el diseño salio del generador local -gris, Segoe UI- y la
   persona creia que ASI diseñaba Claude. Un cartel que se va solo no sirve
   para eso. Este se queda hasta que lo cierres, dice el motivo, y trae el
   boton para volver a pedirlo cuando el servidor este de nuevo arriba. */
function avisoLocal(motivo, tema, rearmando){
  const a = aviso('');
  a.textContent = '';
  const t = document.createElement('div');
  t.textContent = 'Este diseño lo armé yo, sin la conexión: ' + motivo + '.';
  const p = document.createElement('div');
  p.textContent = 'Levantá el servidor (INICIAR.bat) y volvé a pedirlo.';
  p.style.cssText = 'font-weight:400;opacity:.75;margin-top:4px';
  const fila = document.createElement('div');
  fila.style.cssText = 'display:flex;gap:8px;margin-top:10px';
  const re = document.createElement('button');
  re.textContent = 'Reintentar';
  re.style.cssText = 'flex:1;padding:7px 10px;border:0;border-radius:8px;cursor:pointer;' +
                     'background:#5b6cff;color:#fff;font:600 12px "Segoe UI",system-ui,sans-serif';
  re.onclick = () => {
    re.disabled = true;
    re.textContent = 'Pidiendo…';
    reintentar(tema, rearmando, a);
  };
  const no = document.createElement('button');
  no.textContent = 'Así está bien';
  no.style.cssText = 'padding:7px 10px;border:1px solid rgba(18,23,31,.18);border-radius:8px;' +
                     'cursor:pointer;background:transparent;color:#5b6272;' +
                     'font:600 12px "Segoe UI",system-ui,sans-serif';
  no.onclick = () => a.remove();
  fila.append(re, no);
  a.append(t, p, fila);
}

function reintentar(tema, rearmando, cartel){
  const leido = rearmando ? AU_LEER() : null;
  disenoDe(tema, leido ? leido.titulo : tema, leido).then(({ d, fuente, motivo }) => {
    if(fuente !== 'conexión'){
      cartel.querySelector('button').disabled = false;
      cartel.querySelector('button').textContent = 'Reintentar';
      const p = cartel.children[1];
      if(p) p.textContent = 'Sigue sin responder: ' + motivo + '.';
      return;
    }
    cartel.remove();
    AU.guardado = { tema, d };
    guardarSitio({ activo:true, modo: rearmando ? 'rearmado' : 'vestido', guardado: AU.guardado });
    if(rearmando) rearmar(d, leido); else vestir(d);
  }).catch(() => {
    cartel.querySelector('button').disabled = false;
    cartel.querySelector('button').textContent = 'Reintentar';
  });
}

/* ---------- volver a leer cuando el sitio termina de dibujar ----------
   Al llegar a una pagina, el content script corre en document_idle y una
   app todavia no dibujo nada: se re-armaba con lo poco que habia. Ahora que
   los enlaces van en la MISMA pestaña, este es el camino normal, no el raro.

   No es un temporizador fijo: se vuelve a leer varias veces y solo se
   re-arma si de verdad hay MAS que antes. Si el sitio ya estaba completo,
   la primera lectura gana y no se dibuja de nuevo. */
function cuanto(m){
  return (m.tarjetas || 0) * 3 + (m.parrafos || 0) + (m.imagenes || 0) + (m.medios || 0) * 4;
}

let _relecturas = null;
function releerCuandoAsiente(){
  cortarRelecturas();
  const esperas = [700, 1800, 3600, 6000];
  _relecturas = esperas.map(ms => setTimeout(() => {
    if(!AU.puesto || AU.modo !== 'rearmado' || !AU.guardado) return;
    /* asomados NO. Re-armar aca borra el host escondido y monta uno visible:
       la capa vuelve a taparlo todo y callarElSitio pausa el video, a los
       1.8 / 3.6 / 6 s, sin que la persona haya tocado nada. */
    if(AU.asomado) return;
    let nuevo;
    try { nuevo = AU_LEER(); } catch(e){ return; }
    const antes = AU.contenido ? cuanto(AU.contenido.medida) : -1;
    if(cuanto(nuevo.medida) <= antes) return;
    AU.contenido = nuevo;
    AU_ARMAR(nuevo, AU.guardado.d, quitar);
  }, ms));
}
function cortarRelecturas(){
  if(_relecturas) _relecturas.forEach(clearTimeout);
  _relecturas = null;
}

/* el sitio redibuja al navegar y se lleva lo nuestro: hay que reponerlo */
function vigilar(){
  if(AU.observador) return;
  let t = null;
  let direccion = location.href;
  AU.observador = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      if(!AU.guardado || !AU.puesto) return;
      /* asomados no se repone ni se re-arma nada: la persona esta mirando el
         sitio de abajo a proposito. Si de paso el sitio navego solo, se
         anota la direccion nueva y listo, para no re-armar despues por una
         diferencia vieja. */
      if(AU.asomado){ direccion = location.href; return; }
      /* Una app cambia de pagina SIN recargar: en YouTube, tocar un video
         cambia la direccion y el contenido, y el arranque no vuelve a
         correr. Sin esto, la pagina armada se quedaba mostrando el video
         anterior para siempre. */
      if(location.href !== direccion){
        direccion = location.href;
        if(AU.modo === 'rearmado'){
          AU.contenido = null;
          try { rearmar(AU.guardado.d, AU_LEER()); } catch(e){}
          releerCuandoAsiente();
          return;
        }
      }
      if(AU.modo === 'rearmado'){
        /* nuestro contenedor cuelga de <html>, asi que el sitio no se lo
           lleva por delante y no hay nada mas que reponer.
           ACA HABIA UN CANDADO: se le ponia overflow:hidden !important al
           <html> del sitio en CADA mutacion. Eso es justo lo que la regla 1
           de rearmar.js prohibe -congela el documento de abajo y una lista
           virtualizada deja de renderizar, asi que "Cargar mas" no puede
           funcionar-, y ademas peleaba contra un vigilante del otro archivo
           por una propiedad que tambien usa el sitio: le borrabamos su
           candado al abrir un modal, o se lo re-aplicabamos al salir. El
           scroll de nuestra pagina se contiene con overscroll-behavior en
           .marco, que no le escribe nada al sitio. */
        if(!document.getElementById('au-pagina')) AU_ARMAR(AU.contenido, AU.guardado.d, quitar);
        return;
      }
      if(!document.getElementById('au-boton')) vestir(AU.guardado.d);
      else clasificar();
    }, 400);
  });
  AU.observador.observe(document.documentElement, { childList:true, subtree:true });
}

/* ============ 7b. LLEVAR EL DISEÑO AL OTRO LADO DEL ENLACE ============

   LA MEMORIA SIGUE SIENDO POR SITIO, y eso no se toca: un tema puesto en
   Instagram no puede aparecer solo en cualquier web que la persona abra
   despues. Lo que faltaba es la otra mitad: cuando el clic sale de NUESTRA
   pagina armada, la persona esta pidiendo seguir dentro del diseño, y el
   destino arrancaba limpio porque su origen nunca tuvo nada guardado.

   Asi que no se guarda "aplicalo en todos lados" -esa bandera global ya
   existio y era justo el problema-, se guarda UN VIAJE: dura un minuto y se
   consume al llegar. Si la persona tarda, o abre otra cosa, no queda nada.

   EL ORDEN ES EL ARREGLO: chrome.storage.local.set es ASINCRONO. Si se
   navega antes de que termine, esta pagina se muere con la escritura a
   medias y el destino arranca sin diseño, que es el mismo sintoma que se
   viene a curar. Se navega DENTRO del callback. */
const LLAVE_VIAJE = 'viaje';
const VIAJE_VIVE = 60000;   // un minuto: alcanza para cargar, no para olvidarse

/* ---------- la memoria por sitio no se puede acumular para siempre ----------
   Cada origen por el que se paso deja una entrada `sitio:<origen>` con el
   diseño ENTERO adentro -incluido el css que escribe el modelo, que son
   varios KB- y NADA la borraba nunca. El manifest no pide unlimitedStorage,
   asi que eso corre contra la cuota de chrome.storage.local, y el dia que un
   set falle el error se pierde. Se poda por fecha de ultimo uso.

   La fecha va en su propia llave y no dentro de la entrada: chrome.storage no
   sabe actualizar un campo suelto, asi que refrescarla adentro obligaria a
   re-escribir el diseño completo en cada carga de cada pagina. */
const LLAVE_VISTOS = 'vistos';
const LLAVE_PODA = 'podado';
const SITIO_VIVE = 30 * 24 * 60 * 60 * 1000;   // un mes sin volver: se olvida
const UN_DIA = 24 * 60 * 60 * 1000;

function marcarVisto(){
  try {
    chrome.storage.local.get([LLAVE_VISTOS], v => {
      void chrome.runtime.lastError;
      const m = Object.assign({}, (v && v[LLAVE_VISTOS]) || {});
      m[location.origin] = Date.now();
      chrome.storage.local.set({ [LLAVE_VISTOS]: m });
    });
  } catch(e){}
}

/* TODA escritura de la memoria del sitio pasa por aca: asi la fecha de ultimo
   uso no depende de que alguien se acuerde de ponerla, y el error de cuota
   deja de tragarse en silencio -antes el set ni callback tenia-. */
function guardarSitio(reg){
  try {
    chrome.storage.local.set({ [LLAVE]: reg }, () => {
      const e = chrome.runtime.lastError;
      if(e) console.warn('[API UNIVERSAL] no pude guardar el diseño de este sitio: ' + e.message);
    });
  } catch(e){ return; }
  marcarVisto();
}

function podar(){
  try {
    chrome.storage.local.get(null, todo => {
      void chrome.runtime.lastError;
      if(!todo) return;
      const ahora = Date.now();
      /* esto corre en CADA documento de CADA pestaña: una vez al dia basta */
      if(todo[LLAVE_PODA] && ahora - todo[LLAVE_PODA] < UN_DIA) return;
      const vistos = Object.assign({}, todo[LLAVE_VISTOS] || {});
      const fuera = [];
      Object.keys(todo).forEach(k => {
        if(k.indexOf('sitio:') !== 0) return;
        const origen = k.slice(6);
        /* una entrada escrita antes de que existiera esta cuenta no se borra
           de golpe: se le arranca el reloj ahora y se olvida sola si de
           verdad nadie vuelve. Borrar por "no tiene fecha" seria tirarle el
           diseño a alguien que lo esta usando hoy. */
        if(!vistos[origen]){ vistos[origen] = ahora; return; }
        if(ahora - vistos[origen] > SITIO_VIVE){ fuera.push(k); delete vistos[origen]; }
      });
      /* fechas de origenes que ya no tienen entrada: basura de la basura */
      Object.keys(vistos).forEach(o => {
        if(!todo['sitio:' + o] && ahora - vistos[o] > SITIO_VIVE) delete vistos[o];
      });
      chrome.storage.local.set({ [LLAVE_PODA]: ahora, [LLAVE_VISTOS]: vistos });
      if(fuera.length) chrome.storage.local.remove(fuera);
    });
  } catch(e){}
}

/* EL ESTILO VIAJA; EL TEXTO NO.
   La conexion devuelve dos cosas mezcladas en el mismo objeto: como se ve la
   pagina (colores, tipografias, CSS) y que dice (el titulo, el lema, y en una
   pagina flaca sus secciones y tarjetas escritas). Lo segundo habla del sitio
   de donde salio el clic. Pegado en OTRO sitio deja de ser una propuesta
   sobre una pagina vacia y pasa a ser una afirmacion falsa sobre una pagina
   real: el titular inventado de un blog encabezando un diario.

   Asi que se copian SOLO los campos de estilo, que son los que lee
   ponerTema() aca al lado, mas el CSS. SI PONERTEMA EMPIEZA A LEER UN CAMPO
   NUEVO, TIENE QUE ENTRAR EN ESTA LISTA: si se olvida, ese campo no cruza y
   el destino queda un poco menos vestido, que es el lado barato del error. */
const SOLO_ESTILO = ['acento', 'acento2', 'fondo', 'oscuro', 'radio', 'fuente_tit',
                     'fuente_txt', 'mayus', 'duro', 'iconos', 'css', 'local'];
function estiloSolo(d){
  const s = {};
  SOLO_ESTILO.forEach(k => { if(d[k] !== undefined) s[k] = d[k]; });
  return s;
}

function AU_LLEVAR(href){
  /* el destino se valida aca tambien: este es el unico punto del programa
     que escribe location.href, y un "javascript:" leido del sitio no puede
     entrar por aca ni aunque el enlace se haya armado mal */
  let destino = '', hacia = '';
  try {
    const u = new URL(String(href == null ? '' : href), location.href);
    if(u.protocol === 'http:' || u.protocol === 'https:'){ destino = u.href; hacia = u.origin; }
  } catch(e){}
  if(!destino) return;

  let ido = false;
  const irse = () => { if(ido) return; ido = true; location.href = destino; };

  /* sin diseño puesto no hay nada que llevar: el enlace es un enlace normal */
  if(!AU.puesto || !AU.guardado || !AU.guardado.d){ irse(); return; }

  const viaje = {
    hasta: Date.now() + VIAJE_VIVE,
    /* A DONDE IBA, que es lo que faltaba y por eso esto era peligroso.
       chrome.storage.local es GLOBAL a todas las pestañas: sin destino, el
       viaje se lo quedaba el primer documento que terminara de cargar en
       cualquier lado dentro del minuto. Se pulsaba un enlace a un .pdf -que
       ni siquiera ejecuta este script-, cuarenta segundos despues la persona
       abria su banco a mano y el banco salia vestido con el tema de
       Instagram, y guardado ahi PARA SIEMPRE. Es exactamente lo que la
       memoria por sitio existe para que no pase. */
    a: hacia,
    /* DE DONDE SALIO, que es lo que deja pasar a un redirector. l.instagram
       .com y t.co contestan 302, asi que ahi no carga ningun documento y el
       que si carga es el del destino final, cuyo origen NO es el que quedo
       escrito en `a`. Lo que sobrevive al 302 es el Referer, y apunta a la
       pagina donde se hizo el clic. Si el sitio manda no-referrer no llega
       nada y el viaje no se aplica, que es el lado barato del error. */
    desde: location.origin,
    modo: AU.modo || 'rearmado',
    /* el tema si viaja: es lo que la persona PIDIO ("de barro antiguo"), no
       algo que este sitio dijo de si mismo */
    guardado: { tema: AU.guardado.tema, d: estiloSolo(AU.guardado.d) }
  };
  try {
    chrome.storage.local.set({ [LLAVE_VIAJE]: viaje }, () => {
      /* se lee lastError para no dejar el error suelto en la consola; se
         navega igual: quedarse sin diseño es mucho menos malo que no ir a
         donde llevaba el enlace */
      void chrome.runtime.lastError;
      irse();
    });
  } catch(e){ irse(); }
  /* Respaldo para UN solo caso: que el callback no llegue NUNCA porque la
     extension se recargo entre la llamada y la respuesta (con el contexto ya
     invalidado, el set de arriba tira y lo agarra el catch). Estaba en 900 ms
     y corria siempre, asi que un perfil con el almacenamiento cargado podia
     navegar con la escritura en vuelo, que es el sintoma que esto viene a
     curar. Tres segundos: el callback normal llega en milisegundos, y si de
     verdad no va a llegar, tres segundos es lo que cuesta no perder el clic. */
  setTimeout(irse, 3000);
}

/* ---------- ¿este viaje es para MI? ----------
   Las dos maneras de que si dicen algo del destino. Ninguna es "fui el
   primero en cargar", que era la de antes. */
function origenDe(u){ try { return new URL(String(u || '')).origin; } catch(e){ return ''; } }
function viajeMio(t){
  if(!t || typeof t !== 'object') return false;
  if(t.a && t.a === location.origin) return true;
  /* el rodeo del redirector: me mando la misma pagina que escribio el viaje */
  return !!t.desde && t.desde !== location.origin &&
         origenDe(document.referrer) === t.desde;
}

/* ---------- tomarlo sin que dos lo tomen ----------
   get y remove son dos operaciones asincronas y entre las dos no habia
   cerrojo: dos documentos que estuvieran ahi al mismo tiempo se llevaban los
   dos el MISMO viaje, los dos lo borraban y los dos se guardaban el diseño
   para siempre. Se marca primero quien lo toma y se vuelve a leer: la cola de
   chrome.storage serializa las escrituras, asi que el ultimo en escribir es
   el unico que se encuentra a si mismo en la relectura. */
const YO = Math.random().toString(36).slice(2) + Date.now().toString(36);
function tomarViaje(t, alGanar){
  chrome.storage.local.set({ [LLAVE_VIAJE]: Object.assign({}, t, { tomadoPor: YO }) }, () => {
    void chrome.runtime.lastError;
    chrome.storage.local.get([LLAVE_VIAJE], v2 => {
      void chrome.runtime.lastError;
      const t2 = v2 && v2[LLAVE_VIAJE];
      if(!t2 || t2.tomadoPor !== YO) return;      // gano otro documento
      chrome.storage.local.remove(LLAVE_VIAJE);
      alGanar();
    });
  });
}

/* ============ 8. ORDENES DEL POPUP ============ */
chrome.runtime.onMessage.addListener((msg, _o, responder) => {
  if(msg.tipo === 'estado'){
    responder({ puesto: AU.puesto, modo: AU.modo, tema: AU.guardado?.tema || '',
                sugerido: sugerirTema() });
    return true;
  }
  if(msg.tipo === 'quitar'){ quitar(); responder({ ok:true }); return true; }

  if(msg.tipo === 'vestir' || msg.tipo === 'rearmar'){
    const rearmando = msg.tipo === 'rearmar';
    /* En re-armado el tema puede salir de la propia pagina: no hace falta
       que la persona escriba nada para que funcione. */
    let tema = (msg.tema || '').trim();
    let titulo = tema;
    let leido = null;
    if(rearmando){
      leido = AU_LEER();
      titulo = leido.titulo;
      if(!tema) tema = AU_TEMA(leido);
    }
    const pantalla = intro(titulo || tema);

    disenoDe(tema, titulo, leido).then(({ d, fuente, motivo }) => {
      /* PARA QUE PAGINA SE ESCRIBIO ESTO. El diseño se guarda bajo
         sitio:<origen> y se vuelve a aplicar en CUALQUIER pagina de ese
         origen, pero la bienvenida, el aviso y las secciones y tarjetas
         escritas se escribieron mirando UNA pagina. Es el mismo argumento que
         ya esta escrito arriba para el salto entre sitios: pegadas en otra
         pagina real dejan de ser una propuesta y pasan a ser una afirmacion
         falsa. El armador compara esto con la direccion de ahora.
         No entra en SOLO_ESTILO a proposito: al otro sitio ya no cruza. */
      if(rearmando && d) d.para = location.href;
      AU.guardado = { tema, d };
      AU.contenido = leido;
      AU.asomado = false;
      guardarSitio({ activo:true, modo:msg.tipo === 'rearmar' ? 'rearmado' : 'vestido',
                     guardado:AU.guardado });
      pantalla.listo(d);
      setTimeout(() => {
        /* de re-armado a vestido hay que DESARMAR primero: si no, #au-pagina
           se queda colgado de <html> tapando la pagina que se acaba de
           vestir, y con el los ganchos que dejo AU_ARMAR -el que pausa todo
           video que arranque en el sitio-. Se veia asi: en YouTube, tras
           "Solo cambiarle el diseño", ningun video volvia a reproducirse. */
        if(!rearmando && AU.modo === 'rearmado') AU_DESARMAR();
        if(rearmando){ rearmar(d, leido); releerCuandoAsiente(); } else vestir(d);
        vigilar();
        if(fuente === 'local') avisoLocal(motivo, tema, rearmando);
      }, 900);
      responder({ ok:true, titulo:d.titulo, fuente,
                  medida: leido ? leido.medida : null });
    }).catch(e => {
      pantalla.fallo(e.message);
      aviso('No pude armar la página: ' + e.message, 8000);
      responder({ ok:false, error:e.message });
    });
    return true;
  }
});

/* lo que la pagina dice ser, para que el popup lo ofrezca ya escrito */
function sugerirTema(){
  try { return AU_TEMA(AU_LEER()).slice(0, 90); } catch(e){ return ''; }
}

/* ============ 9. AL ABRIR LA PAGINA ============ */
function arrancar(g){
  AU.guardado = g.guardado;
  AU.asomado = false;
  if(g.modo === 'rearmado'){ rearmar(g.guardado.d); releerCuandoAsiente(); }
  else { vestir(g.guardado.d); }
  vigilar();
}

/* La limpieza corre en CUALQUIER documento, no solo en los HTML. El viaje se
   consumia unicamente dentro del if de text/html, asi que un .pdf, un .zip
   con Content-Disposition, una URL que contesta 204 o una navegacion que la
   persona cancela lo dejaban vivo, con su minuto corriendo y con el css
   entero del modelo adentro, esperando a la proxima pagina cualquiera. */
podar();

chrome.storage.local.get([LLAVE, LLAVE_VIAJE], v => {
  void chrome.runtime.lastError;
  const t = v[LLAVE_VIAJE];
  /* vencido: se barre aca, se lo cruce el documento que se lo cruce */
  if(t && !(Date.now() < t.hasta)) chrome.storage.local.remove(LLAVE_VIAJE);

  /* Solo en documentos HTML: con la extension corriendo en cualquier URL,
     esto tambien se ejecuta sobre un XML o un texto plano servido por el
     sitio, y ahi no hay pagina que vestir. */
  if(document.contentType !== 'text/html') return;

  const g = v[LLAVE];
  if(g && g.activo && g.guardado && g.guardado.d){ marcarVisto(); arrancar(g); return; }

  /* UN "NO" EXPLICITO NO LO PISA UN VIAJE. quitar() escribe {activo:false},
     que es como queda registrado que la persona dijo QUITALO AQUI, y esto
     caia igual al bloque de abajo: el sitio del que se acababa de quitar el
     diseño volvia a salir vestido apenas llegaba un viaje. Se consume igual
     si venia para aca, para que no siga suelto. */
  const dijoQueNo = !!(g && g.activo === false);

  /* Este origen no tiene nada suyo, pero puede que hayamos llegado siguiendo
     un enlace de nuestra propia pagina: ver 7b. */
  if(!t || !(Date.now() < t.hasta)) return;      // vencido, o sin fecha
  /* NO ERA PARA ACA: ni se toca. Consumirlo seria robarselo al destino de
     verdad, que puede estar cargando en otra pestaña ahora mismo. */
  if(!viajeMio(t)) return;
  if(!t.guardado || !t.guardado.d){ chrome.storage.local.remove(LLAVE_VIAJE); return; }

  tomarViaje(t, () => {
    if(dijoQueNo) return;
    const llegado = { activo:true, modo:t.modo, guardado:t.guardado };
    /* se guarda YA para este origen, ANTES de dibujar: el viaje acaba de
       borrarse, asi que si no se guardara aca una simple recarga -o el
       propio sitio navegando solo- dejaria la pagina pelada otra vez */
    guardarSitio(llegado);
    arrancar(llegado);
  });
});
