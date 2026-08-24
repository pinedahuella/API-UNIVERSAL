/* EL MEDIDOR DEL DISEÑO. Convierte "este diseño esta bueno" en un numero.

   Correlo asi, desde la raiz del proyecto:
       node servidor/medir_diseno.js servidor/fixtures/css_joya.css

   POR QUE EXISTE. El mismo prompt, el mismo modelo y el mismo sitio dieron
   dos resultados opuestos. Uno quedo espectacular; el otro quedo tibio, y
   "tibio" no es una opinion, se mide:

     - .hero h1 en 16px, MAS CHICO que su propio .seccion, que medía 27px
     - .hero-img (la foto de portada, media pantalla) sin UNA SOLA regla
     - lema, menu, cuerpo y botones todos en el mismo 11px
     - 20 reglas, 0 :hover, 0 ::before/::after
     - 15 de 34 piezas sin vestir
     - todos los tamaños en rem. Adentro de un shadow root el rem NO se mide
       contra lo nuestro: se mide contra el <html> DEL SITIO AJENO. Medido en
       vivo: el mismo CSS se ve a 40px/11px en un sitio normal y a 25px/7px
       en uno que usa html{font-size:62.5%}. Ilegible, y sin forma de
       enterarse desde aca.

   El prompt ya se mejoro y la respuesta siguiente subio a 40 reglas, 5
   hover, 1 ::after, 0 rem y las 9 piezas obligatorias vestidas. Pero un
   prompt es un AVISO, y un aviso no es un mecanismo: caduca igual que el
   codigo y nadie se entera. Esto si, porque falla y porque imprime el
   numero del que se queja.

   LO QUE ESTE ARCHIVO NO HACE: no decide si un diseño es lindo. Mide nueve
   cosas que en el tibio estaban rotas y en la joya no. Un diseño feo puede
   pasar las nueve puertas; lo que no puede es pasar siendo ilegible. */

'use strict';

/* ---------------------------------------------------------------------------
   LAS PIEZAS. Es la MISMA lista que prompt_rearmar.js le ofrece al modelo.
   Si aca falta una, el medidor deja de ver un pedazo de la pagina y la medida
   miente hacia arriba. Si sobra una que el armador no crea nunca, el medidor
   pide vestir el vacio y la medida miente hacia abajo.
   --------------------------------------------------------------------------- */
const PIEZAS = [
  '.marco', '.cab', '.marca-txt', '.marca-ico', '.menu a', '.volver',
  '.hero', '.hero h1', '.ojo', '.lema', '.hero-img',
  '.medio', '.video', '.miniatura', '.play', '.play-txt', '.medio-enlace',
  '.seccion', '.tarjetas', '.tarjeta', '.tarjeta-img', '.tarjeta-txt h3',
  '.tarjeta-play', '.mas', '.vacio',
  '.cuerpo p', '.cuerpo li', '.cuerpo blockquote', '.foto',
  '.escrito', '.sello', '.nota', '.pie', '.motas i'
];

/* Las nueve que no pueden quedar sin vestir. Son las que se llevan la
   pantalla: sin ellas la pagina se ve a medio armar aunque el resto este
   perfecto. El prompt las nombra con estas mismas palabras. */
const OBLIGATORIAS = [
  '.cab', '.hero h1', '.hero-img', '.seccion', '.tarjeta',
  '.cuerpo p', '.mas', '.pie', '.volver'
];

/* ---------------------------------------------------------------------------
   LAS PUERTAS DURAS. Cada numero sale de la comparacion medida entre el
   diseño joya y el tibio, no de un gusto:
     30 reglas   -> el tibio traia 20 y la joya 40. El corte va en el medio.
     32px de h1  -> el tibio lo dejo en 16px, mas chico que su propio .seccion.
     2.5 veces   -> con menos que eso el titulo no manda sobre el cuerpo.
     12px de piso-> el tibio dejo lema, menu, cuerpo y botones en 11px.
   --------------------------------------------------------------------------- */
const MIN_REGLAS = 30;
const MIN_H1_PX = 32;
const H1_VECES_CUERPO = 2.5;
const MIN_HOVER = 1;
const MIN_PSEUDO = 1;
const MIN_TAMANOS = 3;
/* EL PISO NO APLICA A TODO EL TEXTO, Y ESTA DISTINCION SE PAGO CARA.
   La puerta miraba el font-size mas chico de TODA la hoja, y con eso
   reprobaba a los mejores disenos que se midieron: el de 98 puntos caia
   por .ojo en 11px, y otro por .volver en 11px. Pero .ojo es el renglon
   chiquito de ARRIBA del titulo y pagina.css ya lo trae en 11px a
   proposito; .sello va en 12px y .pie en 12.5px, tambien de fabrica. Una
   etiqueta chica es una decision de diseno, no un defecto.
   Lo que NO puede achicarse es el texto que se LEE de corrido, que es
   justo lo que el diseno tibio arruino: dejo .lema y .cuerpo p en 11px.
   Asi que el piso se le aplica a estas cuatro piezas y a nadie mas, y la
   puerta sigue cazando el caso que la hizo nacer. */
const LECTURA = ['.cuerpo p', '.cuerpo li', '.cuerpo blockquote', '.lema'];
const PISO_PX = 13;

/* El viewport de referencia para resolver clamp()/vw/vh sin navegador. 1200px
   es la decision que pide la tarea; el alto lo pongo yo en 800 porque un
   clamp con vh adentro no se puede resolver sin uno y dejarlo sin resolver
   seria un tamaño invisible para el medidor. */
const ANCHO_REF = 1200;
const ALTO_REF = 800;
const RAIZ_PX = 16;

/* El piso que pide el prompt (13px) es mas alto que la puerta dura (12px).
   Las correcciones automaticas escriben 13: arreglan de una vez y no dejan
   el resultado pegado al borde de la puerta. */
const PISO_QUE_ESCRIBE_LA_REPARACION = 13;

/* Reparar el titulo se dispara ANTES que la puerta dura (28px y 2 veces el
   cuerpo, contra 32px y 2.5 veces). Es a proposito: la reparacion es un piso
   mecanico para lo ilegible, no una forma de aprobar el examen. Un titulo de
   30px no se toca y no pasa: eso lo resuelve otro candidato o el reintento. */
const REPARA_H1_DEBAJO_DE = 28;
const REPARA_H1_VECES_CUERPO = 2;

/* ===========================================================================
   1. LEER EL CSS A MANO
   ===========================================================================
   Sin libreria y sin parser completo: se recorre el texto separando bloques
   `preludio { cuerpo }` con una pila, que es lo unico que cuenta bien las
   llaves anidadas de @media y @keyframes.

   Un @media mal contado descuadra TODA la medida (sus reglas se pierden o se
   duplican) y una medida que miente es peor que no medir. Por eso el
   recorrido trata aparte las cuatro cosas que llevan llaves adentro sin ser
   bloques: comentarios, cadenas con comilla simple, cadenas con comilla
   doble y url() sin comillas. Un `content:"}"` sin ese cuidado cierra un
   bloque que nadie abrio y a partir de ahi todo el archivo se lee corrido. */

function finDeCadena(css, i) {
  const comilla = css[i];
  let j = i + 1;
  while (j < css.length) {
    if (css[j] === '\\') { j += 2; continue; }   /* \" no cierra la cadena */
    if (css[j] === comilla) return j + 1;
    j++;
  }
  return css.length;                              /* cadena sin cerrar: hasta el final */
}

function finDeUrl(css, i) {
  const cierre = css.indexOf(')', i);
  return cierre < 0 ? css.length : cierre + 1;
}

/* Arma el arbol de bloques. NUNCA lanza y nunca se queda colgado: un archivo
   cortado a la mitad (le pasa a una respuesta de modelo que se quedo sin
   tokens) deja bloques abiertos y se devuelven igual, con lo que se alcanzo
   a leer. */
function armarArbol(css) {
  const raiz = { preludio: '', decls: [], hijos: [] };
  const pila = [raiz];
  const actual = () => pila[pila.length - 1];
  let junta = '';
  let i = 0;

  while (i < css.length) {
    const c = css[i];

    if (c === '/' && css[i + 1] === '*') {
      const fin = css.indexOf('*/', i + 2);
      i = fin < 0 ? css.length : fin + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const fin = finDeCadena(css, i);
      junta += css.slice(i, fin);
      i = fin;
      continue;
    }
    /* url( sin comillas puede traer parentesis y hasta llaves. El chequeo del
       caracter de atras evita comerse un "blurl(" o un "--url(" imaginario. */
    if ((c === 'u' || c === 'U') && /^url\(/i.test(css.substr(i, 4)) && !/[\w-]/.test(css[i - 1] || '')) {
      const fin = finDeUrl(css, i);
      junta += css.slice(i, fin);
      i = fin;
      continue;
    }
    if (c === '{') {
      const nodo = { preludio: junta.trim(), decls: [], hijos: [] };
      actual().hijos.push(nodo);
      pila.push(nodo);
      junta = '';
      i++;
      continue;
    }
    if (c === '}') {
      if (junta.trim()) actual().decls.push(junta.trim());  /* la ultima declaracion suele venir sin ; */
      junta = '';
      if (pila.length > 1) pila.pop();
      i++;
      continue;
    }
    if (c === ';') {
      if (junta.trim()) actual().decls.push(junta.trim());
      junta = '';
      i++;
      continue;
    }
    junta += c;
    i++;
  }
  if (junta.trim() && pila.length > 1) actual().decls.push(junta.trim());
  return raiz;
}

/* Las at-rules que AGRUPAN reglas: adentro hay selectores de verdad y hay que
   entrar. @keyframes tambien tiene llaves adentro pero lo de adentro son
   fotogramas (0%, to), no reglas de estilo: contarlos como reglas infla la
   medida y deja pasar una hoja flaca con una animacion larga. */
const AGRUPADORAS = /^@(media|supports|layer|container|scope|document|-moz-document)\b/i;

/* Anidado moderno: `.tarjeta{ &:hover{} }`. Se resuelve pegando el selector
   del padre. No es CSS que escriba el prompt, pero si el modelo lo escribe y
   el medidor no lo entiende, esas reglas desaparecen de la cuenta. */
function unirAnidado(padre, hijo) {
  return partirComas(hijo).map(t => {
    const s = t.trim();
    return s.includes('&') ? s.replace(/&/g, padre) : (padre + ' ' + s);
  }).join(', ');
}

function declaracionesDe(lista) {
  const salida = [];
  for (const d of lista) {
    const corte = d.indexOf(':');
    if (corte < 0) continue;
    const prop = d.slice(0, corte).trim().toLowerCase();
    const valor = d.slice(corte + 1).trim();
    if (prop) salida.push({ prop, valor });
  }
  return salida;
}

/* Aplana el arbol a una lista de reglas de estilo. Cada regla se lleva la
   CADENA de condiciones (@media/@supports) que la envuelve: sin eso no se
   puede saber si un font-size de 30px es el titulo del telefono o el de la
   pantalla grande, y tampoco se puede escribir una correccion que no pise
   una regla responsive legitima. */
function aplanar(nodo, condiciones, selectorPadre, salida) {
  for (const h of nodo.hijos) {
    const p = h.preludio;

    if (p.charAt(0) === '@') {
      const nombre = (p.match(/^@-?[\w-]*?-?([\w]+)/) || ['', ''])[1].toLowerCase();
      if (nombre === 'keyframes') { salida.keyframes++; continue; }
      if (AGRUPADORAS.test(p)) { aplanar(h, condiciones.concat(p.replace(/\s+/g, ' ')), selectorPadre, salida); continue; }
      continue;   /* @font-face, @page, @property: llevan llaves y no son reglas de estilo */
    }
    if (!p) continue;

    const selector = selectorPadre ? unirAnidado(selectorPadre, p) : p.replace(/\s+/g, ' ');
    salida.reglas.push({
      selector,
      partes: partirComas(selector).map(normalizarParte).filter(Boolean),
      decls: declaracionesDe(h.decls),
      condiciones: condiciones.slice()
    });
    if (h.hijos.length) aplanar(h, condiciones, selector, salida);
  }
}

/* Parte por comas de PRIMER nivel: una coma adentro de :is(.a, .b) o de una
   cadena no separa selectores. */
function partirComas(txt) {
  const partes = [];
  let prof = 0, act = '', i = 0;
  while (i < txt.length) {
    const c = txt[i];
    if (c === '"' || c === "'") { const fin = finDeCadena(txt, i); act += txt.slice(i, fin); i = fin; continue; }
    if (c === '(') prof++;
    if (c === ')') prof--;
    if (c === ',' && prof <= 0) { partes.push(act); act = ''; i++; continue; }
    act += c;
    i++;
  }
  partes.push(act);
  return partes;
}

function normalizarParte(t) {
  return String(t).replace(/\s+/g, ' ').replace(/\s*([>+~])\s*/g, ' $1 ').trim();
}

function leerHoja(css) {
  const salida = { reglas: [], keyframes: 0 };
  aplanar(armarArbol(css), [], '', salida);
  return salida;
}

/* ===========================================================================
   2. ¿ESTA VESTIDA ESTA PIEZA?
   ===========================================================================
   Una pieza esta vestida si alguna regla la tiene de SUJETO. El sujeto es el
   ultimo compuesto del selector, y ahi esta la trampa: `.hero h1{}` NO viste
   a `.hero` (viste al titulo), y `.hero-img img{}` NO viste a `.hero-img`
   (viste a la foto, no al marco que se lleva media pantalla). Esa es
   exactamente la pieza que el diseño tibio dejo desnuda, asi que aflojar aca
   seria aprobar justo el defecto que este archivo viene a cazar.

   Un ::after SI viste: `.tarjeta::after{content:"1"}` es una decision de
   estilo sobre la tarjeta, no sobre otra cosa. */

/* Los parentesis se vacian antes de partir por espacios: :not(.a .b) trae un
   espacio adentro que no es un combinador y partiria el selector de mas. */
function compuestos(parte) {
  let s = parte;
  let antes;
  do { antes = s; s = s.replace(/\([^()]*\)/g, '()'); } while (s !== antes);
  return s.replace(/[>+~]/g, ' ').split(/\s+/).filter(Boolean);
}

function clasesDe(comp) {
  return (comp.match(/\.(-?[_a-zA-Z][\w-]*)/g) || []).map(s => s.slice(1));
}

function etiquetaDe(comp) {
  const m = comp.match(/^([a-zA-Z][\w-]*)/);
  return m ? m[1].toLowerCase() : '';
}

function tokenCalza(token, comp) {
  if (!comp) return false;
  if (token.charAt(0) === '.') return clasesDe(comp).indexOf(token.slice(1)) >= 0;
  return etiquetaDe(comp) === token;
}

function piezaEnParte(pieza, parte) {
  const tokens = pieza.split(' ');
  const comps = compuestos(parte);
  if (!comps.length) return false;
  if (!tokenCalza(tokens[tokens.length - 1], comps[comps.length - 1])) return false;
  /* los ancestros pueden estar salteados: `.marco .tarjetas .tarjeta` viste
     a `.tarjeta` igual que `.tarjeta` sola */
  let k = comps.length - 1;
  for (let x = tokens.length - 2; x >= 0; x--) {
    let hallado = false;
    k--;
    while (k >= 0) { if (tokenCalza(tokens[x], comps[k])) { hallado = true; break; } k--; }
    if (!hallado) return false;
  }
  return true;
}

const RE_PSEUDO_ELEMENTO = /::[a-z-]+|:(before|after|first-line|first-letter|marker|placeholder|selection|backdrop)\b/i;

function tienePseudoElemento(parte) {
  const comps = compuestos(parte);
  return RE_PSEUDO_ELEMENTO.test(comps[comps.length - 1] || '');
}

/* Los estados no son el tamaño de la pieza: son lo que mide MIENTRAS el mouse
   esta encima. Medido aca: `.hero h1{font-size:14px}` mas
   `.hero h1:hover{font-size:90px}` daba h1=90px y pasaba las nueve puertas
   con cero fallos, cuando el titulo que ve el que entra mide 14px -el mismo
   16px del diseño tibio-. Sin el hover, esa hoja falla por h1_chico y
   h1_vs_cuerpo, o sea que el estado era lo unico que la aprobaba.
   Se mira la parte ENTERA y no solo el sujeto: en `.hero:hover h1` el estado
   esta en el ancestro y la regla tampoco corre en reposo. */
const RE_PSEUDO_DE_ESTADO = /:(hover|active|focus|focus-visible|focus-within|target|visited)\b/i;

function tienePseudoDeEstado(parte) {
  return RE_PSEUDO_DE_ESTADO.test(parte);
}

/* ===========================================================================
   3. UN font-size A px, SIN NAVEGADOR
   ===========================================================================
   Reglas, todas deterministicas:
     '18px'   -> 18
     '1.2em'  -> 19.2. Aproximacion HONESTA y declarada: el em se mide contra
                 el tamaño del padre, que sin DOM no existe; 16 es lo unico
                 que se puede suponer sin inventar de mas.
     '2.5rem' -> 40, y ademas cuenta en remEnTamanos, porque ese 40 solo vale
                 en un sitio con la raiz en 16. En uno con 62.5% son 25px.
     'clamp(a,b,c)' -> se aplica el clamp de verdad con el viewport de
                 referencia: max(a, min(b, c)).
     'calc()', '%', 'larger', 'inherit' -> null. NO se inventa un numero:
                 un numero inventado ensucia tamanos[] y puede bajar el piso
                 medido a un valor que nadie escribio. */

function largoAPx(txt) {
  const m = /^(-?\d*\.?\d+)(px|pt|pc|in|cm|mm|q|em|rem|vw|vh|vmin|vmax)$/i.exec(String(txt).trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  switch (m[2].toLowerCase()) {
    case 'px': return n;
    case 'pt': return n * 4 / 3;
    case 'pc': return n * 16;
    case 'in': return n * 96;
    case 'cm': return n * 96 / 2.54;
    case 'mm': return n * 96 / 25.4;
    case 'q': return n * 96 / 101.6;
    case 'em': return n * RAIZ_PX;
    case 'rem': return n * RAIZ_PX;
    case 'vw': return n * ANCHO_REF / 100;
    case 'vh': return n * ALTO_REF / 100;
    case 'vmin': return n * Math.min(ANCHO_REF, ALTO_REF) / 100;
    case 'vmax': return n * Math.max(ANCHO_REF, ALTO_REF) / 100;
  }
  return null;
}

const redondear = x => Math.round(x * 100) / 100;

/* min() y max() no los pide la tarifa pero se resuelven igual que clamp() y
   son igual de deterministicos. Ignorarlos dejaria un font-size invisible
   para el medidor, que es la unica falla que no se puede permitir. */
function evaluarTamano(valor) {
  const v = String(valor).trim();
  const directo = largoAPx(v);
  if (directo !== null) return redondear(directo);

  const f = /^(clamp|min|max)\s*\(([\s\S]*)\)$/i.exec(v);
  if (f) {
    const args = partirComas(f[2]).map(a => evaluarTamano(a));
    if (!args.length || args.some(a => a === null)) return null;
    const cual = f[1].toLowerCase();
    if (cual === 'min') return redondear(Math.min.apply(null, args));
    if (cual === 'max') return redondear(Math.max.apply(null, args));
    if (args.length !== 3) return null;
    return redondear(Math.max(args[0], Math.min(args[1], args[2])));
  }
  return null;
}

function cuentaRems(valor) {
  return (String(valor).match(/(?<![\w.])-?\d*\.?\d+rem\b/g) || []).length;
}

/* `font: 700 20px/1.4 Georgia` esconde el tamaño adentro del atajo. Si no se
   mira, una hoja escrita entera con el atajo queda con tamanos[] vacio y el
   medidor aprueba una hoja que nunca miro. La familia se corta primero
   porque es lo unico del atajo que lleva comas. */
function tamanoDelAtajoFont(valor) {
  const sinFamilia = String(valor).split(',')[0];
  const m = /(^|\s)(-?\d*\.?\d+(?:px|pt|pc|in|cm|mm|q|em|rem|vw|vh|vmin|vmax|%))\s*(?:\/\s*\S+)?(?=\s|$)/i.exec(sinFamilia);
  return m ? m[2] : null;
}

function tamanoDeclarado(decl) {
  if (decl.prop === 'font-size') return decl.valor;
  if (decl.prop === 'font') return tamanoDelAtajoFont(decl.valor);
  return null;
}

/* ===========================================================================
   4. LA MEDIDA
   =========================================================================== */

/* POR QUE LOS TAMAÑOS SE AGRUPAN. Una hoja puede declarar `.lema` dos veces:
   la segunda gana y la primera no se ve nunca. Contar las dos infla
   tamanos[] y, peor, deja minimoPx clavado en un 9px que ya nadie muestra
   -asi ninguna correccion podria levantar el piso jamas-.
   La clave del grupo es la parte del selector MAS su cadena de @media: un
   `.cuerpo p` de adentro de un @media es otro contexto que el de afuera, y
   los dos se ven, cada uno en su ancho. Dentro del mismo contexto, gana el
   ultimo. Es la cascada, aproximada sin especificidad, y esta escrito aca
   para que se sepa que es una aproximacion. */
function tamanosEfectivos(reglas) {
  const grupos = new Map();
  const orden = [];
  for (const r of reglas) {
    for (const d of r.decls) {
      const bruto = tamanoDeclarado(d);
      if (bruto === null) continue;
      const px = evaluarTamano(bruto);
      for (const parte of r.partes) {
        const clave = r.condiciones.join(' && ') + ' || ' + parte;
        if (!grupos.has(clave)) orden.push(clave);
        grupos.set(clave, { parte, condiciones: r.condiciones, declarado: bruto, px, selector: r.selector });
      }
    }
  }
  return orden.map(k => grupos.get(k));
}

/* Para el titulo y el cuerpo manda lo que esta FUERA de todo @media. Un
   diseño responsive baja el titulo a 32px en el telefono y eso es correcto;
   si el medidor se quedara con el ultimo declarado, castigaria justo al
   diseño que se tomo el trabajo de ser responsive. */
function efectivoDePieza(efectivos, pieza) {
  const calzan = efectivos.filter(e => piezaEnParte(pieza, e.parte) &&
                                       !tienePseudoElemento(e.parte) &&
                                       !tienePseudoDeEstado(e.parte));
  if (!calzan.length) return null;
  const base = calzan.filter(e => !e.condiciones.length);
  const lista = base.length ? base : calzan;
  return lista[lista.length - 1];
}

function medidaEnCero(motivo) {
  return {
    reglas: 0, hover: 0, pseudo: 0, keyframes: 0, remEnTamanos: 0,
    tamanos: [], h1: null, cuerpoPx: null, cuerpoDeclarado: null, firmaTitulo: false, minimoPx: null,
    piezas: { vestidas: 0, total: PIEZAS.length, faltan: PIEZAS.slice() },
    obligatoriasSinVestir: OBLIGATORIAS.slice(),
    puntos: 0, pasa: false,
    fallos: [{ clave: 'ilegible', texto: motivo }]
  };
}

function medirCss(css) {
  /* NUNCA lanza: este medidor lo llama el servidor en el camino de una
     respuesta del modelo, y ahi una excepcion tumba la peticion entera por
     un CSS mal cerrado. Con basura, medida en cero. */
  try {
    return medirDeVerdad(css == null ? '' : String(css));
  } catch (e) {
    return medidaEnCero('no se pudo leer el CSS (' + e.message + ')');
  }
}

function medirDeVerdad(css) {
  const hoja = leerHoja(css);
  const reglas = hoja.reglas;

  /* Una regla = un bloque `selector{...}`. Un selector con comas cuenta una
     sola vez, igual que lo cuenta el navegador en cssRules. */
  const cuantasReglas = reglas.length;

  let hover = 0, pseudo = 0, remEnTamanos = 0;
  for (const r of reglas) {
    const tieneContent = r.decls.some(d => d.prop === 'content');
    for (const parte of r.partes) {
      if (/:hover\b/i.test(parte)) hover++;
      /* un ::after SIN content no dibuja nada: contarlo seria contar una
         intencion, no un efecto */
      if (tieneContent && /::(before|after)\b|:(before|after)\b/i.test(parte)) pseudo++;
    }
    for (const d of r.decls) {
      const bruto = tamanoDeclarado(d);
      if (bruto !== null) remEnTamanos += cuentaRems(bruto);
    }
  }

  const efectivos = tamanosEfectivos(reglas);
  const conPx = efectivos.filter(e => e.px !== null);
  const tamanos = Array.from(new Set(conPx.map(e => e.px))).sort((a, b) => a - b);
  const minimoPx = conPx.length ? Math.min.apply(null, conPx.map(e => e.px)) : null;

  /* el minimo que decide la puerta: solo el texto de lectura (ver LECTURA).
     minimoPx se sigue publicando entero porque es un dato util para mirar
     una hoja, pero no reprueba a nadie por una etiqueta chica. */
  const deLectura = LECTURA
    .map(pieza => efectivoDePieza(efectivos, pieza))
    .filter(e => e && e.px !== null)
    .map(e => e.px);
  const minimoLecturaPx = deLectura.length ? Math.min.apply(null, deLectura) : null;

  /* h1 es null solo si .hero h1 no tiene NI UNA regla propia. Si tiene regla
     pero sin font-size legible, viaja {declarado:null, px:null}: es distinto
     "no lo vestiste" de "lo vestiste sin decidir su tamaño". */
  const hayReglaH1 = reglas.some(r => r.partes.some(p => piezaEnParte('.hero h1', p)));
  const efH1 = efectivoDePieza(efectivos, '.hero h1');
  const h1 = hayReglaH1 ? { declarado: efH1 ? efH1.declarado : null, px: efH1 ? efH1.px : null } : null;

  /* `cuerpoDeclarado` viaja al lado del px por el mismo motivo que en el h1, y
     ademas porque el cuerpo es el DIVISOR de la puerta titulo/cuerpo: si sale
     null esa puerta no se puede calcular y se apagaba sin decir una palabra.
     Medido: a la hoja joya -que pasa las nueve- se le cambio .cuerpo p a
     `50%` (8px en pantalla, contra .marco{font-size:16px} de pagina.css) y
     seguia dando pasa=true con CERO fallos, porque el 50% no se puede leer y
     entonces no entra ni en minimoPx ni en la comparacion con el titulo. Con
     el valor a la vista se puede reprobar por lo que no se pudo medir, que es
     lo unico honesto. */
  const efCuerpo = efectivoDePieza(efectivos, '.cuerpo p');
  const cuerpoPx = efCuerpo ? efCuerpo.px : null;
  const cuerpoDeclarado = efCuerpo ? efCuerpo.declarado : null;

  const firmaTitulo = medirFirma(reglas);

  const faltan = PIEZAS.filter(p => !reglas.some(r => r.partes.some(parte => piezaEnParte(p, parte))));
  const piezas = { vestidas: PIEZAS.length - faltan.length, total: PIEZAS.length, faltan };
  const obligatoriasSinVestir = OBLIGATORIAS.filter(p => faltan.indexOf(p) >= 0);

  const medida = {
    reglas: cuantasReglas, hover, pseudo, keyframes: hoja.keyframes, remEnTamanos,
    tamanos, h1, cuerpoPx, cuerpoDeclarado, firmaTitulo, minimoPx, minimoLecturaPx,
    piezas, obligatoriasSinVestir,
    puntos: 0, pasa: false, fallos: []
  };
  medida.fallos = juntarFallos(medida);
  medida.pasa = medida.fallos.length === 0;
  medida.puntos = puntuar(medida);
  return medida;
}

/* La firma del titulo: lo que hace que el estilo se RECUERDE y no sea solo
   un color. Son las cuatro que nombra el prompt, ni una mas: text-shadow,
   -webkit-text-stroke, filter, o un ::before/::after propio con content. */
function medirFirma(reglas) {
  const PROPS = /^(text-shadow|filter|-webkit-text-stroke(-width|-color)?)$/;
  for (const r of reglas) {
    const tocaTitulo = r.partes.some(p => piezaEnParte('.hero h1', p));
    if (!tocaTitulo) continue;
    for (const d of r.decls) {
      /* `filter:none` es escribir la propiedad para APAGARLA: no es una firma */
      if (PROPS.test(d.prop) && !/^(none|unset|initial)$/i.test(d.valor)) return true;
    }
    const esPseudoDelTitulo = r.partes.some(p => piezaEnParte('.hero h1', p) && /::(before|after)\b|:(before|after)\b/i.test(p));
    if (esPseudoDelTitulo && r.decls.some(d => d.prop === 'content')) return true;
  }
  return false;
}

/* Las nueve puertas duras. El texto de cada fallo lleva EL NUMERO MEDIDO,
   porque este mismo texto es el que se le pega al prompt en un reintento:
   "escribi mas reglas" no corrige nada, "escribiste 20 y el minimo son 30"
   si. El titulo rompe tres condiciones distintas y cada una sale con su
   propia clave: si no, un reintento no sabe cual de las tres arreglar. */
function juntarFallos(m) {
  const f = [];
  const px = n => (Math.round(n * 10) / 10) + 'px';

  if (m.reglas < MIN_REGLAS) {
    f.push({ clave: 'reglas', texto: 'escribiste ' + m.reglas + ' reglas y el minimo son ' + MIN_REGLAS + ': te faltan ' + (MIN_REGLAS - m.reglas) });
  }
  if (m.obligatoriasSinVestir.length) {
    f.push({ clave: 'obligatorias', texto: 'dejaste sin una sola regla ' + m.obligatoriasSinVestir.length + ' de las 9 piezas obligatorias: ' + m.obligatoriasSinVestir.join('  ') });
  }
  if (m.h1 === null) {
    f.push({ clave: 'h1_sin_regla', texto: '.hero h1 no tiene ni una regla propia, y es el titulo grande de la portada' });
  } else if (m.h1.px === null) {
    f.push({ clave: 'h1_sin_tamano', texto: '.hero h1 tiene regla pero su font-size no se puede leer' + (m.h1.declarado ? ' ("' + m.h1.declarado + '")' : '') + ': ponelo en px o en clamp()' });
  } else {
    if (m.h1.px < MIN_H1_PX) {
      f.push({ clave: 'h1_chico', texto: '.hero h1 quedo en ' + px(m.h1.px) + ' y el minimo son ' + MIN_H1_PX + 'px' });
    }
    if (m.cuerpoPx !== null && m.h1.px < H1_VECES_CUERPO * m.cuerpoPx) {
      f.push({ clave: 'h1_vs_cuerpo', texto: '.hero h1 (' + px(m.h1.px) + ') tiene que medir por lo menos ' + H1_VECES_CUERPO + ' veces el cuerpo (.cuerpo p esta en ' + px(m.cuerpoPx) + ', o sea ' + px(H1_VECES_CUERPO * m.cuerpoPx) + ')' });
    }
  }
  /* Va afuera de la cadena del h1, no adentro: el cuerpo ilegible es un fallo
     por si mismo y el reintento tiene que verlo aunque el titulo tambien este
     mal. Un cuerpo con un tamaño que no se puede leer NO es "falta el dato":
     es la puerta titulo/cuerpo apagandose sola. Medido: a la hoja joya -que
     pasa las nueve- se le puso `.cuerpo p{font-size:50%}` (8px contra el
     .marco{font-size:16px} de pagina.css) y seguia dando pasa=true con CERO
     fallos, porque ese 50% no entra ni en minimoPx ni en la comparacion.
     Solo se reprueba si el modelo ESCRIBIO un tamaño y no se entiende: si no
     escribio ninguno manda pagina.css con sus 17px y no hay nada que
     reclamarle. */
  if (m.cuerpoPx === null && m.cuerpoDeclarado) {
    f.push({ clave: 'cuerpo_sin_tamano', texto: '.cuerpo p tiene un font-size que no se puede leer ("' + m.cuerpoDeclarado + '"): asi no hay con que comparar el titulo ni con que revisar el piso de ' + PISO_PX + 'px. Ponelo en px o en clamp()' });
  }
  if (m.remEnTamanos > 0) {
    f.push({ clave: 'rem', texto: 'usaste rem ' + m.remEnTamanos + ' ' + (m.remEnTamanos === 1 ? 'vez' : 'veces') + ' en los tamaños. Adentro del shadow el rem se mide contra el <html> del sitio ajeno: medido, el mismo CSS se ve a 40px/11px en un sitio normal y a 25px/7px en uno con html{font-size:62.5%}. Pasalos a px o a clamp()' });
  }
  if (m.hover < MIN_HOVER) {
    f.push({ clave: 'hover', texto: 'no escribiste ni un :hover: una tarjeta que no reacciona se siente muerta' });
  }
  if (m.pseudo < MIN_PSEUDO) {
    f.push({ clave: 'pseudo', texto: 'no escribiste ni un ::before/::after con content, que es lo que pone la marca del estilo donde el HTML no tiene ningun nodo' });
  }
  if (m.tamanos.length < MIN_TAMANOS) {
    f.push({ clave: 'tamanos', texto: 'usaste ' + m.tamanos.length + ' ' + (m.tamanos.length === 1 ? 'tamaño distinto' : 'tamaños distintos') + ' de letra y hacen falta ' + MIN_TAMANOS + ': ' + (m.tamanos.length ? m.tamanos.map(px).join('  ') : 'ninguno') });
  }
  /* con minimoPx en null no hay ni un tamaño legible en toda la hoja, y de eso
     ya se queja la puerta de arriba: repetirlo aca seria contar dos veces */
  if (m.minimoLecturaPx !== null && m.minimoLecturaPx < PISO_PX) {
    f.push({ clave: 'minimo', texto: 'el texto que se lee de corrido quedo en ' + px(m.minimoLecturaPx) + ' y el piso son ' + PISO_PX + 'px (el lema y el cuerpo, no las etiquetas chicas)' });
  }
  if (!m.firmaTitulo) {
    f.push({ clave: 'firma', texto: '.hero h1 no lleva efecto propio: ni text-shadow, ni -webkit-text-stroke, ni filter, ni un ::after con content. Es la firma del estilo y es lo que se recuerda de la pagina' });
  }
  return f;
}

/* Los puntos son para COMPARAR dos candidatos que los dos pasan (o que los
   dos fallan), no para aprobar: aprobar lo decide `pasa`. Los pesos siguen
   ese uso: lo que mas separo a la joya del tibio fue la cantidad de reglas y
   las piezas vestidas, y eso se lleva la mitad del puntaje. */
function puntuar(m) {
  const tope = (x, t) => Math.max(0, Math.min(1, x / t));
  let p = 0;
  p += 20 * tope(m.reglas, 40);
  p += 20 * ((OBLIGATORIAS.length - m.obligatoriasSinVestir.length) / OBLIGATORIAS.length);
  p += 10 * (m.piezas.vestidas / m.piezas.total);
  if (m.h1 && m.h1.px !== null) {
    p += 8 * tope(m.h1.px, MIN_H1_PX);
    p += 7 * (m.cuerpoPx ? tope(m.h1.px / m.cuerpoPx, H1_VECES_CUERPO) : tope(m.h1.px, MIN_H1_PX));
  }
  p += m.remEnTamanos === 0 ? 10 : 0;
  p += 5 * tope(m.hover, 3);
  p += 5 * tope(m.pseudo, 2);
  p += 5 * tope(m.tamanos.length, 4);
  p += (m.minimoLecturaPx !== null && m.minimoLecturaPx >= PISO_PX) ? 5 : 0;
  p += m.firmaTitulo ? 5 : 0;
  return Math.round(p);
}

/* ===========================================================================
   5. QUE LE FALTO, EN ESPAÑOL, PARA PEGARLE AL PROMPT
   =========================================================================== */

function queFalto(medida) {
  if (!medida || !Array.isArray(medida.fallos) || !medida.fallos.length) return '';
  const lineas = [
    '',
    'TU RESPUESTA ANTERIOR SE MIDIO Y NO PASO. Esto no es una opinion: son',
    'los numeros de tu propio CSS. Volve a escribir el CSS ENTERO -no un',
    'parche- arreglando exactamente esto:',
    ''
  ];
  for (const f of medida.fallos) lineas.push('- ' + f.texto);
  lineas.push('');
  lineas.push('Todo lo demas que ya te habias ganado, mantenelo.');
  return lineas.join('\n');
}

/* ===========================================================================
   6. LA REPARACION MECANICA
   ===========================================================================
   Aca SOLO entra lo que se puede corregir sin decidir nada de diseño. Que
   falte un :hover o que .hero-img este desnuda NO se inventa: eso es una
   decision del modelo y se resuelve con otro candidato o con un reintento.
   Inventar una regla de estilo aca seria firmar con la mano del medidor un
   diseño que el modelo no escribio. */

/* Las zonas donde un "2rem" no es una medida: adentro de un comentario o de
   una cadena (`content:"1.5rem"` es texto que se muestra). */
function zonasProtegidas(css) {
  const zonas = [];
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const fin = css.indexOf('*/', i + 2);
      const f = fin < 0 ? css.length : fin + 2;
      zonas.push([i, f]); i = f; continue;
    }
    if (c === '"' || c === "'") {
      const f = finDeCadena(css, i);
      zonas.push([i, f]); i = f; continue;
    }
    i++;
  }
  return zonas;
}

function formatearPx(n) {
  return (Math.round(n * 1000) / 1000) + 'px';
}

function pasarRemAPx(css) {
  const zonas = zonasProtegidas(css);
  const protegido = pos => zonas.some(z => pos >= z[0] && pos < z[1]);
  let cambios = 0;
  const salida = css.replace(/(?<![\w.])(-?\d*\.?\d+)rem\b/g, (todo, n, pos) => {
    if (protegido(pos)) return todo;
    cambios++;
    return formatearPx(parseFloat(n) * RAIZ_PX);
  });
  return { css: salida, cambios };
}

function envolverEnCondiciones(condiciones, linea) {
  let t = linea;
  for (let i = condiciones.length - 1; i >= 0; i--) t = condiciones[i] + '{' + t + '}';
  return t;
}

function repararCss(css, medida) {
  const arreglos = [];
  let texto = css == null ? '' : String(css);
  try {
    /* 1. rem -> px. Correccion pura, no decision: adentro del shadow el rem
       se mide contra el <html> ajeno y por eso el mismo CSS se ve a 40px o a
       25px segun el sitio. Se pasan TODOS los rem de la hoja, no solo los de
       font-size: un padding de 2rem se descuadra igual en un sitio de 62.5%. */
    const r = pasarRemAPx(texto);
    if (r.cambios) {
      texto = r.css;
      arreglos.push('pase ' + r.cambios + ' ' + (r.cambios === 1 ? 'medida' : 'medidas') + ' de rem a px (x' + RAIZ_PX + '): adentro del shadow el rem se mide contra el <html> del sitio ajeno');
    }

    /* La medida que llego por parametro es la del CSS DE ANTES de tocar los
       rem, y ahi un titulo de "2.5rem" figuraba con otro numero. Usarla para
       decidir los pasos 2 y 3 corregiria un titulo que ya quedo bien. Se
       vuelve a medir sobre el texto convertido; `medida` queda solo de
       respaldo por si la re-medicion no encuentra nada. */
    const m = medirCss(texto);
    const ref = (m && m.reglas) ? m : (medida || m);
    const hoja = leerHoja(texto);
    const efectivos = tamanosEfectivos(hoja.reglas);

    /* 3. El piso. Va ANTES que la correccion del titulo, y el motivo es el que
       esta escrito en el paso 2: el titulo se calcula contra el cuerpo y este
       paso puede subir ese cuerpo (en el tibio, de 11.2px a 13px).
       NO es que el piso pudiera pisar el clamp del titulo: dos renglones mas
       abajo el titulo queda excluido de `chicos` a proposito, asi que nunca
       sale una linea de piso para .hero h1. */
    const chicos = [];
    const vistos = new Set();
    for (const e of efectivos) {
      if (e.px === null || e.px >= PISO_PX) continue;
      if (piezaEnParte('.hero h1', e.parte)) continue;   /* del titulo se ocupa el paso 2 */
      /* y de las etiquetas chicas no se ocupa nadie: subir .ojo o .sello a 13px
         no arregla nada y le rompe la escala a un diseno que estaba bien */
      if (!LECTURA.some(pieza => piezaEnParte(pieza, e.parte))) continue;
      const clave = e.condiciones.join(' && ') + ' || ' + e.parte;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      chicos.push(e);
    }
    if (chicos.length) {
      const lineas = chicos.map(e => envolverEnCondiciones(e.condiciones, e.parte + '{font-size:' + PISO_QUE_ESCRIBE_LA_REPARACION + 'px}'));
      texto += '\n\n/* medidor: ' + chicos.length + ' ' + (chicos.length === 1 ? 'selector quedaba' : 'selectores quedaban') +
               ' por debajo de ' + PISO_PX + 'px. Van al final, que gana por orden y no hace falta !important */\n' +
               lineas.join('\n') + '\n';
      arreglos.push('levante a ' + PISO_QUE_ESCRIBE_LA_REPARACION + 'px ' + chicos.length + ' ' +
                    (chicos.length === 1 ? 'selector que quedaba' : 'selectores que quedaban') + ' por debajo del piso de ' + PISO_PX + 'px: ' +
                    chicos.map(e => e.parte + ' (' + e.px + 'px)').join('  '));
    }

    /* 2. El titulo. El disparo es mas bajo que la puerta dura a proposito
       (28px contra 32px): esto levanta lo ilegible, no aprueba el examen.

       Se vuelve a medir DESPUES del paso del piso, no antes: el titulo se
       calcula contra el cuerpo, y el paso anterior pudo haber subido ese
       cuerpo de 11.2px a 13px. Con la medida vieja el titulo saldria
       calculado contra un cuerpo que ya no existe y podria quedar corto
       justo en la proporcion que la puerta dura mide. */
    const post = chicos.length ? medirCss(texto) : ref;
    const h1 = post.h1;
    const cuerpo = post.cuerpoPx;
    /* `h1 === null` es que .hero h1 no tiene NI UNA regla: la pieza quedo
       desnuda y eso es del modelo, no del medidor. Si igual le escribieramos
       el clamp, la reparacion estaria vistiendo una de las nueve obligatorias
       con la mano del medidor: medido, un CSS sin .hero h1 volvia de reparar
       con .hero h1 puesta y `obligatoriasSinVestir` pasaba de 6 piezas a 5,
       o sea que el defecto desaparecia del tablero sin que nadie lo
       arreglara. Se toca SOLO cuando la pieza ya tiene regla propia y lo
       unico que falta es el numero -la misma diferencia que hace medirCss
       entre h1===null y h1.px===null-. */
    const sinTitulo = !!h1 && h1.px === null;
    const chico = !!h1 && h1.px !== null && h1.px < REPARA_H1_DEBAJO_DE;
    const aplastado = !!h1 && h1.px !== null && cuerpo !== null && h1.px < REPARA_H1_VECES_CUERPO * cuerpo;
    if (sinTitulo || chico || aplastado) {
      const objetivo = Math.max(34, Math.ceil((cuerpo || RAIZ_PX) * 2.6));
      const min = objetivo;
      const max = Math.round(objetivo * 1.6);
      /* el tramo del medio se calcula para que en el viewport de referencia
         (1200px) caiga en objetivo*1.2, o sea adentro del clamp y por arriba
         de la puerta de 32px */
      const medio = Math.round(objetivo * 1.2 / (ANCHO_REF / 100) * 100) / 100;
      texto += '\n\n/* medidor: el titulo quedo ' + (sinTitulo ? 'sin tamaño propio' : 'en ' + h1.px + 'px') +
               (cuerpo !== null ? ' con el cuerpo en ' + cuerpo + 'px' : '') + '. Va al final: gana por orden, sin !important */\n' +
               '.hero h1{font-size:clamp(' + min + 'px,' + medio + 'vw,' + max + 'px)}\n';
      arreglos.push('subi .hero h1 a clamp(' + min + 'px,' + medio + 'vw,' + max + 'px) porque ' +
                    (sinTitulo ? 'no tenia tamaño legible' : 'estaba en ' + h1.px + 'px') +
                    (aplastado ? ' y no llegaba al doble del cuerpo (' + cuerpo + 'px)' : ''));
    }
  } catch (e) {
    /* reparar nunca puede empeorar: si algo se rompe a mitad, vuelve el
       original entero y se dice que no se toco nada */
    return { css: css == null ? '' : String(css), arreglos: [] };
  }
  return { css: texto, arreglos };
}

/* ===========================================================================
   7. LA LINEA DE COMANDOS, PARA PODER MIRARLO
   =========================================================================== */

/* Las columnas son anchas de sobra a proposito. Recortar una celda con "..."
   pierde contenido en silencio, y lo que se pierde siempre es el numero del
   que uno se estaba quejando: un clamp() largo o la lista de piezas. Lo que
   no entra baja a su propio renglon, no se corta. */
function fila(nombre, valor, exigencia, bien) {
  const marca = bien === null ? '   ' : (bien ? ' ok' : ' NO');
  return '  ' + nombre.padEnd(25) + String(valor).padEnd(30) + (exigencia || '').padEnd(16) + marca;
}

function filaLarga(texto) {
  return '  ' + ' '.repeat(25) + texto;
}

function imprimir(ruta, m) {
  const px = n => n === null ? '-' : (Math.round(n * 10) / 10) + 'px';
  const L = [];
  L.push('');
  L.push('MEDIDA DE ' + ruta);
  L.push('  ' + 'que'.padEnd(25) + 'salio'.padEnd(30) + 'se pide'.padEnd(16));
  L.push('  ' + '-'.repeat(73));
  L.push(fila('reglas', m.reglas, '>= ' + MIN_REGLAS, m.reglas >= MIN_REGLAS));
  L.push(fila('piezas vestidas', m.piezas.vestidas + ' de ' + m.piezas.total, '', null));
  L.push(fila('obligatorias sin vestir', m.obligatoriasSinVestir.length ? m.obligatoriasSinVestir.length + ' sin regla' : 'ninguna', 'ninguna', m.obligatoriasSinVestir.length === 0));
  if (m.obligatoriasSinVestir.length) L.push(filaLarga(m.obligatoriasSinVestir.join('  ')));
  L.push(fila('.hero h1', m.h1 === null ? 'SIN REGLA' : px(m.h1.px), '>= ' + MIN_H1_PX + 'px', !!(m.h1 && m.h1.px !== null && m.h1.px >= MIN_H1_PX)));
  if (m.h1 && m.h1.declarado) L.push(filaLarga('declarado: ' + m.h1.declarado));
  L.push(fila('.cuerpo p', px(m.cuerpoPx), '', null));
  L.push(fila('titulo / cuerpo', (m.h1 && m.h1.px !== null && m.cuerpoPx) ? (Math.round(m.h1.px / m.cuerpoPx * 100) / 100) + ' veces' : '-', '>= ' + H1_VECES_CUERPO + ' veces', (m.h1 && m.h1.px !== null && m.cuerpoPx) ? m.h1.px >= H1_VECES_CUERPO * m.cuerpoPx : null));
  L.push(fila('firma del titulo', m.firmaTitulo ? 'si' : 'no', 'si', m.firmaTitulo));
  L.push(fila('rem en los tamaños', m.remEnTamanos, '0', m.remEnTamanos === 0));
  L.push(fila(':hover', m.hover, '>= ' + MIN_HOVER, m.hover >= MIN_HOVER));
  L.push(fila('::before/::after', m.pseudo, '>= ' + MIN_PSEUDO, m.pseudo >= MIN_PSEUDO));
  L.push(fila('@keyframes', m.keyframes, '', null));
  L.push(fila('tamaños distintos', m.tamanos.length, '>= ' + MIN_TAMANOS, m.tamanos.length >= MIN_TAMANOS));
  if (m.tamanos.length) L.push(filaLarga(m.tamanos.map(px).join('  ')));
  L.push(fila('el mas chico', px(m.minimoPx), '>= ' + PISO_PX + 'px', m.minimoPx === null ? null : m.minimoPx >= PISO_PX));
  L.push('');
  if (m.piezas.faltan.length) {
    L.push('  SIN VESTIR (' + m.piezas.faltan.length + '): ' + m.piezas.faltan.join('  '));
    L.push('');
  }
  if (m.fallos.length) {
    L.push('FALLA (' + m.fallos.length + ')');
    for (const f of m.fallos) L.push('  [' + f.clave + '] ' + f.texto);
  } else {
    L.push('PASA las 9 puertas duras.');
  }
  L.push('');
  L.push('PUNTOS ' + m.puntos + '/100' + (m.pasa ? '   —   PASA' : '   —   NO PASA'));
  L.push('');
  return L.join('\n');
}

function comoSeUsa() {
  return [
    '',
    'EL MEDIDOR DEL DISEÑO — pone un numero donde antes habia una opinion.',
    '',
    '  node servidor/medir_diseno.js <archivo.css>',
    '',
    'Imprime la medida, los fallos y los puntos. Sale con codigo 1 si el CSS',
    'no pasa las 9 puertas duras, asi que sirve tal cual adentro de un script.',
    '',
    'Para mirar los dos extremos que le dieron origen:',
    '  node servidor/medir_diseno.js servidor/fixtures/css_tibio.css   (tiene que FALLAR)',
    '  node servidor/medir_diseno.js servidor/fixtures/css_joya.css    (tiene que PASAR)',
    '',
    'Desde otro archivo:',
    "  const { medirCss, queFalto, repararCss } = require('./medir_diseno.js');",
    ''
  ].join('\n');
}

if (require.main === module) {
  const ruta = process.argv[2];
  if (!ruta) {
    console.log(comoSeUsa());
    process.exit(1);
  }
  const fs = require('fs');
  let css;
  try {
    css = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    console.log('\nNo pude leer "' + ruta + '": ' + e.message + '\n');
    process.exit(1);
  }
  const m = medirCss(css);
  console.log(imprimir(ruta, m));
  process.exit(m.pasa ? 0 : 1);
}

module.exports = { medirCss, queFalto, repararCss, OBLIGATORIAS, PIEZAS };
