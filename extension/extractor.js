/* EL EXTRACTOR de API UNIVERSAL.

   Lee el CONTENIDO de cualquier pagina y lo devuelve en piezas: titulo,
   portada, secciones, tarjetas, menu. Con eso el armador levanta HTML
   nuestro. La pagina original no se toca nunca: se lee y se deja igual.

   POR QUE UN EXTRACTOR Y NO EDITAR EL HTML DEL SITIO:
   si el sitio redibuja (React: Instagram, casi cualquier app moderna) se
   lleva por delante lo que le hayas editado. Lo que se LEE, en cambio, ya
   es nuestro. Y leer no rompe nada: si el extractor se equivoca, la pagina
   sigue entera abajo.

   Se prueba en tres formas de pagina que no se parecen en nada: una
   enciclopedia (Wikipedia), un sitio de producto (huellagames.com) y una
   app que redibuja (Instagram). */

/* ---------- lo que no es contenido ---------- */
const FUERA = 'script,style,noscript,template,svg,iframe,form,button,input,select,' +
              'textarea,nav,header,footer,aside,[role="navigation"],[role="banner"],' +
              '[role="contentinfo"],[role="complementary"],[aria-hidden="true"],' +
              '[hidden],.mw-editsection,.reference,.navbox,.sidebar,.infobox,' +
              '.mw-jump-link,.toc,#toc,.hatnote,.metadata,.noprint,[id^="au-"]';

const RUIDO = /^(cookies?|aceptar|acepto|inici\w* ses|log ?in|sign ?in|sign ?up|registr|reg[ií]strate|suscr[ií]b|newsletter|men[uú]$|buscar|search|skip to|ir al contenido|compartir|comentar|publicidad|advertis|todos los derechos)/i;

function visible(e){
  if(!e || !e.getBoundingClientRect) return false;
  const cs = getComputedStyle(e);
  if(cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

const limpio = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();

/* innerText y no textContent: textContent pega los renglones sin espacio
   -el h1 de huellagames salia "Entra a Mundos.Descubre junto a los demas."-
   y ademas devuelve el texto que el sitio tiene escondido. */
const texto = e => limpio(e.innerText != null ? e.innerText : e.textContent);

function absoluta(u){ try { return new URL(u, location.href).href; } catch(e){ return u; } }

const dormir = ms => new Promise(r => setTimeout(r, ms));

/* subir un nivel cruzando el borde de un shadow root: dentro de una app
   moderna el padre de un nodo puede no existir en el arbol de luz, y ahi es
   donde vive la celda que buscamos */
function padreDe(e){
  if(!e) return null;
  if(e.parentElement) return e.parentElement;
  const r = e.getRootNode && e.getRootNode();
  return (r && r.host) || null;
}

/* ---------- 0. DE QUE FAMILIA ES UN HOST ----------
   Medido en instagram.com: un <iframe src="youtube-nocookie.com/embed/ID">
   dentro de un shadow root SI dispara el evento load y aun asi lo que se ve
   es el icono de documento roto; lo corta la CSP del sitio, no nosotros.
   Por eso 'mismoSitio' no significa "mismo dominio exacto" sino "se puede
   prometer que va a incrustar": el medio y la pagina son la misma familia.
   Cuando no lo son, el armador tiene que dar miniatura + enlace al original
   y nunca un marco que se va a ver roto. */
const ALIAS_HOST = {
  'youtube.com':'youtube', 'youtu.be':'youtube', 'youtube-nocookie.com':'youtube',
  'ytimg.com':'youtube', 'googlevideo.com':'youtube',
  'cdninstagram.com':'instagram', 'fbcdn.net':'facebook', 'vimeocdn.com':'vimeo'
};
/* co.uk, com.gt: ahi el nombre del sitio esta una etiqueta mas atras */
const SUFIJO_COMPUESTO = /^(com|co|net|org|edu|gov|gob|ac|or|ne|in)\.[a-z]{2,3}$/;

function familia(host){
  const h = String(host || '').toLowerCase().replace(/^(www|m|mobile|music|player|embed|i)\./, '');
  if(ALIAS_HOST[h]) return ALIAS_HOST[h];
  const p = h.split('.');
  if(p.length < 2) return h;
  const base = SUFIJO_COMPUESTO.test(p.slice(-2).join('.')) ? p.slice(-3) : p.slice(-2);
  return ALIAS_HOST[base.join('.')] || base[0];
}

function mismoSitio(u){
  try { return familia(new URL(u, location.href).hostname) === familia(location.hostname); }
  catch(e){ return false; }
}

/* ---------- 1. DONDE ESTA EL CONTENIDO ----------
   Puntua contenedores por cuanto texto de verdad tienen, castigando al que
   es casi puro enlace: eso es un menu o un "te puede interesar", no lectura.
   Es el criterio del modo lectura de un navegador, en corto. */
function raizDelContenido(){
  const cand = [...document.querySelectorAll(
    'main,article,[role="main"],#content,#mw-content-text,.mw-parser-output,' +
    '#main,.content,.post,.entry-content,.article-body,body')].filter(visible);
  let mejor = document.body, puntos = -1;
  for(const e of cand){
    const parrafos = [...e.querySelectorAll('p,li')].filter(visible);
    /* aqui se cuenta LARGO, no se lee: textContent alcanza y es mas barato
       que innerText, que fuerza calculo de posiciones en cada nodo */
    const largo = parrafos.reduce((a, p) => a + limpio(p.textContent).length, 0);
    if(largo < 40) continue;
    const enlazado = [...e.querySelectorAll('a')].reduce((a, x) => a + limpio(x.textContent).length, 0);
    const densidad = enlazado / Math.max(largo, 1);
    const p = largo * (densidad > 0.5 ? 0.25 : 1);
    if(p > puntos){ puntos = p; mejor = e; }
  }
  return mejor;
}

/* ---------- 2. LA IDENTIDAD ---------- */
function meta(nombre){
  const e = document.querySelector('meta[property="' + nombre + '"],meta[name="' + nombre + '"]');
  return e ? limpio(e.getAttribute('content')) : '';
}

function identidad(){
  const h1 = [...document.querySelectorAll('h1')].filter(visible)
              .map(e => texto(e)).filter(t => t.length > 1)[0] || '';
  const titulo = h1 || meta('og:title') ||
                 limpio(document.title).split(/[|–—·]/)[0].trim() ||
                 location.hostname;
  const lema = meta('og:description') || meta('description') || '';
  const marca = meta('og:site_name') ||
                location.hostname.replace(/^www\./, '').replace(/\.[a-z.]+$/, '');
  return { titulo, lema, marca };
}

/* ---------- 3. LA PORTADA ----------
   og:image primero: es la imagen que el propio sitio eligio para
   representarse. Si no hay, la mas grande de la parte de arriba. */
function portada(){
  const og = meta('og:image');
  if(og) return { src: absoluta(og), alt: '' };
  let mejor = null, area = 0;
  for(const im of document.images){
    if(!visible(im) || im.closest('[id^="au-"]')) continue;
    const r = im.getBoundingClientRect();
    if(r.top + scrollY > 2200) continue;
    const a = r.width * r.height;
    if(a > area && r.width >= 200 && r.height >= 120){ area = a; mejor = im; }
  }
  return mejor ? { src: mejor.currentSrc || mejor.src, alt: limpio(mejor.alt) } : null;
}

/* ---------- 3b. LOS MEDIOS ----------
   Sin esto, re-armar YouTube daba una foto muerta: el video seguia sonando
   DEBAJO de nuestra pagina (medido: pausado:false, segundo 7.7) y la
   miniatura del hero no llevaba a ningun lado al clicarla.

   Un <video> con blob: NO se puede reusar: esa fuente esta atada por
   MediaSource al elemento original y no se deja adoptar por otro. Por eso
   YouTube se resuelve por su id, con el reproductor incrustado. */
function idYoutube(u){
  try {
    const x = new URL(u, location.href);
    const h = x.hostname.replace(/^(www|m|music)\./, '');
    if(h === 'youtu.be') return x.pathname.slice(1).split('/')[0] || null;
    if(h === 'youtube.com' || h === 'youtube-nocookie.com'){
      if(x.pathname === '/watch') return x.searchParams.get('v');
      const m = x.pathname.match(/^\/(embed|shorts|v|live)\/([\w-]{6,})/);
      if(m) return m[2];
    }
  } catch(e){}
  return null;
}

function medios(){
  const salida = [], vistos = new Set();
  const pon = m => {
    /* el poster entra en la clave porque un video con blob: viaja SIN src
       (ver abajo): sin el, dos videos distintos se pisarian entre si */
    const k = m.tipo + ':' + (m.id || m.src || m.poster || '');
    if(vistos.has(k)) return;
    vistos.add(k);
    salida.push(m);
  };

  /* estando en youtube.com el propio dominio ya se sirve el reproductor, asi
     que ahi si vale pedirle la miniatura a i.ytimg. Fuera de casa NO se
     inventa una miniatura de otro host: la img-src del sitio la puede cortar
     igual que al iframe y quedaria una foto rota. */
  const casaYoutube = mismoSitio('https://www.youtube.com/');
  const miniYT = id => (casaYoutube ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : null);

  /* la propia direccion: si estas parado en un video, la pagina ES el video */
  const propio = idYoutube(location.href);
  if(propio) pon({ tipo:'youtube', id:propio, poster: miniYT(propio), mismoSitio: casaYoutube });

  for(const f of document.querySelectorAll('iframe[src]')){
    if(!visible(f) || f.closest('[id^="au-"]')) continue;
    const id = idYoutube(f.src);
    if(id){ pon({ tipo:'youtube', id, poster: miniYT(id), mismoSitio: casaYoutube }); continue; }
    if(/(vimeo|dailymotion|twitch|player|soundcloud|spotify)\./.test(f.src)){
      pon({ tipo:'iframe', src: absoluta(f.src), poster: null, mismoSitio: mismoSitio(f.src) });
    }
  }

  for(const v of document.querySelectorAll('video')){
    if(!visible(v) || v.closest('[id^="au-"]')) continue;
    const fuente = v.currentSrc || v.getAttribute('src') ||
                   (v.querySelector('source[src]') || {}).src || '';
    if(!fuente) continue;
    /* UN blob: NO SE DESCARTA, SE MANDA SIN src.
       Esa fuente esta atada por MediaSource al elemento original y no se
       deja adoptar, asi que no se puede incrustar. Pero tirar el medio
       entero era peor: el armador tapa y pausa el video del sitio igual, y
       si aca no llega nada la persona se queda SIN NINGUN camino al video
       (Instagram y casi cualquier app moderna sirven asi). Sin src, el
       armador cae solo al ramo de miniatura + "ver en el sitio original",
       que es la regla acordada. */
    const esBlob = fuente.startsWith('blob:');
    pon({ tipo:'video', src: esBlob ? null : absoluta(fuente), poster: v.poster || null,
          mismoSitio: esBlob ? false : mismoSitio(fuente) });
  }
  return salida.slice(0, 4);
}

/* ---------- 3c. EL VIDEO DE UNA TARJETA ----------
   Una miniatura que al clicarla no reproduce nada es una foto muerta: la
   queja de YouTube re-armado. Si el enlace de la celda apunta a un video, la
   tarjeta se lo lleva puesto para que el armador decida -incrustar si es de
   casa, miniatura + enlace si no- sin tener que volver a mirar el DOM. */
function videoDeCelda(h, href){
  const urls = [];
  if(href) urls.push(href);
  if(h){
    if(h.matches && h.matches('a[href]')) urls.push(h.href);
    for(const a of h.querySelectorAll('a[href]')) urls.push(a.href);
  }
  for(const u of urls){
    const id = idYoutube(u);
    if(id) return { tipo:'youtube', id, mismoSitio: mismoSitio('https://www.youtube.com/') };
  }
  const v = h && h.querySelector('video');
  let sinFuente = null;
  if(v){
    const f = v.currentSrc || v.getAttribute('src') || '';
    if(f && !f.startsWith('blob:')){
      return { tipo:'video', src: absoluta(f), poster: v.poster || null, mismoSitio: mismoSitio(f) };
    }
    /* blob: no se puede adoptar -esa fuente esta atada por MediaSource al
       elemento original- pero tampoco se borra: se guarda por si nada mejor
       aparece y viaja SIN src, para que el armador lo resuelva con miniatura
       + enlace al original. Ver el comentario largo en medios(). */
    if(f) sinFuente = { tipo:'video', src:null, poster: v.poster || null, mismoSitio:false };
  }
  for(const u of urls){
    if(/\.(mp4|webm|ogv|m3u8)(\?|#|$)/i.test(u)){
      return { tipo:'video', src: absoluta(u), poster:null, mismoSitio: mismoSitio(u) };
    }
  }
  return sinFuente;
}

/* ---------- 4. EL MENU ----------
   El logo repetido no es un elemento del menu, y la comparacion literal no
   alcanzaba para descartarlo: la marca sale del dominio ("huellagames") y
   el enlace del logo dice "Huella Games". Un espacio de diferencia y el
   nombre del sitio entraba como primer boton de su propio menu. Se comparan
   sin espacios, guiones ni acentos, que es lo unico que suele cambiar. */
function pelado(t){
  return String(t || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

function menu(marca){
  const marcaBaja = pelado(marca);
  const zonas = [...document.querySelectorAll('nav,header,[role="navigation"]')].filter(visible);
  const vistos = new Set(), salida = [];
  for(const z of zonas){
    for(const a of z.querySelectorAll('a[href]')){
      if(!visible(a)) continue;
      const t = texto(a);
      if(t.length < 2 || t.length > 24 || RUIDO.test(t)) continue;
      if(pelado(t) === marcaBaja) continue;   // el logo repetido no es menu
      const k = t.toLowerCase();
      if(vistos.has(k)) continue;
      vistos.add(k);
      salida.push({ txt: t, href: absoluta(a.getAttribute('href')) });
      if(salida.length >= 8) return salida;
    }
  }
  return salida;
}

/* ---------- 5. LAS TARJETAS ----------
   Lo repetido de una pagina: los juegos de un catalogo, las notas de un
   blog, los productos de una tienda. Se detecta por FORMA -un padre con 3
   o mas hijos parecidos entre si- y no por clase: buscar ".card" o
   ".producto" solo funciona en el sitio para el que se escribio. */
/* `recogidas`, si viene, se llena con el NODO de cada celda que se
   convirtio en tarjeta. Lo necesita cuerpo() para no volver a escribir mas
   abajo lo que ya salio arriba en la rejilla: ver el comentario largo en
   AU_LEER. */
function tarjetas(raiz, recogidas){
  const padres = new Map();
  /* se siembra desde los enlaces Y desde las fotos. Solo desde los enlaces,
     una rejilla de tarjetas que no linkean a ningun lado -una galeria, un
     catalogo que abre en modal- era invisible: medido en el banco de
     pruebas, que tiene 3 tarjetas con foto y titulo y ni un href. */
  const semillas = [...raiz.querySelectorAll('a[href]')];
  for(const im of raiz.querySelectorAll('img')){
    const r = im.getBoundingClientRect();
    if(r.width >= 88 && r.height >= 50) semillas.push(im);
  }
  for(const sem of semillas){
    if(!visible(sem)) continue;
    let p = sem.parentElement;
    for(let i = 0; i < 3 && p; i++){
      padres.set(p, (padres.get(p) || 0) + 1);
      p = p.parentElement;
    }
  }
  let mejorLista = null, mejorPuntos = 0;
  for(const [p, n] of padres){
    if(n < 3) continue;
    const hijos = [...p.children].filter(visible);
    if(hijos.length < 3) continue;
    const altos = hijos.map(h => Math.round(h.getBoundingClientRect().height));
    const medio = altos.reduce((a, b) => a + b, 0) / altos.length;
    if(medio < 60) continue;
    const parecidos = altos.filter(h => Math.abs(h - medio) < medio * 0.45).length;
    if(parecidos < 3) continue;
    const conImagen = hijos.filter(h => h.querySelector('img')).length;
    const conEnlace = hijos.filter(h => h.matches('a[href]') || h.querySelector('a[href]')).length;
    const conTexto = hijos.filter(h => limpio(h.textContent).length > 8).length;
    /* UNA TARJETA ES ALGO A DONDE SE VA O ALGO QUE SE VE. Con "3 hijos
       parecidos y con texto" alcanzaba, y entonces el <main> de un articulo
       -que tiene 3 enlaces sueltos al final- ganaba, y sus parrafos salian
       como 10 tarjetas. Medido en el banco de pruebas. Un bloque de texto
       sin foto ni enlace propio NO es una tarjeta, es un parrafo. */
    if(conImagen < 3 && conEnlace < 3) continue;
    const puntos = parecidos * 10 + conImagen * 6 + conEnlace * 4 + conTexto;
    if(puntos > mejorPuntos){ mejorPuntos = puntos; mejorLista = hijos; }
  }
  if(!mejorLista) return [];
  const salida = [];
  for(const h of mejorLista.slice(0, 12)){
    const im = h.querySelector('img');
    const tit = h.querySelector('h1,h2,h3,h4,h5,strong,b');
    const en = h.matches('a[href]') ? h : h.querySelector('a[href]');
    const todo = texto(h);
    const titulo = (tit ? texto(tit) : '') || (en ? texto(en) : '') || todo.slice(0, 60);
    if(!titulo && !im) continue;
    /* y cada tarjeta, una por una, tiene que llevar a algo o mostrar algo */
    if(!im && !en) continue;
    const resto = todo.startsWith(titulo) ? limpio(todo.slice(titulo.length)) : todo;
    const href = en ? absoluta(en.getAttribute('href')) : null;
    if(recogidas) recogidas.push(h);
    salida.push({
      titulo: titulo.slice(0, 80),
      txt: resto.slice(0, 160),
      img: im ? (im.currentSrc || im.src) : null,
      href,
      video: videoDeCelda(h, href)
    });
  }
  return salida.length >= 3 ? salida : [];
}

/* ---------- 5b. TARJETAS MIDIENDO ----------
   El paso de arriba busca hijos de un mismo padre. En un sitio moderno eso
   no alcanza: YouTube no tiene <nav>, ni <article>, ni <p> -su contenido
   vive en etiquetas propias tipo <ytd-rich-item-renderer>- y el extractor
   volvia con CERO tarjetas, cero enlaces y cero menu. Medido asi, en vivo.

   Asi que cuando la lectura por etiquetas no da nada, se mide: se busca
   cada imagen mediana, se sube hasta el primer ancestro que ademas tenga
   texto y un enlace, y se agrupa por ANCHO. Tres cajas del mismo ancho con
   foto, titulo y enlace son una rejilla, se llame como se llame la
   etiqueta. Es el mismo criterio que ya usa el clasificador del vestido:
   medir, no adivinar por selector. */

/* las imagenes del arbol de luz alcanzan en casi todo sitio; una app que
   dibuja dentro de shadow roots no aparece ahi y volvia con cero. Se paga
   ese barrido SOLO cuando lo primero no dio celdas. */
function imagenesDeSombra(){
  const salida = [];
  const todos = document.getElementsByTagName('*');
  const tope = Math.min(todos.length, 12000);
  for(let i = 0; i < tope && salida.length < 400; i++){
    const r = todos[i].shadowRoot;
    if(!r) continue;
    for(const im of r.querySelectorAll('img')) salida.push(im);
  }
  return salida;
}

/* enlaces reales de una celda: '#' y 'javascript:' no llevan a ningun lado */
function anclasDe(h){
  const salida = [];
  if(h.matches && h.matches('a[href]')) salida.push(h);
  for(const a of h.querySelectorAll('a[href]')) salida.push(a);
  return salida.filter(a => {
    const v = a.getAttribute('href') || '';
    return v && !/^(#|javascript:)/i.test(v);
  });
}

/* En una rejilla de videos la miniatura y el titulo estan en DOS enlaces
   hermanos: el de la foto no tiene texto y el del titulo no tiene foto. Por
   eso el titulo no se saca del primer <a> que aparezca sino del que mas
   texto util tenga, y el atributo title/aria-label manda porque ahi es donde
   la app pone el titulo completo cuando en pantalla sale recortado. */
/* Los controles de la interfaz llevan title y aria-label, y son justo los
   atributos de donde sacamos el titulo. En instagram.com dos tarjetas
   salieron llamadas "Audio is muted": eso es el boton de silencio del
   reproductor, no el nombre de un post. Se descartan por lista, en los dos
   idiomas, porque son un puñado y siempre los mismos. */
const CONTROLES = /^(audio is (muted|playing)|sonido (silenciado|activado)|silenciar|activar sonido|unmute|mute|play|pause|pausa|reproducir|siguiente|anterior|next|previous|more|m[aá]s opciones|options|opciones|like|me gusta|comentar|comment|share|compartir|guardar|save|seguir|follow|verificado|verified|cerrar|close|men[uú]|abrir|open|expandir|expand|ver m[aá]s|see more|traducci[oó]n|translate)$/i;

function esControl(t){
  const v = String(t || '').trim();
  return v.length <= 34 && CONTROLES.test(v);
}

function tituloDeCelda(h, im, anclas){
  const tit = h.querySelector('h1,h2,h3,h4,h5');
  const porTitulo = tit && texto(tit);
  if(porTitulo && porTitulo.length >= 4 && !esControl(porTitulo)) return porTitulo;
  const donde = [h, ...anclas].concat(im ? [im] : [])
                  .concat([...h.querySelectorAll('[title],[aria-label]')]);
  /* 'title' antes que 'aria-label': el primero suele traer el titulo limpio y
     el segundo lo trae con canal, duracion y visitas pegados atras */
  for(const cual of ['title', 'aria-label']){
    let hallado = '';
    for(const e of donde){
      const v = limpio(e.getAttribute(cual) || '');
      if(v.length > hallado.length && v.length >= 4 && !RUIDO.test(v) && !esControl(v)) hallado = v;
    }
    if(hallado) return hallado;
  }
  let mejor = '';
  for(const a of anclas){
    const v = texto(a);
    if(v.length > mejor.length && !RUIDO.test(v) && !esControl(v)) mejor = v;
  }
  if(mejor.length >= 4) return mejor;
  const alt = im && limpio(im.alt);
  if(alt && alt.length >= 4 && !esControl(alt)) return alt;
  return texto(h).slice(0, 60);
}

function tarjetasPorMedida(minimo, recogidas){
  const min = Math.max(2, minimo || 3);
  /* mas ancho que antes: una fila de resultados (miniatura a la izquierda,
     titulo a la derecha) mide casi todo el viewport y quedaba fuera */
  const ANCHO_MAX = Math.max(760, window.innerWidth * 0.85);

  const buscar = fuente => {
    const celdas = [];
    for(const im of fuente){
      if(!visible(im) || im.closest('[id^="au-"]')) continue;
      const ri = im.getBoundingClientRect();
      if(ri.width < 88 || ri.height < 50) continue;
      let e = padreDe(im), celda = null;
      for(let i = 0; i < 7 && e && e !== document.body; i++){
        const r = e.getBoundingClientRect();
        /* el tope de imagenes es lo que separa una celda de la FILA que la
           contiene: una tarjeta trae su foto y a lo sumo un avatar, una fila
           trae una foto por cada tarjeta */
        const fotos = e.querySelectorAll('img').length;
        const anclas = anclasDe(e);
        /* el largo se mide con textContent y no con innerText a proposito:
           innerText obliga al navegador a recalcular posiciones en CADA
           llamada, y esto corre por cada foto y por siete niveles de
           ancestros. Con innerText, AU_LEER tardaba 1874 ms en una pagina
           de veinte elementos. Aca solo hace falta saber si hay texto. */
        const largo = (e.textContent || '').replace(/\s+/g, ' ').trim().length;
        if(r.width >= 110 && r.width <= ANCHO_MAX && r.height >= 70 && r.height <= 700 &&
           fotos <= 3 && largo >= 12 &&
           (anclas.length || (im && fotos <= 2))){ celda = e; break; }
        e = padreDe(e);
      }
      if(celda && !celdas.includes(celda)) celdas.push(celda);
    }
    /* si una celda vive dentro de otra, la de afuera es el contenedor */
    return celdas.filter(c => !celdas.some(o => o !== c && c.contains(o)));
  };

  let hojas = buscar(document.images);
  if(hojas.length < min) hojas = hojas.concat(buscar(imagenesDeSombra()))
                                      .filter((c, i, t) => t.indexOf(c) === i);
  if(hojas.length < min) return [];

  /* agrupar por ANCHO: tres cajas del mismo ancho con foto, titulo y enlace
     son una rejilla, se llame como se llame la etiqueta */
  const grupos = new Map();
  for(const c of hojas){
    const k = Math.round(c.getBoundingClientRect().width / 20) * 20;
    if(!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c);
  }
  let mejor = [];
  for(const g of grupos.values()) if(g.length > mejor.length) mejor = g;
  /* una rejilla responsive puede dar anchos distintos en la misma fila; si el
     ancho no junto lo suficiente, el padre comun tambien es una medida */
  if(mejor.length < min){
    const porPadre = new Map();
    for(const c of hojas){
      const p = padreDe(c);
      if(!p) continue;
      if(!porPadre.has(p)) porPadre.set(p, []);
      porPadre.get(p).push(c);
    }
    for(const g of porPadre.values()) if(g.length > mejor.length) mejor = g;
  }
  if(mejor.length < min) return [];

  /* en el orden en que se ven, no en el que aparecieron las imagenes */
  mejor.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return (ra.top - rb.top) || (ra.left - rb.left);
  });

  const vistos = new Set(), salida = [];
  for(const h of mejor){
    if(salida.length >= 12) break;
    const im = h.querySelector('img');
    const anclas = anclasDe(h);
    /* el enlace que importa es el que lleva al contenido: si hay uno de
       video, ese; si no, el que envuelve la miniatura; si no, el primero */
    const en = anclas.find(a => idYoutube(a.href)) ||
               (im && anclas.find(a => a.contains(im))) || anclas[0] || null;
    const href = en ? absoluta(en.getAttribute('href')) : null;
    const titulo = tituloDeCelda(h, im, anclas);
    const todo = texto(h);
    const resto = todo.startsWith(titulo) ? limpio(todo.slice(titulo.length)) : todo;
    const img = im ? (im.currentSrc || im.src) : null;
    if(!href && !img) continue;
    const k = href || img;
    if(vistos.has(k)) continue;   // la misma tarjeta dos veces es ruido, no contenido
    vistos.add(k);
    if(recogidas) recogidas.push(h);
    salida.push({
      titulo: (titulo || 'Sin título').slice(0, 90),
      txt: resto.slice(0, 140),
      img,
      href,
      video: videoDeCelda(h, href)
    });
  }
  return salida.length >= min ? salida : [];
}

/* si no hay <nav> ni <header>, el menu son los enlaces de la franja de
   arriba de la pantalla */
function menuPorMedida(marca){
  const marcaBaja = pelado(marca);
  const vistos = new Set(), salida = [];
  for(const a of document.querySelectorAll('a[href]')){
    if(!visible(a) || a.closest('[id^="au-"]')) continue;
    const r = a.getBoundingClientRect();
    if(r.top < 0 || r.top > 130) continue;
    const t = texto(a);
    if(t.length < 2 || t.length > 24 || RUIDO.test(t)) continue;
    const k = t.toLowerCase();
    if(pelado(t) === marcaBaja || vistos.has(k)) continue;
    vistos.add(k);
    salida.push({ txt: t, href: absoluta(a.getAttribute('href')) });
    if(salida.length >= 8) break;
  }
  return salida;
}

/* ---------- 5d. DESPERTAR LA LISTA ----------
   Una lista virtualizada solo dibuja lo que entra en pantalla: lo que no se
   vio nunca no existe en el DOM y no se puede leer. Asi que antes de extraer
   se baja el scroll en pasos, se espera a que el sitio agregue nodos y se
   devuelve el scroll a donde estaba.

   Es lo UNICO que esta funcion escribe en la pagina ajena, y lo devuelve.
   Tiene tope de tiempo y corta sola si el sitio no crece: una extension que
   se cuelga esperando contenido es peor que una con poco contenido. */

/* el carril que de verdad hace scroll: hay apps donde el que se mueve no es
   el documento sino un contenedor interno */
function carril(){
  const d = document.scrollingElement || document.documentElement;
  if(d.scrollHeight > d.clientHeight + 40) return d;
  let mejor = null, area = 0;
  const todos = document.body ? document.body.getElementsByTagName('*') : [];
  const tope = Math.min(todos.length, 3000);
  for(let i = 0; i < tope; i++){
    const e = todos[i];
    if(e.scrollHeight <= e.clientHeight + 200) continue;
    if(!/auto|scroll|overlay/.test(getComputedStyle(e).overflowY)) continue;
    const r = e.getBoundingClientRect();
    const a = r.width * r.height;
    if(a > area){ area = a; mejor = e; }
  }
  return mejor || d;
}

/* ---------- el freno de mano ----------
   AU_DESPERTAR escribe en el scroll del sitio hasta 7 s. Si en el medio la
   persona quita nuestra pagina, esas escrituras siguen y se ven: el SITIO
   original bajando solo en pasos y volviendo de golpe, justo despues de que
   el pie dijo "el sitio original no fue modificado". Por eso hay una
   generacion: quien desarma la incrementa y el bucle se corta en la
   siguiente vuelta. Vive en `window` (el del mundo aislado de la extension,
   que los cuatro archivos comparten) para no depender del orden de carga. */
function AU_CORTAR(){
  try { window.__AU_GEN = (Number(window.__AU_GEN) || 0) + 1; } catch(e){}
}
function generacion(){
  try { return Number(window.__AU_GEN) || 0; } catch(e){ return 0; }
}

async function AU_DESPERTAR(pasos){
  const n = Math.max(1, Math.min(12, Number(pasos) || 4));
  const TOPE = 7000;                 // tope duro de toda la maniobra
  const t0 = Date.now();
  const gen = generacion();
  const abortado = () => generacion() !== gen;
  const c = carril();
  const esDoc = c === document.scrollingElement || c === document.documentElement;
  const y0 = esDoc ? (window.scrollY || c.scrollTop || 0) : c.scrollTop;
  const ventana = Math.max(1, esDoc ? window.innerHeight : c.clientHeight);
  const irA = y => { if(esDoc) window.scrollTo(0, y); else c.scrollTop = y; };
  const alto = () => (esDoc
    ? Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)
    : c.scrollHeight);
  const nodos = () => document.getElementsByTagName('*').length;

  try {
    let n0 = nodos(), a0 = alto();
    for(let i = 1; i <= n; i++){
      if(Date.now() - t0 > TOPE || abortado()) break;
      const destino = Math.min(alto(), y0 + ventana * i * 0.9);
      irA(destino);
      /* no hay evento de "ya dibujaste": se sondea el crecimiento con techo */
      let crecio = false;
      for(let e = 0; e < 7 && Date.now() - t0 < TOPE; e++){
        await dormir(100);
        if(abortado()) break;
        const nn = nodos(), na = alto();
        if(nn > n0 + 20 || na > a0 + 200){ n0 = nn; a0 = na; crecio = true; break; }
      }
      if(abortado()) break;
      /* si no crecio y ademas ya no queda a donde bajar, no hay mas que sacar */
      if(!crecio && destino >= alto() - ventana - 4) break;
    }
  } catch(e){
    /* despertar es opcional: si el sitio no deja, se extrae lo que ya haya */
  } finally {
    /* la vuelta tambien en pasos: al pasar de regreso el virtualizador vuelve
       a dibujar lo de arriba antes de que se lea.
       Salvo si nos cortaron: ahi la pagina de abajo ya esta a la vista y una
       vuelta escalonada seria el sitio moviendose solo. Se devuelve el scroll
       de un solo salto y se sale. */
    const ahora = esDoc ? (window.scrollY || 0) : c.scrollTop;
    if(abortado()){ irA(y0); return; }
    for(let k = 3; k >= 1 && ahora > y0; k--){
      irA(y0 + (ahora - y0) * (k / 4));
      await dormir(60);
      if(abortado()){ irA(y0); return; }
    }
    irA(y0);
    await dormir(160);
  }
}

/* ---------- 5e. QUE CLASE DE PAGINA ES ----------
   Se mide, no se adivina por dominio ni por selector:
   - documento: hay texto de lectura de verdad.
   - catalogo:  poco texto pero muchas cajas parecidas.
   - app:       etiquetas propias (con guion en el nombre), documento mucho
                mas alto que la pantalla, o reproductores a la vista.
   El orden importa: el texto manda primero porque Wikipedia tambien es
   altisima y tambien tiene <video> en alguna nota, y romper el camino de las
   paginas de texto -que ya funciona- seria el peor cambio posible. */
function contarPropias(){
  const todos = document.getElementsByTagName('*');
  const tope = Math.min(todos.length, 20000);
  let n = 0;
  for(let i = 0; i < tope; i++) if(todos[i].localName.indexOf('-') > 0) n++;
  return n;
}

function clasePorMedida(palabras, parrafos, tarjetas, med){
  const propias = contarPropias();
  const veces = document.documentElement.scrollHeight / Math.max(window.innerHeight, 1);
  const videos = [...document.querySelectorAll('video')].filter(visible).length;
  const senales = { propias, veces: +veces.toFixed(1), videos, palabras, parrafos, tarjetas };

  let clase;
  if(palabras >= 150 && parrafos >= 3) clase = 'documento';
  else if(propias >= 25) clase = 'app';
  else if(palabras < 60 && (videos > 0 || med.length >= 2)) clase = 'app';
  else if(palabras < 60 && veces >= 4 && tarjetas >= 3) clase = 'app';
  /* una app hecha con <div> pelados no tiene etiquetas propias que contar:
     se la reconoce por lo que NO tiene -ni un parrafo- con un documento
     mucho mas alto que la pantalla y sin la cantidad de cajas de un
     catalogo. Un catalogo de verdad trae seis o mas, y se atiende abajo. */
  else if(parrafos === 0 && palabras < 60 && veces >= 4 && tarjetas < 6) clase = 'app';
  else if(tarjetas >= 6) clase = 'catalogo';
  /* `parrafos < 3` es lo que impide que una nota corta con una tira de "te
     puede interesar" abajo salga clasificada como catalogo: 100 palabras en
     5 parrafos no llegan al piso de 150 de la primera rama, y sin esto la
     lectura se degradaba a `.cuerpo.segundo` con la rejilla de mandona. El
     comentario de arriba dice que el texto manda primero: esto lo cumple. */
  else if(tarjetas >= 3 && palabras < 150 && parrafos < 3) clase = 'catalogo';
  else if(palabras >= 60) clase = 'documento';
  else clase = tarjetas ? 'catalogo' : (parrafos ? 'documento' : 'app');
  return { clase, senales };
}

/* cuanta lectura hay, medido barato y ANTES de armar los bloques: con eso se
   decide si una pagina casi vacia puede bajar el minimo de tarjetas a 2. En
   una app con dos publicaciones, exigir tres es volver con cero. */
function palabrasDeLectura(raiz){
  let n = 0;
  const ps = raiz.querySelectorAll('p');
  for(let i = 0; i < ps.length && n < 400; i++){
    const t = limpio(ps[i].textContent);
    if(t.length >= 40 && !RUIDO.test(t)) n += t.split(' ').length;
  }
  return n;
}

/* ---------- 5c. TARJETAS DE VIDEO ----------
   En YouTube las dos vias de arriba fracasan, y se midio por que: de 89
   imagenes, 78 las rechaza el filtro de visibilidad porque YouTube deja sus
   miniaturas en opacity:0 hasta que las mirás. Buscando por imagen salian 5
   tarjetas, y encima eran Shorts.

   Pero los ENLACES si estan: 34 ids de video distintos, 33 con titulo
   usable, todos visibles. Asi que en un sitio de video la tarjeta se arma
   al reves: se parte del enlace, y la miniatura se CONSTRUYE con el id, que
   siempre existe y no pide sesion. Medido en vivo: 33 contra 5. */
function tarjetasDeVideo(){
  const porId = new Map();
  for(const a of document.querySelectorAll('a[href]')){
    if(a.closest('[id^="au-"]')) continue;
    const id = idYoutube(a.href);
    if(!id) continue;
    /* el titulo puede estar en el atributo y no en el texto: la miniatura y
       el titulo suelen ser DOS enlaces hermanos al mismo video, y solo uno
       de los dos lleva el texto */
    const t = tituloDeEnlace(a);
    const y = porId.get(id) || { id, titulo: '', href: null };
    if(t.length > y.titulo.length) y.titulo = t;
    if(!y.href) y.href = absoluta(a.getAttribute('href'));
    porId.set(id, y);
  }
  const salida = [];
  for(const y of porId.values()){
    if(y.titulo.length < 8) continue;
    salida.push({
      titulo: y.titulo.slice(0, 90),
      txt: '',
      img: 'https://i.ytimg.com/vi/' + encodeURIComponent(y.id) + '/hqdefault.jpg',
      href: y.href,
      video: { tipo: 'youtube', id: y.id, mismoSitio: mismoSitio(y.href) }
    });
    if(salida.length >= 24) break;
  }
  return salida;
}

/* la duracion y las vistas vienen pegadas en el aria-label y no son titulo */
function tituloDeEnlace(a){
  const crudo = limpio(a.getAttribute('title') || a.getAttribute('aria-label') || texto(a));
  return crudo
    .replace(/\s*\d+\s*(minutos?|segundos?|horas?)(\s+y\s+\d+\s*(minutos?|segundos?))?\s*$/i, '')
    .replace(/\s*hace\s+\d+\s*\S+\s*$/i, '')
    .replace(/\s*[\d.,]+\s*(M|k|mil|millones)?\s*de\s+vistas\s*$/i, '')
    .trim();
}

/* ---------- 6b. EL TEXTO QUE NO ESTA EN UN <p> ----------
   Las etiquetas de lectura -<p>, <li>, <blockquote>- son de la web de los
   documentos. Una app moderna escribe TODO en <div> y <span>: Instagram
   pone ahi el pie de foto, YouTube la descripcion, y este mismo banco de
   pruebas pone ahi las dos frases de su unica publicacion. Medido en
   prueba.html: la pagina tiene texto en pantalla y cuerpo() volvia con 0
   parrafos, asi que la medida decia "0 palabras" tres centimetros encima
   de esas mismas frases.

   Asi que hay un segundo intento, con la MISMA forma que ya usan las
   tarjetas (primero por etiquetas; si no dio nada, midiendo): solo corre
   cuando la lectura por etiquetas no encontro casi nada, asi que ninguna
   pagina que hoy funciona -Wikipedia, un blog, una nota- cambia en nada.

   La hoja de texto es el elemento MAS ADENTRO que todavia lleva el texto
   entero. Sin esa condicion, un parrafo dentro de tres <div> entraria tres
   veces, una por cada nivel. */
const SUELTOS = 'div,span,td,dd,figcaption';

function esHojaDeTexto(e){
  /* textContent y no innerText, a proposito: esto mira TODOS los div de la
     pagina, e innerText obliga al navegador a recalcular posiciones en cada
     llamada -es lo que en su dia dejo AU_LEER en 1874 ms-. Aca solo hace
     falta saber cuanto texto cuelga y en que nivel vive. */
  const propio = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().length;
  const largo = propio(e.textContent);
  if(largo < 40 || largo > 700) return false;
  for(const h of e.children) if(propio(h.textContent) >= 40) return false;
  /* una caja que es casi toda un enlace es un menu o un "te puede
     interesar", no un parrafo */
  const a = e.querySelector('a');
  if(a && propio(a.textContent) >= largo * 0.8) return false;
  return true;
}

/* ---------- 6. EL CUERPO ----------
   Se recorre en ORDEN de documento, no por tipo: si se juntan primero
   todos los titulos y despues todos los parrafos, el texto se desarma y
   deja de leerse. */
function cuerpo(raiz, yaUsadas, tituloYaPuesto, celdas, rescate){
  /* el <h1> de la pagina ya es el titulo grande del hero: si ademas entra
     como primer encabezado del cuerpo, el mismo texto sale dos veces, una
     debajo de la otra. Se ve en el banco de pruebas. */
  const yaEsta = limpio(tituloYaPuesto).toLowerCase();
  const bloques = [];
  const nodos = raiz.querySelectorAll(
    'h1,h2,h3,h4,p,li,blockquote,img' + (rescate ? ',' + SUELTOS : ''));
  const yaDicho = new Set();
  let ultimaLista = null;
  for(const e of nodos){
    const tag = e.tagName;
    /* de los sueltos, solo los que de verdad son un parrafo. Va PRIMERO
       porque es la prueba barata: visible() cuesta un getComputedStyle y
       un rectangulo, y en rescate esto pasa por cada div de la pagina. */
    const suelto = !/^(H[1-4]|P|LI|BLOCKQUOTE|IMG)$/.test(tag);
    if(suelto && !esHojaDeTexto(e)) continue;
    if(e.closest('[id^="au-"]')) continue;
    if(tag !== 'IMG' && e.closest(FUERA)) continue;
    /* LO QUE YA SALIO ARRIBA NO SE VUELVE A ESCRIBIR ABAJO.
       Las celdas que se convirtieron en tarjetas siguen estando en el
       arbol, con su <h3> y su <p> adentro, asi que cuerpo() las volvia a
       levantar y la pagina re-armada mostraba las mismas piezas dos veces:
       una en la rejilla y otra en la columna de lectura. Medido en
       prueba_rearmado.html: las 3 tarjetas repetidas enteras, titulo y
       parrafo. Ya estaba resuelto para la foto de portada (yaUsadas) y
       para el <h1>; faltaba para las tarjetas. */
    if(celdas && celdas.length && celdas.some(c => c.contains(e))) continue;
    if(!visible(e)) continue;

    if(tag === 'IMG'){
      const r = e.getBoundingClientRect();
      if(r.width < 140 || r.height < 100) continue;
      const src = e.currentSrc || e.src;
      if(!src || yaUsadas.has(src)) continue;
      yaUsadas.add(src);
      bloques.push({ tipo: 'imagen', src, alt: limpio(e.alt), ancho: Math.round(r.width) });
      continue;
    }

    const txt = texto(e);
    if(!txt || RUIDO.test(txt)) continue;

    if(/^H[1-4]$/.test(tag)){
      if(txt.length > 120) continue;
      if(yaEsta && txt.toLowerCase() === yaEsta) continue;
      ultimaLista = null;
      bloques.push({ tipo: 'titulo', nivel: +tag[1], txt });
      continue;
    }
    if(tag === 'BLOCKQUOTE'){
      if(txt.length < 20) continue;
      ultimaLista = null;
      bloques.push({ tipo: 'cita', txt: txt.slice(0, 400) });
      continue;
    }
    if(tag === 'LI'){
      if(txt.length < 3 || txt.length > 220) continue;
      /* un li que es solo un enlace corto es menu disfrazado de lista */
      const a = e.querySelector('a');
      if(a && txt.length < 30 && texto(a).length >= txt.length - 2) continue;
      if(!ultimaLista){ ultimaLista = { tipo: 'lista', items: [] }; bloques.push(ultimaLista); }
      if(ultimaLista.items.length < 10) ultimaLista.items.push(txt);
      continue;
    }
    /* P, y los sueltos rescatados */
    if(txt.length < 40) continue;
    if(!suelto && e.querySelector('p')) continue;
    /* el mismo texto no se escribe dos veces aunque venga por dos caminos:
       en rescate un <p> y el <div> que lo envuelve pueden llegar los dos */
    if(yaDicho.has(txt)) continue;
    yaDicho.add(txt);
    ultimaLista = null;
    bloques.push({ tipo: 'parrafo', txt });
  }
  return bloques.filter(b => b.tipo !== 'lista' || b.items.length >= 2);
}

/* ---------- 6b. CUANDO LA PAGINA NO DIO DE DONDE AGARRARSE ----------
   No es lo mismo "poca lectura" que "no hay pagina". Esto ultimo se mide, y
   se mide DESPUES de armar los bloques, porque recien ahi se sabe cuanto
   sobrevivio: una app puede tener 4000 nodos y dejar cero parrafos.

   LOS NUMEROS, Y DE DONDE SALIERON:
   - menos de 3 tarjetas. La rejilla es repeat(auto-fill, minmax(230px,1fr)):
     en una pantalla ancha son 4 o 5 columnas, asi que con dos no se completa
     ni una fila. Es ademas el mismo piso que ya usan tarjetas() y
     tarjetasPorMedida() para decidir que ahi hay una rejilla.
   - menos de 3 parrafos y menos de 80 palabras DE LECTURA. La columna mide
     760px con el parrafo en 17px: entran unas 12 palabras por renglon, o sea
     que 80 palabras son 7 renglones, menos de media pantalla. El
     clasificador ya trata "menos de 60" como casi sin texto y "150 o mas"
     como documento; 80 cae en el hueco del medio y no le toca a ninguna nota
     corta de verdad, que pasa las 100 sin esfuerzo.
     LECTURA NO ES SOLO <p>: cuerpo() arma cinco tipos y aca se contaban las
     palabras de 'parrafo' y nada mas. Un changelog, un FAQ o una receta
     -encabezados y <ul><li>- daban 0 palabras y 0 parrafos, se declaraban
     flacos teniendo contenido de sobra, y la frase de abajo decia "y 0
     palabras" tres centimetros encima de esos mismos renglones, que se
     estaban dibujando en .cuerpo li. Cuentan 'parrafo', 'cita' y los items
     de 'lista'. Los titulos NO: un encabezado no es texto que se lea, pero
     si los hay entran en la frase para que se vea que estaban.
   - cero medios MOSTRABLES. Un medio solo cuenta si se puede dibujar: un
     <video> con blob: viaja sin src a proposito (ver medios()) y en la
     pagina re-armada termina siendo una miniatura con un enlace, no un
     reproductor que llene la portada. Medido en Instagram: 2 posts, videos
     blob, cero que se puedan incrustar.
   - menos de 2 imagenes en el cuerpo. Una sola foto suelta no arma una
     pagina; dos ya dan una tira que se puede mirar.
   Las cinco a la vez: con que UNA sola falle, hay con que trabajar y no se
   toca nada del camino que ya funciona. */
function medidaFlaca(lectura, parrafos, tarjetas, imagenes, med, titulos){
  /* INCRUSTABLES, que no es lo mismo que "videos que tiene el sitio": un
     <video> con blob: viaja sin src a proposito y no entra en esta cuenta,
     pero el armador SI lo dibuja en la portada. La DECISION usa este numero
     -si no se puede mostrar, no hay con que llenar la pagina-; la FRASE de
     abajo no puede publicarlo como si fuera cuantos videos hay. */
  const incrustables = med.filter(m => m.id || m.src).length;
  const flaco = tarjetas < 3 && parrafos < 3 && lectura < 80 &&
                incrustables === 0 && imagenes < 2;
  /* vacio cuando no esta flaca: la frase explica POR QUE lo esta, y fuera de
     ese caso no hay nada que explicar. Quien la muestre no tiene que pensar
     si aplica: si esta vacia, no va. */
  if(!flaco) return { flaco: false, porQueFlaco: '' };

  const cuantos = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  /* LA FRASE SE ARMA CON LOS MISMOS NUMEROS QUE DECIDIERON, no con tres
     elegidos a mano: se muestra tal cual en el title de cada pieza firmada y
     se le manda al modelo como dato medido. Decia "0 videos" en Instagram
     -2 posts con blob:- mientras arriba se estaba dibujando ese medio. */
  const video = (incrustables === 0 && med.length)
    ? cuantos(med.length, 'video que no se puede mostrar aquí',
                          'videos que no se pueden mostrar aquí')
    : cuantos(incrustables, 'video', 'videos');

  const partes = [cuantos(tarjetas, 'tarjeta', 'tarjetas')];
  /* el cero que no aporta nada se calla: "0 imágenes" dentro de una lista de
     ceros alarga la frase sin decir nada nuevo. El que NO es cero entra
     siempre, aunque no haya sido el que definio el corte. */
  if(imagenes) partes.push(cuantos(imagenes, 'imagen', 'imágenes'));
  partes.push(video);
  if(titulos) partes.push(cuantos(titulos, 'título', 'títulos'));
  partes.push(cuantos(lectura, 'palabra', 'palabras'));
  return {
    flaco: true,
    porQueFlaco: partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1]
  };
}

/* ---------- 7. TODO JUNTO ---------- */
function AU_LEER(){
  const raiz = raizDelContenido();
  const id = identidad();
  const port = portada();
  const usadas = new Set(port ? [port.src] : []);
  const med = medios();

  /* primero por etiquetas; si no dio nada, midiendo. `celdas` se lleva el
     NODO de cada tarjeta para que cuerpo() no lo vuelva a escribir abajo. */
  const celdas = [];
  let tar = tarjetas(raiz, celdas);
  let comoTarjetas = 'etiquetas';
  if(!tar.length){
    celdas.length = 0;
    const minimo = palabrasDeLectura(raiz) < 60 ? 2 : 3;
    tar = tarjetasPorMedida(minimo, celdas);
    comoTarjetas = tar.length ? 'medida' : 'nada';
    if(!tar.length) celdas.length = 0;
  }
  /* y en un sitio de video, los enlaces ganan siempre: ver 5c. Se usa
     cuando trae MAS que lo anterior y hay una rejilla de verdad (6 o mas),
     o cuando lo anterior no encontro nada. Asi un blog con dos videos
     incrustados no se convierte en un catalogo de videos. */
  const porVideo = tarjetasDeVideo();
  if(porVideo.length > tar.length && (porVideo.length >= 6 || tar.length < 3)){
    tar = porVideo;
    comoTarjetas = 'enlaces de video';
    /* estas no salieron de una celda del arbol sino de los enlaces sueltos,
       asi que no hay ningun nodo que excluir de la columna de lectura */
    celdas.length = 0;
  }
  tar.forEach(t => { if(t.img) usadas.add(t.img); });

  let men = menu(id.marca);
  if(!men.length) men = menuPorMedida(id.marca);

  /* cuerpo() marca en `usadas` las fotos que va usando, asi que el segundo
     intento tiene que arrancar con la lista tal como estaba: si no, se
     encuentra todas las imagenes ya tomadas por el primero y vuelve sin
     ninguna. */
  const usadasAntes = new Set(usadas);
  const porEtiquetas = cuerpo(raiz, usadas, id.titulo, celdas, false);
  let blo = porEtiquetas;
  let comoCuerpo = 'etiquetas';
  const cuantosP = b => b.filter(x => x.tipo === 'parrafo').length;
  /* SEGUNDO INTENTO: mirando tambien los <div>. Solo cuando por etiquetas
     casi no salio lectura, y solo se queda si de verdad trajo mas. Asi una
     app pasa de cero parrafos a los que se ven en pantalla, y una pagina
     que ya funcionaba no cambia ni un renglon. */
  if(cuantosP(blo) < 2){
    const rescatadas = new Set(usadasAntes);
    const conSueltos = cuerpo(raiz, rescatadas, id.titulo, celdas, true);
    if(cuantosP(conSueltos) > cuantosP(blo)){ blo = conSueltos; comoCuerpo = 'sueltos'; }
  }

  const cuentaPal = t => String(t == null ? '' : t).trim().split(/\s+/).filter(Boolean).length;
  const palabras = blo.filter(b => b.tipo === 'parrafo')
                      .reduce((a, b) => a + cuentaPal(b.txt), 0);
  /* TODO LO QUE SE LEE, no solo lo que vino en un <p>: ver medidaFlaca().
     `palabras` mide la COLUMNA de lectura de lo que se va a dibujar; la
     cuenta ancha -que suma citas y listas- va aparte porque es la que
     decide si la pagina vino flaca. Ninguna de las dos decide la CLASE:
     eso lo hace `palabrasEtiqueta`, unas lineas mas abajo, y ahi esta
     explicado por que. */
  const lectura = blo.reduce((a, b) => {
    if(b.tipo === 'parrafo' || b.tipo === 'cita') return a + cuentaPal(b.txt);
    if(b.tipo === 'lista') return a + (b.items || []).reduce((x, i) => x + cuentaPal(i), 0);
    return a;
  }, 0);
  const parrafos = blo.filter(b => b.tipo === 'parrafo').length;
  const imagenes = blo.filter(b => b.tipo === 'imagen').length;
  const titulos = blo.filter(b => b.tipo === 'titulo').length;
  /* LA CLASE SE DECIDE CON LO QUE VINO EN ETIQUETAS DE LECTURA, no con lo
     que ademas se pudo rescatar de los <div>. La pregunta que contesta
     clasePorMedida no es "cuanto texto le sacamos" sino "esta ESCRITA como
     un documento": una app sigue siendo una app aunque le rescatemos cinco
     parrafos, y promoverla a 'documento' le pediria al modelo una columna
     de lectura que ahi no existe -que es exactamente el bug que el bloque
     ENFOQUE vino a arreglar-. El rescate enriquece lo que se dibuja y la
     cuenta de `lectura`; la clase no se mueve. */
  const palabrasEtiqueta = porEtiquetas.filter(b => b.tipo === 'parrafo')
                                       .reduce((a, b) => a + cuentaPal(b.txt), 0);
  const cl = clasePorMedida(palabrasEtiqueta, cuantosP(porEtiquetas), tar.length, med);
  const fl = medidaFlaca(lectura, parrafos, tar.length, imagenes, med, titulos);
  return {
    clase: cl.clase,
    sitio: location.hostname,
    url: location.href,
    titulo: id.titulo,
    lema: id.lema,
    marca: id.marca,
    portada: port,
    medios: med,
    menu: men,
    tarjetas: tar,
    bloques: blo,
    /* con esto se decide si vale la pena re-armar o conviene solo vestir */
    medida: {
      palabras,
      /* las palabras de TODO lo que se lee -parrafos, citas y items de
         lista-, que es el numero con el que se decide `flaco` y el que sale
         escrito en `porQueFlaco`. Publicarlo evita tener que creerle. */
      lectura,
      titulos,
      parrafos,
      imagenes,
      tarjetas: tar.length,
      medios: med.length,
      videos: tar.filter(t => t.video).length,
      como: comoTarjetas,
      /* 'etiquetas' si la lectura salio de <p>/<li>, 'sueltos' si hubo que
         rescatarla de los <div>. Con esto, `parrafos` no es un numero que
         haya que creerle: se ve de donde salio. Ojo al leer `senales`, que
         son los numeros con los que se decidio la CLASE y esos son siempre
         los de etiquetas (ver el comentario de clasePorMedida mas arriba). */
      comoCuerpo,
      /* la pagina dio poco de donde agarrarse, y por que. Con esto el
         servidor le suelta la mano al modelo -que escriba la pagina que este
         sitio deberia tener- y el armador marca lo escrito con .escrito.
         La frase se muestra tal cual; cuando flaco es false va vacia. */
      flaco: fl.flaco,
      porQueFlaco: fl.porQueFlaco,
      /* los numeros crudos con los que se decidio la clase: sin esto,
         'app' es una etiqueta que hay que creerle */
      senales: cl.senales,
      raiz: raiz.tagName.toLowerCase() + (raiz.id ? '#' + raiz.id : '')
    }
  };
}

/* De que habla la pagina, en una linea, para pedirle el diseño sin que la
   persona tenga que escribir nada. */
function AU_TEMA(c){
  return limpio([c.marca, c.titulo, c.lema].filter(Boolean).join('. ')).slice(0, 220);
}
