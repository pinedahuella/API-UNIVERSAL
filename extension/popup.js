const $ = s => document.querySelector(s);

function decir(txt, malo){
  $('#msg').textContent = txt;
  $('#msg').classList.toggle('malo', !!malo);
}

async function pestana(){
  const [t] = await chrome.tabs.query({ active:true, currentWindow:true });
  return t;
}

/* El content script no esta en las paginas internas de Chrome ni en la
   tienda de extensiones, y tampoco en una pestaña que se abrio antes de
   instalar. Se avisa en vez de quedarse callado. */
function mandar(msg, luego){
  pestana().then(t => {
    if(!t || !/^https?:/.test(t.url || '')){
      decir('Esta página no deja entrar extensiones. Probá en un sitio normal.', true);
      return;
    }
    chrome.tabs.sendMessage(t.id, msg, r => {
      if(chrome.runtime.lastError){
        decir('Recargá la página (F5) y volvé a intentar.', true);
        return;
      }
      luego(r);
    });
  });
}

/* al abrir el popup: que diga de que es la pagina, ya escrito */
mandar({ tipo:'estado' }, r => {
  if(!r) return;
  if(r.tema) $('#tema').value = r.tema;
  else if(r.sugerido) $('#tema').placeholder = r.sugerido;
  if(r.puesto){
    decir(r.modo === 'rearmado' ? 'Esta página está re-armada.'
                                : 'Esta página está re-vestida.');
  }
});

function trabajar(tipo, boton){
  const tema = $('#tema').value.trim();
  [...document.querySelectorAll('button')].forEach(b => b.disabled = true);
  decir('Mirá la página: ya empezó. Podés cerrar esto.');
  mandar({ tipo, tema }, r => {
    [...document.querySelectorAll('button')].forEach(b => b.disabled = false);
    if(!r) return;
    if(!r.ok){ decir('No se pudo: ' + (r.error || ''), true); return; }
    let t = 'Listo: ' + (r.titulo || '');
    if(r.fuente === 'local') t += ' (diseño armado sin la conexión)';
    if(r.medida){
      const m = r.medida;
      t += ' — ' + m.parrafos + ' párrafos, ' + m.titulos + ' títulos, ' +
           m.imagenes + ' fotos, ' + m.tarjetas + ' tarjetas.';
      if(m.palabras < 30 && !m.tarjetas){
        t += ' Esta página casi no tiene texto para leer: acá funciona mejor "Solo cambiarle el diseño".';
      }
    }
    decir(t);
  });
}

$('#rearmar').onclick = () => trabajar('rearmar');
$('#vestir').onclick  = () => trabajar('vestir');
$('#quitar').onclick  = () => mandar({ tipo:'quitar' }, () => decir('La página quedó como estaba.'));
