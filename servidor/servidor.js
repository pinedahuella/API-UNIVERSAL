/* Servidor local de API UNIVERSAL.
   Sirve la pagina y expone /api/disenar, que le pide a Claude CLI (Haiku)
   que diseñe la pagina segun las respuestas del test.

   Si Claude no esta o tarda demasiado, responde 503 y la pagina se arma
   con el generador local. La generacion es un extra, nunca un requisito.

   /api/rearmar no le pide UN diseno al modelo: SI servidor/medir_diseno.js
   esta, le pide N a la vez, los mide y devuelve el mejor. Si NO esta, pide
   uno solo y lo devuelve sin medir ni reparar; el cartel de arranque dice
   cual de los dos esta corriendo, porque son dos comportamientos distintos.
   El mismo prompt sobre el mismo sitio dio un diseno de 40 reglas y otro de
   20 con .hero h1 en 16px: pedir mejor es un aviso, elegir entre varios es
   un mecanismo.

   Correr:  node servidor/servidor.js     ->  http://localhost:4321 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PUERTO = Number(process.env.PUERTO || 4321);
const RAIZ = path.join(__dirname, '..');
const TIMEOUT = 200000;   // ver el comentario del TOPE en contenido.js

/* Cuantos disenos se le piden al modelo A LA VEZ en /api/rearmar, para
   quedarse con el mejor. Van EN PARALELO, no en serie, y la razon es el
   reloj: medido en _salida.log sobre 18 corridas, una respuesta tarda entre
   41.9s y 164.1s, con mediana 106s. Dos vueltas en serie darian hasta 340s y
   el cliente corta a los 185s (TOPE en contenido.js), asi que pedir-medir-
   repedir no cabe. En paralelo el reloj de pared sigue siendo el de UNA sola
   llamada (la mas lenta de las N) y la calidad sube porque se ELIGE.
   Tope en 4: arriba de eso son 4 procesos de claude peleandose la misma
   maquina, y cada uno se vuelve mas lento, que es justo lo que no sobra.
   El Math.round no es adorno: sin el, CANDIDATOS=3.7 imprimia "3.7
   candidato(s) en paralelo" en el cartel Y en el log del pedido, y despues
   Array.from({length:3.7}) lanzaba 3. Un contador que no cuenta lo que dice
   arruina el unico registro que hay para saber por que gano el que gano. */
const CANDIDATOS = Math.min(4, Math.max(1, Math.round(Number(process.env.CANDIDATOS || 2)) || 2));

/* El medidor es OPCIONAL a proposito. Si medir_diseno.js todavia no existe o
   quedo roto, el servidor tiene que arrancar y responder igual que antes de
   que existiera: un solo candidato, sin nota y sin reparar. Un servidor que no
   levanta por el modulo que le mide la calidad al diseno seria peor que un
   diseno tibio. */
let MEDIDOR = null;
let motivoSinMedidor = '';
try {
  const m = require('./medir_diseno');
  if(m && typeof m.medirCss === 'function' && typeof m.queFalto === 'function' &&
     typeof m.repararCss === 'function') MEDIDOR = m;
  else motivoSinMedidor = 'el modulo carga pero no tiene medirCss/queFalto/repararCss';
} catch(e){
  /* solo el primer renglon: cuando el modulo no esta, el mensaje de node trae
     pegado un "Require stack" de varias lineas que parte el cartel de arranque */
  motivoSinMedidor = String(e && e.message || e).split('\n')[0].slice(0, 120);
}

const TIPOS = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf'
};

/* ---------- donde esta claude ---------- */
function buscarClaude(){
  if(process.env.CLAUDE_PATH && fs.existsSync(process.env.CLAUDE_PATH)) return process.env.CLAUDE_PATH;
  const posibles = [
    path.join(os.homedir(), '.local', 'bin', 'claude.exe'),
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'claude.cmd'),
    '/usr/local/bin/claude'
  ];
  for(const p of posibles) if(fs.existsSync(p)) return p;
  return '';
}
const CLAUDE = buscarClaude();

/* ---------- el prompt ---------- */
const SISTEMA = 'Sos un diseñador de paginas web. Respondes UNICAMENTE con un objeto JSON valido. ' +
  'Sin markdown, sin explicaciones, sin texto antes ni despues.';

function prompt(r){
  return `Una persona acaba de crear su cuenta en una red social y contesto esto:

Se llama: ${r.nombre}
Le gusta: ${r.gustos}

Diseñale la pagina COMPLETA sobre lo que a ella le gusta, sea lo que sea. Si lo que
dijo es raro o muy especifico (por ejemplo "literatura grecolatina y poesia" o
"coleccionar estampillas"), NO lo fuerces a una categoria generica: invental su propio
tema con su contenido. Devolve SOLO este JSON:

{
 "tema": {
   "nombre": "el tema de su pagina, 1 a 3 palabras, sacado de lo que dijo",
   "emoji": "un emoji que lo represente",
   "motivos": [4 emojis distintos que acompañen ese tema],
   "saludo": "una palabra con la que su pagina lo saluda, que vaya con el tema"
 },
 "videos": [4 objetos {"titulo":"titulo creible de un video sobre ese tema, en español",
                       "canal":"nombre del canal","dur":"m:ss"}],
 "publicaciones": [2 objetos {"titulo":"titulo de una publicacion de foro","texto":"una frase"}],
 "intereses": [0 a 2 ids SOLO si de verdad encajan, de esta lista exacta: perros, gatos, futbol, musica, tecnologia, comida, viajes, videojuegos, autos, arte],
 "titulo": "nombre corto para su pagina, maximo 4 palabras",
 "bienvenida": "saludo de 2 frases a ${r.nombre}, tuteando, en español de Guatemala, que mencione lo que le gusta",
 "aire": "como se siente el diseño, maximo 5 palabras, ejemplo: De biblioteca vieja",
 "acento": "#hex",
 "acento2": "#hex",
 "fondo": "#hex",
 "oscuro": true o false,
 "fuente_tit": una de: Fredoka, Quicksand, Bebas Neue, Space Grotesk, Playfair Display, Lora,
 "fuente_txt": una de: Fredoka, Quicksand, Space Grotesk, Lora
}

Reglas: si "oscuro" es true, "fondo" oscuro y "acento" claro y brillante. Si es false,
"fondo" claro pero NUNCA blanco. El acento tiene que contrastar contra el fondo.
Los colores y las fuentes tienen que ir con el tema, no elijas al azar.
Nada de texto fuera del JSON.`;
}

/* ---------- vestir una pagina que ya existe ---------- */
function promptVestir(r){
  const est = JSON.stringify(r.estructura || {}).slice(0, 3500);
  return `Vestir una pagina web que YA EXISTE, solo con CSS desde el navegador.
La pagina es de: ${r.tema}

Esqueleto de la pagina (selector, ancho w, alto h, posicion x/y, cuantas img/a/btn tiene):
${est}

Devolve SOLO este JSON:
{
 "titulo":"nombre de la pagina, 2 a 4 palabras",
 "bienvenida":"dos frases presentandola, en español de Guatemala, tuteando",
 "acento":"#hex", "acento2":"#hex", "fondo":"#hex", "oscuro":true|false,
 "fuente_tit":"Fredoka|Quicksand|Bebas Neue|Space Grotesk|Playfair Display|Lora|Pixel|Mono",
 "fuente_txt":"Fredoka|Quicksand|Space Grotesk|Lora|Mono",
 "radio":"0px a 28px", "mayus":true|false,
 "iconos":[4 ids de la lista de abajo, o {"id":"nombre","d":"path SVG"} si de verdad no hay ninguno que sirva],
 "selectores":{"zonas":["1-2 selectores del esqueleto"],"tarjetas":["1-2"],"titulos":["1-2"]}
}

ICONOS: son la marca visual del tema. ELEGI 4 de esta lista, por su nombre exacto:
arbol, auto, caballo, cactus, camara, cohete, columna, conejo, control, engranaje, flor, gato, guitarra, hoja, huella, hueso, joystick, libro, llave, luna, maceta, maleta, mariposa, microfono, monitor, montana, nota, nube, ola, pajaro, paleta, pelicula, pelota, pergamino, perro, pez, piano, pincel, planta, pluma, raton, rueda, semilla, sol, taco, tortuga, trofeo

Elegi los que mejor evoquen "${r.tema}", aunque no sean literales: para un desierto
sirven cactus, sol y montana; para poesia griega, columna, pergamino y pluma.
SOLO si de verdad ninguno de la lista sirve, devolve un objeto {"id","d"} con el path
dibujado por vos: UN path relleno, viewBox 0 0 24 24, todo entre 2 y 22, silueta solida
que se lea a 16px, cerrado con Z.

COLOR: si oscuro es true, fondo oscuro y acento claro y brillante; si es false, fondo
claro pero nunca blanco. El acento tiene que contrastar contra el fondo.

FORMA: si el tema pide algo firme y sin curvas (arcade, taller, deportes, 8 bits),
poné radio "0px" o "2px" con fuente Pixel, Mono o Bebas Neue y mayus true.

SELECTORES: copiá solo selectores que aparezcan en el esqueleto, tal cual. Nada de
zonas que cubran toda la pantalla (h mayor a 2000). Nada de texto fuera del JSON.`;
}

/* El pedido de re-armar vive aparte: es largo y es lo que define hasta
   donde puede llegar el diseño. Ver servidor/prompt_rearmar.js */
const { promptRearmar } = require('./prompt_rearmar');

function pedirAClaude(prompt){
  return new Promise((ok, mal) => {
    if(!CLAUDE) return mal(new Error('claude CLI no encontrado'));
    const hijo = execFile(CLAUDE,
      ['--print', '--system-prompt', SISTEMA, '--allowedTools', '', '--model', 'haiku', '-p', prompt],
      { timeout: TIMEOUT, cwd: os.tmpdir(), maxBuffer: 8 * 1024 * 1024,
        env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' }) },
      (err, salida) => {
        if(err) return mal(new Error(err.killed ? 'claude tardo demasiado' : String(err.message).slice(0,180)));
        try { ok(sacarJSON(salida)); } catch(e){ mal(e); }
      });
    hijo.on('error', mal);
  });
}

/* Desde que se le pide CSS, la respuesta trae un campo de texto largo con
   saltos de linea, y un salto de linea CRUDO adentro de una cadena JSON es
   JSON invalido. Si el modelo se olvida de escaparlo, se repara en vez de
   tirar todo el diseño a la basura por un caracter. */
function repararCadenas(t){
  /* sin barras invertidas escritas a mano: el \n de aca seria un salto
     de linea de verdad segun quien lea el archivo. Se arman por codigo. */
  const BARRA = String.fromCharCode(92), SALTO = String.fromCharCode(10),
        RETORNO = String.fromCharCode(13), TAB = String.fromCharCode(9);
  let salida = '', dentro = false, escapado = false;
  for(const ch of t){
    if(escapado){ salida += ch; escapado = false; continue; }
    if(ch === BARRA){ salida += ch; escapado = true; continue; }
    if(ch === '"'){ dentro = !dentro; salida += ch; continue; }
    if(dentro && (ch === SALTO || ch === RETORNO)){ salida += BARRA + 'n'; continue; }
    if(dentro && ch === TAB){ salida += BARRA + 't'; continue; }
    salida += ch;
  }
  return salida;
}

function sacarJSON(txt){
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if(a < 0 || b < a) throw new Error('sin JSON en la respuesta');
  const crudo = txt.slice(a, b + 1);
  try { return JSON.parse(crudo); }
  catch(e){ return JSON.parse(repararCadenas(crudo)); }
}

function disenar(respuestas){
  return new Promise((ok, mal) => {
    if(!CLAUDE) return mal(new Error('claude CLI no encontrado'));
    const hijo = execFile(CLAUDE,
      ['--print', '--system-prompt', SISTEMA, '--allowedTools', '', '--model', 'haiku',
       '-p', prompt(respuestas)],
      { timeout: TIMEOUT, cwd: os.tmpdir(), maxBuffer: 8 * 1024 * 1024,
        env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' }) },
      (err, salida) => {
        if(err) return mal(new Error(err.killed ? 'claude tardo demasiado' : String(err.message).slice(0,180)));
        try { ok(sacarJSON(salida)); } catch(e){ mal(e); }
      });
    hijo.on('error', mal);
  });
}

/* ---------- elegir entre varios candidatos ---------- */

/* medirCss promete no lanzar nunca, pero lo escribe otro modulo: si un dia
   lanza, el candidato se queda sin nota y sigue compitiendo como el ultimo de
   la fila, en vez de tumbar el pedido entero. */
function medirSeguro(css){
  if(!MEDIDOR) return null;
  try { return MEDIDOR.medirCss(String(css == null ? '' : css)); }
  catch(e){
    console.log(`[rearmar] el medidor lanzó midiendo (${e.message}); ese candidato va sin nota.`);
    return null;
  }
}

function piezasVestidas(m){ return (m && m.piezas && Number(m.piezas.vestidas)) || 0; }
function puntosDe(m){ return (m && Number(m.puntos)) || 0; }

/* Manda PRIMERO haber pasado las puertas duras, y recien despues el puntaje.
   Las puertas son las que separan un diseno usable de uno ilegible (.hero h1
   en 16px, .hero-img sin una sola regla): eso no se compensa sumando puntos
   en otro lado. Medido con un arnes offline antes de esta linea: un candidato
   de 70 pts que NO pasaba le ganaba a uno de 60 que SI pasaba, y el servidor
   escribia "el ganador NO pasa las puertas duras, va igual" teniendo al bueno
   en la misma tanda. Medir las puertas y despues ignorarlas al elegir es
   exactamente el verde sin cobertura que este mecanismo venia a evitar.
   Si empatan en puertas y puntos, gana el que viste mas de las 34 piezas, que
   es justo lo que separaba al diseno joya del tibio (34 de 34 contra 19 de 34).
   Un candidato sin medir nunca le gana a uno medido: no se sabe cuanto vale. */
function esMejor(a, b){
  if(!a.m) return false;
  if(!b.m) return true;
  if(!!a.m.pasa !== !!b.m.pasa) return !!a.m.pasa;
  if(puntosDe(a.m) !== puntosDe(b.m)) return puntosDe(a.m) > puntosDe(b.m);
  return piezasVestidas(a.m) > piezasVestidas(b.m);
}

/* Una linea por candidato con sus numeros crudos, para que despues se pueda
   leer POR QUE gano el que gano sin tener que creerle al servidor. */
function lineaCandidato(v){
  if(!v.m) return `[rearmar] #${v.n} en ${v.seg}s — sin medir`;
  const m = v.m, p = m.piezas || {};
  /* un tamaño que no se pudo resolver a px se escribe '?' y no 'NaNpx': el log
     es para leer los numeros, no para dudar de ellos. null/undefined tambien
     dan '?', porque Number(null) es 0 y un 0px inventado se lee como una
     medida real. Y pasa TODO tamaño por aca: cuando 'minimo' se formateaba
     aparte, un minimo de 0px salia como '?' y uno de 10.5 salia sin redondear
     mientras el resto iba redondeado. */
  const px = n => (n === null || n === undefined || n === '' || !Number.isFinite(Number(n)))
                    ? '?' : Math.round(Number(n)) + 'px';
  const h1 = m.h1 ? px(m.h1.px) : 'SIN REGLA';
  let l = `[rearmar] #${v.n} en ${v.seg}s — ${m.reglas} reglas, ${m.hover} hover, ` +
          `${m.pseudo} pseudo, ${m.remEnTamanos} rem, h1 ${h1}, ` +
          `cuerpo ${px(m.cuerpoPx)}, ` +
          `${(m.tamanos || []).length} tamaños, minimo ${px(m.minimoPx)}, ` +
          `firma ${m.firmaTitulo ? 'si' : 'no'}, ` +
          `${piezasVestidas(m)}/${Number(p.total) || 0} piezas, ${puntosDe(m)} pts`;
  /* si no pasa pero viene sin fallos, se dice ASI y no con un 'no pasa:' que
     termina en nada: un renglon cortado se lee como un log truncado y manda a
     buscar el bug al lado equivocado. */
  const porque = (m.fallos || []).map(f => (f && (f.texto || f.clave)) || '?')
                                 .join('; ').slice(0, 220);
  l += m.pasa ? ' — PASA' : ' — no pasa: ' + (porque || 'el medidor no dijo en que');
  return l;
}

/* ---------- servidor ---------- */
function estatico(req, res){
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if(rel === '/' || rel === '') rel = '/index.html';
  const archivo = path.join(RAIZ, path.normalize(rel).replace(/^([/\\])+/, ''));
  if(!archivo.startsWith(RAIZ)){ res.writeHead(403).end('no'); return; }
  fs.readFile(archivo, (err, datos) => {
    if(err){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('No existe'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    }).end(datos);
  });
}

const servidor = http.createServer((req, res) => {
  /* El CORS va SOLO en /api/. Antes salia en todas las respuestas, tambien en
     las de los archivos estaticos, y eso dejaba que cualquier pagina que el
     usuario tuviera abierta se leyera el proyecto entero desde localhost:4321
     con un fetch. Quien necesita el permiso es la extension, que corre en el
     origen del sitio ajeno y solo llama a /api/; los estaticos los pide el
     propio localhost y no lo necesitan. */
  const esApi = req.url.startsWith('/api/');
  if(esApi){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if(req.method === 'OPTIONS'){ res.writeHead(204).end(); return; }

  if(req.url.startsWith('/api/estado')){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ claude: !!CLAUDE, ruta: CLAUDE || null }));
    return;
  }

  if(req.method === 'POST' && req.url.startsWith('/api/rearmar')){
    let cuerpo = '';
    req.on('data', d => { cuerpo += d; if(cuerpo.length > 400000) req.destroy(); });
    req.on('end', async () => {
      let r; try { r = JSON.parse(cuerpo || '{}'); } catch { r = {}; }
      const t0 = Date.now();
      const c = r.contenido || {};
      /* Sin medidor no hay con que elegir, asi que se pide uno solo y todo
         este camino se comporta como antes de que existieran los candidatos. */
      const cuantos = MEDIDOR ? CANDIDATOS : 1;
      console.log(`[rearmar] ${c.sitio || '?'} — "${String(c.titulo||'').slice(0,50)}" ` +
                  `(${(c.titulos||[]).length} secciones, ${(c.tarjetas||[]).length} tarjetas), ` +
                  `${cuantos} candidato(s) en paralelo ...`);

      /* El prompt no tiene azar: se arma UNA vez y los N piden exactamente lo
         mismo. Lo que los hace distintos es el muestreo del modelo, que es el
         mismo azar que dio el diseno joya y el tibio con el mismo pedido. */
      const pedido = promptRearmar(r);

      /* allSettled y no all: que un candidato se caiga NO puede tumbar al
         otro. Alcanza con que vuelva uno. */
      const idas = await Promise.allSettled(Array.from({ length: cuantos }, () => {
        const ti = Date.now();
        return pedirAClaude(pedido)
          .then(d => ({ d, seg: ((Date.now() - ti) / 1000).toFixed(1) }));
      }));

      const vivos = [];
      idas.forEach((x, i) => {
        if(x.status === 'fulfilled') vivos.push(Object.assign({ n: i + 1 }, x.value));
        else console.log(`[rearmar] #${i+1} falló: ${String(x.reason && x.reason.message || x.reason).slice(0,180)}`);
      });

      /* Solo si se caen TODOS se responde 503. Ese camino ya existia y la
         extension depende de el: es el que la hace caer a su tema local. */
      if(!vivos.length){
        const primero = idas[0] && idas[0].reason;
        const motivo = String(primero && primero.message || primero || 'sin respuesta').slice(0,180);
        console.log(`[rearmar] falló: ${motivo}. La extensión usará su tema local.`);
        res.writeHead(503, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ error: motivo }));
        return;
      }

      for(const v of vivos){
        v.m = medirSeguro(v.d && v.d.css);
        console.log(lineaCandidato(v));
      }

      let ganador = vivos[0];
      for(const v of vivos.slice(1)) if(esMejor(v, ganador)) ganador = v;
      const d = ganador.d;

      /* La reparacion es correccion mecanica, no diseno: pasa los rem a px
         (dentro del shadow el rem se mide contra el <html> del sitio ajeno, y
         medido en vivo el mismo CSS se veia 40px/11px en un sitio y 25px/7px
         en uno con html{font-size:62.5%}) y levanta el titulo o el piso si
         quedaron por debajo del minimo legible. */
      if(ganador.m){
        try {
          const rep = MEDIDOR.repararCss(String(d.css == null ? '' : d.css), ganador.m);
          if(rep && typeof rep.css === 'string') d.css = rep.css;
          const arreglos = (rep && rep.arreglos) || [];
          if(arreglos.length) console.log(`[rearmar] reparado: ${arreglos.join('; ')}`);
        } catch(e){
          console.log(`[rearmar] la reparación lanzó (${e.message}); va el CSS tal cual vino.`);
        }
      }

      /* Un diseno tibio se devuelve igual: lo unico que hay debajo es el
         generador local de la extension, que es todavia mas pobre. Pero queda
         escrito que salio tibio y en QUE, para no descubrirlo en pantalla. */
      if(ganador.m && !ganador.m.pasa){
        let falto = '';
        try { falto = String(MEDIDOR.queFalto(ganador.m) || ''); } catch(e){ falto = ''; }
        console.log('[rearmar] el ganador NO pasa las puertas duras, va igual. Le faltó:');
        for(const l of falto.split('\n')) if(l.trim()) console.log('          ' + l.trim());
      }

      const nota = ganador.m
        ? `${puntosDe(ganador.m)} pts, ${piezasVestidas(ganador.m)}/${Number(ganador.m.piezas && ganador.m.piezas.total) || 0} piezas`
        : 'sin medir';
      console.log(`[rearmar] gana #${ganador.n} (${nota}); listo en ` +
                  `${((Date.now()-t0)/1000).toFixed(1)}s -> ${d.titulo}`);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify({ diseno:d }));
    });
    return;
  }

  if(req.method === 'POST' && req.url.startsWith('/api/vestir')){
    let cuerpo = '';
    req.on('data', d => { cuerpo += d; if(cuerpo.length > 200000) req.destroy(); });
    req.on('end', async () => {
      let r; try { r = JSON.parse(cuerpo || '{}'); } catch { r = {}; }
      const t0 = Date.now();
      console.log(`[vestir] "${(r.tema||'').slice(0,40)}" sobre ${r.estructura?.sitio || '?'} ...`);
      try {
        const d = await pedirAClaude(promptVestir(r));
        const sel = d.selectores || {};
        delete d.selectores;
        console.log(`[vestir] listo en ${((Date.now()-t0)/1000).toFixed(1)}s -> ${d.titulo}`);
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({ diseno:d, selectores:sel }));
      } catch(e){
        console.log(`[vestir] falló: ${e.message}`);
        res.writeHead(503, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ error:e.message }));
      }
    });
    return;
  }

  if(req.method === 'POST' && req.url.startsWith('/api/disenar')){
    let cuerpo = '';
    req.on('data', d => { cuerpo += d; if(cuerpo.length > 20000) req.destroy(); });
    req.on('end', async () => {
      let r;
      try { r = JSON.parse(cuerpo || '{}'); } catch { r = {}; }
      const t0 = Date.now();
      console.log(`[disenar] "${(r.gustos||'').slice(0,60)}" ...`);
      try {
        const d = await disenar(r);
        console.log(`[disenar] listo en ${((Date.now()-t0)/1000).toFixed(1)}s -> ${(d.intereses||[]).join(', ')}`);
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify(d));
      } catch(e){
        console.log(`[disenar] falló (${e.message}). La página usará el generador local.`);
        res.writeHead(503, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  estatico(req, res);
});

servidor.listen(PUERTO, () => {
  console.log('');
  console.log('  API UNIVERSAL');
  console.log('  ------------------------------------------');
  console.log('  Abrí:   http://localhost:' + PUERTO);
  console.log('  Claude: ' + (CLAUDE ? CLAUDE : 'NO encontrado (se usa el generador local)'));
  /* Que se vea al arrancar si hay medidor: sin el, /api/rearmar devuelve lo
     primero que conteste el modelo, que es de donde salio el diseno tibio. */
  console.log('  Medidor: ' + (MEDIDOR
    ? 'si — ' + CANDIDATOS + ' candidato(s) en paralelo, gana el de mas puntos'
    : 'NO (' + (motivoSinMedidor || 'no esta') + ') — 1 candidato, sin medir ni reparar'));
  console.log('  ------------------------------------------');
  console.log('  Ctrl+C para detener.');
  console.log('');
});
