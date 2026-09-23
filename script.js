/* ============================================================
   RAGUI 2 — Interatividade
   - Formulário de cadastro com validação
   - Filtros de gênero
   - Scroll reveal (IntersectionObserver)
   - Máscara de telefone
   - Partículas animadas no hero
   - Tracking events
   ============================================================ */

(function () {
  'use strict';

  // ─── Click Tracking ────────────────────────────────
  function trackClick(filme, capitulo, acao) {
    try {
      if (window.RAGUI_DB) {
        window.RAGUI_DB.collection('clicks').add({
          filme: filme || '',
          capitulo: capitulo || null,
          acao: acao,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR')
        });
      }
    } catch (e) {
      // fire and forget, do not break UX
    }
  }


  // ─── Particles (Hero Background) ────────────────────
  function criarParticulas() {
    var container = document.getElementById('particles');
    if (!container) return;

    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      p.className = 'particle';

      var size = Math.random() * 3 + 1;
      var colors = [
        'rgba(245, 185, 90, 0.3)',
        'rgba(230, 57, 70, 0.2)',
        'rgba(138, 43, 226, 0.2)',
        'rgba(255, 255, 255, 0.15)'
      ];

      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (Math.random() * 15 + 10) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';

      container.appendChild(p);
    }
  }

  criarParticulas();

  // ─── Scroll Reveal (IntersectionObserver) ───────────
  function setupScrollReveal() {
    var cards = document.querySelectorAll('.card');
    if (!cards.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Stagger: delay based on index within visible batch
            var card = entry.target;
            var delay = Array.prototype.indexOf.call(cards, card) % 4 * 100;
            setTimeout(function () {
              card.classList.add('visible');
            }, delay);
            observer.unobserve(card);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      cards.forEach(function (card) {
        observer.observe(card);
      });
    } else {
      // Fallback: show all
      cards.forEach(function (card) {
        card.classList.add('visible');
      });
    }
  }

  setupScrollReveal();

  // ─── Renderizar Catálogo (dinâmico via Firestore) ───
  var GENEROS_MAP = {
    acao: { badge: 'acao', label: 'Ação' },
    terror: { badge: 'terror', label: 'Terror' },
    suspense: { badge: 'suspense', label: 'Suspense' },
    drama: { badge: 'drama', label: 'Drama' },
    scifi: { badge: 'scifi', label: 'Sci-Fi' }
  };

  // Catálogo padrão (usado quando localStorage está vazio)
  var FILMES_PADRAO = [
    { nome:'O Código Final', genero:'acao', duracao:'12 min', capa:'capas/codigo_final.jpg',
      descCurta:'Quando os números se tornam armas letais, só quem domina a lógica sobrevive.',
      capitulos:['O Problema Impossível','Sequências Letais','A Prova Final','Progressão Aritmética','Decifrando a Bomba'] },
    { nome:'Vozes na Escuridão', genero:'terror', duracao:'15 min', capa:'capas/vozes_escuridao.jpg',
      descCurta:'As partículas observam você. E nesta aula, elas falam de volta.',
      capitulos:['O Experimento Proibido','Dualidade Onda-Partícula','O Princípio da Incerteza','Emaranhamento','O Colapso da Função'] },
    { nome:'A Última Variável', genero:'suspense', duracao:'10 min', capa:'capas/ultima_variavel.jpg',
      descCurta:'Uma equação incompleta. Um segredo mortal. O tempo está acabando.',
      capitulos:['A Equação do Crime','Variáveis Ocultas','Sistemas Lineares','A Pista Algébrica','O X da Questão'] },
    { nome:'Império de Fogo', genero:'acao', duracao:'14 min', capa:'capas/imperio_fogo.jpg',
      descCurta:'Reações em cadeia. Explosões controladas. A química nunca foi tão perigosa.',
      capitulos:['Tabela Periódica','Reações Exotérmicas','Ligações Químicas','A Cadeia Explosiva','Neutralização'] },
    { nome:'O Despertar', genero:'drama', duracao:'18 min', capa:'capas/despertar.jpg',
      descCurta:'Impérios caem. Heróis se erguem. A história que mudou o mundo.',
      capitulos:['Revolução Francesa','Era Napoleônica','Revolução Industrial','As Grandes Guerras','A Queda do Muro','O Novo Mundo'] },
    { nome:'Sangue e Algoritmo', genero:'terror', duracao:'16 min', capa:'capas/sangue_algoritmo.jpg',
      descCurta:'A IA aprendeu demais. Agora ela decide quem passa e quem fica para trás.',
      capitulos:['Variáveis e Tipos','Condicionais: if/else','Loops Infinitos','Funções Recursivas','O Bug Fatal','Debug ou Morte'] },
    { nome:'Fronteira Zero', genero:'scifi', duracao:'13 min', capa:'capas/fronteira_zero.jpg',
      descCurta:'No limite entre o humano e o impossível, o DNA guarda a última fronteira.',
      capitulos:['A Estrutura do DNA','Mitose e Meiose','Genética Mendeliana','Mutação','Engenharia Genética','A Evolução'] },
    { nome:'O Pacto', genero:'suspense', duracao:'11 min', capa:'capas/pacto.jpg',
      descCurta:'Cada palavra é uma sentença. Uma redação pode te salvar — ou te condenar.',
      capitulos:['Estrutura Dissertativa','Tese e Argumentação','Coesão e Coerência','O Parágrafo Perfeito','A Conclusão que Salva'] },
    { nome:'Ressonância', genero:'terror', duracao:'12 min', capa:'capas/ressonancia.jpg',
      descCurta:'Frequências que não deveriam existir. Ondas que destroem por dentro.',
      capitulos:['Ondas Mecânicas','Frequência e Amplitude','Interferência','Efeito Doppler','Ressonância Destrutiva'] },
    { nome:'A Ascensão', genero:'drama', duracao:'17 min', capa:'capas/ascensao.jpg',
      descCurta:'Territórios disputados. Recursos escassos. A geopolítica como campo de batalha.',
      capitulos:['Geopolítica Mundial','Recursos Naturais','Clima e Biomas','Urbanização','Migrações','O Futuro do Planeta'] },
    { nome:'Protocolo X', genero:'acao', duracao:'14 min', capa:'capas/protocolo_x.jpg',
      descCurta:'Um código proibido. Uma corrida contra o tempo. Hackers nunca dormiram tão pouco.',
      capitulos:['HTML: A Estrutura','CSS: O Disfarce','JavaScript: A Lógica','APIs e Requisições','O Protocolo Secreto','Invasão Final'] },
    { nome:'O Veredito', genero:'suspense', duracao:'15 min', capa:'capas/veredito.jpg',
      descCurta:'No tribunal das ideias, a verdade é relativa. E o veredito pode mudar tudo.',
      capitulos:['Sócrates e a Maiêutica','O Mito da Caverna','Ética Kantiana','Existencialismo','O Tribunal das Ideias'] }
  ];

  // Currently active film list (starts with FILMES_PADRAO, updated by Firestore)
  var filmesAtivos = FILMES_PADRAO;

  function renderizarCatalogo(filmes) {
    var grid = document.getElementById('grid');
    if (!grid) return;

    if (filmes) filmesAtivos = filmes;

    grid.innerHTML = filmesAtivos.map(function(f) {
      var g = GENEROS_MAP[f.genero] || GENEROS_MAP.acao;
      // Suporta URLs completas (Firebase Storage) e caminhos relativos
      var capaSrc = (f.capa || '');
      if (capaSrc && capaSrc.indexOf('http') !== 0) {
        capaSrc = capaSrc.replace(/^\.\.\//, '');
      }
      var capaHtml = capaSrc
        ? '<img src="' + capaSrc + '" alt="' + f.nome.replace(/"/g,'') + '">'
        : '';
      var nCaps = (f.capitulos && f.capitulos.length) || 0;

      var hasFree = f.capitulos && f.capitulos.some(function(cap) {
        return typeof cap === 'object' && cap !== null && cap.gratis === true;
      });
      var freeBadge = hasFree ? '<span class="card__badge-free">🆓 GRÁTIS</span>' : '';

      return '<article class="card visible" data-genero="' + f.genero + '">'
        + '<div class="card__poster">'
        + '<div class="card__img">'
        + capaHtml
        + '<div class="card__img-overlay"><span class="card__play">▶</span></div>'
        + '</div>'
        + freeBadge
        + '<span class="card__badge card__badge--' + g.badge + '">' + g.label + '</span>'

        + '</div>'
        + '<div class="card__info">'
        + '<h3 class="card__title">' + f.nome + '</h3>'
        + '<p class="card__meta">' + (f.duracao || '') + ' &bull; ' + nCaps + ' cap. &bull; T1</p>'
        + '<p class="card__desc">' + (f.descCurta || '') + '</p>'
        + '</div>'
        + '</article>';
    }).join('');
  }

  renderizarCatalogo();

  // ─── Player Overlay ────────────────────────────────
  (function initPlayer() {
    var overlay      = document.getElementById('player-overlay');
    var btnClose     = document.getElementById('player-close');
    var videoEl      = document.getElementById('player-video');
    var noVideo      = document.getElementById('player-no-video');
    var titleEl      = document.getElementById('player-title');
    var descEl       = document.getElementById('player-desc');
    var chaptersEl   = document.getElementById('player-chapters');
    var drawer       = document.getElementById('player-drawer');
    var drawerToggle = document.getElementById('drawer-toggle');
    var drawerLabel  = document.getElementById('drawer-label');

    if (!overlay) return;

    // ── Drawer toggle ──
    if (drawerToggle) {
      drawerToggle.addEventListener('click', function () {
        drawer.classList.toggle('open');
      });
    }

    function normalizePath(p) {
      if (!p) return p;
      // HTTPS URLs (Firebase Storage) — use as-is
      if (p.indexOf('http') === 0) return p;
      return p.replace(/^\.\.\/capas\//, 'capas/').replace(/^\.\.\/videos\//, 'videos/');
    }

    // ── Open / Close helpers ──
    function openOverlay() {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.classList.remove('active');
      noVideo.classList.remove('hidden');
      if (drawer) drawer.classList.remove('open');
    }

    btnClose.addEventListener('click', closeOverlay);
    overlay.querySelector('.player-overlay__bg').addEventListener('click', closeOverlay);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
    });

    // ── Play a chapter ──
    function playChapter(videoSrc, chapterIndex) {
      // highlight active chapter
      var items = chaptersEl.querySelectorAll('.chapter-item');
      items.forEach(function (it) { it.classList.remove('active'); });
      if (items[chapterIndex]) items[chapterIndex].classList.add('active');

      if (!videoSrc) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
        videoEl.classList.remove('active');
        noVideo.classList.remove('hidden');
        return;
      }

      var src = normalizePath(videoSrc);
      videoEl.src = src;
      videoEl.classList.add('active');
      noVideo.classList.add('hidden');
      videoEl.play().catch(function () {});
    }

    // ── Lead Capture Logic ──
    var leadOverlay = document.getElementById('lead-overlay');
    var leadClose = document.getElementById('lead-close');
    var leadForm = document.getElementById('lead-form');
    var currentLeadVideoSrc = null;
    var currentLeadChapterIndex = null;

    function openLeadPopup(filme, capitulo, videoSrc, idx) {
      if (!leadOverlay) return;
      currentLeadVideoSrc = videoSrc;
      currentLeadChapterIndex = idx;
      leadOverlay.classList.add('open');
      if (leadForm) {
        leadForm.setAttribute('data-filme', filme || '');
        leadForm.setAttribute('data-capitulo', capitulo || '');
      }
    }

    function closeLeadPopup() {
      if (!leadOverlay) return;
      leadOverlay.classList.remove('open');
    }

    if (leadClose) leadClose.addEventListener('click', closeLeadPopup);
    if (leadOverlay) {
      var lbg = leadOverlay.querySelector('.lead-overlay__bg');
      if (lbg) lbg.addEventListener('click', closeLeadPopup);
    }

    if (leadForm) {
      leadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = document.getElementById('lead-nome').value.trim();
        var tel = document.getElementById('lead-tel').value.trim();
        var filme = this.getAttribute('data-filme');
        var capitulo = this.getAttribute('data-capitulo');

        try {
          if (window.RAGUI_DB) {
            window.RAGUI_DB.collection('leads').add({
              nome: nome,
              telefone: tel,
              filme: filme,
              capitulo: capitulo,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              data: new Date().toLocaleDateString('pt-BR'),
              hora: new Date().toLocaleTimeString('pt-BR')
            });
          }
        } catch (err) {}

        localStorage.setItem('ragui_lead_registered', 'true');
        closeLeadPopup();
        if (currentLeadVideoSrc !== null && currentLeadChapterIndex !== null) {
          playChapter(currentLeadVideoSrc, currentLeadChapterIndex);
        }
      });
    }

    // ── Build chapter list ──
    function renderChapters(capitulos) {
      if (!capitulos || !capitulos.length) {
        chaptersEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Nenhum capítulo disponível.</p>';
        return;
      }

      chaptersEl.innerHTML = capitulos.map(function (cap, i) {
        var isObj    = typeof cap === 'object' && cap !== null;
        var nome     = isObj ? (cap.nome || 'Capítulo ' + (i + 1)) : cap;
        var hasVideo = isObj && cap.video;
        var isFree   = isObj && cap.gratis === true;
        var extraCls = hasVideo ? '' : ' chapter-item--no-video';

        var icon;
        if (!hasVideo) {
          icon = '—';
        } else if (isFree) {
          icon = '🆓 GRÁTIS';
        } else {
          icon = '🔒';
        }

        return '<div class="chapter-item' + extraCls + '" data-index="' + i + '">'
          + '<span class="chapter-item__number">' + (i + 1) + '</span>'
          + '<span class="chapter-item__name">' + nome + '</span>'
          + '<span class="chapter-item__play">' + icon + '</span>'
          + '</div>';
      }).join('');

      // Click handlers
      var items = chaptersEl.querySelectorAll('.chapter-item');
      items.forEach(function (item) {
        item.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-index'), 10);
          var cap = capitulos[idx];
          var isObj = typeof cap === 'object' && cap !== null;
          var videoSrc = isObj ? (cap.video || null) : null;
          var isFree = isObj && cap.gratis === true;
          var capName = isObj ? (cap.nome || 'Capítulo ' + (idx + 1)) : cap;

          trackClick(titleEl.textContent, capName, 'play_capitulo');

          if (!isFree && localStorage.getItem('ragui_lead_registered') !== 'true') {
            openLeadPopup(titleEl.textContent, capName, videoSrc, idx);
            return;
          }

          playChapter(videoSrc, idx);
        });
      });
    }

    // ── Attach click on cards ──
    function attachCardClicks() {
      var cards = document.querySelectorAll('.catalogo__grid .card');

      cards.forEach(function (card, index) {
        card.addEventListener('click', function () {
          if (index >= filmesAtivos.length) return;
          var f = filmesAtivos[index];

          trackClick(f.nome, null, 'abrir_filme');

          // Se não tem capítulos, enviar direto para cadastro
          if (!f.capitulos || !f.capitulos.length) {
            if (localStorage.getItem('ragui_lead_registered') !== 'true') {
              openLeadPopup(f.nome, 'Acesso ao filme', null, null);
            }
            return;
          }

          titleEl.textContent = f.nome || '';
          descEl.textContent  = f.descCurta || '';

          // Reset video state
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load();
          videoEl.classList.remove('active');
          noVideo.classList.remove('hidden');

          renderChapters(f.capitulos);
          openOverlay();

          // Auto-play first chapter if it has video
          if (f.capitulos && f.capitulos.length) {
            var first = f.capitulos[0];
            var isObj = typeof first === 'object' && first !== null;
            if (isObj && first.video) {
              var isFree = first.gratis === true;
              var capName = first.nome || 'Capítulo 1';
              trackClick(f.nome, capName, 'play_capitulo');

              if (!isFree && localStorage.getItem('ragui_lead_registered') !== 'true') {
                openLeadPopup(f.nome, capName, first.video, 0);
              } else {
                playChapter(first.video, 0);
              }
            }
          }
        });
      });
    }

    attachCardClicks();

    // Expose attachCardClicks so Firestore re-render can re-bind clicks
    window._ragui_attachCardClicks = attachCardClicks;

    // Re-attach after filter clicks re-show cards (they are the same DOM nodes, but just in case)
    // We use event delegation as a safety net
    document.getElementById('grid').addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      // The direct click handler above already handles it; this is a fallback.
    });
  })();

  // ─── Filtros de Gênero ──────────────────────────────
  var filtros = document.querySelectorAll('.filtro');

  filtros.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var genero = btn.getAttribute('data-genero');

      // Atualizar botão ativo
      filtros.forEach(function (f) { f.classList.remove('filtro--ativo'); });
      btn.classList.add('filtro--ativo');

      // Filtrar cards (re-query para pegar os dinâmicos)
      var todosCards = document.querySelectorAll('.card');
      todosCards.forEach(function (card) {
        var generos = card.getAttribute('data-genero') || '';
        if (genero === 'todos' || generos.indexOf(genero) !== -1) {
          card.classList.remove('hidden-card');
          if (!card.classList.contains('visible')) {
            card.classList.add('visible');
          }
        } else {
          card.classList.add('hidden-card');
        }
      });

      // Tracking
      if (window.RAGUI_ATIVO) {
        raguiEvento('ViewContent', { content_name: 'Filtro: ' + genero });
      }
    });
  });

  // ─── Firestore: carregar filmes ─────────────────────
  (function carregarFirestore() {
    if (!window.RAGUI_DB || !window.RAGUI_COLLECTION) return;

    window.RAGUI_DB.collection(window.RAGUI_COLLECTION)
      .orderBy('ordem', 'asc')
      .get()
      .then(function (snapshot) {
        if (snapshot.empty) return; // mantém FILMES_PADRAO

        var filmes = [];
        snapshot.forEach(function (doc) {
          var d = doc.data();
          d.id = doc.id;
          filmes.push(d);
        });

        if (filmes.length) {
          renderizarCatalogo(filmes);
          setupScrollReveal();
          if (window._ragui_attachCardClicks) window._ragui_attachCardClicks();
        }
      })
      .catch(function (err) {
        if (window.console) console.warn('Firestore erro:', err && err.message);
        // mantém FILMES_PADRAO — já renderizado
      });
  })();

  // ─── Máscara de Telefone ────────────────────────────
  var campoTelefone = document.getElementById('telefone');
  if (campoTelefone) {
    campoTelefone.addEventListener('input', function () {
      var d = this.value.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) {
        this.value = d;
      } else if (d.length <= 6) {
        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      } else if (d.length <= 10) {
        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      } else {
        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      }
    });
  }

  // ─── WhatsApp Proxy (Cloudflare Worker) ──────────────
  var WHATSAPP_PROXY = 'https://ragui-whatsapp-proxy.ragui-whatsapp.workers.dev';

  // ─── Validação e Verificação WhatsApp ──────────────
  var form = document.getElementById('form-cadastro');
  var etapaDados = document.getElementById('etapa-dados');
  var etapaCodigo = document.getElementById('etapa-codigo');
  var formSucesso = document.getElementById('form-sucesso');
  var formErroEnvio = document.getElementById('form-erro-envio');
  var formErroCodigo = document.getElementById('form-erro-codigo');
  var btnEnviarCodigo = document.getElementById('btn-enviar-codigo');
  var btnValidar = document.getElementById('btn-validar');
  var btnReenviar = document.getElementById('btn-reenviar');
  var btnVoltar = document.getElementById('btn-voltar');
  var campoCodigo = document.getElementById('codigo');
  var erroCodigo = document.getElementById('erro-codigo');
  var numeroDestino = document.getElementById('numero-destino');
  var timerSpan = document.getElementById('timer-reenvio');

  var codigoGerado = '';
  var codigoExpira = 0;
  var timerInterval = null;
  var enviando = false;

  function marcar(id, ok) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('ruim', !ok);
    return ok;
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function gerarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function formatarNumeroExibicao(tel) {
    if (tel.length === 11) {
      return '(' + tel.slice(0, 2) + ') ' + tel.slice(2, 7) + '-' + tel.slice(7);
    }
    return '(' + tel.slice(0, 2) + ') ' + tel.slice(2, 6) + '-' + tel.slice(6);
  }

  // Enviar mensagem via proxy n8n → UAZAPI
  function enviarWhatsApp(numero, mensagem) {
    var numeroCompleto = '55' + numero;
    return fetch(WHATSAPP_PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: numeroCompleto,
        text: mensagem
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // Iniciar timer de reenvio
  function iniciarTimer() {
    var segundos = 60;
    btnReenviar.disabled = true;
    timerSpan.textContent = segundos;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function () {
      segundos--;
      timerSpan.textContent = segundos;
      if (segundos <= 0) {
        clearInterval(timerInterval);
        btnReenviar.disabled = false;
        btnReenviar.innerHTML = '🔄 Reenviar código';
      }
    }, 1000);
  }

  // ETAPA 1: Validar dados e enviar código
  function enviarCodigo() {
    if (enviando) return;

    var nome = document.getElementById('nome').value.trim();
    var telefone = campoTelefone.value.replace(/\D/g, '');
    var email = document.getElementById('email').value.trim();

    var v1 = marcar('f-nome', nome.length >= 2);
    var v2 = marcar('f-telefone', telefone.length === 10 || telefone.length === 11);
    var v3 = marcar('f-email', validarEmail(email));

    if (!(v1 && v2 && v3)) return;

    enviando = true;
    formErroEnvio.hidden = true;
    btnEnviarCodigo.disabled = true;
    btnEnviarCodigo.textContent = '📲 Enviando…';

    codigoGerado = gerarCodigo();
    codigoExpira = Date.now() + 5 * 60 * 1000; // 5 minutos

    var mensagem = '🎬 *RAGUI* — Código de verificação\n\n'
      + 'Seu código é: *' + codigoGerado + '*\n\n'
      + 'Válido por 5 minutos.\n'
      + 'Se você não solicitou, ignore esta mensagem.';

    enviarWhatsApp(telefone, mensagem).then(function () {
      // Sucesso — mostrar etapa 2
      etapaDados.hidden = true;
      etapaCodigo.hidden = false;
      numeroDestino.textContent = formatarNumeroExibicao(telefone);
      campoCodigo.value = '';
      campoCodigo.focus();
      iniciarTimer();

      if (window.RAGUI_ATIVO) {
        raguiEvento('Contact', { content_name: 'Código WhatsApp enviado' });
      }
    }).catch(function (err) {
      formErroEnvio.hidden = false;
      if (window.console) console.warn('Erro UAZAPI:', err && err.message);
    }).then(function () {
      enviando = false;
      btnEnviarCodigo.disabled = false;
      btnEnviarCodigo.textContent = '📲 Enviar código';
    });
  }

  // Gravar cadastro no webhook
  function gravar(dados) {
    if (!window.RAGUI_LISTA) return Promise.reject(new Error('RAGUI_LISTA vazio'));
    return fetch(window.RAGUI_LISTA, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(dados)
    }).then(function (r) { return r.text(); })
      .then(function (t) {
        t = t.trim();
        if (t.slice(0, 4) === 'http') {
          window.location.href = t;
          return new Promise(function () { });
        }
        if (t !== 'ok') throw new Error('resposta: ' + t);
      });
  }

  // Event listeners
  if (btnEnviarCodigo) {
    btnEnviarCodigo.addEventListener('click', enviarCodigo);
  }

  if (btnReenviar) {
    btnReenviar.addEventListener('click', function () {
      var telefone = campoTelefone.value.replace(/\D/g, '');
      enviando = false;
      codigoGerado = gerarCodigo();
      codigoExpira = Date.now() + 5 * 60 * 1000;

      btnReenviar.disabled = true;
      btnReenviar.innerHTML = '📲 Reenviando…';
      formErroCodigo.hidden = true;
      erroCodigo.style.display = 'none';
      campoCodigo.classList.remove('erro');

      var mensagem = '🎬 *RAGUI* — Novo código de verificação\n\n'
        + 'Seu código é: *' + codigoGerado + '*\n\n'
        + 'Válido por 5 minutos.';

      enviarWhatsApp(telefone, mensagem).then(function () {
        campoCodigo.value = '';
        campoCodigo.focus();
        iniciarTimer();
      }).catch(function (err) {
        formErroCodigo.hidden = false;
        btnReenviar.disabled = false;
        btnReenviar.innerHTML = '🔄 Reenviar código';
        if (window.console) console.warn('Erro reenvio:', err && err.message);
      });
    });
  }

  if (btnVoltar) {
    btnVoltar.addEventListener('click', function () {
      etapaCodigo.hidden = true;
      etapaDados.hidden = false;
      formErroCodigo.hidden = true;
      if (timerInterval) clearInterval(timerInterval);
    });
  }

  // Filtrar input do código (só números)
  if (campoCodigo) {
    campoCodigo.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 6);
      erroCodigo.style.display = 'none';
      this.classList.remove('erro');
    });
  }

  // ETAPA 2: Validar código e completar cadastro
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;

      var digitado = campoCodigo.value.trim();

      // Verificar expiração
      if (Date.now() > codigoExpira) {
        formErroCodigo.hidden = false;
        formErroCodigo.textContent = '⏰ Código expirado. Reenvie um novo código.';
        campoCodigo.classList.add('erro');
        return;
      }

      // Verificar código
      if (digitado !== codigoGerado) {
        erroCodigo.style.display = 'block';
        campoCodigo.classList.add('erro');
        campoCodigo.value = '';
        campoCodigo.focus();
        return;
      }

      // Código correto — gravar cadastro
      enviando = true;
      formErroCodigo.hidden = true;
      btnValidar.disabled = true;
      btnValidar.textContent = '⏳ Finalizando…';

      var dados = {
        nome: document.getElementById('nome').value.trim(),
        telefone: campoTelefone.value.replace(/\D/g, ''),
        email: document.getElementById('email').value.trim(),
        verificado: true,
        origem: location.href,
        quando: new Date().toISOString()
      };

      gravar(dados).then(function () {
        if (window.RAGUI_ATIVO) {
          raguiEvento('Lead', { content_name: 'Cadastro RAGUI verificado' });
        }
        etapaCodigo.hidden = true;
        formSucesso.hidden = false;
        if (timerInterval) clearInterval(timerInterval);

        // Enviar confirmação por WhatsApp
        enviarWhatsApp(dados.telefone, '✅ *RAGUI* — Cadastro confirmado!\n\n'
          + 'Olá, ' + dados.nome.split(' ')[0] + '! Seu acesso foi ativado. 🎬\n'
          + 'Em breve entraremos em contato pelo WhatsApp.\n\n'
          + 'Bem-vindo à RAGUI!').catch(function () {});
      }).catch(function (err) {
        formErroCodigo.hidden = false;
        formErroCodigo.textContent = 'Erro ao finalizar cadastro. Tente novamente.';
        if (window.console) console.warn('cadastro não gravado:', err && err.message);
      }).then(function () {
        enviando = false;
        btnValidar.disabled = false;
        btnValidar.textContent = '✅ Validar e Cadastrar';
      });
    });
  }

  // ─── Scroll suave nos links do header ───────────────
  var scrollLinks = document.querySelectorAll('a[href^="#"]');
  scrollLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── CTA "abre-cadastro" → scroll to form ──────────
  var botoesAbrir = document.querySelectorAll('.abre-cadastro');
  botoesAbrir.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.RAGUI_ATIVO) {
        raguiEvento('Contact', { content_name: 'Abriu cadastro' });
      }
      var cadastro = document.getElementById('cadastro');
      if (cadastro) {
        cadastro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus no primeiro campo
        setTimeout(function () {
          var nome = document.getElementById('nome');
          if (nome) nome.focus();
        }, 600);
      }
    });
  });

  // ─── Header background on scroll ───────────────────
  var header = document.querySelector('.header');
  if (header) {
    var lastScroll = 0;
    window.addEventListener('scroll', function () {
      var st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > 100) {
        header.style.borderBottomColor = 'rgba(245, 185, 90, 0.1)';
      } else {
        header.style.borderBottomColor = '';
      }
      lastScroll = st;
    }, { passive: true });
  }

})();
