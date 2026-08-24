/* EL VERIFICADOR DEL CONTRATO ENTRE ARCHIVOS.

   Correlo asi, desde la raiz del proyecto:   node servidor/verificar_contrato.js

   POR QUE EXISTE. Tres cosas de este proyecto son un acuerdo entre archivos
   que escriben personas distintas en momentos distintos, y las tres se
   rompieron sin dar UN SOLO error:

   1. El prompt le describia a Claude clases que el armador no crea nunca
      (.video-tapa, .aviso-vacio). Todo el CSS que el modelo escribia para
      esas piezas caia al vacio, y la regla mas importante -"el medio no se
      esconde"- protegia un selector inexistente.

   2. `pedir` estaba declarado en rearmar.js Y en contenido.js. Los content
      scripts comparten un solo ambito global: el segundo piso al primero en
      silencio y desaparecieron todos los iconos de la pagina re-armada.

   3. El extractor calculaba `clase` y el resumen que viaja al servidor no la
      llevaba, asi que el bloque ENFOQUE del prompt era codigo muerto.

   Un aviso en un comentario no evita ninguna de las tres: caduca igual que
   el codigo. Esto si, porque falla. */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const EXT = path.join(RAIZ, 'extension');

const leer = p => fs.readFileSync(p, 'utf8');
const rearmar   = leer(path.join(EXT, 'rearmar.js'));
const extractor = leer(path.join(EXT, 'extractor.js'));
const contenido = leer(path.join(EXT, 'contenido.js'));
const iconos    = leer(path.join(EXT, 'iconos.js'));
const hoja      = leer(path.join(EXT, 'pagina.css'));
const prompt    = leer(path.join(__dirname, 'prompt_rearmar.js'));

const fallos = [];
const hechas = [];
/* Una comprobacion que no se pudo correr -porque el archivo del otro lado
   todavia no existe- NO es una comprobacion en verde. Si se cuenta con las
   hechas, el resumen dice que reviso algo que no miro nunca, que es la
   mentira mas cara que puede decir esta herramienta. Va en su propia lista
   y se imprime aparte. */
const sinCorrer = [];
const marcar = (n, q) => hechas.push(n + ': ' + q);
const fallar = (n, q) => fallos.push(n + ' — ' + q);
const anotar = (n, q) => sinCorrer.push(n + ': ' + q);

/* ---------- 1. LAS CLASES QUE EL PROMPT LE PROMETE A CLAUDE ----------
   Toda clase nombrada en el prompt tiene que existir de verdad: o la crea
   el armador, o la define la hoja base. Si no, es CSS muerto. */
function clasesQueArma(js){
  const s = new Set();
  const pon = t => String(t).split(/\s+/).filter(Boolean).forEach(x => s.add(x));
  /* cr('div','marco')  y  cr('section', x ? 'a b' : 'c') */
  for(const m of js.matchAll(/cr\(\s*'[a-z0-9]+'\s*,\s*'([^']+)'/g)) pon(m[1]);
  for(const m of js.matchAll(/cr\(\s*'[a-z0-9]+'\s*,\s*[^,()]*\?\s*'([^']+)'\s*:\s*'([^']+)'/g)){ pon(m[1]); pon(m[2]); }
  /* imagen(src, alt, 'hero-img') */
  for(const m of js.matchAll(/imagen\([^;]*?,\s*'([^']+)'\s*\)/g)) pon(m[1]);
  for(const m of js.matchAll(/classList\.add\('([^']+)'\)/g)) pon(m[1]);
  for(const m of js.matchAll(/className\s*=\s*'([^']+)'/g)) pon(m[1]);
  return s;
}

function clasesDeLaHoja(css){
  const s = new Set();
  for(const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)) s.add(m[1]);
  return s;
}

/* Del prompt salen los `.selector` que se le nombran al modelo. Se miran
   SOLO los textos entre acentos graves -que es lo que de verdad lee Claude-
   y no el codigo que los arma: si no, un `.map(` al principio de una linea
   encadenada se cuenta como si fuera una clase. El lookbehind ademas evita
   confundir un dominio ("youtube.com") o un decimal. */
function clasesDelPrompt(js){
  const s = new Set();
  for(const t of js.match(/`[\s\S]*?`/g) || []){
    for(const m of t.matchAll(/(?<![\w\-)\]'"])\.([a-z][a-z0-9-]{2,})\b/g)) s.add(m[1]);
  }
  return s;
}

const arma = clasesQueArma(rearmar);
const enHoja = clasesDeLaHoja(hoja);
const pedidas = clasesDelPrompt(prompt);
/* palabras de la prosa del prompt que empiezan con punto y no son clases */
const NO_CLASE = new Set(['com', 'net', 'org', 'css', 'json']);

const huerfanas = [...pedidas].filter(c => !NO_CLASE.has(c) && !arma.has(c) && !enHoja.has(c));
if(huerfanas.length){
  fallar('PIEZAS del prompt', 'el prompt le nombra a Claude clases que NADIE crea: .' +
         huerfanas.join(', .') + '. Todo el CSS que escriba para ellas es CSS muerto.');
}
marcar('PIEZAS del prompt', pedidas.size + ' clases nombradas, todas contra las ' +
       arma.size + ' que crea rearmar.js y las ' + enHoja.size + ' de pagina.css');

/* la regla de proteccion tiene que cubrir las piezas por las que pasa el
   caso "medio de otro sitio", que es el unico camino al video */
const proteccion = (prompt.match(/EL MEDIO NO SE ESCONDE[\s\S]*?\n- /) || [''])[0];
for(const c of ['.medio', '.video', '.miniatura', '.medio-enlace']){
  if(!proteccion.includes(c)){
    fallar('EL MEDIO NO SE ESCONDE', 'la prohibicion no menciona ' + c +
           ', que es una de las piezas por las que pasa el unico camino al video');
  }
}
marcar('EL MEDIO NO SE ESCONDE', 'cubre .medio, .video, .miniatura y .medio-enlace');

/* la firma de lo inventado es la unica condicion de todo el invento, y la
   hoja del modelo se adopta DESPUES de la nuestra: la lista del medio la
   protegia y a .escrito no la miraba nadie, asi que el verificador daba verde
   con la firma desprotegida */
const firma = (prompt.match(/LA FIRMA NO SE BORRA[\s\S]*?\n- /) || [''])[0];
for(const c of ['.escrito', '.sello']){
  if(!firma.includes(c)){
    fallar('LA FIRMA NO SE BORRA', 'la prohibicion no menciona ' + c +
           ', que es lo unico que distingue lo inventado de lo leido');
  }
}
/* y un aviso no es un mecanismo: el recorte tiene que existir en el codigo */
if(!/APAGA_FIRMA/.test(rearmar) || !/GUARDA_FIRMA/.test(rearmar)){
  fallar('LA FIRMA NO SE BORRA', 'el prompt lo prohibe pero rearmar.js no lo impide: ' +
         'faltan APAGA_FIRMA (el recorte en cssLimpio) o GUARDA_FIRMA (la hoja que la re-enciende)');
}
marcar('LA FIRMA NO SE BORRA', 'cubre .escrito y .sello, y los dos mecanismos de rearmar.js');

/* ---------- 2. NOMBRES DUPLICADOS ENTRE CONTENT SCRIPTS ----------
   Comparten UN ambito global: dos `function` con el mismo nombre no dan
   error, la ultima que carga pisa a la anterior. */
const ARCHIVOS = { 'iconos.js':iconos, 'extractor.js':extractor,
                   'rearmar.js':rearmar, 'contenido.js':contenido };
const donde = new Map();
for(const [nombre, js] of Object.entries(ARCHIVOS)){
  for(const m of js.matchAll(/^(?:async\s+)?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)){
    if(!donde.has(m[1])) donde.set(m[1], []);
    if(!donde.get(m[1]).includes(nombre)) donde.get(m[1]).push(nombre);
  }
}
let nDup = 0;
for(const [n, files] of donde){
  if(files.length > 1){
    nDup++;
    fallar('nombre duplicado', '`' + n + '` esta declarado en ' + files.join(' y ') +
           '. Comparten el ambito global: el ultimo que carga pisa al otro EN SILENCIO.');
  }
}
marcar('nombres de nivel superior', donde.size + ' revisados en los 4 content scripts, ' +
       nDup + ' duplicados');

/* ---------- 3. LO QUE EL ARMADOR LEE, EL EXTRACTOR LO TIENE QUE DEVOLVER ---------- */
function bloqueDeRetorno(js, funcion){
  const i = js.indexOf('function ' + funcion);
  if(i < 0) return '';
  const j = js.indexOf('return {', i);
  if(j < 0) return '';
  let prof = 0;
  for(let k = j + 7; k < js.length; k++){
    if(js[k] === '{') prof++;
    else if(js[k] === '}'){ prof--; if(prof === 0) return js.slice(j, k + 1); }
  }
  return '';
}

/* las claves del PRIMER nivel del objeto, no las de adentro: `medida` es un
   campo, `medida.titulos` no es un campo del contenido */
function clavesDe(txt){
  /* sin comentarios: un "la clase va SIEMPRE:" adentro del objeto se contaba
     como si fuera una clave, y una clave de mas afloja la comprobacion */
  const bloque = String(txt).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const s = new Set();
  let prof = 0;
  const re = /([{}[\]()])|([A-Za-z_$][\w$]*)\s*:/g;
  let m;
  while((m = re.exec(bloque))){
    if(m[1]){
      if('{[('.includes(m[1])) prof++;
      else prof--;
    } else if(prof === 1){
      s.add(m[2]);
    }
  }
  return s;
}

const retLeer = bloqueDeRetorno(extractor, 'AU_LEER');
if(!retLeer) fallar('contrato', 'no pude encontrar el objeto que devuelve AU_LEER');
const daExtractor = clavesDe(retLeer);

const cuerpoNorm = (rearmar.match(/function normalizar\(c\)\{[\s\S]*?\n\}/) || [''])[0];
const leeArmador = new Set([...cuerpoNorm.matchAll(/\bn\.([a-z][\w]*)/g)].map(m => m[1]));
/* Sin este corte la comprobacion se aflojaba sola: escribir la firma con un
   espacio -`function normalizar (c) {`- deja cuerpoNorm en '' y leeArmador
   vacio, y el bucle de abajo no da una vuelta. Medido: el resumen imprimia
   "[ok] contrato extractor->armador: 0 campos" y el veredicto seguia diciendo
   TODO EN REGLA. Un cero aca no es un contrato cumplido, es un contrato que
   nadie miro. Hoy son 12. */
if(!leeArmador.size){
  fallar('contrato extractor->armador', 'no le lei a normalizar() de rearmar.js NI UN campo ' +
         '`n.x`: o le cambiaron la firma (la busco como `function normalizar(c){`), o el ' +
         'parametro ya no se llama `n`. Sin eso esta comprobacion no mira NADA.');
}
for(const k of leeArmador){
  if(!daExtractor.has(k)){
    fallar('contrato extractor->armador', 'rearmar.js lee `' + k +
           '` del contenido y AU_LEER no lo devuelve');
  }
}
marcar('contrato extractor->armador', [...leeArmador].length + ' campos que lee normalizar(), ' +
       'contra los ' + daExtractor.size + ' que devuelve AU_LEER');

/* Dos cosas distintas, y confundirlas fue justamente el bug de `clase`: lo
   que resumen() LEE del contenido, y lo que resumen() MANDA al servidor. */
const retResumen = bloqueDeRetorno(contenido, 'resumen');
if(!retResumen) fallar('contrato', 'no pude encontrar el objeto que devuelve resumen()');
const mandaResumen = clavesDe(retResumen);
const leeResumen = new Set([...retResumen.matchAll(/\bc\.([a-z][\w]*)/g)].map(m => m[1]));
for(const k of leeResumen){
  if(!daExtractor.has(k)){
    fallar('contrato extractor->servidor', 'resumen() lee `c.' + k +
           '` y AU_LEER no lo devuelve');
  }
}
/* al reves: lo que el prompt decide con `c.X` tiene que viajar en resumen() */
const usaPrompt = new Set([...prompt.matchAll(/\bc\.([a-z][\w]*)/g)].map(m => m[1]));
for(const k of usaPrompt){
  if(!mandaResumen.has(k)){
    fallar('contrato servidor', 'prompt_rearmar.js decide con `contenido.' + k +
           '` y resumen() de contenido.js no lo manda: ese campo llega SIEMPRE undefined');
  }
}
marcar('contrato extractor->servidor', [...usaPrompt].length + ' campos que usa el prompt contra ' +
       'los ' + mandaResumen.size + ' que manda resumen(), y sus ' + leeResumen.size +
       ' lecturas contra lo que devuelve AU_LEER');

/* ---------- 4. LO QUE UN ARCHIVO LLAMA, OTRO LO TIENE QUE DECLARAR ---------- */
const globales = new Set(donde.keys());
/* AU_LLEVAR y cortarRelecturas viven en contenido.js y se llaman desde
   rearmar.js, y los dos estan escritos para fallar EN SILENCIO: el enlace
   navega normal y el viaje no existe, o el asomarse no corta nada. Faltaban
   de esta lista justo cuando eran lo nuevo del contrato, asi que renombrar
   una pasaba en verde. */
const LLAMA = ['AU_LEER', 'AU_ARMAR', 'AU_DESARMAR', 'AU_DESPERTAR', 'AU_TEMA',
               'AU_TEMA_LOCAL', 'AU_CORTAR', 'AU_LLEVAR', 'cortarRelecturas',
               'ICONOS', 'AU'];
for(const n of LLAMA){
  if(!globales.has(n)) fallar('funcion compartida', '`' + n + '` se usa entre archivos y no esta declarada en ninguno');
}
marcar('funciones compartidas', LLAMA.length + ' comprobadas (' + LLAMA.join(', ') + ')');

/* ---------- 5. EL VIAJE: LO QUE SE ESCRIBE Y LO QUE SE LEE ----------
   El objeto que arma AU_LLEVAR y el que lee el bloque de llegada tienen que
   hablar de lo mismo, y no lo hacian: `desde` se escribia y no se leia en
   NINGUNA parte del repo, y `a` -a donde iba el viaje- ni existia. Sin
   destino, una llave que es global a todas las pestañas se la quedaba el
   primer documento que terminara de cargar en cualquier lado. */
const iViaje = contenido.indexOf('const viaje = {');
const litViaje = iViaje < 0 ? '' : (() => {
  let prof = 0;
  const j = contenido.indexOf('{', iViaje);
  for(let k = j; k < contenido.length; k++){
    if(contenido[k] === '{') prof++;
    else if(contenido[k] === '}'){ prof--; if(prof === 0) return contenido.slice(j, k + 1); }
  }
  return '';
})();
if(!litViaje) fallar('contrato del viaje', 'no pude encontrar el objeto `const viaje = {...}` en contenido.js');
const escribeViaje = clavesDe(litViaje);
/* solo desde donde empieza a leerse el viaje: `t` es un nombre corto y en el
   resto del archivo hay otros -el temporizador del vigilante, entre otros- */
const zonaLlegada = contenido.slice(contenido.indexOf('function viajeMio'));
const leeViaje = new Set([...zonaLlegada.matchAll(/\bt2?\.([a-z][\w]*)/g)].map(m => m[1]));
/* lo pone tomarViaje() con Object.assign para saber quien gano la carrera, no
   el objeto original: es el unico campo que se lee y no se escribe ahi */
leeViaje.delete('tomadoPor');
for(const k of leeViaje){
  if(!escribeViaje.has(k)){
    fallar('contrato del viaje', 'la llegada lee `t.' + k + '` y AU_LLEVAR no lo escribe: llega SIEMPRE undefined');
  }
}
for(const k of escribeViaje){
  if(!leeViaje.has(k)){
    fallar('contrato del viaje', 'AU_LLEVAR escribe `' + k + '` y no lo lee NADIE. ' +
           'O sirve para algo y falta usarlo, o sobra.');
  }
}
/* el destino no es opcional: es lo unico que impide que el viaje se lo quede
   una pestaña cualquiera que estuviera cargando en ese minuto */
if(!escribeViaje.has('a') || !/t\.a\s*===\s*location\.origin/.test(contenido)){
  fallar('contrato del viaje', 'el viaje no guarda a donde iba, o la llegada no lo compara con location.origin');
}
marcar('contrato del viaje', escribeViaje.size + ' campos que escribe AU_LLEVAR contra los ' +
       leeViaje.size + ' que lee la llegada, y el destino comparado con location.origin');

/* ---------- 6. LO QUE EL PROMPT LE PIDE AL MODELO, ALGUIEN LO TIENE QUE DIBUJAR ----------
   Es el mismo defecto del punto 1 pero al reves: ahi el prompt nombraba
   clases que nadie creaba; aca puede pedirle al modelo campos que nadie lee.
   Los cuatro de la pagina flaca -bienvenida, aviso_propuesta,
   secciones_inventadas, tarjetas_inventadas- son el corazon de lo que se
   pidio, y quedarse sin dibujar no da ningun error: el modelo los manda, el
   servidor reenvia el JSON crudo y se pierden en silencio. */
const bloqueJson = (prompt.match(/DEVOLVE SOLO ESTE JSON\s*\{[\s\S]*?\n\}/) || [''])[0];
if(!bloqueJson) fallar('contrato del JSON', 'no pude encontrar el bloque "DEVOLVE SOLO ESTE JSON" del prompt');
/* del primer nivel salen los campos del diseño (se leen como `d.x`); los de
   adentro son la forma de cada seccion o tarjeta escrita (se leen como `s.x`
   o `t.x`), y hay que mirarlos igual: si el prompt pide "linea" y el armador
   lee "texto", la tarjeta sale en blanco sin un solo error */
const arriba = new Set(), adentro = new Set();
{
  /* el bloque es un template de JS, no JSON: los cuatro campos de la pagina
     flaca cuelgan de un ${flaco ? `...` : ''} y esas llaves descuadran la
     profundidad, que es como se colaban al nivel de adentro. Se saca la
     juntura antes de contar. */
  const limpio = bloqueJson.replace(/\$\{[^{}`]*`/g, '').replace(/`[^{}`]*\}/g, '');
  let prof = 0;
  const re = /([{}[\]])|"([a-z_][a-z_0-9]*)"\s*:/g;
  let m;
  while((m = re.exec(limpio))){
    if(m[1]) prof += '{['.includes(m[1]) ? 1 : -1;
    else if(prof === 1) arriba.add(m[2]);
    else if(prof > 1) adentro.add(m[2]);
  }
}
/* si la lectura se descuadro, los campos caen al nivel equivocado y la
   comprobacion se afloja EN SILENCIO, que es justo el defecto que este
   archivo existe para no tener. Estos cuatro no pueden estar en otro lado. */
for(const k of ['css', 'titulo', 'secciones_inventadas', 'tarjetas_inventadas']){
  if(!arriba.has(k)) fallar('contrato del JSON', 'no pude leer bien el bloque del JSON: `' + k +
                            '` tendria que ser un campo del primer nivel y no salio ahi');
}
const leenDiseno = rearmar + contenido;
for(const k of arriba){
  if(!new RegExp('\\bd\\.' + k + '\\b').test(leenDiseno)){
    fallar('contrato del JSON', 'el prompt le pide al modelo `' + k +
           '` y NADIE lo lee como campo del diseño: llega y se tira en silencio');
  }
}
for(const k of adentro){
  if(!new RegExp('\\.' + k + '\\b').test(rearmar)){
    fallar('contrato del JSON', 'el prompt le pide al modelo un `' + k +
           '` dentro de una pieza escrita y rearmar.js no lo lee: esa pieza sale en blanco');
  }
}
marcar('contrato del JSON', arriba.size + ' campos del diseño y ' + adentro.size +
       ' de las piezas escritas, todos leidos');

/* Lo que cruza a otro sitio es el ESTILO. La lista SOLO_ESTILO tenia al lado
   un "SI PONERTEMA EMPIEZA A LEER UN CAMPO NUEVO, TIENE QUE ENTRAR EN ESTA
   LISTA", y un aviso caduca igual que el codigo. */
const solo = new Set([...(contenido.match(/const SOLO_ESTILO = \[[\s\S]*?\];/) || [''])[0]
                        .matchAll(/'([a-z_0-9]+)'/g)].map(m => m[1]));
const iTema = contenido.indexOf('function ponerTema');
const leeTema = iTema < 0 ? new Set()
  : new Set([...contenido.slice(iTema, iTema + 2500).matchAll(/\bd\.([a-z_0-9]+)/g)].map(m => m[1]));
/* El mismo cero de arriba, y aca picaba doble: con ponerTema renombrada
   iTema queda en -1 y slice(-1, 2499) devuelve '' -no un pedazo del final-,
   asi que leeTema salia vacio y el bucle no comparaba nada. Medido: imprimia
   "[ok] SOLO_ESTILO: 0 campos que lee ponerTema()" y salia en verde. Hoy son 9. */
if(!leeTema.size){
  fallar('SOLO_ESTILO', 'no le lei a ponerTema() de contenido.js NI UN campo `d.x`: o la ' +
         'renombraron (la busco como `function ponerTema`), o ya no lee el diseño asi. ' +
         'Sin eso no se compara nada contra SOLO_ESTILO.');
}
for(const k of leeTema){
  if(!solo.has(k)){
    fallar('SOLO_ESTILO', 'ponerTema() lee `d.' + k + '` y no esta en SOLO_ESTILO: ' +
           'ese campo NO cruza el enlace y el destino queda a medio vestir');
  }
}
marcar('SOLO_ESTILO', leeTema.size + ' campos que lee ponerTema() contra los ' + solo.size +
       ' que cruzan de sitio');

/* ---------- 7. LOS NUMEROS DE LAS MOTAS ----------
   El prompt le describia al modelo "40 cajitas" repartidas en "cinco filas"
   con --i "de 0 a 39". Lo que siembra rearmar.js son MOTAS_COLS(20) x
   MOTAS_FILAS(6) = 120 cajitas en 6 filas, con --i de 0 a 119. Estuvo asi
   hasta hoy y no fallo NADA: el modelo escribia sus calc(var(--i)/39) y sus
   :nth-child contra numeros inventados, asi que el efecto que repartia de
   borde a borde se le amontonaba en un tercio, y las 80 cajitas de mas se
   quedaban con el valor del final. Una cifra dentro de la prosa no la
   revisa nadie; este bloque si. */
const NUMERO_EN_LETRA = { una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6,
                          siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12,
                          veinte:20, treinta:30, cuarenta:40 };
const aNumero = t => /^\d+$/.test(t) ? Number(t)
                   : (Object.prototype.hasOwnProperty.call(NUMERO_EN_LETRA, t.toLowerCase())
                      ? NUMERO_EN_LETRA[t.toLowerCase()] : null);
const constanteDe = (js, nombre) => {
  const m = js.match(new RegExp('const\\s+' + nombre + '\\s*=\\s*(\\d+)'));
  return m ? Number(m[1]) : null;
};
const COLS = constanteDe(rearmar, 'MOTAS_COLS');
const FILAS = constanteDe(rearmar, 'MOTAS_FILAS');
if(COLS === null || FILAS === null){
  fallar('numeros de las motas', 'no pude leer MOTAS_COLS y MOTAS_FILAS de rearmar.js, ' +
         'que son las constantes contra las que se comparan los numeros del prompt');
} else {
  const CAJITAS = COLS * FILAS;

  /* cuantas cajitas dice el prompt que hay (lo dice en cuatro lugares) */
  const dichas = [...prompt.matchAll(/(\d+)\s+cajitas/gi)].map(m => Number(m[1]));
  if(!dichas.length){
    fallar('numeros de las motas', 'el prompt ya no dice en ninguna parte cuantas cajitas hay: ' +
           'sin esa frase el modelo no sabe contra que reparte, y esta comprobacion se queda ciega');
  }
  for(const n of new Set(dichas)){
    if(n !== CAJITAS){
      fallar('numeros de las motas', 'el prompt le dice al modelo que hay ' + n +
             ' cajitas y rearmar.js siembra ' + CAJITAS + ' (MOTAS_COLS ' + COLS +
             ' x MOTAS_FILAS ' + FILAS + ')');
    }
  }

  /* cuantas filas: en el prompt van en letras ("seis filas", "seis
     animaciones encastradas"), que es justo lo que ningun buscador de
     numeros encuentra */
  const filasDichas = [...prompt.matchAll(/([a-záéíóúñ]+|\d+)\s+(?:filas|animaciones encastradas)/gi)]
                        .map(m => aNumero(m[1])).filter(n => n !== null);
  if(!filasDichas.length){
    fallar('numeros de las motas', 'el prompt ya no dice en cuantas filas caen las cajitas, ' +
           'y esa cuenta es la que le da su turno a cada fila del Tetris');
  }
  for(const n of new Set(filasDichas)){
    if(n !== FILAS){
      fallar('numeros de las motas', 'el prompt habla de ' + n +
             ' filas y MOTAS_FILAS de rearmar.js es ' + FILAS);
    }
  }

  /* y cuantas por fila: "seis filas de 20" */
  for(const m of prompt.matchAll(/filas de (\d+)/g)){
    if(Number(m[1]) !== COLS){
      fallar('numeros de las motas', 'el prompt dice filas de ' + m[1] +
             ' cajitas y MOTAS_COLS de rearmar.js es ' + COLS);
    }
  }

  /* el tope de --i: es el numero contra el que el modelo divide para
     repartir algo de la primera a la ultima cajita */
  const topes = [...prompt.matchAll(/--i\b[\s\S]{0,90}?\b0 a (\d+)/g)].map(m => Number(m[1]));
  if(!topes.length){
    fallar('numeros de las motas', 'el prompt ya no dice hasta que numero llega --i');
  }
  for(const n of new Set(topes)){
    if(n !== CAJITAS - 1){
      fallar('numeros de las motas', 'el prompt dice que --i va de 0 a ' + n +
             ' y de verdad va de 0 a ' + (CAJITAS - 1));
    }
  }

  /* La partida de Tetris es estructura, no estilo: cada fila necesita SU
     @keyframes y SU nth-child. Una septima fila sembrada por rearmar.js se
     quedaria quieta arriba de la pantalla -sin animacion asignada- y no da
     ningun error: se ve como una hilera de cajitas colgadas del techo. */
  const cssPlano = hoja.replace(/\/\*[\s\S]*?\*\//g, '');
  const tetris = new Set([...cssPlano.matchAll(/@keyframes\s+au-tetris-(\d+)/g)].map(m => Number(m[1])));
  const filasCss = new Set([...cssPlano.matchAll(/\.motas\s+\.fila:nth-child\((\d+)\)/g)].map(m => Number(m[1])));
  for(let f = 0; f < FILAS; f++){
    if(!tetris.has(f)){
      fallar('numeros de las motas', 'rearmar.js siembra ' + FILAS + ' filas y pagina.css no tiene ' +
             '@keyframes au-tetris-' + f + ': esa fila se queda quieta arriba de la pantalla');
    }
    if(!filasCss.has(f + 1)){
      fallar('numeros de las motas', 'rearmar.js siembra ' + FILAS + ' filas y pagina.css no le da ' +
             'animacion a .motas .fila:nth-child(' + (f + 1) + ')');
    }
  }
  for(const f of tetris){
    if(f >= FILAS){
      fallar('numeros de las motas', 'pagina.css tiene @keyframes au-tetris-' + f +
             ' y rearmar.js solo siembra ' + FILAS + ' filas: esa animacion no la usa nadie');
    }
  }
  marcar('numeros de las motas', CAJITAS + ' cajitas (' + COLS + 'x' + FILAS + ') contra ' +
         dichas.length + ' cifras del prompt, ' + filasDichas.length + ' menciones de las filas, ' +
         topes.length + ' del tope de --i, y las ' + tetris.size + ' animaciones de fila de pagina.css');
}

/* ---------- 8. LA HOJA BASE TIENE QUE SER PISABLE ----------
   La hoja del modelo se adopta DESPUES de pagina.css, asi que con la misma
   especificidad gana el modelo. Pero una regla mas especifica de la hoja
   base gana siempre, y el modelo no puede defenderse: el prompt le ofrece
   `.hero h1` y no sabe que existe `.hero.compacta h1`. Medido hoy: pidio
   14px para el titulo y salio 27px, sin un solo error.
   Por eso la hoja base es el PISO. Fija tamaños, cajas y comportamiento con
   la especificidad justa de la pieza que el prompt le nombra al modelo, y
   nunca desde una variante que el modelo no puede nombrar. */
const PIEZAS_34 = ['.marco', '.cab', '.marca-txt', '.marca-ico', '.menu a', '.volver',
  '.hero', '.hero h1', '.ojo', '.lema', '.hero-img', '.medio', '.video', '.miniatura',
  '.play', '.play-txt', '.medio-enlace', '.seccion', '.tarjetas', '.tarjeta',
  '.tarjeta-img', '.tarjeta-txt h3', '.tarjeta-play', '.mas', '.vacio', '.cuerpo p',
  '.cuerpo li', '.cuerpo blockquote', '.foto', '.escrito', '.sello', '.nota', '.pie',
  '.motas i'];
/* Lo decorativo es lo que el modelo VIENE a decidir. Lo estructural (display,
   position, aspect-ratio, grid) es del armador y ahi la hoja base si manda. */
const PROPS_DECORATIVAS = ['font-size', 'font-family', 'color', 'background',
  'background-color', 'border', 'border-radius', 'box-shadow', 'text-transform'];

/* la lista de arriba esta escrita a mano porque el bloque PIEZAS del prompt
   viene en dos columnas y parsearlo pierde piezas (30 de 34 en la prueba).
   Una lista a mano caduca sola, asi que se ata al prompt: si una pieza deja
   de ofrecerse, esto falla en vez de seguir revisando un fantasma. */
const comoRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for(const pieza of PIEZAS_34){
  if(!new RegExp(comoRegex(pieza) + '(?![\\w-])').test(prompt)){
    fallar('la hoja base es pisable', 'la pieza `' + pieza + '` esta en la lista de este ' +
           'verificador y el prompt ya no se la nombra al modelo: o volvio a ofrecerse, o sobra de la lista');
  }
}

/* pagina.css aplanada: las reglas de adentro de un @media cuentan igual (el
   @media no suma especificidad), y las de un @keyframes no son reglas */
function reglasPlanas(css){
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const salida = [];
  let sel = '';
  let i = 0;
  while(i < limpio.length){
    if(limpio[i] !== '{'){ sel += limpio[i]; i++; continue; }
    let prof = 1;
    let j = i + 1;
    while(j < limpio.length && prof > 0){
      if(limpio[j] === '{') prof++;
      else if(limpio[j] === '}') prof--;
      j++;
    }
    const cuerpo = limpio.slice(i + 1, j - 1);
    const s = sel.trim();
    sel = '';
    i = j;
    if(/^@(media|supports|layer|container)/.test(s)) salida.push(...reglasPlanas(cuerpo));
    else if(s[0] !== '@') salida.push({ sel: s, cuerpo });
  }
  return salida;
}

/* especificidad de verdad (a,b,c): ids, despues clases/atributos/pseudo-clases,
   despues etiquetas. Los pseudo-elementos cuentan como etiqueta y :not/:is/:where
   no cuentan por si mismos -lo que cuenta es lo de adentro, que la cuenta de
   clases ya recoge-. */
const pseudoClases = s => (sinWhere(s).match(/(?<!:):[a-z-]+/g) || []).filter(p => !/^:(not|is|where)$/.test(p));
/* :where(...) pesa CERO, y esa es toda su gracia: es como se escribe un piso
   pisable. Lo que va adentro no se cuenta, asi que se saca entero antes de
   medir. Sin esto, `:where(.marco.oscuro) .cab` se leia como si fueran tres
   clases y esta comprobacion denunciaba justo la forma correcta de escribirlo. */
function sinWhere(sel){
  let s = String(sel);
  let i;
  while((i = s.indexOf(':where(')) >= 0){
    let prof = 0;
    let j = i + 6;
    for(; j < s.length; j++){
      if(s[j] === '(') prof++;
      else if(s[j] === ')'){ prof--; if(prof === 0){ j++; break; } }
    }
    s = s.slice(0, i) + ' ' + s.slice(j);
  }
  return s;
}
function especificidad(sel){
  const s = sinWhere(sel);
  const a = (s.match(/#[\w-]+/g) || []).length;
  const b = (s.match(/\.[\w-]+/g) || []).length +
            (s.match(/\[[^\]]*\]/g) || []).length +
            pseudoClases(s).length;
  const c = (s.match(/::[a-z-]+/g) || []).length +
            (s.replace(/::?[a-z-]+(\([^)]*\))?|\.[\w-]+|#[\w-]+|\[[^\]]*\]/g, ' ')
               .match(/\b[a-z][a-z0-9]*\b/g) || []).length;
  return [a, b, c];
}
const comparar = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

/* un selector partido en compuestos, uno por elemento */
function compuestos(sel){
  return sinWhere(sel).split(/\s*[>+~]\s*|\s+/).filter(Boolean).map(t => ({
    clases: (t.match(/\.[\w-]+/g) || []).map(x => x.slice(1)),
    etiqueta: (t.match(/^[a-z][a-z0-9]*/) || [])[0] || null
  }));
}

/* ¿esta regla de la hoja base le puede caer encima a esta pieza? Se mira el
   ULTIMO compuesto, que es el elemento que la regla viste: tiene que ser la
   pieza o menos que la pieza. Los antepasados NO se miran: son envoltorios
   nuestros -.marco esta siempre arriba de todo- y darlos por buenos es lo
   que hace que esta comprobacion muerda.

   De los pseudo-elementos se dejan pasar casi todos, pero no por ser
   pseudo-elementos: es que visten OTRA cosa. ::before y ::after son un nodo
   generado; ::selection pinta el texto marcado con el mouse y ::marker la
   viñeta; ::-webkit-scrollbar es la barra. Nada de eso le pisa al modelo lo
   que escribio para la pieza. Los dos que SI se lo pisan son ::first-line y
   ::first-letter: mandan sobre el font-size y el color del propio texto de
   la pieza, asi que esos se miden como cualquier otra regla. El codigo se
   salteaba los pseudo-elementos EN BLOQUE y el comentario decia "::before y
   ::after", que es otra cosa: un `.hero.compacta h1::first-line{font-size}`
   pasaba en verde.

   Y cae de los DOS lados, que es lo que faltaba. Medido: `.marco.oscuro .cab`
   se cazaba -la variante esta en un antepasado y el ultimo compuesto sigue
   siendo `.cab` pelado-, pero `.cab.fija` y `.hero h1.grande` pasaban en
   verde, y le ganan igual a lo que el modelo escriba para `.cab` y para
   `.hero h1`. Es la MISMA variante que el modelo no puede nombrar, solo que
   pegada al propio elemento. Para ese lado se exige que las etiquetas
   coincidan de verdad: si no, `.tarjeta-txt.grande` (sin etiqueta) se leia
   como si pudiera caer sobre `.cuerpo p` y denunciaba choques inventados. */
function leAplica(selCss, pieza){
  if(/::/.test(selCss) && !/::first-(line|letter)\b/.test(selCss)) return false;
  const ultimoCss = compuestos(selCss).pop();
  const ultimaPieza = compuestos(pieza).pop();
  if(ultimoCss.etiqueta && ultimoCss.etiqueta !== ultimaPieza.etiqueta) return false;
  /* la regla es la pieza o menos que la pieza (`.cab`, `h1`) */
  if(ultimoCss.clases.every(c => ultimaPieza.clases.includes(c))) return true;
  /* o es la pieza con clases de mas encima (`.cab.fija`, `h1.grande`) */
  return ultimoCss.etiqueta === ultimaPieza.etiqueta &&
         ultimaPieza.clases.every(c => ultimoCss.clases.includes(c));
}

const reglasHoja = reglasPlanas(hoja);

/* EL ALCANCE DE ESTA COMPROBACION, MEDIDO Y NO SUPUESTO.
   reglasPlanas() lee las llaves a mano, asi que una sola llave sin cerrar en
   pagina.css se come el resto del archivo y no da error. Medido hoy: con un
   `.fantasma { color: red;` de mas al principio, las 125 reglas quedaron en
   1, no hubo ningun choque -no habia contra que chocar- y el veredicto salio
   "TODO EN REGLA". La comprobacion mas cara del archivo se apaga sola.
   Dos cortes, los dos con su numero de hoy:
   - las llaves tienen que cerrar (hoy 182 abren y 182 cierran);
   - cada una de las 34 piezas tiene que tener AL MENOS una regla en el piso
     (hoy las 34 la tienen). Si una se queda sin ninguna, o el parser se
     descuadro, o esa pieza no tiene piso: las dos son noticia. */
const abren = (hoja.replace(/\/\*[\s\S]*?\*\//g, '').match(/{/g) || []).length;
const cierran = (hoja.replace(/\/\*[\s\S]*?\*\//g, '').match(/}/g) || []).length;
if(abren !== cierran){
  fallar('la hoja base es pisable', 'pagina.css tiene ' + abren + ' llaves que abren y ' +
         cierran + ' que cierran: con una sin cerrar el lector se come el resto del archivo ' +
         'y esta comprobacion deja de mirar la hoja entera');
}
const selectoresDe = regla => regla.sel.split(',').map(x => x.trim()).filter(Boolean);
const sinPiso = PIEZAS_34.filter(p => !reglasHoja.some(r => selectoresDe(r).some(u => leAplica(u, p))));
if(sinPiso.length){
  fallar('la hoja base es pisable', 'de las 34 piezas del prompt, ' + sinPiso.length +
         ' no tienen NI UNA regla en pagina.css (' + sinPiso.join(', ') + '): o pagina.css ' +
         'dejo de darles piso, o no pude leer bien la hoja (lei ' + reglasHoja.length + ' reglas)');
}

/* un !important en el piso lo gana todo, especificidad aparte. Los cuatro
   que hay en pagina.css estan dentro de comentarios explicando justamente
   que no se usan; por eso se cuentan sobre la hoja ya limpia. */
if(/!\s*important/.test(hoja.replace(/\/\*[\s\S]*?\*\//g, ''))){
  fallar('la hoja base es pisable', 'pagina.css tiene un !important: eso no lo pisa ' +
         'NINGUNA regla del modelo, por especifica que sea');
}
let choques = 0;
for(const pieza of PIEZAS_34){
  const espPieza = especificidad(pieza);
  for(const regla of reglasHoja){
    for(const uno of regla.sel.split(',').map(x => x.trim()).filter(Boolean)){
      if(!leAplica(uno, pieza)) continue;
      /* Las pseudo-clases NO cuentan como ventaja: el prompt le pide al
         modelo :hover expresamente, y un `.volver:hover` suyo empata con el
         nuestro y gana por ir despues. La ventaja que el modelo no puede
         igualar es la de las clases y etiquetas de mas -las variantes que
         nadie le nombro-, y eso es lo que queda al descontarlas. */
      const espCss = especificidad(uno);
      const alcanzable = [espPieza[0], espPieza[1] + pseudoClases(uno).length, espPieza[2]];
      if(comparar(espCss, alcanzable) <= 0) continue;
      const props = [...new Set([...regla.cuerpo.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)]
                      .map(m => m[1]).filter(p => PROPS_DECORATIVAS.includes(p)))];
      if(!props.length) continue;
      choques++;
      fallar('la hoja base es pisable', 'pagina.css tiene `' + uno + '` fijando ' +
             props.join(', ') + ', y le gana a la regla `' + pieza + '` que el prompt le ' +
             'ofrece al modelo: lo que escriba ahi se pierde SIN un solo error');
    }
  }
}
/* el alcance va en la linea del resumen a proposito: un "0 choques" solo dice
   que no encontro nada, y no dice sobre cuanto miro. Las llaves y las piezas
   con piso son la prueba de que miro la hoja entera. */
marcar('la hoja base es pisable', PIEZAS_34.length + ' piezas del prompt (las ' +
       PIEZAS_34.length + ' con piso) contra las ' + reglasHoja.length + ' reglas de pagina.css (' +
       abren + ' llaves, cerradas), en ' + PROPS_DECORATIVAS.length +
       ' propiedades decorativas: ' + choques + ' choques');

/* ---------- 9 y 10. EL PROMPT Y EL MEDIDOR, EL MISMO NUMERO Y LA MISMA LISTA ----------
   servidor/medir_diseno.js es quien juzga la respuesta del modelo. Si le
   pide una cosa distinta a la que le pidio el prompt, el modelo cumple al
   pie de la letra lo que leyo y el medidor lo rechaza igual: se pierde una
   respuesta buena y no hay a quien culpar. Se lee como texto y no con
   require() a proposito: asi una version a medio escribir no tumba esto. */
const RUTA_MEDIDOR = path.join(__dirname, 'medir_diseno.js');
const hayMedidor = fs.existsSync(RUTA_MEDIDOR);
const medidor = hayMedidor ? leer(RUTA_MEDIDOR) : '';

/* las nueve obligatorias, tal como se las nombra el prompt */
/* el \r?\n no es adorno: este repo tiene los archivos con fin de linea de
   Windows y un \n pelado no engancha ni una vez */
const bloque9 = (prompt.match(/LAS NUEVE PIEZAS QUE NO PUEDEN QUEDAR SIN VESTIR\r?\n([\s\S]*?)\r?\nCada una/) || ['', ''])[1];
const obligatoriasPrompt = [...bloque9.matchAll(/\.([a-z][\w-]*)(?:[ \t]+([a-z][a-z0-9]*)\b)?/g)]
                             .map(m => '.' + m[1] + (m[2] ? ' ' + m[2] : ''));
if(obligatoriasPrompt.length !== 9){
  fallar('las nueve obligatorias', 'el bloque "LAS NUEVE PIEZAS QUE NO PUEDEN QUEDAR SIN ' +
         'VESTIR" del prompt tiene ' + obligatoriasPrompt.length + ' piezas, no 9: o se ' +
         'movio la lista, o el titulo ya no dice la verdad');
}
if(!hayMedidor){
  anotar('las nueve obligatorias y las 34 piezas', 'servidor/medir_diseno.js todavia no existe, ' +
         'asi que las ' + obligatoriasPrompt.length + ' obligatorias del prompt y las ' +
         PIEZAS_34.length + ' piezas de aca arriba no se compararon con NADA');
} else {
  const listaMedidor = [...((medidor.match(/OBLIGATORIAS\s*=\s*\[([\s\S]*?)\]/) || ['', ''])[1])
                          .matchAll(/'([^']+)'|"([^"]+)"/g)].map(m => m[1] || m[2]);
  /* Exportada de verdad, no nombrada: `medidor.slice(iExporta).includes('OBLIGATORIAS')`
     daba por buena cualquier aparicion de la palabra despues de module.exports,
     un comentario incluido. Se aceptan las dos formas de escribirlo -dentro
     del objeto, o `exports.OBLIGATORIAS =`- y ninguna otra. */
  const exportaObligatorias =
    /(?:module\.)?exports\s*=\s*\{[^}]*\bOBLIGATORIAS\b/.test(medidor) ||
    /(?:module\.)?exports\.OBLIGATORIAS\s*=/.test(medidor);
  if(!listaMedidor.length){
    fallar('las nueve obligatorias', 'medir_diseno.js existe y no pude leerle una lista ' +
           'OBLIGATORIAS = [...]: el medidor y el prompt no se pueden comparar');
  } else if(!exportaObligatorias){
    fallar('las nueve obligatorias', 'medir_diseno.js tiene OBLIGATORIAS y no la exporta: ' +
           'nadie mas puede usarla y la lista se termina copiando a mano en otro archivo');
  } else {
    for(const p of obligatoriasPrompt){
      if(!listaMedidor.includes(p)){
        fallar('las nueve obligatorias', 'el prompt obliga a vestir `' + p +
               '` y medir_diseno.js no la mide: el modelo la cumple y no le sirve de nada');
      }
    }
    for(const p of listaMedidor){
      if(!obligatoriasPrompt.includes(p)){
        fallar('las nueve obligatorias', 'medir_diseno.js exige `' + p +
               '` y el prompt no se la nombra como obligatoria: se le rechaza una respuesta ' +
               'al modelo por algo que nadie le pidio');
      }
    }
    marcar('las nueve obligatorias', obligatoriasPrompt.length + ' piezas del prompt contra las ' +
           listaMedidor.length + ' de medir_diseno.js, en los dos sentidos');
  }
  /* y la lista larga: las 34 piezas estan escritas a mano en el prompt, aca
     arriba y en medir_diseno.js. Tres copias de una misma lista se separan
     solas, y la que se separa deja de medir esa pieza sin decir nada. */
  const piezasMedidor = [...((medidor.match(/\bPIEZAS\s*=\s*\[([\s\S]*?)\]/) || ['', ''])[1])
                           .matchAll(/'([^']+)'|"([^"]+)"/g)].map(m => m[1] || m[2]);
  if(!piezasMedidor.length){
    fallar('las 34 piezas', 'medir_diseno.js existe y no pude leerle su lista PIEZAS = [...]');
  } else {
    for(const p of PIEZAS_34){
      if(!piezasMedidor.includes(p)) fallar('las 34 piezas', 'el prompt ofrece `' + p +
        '` y medir_diseno.js no la mide: esa pieza puede quedar sin vestir y la nota no baja');
    }
    for(const p of piezasMedidor){
      if(!PIEZAS_34.includes(p)) fallar('las 34 piezas', 'medir_diseno.js mide `' + p +
        '` y no esta entre las que el prompt le ofrece al modelo');
    }
    marcar('las 34 piezas', PIEZAS_34.length + ' del prompt contra las ' + piezasMedidor.length +
           ' de medir_diseno.js, en los dos sentidos');
  }
}

/* el piso de reglas: "Entre 30 y 80 reglas, y se cuentan" */
const rango = prompt.match(/Entre\s+(\d+)\s+y\s+(\d+)\s+reglas/);
if(!rango){
  fallar('el piso de reglas', 'el prompt ya no dice cuantas reglas pide ("Entre N y M reglas"), ' +
         'que es el numero contra el que mide el medidor');
} else if(!hayMedidor){
  anotar('el piso de reglas', 'el prompt pide entre ' + rango[1] + ' y ' + rango[2] +
         ' reglas y servidor/medir_diseno.js todavia no existe: su puerta no se comparo con NADA');
} else {
  /* la puerta puede estar escrita de varias formas (reglas.length >= 30,
     MIN_REGLAS = 30). Un `> 29` es el mismo piso que un `>= 30`, asi que se
     compara el numero EFECTIVO y no el que esta escrito. */
  const minimos = [];
  const maximos = [];
  const m1 = medidor.match(/MIN_REGLAS\s*=\s*(\d+)/);
  const m2 = medidor.match(/MAX_REGLAS\s*=\s*(\d+)/);
  if(m1) minimos.push(Number(m1[1]));
  if(m2) maximos.push(Number(m2[1]));
  for(const m of medidor.matchAll(/reglas[^;\n]{0,24}?(>=|<=|>|<)\s*(\d+)/gi)){
    const n = Number(m[2]);
    if(m[1] === '>=') minimos.push(n);
    else if(m[1] === '>') minimos.push(n + 1);
    else if(m[1] === '<=') maximos.push(n);
    else maximos.push(n - 1);
  }
  if(!minimos.length){
    fallar('el piso de reglas', 'medir_diseno.js existe y no le encontre ninguna puerta contra ' +
           'la cantidad de reglas: el prompt pide un minimo de ' + rango[1] + ' que no mide nadie');
  }
  for(const n of new Set(minimos)){
    if(n !== Number(rango[1])){
      fallar('el piso de reglas', 'el prompt le pide al modelo un minimo de ' + rango[1] +
             ' reglas y medir_diseno.js exige ' + n + ': el modelo cumple lo que leyo y lo rechazan igual');
    }
  }
  for(const n of new Set(maximos)){
    if(n !== Number(rango[2])){
      fallar('el piso de reglas', 'el prompt le pone un techo de ' + rango[2] +
             ' reglas y medir_diseno.js corta en ' + n);
    }
  }
  if(minimos.length){
    marcar('el piso de reglas', 'el "entre ' + rango[1] + ' y ' + rango[2] + ' reglas" del prompt ' +
           'contra la puerta de medir_diseno.js: minimo ' + minimos[0] +
           (maximos.length ? ', techo ' + maximos[0] : ', sin techo (el medidor no corta por arriba)'));
  }
}

/* ---------- el veredicto, con su alcance a la vista ---------- */
console.log('QUE SE REVISO');
hechas.forEach(h => console.log('  [ok] ' + h));
if(sinCorrer.length){
  console.log('');
  console.log('QUE NO SE PUDO REVISAR (' + sinCorrer.length + ') — esto NO es verde');
  sinCorrer.forEach(s => console.log('  [sin correr] ' + s));
}
console.log('');
if(fallos.length){
  console.log('FALLA (' + fallos.length + ')');
  fallos.forEach(f => console.log('  [FALLA] ' + f));
  process.exit(1);
}
console.log('TODO EN REGLA: los ' + hechas.length + ' contratos de arriba se cumplen' +
            (sinCorrer.length ? ', y ' + sinCorrer.length + ' quedaron SIN REVISAR (arriba dice cuales).' : '.'));
