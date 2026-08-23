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
  observador: null
};

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
    const c = [...e.classList].slice(0,2).map(x => '.' + x).join('');
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
const CLASES = ['au-btn','au-fila','au-caja','au-avatar','au-media',
                'au-panel','au-entrada','au-icono','au-nota'];

function clasificar(){
  document.querySelectorAll('.' + CLASES.join(',.')).forEach(e => e.classList.remove(...CLASES));
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const n = { btn:0, fila:0, caja:0, avatar:0, media:0, panel:0, entrada:0, icono:0, nota:0 };

  /* fotos: por tamaño. Un avatar de 32px no se marca igual que una foto de 500px */
  document.querySelectorAll('img, video').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    const r = e.getBoundingClientRect(), lado = Math.min(r.width, r.height);
    if(lado <= 76){ e.classList.add('au-avatar'); n.avatar++; }
    else if(Math.max(r.width, r.height) >= 150){ e.classList.add('au-media'); n.media++; }
  });

  /* clicables: chico con texto = boton; grande o con foto = fila de lista */
  document.querySelectorAll('[role="button"], button, [role="link"], a[href]').forEach(e => {
    if(!vis(e) || e.closest('[id^="au-"]')) return;
    if(e.parentElement && e.parentElement.closest('[role="button"],button,[role="link"]')) return;
    const r = e.getBoundingClientRect();
    const txt = (e.innerText || '').trim();
    const tieneSvg = !!e.querySelector('svg');
    const tieneImg = !!e.querySelector('img,canvas');
    const enMenu = !!e.closest('nav');

    if(enMenu || tieneSvg || !txt){ e.classList.add('au-icono'); n.icono++; return; }
    if(r.width >= 240 || r.height >= 64 || tieneImg){ e.classList.add('au-fila'); n.fila++; return; }
    if(txt.length <= 22 && r.height <= 52){ e.classList.add('au-btn'); n.btn++; return; }
    e.classList.add('au-fila'); n.fila++;
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
  document.querySelectorAll('article, aside, [role="article"]')
    .forEach(e => { if(vis(e)){ e.classList.add('au-caja'); n.caja++; } });
  document.querySelectorAll('nav, [role="navigation"]')
    .forEach(e => { if(vis(e)){ e.classList.add('au-panel'); n.panel++; } });
  return n;
}

/* ============ 3. FUENTES QUE EXISTEN SIN BAJAR NADA ============ */
const PILAS = {
  'Fredoka':          '"Segoe UI Rounded","Trebuchet MS",Verdana,sans-serif',
  'Quicksand':        '"Trebuchet MS",Verdana,"Segoe UI",sans-serif',
  'Bebas Neue':       '"Haettenschweiler","Arial Narrow",Impact,sans-serif',
  'Space Grotesk':    '"Segoe UI",system-ui,Arial,sans-serif',
  'Playfair Display': 'Georgia,"Times New Roman",serif',
  'Lora':             'Georgia,"Book Antiqua",serif',
  'Pixel':            '"Press Start 2P","Courier New",Consolas,monospace',
  'Mono':             '"Courier New",Consolas,monospace'
};
const pila = n => PILAS[n] || PILAS['Space Grotesk'];

/* ============ 4. VESTIR ============ */
function vestir(d){
  const raiz = document.documentElement;
  raiz.setAttribute('data-au', '1');
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
  p.setProperty('--au-canvas', duro ? 'hidden' : 'visible');
  p.setProperty('--au-avatar-r', duro ? (d.radio || '0px') : '50%');

  fondo(d);
  barra(d);
  tarjeta(d);
  clasificar();
  AU.puesto = true;
}

/* el fondo va en el body: en un div encima tapa la barra */
function fondo(d){
  const a = conAlfa(d.acento, d.oscuro ? .26 : .40);
  const b = conAlfa(d.acento2, d.oscuro ? .22 : .34);
  /* OJO: los motivos se quedan como arreglo. Si se juntan en un texto y se
     indexa con [0], sale MEDIO emoji y encodeURIComponent tira "URI malformed". */
  const m = (Array.isArray(d.motivos) && d.motivos.length ? d.motivos : ['✨']);
  const pieza = i => m[i % m.length];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="200">' +
    '<text x="30" y="52" font-size="26" opacity=".07">' + pieza(0) + '</text>' +
    '<text x="150" y="110" font-size="20" opacity=".06">' + pieza(1) + '</text>' +
    '<text x="70" y="170" font-size="22" opacity=".06">' + pieza(2) + '</text>' +
    '</svg>';
  let patron = '';
  try { patron = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '"),'; }
  catch(e){ patron = ''; }
  const capas = patron +
    'radial-gradient(900px 620px at 10% -6%,' + a + ',transparent 62%),' +
    'radial-gradient(760px 560px at 104% 106%,' + b + ',transparent 60%)';
  const e = document.body.style;
  e.setProperty('background-image', capas, 'important');
  e.setProperty('background-repeat', patron ? 'repeat,no-repeat,no-repeat' : 'no-repeat,no-repeat', 'important');
  e.setProperty('background-attachment', patron ? 'scroll,fixed,fixed' : 'fixed,fixed', 'important');
  e.setProperty('background-color', d.fondo, 'important');
}

function barra(d){
  let b = document.getElementById('au-barra');
  if(!b){ b = document.createElement('div'); b.id = 'au-barra'; document.body.appendChild(b); }
  b.innerHTML = '';
  const t = document.createElement('b'); t.textContent = 'API UNIVERSAL';
  const s = document.createElement('span'); s.className = 'au-sep';
  s.textContent = 'vistiendo esta página · ' + (d.titulo || '');
  const m = document.createElement('span'); m.className = 'au-motivos';
  m.textContent = (d.motivos || []).join('');
  const x = document.createElement('button'); x.className = 'au-x'; x.textContent = 'Quitar';
  x.onclick = quitar;
  b.append(t, s, m, x);
}

function tarjeta(d){
  const destino = document.querySelector('main[role="main"]') || document.querySelector('main') || document.body;
  let c = document.getElementById('au-tarjeta');
  if(!c){ c = document.createElement('div'); c.id = 'au-tarjeta'; destino.prepend(c); }
  else if(c.parentElement !== destino) destino.prepend(c);
  c.innerHTML = '';
  const et = document.createElement('span'); et.className = 'au-etiqueta';
  et.textContent = 'Armado por la conexión';
  const h = document.createElement('h2'); h.textContent = d.titulo || 'Tu página';
  const p = document.createElement('p'); p.textContent = d.bienvenida || '';
  const dec = document.createElement('span'); dec.className = 'au-deco';
  dec.textContent = (d.motivos || []).join('');
  c.append(et, h, p, dec);
}

function quitar(){
  document.documentElement.removeAttribute('data-au');
  ['au-barra','au-tarjeta','au-aviso','au-intro'].forEach(id => document.getElementById(id)?.remove());
  ['background-image','background-repeat','background-attachment','background-color']
    .forEach(k => document.body.style.removeProperty(k));
  document.querySelectorAll('.' + CLASES.join(',.')).forEach(e => e.classList.remove(...CLASES));
  if(AU.observador){ AU.observador.disconnect(); AU.observador = null; }
  AU.puesto = false;
  chrome.storage.local.set({ activo:false });
}

/* ============ 5. COLORES ============ */
function nums(h){ const n = parseInt(String(h).replace('#',''),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
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

/* ============ 7. PEDIRLE EL DISEÑO A LA CONEXION ============ */
async function pedir(tema){
  const cuerpo = JSON.stringify({ tema, estructura: estructura() });
  const r = await fetch(AU.SERVIDOR + '/api/vestir', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:cuerpo
  });
  if(!r.ok) throw new Error('la conexión no respondió');
  return r.json();
}

function aviso(txt, ms){
  let a = document.getElementById('au-aviso');
  if(!a){ a = document.createElement('div'); a.id = 'au-aviso'; document.body.appendChild(a); }
  a.textContent = txt;
  if(ms) setTimeout(() => a.remove(), ms);
}

/* el sitio redibuja al navegar y se lleva lo nuestro: hay que reponerlo */
function vigilar(){
  if(AU.observador) return;
  let t = null;
  AU.observador = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      if(!AU.guardado || !AU.puesto) return;
      if(!document.getElementById('au-barra')) vestir(AU.guardado.d);
      else clasificar();
    }, 400);
  });
  AU.observador.observe(document.documentElement, { childList:true, subtree:true });
}

/* ============ 8. ORDENES DEL POPUP ============ */
chrome.runtime.onMessage.addListener((msg, _o, responder) => {
  if(msg.tipo === 'estado'){
    responder({ puesto: AU.puesto, tema: AU.guardado?.tema || '' });
    return true;
  }
  if(msg.tipo === 'quitar'){ quitar(); responder({ ok:true }); return true; }
  if(msg.tipo === 'vestir'){
    const pantalla = intro(msg.tema);
    pedir(msg.tema).then(res => {
      const d = res.diseno;
      AU.guardado = { tema:msg.tema, d };
      chrome.storage.local.set({ activo:true, guardado:AU.guardado });
      pantalla.listo(d);
      setTimeout(() => { vestir(d); vigilar(); }, 900);
      responder({ ok:true, titulo:d.titulo });
    }).catch(e => {
      pantalla.fallo(e.message);
      aviso('No pude hablar con la conexión: ' + e.message +
            '. ¿Está corriendo el servidor?', 8000);
      responder({ ok:false, error:e.message });
    });
    return true;
  }
});

/* ============ 9. AL ABRIR LA PAGINA ============ */
chrome.storage.local.get(['activo','guardado'], v => {
  if(v.activo && v.guardado && v.guardado.d){
    AU.guardado = v.guardado;
    vestir(v.guardado.d);
    vigilar();
  }
});
