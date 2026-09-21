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

  // ─── Filtros de Gênero ──────────────────────────────
  var filtros = document.querySelectorAll('.filtro');
  var todosCards = document.querySelectorAll('.card');

  filtros.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var genero = btn.getAttribute('data-genero');

      // Atualizar botão ativo
      filtros.forEach(function (f) { f.classList.remove('filtro--ativo'); });
      btn.classList.add('filtro--ativo');

      // Filtrar cards
      todosCards.forEach(function (card) {
        var generos = card.getAttribute('data-genero') || '';
        if (genero === 'todos' || generos.indexOf(genero) !== -1) {
          card.classList.remove('hidden-card');
          // Re-trigger visibility se necessário
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

  // ─── Validação e Envio do Formulário ────────────────
  var form = document.getElementById('form-cadastro');
  var btnEnviar = document.getElementById('btn-enviar');
  var formErro = document.getElementById('form-erro');
  var formSucesso = document.getElementById('form-sucesso');
  var enviando = false;

  function marcar(id, ok) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('ruim', !ok);
    return ok;
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

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

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;

      var nome = document.getElementById('nome').value.trim();
      var telefone = campoTelefone.value.replace(/\D/g, '');
      var email = document.getElementById('email').value.trim();

      var v1 = marcar('f-nome', nome.length >= 2);
      var v2 = marcar('f-telefone', telefone.length === 10 || telefone.length === 11);
      var v3 = marcar('f-email', validarEmail(email));

      if (!(v1 && v2 && v3)) return;

      enviando = true;
      formErro.hidden = true;
      formSucesso.hidden = true;
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando…';

      var dados = {
        nome: nome,
        telefone: telefone,
        email: email,
        origem: location.href,
        quando: new Date().toISOString()
      };

      gravar(dados).then(function () {
        if (window.RAGUI_ATIVO) {
          raguiEvento('Lead', { content_name: 'Cadastro RAGUI 2' });
        }
        formSucesso.hidden = false;
        form.reset();
      }).catch(function (err) {
        formErro.hidden = false;
        if (window.console) console.warn('cadastro não gravado:', err && err.message);
      }).then(function () {
        enviando = false;
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Cadastrar';
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
