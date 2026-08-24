/* EL BANCO DE DISEÑOS: convierte "los diseños salen bonitos" en una tabla
   con numeros que se puede correr antes y despues de tocar el prompt.

   Correlo asi, desde la raiz del proyecto:

     node servidor/banco_disenos.js                 todos los casos
     node servidor/banco_disenos.js arcade museo    solo esos dos
     node servidor/banco_disenos.js --paralelo=2    dos pedidos a la vez
     node servidor/banco_disenos.js --tiempo=400    sube el limite a 400s por caso
     node servidor/banco_disenos.js --remedir       sin servidor: re-mide el CSS guardado

   POR QUE EXISTE. Toda la evidencia de calidad que tenia el proyecto era una
   captura de pantalla y dos mediciones hechas a mano sobre UN solo sitio. Con
   eso, el mismo prompt, el mismo modelo y el mismo sitio dieron un diseño
   espectacular y otro tibio -.hero h1 en 16px, mas chico que su propio
   .seccion de 27px; 20 reglas; 0 :hover; 15 de 34 piezas sin vestir- y no
   habia forma de saber cual de los dos era la excepcion. Una sola muestra no
   distingue "el prompt mejoro" de "esta vez salio bien".

   Y LO MAS IMPORTANTE: los cinco casos cubren las TRES clases de pagina que
   distingue el extractor (documento, catalogo, app). El prompt le cambia el
   ENFOQUE al modelo segun la clase -ver ENFOQUE en prompt_rearmar.js- y ese
   camino nunca se probo entero: a una clase se le pide que trabaje .cuerpo y
   a otra que NO gaste reglas ahi. Sin un caso por clase, medir es medir un
   tercio del prompt.

   LO QUE ESTE BANCO NO MIDE, y por eso no alcanza solo:
   - contraste y legibilidad de los colores elegidos;
   - como se ve de verdad en pantalla: si algo se solapa, se corta o se sale;
   - si el CSS le pega a piezas que en ESA pagina no existen (un catalogo sin
     video igual puede recibir reglas de .play y nadie las ve);
   - el HTML re-armado. Aca solo se mide la hoja que devolvio el servidor.
   Todo eso sigue necesitando el navegador.

   Y LA MAS IMPORTANTE DE TODAS: esto NO es la nota del prompt. servidor.js
   pide varios candidatos, se queda con el mejor y le corre repararCss antes
   de contestar, asi que la hoja que llega aca ya viene elegida y corregida.
   La columna `rem` sale 0 por la reparacion, no porque el prompt haya dejado
   de escribir rem. Mientras el servidor no devuelva tambien el candidato
   crudo, esta tabla es el PISO de lo que ve el usuario y no sirve para
   detectar que el prompt empeoro. Sale impreso al final de cada corrida. */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const RAIZ_SERVIDOR = __dirname;
const DIR_CASOS     = path.join(RAIZ_SERVIDOR, 'fixtures');
const DIR_SALIDAS   = path.join(DIR_CASOS, 'salidas');

/* MEDIDO EN 18 CORRIDAS: la respuesta mas rapida tardo 42s y la mas lenta
   165s, porque cada pedido levanta el CLI de claude. Un limite de 60s -el
   que uno pondria de memoria- habria matado buena parte de las corridas
   buenas y el banco reportaria fallos que son del reloj, no del diseño. Se
   deja el triple del peor caso medido. */
const TIEMPO_POR_CASO = 300000;

/* el chequeo de que el servidor esta arriba no espera a claude: si en 6s no
   contesta un GET, no esta. */
const TIEMPO_ESTADO = 6000;

const URL_BASE = 'http://localhost:4321';

/* ---------- opciones de la linea de comandos ---------- */
function opciones(argv){
  const o = { casos: [], paralelo: 1, tiempo: TIEMPO_POR_CASO, url: URL_BASE, remedir: false };
  for(const a of argv){
    let m;
    if(a === '--remedir'){ o.remedir = true; continue; }
    if((m = a.match(/^--paralelo=(\d+)$/))){
      /* tope de 4 a proposito: cada pedido levanta un proceso del CLI de
         claude en el servidor. Ir mas ancho no acorta el total, alarga cada
         caso y empuja hacia el limite de tiempo de arriba. */
      o.paralelo = Math.max(1, Math.min(4, Number(m[1])));
      continue;
    }
    if((m = a.match(/^--tiempo=(\d+)$/))){
      /* PISO DE 1s, y no es un capricho: req.setTimeout(0) en node no es
         "no esperes", es APAGAR el limite. Medido con --tiempo=0 contra un
         servidor que no contesta nunca, el banco seguia colgado pasados los
         25s, latiendo cada 10s, sin una sola linea que avisara que ya no
         habia reloj. Un banco sin reloj no se cuelga: se abandona. */
      o.tiempo = Math.max(1000, Number(m[1]) * 1000);
      continue;
    }
    if((m = a.match(/^--url=(.+)$/))){
      o.url = m[1].replace(/\/+$/, '');
      /* Se valida ACA y no al pedir. Medido: con --url=hola el banco salia
         con "EL SERVIDOR NO CONTESTA en hola", que le echa la culpa al
         servidor de un error de tipeo tuyo. Y tiene que ser http:// a secas
         porque quien pide es http.request: con https:// hablaria HTTP plano
         contra un puerto TLS y el fallo llegaria como un ECONNRESET que no
         explica nada. */
      let u = null;
      try { u = new URL(o.url); } catch(e){ u = null; }
      if(!u || u.protocol !== 'http:'){
        throw new Error('--url tiene que ser un http://host:puerto y vino "' + m[1] + '"');
      }
      continue;
    }
    if(a.startsWith('--')) throw new Error('no conozco la opcion ' + a);
    o.casos.push(a.replace(/\.json$/i, ''));
  }
  return o;
}

/* ---------- el medidor ----------
   Se carga con require pero DENTRO de una funcion y con el fallo explicado:
   medir_diseno.js lo escribe otra persona, y un `Cannot find module` pelado
   arriba del archivo parece un banco roto cuando lo que falta es la pieza
   de al lado. */
function cargarMedidor(){
  try {
    return require('./medir_diseno');
  } catch(e){
    if(e && e.code === 'MODULE_NOT_FOUND' && /medir_diseno/.test(String(e.message))){
      throw new Error('falta servidor/medir_diseno.js, que es quien mide. ' +
                      'El banco no inventa una medida propia: sin el, no mide nada.');
    }
    throw e;
  }
}

/* ---------- los casos ---------- */
/* UN CASO ES UN .json CON {tema, contenido}, y se comprueba, no se supone:
   fixtures/ es una carpeta compartida -el medidor ya dejo ahi su propio
   css_tibio.css- y el dia que alguien guarde un .json que no sea un cuerpo
   de /api/rearmar, correrlo como caso cuesta hasta 165s y devuelve un fallo
   que no es de nadie. Lo que se descarta se dice, no se calla. */
function casosEnDisco(){
  const casos = [], descartados = [];
  if(!fs.existsSync(DIR_CASOS)) return { casos, descartados };
  for(const archivo of fs.readdirSync(DIR_CASOS).sort()){
    if(!archivo.toLowerCase().endsWith('.json')) continue;
    const nombre = archivo.replace(/\.json$/i, '');
    try {
      const j = JSON.parse(fs.readFileSync(path.join(DIR_CASOS, archivo), 'utf8'));
      if(typeof j.tema === 'string' && j.tema && j.contenido && typeof j.contenido === 'object'){
        casos.push(nombre);
      } else {
        descartados.push({ nombre, motivo: 'no tiene {tema, contenido}: no es un cuerpo de /api/rearmar' });
      }
    } catch(e){
      descartados.push({ nombre, motivo: 'no se pudo leer: ' + e.message });
    }
  }
  return { casos, descartados };
}

function leerCaso(nombre){
  const archivo = path.join(DIR_CASOS, nombre + '.json');
  const cuerpo = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const c = cuerpo.contenido || {};
  return {
    nombre,
    archivo,
    tema: String(cuerpo.tema || ''),
    clase: String(c.clase || '?'),
    flaco: c.flaco === true,
    cuerpo
  };
}

/* ---------- hablarle al servidor ---------- */
function pedirJson(base, ruta, cuerpo, ms){
  return new Promise((listo, mal) => {
    let u;
    try { u = new URL(base + ruta); } catch(e){ return mal(new Error('url invalida: ' + base)); }
    const datos = cuerpo ? Buffer.from(JSON.stringify(cuerpo), 'utf8') : null;
    const cab = { 'Accept': 'application/json' };
    if(datos){ cab['Content-Type'] = 'application/json'; cab['Content-Length'] = datos.length; }

    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: datos ? 'POST' : 'GET',
      headers: cab
    }, res => {
      let txt = '';
      res.setEncoding('utf8');
      res.on('data', d => { txt += d; });
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(txt); } catch(e){ j = null; }
        listo({ codigo: res.statusCode, json: j, texto: txt });
      });
    });
    /* setTimeout de la peticion, no de la conexion: el servidor abre el
       socket enseguida y despues se queda callado 42-165s mientras corre
       claude. Lo que hay que limitar es el silencio, no el saludo. */
    req.setTimeout(ms, () => {
      req.destroy(new Error('no contesto en ' + Math.round(ms / 1000) + 's'));
    });
    req.on('error', e => mal(e));
    if(datos) req.write(datos);
    req.end();
  });
}

async function estadoDelServidor(base){
  try {
    const r = await pedirJson(base, '/api/estado', null, TIEMPO_ESTADO);
    /* CUALQUIER respuesta HTTP prueba que hay servidor, aunque sea un 404:
       servidor.js se esta reescribiendo y /api/estado podria cambiar de
       nombre. Lo que se quiere saber aca es si el puerto contesta. */
    return {
      vivo: true,
      claude: !!(r.json && r.json.claude),
      sabeDeClaude: !!(r.json && Object.prototype.hasOwnProperty.call(r.json, 'claude'))
    };
  } catch(e){
    return { vivo: false, motivo: motivoLegible(e) };
  }
}

function motivoLegible(e){
  /* 'localhost' resuelve a ::1 Y a 127.0.0.1, asi que node prueba las dos y
     envuelve los dos fallos en un AggregateError cuyo .message es la palabra
     'AggregateError' pelada. Medido: sin abrir .errors, el banco reportaba
     "EL SERVIDOR NO CONTESTA: AggregateError", que no le dice a nadie que lo
     que pasa es que el puerto esta cerrado. */
  const texto = String((e && e.message) || e);
  const m = [texto, String((e && e.code) || ''),
             ...(((e && e.errors) || []).map(x => String((x && x.code) || '')))].join(' ');
  if(/ECONNREFUSED/.test(m)) return 'nadie contesta en ese puerto (el servidor no esta arriba)';
  if(/ENOTFOUND|EAI_AGAIN/.test(m)) return 'no se resolvio la direccion';
  if(/ECONNRESET/.test(m)) return 'el servidor corto la conexion a medias';
  return texto === 'AggregateError' ? m.trim() : texto;
}

/* De la respuesta salen dos cosas distintas y conviene no confundirlas:
   el sobre (que trae el servidor) y el CSS (que escribio el modelo).
   Se busca en las dos formas porque servidor.js lo esta tocando otra
   persona ahora mismo: si el sobre cambia de {diseno:{...}} a {...}, el
   banco tiene que seguir encontrando el css y no reportar cinco fallos
   falsos por un cambio de envoltorio. */
function cssDeLaRespuesta(json){
  const d = (json && json.diseno) || json || {};
  return typeof d.css === 'string' ? d.css : null;
}

/* ---------- guardar para poder mirarlo con los ojos ----------
   La cabecera es un comentario CSS y no cambia ninguna medida: no trae
   llaves, ni ':hover', ni 'rem'. Sirve para que el archivo diga solo de que
   corrida salio; al re-medir con --remedir se le quita igual. */
const MARCA_CABECERA = '/* banco_disenos';

function guardarCss(nombre, css, caso, medida, segundos){
  fs.mkdirSync(DIR_SALIDAS, { recursive: true });
  const destino = path.join(DIR_SALIDAS, nombre + '.css');
  const cab = MARCA_CABECERA + ' | ' + caso.tema + ' | clase ' + caso.clase +
              (caso.flaco ? ' (flaca)' : '') + ' | ' + new Date().toISOString().slice(0, 16).replace('T', ' ') +
              ' | ' + segundos + 's\n   ' + resumenDeUnaLinea(medida) + ' */\n';
  fs.writeFileSync(destino, cab + css, 'utf8');
  return destino;
}

function resumenDeUnaLinea(m){
  return 'reglas ' + m.reglas + ' | hover ' + m.hover + ' | pseudo ' + m.pseudo +
         ' | rem ' + m.remEnTamanos + ' | h1 ' + (m.h1 ? Math.round(m.h1.px) + 'px' : 'sin regla') +
         ' | piezas ' + m.piezas.vestidas + '/' + m.piezas.total +
         ' | puntos ' + m.puntos + ' | ' + (m.pasa ? 'PASA' : 'FALLA');
}

function cssGuardado(nombre){
  const destino = path.join(DIR_SALIDAS, nombre + '.css');
  if(!fs.existsSync(destino)) return null;
  const crudo = fs.readFileSync(destino, 'utf8');
  /* `delBanco` no se tira: es la unica forma de distinguir un CSS que salio
     de una corrida de uno que alguien copio a mano en la carpeta. --remedir
     mide lo que encuentre, y medir una hoja de prueba creyendo que es la
     respuesta del modelo es exactamente medir otra cosa. */
  const delBanco = crudo.startsWith(MARCA_CABECERA);
  const limpio = delBanco ? crudo.replace(/^\/\*[\s\S]*?\*\/\s*/, '') : crudo;
  return { css: limpio, fecha: fs.statSync(destino).mtime, delBanco };
}

/* ---------- la corrida ---------- */
function reloj(t0){ return ((Date.now() - t0) / 1000).toFixed(1); }

async function correrCasos(casos, opc, medidor){
  const resultados = [];
  let siguiente = 0;
  const enVuelo = new Map();

  /* UN BANCO QUE PARECE COLGADO ES UN BANCO QUE NADIE CORRE. Con 5 casos a
     165s el peor total pasa los 13 minutos y la consola se queda muda todo
     ese rato; el latido de 10s dice que sigue vivo y cuanto lleva cada uno. */
  const latido = setInterval(() => {
    if(!enVuelo.size) return;
    const linea = [...enVuelo.entries()]
      .map(([n, t0]) => n + ' ' + reloj(t0) + 's').join(', ');
    console.log('   ... esperando: ' + linea);
  }, 10000);

  async function obrero(){
    while(siguiente < casos.length){
      const i = siguiente++;
      const caso = casos[i];
      const t0 = Date.now();
      enVuelo.set(caso.nombre, t0);
      console.log('[' + (i + 1) + '/' + casos.length + '] ' + caso.nombre +
                  ' — "' + caso.tema + '" (clase ' + caso.clase + (caso.flaco ? ', flaca' : '') + ') ...');
      let fila;
      try {
        const r = await pedirJson(opc.url, '/api/rearmar', caso.cuerpo, opc.tiempo);
        const seg = reloj(t0);
        if(r.codigo !== 200){
          const detalle = (r.json && r.json.error) || r.texto.slice(0, 120) || 'sin detalle';
          fila = { i, caso, estado: 'salteado', motivo: 'el servidor contesto ' + r.codigo + ': ' + detalle, seg };
        } else {
          const css = cssDeLaRespuesta(r.json);
          if(css === null){
            /* NO se cuenta como diseño reprobado: si no se encontro el campo
               css, lo que fallo puede ser el envoltorio y medir cero seria
               inventar un fallo de diseño que nadie cometio. */
            fila = { i, caso, estado: 'salteado', seg,
                     motivo: 'la respuesta no traia campo css (revisa el envoltorio de /api/rearmar)' };
          } else {
            const medida = medidor.medirCss(css);
            const destino = guardarCss(caso.nombre, css, caso, medida, seg);
            fila = { i, caso, estado: 'medido', medida, css, seg, destino };
          }
        }
      } catch(e){
        fila = { i, caso, estado: 'salteado', motivo: motivoLegible(e), seg: reloj(t0) };
      }
      enVuelo.delete(caso.nombre);
      console.log('    ' + (fila.estado === 'medido'
        ? '-> ' + fila.seg + 's  ' + resumenDeUnaLinea(fila.medida)
        : '-> ' + fila.seg + 's  SALTEADO: ' + fila.motivo));
      resultados.push(fila);
    }
  }

  /* clearInterval en finally y no en la linea de abajo: el latido es un
     setInterval sin unref, o sea que MANTIENE VIVO el proceso. Si un obrero
     llegara a lanzar fuera de su try, el proceso no moriria con el error: se
     quedaria latiendo para siempre sobre una corrida que ya se murio. */
  try {
    await Promise.all(Array.from({ length: Math.min(opc.paralelo, casos.length) }, obrero));
  } finally {
    clearInterval(latido);
  }
  resultados.sort((a, b) => a.i - b.i);
  return resultados;
}

function remedirCasos(casos, medidor){
  return casos.map((caso, i) => {
    const g = cssGuardado(caso.nombre);
    if(!g) return { i, caso, estado: 'salteado', seg: '0.0',
                    motivo: 'no hay CSS guardado en fixtures/salidas (corre el banco contra el servidor primero)' };
    const medida = medidor.medirCss(g.css);
    return { i, caso, estado: 'medido', medida, css: g.css, seg: '0.0',
             guardadoEl: g.fecha, delBanco: g.delBanco };
  });
}

/* ---------- la tabla ----------
   Se arma con anchos calculados, no fijos: un tema largo o un caso nuevo
   desalinean una tabla de anchos a mano y una tabla desalineada se deja de
   leer. Sin acentos adentro de las celdas: la consola de Windows los rompe
   y un caracter roto corre la columna. */
function imprimirTabla(cabeceras, filas, alineadasDerecha){
  const anchos = cabeceras.map((c, j) =>
    Math.max(String(c).length, ...filas.map(f => String(f[j]).length)));
  const linea = (celdas, relleno) => celdas.map((c, j) => {
    const t = String(c);
    const hueco = (relleno || ' ').repeat(anchos[j] - t.length);
    return alineadasDerecha[j] ? hueco + t : t + hueco;
  }).join('  ').replace(/\s+$/, '');

  console.log(linea(cabeceras));
  console.log(anchos.map(a => '-'.repeat(a)).join('  '));
  filas.forEach(f => console.log(linea(f)));
}

function corto(t, n){
  const s = String(t || '');
  return s.length <= n ? s : s.slice(0, n - 1) + '.';
}

/* ---------- el informe ---------- */
function informe(resultados, opc, medidor){
  const medidos  = resultados.filter(r => r.estado === 'medido');
  const salteados = resultados.filter(r => r.estado === 'salteado');

  /* JAMAS UNA TABLA VACIA. Una tabla con encabezado y sin filas se confunde
     con "corrio y no hubo nada que reportar", que es exactamente al reves de
     lo que paso. */
  if(!medidos.length){
    console.log('');
    console.log('NO SE MIDIO NI UN CASO. No hay tabla que imprimir.');
    salteados.forEach(r => console.log('  - ' + r.caso.nombre + ': ' + r.motivo));
    console.log('');
    console.log('ALCANCE: 0 de ' + resultados.length + ' casos medidos. Esto NO es un verde.');
    return 2;
  }

  const cabeceras = ['caso', 'clase', 'tema', 'reglas', 'hover', 'pseudo', 'rem',
                     'h1 px', 'piezas', 'min px', 'firma', 'puntos', 'resultado'];
  const derecha   = [false, false, false, true, true, true, true, true, true, true, false, true, false];
  const filas = medidos.map(r => {
    const m = r.medida;
    return [
      r.caso.nombre,
      r.caso.clase + (r.caso.flaco ? '/flaca' : ''),
      corto(r.caso.tema, 26),
      m.reglas, m.hover, m.pseudo, m.remEnTamanos,
      m.h1 ? Math.round(m.h1.px) : '-',
      m.piezas.vestidas + '/' + m.piezas.total,
      m.minimoPx == null ? '-' : Math.round(m.minimoPx),
      m.firmaTitulo ? 'si' : 'no',
      m.puntos,
      m.pasa ? 'PASA' : 'FALLA'
    ];
  });

  console.log('');
  imprimirTabla(cabeceras, filas, derecha);

  /* EL DETALLE DEL FALLO ES LA MITAD DEL VALOR: "FALLA" en una celda no dice
     que tocar. Se separa lo MECANICO -lo que repararCss corrige solo: rem,
     el piso de 12px, el titulo chico- de lo que es decision de diseño -un
     :hover que falta, una pieza sin vestir-, porque solo lo segundo se
     arregla tocando el prompt.

     OJO CON LEER ESTE PASO COMO "todavia le queda un reintento": en una
     corrida contra el servidor NO le queda. servidor.js ya le corrio
     repararCss al ganador antes de contestar (`d.css = rep.css`, justo
     antes del writeHead 200), asi que lo que mide el banco es CSS ya
     reparado y esta segunda pasada casi siempre no encuentra nada. Cuando
     no encuentra nada se dice, en vez de dejar el hueco: un renglon mudo
     aca se lee como "el reparador no sirve". */
  const fallando = medidos.filter(r => !r.medida.pasa);
  if(fallando.length){
    console.log('');
    console.log('POR QUE FALLAN:');
    for(const r of fallando){
      console.log('  ' + r.caso.nombre + ':');
      (r.medida.fallos || []).forEach(f => console.log('    - ' + f.texto));
      if(r.medida.obligatoriasSinVestir && r.medida.obligatoriasSinVestir.length){
        console.log('    - sin vestir: ' + r.medida.obligatoriasSinVestir.join(' '));
      }
      try {
        const rep = medidor.repararCss(r.css, r.medida);
        const despues = medidor.medirCss(rep.css);
        if(rep.arreglos && rep.arreglos.length){
          console.log('    el reparador toca: ' + rep.arreglos.join('; '));
          console.log('    despues de reparar: ' + (despues.pasa
            ? 'PASA (era mecanico, no hace falta tocar el prompt)'
            : 'sigue fallando (es decision de diseño: reintento o otro candidato)'));
        } else {
          console.log('    el reparador no encuentra nada que tocar: lo que falta es ' +
                      'decision de diseño, no correccion mecanica.');
          console.log('    (contra el servidor esto es lo esperado: ya venia reparado.)');
        }
      } catch(e){
        console.log('    el reparador se cayo: ' + e.message);
      }
    }
  }

  const pasaron = medidos.filter(r => r.medida.pasa).length;
  console.log('');
  console.log('PASARON ' + pasaron + ' de ' + medidos.length + ' casos medidos.');

  if(salteados.length){
    console.log('');
    console.log('SALTEADOS (' + salteados.length + '):');
    salteados.forEach(r => console.log('  - ' + r.caso.nombre + ': ' + r.motivo));
  }

  console.log('');
  console.log('NO SE MIDE: contraste de los colores, como se ve de verdad en pantalla');
  console.log('(solapes, cortes, desbordes), ni el HTML re-armado. Solo la hoja del modelo.');
  /* ESTO NO PUEDE FALTAR O LA TABLA SE LEE AL REVES DE LO QUE ES. Lo que
     devuelve /api/rearmar no es el borrador del modelo: servidor.js pide
     CANDIDATOS a la vez, se queda con el MEJOR y ademas le pasa repararCss
     antes de contestar. O sea que la columna `rem` sale 0 por la reparacion
     y no por el prompt, y `h1 px` y `min px` ya vienen levantados. Sin este
     renglon, un prompt que empeorara y volviera a escribir rem daria una
     tabla igual de verde: el clasico verde sin cobertura. Para medir el
     PROMPT hace falta que el servidor devuelva tambien el candidato crudo. */
  console.log('TAMPOCO ES LA NOTA DEL PROMPT: /api/rearmar devuelve el MEJOR de N candidatos');
  console.log('y ya reparado (rem->px, piso y titulo). Esto mide lo que VE EL USUARIO, que es');
  console.log('el piso; la columna rem sale 0 por la reparacion, no por el prompt.');
  console.log('ALCANCE: ' + medidos.length + ' de ' + resultados.length + ' casos medidos, ' +
              salteados.length + ' salteados, contra ' + medidor.PIEZAS.length + ' piezas (' +
              medidor.OBLIGATORIAS.length + ' obligatorias)' +
              (opc.remedir ? '. FUENTE: CSS guardado en fixtures/salidas, NO una corrida nueva.'
                           : '. FUENTE: ' + opc.url + '.'));

  return (pasaron === medidos.length && !salteados.length) ? 0 : 1;
}

/* ---------- principal ---------- */
async function principal(){
  let opc;
  try { opc = opciones(process.argv.slice(2)); }
  catch(e){ console.log('ALCANCE: 0 casos medidos — ' + e.message); return 2; }

  let medidor;
  try { medidor = cargarMedidor(); }
  catch(e){ console.log('ALCANCE: 0 casos medidos — ' + e.message); return 2; }

  const { casos: disponibles, descartados } = casosEnDisco();
  descartados.forEach(d => console.log('OJO: se descarto fixtures/' + d.nombre + '.json — ' + d.motivo));
  if(!disponibles.length){
    console.log('ALCANCE: 0 casos medidos — no hay ni un caso valido en servidor/fixtures.');
    return 2;
  }

  const pedidos = opc.casos.length ? opc.casos : disponibles;
  const noExisten = pedidos.filter(n => !disponibles.includes(n));
  if(noExisten.length){
    /* si te equivocaste al escribir el nombre, correr los OTROS y no decir
       nada es peor que no correr: la tabla sale bien y le falta el caso que
       ibas a mirar. */
    console.log('ALCANCE: 0 casos medidos — no existe(n): ' + noExisten.join(', ') +
                '. Hay: ' + disponibles.join(', ') + '.');
    return 2;
  }

  let casos;
  try { casos = pedidos.map(leerCaso); }
  catch(e){ console.log('ALCANCE: 0 casos medidos — un fixture no se pudo leer: ' + e.message); return 2; }

  if(opc.remedir){
    console.log('RE-MIDIENDO el CSS ya guardado en fixtures/salidas. No se le pide nada al servidor.');
    const resultados = remedirCasos(casos, medidor);
    resultados.filter(r => r.estado === 'medido').forEach(r =>
      console.log('  ' + r.caso.nombre + ' (guardado ' +
                  new Date(r.guardadoEl).toISOString().slice(0, 16).replace('T', ' ') + '): ' +
                  resumenDeUnaLinea(r.medida) +
                  (r.delBanco ? '' : '   <- OJO: sin cabecera del banco, este .css NO salio de una corrida')));
    return informe(resultados, opc, medidor);
  }

  const est = await estadoDelServidor(opc.url);
  if(!est.vivo){
    /* EL VERDE SIN COBERTURA. Sin servidor no hay nada que medir y el banco
       tiene que decirlo en la primera linea y salir distinto de cero, no
       dibujar una tabla vacia. */
    console.log('EL SERVIDOR NO CONTESTA en ' + opc.url + ': ' + est.motivo + '.');
    console.log('Levantalo con INICIAR.bat y volve a correr el banco.');
    console.log('');
    console.log('ALCANCE: 0 de ' + casos.length + ' casos medidos. No se midio NADA. Esto NO es un verde.');
    return 2;
  }
  if(est.sabeDeClaude && !est.claude){
    console.log('OJO: el servidor esta arriba pero dice que no encuentra el CLI de claude.');
    console.log('Van a fallar todos los casos. Revisalo antes de creerle a la tabla.');
  }

  console.log('BANCO DE DISEÑOS — ' + casos.length + ' caso(s), ' + opc.paralelo +
              ' a la vez, limite ' + Math.round(opc.tiempo / 1000) + 's por caso.');
  console.log('Medido en 18 corridas: cada respuesta tarda entre 42s y 165s. Aguanta.');
  console.log('');

  const t0 = Date.now();
  const resultados = await correrCasos(casos, opc, medidor);
  const guardados = resultados.filter(r => r.estado === 'medido').length;
  console.log('');
  /* si no se guardo ni un CSS, decirlo igual es una mentira chiquita que
     manda a mirar una carpeta con lo de la corrida ANTERIOR adentro. */
  console.log('Total: ' + reloj(t0) + 's.' + (guardados
    ? ' ' + guardados + ' CSS guardado(s) en servidor/fixtures/salidas/.'
    : ' No se guardo ningun CSS.'));
  return informe(resultados, opc, medidor);
}

/* Se ejecuta solo cuando lo corres a mano. Exportado, otro archivo puede
   reusar la corrida sin heredar el process.exit. */
if(require.main === module){
  principal().then(codigo => { process.exitCode = codigo; })
             .catch(e => {
               console.log('ALCANCE: 0 casos medidos — el banco se cayo: ' + (e && e.message));
               process.exitCode = 2;
             });
}

module.exports = { principal, opciones, leerCaso, casosEnDisco, correrCasos, informe };
