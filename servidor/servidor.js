/* Servidor local de API UNIVERSAL.
   Sirve la pagina y expone /api/disenar, que le pide a Claude CLI (Haiku)
   que diseñe la pagina segun las respuestas del test.

   Si Claude no esta o tarda demasiado, responde 503 y la pagina se arma
   con el generador local. La generacion es un extra, nunca un requisito.

   Correr:  node servidor/servidor.js     ->  http://localhost:4321 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PUERTO = Number(process.env.PUERTO || 4321);
const RAIZ = path.join(__dirname, '..');
const TIMEOUT = 150000;

const TIPOS = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon'
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
 "iconos":[3 ids de la lista de abajo, o {"id":"nombre","d":"path SVG"} si de verdad no hay ninguno que sirva],
 "selectores":{"zonas":["1-2 selectores del esqueleto"],"tarjetas":["1-2"],"titulos":["1-2"]}
}

ICONOS: son la marca visual del tema. ELEGI 3 de esta lista, por su nombre exacto:
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

function sacarJSON(txt){
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if(a < 0 || b < a) throw new Error('sin JSON en la respuesta');
  return JSON.parse(txt.slice(a, b + 1));
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS'){ res.writeHead(204).end(); return; }

  if(req.url.startsWith('/api/estado')){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ claude: !!CLAUDE, ruta: CLAUDE || null }));
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
  console.log('  ------------------------------------------');
  console.log('  Ctrl+C para detener.');
  console.log('');
});
