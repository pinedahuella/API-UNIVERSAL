/* API UNIVERSAL sobre una pagina que ya existe.
   No toca el servidor de nadie: solo cambia el DOM en este navegador.
   Lee la estructura, se la manda a la conexion y aplica lo que devuelve. */

const AU = {
  SERVIDOR: 'http://localhost:4321',
  guardado: null,
  puesto: false
};

/* ---------- lo que se le manda a la conexion: puro esqueleto ---------- */
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

/* ---------- fuentes que existen sin bajar nada ---------- */
const PILAS = {
  'Fredoka':          '"Segoe UI Rounded","Trebuchet MS",Verdana,sans-serif',
  'Quicksand':        '"Trebuchet MS",Verdana,"Segoe UI",sans-serif',
  'Bebas Neue':       '"Haettenschweiler","Arial Narrow",Impact,sans-serif',
  'Space Grotesk':    '"Segoe UI",system-ui,Arial,sans-serif',
  'Playfair Display': 'Georgia,"Times New Roman",serif',
  'Lora':             'Georgia,"Book Antiqua",serif'
};
const pila = n => PILAS[n] || PILAS['Space Grotesk'];

/* ---------- aplicar ---------- */
function vestir(d, sel){
  const raiz = document.documentElement;
  raiz.setAttribute('data-au', '1');
  const p = raiz.style;
  p.setProperty('--au-acento',  d.acento);
  p.setProperty('--au-acento2', d.acento2);
  p.setProperty('--au-fondo',   d.fondo);
  p.setProperty('--au-papel',   d.oscuro ? aclarar(d.fondo, 12) : '#ffffff');
  p.setProperty('--au-tinta',   d.oscuro ? '#f2f5fb' : '#12171f');
  p.setProperty('--au-linea',   d.oscuro ? aclarar(d.fondo, 22) : mezclar(d.acento, .78));
  p.setProperty('--au-radio',   d.radio || '18px');
  p.setProperty('--au-tit',     pila(d.fuente_tit));
  p.setProperty('--au-txt',     pila(d.fuente_txt));

  fondo(d);
  barra(d);
  tarjeta(d);
  marcar(sel);
  AU.puesto = true;
}

/* el fondo va directo en el body: si se pone en un div encima, tapa la barra */
function fondo(d){
  const a = conAlfa(d.acento, d.oscuro ? .26 : .40);
  const b = conAlfa(d.acento2, d.oscuro ? .22 : .34);
  /* OJO: los motivos se quedan como arreglo. Si se juntan en un texto y se indexa
     con [0], sale MEDIO emoji (media pareja subrogada) y encodeURIComponent revienta
     con "URI malformed". */
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
}

function barra(d){
  let b = document.getElementById('au-barra');
  if(!b){
    b = document.createElement('div');
    b.id = 'au-barra';
    document.body.appendChild(b);
  }
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
  if(!c){
    c = document.createElement('div');
    c.id = 'au-tarjeta';
    destino.prepend(c);
  }
  c.innerHTML = '';
  const et = document.createElement('span'); et.className = 'au-etiqueta';
  et.textContent = 'Armado por la conexión';
  const h = document.createElement('h2'); h.textContent = d.titulo || 'Tu página';
  const p = document.createElement('p'); p.textContent = d.bienvenida || '';
  const dec = document.createElement('span'); dec.className = 'au-deco';
  dec.textContent = (d.motivos || []).join('');
  c.append(et, h, p, dec);
}

/* marca lo que la conexion dijo que hay que vestir */
function marcar(sel){
  document.querySelectorAll('.au-zona,.au-tarjeta,.au-tit')
    .forEach(e => e.classList.remove('au-zona','au-tarjeta','au-tit'));
  const poner = (lista, clase) => (lista || []).forEach(s => {
    try { document.querySelectorAll(s).forEach(e => e.classList.add(clase)); } catch(e){}
  });
  poner(sel.zonas, 'au-zona');
  poner(sel.tarjetas, 'au-tarjeta');
  poner(sel.titulos, 'au-tit');
  /* por si la conexion no acertó: las imágenes en rejilla siempre se redondean */
  document.querySelectorAll('main img').forEach(i => {
    const r = i.getBoundingClientRect();
    if(r.width > 100 && r.height > 100) i.parentElement?.classList.add('au-tarjeta');
  });
}

function quitar(){
  document.documentElement.removeAttribute('data-au');
  ['au-barra','au-tarjeta','au-aviso'].forEach(id => document.getElementById(id)?.remove());
  ['background-image','background-repeat','background-attachment']
    .forEach(k => document.body.style.removeProperty(k));
  document.querySelectorAll('.au-zona,.au-tarjeta,.au-tit')
    .forEach(e => e.classList.remove('au-zona','au-tarjeta','au-tit'));
  AU.puesto = false;
  chrome.storage.local.set({ activo:false });
}

/* ---------- colores ---------- */
function nums(h){ const n = parseInt(h.replace('#',''),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function conAlfa(h,a){ const [r,g,b] = nums(h); return `rgba(${r},${g},${b},${a})`; }
function mezclar(h,blanco){ const [r,g,b] = nums(h); const m = v => Math.round(v+(255-v)*blanco); return `rgb(${m(r)},${m(g)},${m(b)})`; }
function aclarar(h,cuanto){ const [r,g,b] = nums(h); const s = v => Math.min(255, v+cuanto); return `rgb(${s(r)},${s(g)},${s(b)})`; }

/* ---------- pedirle el diseño a la conexion ---------- */
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

/* ---------- ordenes del popup ---------- */
chrome.runtime.onMessage.addListener((msg, _o, responder) => {
  if(msg.tipo === 'estado'){
    responder({ puesto: AU.puesto, tema: AU.guardado?.tema || '' });
    return true;
  }
  if(msg.tipo === 'quitar'){ quitar(); responder({ ok:true }); return true; }
  if(msg.tipo === 'vestir'){
    aviso('Leyendo la página y pidiéndole el diseño a la conexión...');
    pedir(msg.tema).then(res => {
      AU.guardado = { tema:msg.tema, d:res.diseno, sel:res.selectores || {} };
      chrome.storage.local.set({ activo:true, guardado:AU.guardado });
      vestir(res.diseno, res.selectores || {});
      aviso('Listo. Esta página no cambió en Instagram, solo en tu navegador.', 6000);
      responder({ ok:true, titulo:res.diseno.titulo });
    }).catch(e => {
      aviso('No pude hablar con la conexión: ' + e.message + '. ¿Está corriendo el servidor?', 8000);
      responder({ ok:false, error:e.message });
    });
    return true;
  }
});

/* ---------- al abrir la pagina, si ya estaba puesto, se vuelve a poner ---------- */
chrome.storage.local.get(['activo','guardado'], v => {
  if(v.activo && v.guardado){
    AU.guardado = v.guardado;
    const poner = () => vestir(v.guardado.d, v.guardado.sel || {});
    poner();
    /* Instagram redibuja al navegar: lo volvemos a poner */
    let t = null;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => { if(!document.getElementById('au-barra')) poner(); else marcar(v.guardado.sel || {}); }, 700);
    }).observe(document.body, { childList:true, subtree:true });
  }
});
