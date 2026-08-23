/* El robot que arma tu pagina.
   Hace 5 preguntas y con eso diseña la pagina.
   Si el servidor local con Claude responde, el diseño lo hace Claude.
   Si no, lo arma el generador de aqui abajo. Nunca se queda sin respuesta. */

const PASOS = [
  { id:'nombre', pide:'nombre', ico:'👋',
    dice:['Hola. Todavía no soy nada, solo una página en blanco.',
          '¿Cómo te llamás?'],
    ph:'Tu nombre' },
  { id:'cuenta', pide:'cuenta', ico:'🔑',
    dice:n => [`Mucho gusto, ${n}.`, 'Elegí un usuario y una contraseña para entrar después.'],
    ph:'Usuario' },
  { id:'gustos', pide:'texto', ico:'❤️',
    dice:['Ahora lo importante.', '¿Qué te gusta? Escribime lo que se te venga: animales, deportes, música, lo que sea.'],
    ph:'Me gustan los gatos y la música...' },
  { id:'uso', pide:'opciones', ico:'🎯',
    dice:['Bien. ¿Y para qué querés usar tu página?'],
    ops:['Ver videos','Platicar con gente','Leer publicaciones','Un poco de todo'] },
  { id:'animo', pide:'opciones', ico:'🎨',
    dice:['Última. ¿Cómo querés que se sienta?'],
    ops:['Tranquila','Con energía','Elegante','Divertida'] }
];

const R = {};
let paso = 0;
let escribiendo = null;

const q  = s => document.querySelector(s);
const qq = s => [...document.querySelectorAll(s)];

/* ---------------- la foca ---------------- */
function dibujarFoca(){
  q('#mascota').innerHTML = `
  <svg viewBox="0 0 200 200" class="fc">
    <ellipse cx="100" cy="186" rx="52" ry="8" class="fc-sombra"/>
    <g class="fc-todo">
      <g class="fc-aleta-i"><ellipse cx="48" cy="140" rx="20" ry="12" class="fc-piel"/></g>
      <g class="fc-aleta-d"><ellipse cx="152" cy="140" rx="20" ry="12" class="fc-piel"/></g>
      <ellipse cx="82" cy="176" rx="18" ry="9" class="fc-piel"/>
      <ellipse cx="118" cy="176" rx="18" ry="9" class="fc-piel"/>
      <ellipse cx="100" cy="130" rx="56" ry="50" class="fc-piel"/>
      <ellipse cx="100" cy="142" rx="38" ry="34" class="fc-panza"/>
      <circle cx="100" cy="80" r="46" class="fc-piel"/>
      <ellipse cx="100" cy="96" rx="30" ry="24" class="fc-panza"/>
      <ellipse cx="78" cy="98" rx="11" ry="8" class="fc-cachete"/>
      <ellipse cx="122" cy="98" rx="11" ry="8" class="fc-cachete"/>
      <g class="fc-ojos">
        <ellipse cx="84" cy="74" rx="7.5" ry="9" class="fc-ojo"/>
        <ellipse cx="116" cy="74" rx="7.5" ry="9" class="fc-ojo"/>
        <circle cx="86.5" cy="70.5" r="2.6" class="fc-brillo"/>
        <circle cx="118.5" cy="70.5" r="2.6" class="fc-brillo"/>
      </g>
      <path d="M94 90 Q100 96 106 90" class="fc-nariz"/>
      <path d="M100 94 L100 99" class="fc-linea"/>
      <path d="M92 101 Q100 107 108 101" class="fc-boca"/>
      <g class="fc-bigotes">
        <path d="M74 92 L58 88"/><path d="M74 97 L57 97"/>
        <path d="M126 92 L142 88"/><path d="M126 97 L143 97"/>
      </g>
    </g>
  </svg>`;
}

function focaEstado(clase){
  q('#mascota').className = 'mascota ' + (clase || '');
}

/* ---------------- decir ---------------- */
function decir(lineas, luego){
  clearTimeout(escribiendo);
  const caja = q('#dice');
  caja.innerHTML = '';
  focaEstado('hablando');
  let i = 0;
  const siguiente = () => {
    if(i >= lineas.length){ focaEstado(''); if(luego) luego(); return; }
    const p = document.createElement('p');
    caja.appendChild(p);
    const txt = lineas[i++];
    let j = 0;
    const teclear = () => {
      p.textContent = txt.slice(0, ++j);
      if(j < txt.length) escribiendo = setTimeout(teclear, 18);
      else escribiendo = setTimeout(siguiente, 260);
    };
    teclear();
  };
  siguiente();
}

/* ---------------- preguntas ---------------- */
function mostrarPaso(){
  const p = PASOS[paso];
  const zona = q('#responde');
  zona.innerHTML = '';
  zona.classList.remove('visible');

  q('#ico').textContent = p.ico || '';
  q('#ico').className = 'ico entra';
  const lineas = typeof p.dice === 'function' ? p.dice(R.nombre) : p.dice;
  decir(lineas, () => {
    if(p.pide === 'opciones'){
      zona.innerHTML = '<div class="ops">' +
        p.ops.map(o => `<button class="op">${o}</button>`).join('') + '</div>';
      qq('.op').forEach(b => b.onclick = () => { guardar(p.id, b.textContent); });
    } else if(p.pide === 'cuenta'){
      zona.innerHTML = `<div class="campo doble">
        <input type="text" id="in-user" placeholder="Usuario" autocomplete="off">
        <input type="password" id="in-pass" placeholder="Contraseña">
        <button class="ok" id="ok">→</button></div>
        <p class="aviso-chico" id="aviso-chico"></p>`;
      q('#ok').onclick = mandarCuenta;
      q('#in-pass').onkeydown = e => { if(e.key === 'Enter') mandarCuenta(); };
      q('#in-user').onkeydown = e => { if(e.key === 'Enter') q('#in-pass').focus(); };
      q('#in-user').focus();
    } else {
      zona.innerHTML = `<div class="campo">
        <input type="text" id="in" placeholder="${p.ph}" autocomplete="off">
        <button class="ok" id="ok">→</button></div>`;
      const inp = q('#in');
      const mandar = () => { if(inp.value.trim()) guardar(p.id, inp.value.trim()); };
      q('#ok').onclick = mandar;
      inp.onkeydown = e => { if(e.key === 'Enter') mandar(); };
      inp.focus();
    }
    zona.classList.add('visible');
  });
}

function mandarCuenta(){
  const us = q('#in-user').value.trim().toLowerCase();
  const pw = q('#in-pass').value;
  const av = q('#aviso-chico');
  if(us.length < 2){ av.textContent = 'Poné un usuario un poco más largo.'; return; }
  if(pw.length < 4){ av.textContent = 'La contraseña necesita 4 caracteres o más.'; return; }

  const ya = base()[us];
  if(ya){
    if(ya.pass !== pw){ av.textContent = 'Ese usuario ya existe y esa no es su contraseña.'; return; }
    /* ya nos conocemos: se entra directo, sin repetir las preguntas */
    q('#responde').classList.remove('visible');
    focaEstado('listo');
    decir([`¡${ya.nombre}! Ya nos conocíamos.`, 'Te llevo a tu página.'], () => {
      setTimeout(() => {
        q('#hola').classList.add('fuera');
        setTimeout(() => { q('#hola').hidden = true; entrar(ya, false); }, 620);
      }, 700);
    });
    return;
  }
  R.user = us; R.pass = pw;
  guardar('cuenta', us);
}

let pedido = null;

/* apenas dice que le gusta, Claude empieza a trabajar mientras contesta lo demas */
function adelantarPedido(){
  pedido = fetch('/api/disenar', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ nombre:R.nombre, gustos:R.gustos })
  }).then(r => r.ok ? r.json() : null).catch(() => null);
}

function guardar(id, valor){
  R[id] = valor;
  if(id === 'gustos') adelantarPedido();
  paso++;
  q('#responde').classList.remove('visible');
  q('#progreso-in').style.width = (paso / PASOS.length * 100) + '%';
  if(paso < PASOS.length) setTimeout(mostrarPaso, 260);
  else setTimeout(construir, 300);
}

/* ---------------- construir la pagina ---------------- */
const ESPERAS = [
  ['Dame un segundo.', 'Te estoy armando la página...'],
  ['Escogiendo los colores que te van...'],
  ['Buscándote contenido de eso...'],
  ['Casi. No quiero entregarte algo feo.']
];

async function construir(){
  q('#responde').innerHTML = '';
  focaEstado('pensando');
  q('#progreso').classList.add('trabajando');

  let n = 0;
  decir(ESPERAS[0]);
  const charla = setInterval(() => { n++; decir(ESPERAS[n % ESPERAS.length]); }, 5200);

  let d = null, fuente = 'local';
  try {
    const crudo = await Promise.race([
      pedido || Promise.resolve(null),
      new Promise(r => setTimeout(() => r(null), 75000))
    ]);
    if(crudo && Array.isArray(crudo.videos)){ d = crudo; fuente = 'claude'; }
  } catch(e){ /* sin servidor */ }

  clearInterval(charla);

  if(!d) d = generarLocal(R);
  d = sanear(d);
  d = segunElAnimo(d, R.animo);

  focaEstado('listo');
  q('#progreso').classList.remove('trabajando');
  decir([d.bienvenida || `Listo, ${R.nombre}. Mirá cómo te quedó.`], () => {
    setTimeout(() => arrancarApp(d, fuente), 1000);
  });
}

/* lo que eligio en las ultimas dos preguntas se aplica encima */
function segunElAnimo(d, animo){
  const a = ANIMO[animo];
  if(!a) return d;
  return Object.assign({}, d, {
    tit: FUENTES[a.tit] || d.tit,
    txt: FUENTES[a.txt] || d.txt,
    radio: a.radio,
    mayus: a.mayus,
    aire: d.aire || a.aire
  });
}

/* ---------------- generador local ---------------- */
const CLAVES = {
  perros:['perro','perros','cachorro','canino','mascota','pastor','labrador'],
  gatos:['gato','gata','gatos','michi','felino','minino'],
  futbol:['futbol','fútbol','pelota','cancha','balon','balón','deporte','gol','soccer','basket','deportes'],
  musica:['musica','música','cancion','canción','banda','guitarra','cantar','rock','reggaeton','audifonos'],
  tecnologia:['tecnologia','tecnología','programar','codigo','código','computadora','pc','ia','software','celular','robot'],
  comida:['comida','cocinar','cocina','comer','receta','postre','taco','pan','restaurante'],
  viajes:['viaje','viajar','viajes','playa','montaña','turismo','conocer','mundo','avion','avión'],
  videojuegos:['videojuego','videojuegos','juego','juegos','gamer','jugar','consola','play','xbox'],
  autos:['auto','autos','carro','carros','moto','mecanica','mecánica','motor','manejar','vehiculo'],
  arte:['arte','dibujar','dibujo','pintar','pintura','diseño','diseno','crear','museo','teatro']
};
const ANIMO = {
  'Tranquila':   { radio:'24px', mayus:false, tit:'Quicksand',        txt:'Quicksand',      aire:'Suave y sin prisa' },
  'Con energía': { radio:'4px',  mayus:true,  tit:'Bebas Neue',       txt:'Space Grotesk',  aire:'Recto y con fuerza' },
  'Elegante':    { radio:'16px', mayus:false, tit:'Playfair Display', txt:'Lora',           aire:'Serio y bien vestido' },
  'Divertida':   { radio:'26px', mayus:false, tit:'Fredoka',          txt:'Quicksand',      aire:'Redondo y juguetón' }
};

const EMOJI_PISTAS = [
  [['libro','literat','poes','leer','novela','escrib','griego','latin','filosof'],'📚','#8a5a2b','#c08a55','#f6efe3',['📖','🏛️','✒️','🕯️']],
  [['plant','jardin','flor','natural','bosque','arbol'],'🌿','#2f8f5b','#6bc493','#eaf6ee',['🌱','🌸','🍃','🪴']],
  [['espacio','astro','planeta','estrella','universo','nasa'],'🪐','#6c5ce7','#a29bfe','#12102a',['🌌','🚀','🔭','✨']],
  [['pesca','mar','oceano','playa','buce','surf'],'🌊','#0e8ab5','#57c4de','#e4f4fa',['🐟','⛵','🐚','🏖️']],
  [['histor','antigu','museo','arqueolog','imperio','guerra'],'🏛️','#8a6d3b','#c1a377','#f5efe2',['📜','⚔️','🗿','🏺']],
  [['bail','danz','salsa','cumbia','merengue'],'💃','#d63384','#f06fae','#fdeaf4',['🕺','🎶','👠','🪩']],
  [['gym','ejercicio','pesas','correr','fitness','deport'],'🏋️','#e05a1f','#f4914f','#fdefe6',['💪','🏃','🥇','⏱️']],
  [['cine','pelicul','serie','actor','film'],'🎬','#b5322f','#e07a6f','#1a1013',['🍿','🎥','⭐','🎞️']],
  [['moda','ropa','estilo','vestir','diseñ'],'👗','#b5476f','#e08ba8','#fbecf1',['👠','🧵','💄','🕶️']],
  [['dinero','negocio','emprend','finanz','invers'],'📈','#1f7a5c','#5cbf9a','#eaf6f1',['💼','💰','📊','🤝']]
];

function inventarTema(txt){
  const t = txt.toLowerCase();
  for(const [claves, emoji, c1, c2, fondo, motivos] of EMOJI_PISTAS){
    if(claves.some(k => t.includes(k))){
      return { emoji, color:c1, c2, fondo, motivos, oscuro: fondo.length === 7 && parseInt(fondo.slice(1,3),16) < 60 };
    }
  }
  const semilla = [...txt].reduce((a,c) => a + c.charCodeAt(0), 0);
  const tono = semilla % 360;
  return { emoji:'✨', color:`hsl(${tono} 62% 46%)`, c2:`hsl(${(tono+28)%360} 66% 62%)`,
           fondo:`hsl(${tono} 46% 95%)`, motivos:['✨','💡','🔎','📌'], oscuro:false };
}

function generarLocal(r){
  const txt = (r.gustos || '').toLowerCase();
  const puntos = {};
  Object.entries(CLAVES).forEach(([id, ps]) => {
    ps.forEach(p => { if(txt.includes(p)) puntos[id] = (puntos[id] || 0) + 1; });
  });
  const elegidos = Object.entries(puntos).sort((a,b) => b[1] - a[1]).slice(0,2).map(([k]) => k);
  const a = ANIMO[r.animo] || ANIMO['Tranquila'];

  /* si algo de lo que dijo encaja, se usa. Si no, se inventa el tema con sus palabras. */
  let nombre, inv;
  if(elegidos.length){
    const base = T(elegidos[0]);
    nombre = base.nombre;
    inv = { emoji:base.emoji, color:base.color, c2:base.c2,
            fondo:base.est.fondo, motivos:base.motivos, oscuro:!!base.est.oscuro };
  } else {
    nombre = (r.gustos || 'Lo tuyo').replace(/^(me\s+)?(gusta|gustan|encanta|encantan)\s+/i,'')
              .split(/[,.]| y /)[0].trim().slice(0,26) || 'Lo tuyo';
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    inv = inventarTema(r.gustos || '');
  }

  return {
    tema: { nombre, emoji:inv.emoji, motivos:inv.motivos, saludo:'Hola' },
    videos: [
      { titulo:`Todo sobre ${nombre}, para empezar`, canal:nombre, dur:'6:24' },
      { titulo:`Lo que nadie te cuenta de ${nombre}`, canal:nombre, dur:'9:11' },
      { titulo:`${nombre}: cinco cosas que deberías saber`, canal:'Al grano', dur:'4:38' },
      { titulo:`Una tarde entera de ${nombre}`, canal:'Sin prisa', dur:'12:05' }
    ],
    publicaciones: [
      { titulo:`¿Por dónde empiezo con ${nombre}?`, texto:'Cualquier consejo me sirve, ando perdido.' },
      { titulo:`Lo mejor de ${nombre} este año`, texto:'Armemos la lista entre todos.' },
      { titulo:`${nombre}: lo que más me costó`, texto:'A ver si a alguien más le pasó lo mismo.' }
    ],
    intereses: elegidos,
    titulo: nombre,
    bienvenida: `Listo, ${r.nombre}. Me dijiste que te gusta ${(r.gustos||'').slice(0,60)}, ` +
                `así que te armé la página alrededor de eso. Todo lo que abras de aquí en adelante la va a seguir cambiando.`,
    aire: a.aire,
    acento: inv.color, acento2: inv.c2, fondo: inv.fondo, oscuro: !!inv.oscuro,
    fuente_tit: a.tit, fuente_txt: a.txt, radio: a.radio, mayus: a.mayus
  };
}

/* ---------------- limpiar lo que llegue ---------------- */
const FUENTES = {
  'Fredoka':"'Fredoka','Segoe UI',sans-serif",
  'Quicksand':"'Quicksand','Segoe UI',sans-serif",
  'Bebas Neue':"'Bebas Neue','Arial Narrow',sans-serif",
  'Space Grotesk':"'Space Grotesk','Segoe UI',sans-serif",
  'Playfair Display':"'Playfair Display',Georgia,serif",
  'Lora':"'Lora',Georgia,serif"
};
const hex = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())) ? v.trim() : null;

function sanear(d){
  const validos = TEMAS.map(t => t.id);
  const ints = (d.intereses || []).filter(x => validos.includes(x)).slice(0,2);
  const apoyo = ints.length ? T(ints[0]) : T('tecnologia');

  const acento  = hex(d.acento)  || apoyo.color;
  const acento2 = hex(d.acento2) || apoyo.c2;
  const oscuro  = d.oscuro === true;
  const fondo   = hex(d.fondo) || (oscuro ? '#161826' : apoyo.est.fondo);

  /* el tema propio: lo que la persona dijo, aunque no exista en nuestra lista */
  const tm = d.tema || {};
  const emojis = (Array.isArray(tm.motivos) ? tm.motivos : []).filter(x => typeof x === 'string' && x.length <= 4);
  const propio = {
    nombre: String(tm.nombre || (ints.length ? apoyo.nombre : 'Lo tuyo')).slice(0,26),
    emoji: (typeof tm.emoji === 'string' && tm.emoji.length <= 4) ? tm.emoji : (emojis[0] || apoyo.emoji),
    motivos: emojis.length >= 3 ? emojis.slice(0,4) : apoyo.motivos,
    saludo: String(tm.saludo || apoyo.saludo).slice(0,20)
  };

  const videos = (Array.isArray(d.videos) ? d.videos : [])
    .filter(v => v && v.titulo).slice(0,6)
    .map(v => ({ tit:String(v.titulo).slice(0,80),
                 canal:String(v.canal || propio.nombre).slice(0,30),
                 dur:/^\d{1,2}:\d{2}$/.test(String(v.dur || '')) ? v.dur : '4:20' }));

  const posts = (Array.isArray(d.publicaciones) ? d.publicaciones : [])
    .filter(x => x && x.titulo).slice(0,4)
    .map(x => [String(x.titulo).slice(0,90), String(x.texto || '').slice(0,180)]);

  return {
    intereses: ints,
    propio, videos, posts,
    titulo: String(d.titulo || propio.nombre).slice(0,40),
    bienvenida: String(d.bienvenida || '').slice(0,340),
    aire: String(d.aire || apoyo.est.aire).slice(0,44),
    acento, acento2, fondo, oscuro,
    tit: FUENTES[d.fuente_tit] || apoyo.est.tit,
    txt: FUENTES[d.fuente_txt] || apoyo.est.txt,
    radio: /^[\d.]+px$/.test(String(d.radio || '')) ? d.radio : apoyo.est.r,
    mayus: d.mayus === true,
    motivos: propio.motivos,
    saludo: propio.saludo
  };
}

/* ---------------- entrar a la app ---------------- */
function arrancarApp(d, fuente){
  /* el tema que inventó Claude se mete al catálogo como uno más */
  const id = 'propio';
  const est = {
    tit:d.tit, txt:d.txt, r:d.radio, rs:d.radio, av:'50%',
    tt:d.mayus ? 'uppercase' : 'none', ls:'0', borde:'1px solid',
    som:'0 10px 26px rgba(0,0,0,.12)', aire:d.aire,
    fondo:d.fondo, oscuro:d.oscuro,
    papel:d.oscuro ? aclarar(d.fondo, .10) : '#ffffff',
    linea:d.oscuro ? aclarar(d.fondo, .18) : null
  };
  const existente = TEMAS.findIndex(t => t.id === id);
  const tema = { id, nombre:d.propio.nombre, emoji:d.propio.emoji,
                 color:d.acento, c2:d.acento2, motivos:d.propio.motivos,
                 saludo:d.propio.saludo, est };
  if(existente >= 0) TEMAS[existente] = tema; else TEMAS.unshift(tema);

  for(let i = VIDEOS.length - 1; i >= 0; i--) if(VIDEOS[i].t === id) VIDEOS.splice(i, 1);
  const mios = (d.videos.length ? d.videos : [
    { tit:'Lo mejor de ' + d.propio.nombre, canal:d.propio.nombre, dur:'5:00' },
    { tit:d.propio.nombre + ' para empezar', canal:d.propio.nombre, dur:'8:12' }
  ]).map(v => ({ t:id, tit:v.tit, canal:v.canal, dur:v.dur }));
  VIDEOS.unshift(...mios);

  POSTS[id] = d.posts.length ? d.posts
    : [['¿Por dónde empiezo con ' + d.propio.nombre + '?', 'Cualquier consejo me sirve.']];

  const pesos = {};
  TEMAS.forEach(t => pesos[t.id] = 0);
  pesos[id] = 16;
  d.intereses.forEach((x,i) => pesos[x] = 9 - i * 3);

  const usuario = {
    user:R.user, nombre:R.nombre, pass:R.pass,
    pesos, vistos:[], marcados:[], coment:{}, hist:[],
    diseno:Object.assign({}, d, { intereses:[id].concat(d.intereses) }), fuente
  };
  q('#hola').classList.add('fuera');
  setTimeout(() => {
    q('#hola').hidden = true;
    entrar(usuario, true, d.bienvenida);
  }, 620);
}

function aclarar(hexc, cuanto){
  const n = parseInt(hexc.slice(1), 16);
  const s = v => Math.min(255, Math.round(v + 255 * cuanto));
  return `rgb(${s((n>>16)&255)},${s((n>>8)&255)},${s(n&255)})`;
}

/* ---------------- arranque ---------------- */
dibujarFoca();
mostrarPaso();


