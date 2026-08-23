/* API UNIVERSAL - demostracion
   Todo corre en el navegador, no hay servidor.
   Al registrarse no se le pregunta nada. La pagina aprende de los videos
   que abre, de los que marca y de lo que comenta. */

const TEMAS = [
  { id:'perros', nombre:'Perros', emoji:'🐶', color:'#e08b3a', c2:'#f0b56a',
    motivos:['🐾','🦴','🐕','🎾'], saludo:'Guau' },
  { id:'gatos', nombre:'Gatos', emoji:'🐱', color:'#8b5cf6', c2:'#b794f6',
    motivos:['🧶','🐾','🐈','🐟'], saludo:'Miau' },
  { id:'futbol', nombre:'Fútbol', emoji:'⚽', color:'#22a06b', c2:'#5fce9c',
    motivos:['⚽','🥅','🏆','🏟️'], saludo:'Gol' },
  { id:'musica', nombre:'Música', emoji:'🎧', color:'#e0407f', c2:'#f37aa8',
    motivos:['🎵','🎸','🎹','🎶'], saludo:'Subile' },
  { id:'tecnologia', nombre:'Tecnología', emoji:'💻', color:'#3b76f6', c2:'#7aa5fb',
    motivos:['⚙️','🔌','🖥️','💾'], saludo:'Arrancá' },
  { id:'comida', nombre:'Comida', emoji:'🍜', color:'#e05a3a', c2:'#f38f76',
    motivos:['🌮','🥑','🍅','🍳'], saludo:'Provecho' },
  { id:'viajes', nombre:'Viajes', emoji:'✈️', color:'#0e9bb5', c2:'#54c6da',
    motivos:['🧳','🗺️','⛰️','🏝️'], saludo:'Buen viaje' },
  { id:'videojuegos', nombre:'Videojuegos', emoji:'🎮', color:'#6d4df6', c2:'#9d87fa',
    motivos:['👾','🕹️','🎲','🏅'], saludo:'A jugar' },
  { id:'autos', nombre:'Autos', emoji:'🚗', color:'#455571', c2:'#7d8ca6',
    motivos:['🛞','🔧','🛣️','⛽'], saludo:'Arrancamos' },
  { id:'arte', nombre:'Arte', emoji:'🎨', color:'#c0392b', c2:'#e07a6f',
    motivos:['🖌️','🖼️','✏️','🎭'], saludo:'A crear' }
];
const T = id => TEMAS.find(t => t.id === id);

const VIDEOS = [
  { t:'perros', tit:'Rocky aprende a dar la pata en tres días', canal:'Casa Rocky', dur:'4:12' },
  { t:'perros', tit:'Seis cachorros buscando casa este sábado', canal:'Adopta GT', dur:'2:05' },
  { t:'gatos',  tit:'Mi gata decidió que el teclado es su cama', canal:'Michi Diario', dur:'1:48' },
  { t:'gatos',  tit:'Rascador hecho en casa por 30 quetzales', canal:'Hazlo Vos', dur:'6:30' },
  { t:'futbol', tit:'El penal del domingo, jugada por jugada', canal:'La Tribuna', dur:'8:22' },
  { t:'futbol', tit:'Cascarita del sábado: los mejores goles', canal:'Cancha 5', dur:'3:40' },
  { t:'musica', tit:'La lista para estudiar que sí funciona', canal:'Sonido Bajo', dur:'12:01' },
  { t:'musica', tit:'Una banda de acá que nadie está oyendo', canal:'Sonido Bajo', dur:'5:16' },
  { t:'tecnologia', tit:'Le puse Linux a una laptop de ocho años', canal:'Taller Digital', dur:'9:45' },
  { t:'tecnologia', tit:'Ordené todos los cables de mi escritorio', canal:'Taller Digital', dur:'4:58' },
  { t:'comida', tit:'El pepián de mi abuela, paso a paso', canal:'Cocina de Casa', dur:'14:20' },
  { t:'comida', tit:'Pan casero al segundo intento', canal:'Cocina de Casa', dur:'7:03' },
  { t:'viajes', tit:'Semuc Champey en temporada baja', canal:'Ruta Corta', dur:'10:37' },
  { t:'viajes', tit:'Antigua en dos días y sin gastar mucho', canal:'Ruta Corta', dur:'6:12' },
  { t:'videojuegos', tit:'Ese final no me lo esperaba', canal:'Sin Pausa', dur:'11:09' },
  { t:'videojuegos', tit:'Juegos de hace 20 años que aguantan', canal:'Sin Pausa', dur:'8:54' },
  { t:'autos', tit:'Cambio de aceite sin ir al taller', canal:'Garaje 12', dur:'5:47' },
  { t:'autos', tit:'300 mil kilómetros y arranca a la primera', canal:'Garaje 12', dur:'3:29' },
  { t:'arte', tit:'Mi primer cuadro al óleo', canal:'Trazo Lento', dur:'7:41' },
  { t:'arte', tit:'Dibujar 15 minutos diarios sí sirve', canal:'Trazo Lento', dur:'4:05' }
];

const POSTS = {
  perros:[['¿Qué croqueta le dan a un cachorro de 3 meses?','Ando probando marcas y no me decido.']],
  gatos:[['¿Por qué amasan con las patitas?','Leí que es de cuando eran bebés y no lo pierden nunca.']],
  futbol:[['Alineación para el clásico','Yo pondría al 10 por la banda, ¿ustedes?']],
  musica:[['¿Audífonos o parlante para trabajar?','Yo ya no puedo sin audífonos.']],
  tecnologia:[['¿Vale la pena aprender a programar en 2026?','Con la IA la duda es qué aprender, no si aprender.']],
  comida:[['Lugar de tacos en la sexta','Barato y abre hasta tarde.']],
  viajes:[['Consejos para viajar barato','Reservar entre semana cambia todo.']],
  videojuegos:[['¿Alguien para jugar en cooperativo?','Busco gente tranquila, sin gritos.']],
  autos:[['¿Eléctrico en Guatemala ya conviene?','Lo dudo por los cargadores.']],
  arte:[['Exposición gratis este fin','Vale la pena darse la vuelta.']]
};

/* publicaciones que mezclan dos temas: salen si le gustan los dos */
const COMBOS = [
  { t:['perros','viajes'],       tit:'Me llevé al perro de viaje y fue la mejor idea', txt:'Aguantó las cuatro horas de carretera mejor que yo.' },
  { t:['perros','futbol'],       tit:'Mi perro se metió a la cancha en pleno partido', txt:'Paramos veinte minutos y nadie se enojó.' },
  { t:['gatos','musica'],        tit:'A mi gata le gusta una sola canción', txt:'Se acuesta en la bocina cada vez que suena.' },
  { t:['gatos','tecnologia'],    tit:'Le hice una puertita automática al gato', txt:'Un sensor, un motorcito y ya entra solo.' },
  { t:['futbol','comida'],       tit:'Qué comer viendo el partido sin que se enfríe', txt:'Lo mío son las tostadas, no fallan.' },
  { t:['tecnologia','videojuegos'], tit:'Armé la computadora con lo justo para jugar', txt:'Me salió la mitad de lo que pedían por una hecha.' },
  { t:['musica','arte'],         tit:'Pinté escuchando la misma lista tres semanas', txt:'El cuadro salió con el color de esa música.' },
  { t:['viajes','comida'],       tit:'Comí en un mercado de pueblo y no lo olvido', txt:'Veinte quetzales y me levanté lleno.' },
  { t:['autos','viajes'],        tit:'Carretera al Atlántico en carro propio', txt:'Salir de madrugada cambia todo el viaje.' },
  { t:['videojuegos','arte'],    tit:'Dibujé a mi personaje favorito del juego', txt:'Me tardé más en la armadura que en la cara.' },
  { t:['autos','tecnologia'],    tit:'Le puse pantalla al carro con una tablet vieja', txt:'Quedó mejor que la radio que traía.' },
  { t:['perros','gatos'],        tit:'Perro y gato en la misma casa, ¿se puede?', txt:'Los primeros días fue guerra, ahora duermen juntos.' }
];

const NOMBRES = ['Ana','Luis','Sofía','Diego','Marta','Kevin','Lucía','Pablo','Rita','Andrés','Vale','Nico'];

/* ---------------- estado ---------------- */
const LS = 'apiuniversal_v3';
let u = null;              // usuario en sesion
let videoActual = null;
let reloj = null;

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const base = () => JSON.parse(localStorage.getItem(LS) || '{}');
const grabar = o => localStorage.setItem(LS, JSON.stringify(o));
const salvar = () => { const b = base(); b[u.user] = u; grabar(b); };
const iniciales = n => n.trim().slice(0,2).toUpperCase();

/* ============ LA CONEXION ============
   Recibe el perfil y devuelve como se arma la pantalla. */
function consultar(p){
  const orden = Object.entries(p.pesos).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]);
  const total = orden.reduce((s,[,v]) => s + v, 0) || 1;
  const conoce = orden.length > 0;
  const activos = orden.map(([k]) => k);
  return {
    conoce,
    principal: conoce ? orden[0][0] : null,
    reparto: orden.slice(0,4).map(([k,v]) => ({ t:k, pct: Math.round(v / total * 100) })),
    orden: activos,
    nuevos: TEMAS.map(t => t.id).filter(id => !activos.includes(id)),
    mezclas: COMBOS.filter(c => c.t.every(x => activos.includes(x))).slice(0,2)
  };
}

/* ---------------- dibujos ---------------- */
function escena(temaId, w){
  const t = T(temaId);
  const s = (t.nombre.length * 37) % 100;
  const burbujas = [0,1,2,3,4,5].map(n => {
    const x = (s * (n + 2) * 17) % 100;
    const y = (s * (n + 4) * 11) % 100;
    const r = 5 + ((s + n * 13) % 13);
    return `<circle cx="${x}%" cy="${y}%" r="${r}" fill="#fff" opacity="${0.07 + (n % 3) * 0.05}"/>`;
  }).join('');
  const sueltos = t.motivos.slice(0,3).map((m,i) => {
    const x = [42, 268, 232][i], y = [58, 62, 150][i], tam = [30, 26, 22][i];
    return `<text x="${x}" y="${y}" font-size="${tam}" text-anchor="middle" opacity=".62">${m}</text>`;
  }).join('');
  const g = 'g' + temaId + (w || '');
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.color}"/><stop offset="1" stop-color="${t.c2}"/>
    </linearGradient></defs>
    <rect width="320" height="180" fill="url(#${g})"/>${burbujas}${sueltos}
    <text class="flota" x="160" y="120" font-size="64" text-anchor="middle">${t.emoji}</text>
  </svg>`;
}

/* fondo de toda la pagina con los elementos del tema */
function patron(t){
  const piezas = [t.emoji, ...t.motivos];
  const puestos = [[30,52,30,-14],[128,26,20,12],[196,86,26,8],[74,140,22,18],
                   [166,168,28,-9],[236,42,18,20],[16,116,17,7],[210,140,20,-16]];
  const cuerpo = puestos.map((p,i) =>
    `<text x="${p[0]}" y="${p[1]}" font-size="${p[2]}" transform="rotate(${p[3]} ${p[0]} ${p[1]})">${piezas[i % piezas.length]}</text>`
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="200" opacity="0.055">${cuerpo}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function mezclarColor(hex, blanco){
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = v => Math.round(v + (255 - v) * blanco);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/* aqui se viste toda la pagina con el tema */
function vestir(t){
  const raiz = document.documentElement.style;
  if(!t){
    raiz.setProperty('--acento', '#5b6cff');
    raiz.setProperty('--acento-suave', '#eef0ff');
    raiz.setProperty('--fondo', '#f6f7fb');
    raiz.setProperty('--linea', '#e6e8f0');
    raiz.setProperty('--franja', 'linear-gradient(90deg,#5b6cff,#8b5cf6)');
    document.body.style.backgroundImage = 'none';
    return;
  }
  raiz.setProperty('--acento', t.color);
  raiz.setProperty('--acento-suave', mezclarColor(t.color, .90));
  raiz.setProperty('--fondo', mezclarColor(t.color, .955));
  raiz.setProperty('--linea', mezclarColor(t.color, .80));
  raiz.setProperty('--franja', `linear-gradient(90deg,${t.color},${t.c2})`);
  document.body.style.backgroundImage = patron(t);
}

/* ---------------- acceso ---------------- */
$$('.tab').forEach(b => b.onclick = () => irPanel(b.dataset.panel));
$$('[data-ir]').forEach(a => a.onclick = e => { e.preventDefault(); irPanel(a.dataset.ir); });
function irPanel(id){
  $$('.tab').forEach(t => t.classList.toggle('activo', t.dataset.panel === id));
  $$('.panel').forEach(p => p.classList.toggle('activo', p.id === id));
}

$('#p-registro').onsubmit = e => {
  e.preventDefault();
  const nombre = $('#reg-nombre').value.trim();
  const user = $('#reg-user').value.trim().toLowerCase();
  const pass = $('#reg-pass').value;
  const err = $('#reg-error');
  if(!nombre || !user || !pass){ err.textContent = 'Llená los tres campos.'; return; }
  if(pass.length < 4){ err.textContent = 'La contraseña necesita al menos 4 caracteres.'; return; }
  if(base()[user]){ err.textContent = 'Ese usuario ya existe.'; return; }
  err.textContent = '';
  const pesos = {};
  TEMAS.forEach(t => pesos[t.id] = 0);
  entrar({ user, nombre, pass, pesos, vistos:[], marcados:[], coment:{} }, true);
};

$('#p-login').onsubmit = e => {
  e.preventDefault();
  const user = $('#login-user').value.trim().toLowerCase();
  const reg = base()[user];
  if(!reg || reg.pass !== $('#login-pass').value){
    $('#login-error').textContent = 'Usuario o contraseña incorrectos.'; return;
  }
  $('#login-error').textContent = '';
  entrar(reg, false);
};

$('#salir').onclick = () => {
  u = null; videoActual = null;
  clearInterval(reloj);
  vestir(null);
  document.body.dataset.tema = '';
  $('#app').hidden = true;
  $('#acceso').hidden = false;
  $('#p-login').reset(); $('#p-registro').reset();
  $('#menu').classList.remove('abierto');
  irPanel('p-login');
};

$('#reiniciar').onclick = () => {
  TEMAS.forEach(t => u.pesos[t.id] = 0);
  u.vistos = []; u.marcados = []; u.coment = {};
  salvar();
  videoActual = null;
  $('#reproductor-caja').hidden = true;
  vista('v-inicio');
  pintar('Volviste a empezar. La página ya no sabe nada de vos.');
};

/* ---------------- entrar ---------------- */
function entrar(usuario, nuevo){
  u = usuario;
  if(nuevo) salvar();
  $('#acceso').hidden = true;
  $('#app').hidden = false;
  const ini = iniciales(u.nombre);
  $('#avatar').textContent = ini;
  $('#avatar2').textContent = ini;
  $('#top-nombre').textContent = u.nombre;
  $('#perfil-nombre').textContent = u.nombre;
  $('#perfil-user').textContent = '@' + u.user;
  vista('v-inicio');
  pintar(nuevo ? '¡Bienvenido!' : 'Bienvenido de vuelta.');
}

/* ---------------- pintar todo ---------------- */
function pintar(mensaje){
  const r = consultar(u);
  vestir(r.conoce ? T(r.principal) : null);
  document.body.dataset.tema = r.conoce ? r.principal : '';
  banner(r, mensaje);
  barras(r);
  inicio(r);
  videos(r);
  chat(r);
  perfil(r);
}

function banner(r, mensaje){
  const b = $('#banner');
  if(!r.conoce){
    b.innerHTML = `<span class="banner-txt"><b>${mensaje}</b> Todavía no sabemos qué te gusta, ` +
      `así que esto es lo mismo que ve cualquiera. Abrí un video y mirá qué pasa.</span>`;
    return;
  }
  const t = T(r.principal);
  const mezcla = r.mezclas.length
    ? ` También te juntamos cosas de <b>${r.mezclas[0].t.map(x => T(x).nombre).join(' y ')}</b>, porque venís viendo las dos.`
    : '';
  b.innerHTML = `<span class="banner-deco">${[t.emoji, ...t.motivos].join('')}</span>` +
    `<span class="banner-txt"><b>${mensaje}</b> Tu página se vistió de ` +
    `<b>${t.nombre} ${t.emoji}</b>: el color, el fondo, el orden y hasta el grupo donde platicás ` +
    `salieron de ahí.` + mezcla + `</span>`;
}

function barras(r){
  const c = $('#barras');
  if(!r.conoce){
    c.innerHTML = '<p class="vacio-txt">Vacío por ahora. Se va a llenar con lo que abras.</p>';
    return;
  }
  c.innerHTML = r.reparto.map(x => {
    const t = T(x.t);
    return `<div class="barra-item">
      <div><b>${t.emoji} ${t.nombre}</b><span>${x.pct}%</span></div>
      <div class="pista"><i style="width:${x.pct}%;background:${t.color}"></i></div>
    </div>`;
  }).join('');
}

/* ---------------- inicio ---------------- */
function inicio(r){
  $('#inicio-vacio').hidden = r.conoce;
  $('#titulo-inicio').textContent = r.conoce
    ? `${T(r.principal).motivos[0]} Porque venís viendo esto`
    : 'Empezá por aquí';

  const lista = r.conoce
    ? [...r.orden.flatMap(t => VIDEOS.filter(v => v.t === t).slice(0,2)),
       ...r.nuevos.slice(0,2).map(t => VIDEOS.find(v => v.t === t))].slice(0,6)
    : ['perros','futbol','tecnologia','comida','gatos','videojuegos'].map(t => VIDEOS.find(v => v.t === t));

  tarjetas($('#rejilla-inicio'), lista, r);

  const feed = $('#feed');
  feed.innerHTML = '';
  $('#titulo-foro').hidden = !r.conoce;
  if(!r.conoce) return;

  r.mezclas.forEach((m,i) => feed.appendChild(publicacion(m.t, m.tit, m.txt, i, true)));
  r.orden.slice(0,3).forEach((t,i) => {
    const [tit, txt] = POSTS[t][0];
    feed.appendChild(publicacion([t], tit, txt, i + 3, false));
  });
}

function tarjetas(cont, lista, r){
  cont.innerHTML = '';
  lista.forEach((v,i) => {
    const t = T(v.t);
    const nuevo = r.conoce && r.nuevos.includes(v.t);
    const d = document.createElement('div');
    d.className = 'vcard';
    d.style.animationDelay = (i * 0.04) + 's';
    d.innerHTML = `<div class="mini">${escena(v.t, i)}<span class="dur">${v.dur}</span>
        <div class="lupa">▶</div></div>
      <div class="vmeta"><b>${v.tit}${nuevo ? '<span class="nuevo">nuevo para vos</span>' : ''}</b>
        <span>${v.canal} · ${t.emoji} ${t.nombre}</span></div>`;
    d.onclick = () => abrirVideo(v);
    cont.appendChild(d);
  });
}

function publicacion(temas, tit, txt, i, mezcla){
  const infos = temas.map(T);
  const autor = NOMBRES[(i * 5 + tit.length) % NOMBRES.length];
  const d = document.createElement('div');
  d.className = 'post' + (mezcla ? ' mezcla' : '');
  d.innerHTML = `
    <div class="post-head">
      <span class="avatar">${autor.slice(0,2).toUpperCase()}</span><b>${autor}</b>
      <span class="etiqueta">${infos.map(x => x.emoji).join('')} ${infos.map(x => x.nombre).join(' + ')}</span>
    </div>
    <h5>${tit}</h5><p>${txt}</p>
    <div class="acciones">
      <button class="accion like">🤍 Me gusta</button>
      <button class="accion abrirc">💬 Comentar</button>
    </div>
    <div class="comentarios" hidden></div>`;

  d.querySelector('.like').onclick = e => {
    if(e.target.classList.contains('on')) return;
    e.target.classList.add('on');
    e.target.textContent = '❤️ Te gustó';
    sumar(temas, 5, `Marcaste una publicación de ${infos.map(x => x.nombre).join(' y ')}.`);
  };
  const zona = d.querySelector('.comentarios');
  d.querySelector('.abrirc').onclick = () => {
    zona.hidden = false;
    comentarios(zona, 'post-' + tit, temas);
  };
  return d;
}

/* ---------------- videos ---------------- */
function videos(r){
  $('#titulo-videos').textContent = r.conoce
    ? `${T(r.principal).motivos[1] || T(r.principal).emoji} Recomendados para vos`
    : 'Todos los videos';
  const lista = r.conoce
    ? [...r.orden.flatMap(t => VIDEOS.filter(v => v.t === t)),
       ...r.nuevos.flatMap(t => VIDEOS.filter(v => v.t === t).slice(0,1))].slice(0,9)
    : VIDEOS.filter((_,i) => i % 2 === 0);
  tarjetas($('#rejilla-videos'), lista, r);
}

function abrirVideo(v){
  videoActual = v;
  const t = T(v.t);
  vista('v-videos');
  $('#reproductor-caja').hidden = false;
  $('#escena').innerHTML = escena(v.t, 'big');
  $('#video-titulo').textContent = v.tit;
  $('#video-canal').textContent = `${v.canal} · ${t.emoji} ${t.nombre} · ${v.dur}`;
  $('#reproductor').classList.remove('play');
  $('#barra-in').style.width = '0';
  clearInterval(reloj);

  const like = $('#v-like'), guardar = $('#v-guardar');
  like.className = 'accion'; like.textContent = '🤍 Me gusta';
  guardar.className = 'accion'; guardar.textContent = '🔖 Guardar';
  like.onclick = () => {
    if(like.classList.contains('on')) return;
    like.classList.add('on'); like.textContent = '❤️ Te gustó';
    sumar([v.t], 6, `Te gustó un video de ${t.nombre}.`);
  };
  guardar.onclick = () => {
    if(guardar.classList.contains('on')) return;
    guardar.classList.add('on'); guardar.textContent = '🔖 Guardado';
    if(!u.marcados.includes(v.tit)) u.marcados.push(v.tit);
    sumar([v.t], 5, `Guardaste un video de ${t.nombre}.`);
  };
  comentarios($('#video-coment'), 'video-' + v.tit, [v.t]);

  const primera = !u.vistos.includes(v.tit);
  if(primera) u.vistos.push(v.tit);
  sumar([v.t], primera ? 8 : 3,
    primera ? `Abriste un video de ${t.nombre}.` : `Volviste a ver algo de ${t.nombre}.`);
  window.scrollTo({ top:0, behavior:'smooth' });
}

$('#play').onclick = () => {
  const rep = $('#reproductor');
  rep.classList.add('play');
  let p = 0;
  clearInterval(reloj);
  reloj = setInterval(() => {
    p += 2.5;
    $('#barra-in').style.width = p + '%';
    if(p >= 100){
      clearInterval(reloj);
      rep.classList.remove('play');
      $('#barra-in').style.width = '0';
      if(videoActual) sumar([videoActual.t], 4,
        `Terminaste un video de ${T(videoActual.t).nombre}.`);
    }
  }, 110);
};

/* ---------------- comentarios ---------------- */
function comentarios(zona, clave, temas){
  u.coment[clave] = u.coment[clave] || [];
  const dibujar = () => {
    const previos = u.coment[clave].map(c =>
      `<div class="coment-item"><span class="avatar">${iniciales(c.quien)}</span>
        <div class="coment-burb"><b>${c.quien}</b>${c.txt}</div></div>`).join('');
    zona.innerHTML = `<div class="coment-linea">
        <input type="text" placeholder="Escribí un comentario...">
        <button class="btn mini">Enviar</button></div>${previos}`;
    const inp = zona.querySelector('input');
    const enviar = () => {
      const txt = inp.value.trim();
      if(!txt) return;
      u.coment[clave].unshift({ quien:u.nombre, txt });
      salvar();
      sumar(temas, 5, `Comentaste algo de ${temas.map(x => T(x).nombre).join(' y ')}.`);
      dibujar();
      zona.querySelector('input').focus();
    };
    zona.querySelector('button').onclick = enviar;
    inp.onkeydown = e => { if(e.key === 'Enter') enviar(); };
  };
  dibujar();
}

/* ---------------- aqui esta la demostracion ----------------
   cualquier accion cambia el perfil y la pagina se rearma sola */
function sumar(temas, cuanto, mensaje){
  temas.forEach(t => u.pesos[t] = (u.pesos[t] || 0) + cuanto);
  salvar();
  const abierto = videoActual;
  pintar(mensaje);
  if(abierto){
    $('#reproductor-caja').hidden = false;
    comentarios($('#video-coment'), 'video-' + abierto.tit, [abierto.t]);
  }
}

/* ---------------- chat y perfil ---------------- */
function chat(r){
  const head = $('#chat-head'), cuerpo = $('#chat-cuerpo');
  if(!r.conoce){
    head.textContent = 'Todavía no tenés grupo';
    cuerpo.innerHTML = '';
    burbuja('otro', 'Cuando veas algún video te metemos al grupo que vaya con eso.');
    return;
  }
  const t = T(r.principal);
  head.textContent = `${t.motivos[0]} Grupo de ${t.nombre} ${t.emoji} · 4 personas en línea`;
  cuerpo.innerHTML = '';
  burbuja('otro', `${t.saludo}, ${u.nombre}. Te metimos al grupo de ${t.nombre} porque es lo que más estás viendo.`);
  burbuja('otro', VIDEOS.find(v => v.t === r.principal).tit + '. ¿Ya lo vieron?');
}
function burbuja(quien, txt){
  const d = document.createElement('div');
  d.className = 'burbuja ' + quien;
  d.textContent = txt;
  $('#chat-cuerpo').appendChild(d);
  $('#chat-cuerpo').scrollTop = 1e6;
}
const mandar = () => {
  const t = $('#chat-texto').value.trim();
  if(!t) return;
  burbuja('mia', t);
  $('#chat-texto').value = '';
  setTimeout(() => burbuja('otro', 'De acuerdo, contá más.'), 700);
};
$('#chat-enviar').onclick = mandar;
$('#chat-texto').onkeydown = e => { if(e.key === 'Enter') mandar(); };

function perfil(r){
  const c = $('#perfil-chips');
  if(!r.conoce){
    $('#perfil-resumen').textContent = 'Todavía no sabemos nada de vos. No te preguntamos ' +
      'qué te gusta: lo vamos a ir aprendiendo de lo que abras.';
    c.innerHTML = '';
    return;
  }
  $('#perfil-resumen').textContent = `Viste ${u.vistos.length} ` +
    (u.vistos.length === 1 ? 'video' : 'videos') + '. Con eso armamos tu página.';
  c.innerHTML = r.reparto.map(x => {
    const t = T(x.t);
    return `<span class="chip">${t.emoji} ${t.nombre}</span>`;
  }).join('');
}

/* ---------------- navegacion ---------------- */
$$('.menu-item').forEach(b => b.onclick = () => { vista(b.dataset.vista); $('#menu').classList.remove('abierto'); });
$('#menu-btn').onclick = () => $('#menu').classList.toggle('abierto');
function vista(id){
  $$('.menu-item').forEach(b => b.classList.toggle('activo', b.dataset.vista === id));
  $$('.vista').forEach(v => v.classList.toggle('activo', v.id === id));
  window.scrollTo({ top:0, behavior:'smooth' });
}
