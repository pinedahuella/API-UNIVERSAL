const $ = s => document.querySelector(s);

chrome.storage.local.get(['guardado'], v => {
  if(v.guardado?.tema) $('#tema').value = v.guardado.tema;
});

async function pestana(){
  const [t] = await chrome.tabs.query({ active:true, currentWindow:true });
  return t;
}

function mandar(msg, luego){
  pestana().then(t => {
    chrome.tabs.sendMessage(t.id, msg, r => {
      if(chrome.runtime.lastError){
        $('#msg').textContent = 'Recargá la página y volvé a intentar.';
        return;
      }
      luego(r);
    });
  });
}

$('#vestir').onclick = () => {
  const tema = $('#tema').value.trim();
  if(!tema){ $('#msg').textContent = 'Escribí de qué es tu página.'; return; }
  $('#msg').textContent = 'Pidiéndole el diseño a la conexión...';
  mandar({ tipo:'vestir', tema }, r => {
    $('#msg').textContent = r?.ok ? ('Listo: ' + (r.titulo || '')) : ('No se pudo: ' + (r?.error || ''));
  });
};

$('#quitar').onclick = () => {
  mandar({ tipo:'quitar' }, () => { $('#msg').textContent = 'La página quedó como estaba.'; });
};
