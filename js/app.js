/* API UNIVERSAL - demostracion
   Todo corre en el navegador. No hay servidor.
   La "API" es la funcion consultarAPI(): recibe el perfil del usuario
   y devuelve como se debe armar la pantalla. */

const INTERESES = [
  { id:'perros',      nombre:'Perros',       emoji:'🐶', color:'#e08b3a' },
  { id:'gatos',       nombre:'Gatos',        emoji:'🐱', color:'#9b6dd6' },
  { id:'futbol',      nombre:'Fútbol',       emoji:'⚽', color:'#2ea36b' },
  { id:'musica',      nombre:'Música',       emoji:'🎧', color:'#d9497f' },
  { id:'tecnologia',  nombre:'Tecnología',   emoji:'💻', color:'#4f7dff' },
  { id:'comida',      nombre:'Comida',       emoji:'🍜', color:'#d4553c' },
  { id:'viajes',      nombre:'Viajes',       emoji:'✈️', color:'#178fa6' },
  { id:'videojuegos', nombre:'Videojuegos',  emoji:'🎮', color:'#6c4fd6' },
  { id:'autos',       nombre:'Autos',        emoji:'🚗', color:'#3a4a63' },
  { id:'arte',        nombre:'Arte',         emoji:'🎨', color:'#c0392b' }
];

const TEMAS = [
  { id:'claro', nombre:'Clara' },
  { id:'oscuro', nombre:'Oscura' }
];

const USOS = [
  { id:'leer',      nombre:'Leer publicaciones' },
  { id:'platicar',  nombre:'Platicar con gente' },
  { id:'ver',       nombre:'Ver videos' }
];

/* contenido de muestra, etiquetado por interes */
const CONTENIDO = {
  perros:[
    ['Rocky aprendió a dar la pata en tres días','Le costó al principio pero ya no para. Video en los comentarios.'],
    ['¿Qué croqueta le dan a un cachorro de 3 meses?','Ando probando marcas y no me decido.'],
    ['Adopción responsable en zona 10','Hay seis cachorros buscando casa este sábado.']
  ],
  gatos:[
    ['Mi gata decidió que el teclado es su cama','Llevo 40 minutos sin poder escribir nada.'],
    ['¿Por qué amasan con las patitas?','Leí que es de cuando eran bebés y no lo pierden nunca.'],
    ['Rascador hecho en casa con cartón','Salió en 30 quetzales y le encantó.']
  ],
  futbol:[
    ['Ese penal no era, y lo sabemos','Todavía no me repongo del domingo.'],
    ['Alineación para el clásico','Yo pondría al 10 por la banda, ¿ustedes?'],
    ['Cascarita el sábado en la cancha de siempre','Faltan dos, avisen.']
  ],
  musica:[
    ['La lista para estudiar que sí funciona','Puro instrumental, nada con letra.'],
    ['Descubrí una banda de acá que suena buenísimo','Se los dejo por si quieren oírla.'],
    ['¿Audífonos o parlante para trabajar?','Yo ya no puedo sin audífonos.']
  ],
  tecnologia:[
    ['Le puse Linux a la laptop vieja y revivió','Ocho años tenía guardada.'],
    ['¿Vale la pena aprender a programar en 2026?','Con la IA la duda es qué aprender, no si aprender.'],
    ['Mi setup de escritorio quedó listo','Dos monitores y por fin cables ordenados.']
  ],
  comida:[
    ['El pepián de mi abuela no lo supera nadie','Traté de copiar la receta y no me sale igual.'],
    ['Lugar de tacos en la sexta','Barato y abre hasta tarde.'],
    ['Pan casero al segundo intento','El primero quedó como piedra, este sí subió.']
  ],
  viajes:[
    ['Semuc Champey en temporada baja','Casi sin gente y el agua turquesa.'],
    ['¿Antigua o Atitlán para un fin de semana?','Tengo dos días nada más.'],
    ['Consejos para viajar barato','Reservar entre semana cambia todo.']
  ],
  videojuegos:[
    ['Terminé el juego y quedé vacío','Ese final no me lo esperaba.'],
    ['¿Alguien para jugar en cooperativo?','Busco gente tranquila, sin gritos.'],
    ['Los juegos de hace 20 años envejecieron bien','Volví a uno y sigue siendo bueno.']
  ],
  autos:[
    ['Cambio de aceite: ¿taller o uno mismo?','Yo lo hago solo y me ahorro bastante.'],
    ['Mi carro llegó a los 300 mil kilómetros','Y sigue arrancando a la primera.'],
    ['¿Eléctrico en Guatemala ya conviene?','Lo dudo por los cargadores.']
  ],
  arte:[
    ['Primer cuadro al óleo','Me tardé un mes pero quedé contento.'],
    ['Dibujar 15 minutos diarios sirve','Se nota muchísimo en dos meses.'],
    ['Exposición gratis este fin','Vale la pena darse la vuelta.']
  ]
};

/* publicaciones que mezclan dos intereses: solo aparecen si le gustan los dos */
const COMBOS = [
  { temas:['perros','viajes'],       tit:'Me llevé al perro de viaje y fue la mejor idea',
    txt:'Aguantó las cuatro horas de carretera mejor que yo.' },
  { temas:['perros','futbol'],       tit:'Mi perro se metió a la cancha en pleno partido',
    txt:'Paramos veinte minutos y nadie se enojó.' },
  { temas:['gatos','musica'],        tit:'A mi gata le gusta una sola canción',
    txt:'Se acuesta en la bocina cada vez que suena.' },
  { temas:['gatos','tecnologia'],    tit:'Le hice una puertita automática al gato',
    txt:'Un sensor, un motorcito y ya entra solo.' },
  { temas:['futbol','comida'],       tit:'Qué comer viendo el partido sin que se enfríe',
    txt:'Lo mío son las tostadas, no fallan.' },
  { temas:['tecnologia','videojuegos'], tit:'Armé la computadora con lo justo para jugar',
    txt:'Me salió la mitad de lo que pedían por una hecha.' },
  { temas:['musica','arte'],         tit:'Pinté escuchando la misma lista tres semanas',
    txt:'El cuadro salió con el color de esa música.' },
  { temas:['viajes','comida'],       tit:'Comí en un mercado de pueblo y no lo olvido',
    txt:'Veinte quetzales y me levanté lleno.' },
  { temas:['autos','viajes'],        tit:'Carretera al Atlántico en carro propio',
    txt:'Salir de madrugada cambia todo el viaje.' },
  { temas:['videojuegos','arte'],    tit:'Dibujé a mi personaje favorito del juego',
    txt:'Me tardé más en la armadura que en la cara.' },
  { temas:['autos','tecnologia'],    tit:'Le puse pantalla al carro con una tablet vieja',
    txt:'Quedó mejor que la radio que traía.' },
  { temas:['perros','gatos'],        tit:'Perro y gato en la misma casa, ¿se puede?',
    txt:'Los primeros días fue guerra, ahora duermen juntos.' }
];

const NOMBRES = ['Ana','Luis','Sofía','Diego','Marta','Kevin','Lucía','Pablo','Rita','Andrés','Vale','Nico'];

/* imagen de la publicacion, dibujada aqui mismo, sin archivos */
function imagen(temas){
  const ids = [].concat(temas);
  const c1 = INTERESES.find(i => i.id === ids[0]).color;
  const c2 = INTERESES.find(i => i.id === (ids[1] || ids[0])).color;
  const emo = ids.map(id => INTERESES.find(i => i.id === id).emoji);
  const semilla = ids.join('').length * 7;
  const puntos = [0,1,2,3,4].map(n => {
    const x = (semilla * (n + 3) * 13) % 100;
    const y = (semilla * (n + 5) * 7) % 100;
    const r = 6 + ((semilla + n * 11) % 14);
    return `<circle cx="${x}%" cy="${y}%" r="${r}" fill="#fff" opacity=".13"/>`;
  }).join('');
  const g = 'g' + Math.random().toString(36).slice(2, 8);
  return `<div class="foto"><svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="400" height="200" fill="url(#${g})"/>${puntos}
    <text x="200" y="128" font-size="76" text-anchor="middle">${emo.join(' ')}</text>
  </svg></div>`;
}

/* ---------------- estado ---------------- */
const LS = 'apiuniversal_usuarios';
let usuario = null;
let consultas = 0;

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const usuarios = () => JSON.parse(localStorage.getItem(LS) || '{}');
const guardar  = u => localStorage.setItem(LS, JSON.stringify(u));

/* ============ LA "API" ============
   Recibe el perfil y devuelve como armar la pantalla. */
function consultarAPI(perfil){
  consultas++;
  const orden = Object.entries(perfil.pesos)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1] - a[1]);

  const principal = orden.length ? orden[0][0] : 'tecnologia';
  const total = orden.reduce((s,[,v]) => s+v, 0) || 1;

  const fuera = INTERESES.map(i => i.id).filter(id => !perfil.pesos[id]);
  const activos = orden.map(([k]) => k);
  const mezclas = COMBOS
    .filter(c => c.temas.every(t => activos.includes(t)))
    .slice(0, 2);

  return {
    usuario: perfil.user,
    interes_principal: principal,
    acento: INTERESES.find(i => i.id === principal).color,
    tema: perfil.tema,
    orden_del_feed: orden.map(([k]) => k),
    reparto: orden.slice(0,4).map(([k,v]) => ({
      tema: k, peso: Math.round(v/total*100) + '%'
    })),
    para_descubrir: fuera.slice(0,3),
    mezclas,
    seccion_sugerida: perfil.uso,
    consulta: consultas
  };
}

/* ---------------- acceso ---------------- */
function pintarChips(cont, lista, multi, max){
  cont.innerHTML = '';
  lista.forEach(it => {
    const b = document.createElement('div');
    b.className = 'chip';
    b.dataset.id = it.id;
    b.textContent = (it.emoji ? it.emoji + ' ' : '') + it.nombre;
    b.onclick = () => {
      if(!multi){ [...cont.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); return; }
      const puestos = cont.querySelectorAll('.chip.on').length;
      if(!b.classList.contains('on') && max && puestos >= max) return;
      b.classList.toggle('on');
    };
    cont.appendChild(b);
  });
}
const elegidos = cont => [...cont.querySelectorAll('.chip.on')].map(c => c.dataset.id);

pintarChips($('#chips-interes'), INTERESES, true, 3);
pintarChips($('#chips-tema'), TEMAS, false);
pintarChips($('#chips-uso'), USOS, false);
$('#chips-tema').firstChild.classList.add('on');
$('#chips-uso').firstChild.classList.add('on');

$$('.tab').forEach(t => t.onclick = () => irA(t.dataset.panel));
$$('[data-ir]').forEach(a => a.onclick = e => { e.preventDefault(); irA(a.dataset.ir); });
function irA(id){
  $$('.tab').forEach(t => t.classList.toggle('activo', t.dataset.panel === id));
  $$('.panel').forEach(p => p.classList.toggle('activo', p.id === id));
}

$('#ir-paso2').onclick = () => {
  const n = $('#reg-nombre').value.trim();
  const u = $('#reg-user').value.trim().toLowerCase();
  const p = $('#reg-pass').value;
  const err = $('#reg-error');
  if(!n || !u || !p){ err.textContent = 'Llená los tres campos.'; return; }
  if(p.length < 4){ err.textContent = 'La contraseña necesita al menos 4 caracteres.'; return; }
  if(usuarios()[u]){ err.textContent = 'Ese usuario ya existe.'; return; }
  err.textContent = '';
  $('[data-paso="1"]').hidden = true;
  $('[data-paso="2"]').hidden = false;
};
$('#volver-paso1').onclick = () => {
  $('[data-paso="2"]').hidden = true;
  $('[data-paso="1"]').hidden = false;
};

$('#p-registro').onsubmit = e => {
  e.preventDefault();
  const int = elegidos($('#chips-interes'));
  if(!int.length){ $('#reg-error2').textContent = 'Elegí al menos un interés.'; return; }
  const u = $('#reg-user').value.trim().toLowerCase();
  const pesos = {};
  INTERESES.forEach(i => pesos[i.id] = int.includes(i.id) ? 10 : 0);
  const nuevo = {
    user:u,
    nombre:$('#reg-nombre').value.trim(),
    pass:$('#reg-pass').value,
    pesos,
    tema: elegidos($('#chips-tema'))[0] || 'claro',
    uso: elegidos($('#chips-uso'))[0] || 'leer',
    posts:[]
  };
  const todos = usuarios(); todos[u] = nuevo; guardar(todos);
  entrar(nuevo, true);
};

$('#p-login').onsubmit = e => {
  e.preventDefault();
  const u = $('#login-user').value.trim().toLowerCase();
  const p = $('#login-pass').value;
  const reg = usuarios()[u];
  if(!reg || reg.pass !== p){ $('#login-error').textContent = 'Usuario o contraseña incorrectos.'; return; }
  $('#login-error').textContent = '';
  entrar(reg, false);
};

$('#salir').onclick = () => {
  usuario = null;
  document.body.classList.remove('oscuro');
  document.documentElement.style.setProperty('--acento', '#4f7dff');
  $('#app').hidden = true;
  $('#acceso').hidden = false;
  $('#p-login').reset(); $('#p-registro').reset();
  $('[data-paso="2"]').hidden = true;
  $('[data-paso="1"]').hidden = false;
  irA('p-login');
};

/* ---------------- app ---------------- */
function entrar(u, esNuevo){
  usuario = u;
  consultas = 0;
  $('#acceso').hidden = true;
  $('#app').hidden = false;
  const ini = u.nombre.trim().slice(0,2).toUpperCase();
  ['#avatar','#avatar2','#avatar3'].forEach(s => $(s).textContent = ini);
  $('#top-nombre').textContent = u.nombre;
  $('#perfil-nombre').textContent = u.nombre;
  $('#perfil-user').textContent = '@' + u.user;
  pintarChips($('#perfil-chips'), INTERESES, true, 3);
  Object.entries(u.pesos).forEach(([k,v]) => {
    if(v > 0) $(`#perfil-chips .chip[data-id="${k}"]`)?.classList.add('on');
  });
  aplicar(esNuevo ? 'Tu cuenta quedó lista.' : 'Bienvenido de vuelta.');
  irVista('v-inicio');
}

function aplicar(mensaje){
  const r = consultarAPI(usuario);

  document.body.classList.toggle('oscuro', r.tema === 'oscuro');
  document.documentElement.style.setProperty('--acento', r.acento);
  document.documentElement.style.setProperty('--acento-2', r.acento + '99');

  const pri = INTERESES.find(i => i.id === r.interes_principal);
  const extra = r.mezclas.length
    ? ` También te juntamos cosas de <strong>${r.mezclas[0].temas
        .map(t => INTERESES.find(i => i.id === t).nombre).join(' y ')}</strong>, porque te gustan las dos.`
    : '';
  $('#aviso').innerHTML = `<strong>${mensaje}</strong> Esta pantalla se armó para vos: ` +
    `lo que más estás viendo es <strong>${pri.nombre} ${pri.emoji}</strong>, ` +
    `así que de ahí salieron el color y el orden.` + extra;

  pintarDescubrir(r);
  pintarFeed(r);
  pintarTemas(r);
  pintarVideo(r);
  pintarChat(r);
}

function pintarFeed(r){
  const feed = $('#feed');
  feed.innerHTML = '';

  (usuario.posts || []).slice().reverse().forEach(p => {
    feed.appendChild(tarjetaPost(usuario.nombre, { temas:[p.tema], txt:p.texto, tit:'' }, 0));
  });

  const lista = [];
  r.orden_del_feed.forEach((tema, idx) => {
    const cuantos = idx === 0 ? 3 : (idx === 1 ? 2 : 1);
    CONTENIDO[tema].slice(0, cuantos).forEach(([tit, txt]) => {
      lista.push({ temas:[tema], tit, txt });
    });
  });

  /* mezclas: si le gustan dos cosas, aparece contenido de las dos juntas */
  r.mezclas.forEach(m => lista.splice(Math.min(2, lista.length), 0, {
    temas:m.temas, tit:m.tit, txt:m.txt, mezcla:true
  }));

  lista.forEach((it, i) => {
    const autor = NOMBRES[(i * 5 + it.tit.length) % NOMBRES.length];
    feed.appendChild(tarjetaPost(autor, it, i));
  });

  /* cosas que todavia no le interesan, para que pueda descubrir */
  r.para_descubrir.forEach((tema, i) => {
    const [tit, txt] = CONTENIDO[tema][0];
    const autor = NOMBRES[(i * 3 + 7) % NOMBRES.length];
    feed.appendChild(tarjetaPost(autor, { temas:[tema], tit, txt, sugerido:true }, i));
  });

  if(!lista.length){
    feed.innerHTML = '<div class="tarjeta"><p class="tenue">Elegí algún interés en tu perfil ' +
      'para que la página se pueda armar.</p></div>';
  }
}

function tarjetaPost(autor, it, i){
  const infos = it.temas.map(t => INTERESES.find(v => v.id === t));
  const etiqueta = it.sugerido ? 'Sugerido: ' + infos[0].nombre
                 : infos.map(v => v.nombre).join(' + ');
  const d = document.createElement('div');
  d.className = 'post' + (it.sugerido ? ' sugerido' : '') + (it.mezcla ? ' mezcla' : '');
  d.innerHTML = `
    <div class="post-head">
      <span class="avatar">${autor.slice(0,2).toUpperCase()}</span>
      <b>${autor}</b>
      <span class="etiqueta">${infos.map(v => v.emoji).join('')} ${etiqueta}</span>
    </div>
    ${it.tit ? `<p class="post-cuerpo"><b>${it.tit}</b></p>` : ''}
    <p class="post-cuerpo">${it.txt}</p>
    ${imagen(it.temas)}
    <div class="post-pie">
      <span class="like">🤍 Me gusta</span>
      <span class="coment">💬 Comentar</span>
      <span class="guardar">🔖 Guardar</span>
    </div>
    <div class="comentarios" hidden></div>`;

  const sumar = () => {
    const n = infos.map(v => v.nombre).join(' y ');
    it.temas.forEach(t => usuario.pesos[t] = (usuario.pesos[t] || 0) + (it.sugerido ? 9 : 4));
    persistir();
    refrescarChips();
    aplicar(it.sugerido ? `Te gustó algo de ${n}, así que ahora también te aparece.`
                        : `Marcaste algo de ${n}.`);
  };

  d.querySelector('.like').onclick = e => {
    if(e.target.dataset.on) return;
    e.target.dataset.on = 1;
    e.target.textContent = '❤️ Te gustó';
    sumar();
  };
  d.querySelector('.guardar').onclick = e => {
    if(e.target.dataset.on) return;
    e.target.dataset.on = 1;
    e.target.textContent = '🔖 Guardado';
    sumar();
  };
  d.querySelector('.coment').onclick = () => {
    const c = d.querySelector('.comentarios');
    c.hidden = false;
    if(c.childElementCount) return;
    c.innerHTML = `<div class="coment-linea">
        <input type="text" placeholder="Escribí un comentario...">
        <button class="btn mini">Enviar</button></div>`;
    const inp = c.querySelector('input');
    const mandar = () => {
      if(!inp.value.trim()) return;
      const p = document.createElement('p');
      p.className = 'coment-item';
      p.innerHTML = `<b>${usuario.nombre}</b> ${inp.value.trim()}`;
      c.insertBefore(p, c.firstChild);
      inp.value = '';
      it.temas.forEach(t => usuario.pesos[t] = (usuario.pesos[t] || 0) + 3);
      persistir();
    };
    c.querySelector('button').onclick = mandar;
    inp.onkeydown = e => { if(e.key === 'Enter') mandar(); };
    inp.focus();
  };
  return d;
}

function persistir(){
  const todos = usuarios();
  todos[usuario.user] = usuario;
  guardar(todos);
}
function refrescarChips(){
  const cont = $('#perfil-chips');
  if(!cont) return;
  const top = Object.entries(usuario.pesos).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);
  [...cont.children].forEach(c => c.classList.toggle('on', top.includes(c.dataset.id)));
}

function pintarDescubrir(r){
  const cont = $('#descubrir');
  cont.innerHTML = '';
  r.para_descubrir.forEach(t => {
    const i = INTERESES.find(v => v.id === t);
    const b = document.createElement('div');
    b.className = 'chip';
    b.textContent = i.emoji + ' ' + i.nombre;
    b.onclick = () => subirInteres(t, 10, `Agregaste ${i.nombre} a lo que te gusta.`);
    cont.appendChild(b);
  });
  if(!cont.childElementCount) cont.innerHTML = '<p class="tenue chico">Ya seguís todos los temas.</p>';
}

/* aqui esta lo que hace la demo: cada accion cambia el perfil
   y la pantalla se vuelve a armar sola */
function subirInteres(tema, cuanto, mensaje){
  usuario.pesos[tema] = (usuario.pesos[tema] || 0) + cuanto;
  persistir();
  refrescarChips();
  aplicar(mensaje);
}

function pintarTemas(r){
  const ul = $('#temas');
  ul.innerHTML = '';
  r.reparto.forEach(x => {
    const i = INTERESES.find(v => v.id === x.tema);
    const li = document.createElement('li');
    li.innerHTML = `<b>${x.peso} de tu página</b>${i.emoji} ${i.nombre}`;
    ul.appendChild(li);
  });
}

function pintarVideo(r){
  const pri = INTERESES.find(i => i.id === r.interes_principal);
  $('#video-titulo').textContent = `Lo más visto de ${pri.nombre}`;
  $('#video-desc').textContent = 'Video de muestra. Se eligió porque es tu interés principal.';
  $('#escena').innerHTML = [ -120, -40, 40, 120 ].map((x,i) =>
    `<span style="left:calc(50% + ${x}px);animation-delay:${i*.35}s">${pri.emoji}</span>`).join('');

  const lista = $('#video-lista');
  lista.innerHTML = '';
  const canales = [...r.orden_del_feed.slice(0,2), ...r.para_descubrir.slice(0,2)];
  canales.forEach(t => {
    const i = INTERESES.find(v => v.id === t);
    const nuevo = r.para_descubrir.includes(t);
    const d = document.createElement('div');
    d.className = 'mini-video';
    d.innerHTML = `<div class="cara">${i.emoji}</div><b>Canal de ${i.nombre}</b>
      <span class="tenue chico">${nuevo ? 'No lo has visto' : 'Ver ahora'}</span>`;
    d.onclick = () => {
      subirInteres(t, nuevo ? 11 : 6, `Viste un video de ${i.nombre}.`);
      irVista('v-video');
    };
    lista.appendChild(d);
  });
}

let reloj = null;
$('#play').onclick = () => {
  const rep = $('#reproductor');
  rep.classList.add('play');
  let p = 0;
  clearInterval(reloj);
  reloj = setInterval(() => {
    p += 2;
    $('#barra-in').style.width = p + '%';
    if(p >= 100){ clearInterval(reloj); rep.classList.remove('play'); $('#barra-in').style.width = '0'; }
  }, 120);
};

function pintarChat(r){
  const pri = INTERESES.find(i => i.id === r.interes_principal);
  $('#chat-head').textContent = `Grupo de ${pri.nombre} ${pri.emoji} · 4 personas en línea`;
  const c = $('#chat-cuerpo');
  c.innerHTML = '';
  burbuja('otro', `Hola ${usuario.nombre}, te metimos al grupo de ${pri.nombre} porque es lo que más ves.`);
  burbuja('otro', CONTENIDO[r.interes_principal][0][0] + '. ¿Vieron eso?');
}
function burbuja(quien, texto){
  const d = document.createElement('div');
  d.className = 'burbuja ' + quien;
  d.textContent = texto;
  $('#chat-cuerpo').appendChild(d);
  $('#chat-cuerpo').scrollTop = 1e6;
}
$('#chat-enviar').onclick = mandarChat;
$('#chat-texto').onkeydown = e => { if(e.key === 'Enter') mandarChat(); };
function mandarChat(){
  const t = $('#chat-texto').value.trim();
  if(!t) return;
  burbuja('mia', t);
  $('#chat-texto').value = '';
  setTimeout(() => burbuja('otro', 'De acuerdo, contá más.'), 700);
}

$('#post-enviar').onclick = () => {
  const t = $('#post-texto').value.trim();
  if(!t) return;
  const top = Object.entries(usuario.pesos).sort((a,b)=>b[1]-a[1])[0][0];
  usuario.posts.push({ texto:t, tema:top });
  persistir();
  $('#post-texto').value = '';
  aplicar('Publicaste algo.');
};

$('#perfil-guardar').onclick = () => {
  const sel = elegidos($('#perfil-chips'));
  if(!sel.length) return;
  INTERESES.forEach(i => usuario.pesos[i.id] = sel.includes(i.id) ? 10 : 0);
  const todos = usuarios(); todos[usuario.user] = usuario; guardar(todos);
  aplicar('Cambiaste tus intereses.');
  irVista('v-inicio');
};

$$('.nav-btn').forEach(b => b.onclick = () => irVista(b.dataset.vista));
function irVista(id){
  $$('.nav-btn').forEach(b => b.classList.toggle('activo', b.dataset.vista === id));
  $$('.vista').forEach(v => v.classList.toggle('activo', v.id === id));
  window.scrollTo({ top:0, behavior:'smooth' });
}
