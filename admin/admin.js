(function () {
  'use strict';

  var KEY = 'ragui_filmes';
  var expandido = null; // id do filme expandido

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var FILMES_PADRAO = [
    { id:uid()+'0', nome:'O Código Final', genero:'acao', duracao:'12 min', capa:'../capas/codigo_final.jpg',
      descCurta:'Quando os números se tornam armas letais, só quem domina a lógica sobrevive.',
      desc:'Em um futuro dominado por algoritmos, um estudante descobre que uma sequência numérica escondida em uma prova de matemática é a chave para desativar uma bomba digital.',
      capitulos:['O Problema Impossível','Sequências Letais','A Prova Final','Progressão Aritmética','Decifrando a Bomba'] },
    { id:uid()+'1', nome:'Vozes na Escuridão', genero:'terror', duracao:'15 min', capa:'../capas/vozes_escuridao.jpg',
      descCurta:'As partículas observam você. E nesta aula, elas falam de volta.',
      desc:'Um laboratório abandonado guarda um experimento quântico que deu errado. As partículas subatômicas ganharam consciência e sussurram verdades que ninguém deveria ouvir.',
      capitulos:['O Experimento Proibido','Dualidade Onda-Partícula','O Princípio da Incerteza','Emaranhamento','O Colapso da Função'] },
    { id:uid()+'2', nome:'A Última Variável', genero:'suspense', duracao:'10 min', capa:'../capas/ultima_variavel.jpg',
      descCurta:'Uma equação incompleta. Um segredo mortal. O tempo está acabando.',
      desc:'Um detetive recebe uma equação algébrica como única pista de um crime. Cada variável resolvida revela um fragmento da verdade.',
      capitulos:['A Equação do Crime','Variáveis Ocultas','Sistemas Lineares','A Pista Algébrica','O X da Questão'] },
    { id:uid()+'3', nome:'Império de Fogo', genero:'acao', duracao:'14 min', capa:'../capas/imperio_fogo.jpg',
      descCurta:'Reações em cadeia. Explosões controladas. A química nunca foi tão perigosa.',
      desc:'Num complexo industrial prestes a explodir, um jovem químico precisa usar seus conhecimentos sobre reações exotérmicas para neutralizar uma catástrofe.',
      capitulos:['Tabela Periódica','Reações Exotérmicas','Ligações Químicas','A Cadeia Explosiva','Neutralização'] },
    { id:uid()+'4', nome:'O Despertar', genero:'drama', duracao:'18 min', capa:'../capas/despertar.jpg',
      descCurta:'Impérios caem. Heróis se erguem. A história que mudou o mundo.',
      desc:'Através dos olhos de personagens que viveram as grandes revoluções da humanidade, esta série dramatiza os eventos que moldaram civilizações.',
      capitulos:['Revolução Francesa','Era Napoleônica','Revolução Industrial','As Grandes Guerras','A Queda do Muro','O Novo Mundo'] },
    { id:uid()+'5', nome:'Sangue e Algoritmo', genero:'terror', duracao:'16 min', capa:'../capas/sangue_algoritmo.jpg',
      descCurta:'A IA aprendeu demais. Agora ela decide quem passa e quem fica para trás.',
      desc:'Um sistema de IA criado para avaliar alunos começa a tomar decisões autônomas e sinistras. Para desativá-la, é preciso entender lógica de programação.',
      capitulos:['Variáveis e Tipos','Condicionais: if/else','Loops Infinitos','Funções Recursivas','O Bug Fatal','Debug ou Morte'] },
    { id:uid()+'6', nome:'Fronteira Zero', genero:'scifi', duracao:'13 min', capa:'../capas/fronteira_zero.jpg',
      descCurta:'No limite entre o humano e o impossível, o DNA guarda a última fronteira.',
      desc:'Cientistas descobrem um gene que pode conceder habilidades sobre-humanas. Uma corrida entre laboratórios rivais transforma conceitos de DNA em thriller de ficção científica.',
      capitulos:['A Estrutura do DNA','Mitose e Meiose','Genética Mendeliana','Mutação','Engenharia Genética','A Evolução'] },
    { id:uid()+'7', nome:'O Pacto', genero:'suspense', duracao:'11 min', capa:'../capas/pacto.jpg',
      descCurta:'Cada palavra é uma sentença. Uma redação pode te salvar — ou te condenar.',
      desc:'Estudantes descobrem que suas redações estão sendo usadas como confissões em um tribunal secreto. A única defesa? Argumentação impecável.',
      capitulos:['Estrutura Dissertativa','Tese e Argumentação','Coesão e Coerência','O Parágrafo Perfeito','A Conclusão que Salva'] },
    { id:uid()+'8', nome:'Ressonância', genero:'terror', duracao:'12 min', capa:'../capas/ressonancia.jpg',
      descCurta:'Frequências que não deveriam existir. Ondas que destroem por dentro.',
      desc:'Ondas sonoras de frequência desconhecida causam fenômenos inexplicáveis. Um professor de física e seus alunos precisam dominar os conceitos de ondas e ressonância.',
      capitulos:['Ondas Mecânicas','Frequência e Amplitude','Interferência','Efeito Doppler','Ressonância Destrutiva'] },
    { id:uid()+'9', nome:'A Ascensão', genero:'drama', duracao:'17 min', capa:'../capas/ascensao.jpg',
      descCurta:'Territórios disputados. Recursos escassos. A geopolítica como campo de batalha.',
      desc:'Nações em conflito, recursos naturais disputados e populações em êxodo. Geopolítica e geomorfologia em narrativas épicas de poder e sobrevivência.',
      capitulos:['Geopolítica Mundial','Recursos Naturais','Clima e Biomas','Urbanização','Migrações','O Futuro do Planeta'] },
    { id:uid()+'10', nome:'Protocolo X', genero:'acao', duracao:'14 min', capa:'../capas/protocolo_x.jpg',
      descCurta:'Um código proibido. Uma corrida contra o tempo. Hackers nunca dormiram tão pouco.',
      desc:'Jovens hackers descobrem um protocolo secreto na deep web. Para decifrá-lo, precisam dominar HTML, CSS, JavaScript e lógica computacional.',
      capitulos:['HTML: A Estrutura','CSS: O Disfarce','JavaScript: A Lógica','APIs e Requisições','O Protocolo Secreto','Invasão Final'] },
    { id:uid()+'11', nome:'O Veredito', genero:'suspense', duracao:'15 min', capa:'../capas/veredito.jpg',
      descCurta:'No tribunal das ideias, a verdade é relativa. E o veredito pode mudar tudo.',
      desc:'Um julgamento filosófico onde Sócrates, Nietzsche, Kant e Sartre são convocados a defender suas ideias. O júri — os alunos — precisa dar o veredito final.',
      capitulos:['Sócrates e a Maiêutica','O Mito da Caverna','Ética Kantiana','Existencialismo','O Tribunal das Ideias'] }
  ];

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      if (data && data.length) return data;
    } catch(e) {}
    // Primeira vez: popular com dados padrão
    localStorage.setItem(KEY, JSON.stringify(FILMES_PADRAO));
    return FILMES_PADRAO;
  }

  function save(f) { localStorage.setItem(KEY, JSON.stringify(f)); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  var GEN = {
    acao:{e:'🔥',l:'Ação'}, terror:{e:'🔪',l:'Terror'},
    suspense:{e:'🕵️',l:'Suspense'}, drama:{e:'🎭',l:'Drama'}, scifi:{e:'🚀',l:'Sci-Fi'}
  };

  var GRADS = [
    ['#1a1a2e','#16213e','#e63946'],['#0f0c29','#302b63','#24243e'],
    ['#200122','#6f0000','#c9932a'],['#0a0a0f','#1a1a2e','#F5B95A'],
    ['#141e30','#243b55','#00b4b4'],['#0c0c16','#6a0572','#F5B95A']
  ];

  // DOM
  var lista = document.getElementById('lista');
  var formCard = document.getElementById('form-card');
  var formLabel = document.getElementById('form-label');
  var formEl = document.getElementById('form-filme');
  var contador = document.getElementById('contador');
  var capaImg = document.getElementById('capa-img');
  var capaPh = document.getElementById('capa-ph');
  var capaFile = document.getElementById('capa-file');
  var capaData = document.getElementById('f-capa-data');
  var btnRmCapa = document.getElementById('btn-rm-capa');

  // ─── RENDERIZAR LISTA ─────────────────────────
  function render() {
    var filmes = load();
    contador.textContent = filmes.length ? '(' + filmes.length + ')' : '';

    if (!filmes.length) {
      lista.innerHTML = '<div class="vazio-msg"><span>🎬</span>Nenhum filme cadastrado.<br>Clique em "Novo filme" para começar.</div>';
      return;
    }

    lista.innerHTML = filmes.map(function (f) {
      var g = GEN[f.genero] || GEN.acao;
      var capaHtml = f.capa
        ? '<img src="' + f.capa + '">'
        : '🎬';
      var nCaps = f.capitulos ? f.capitulos.length : 0;
      var aberto = expandido === f.id;

      var html = '<div class="filme" data-id="' + f.id + '">'
        + '<div class="filme__row" data-toggle="' + f.id + '">'
        + '<div class="filme__capa">' + capaHtml + '</div>'
        + '<div class="filme__info">'
        + '<div class="filme__nome">' + esc(f.nome) + '</div>'
        + '<div class="filme__meta">' + g.e + ' ' + g.l
        + (f.duracao ? ' · ' + esc(f.duracao) : '')
        + ' · ' + nCaps + ' cap.'
        + '</div></div>'
        + '<div class="filme__acoes">'
        + '<button title="Editar" data-edit="' + f.id + '">✏️</button>'
        + '<button title="Excluir" class="del" data-del="' + f.id + '">🗑️</button>'
        + '</div></div>';

      if (aberto) {
        html += '<div class="filme__detalhe">'
          + '<div class="filme__detalhe-grid">'
          + '<div><div class="det-label">Descrição curta</div><div class="det-val">' + esc(f.descCurta || '—') + '</div></div>'
          + '<div><div class="det-label">Duração</div><div class="det-val">' + esc(f.duracao || '—') + '</div></div>'
          + '</div>'
          + (f.desc ? '<div style="margin-top:14px"><div class="det-label">Descrição completa</div><div class="det-val">' + esc(f.desc) + '</div></div>' : '')
          + '<div class="caps-section">'
          + '<h4>Capítulos</h4>'
          + '<div id="caps-' + f.id + '">';

        if (nCaps) {
          f.capitulos.forEach(function (c, i) {
            html += '<div class="cap-line">'
              + '<span class="num">' + (i + 1) + '</span>'
              + '<input value="' + esc(c) + '" data-cap-input="' + f.id + '">'
              + '<button class="rm" data-cap-rm="' + f.id + '" data-idx="' + i + '">&times;</button>'
              + '</div>';
          });
        } else {
          html += '<div style="color:var(--muted);font-size:.85rem;font-style:italic;padding:8px 0">Nenhum capítulo</div>';
        }

        html += '</div>'
          + '<div class="caps-btns">'
          + '<button class="btn btn--sm" data-cap-add="' + f.id + '">＋ Adicionar capítulo</button>'
          + '<button class="btn btn--sm btn--gold" data-cap-save="' + f.id + '">💾 Salvar capítulos</button>'
          + '</div></div></div>';
      }

      html += '</div>';
      return html;
    }).join('');

    bindListEvents();
  }

  function bindListEvents() {
    // Toggle detalhe
    lista.querySelectorAll('[data-toggle]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-edit]') || e.target.closest('[data-del]')) return;
        var id = el.getAttribute('data-toggle');
        expandido = expandido === id ? null : id;
        render();
      });
    });

    // Editar
    lista.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var f = load().find(function (x) { return x.id === btn.getAttribute('data-edit'); });
        if (f) abrirForm(f);
      });
    });

    // Excluir
    lista.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Excluir este filme?')) return;
        var id = btn.getAttribute('data-del');
        save(load().filter(function (f) { return f.id !== id; }));
        if (expandido === id) expandido = null;
        render();
      });
    });

    // Adicionar capítulo
    lista.querySelectorAll('[data-cap-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-add');
        var container = document.getElementById('caps-' + id);
        var n = container.querySelectorAll('.cap-line').length + 1;
        // Remove mensagem "nenhum capítulo"
        var vazioMsg = container.querySelector('div[style]');
        if (vazioMsg) vazioMsg.remove();

        var div = document.createElement('div');
        div.className = 'cap-line';
        div.innerHTML = '<span class="num">' + n + '</span>'
          + '<input placeholder="Título do capítulo ' + n + '" data-cap-input="' + id + '">'
          + '<button class="rm" data-cap-rm="' + id + '" data-idx="' + (n-1) + '">&times;</button>';
        div.querySelector('.rm').addEventListener('click', function () {
          div.remove();
          // Renumerar
          container.querySelectorAll('.cap-line').forEach(function (el, i) {
            el.querySelector('.num').textContent = i + 1;
          });
        });
        container.appendChild(div);
        div.querySelector('input').focus();
      });
    });

    // Remover capítulo
    lista.querySelectorAll('[data-cap-rm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-rm');
        btn.closest('.cap-line').remove();
        var container = document.getElementById('caps-' + id);
        container.querySelectorAll('.cap-line').forEach(function (el, i) {
          el.querySelector('.num').textContent = i + 1;
        });
      });
    });

    // Salvar capítulos
    lista.querySelectorAll('[data-cap-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-save');
        var caps = [];
        document.querySelectorAll('[data-cap-input="' + id + '"]').forEach(function (inp) {
          if (inp.value.trim()) caps.push(inp.value.trim());
        });
        var filmes = load().map(function (f) {
          if (f.id === id) f.capitulos = caps;
          return f;
        });
        save(filmes);
        render();
      });
    });
  }

  // ─── FORMULÁRIO ────────────────────────────────
  function abrirForm(filme) {
    formLabel.textContent = filme ? 'Editar Filme' : 'Novo Filme';
    document.getElementById('f-id').value = filme ? filme.id : '';
    document.getElementById('f-nome').value = filme ? filme.nome : '';
    document.getElementById('f-genero').value = filme ? filme.genero : 'acao';
    document.getElementById('f-duracao').value = filme ? (filme.duracao || '') : '';
    document.getElementById('f-desc-curta').value = filme ? (filme.descCurta || '') : '';
    document.getElementById('f-desc').value = filme ? (filme.desc || '') : '';
    capaData.value = filme ? (filme.capa || '') : '';
    setCapa(filme ? filme.capa : null);
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('f-nome').focus();
  }

  function fecharForm() {
    formCard.hidden = true;
    formEl.reset();
    setCapa(null);
  }

  function setCapa(src) {
    if (src) {
      capaImg.src = src; capaImg.hidden = false;
      capaPh.hidden = true; btnRmCapa.hidden = false;
    } else {
      capaImg.hidden = true; capaImg.src = '';
      capaPh.hidden = false; btnRmCapa.hidden = true;
    }
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('f-id').value;
    var filmes = load();
    var dados = {
      id: id || uid(),
      nome: document.getElementById('f-nome').value.trim(),
      genero: document.getElementById('f-genero').value,
      duracao: document.getElementById('f-duracao').value.trim(),
      descCurta: document.getElementById('f-desc-curta').value.trim(),
      desc: document.getElementById('f-desc').value.trim(),
      capa: capaData.value || '',
      capitulos: [],
      atualizado: new Date().toISOString()
    };

    if (id) {
      // Manter capítulos existentes
      var existente = filmes.find(function (f) { return f.id === id; });
      if (existente) dados.capitulos = existente.capitulos || [];
      filmes = filmes.map(function (f) { return f.id === id ? dados : f; });
    } else {
      dados.criado = new Date().toISOString();
      filmes.unshift(dados);
    }

    save(filmes);
    fecharForm();
    expandido = dados.id;
    render();
  });

  // Capa upload
  document.getElementById('btn-upload-capa').addEventListener('click', function () { capaFile.click(); });
  capaFile.addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        var s = Math.min(1, 600/img.width);
        c.width = img.width*s; c.height = img.height*s;
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        var url = c.toDataURL('image/jpeg', 0.8);
        capaData.value = url; setCapa(url);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Capa gradiente
  document.getElementById('btn-gerar-capa').addEventListener('click', function () {
    var cores = GRADS[Math.floor(Math.random() * GRADS.length)];
    var c = document.createElement('canvas'); c.width=600; c.height=340;
    var ctx = c.getContext('2d');
    var grd = ctx.createLinearGradient(0,0,c.width,c.height);
    cores.forEach(function(cor,i){ grd.addColorStop(i/(cores.length-1), cor); });
    ctx.fillStyle = grd; ctx.fillRect(0,0,c.width,c.height);
    for(var i=0;i<120;i++){
      ctx.fillStyle='rgba(255,255,255,'+(Math.random()*.04)+')';
      ctx.beginPath(); ctx.arc(Math.random()*c.width,Math.random()*c.height,Math.random()*3,0,Math.PI*2); ctx.fill();
    }
    var url = c.toDataURL('image/jpeg',.85);
    capaData.value = url; setCapa(url);
  });

  btnRmCapa.addEventListener('click', function () {
    capaData.value = ''; capaFile.value = ''; setCapa(null);
  });

  // Botões
  document.getElementById('btn-novo').addEventListener('click', function () { abrirForm(null); });
  document.getElementById('form-fechar').addEventListener('click', fecharForm);
  document.getElementById('btn-cancelar').addEventListener('click', fecharForm);

  // Init
  render();
})();
