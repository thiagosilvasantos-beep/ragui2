/* ============================================================
   RAGUI Admin — Lógica
   CRUD de filmes com localStorage + capítulos + capa
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'ragui_filmes';

  // ─── Helpers ───────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function carregarFilmes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) { return []; }
  }

  function salvarFilmes(filmes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filmes));
  }

  var GENEROS = {
    acao: { emoji: '🔥', label: 'Ação', cor: '#e63946' },
    terror: { emoji: '🔪', label: 'Terror', cor: '#6a0572' },
    suspense: { emoji: '🕵️', label: 'Suspense', cor: '#533483' },
    drama: { emoji: '🎭', label: 'Drama', cor: '#c9a027' },
    scifi: { emoji: '🚀', label: 'Sci-Fi', cor: '#00b4b4' }
  };

  var GRADIENTES = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e63946 100%)',
    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
    'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 40%, #F5B95A 100%)',
    'linear-gradient(135deg, #141e30 0%, #243b55 50%, #00b4b4 100%)',
    'linear-gradient(135deg, #1d1d1d 0%, #533483 50%, #e63946 100%)',
    'linear-gradient(135deg, #0c0c16 0%, #6a0572 60%, #F5B95A 100%)',
    'linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #4caf50 100%)'
  ];

  // ─── DOM ───────────────────────────────────────
  var grid = document.getElementById('filmes-grid');
  var estadoVazio = document.getElementById('estado-vazio');
  var totalSpan = document.getElementById('total-filmes');

  // Modal Filme
  var modalFilme = document.getElementById('modal-filme');
  var formFilme = document.getElementById('form-filme');
  var modalTitulo = document.getElementById('modal-titulo');
  var capitulosLista = document.getElementById('capitulos-lista');
  var capaPreview = document.getElementById('capa-preview');
  var capaUpload = document.getElementById('capa-upload');
  var capaDataInput = document.getElementById('filme-capa-data');
  var btnRemoverCapa = document.getElementById('btn-remover-capa');
  var descCurtaCount = document.getElementById('desc-curta-count');

  // Modal Detalhes
  var modalDetalhes = document.getElementById('modal-detalhes');
  var filmeAtualId = null;

  // ─── Renderizar Grid ───────────────────────────
  function renderizar() {
    var filmes = carregarFilmes();
    totalSpan.textContent = filmes.length;

    if (filmes.length === 0) {
      grid.innerHTML = '';
      estadoVazio.hidden = false;
      return;
    }

    estadoVazio.hidden = true;
    grid.innerHTML = filmes.map(function (f) {
      var g = GENEROS[f.genero] || GENEROS.acao;
      var capaHtml = f.capa
        ? '<img src="' + f.capa + '" alt="' + f.nome + '">'
        : '<span class="filme-card__capa-placeholder">🎬</span>';

      return '<div class="filme-card" data-id="' + f.id + '">'
        + '<div class="filme-card__capa">'
        + capaHtml
        + '<span class="filme-card__genero">' + g.emoji + ' ' + g.label + '</span>'
        + '</div>'
        + '<div class="filme-card__body">'
        + '<h3 class="filme-card__titulo">' + esc(f.nome) + '</h3>'
        + '<p class="filme-card__desc">' + esc(f.descCurta || '') + '</p>'
        + '</div>'
        + '<div class="filme-card__footer">'
        + '<button class="btn btn--ghost btn--sm btn-detalhes" data-id="' + f.id + '">🔍 Detalhes</button>'
        + '<button class="btn btn--ghost btn--sm btn-editar" data-id="' + f.id + '">✏️ Editar</button>'
        + '</div>'
        + '</div>';
    }).join('');

    // Event listeners nos cards
    grid.querySelectorAll('.btn-detalhes').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        abrirDetalhes(btn.getAttribute('data-id'));
      });
    });
    grid.querySelectorAll('.btn-editar').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        abrirEdicao(btn.getAttribute('data-id'));
      });
    });
    grid.querySelectorAll('.filme-card').forEach(function (card) {
      card.addEventListener('click', function () {
        abrirDetalhes(card.getAttribute('data-id'));
      });
    });
  }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Modal Filme (Criar/Editar) ────────────────
  function abrirModal(filme) {
    modalTitulo.textContent = filme ? 'Editar Filme' : 'Novo Filme';
    document.getElementById('filme-id').value = filme ? filme.id : '';
    document.getElementById('filme-nome').value = filme ? filme.nome : '';
    document.getElementById('filme-genero').value = filme ? filme.genero : 'acao';
    document.getElementById('filme-duracao').value = filme ? filme.duracao || '' : '';
    document.getElementById('filme-desc-curta').value = filme ? filme.descCurta || '' : '';
    document.getElementById('filme-desc').value = filme ? filme.desc || '' : '';
    capaDataInput.value = filme ? filme.capa || '' : '';

    // Atualizar contagem
    descCurtaCount.textContent = (filme ? filme.descCurta || '' : '').length;

    // Capa preview
    atualizarCapaPreview(filme ? filme.capa : null);

    // Capítulos
    capitulosLista.innerHTML = '';
    if (filme && filme.capitulos && filme.capitulos.length > 0) {
      filme.capitulos.forEach(function (cap, i) {
        adicionarCapituloItem(i + 1, cap);
      });
    }

    modalFilme.hidden = false;
    document.getElementById('filme-nome').focus();
  }

  function fecharModal() {
    modalFilme.hidden = true;
    formFilme.reset();
    capitulosLista.innerHTML = '';
    atualizarCapaPreview(null);
  }

  function atualizarCapaPreview(src) {
    if (src) {
      capaPreview.innerHTML = '<img src="' + src + '">';
      btnRemoverCapa.hidden = false;
    } else {
      capaPreview.innerHTML = '<span class="capa-placeholder">📷 Sem capa</span>';
      btnRemoverCapa.hidden = true;
    }
  }

  // Capítulos
  function adicionarCapituloItem(num, titulo) {
    var div = document.createElement('div');
    div.className = 'capitulo-item';
    div.innerHTML = '<span class="capitulo-item__num">' + num + '</span>'
      + '<input type="text" placeholder="Título do capítulo ' + num + '" value="' + esc(titulo || '') + '">'
      + '<button type="button" class="capitulo-item__remover" title="Remover">&times;</button>';

    div.querySelector('.capitulo-item__remover').addEventListener('click', function () {
      div.remove();
      renumerarCapitulos();
    });

    capitulosLista.appendChild(div);
  }

  function renumerarCapitulos() {
    var items = capitulosLista.querySelectorAll('.capitulo-item');
    items.forEach(function (item, i) {
      item.querySelector('.capitulo-item__num').textContent = i + 1;
      item.querySelector('input').placeholder = 'Título do capítulo ' + (i + 1);
    });
  }

  function obterCapitulos() {
    var caps = [];
    capitulosLista.querySelectorAll('.capitulo-item input').forEach(function (inp) {
      var val = inp.value.trim();
      if (val) caps.push(val);
    });
    return caps;
  }

  // ─── Salvar Filme ──────────────────────────────
  formFilme.addEventListener('submit', function (e) {
    e.preventDefault();

    var id = document.getElementById('filme-id').value;
    var filmes = carregarFilmes();

    var dados = {
      id: id || uid(),
      nome: document.getElementById('filme-nome').value.trim(),
      genero: document.getElementById('filme-genero').value,
      duracao: document.getElementById('filme-duracao').value.trim(),
      descCurta: document.getElementById('filme-desc-curta').value.trim(),
      desc: document.getElementById('filme-desc').value.trim(),
      capa: capaDataInput.value || '',
      capitulos: obterCapitulos(),
      atualizado: new Date().toISOString()
    };

    if (id) {
      // Editar
      filmes = filmes.map(function (f) { return f.id === id ? dados : f; });
    } else {
      // Novo
      dados.criado = new Date().toISOString();
      filmes.unshift(dados);
    }

    salvarFilmes(filmes);
    fecharModal();
    renderizar();
  });

  // ─── Upload Capa ───────────────────────────────
  capaUpload.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      // Redimensionar para economizar localStorage
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var maxW = 600;
        var scale = maxW / img.width;
        if (scale > 1) scale = 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        capaDataInput.value = dataUrl;
        atualizarCapaPreview(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Gerar gradiente como capa
  document.getElementById('btn-gerar-capa').addEventListener('click', function () {
    var grad = GRADIENTES[Math.floor(Math.random() * GRADIENTES.length)];
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 340;
    var ctx = canvas.getContext('2d');

    // Parsear gradiente e aplicar
    var grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    // Extrair cores do gradiente string
    var cores = grad.match(/#[a-fA-F0-9]{6}/g) || ['#1a1a2e', '#e63946'];
    cores.forEach(function (cor, i) {
      grd.addColorStop(i / (cores.length - 1), cor);
    });
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Adicionar ruído sutil
    for (var i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    capaDataInput.value = dataUrl;
    atualizarCapaPreview(dataUrl);
  });

  // Remover capa
  btnRemoverCapa.addEventListener('click', function () {
    capaDataInput.value = '';
    atualizarCapaPreview(null);
    capaUpload.value = '';
  });

  // Contagem de caracteres descrição curta
  document.getElementById('filme-desc-curta').addEventListener('input', function () {
    descCurtaCount.textContent = this.value.length;
  });

  // ─── Modal Detalhes ────────────────────────────
  function abrirDetalhes(id) {
    var filmes = carregarFilmes();
    var filme = filmes.find(function (f) { return f.id === id; });
    if (!filme) return;

    filmeAtualId = id;
    var g = GENEROS[filme.genero] || GENEROS.acao;

    document.getElementById('detalhe-titulo').textContent = filme.nome;

    // Capa
    var capaDiv = document.getElementById('detalhe-capa');
    capaDiv.innerHTML = filme.capa
      ? '<img src="' + filme.capa + '" alt="' + esc(filme.nome) + '">'
      : '<span style="font-size:3rem;opacity:0.3">🎬</span>';

    // Meta
    document.getElementById('detalhe-meta').innerHTML =
      '<span>' + g.emoji + ' ' + g.label + '</span>'
      + (filme.duracao ? '<span>⏱ ' + esc(filme.duracao) + '</span>' : '')
      + (filme.capitulos ? '<span>📑 ' + filme.capitulos.length + ' capítulo(s)</span>' : '');

    // Descrição
    document.getElementById('detalhe-desc').innerHTML =
      '<p><strong>' + esc(filme.descCurta || '') + '</strong></p>'
      + '<p style="margin-top:8px">' + esc(filme.desc || 'Sem descrição detalhada.') + '</p>';

    // Capítulos
    var capsDiv = document.getElementById('detalhe-caps-lista');
    if (filme.capitulos && filme.capitulos.length > 0) {
      capsDiv.innerHTML = filme.capitulos.map(function (cap, i) {
        return '<div class="detalhe-cap">'
          + '<span class="detalhe-cap__num">' + (i + 1) + '</span>'
          + '<span>' + esc(cap) + '</span>'
          + '</div>';
      }).join('');
    } else {
      capsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Nenhum capítulo cadastrado.</p>';
    }

    modalDetalhes.hidden = false;
  }

  function fecharDetalhes() {
    modalDetalhes.hidden = true;
    filmeAtualId = null;
  }

  // ─── Editar via Detalhes ───────────────────────
  function abrirEdicao(id) {
    var filmes = carregarFilmes();
    var filme = filmes.find(function (f) { return f.id === id; });
    if (!filme) return;
    fecharDetalhes();
    abrirModal(filme);
  }

  // ─── Excluir ───────────────────────────────────
  function excluirFilme(id) {
    if (!confirm('Tem certeza que deseja excluir este filme?')) return;
    var filmes = carregarFilmes().filter(function (f) { return f.id !== id; });
    salvarFilmes(filmes);
    fecharDetalhes();
    renderizar();
  }

  // ─── Event Listeners ──────────────────────────
  document.getElementById('btn-novo-filme').addEventListener('click', function () {
    abrirModal(null);
  });

  document.getElementById('modal-fechar').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
  modalFilme.addEventListener('click', function (e) {
    if (e.target === modalFilme) fecharModal();
  });

  document.getElementById('detalhe-fechar').addEventListener('click', fecharDetalhes);
  document.getElementById('detalhe-fechar-btn').addEventListener('click', fecharDetalhes);
  modalDetalhes.addEventListener('click', function (e) {
    if (e.target === modalDetalhes) fecharDetalhes();
  });

  document.getElementById('detalhe-editar').addEventListener('click', function () {
    if (filmeAtualId) abrirEdicao(filmeAtualId);
  });

  document.getElementById('detalhe-excluir').addEventListener('click', function () {
    if (filmeAtualId) excluirFilme(filmeAtualId);
  });

  document.getElementById('btn-add-capitulo').addEventListener('click', function () {
    var num = capitulosLista.querySelectorAll('.capitulo-item').length + 1;
    adicionarCapituloItem(num, '');
    var inputs = capitulosLista.querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  });

  // ESC para fechar modais
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!modalDetalhes.hidden) fecharDetalhes();
      else if (!modalFilme.hidden) fecharModal();
    }
  });

  // ─── Init ──────────────────────────────────────
  renderizar();

})();
