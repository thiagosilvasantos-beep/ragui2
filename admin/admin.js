/* ============================================================
   RAGUI Admin — Lógica v2
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'ragui_filmes';

  // ─── Utils ─────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function carregarFilmes() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; } }
  function salvarFilmes(f) { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  var GENEROS = {
    acao: { emoji: '🔥', label: 'Ação' },
    terror: { emoji: '🔪', label: 'Terror' },
    suspense: { emoji: '🕵️', label: 'Suspense' },
    drama: { emoji: '🎭', label: 'Drama' },
    scifi: { emoji: '🚀', label: 'Sci-Fi' }
  };

  var GRADS = [
    ['#1a1a2e','#16213e','#e63946'], ['#0f0c29','#302b63','#24243e'],
    ['#200122','#6f0000','#c9932a'], ['#0a0a0f','#1a1a2e','#F5B95A'],
    ['#141e30','#243b55','#00b4b4'], ['#1d1d1d','#533483','#e63946'],
    ['#0c0c16','#6a0572','#F5B95A'], ['#16213e','#1a1a2e','#4caf50']
  ];

  // ─── DOM ───────────────────────────────────────
  var paginaFilmes = document.getElementById('pagina-filmes');
  var paginaForm   = document.getElementById('pagina-form');
  var vazio        = document.getElementById('vazio');
  var tabelaWrap   = document.getElementById('tabela-wrap');
  var tabelaBody   = document.getElementById('tabela-body');
  var formFilme    = document.getElementById('form-filme');
  var formTitulo   = document.getElementById('form-titulo');
  var capsLista    = document.getElementById('caps-lista');
  var capsVazio    = document.getElementById('caps-vazio');
  var capaBox      = document.getElementById('capa-box');
  var capaImg      = document.getElementById('capa-img');
  var capaPlaceholder = document.getElementById('capa-placeholder');
  var capaUpload   = document.getElementById('capa-upload');
  var capaData     = document.getElementById('filme-capa-data');
  var btnRmCapa    = document.getElementById('btn-rm-capa');
  var descCurtaCount = document.getElementById('desc-curta-count');

  var modalDetalhes = document.getElementById('modal-detalhes');
  var filmeAtualId  = null;

  // ─── Navegação ─────────────────────────────────
  function mostrarLista() {
    paginaFilmes.hidden = false;
    paginaForm.hidden = true;
    renderizar();
    window.scrollTo(0, 0);
  }

  function mostrarForm(filme) {
    paginaFilmes.hidden = true;
    paginaForm.hidden = false;
    formTitulo.textContent = filme ? 'Editar Filme' : 'Novo Filme';

    document.getElementById('filme-id').value = filme ? filme.id : '';
    document.getElementById('filme-nome').value = filme ? filme.nome : '';
    document.getElementById('filme-genero').value = filme ? filme.genero : 'acao';
    document.getElementById('filme-duracao').value = filme ? (filme.duracao || '') : '';
    document.getElementById('filme-desc-curta').value = filme ? (filme.descCurta || '') : '';
    document.getElementById('filme-desc').value = filme ? (filme.desc || '') : '';
    capaData.value = filme ? (filme.capa || '') : '';

    atualizarDescCount(filme ? (filme.descCurta || '').length : 0);
    atualizarCapaPreview(filme ? filme.capa : null);

    capsLista.innerHTML = '';
    if (filme && filme.capitulos && filme.capitulos.length) {
      capsVazio.hidden = true;
      capsLista.appendChild(capsVazio);
      filme.capitulos.forEach(function (c, i) { addCapItem(i + 1, c); });
    } else {
      capsVazio.hidden = false;
      capsLista.appendChild(capsVazio);
    }

    window.scrollTo(0, 0);
    document.getElementById('filme-nome').focus();
  }

  // ─── Renderizar Lista ──────────────────────────
  function renderizar() {
    var filmes = carregarFilmes();

    if (!filmes.length) {
      vazio.hidden = false;
      tabelaWrap.hidden = true;
      return;
    }

    vazio.hidden = true;
    tabelaWrap.hidden = false;

    tabelaBody.innerHTML = filmes.map(function (f) {
      var g = GENEROS[f.genero] || GENEROS.acao;
      var capaCell = f.capa
        ? '<img class="tabela__capa" src="' + f.capa + '">'
        : '<div class="tabela__capa-vazio">🎬</div>';
      var nCaps = (f.capitulos && f.capitulos.length) || 0;

      return '<tr data-id="' + f.id + '">'
        + '<td>' + capaCell + '</td>'
        + '<td class="tabela__nome">' + esc(f.nome) + '</td>'
        + '<td><span class="tabela__genero">' + g.emoji + ' ' + g.label + '</span></td>'
        + '<td>' + nCaps + '</td>'
        + '<td><div class="tabela__acoes">'
        + '<button title="Detalhes" data-act="ver" data-id="' + f.id + '">🔍</button>'
        + '<button title="Editar" data-act="editar" data-id="' + f.id + '">✏️</button>'
        + '<button title="Excluir" data-act="excluir" data-id="' + f.id + '" class="act-danger">🗑️</button>'
        + '</div></td>'
        + '</tr>';
    }).join('');

    // Eventos
    tabelaBody.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var act = btn.getAttribute('data-act');
        if (act === 'ver') abrirDetalhes(id);
        else if (act === 'editar') editarFilme(id);
        else if (act === 'excluir') excluirFilme(id);
      });
    });

    tabelaBody.querySelectorAll('tr').forEach(function (tr) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', function () {
        abrirDetalhes(tr.getAttribute('data-id'));
      });
    });
  }

  // ─── Capítulos ─────────────────────────────────
  function addCapItem(num, titulo) {
    capsVazio.hidden = true;
    var div = document.createElement('div');
    div.className = 'cap-item';
    div.innerHTML = '<span class="cap-num">' + num + '</span>'
      + '<input type="text" placeholder="Título do capítulo ' + num + '" value="' + esc(titulo || '') + '">'
      + '<button type="button" class="cap-rm" title="Remover">&times;</button>';
    div.querySelector('.cap-rm').addEventListener('click', function () {
      div.remove();
      renumerar();
      if (!capsLista.querySelectorAll('.cap-item').length) capsVazio.hidden = false;
    });
    capsLista.appendChild(div);
  }

  function renumerar() {
    capsLista.querySelectorAll('.cap-item').forEach(function (el, i) {
      el.querySelector('.cap-num').textContent = i + 1;
    });
  }

  function getCapitulos() {
    var caps = [];
    capsLista.querySelectorAll('.cap-item input').forEach(function (inp) {
      if (inp.value.trim()) caps.push(inp.value.trim());
    });
    return caps;
  }

  // ─── Capa ──────────────────────────────────────
  function atualizarCapaPreview(src) {
    if (src) {
      capaImg.src = src; capaImg.hidden = false;
      capaPlaceholder.hidden = true; btnRmCapa.hidden = false;
    } else {
      capaImg.hidden = true; capaImg.src = '';
      capaPlaceholder.hidden = false; btnRmCapa.hidden = true;
    }
  }

  function atualizarDescCount(n) {
    descCurtaCount.textContent = n + '/120';
  }

  capaBox.addEventListener('click', function () { capaUpload.click(); });

  capaUpload.addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        var s = Math.min(1, 600 / img.width);
        c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var url = c.toDataURL('image/jpeg', 0.8);
        capaData.value = url;
        atualizarCapaPreview(url);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-upload').addEventListener('click', function (e) {
    e.preventDefault(); capaUpload.click();
  });

  document.getElementById('btn-gradiente').addEventListener('click', function () {
    var cores = GRADS[Math.floor(Math.random() * GRADS.length)];
    var c = document.createElement('canvas'); c.width = 600; c.height = 340;
    var ctx = c.getContext('2d');
    var grd = ctx.createLinearGradient(0, 0, c.width, c.height);
    cores.forEach(function (cor, i) { grd.addColorStop(i / (cores.length - 1), cor); });
    ctx.fillStyle = grd; ctx.fillRect(0, 0, c.width, c.height);
    for (var i = 0; i < 150; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.04) + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * c.width, Math.random() * c.height, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    var url = c.toDataURL('image/jpeg', 0.85);
    capaData.value = url;
    atualizarCapaPreview(url);
  });

  btnRmCapa.addEventListener('click', function () {
    capaData.value = ''; capaUpload.value = '';
    atualizarCapaPreview(null);
  });

  document.getElementById('filme-desc-curta').addEventListener('input', function () {
    atualizarDescCount(this.value.length);
  });

  document.getElementById('btn-add-cap').addEventListener('click', function () {
    var n = capsLista.querySelectorAll('.cap-item').length + 1;
    addCapItem(n, '');
    var inputs = capsLista.querySelectorAll('.cap-item input');
    inputs[inputs.length - 1].focus();
  });

  // ─── Salvar ────────────────────────────────────
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
      capa: capaData.value || '',
      capitulos: getCapitulos(),
      atualizado: new Date().toISOString()
    };

    if (id) {
      filmes = filmes.map(function (f) { return f.id === id ? dados : f; });
    } else {
      dados.criado = new Date().toISOString();
      filmes.unshift(dados);
    }

    salvarFilmes(filmes);
    mostrarLista();
  });

  // ─── Editar / Excluir ──────────────────────────
  function editarFilme(id) {
    var f = carregarFilmes().find(function (x) { return x.id === id; });
    if (f) { fecharDetalhes(); mostrarForm(f); }
  }

  function excluirFilme(id) {
    if (!confirm('Excluir este filme?')) return;
    salvarFilmes(carregarFilmes().filter(function (f) { return f.id !== id; }));
    fecharDetalhes();
    renderizar();
  }

  // ─── Modal Detalhes ────────────────────────────
  function abrirDetalhes(id) {
    var f = carregarFilmes().find(function (x) { return x.id === id; });
    if (!f) return;
    filmeAtualId = id;
    var g = GENEROS[f.genero] || GENEROS.acao;

    document.getElementById('det-titulo').textContent = f.nome;

    var capaDiv = document.getElementById('det-capa');
    capaDiv.innerHTML = f.capa
      ? '<img src="' + f.capa + '">'
      : '<span style="font-size:3rem;opacity:0.3">🎬</span>';

    document.getElementById('det-tags').innerHTML =
      '<span>' + g.emoji + ' ' + g.label + '</span>'
      + (f.duracao ? '<span>⏱ ' + esc(f.duracao) + '</span>' : '')
      + '<span>📑 ' + ((f.capitulos && f.capitulos.length) || 0) + ' cap.</span>';

    document.getElementById('det-curta').textContent = f.descCurta || '';
    document.getElementById('det-desc').textContent = f.desc || 'Sem descrição detalhada.';

    var capsDiv = document.getElementById('det-caps');
    if (f.capitulos && f.capitulos.length) {
      capsDiv.innerHTML = '<h4 class="det-cap-titulo">CAPÍTULOS</h4>'
        + f.capitulos.map(function (c, i) {
          return '<div class="det-cap-item"><span class="cap-num">' + (i + 1) + '</span><span>' + esc(c) + '</span></div>';
        }).join('');
    } else {
      capsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;font-style:italic">Nenhum capítulo.</p>';
    }

    modalDetalhes.hidden = false;
  }

  function fecharDetalhes() { modalDetalhes.hidden = true; filmeAtualId = null; }

  // ─── Event Listeners ──────────────────────────
  document.getElementById('btn-novo').addEventListener('click', function () { mostrarForm(null); });
  document.getElementById('btn-voltar-lista').addEventListener('click', mostrarLista);
  document.getElementById('btn-cancelar').addEventListener('click', mostrarLista);

  document.getElementById('det-fechar').addEventListener('click', fecharDetalhes);
  document.getElementById('det-fechar-btn').addEventListener('click', fecharDetalhes);
  document.getElementById('det-editar').addEventListener('click', function () { if (filmeAtualId) editarFilme(filmeAtualId); });
  document.getElementById('det-excluir').addEventListener('click', function () { if (filmeAtualId) excluirFilme(filmeAtualId); });
  modalDetalhes.addEventListener('click', function (e) { if (e.target === modalDetalhes) fecharDetalhes(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modalDetalhes.hidden) fecharDetalhes();
  });

  // ─── Init ──────────────────────────────────────
  renderizar();

})();
