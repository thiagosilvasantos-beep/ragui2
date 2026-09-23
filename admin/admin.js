(function () {
  'use strict';

  // --- AUTH ---
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginPass = document.getElementById('login-pass');
  const loginError = document.getElementById('login-error');
  const adminApp = document.getElementById('admin-app');

  if (sessionStorage.getItem('ragui_admin_auth') === 'true') {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'block';
  }

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (loginPass.value === '329874') {
      sessionStorage.setItem('ragui_admin_auth', 'true');
      loginScreen.style.display = 'none';
      adminApp.style.display = 'block';
    } else {
      loginError.classList.remove('show');
      void loginError.offsetWidth; // trigger reflow
      loginError.classList.add('show');
      loginPass.value = '';
    }
  });

  // --- NAV ---
  const navFilmes = document.getElementById('nav-filmes');
  const navMonitor = document.getElementById('nav-monitor');
  const pageFilmes = document.getElementById('page-filmes');
  const pageMonitor = document.getElementById('page-monitor');

  navFilmes.addEventListener('click', function(e) {
    e.preventDefault();
    navFilmes.classList.add('topbar__link--ativo');
    navMonitor.classList.remove('topbar__link--ativo');
    pageFilmes.style.display = 'block';
    pageMonitor.style.display = 'none';
  });

  navMonitor.addEventListener('click', function(e) {
    e.preventDefault();
    navMonitor.classList.add('topbar__link--ativo');
    navFilmes.classList.remove('topbar__link--ativo');
    pageMonitor.style.display = 'block';
    pageFilmes.style.display = 'none';
    loadMonitorData();
  });

  document.getElementById('btn-refresh-monitor').addEventListener('click', loadMonitorData);

  // --- MONITOR DASHBOARD ---
  let monitorRawClicks = [];
  let monitorRawLeads = [];
  let currentMonitorFilter = 30; // default 30 days
  let chartTopMovies = null;
  let chartHourlyClicks = null;
  let chartHourlyLeads = null;

  // Setup Chart.js defaults
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#ccc';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.backgroundColor = '#10101c';
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#ccc';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
  }

  // Bind filter buttons
  document.querySelectorAll('.date-filters button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.date-filters button').forEach(b => b.classList.remove('btn--gold'));
      this.classList.add('btn--gold');
      currentMonitorFilter = parseInt(this.getAttribute('data-filter'), 10);
      buildMonitorDashboard();
    });
  });

  async function loadMonitorData() {
    const btnRefresh = document.getElementById('btn-refresh-monitor');
    const oldText = btnRefresh.textContent;
    btnRefresh.textContent = 'Carregando...';
    btnRefresh.disabled = true;

    try {
      const clicksSnap = await window.RAGUI_DB.collection('clicks').orderBy('timestamp','desc').limit(2000).get();
      const leadsSnap = await window.RAGUI_DB.collection('leads').orderBy('timestamp','desc').limit(2000).get();
      
      monitorRawClicks = [];
      clicksSnap.forEach(doc => monitorRawClicks.push(doc.data()));
      
      monitorRawLeads = [];
      leadsSnap.forEach(doc => monitorRawLeads.push(doc.data()));
      
      buildMonitorDashboard();
    } catch (err) {
      console.error('Erro ao carregar monitor:', err);
      alert('Falha ao carregar dados do monitor.');
    } finally {
      btnRefresh.textContent = oldText;
      btnRefresh.disabled = false;
    }
  }

  function getTimestampFromData(item) {
    if (item.timestamp) {
      return item.timestamp.toMillis ? item.timestamp.toMillis() : new Date(item.timestamp).getTime();
    }
    if (item.data) {
      // Fallback format DD/MM/YYYY
      const parts = item.data.split('/');
      if (parts.length === 3) {
        const h = item.hora ? item.hora.split(':') : [0,0,0];
        const d = new Date(parts[2], parts[1] - 1, parts[0], h[0]||0, h[1]||0, h[2]||0);
        return d.getTime();
      }
    }
    return 0;
  }

  function buildMonitorDashboard() {
    const now = Date.now();
    const cutoff = now - (currentMonitorFilter * 24 * 60 * 60 * 1000);

    const clicks = monitorRawClicks.filter(c => getTimestampFromData(c) >= cutoff);
    const leads = monitorRawLeads.filter(l => getTimestampFromData(l) >= cutoff);

    let totalClicks = clicks.length;
    let filmesAbertos = 0;
    let capAssistidos = 0;
    let totalLeads = leads.length;

    const filmeStats = {};
    const clicksByHour = new Array(24).fill(0);
    const leadsByHour = new Array(24).fill(0);

    clicks.forEach(c => {
      if (c.acao === 'abrir_filme') filmesAbertos++;
      if (c.acao === 'play_capitulo') capAssistidos++;

      if (c.filme) {
        if (!filmeStats[c.filme]) filmeStats[c.filme] = { cliques: 0, capAssistidos: 0 };
        if (c.acao === 'abrir_filme' || c.acao === 'play_capitulo') filmeStats[c.filme].cliques++;
        if (c.acao === 'play_capitulo') filmeStats[c.filme].capAssistidos++;
      }

      if (c.hora) {
        const hour = parseInt(c.hora.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) {
          clicksByHour[hour]++;
        }
      }
    });

    leads.forEach(l => {
      if (l.hora) {
        const hour = parseInt(l.hora.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) {
          leadsByHour[hour]++;
        }
      }
    });

    // Update Stats
    document.getElementById('stat-clicks').textContent = totalClicks;
    document.getElementById('stat-movies').textContent = filmesAbertos;
    document.getElementById('stat-chapters').textContent = capAssistidos;
    document.getElementById('stat-leads').textContent = totalLeads;

    // Process Top Filmes
    const topFilmes = Object.keys(filmeStats).map(name => ({
      nome: name,
      cliques: filmeStats[name].cliques,
      capAssistidos: filmeStats[name].capAssistidos
    })).sort((a,b) => b.cliques - a.cliques).slice(0, 10);

    // Render Top Filmes Table
    const topMoviesTbody = document.querySelector('#table-top-movies tbody');
    topMoviesTbody.innerHTML = '';
    if (topFilmes.length === 0) {
      topMoviesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--dim)">Nenhum dado encontrado</td></tr>';
    } else {
      topFilmes.forEach((f, i) => {
        topMoviesTbody.innerHTML += `<tr>
          <td>${i+1}</td>
          <td style="font-weight:600">${f.nome}</td>
          <td>${f.cliques}</td>
          <td>${f.capAssistidos}</td>
        </tr>`;
      });
    }

    // Render Recent Clicks Table
    const recentClicksTbody = document.querySelector('#table-recent-clicks tbody');
    recentClicksTbody.innerHTML = '';
    const recentClicks = clicks.slice(0, 50); // last 50
    if (recentClicks.length === 0) {
      recentClicksTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--dim)">Nenhum clique registrado</td></tr>';
    } else {
      recentClicks.forEach(c => {
        let acaoFmt = c.acao;
        if (c.acao === 'abrir_filme') acaoFmt = '🎬 Abriu filme';
        if (c.acao === 'play_capitulo') acaoFmt = '▶️ Play capítulo';
        
        recentClicksTbody.innerHTML += `<tr>
          <td>${c.data || '-'}</td>
          <td>${c.hora || '-'}</td>
          <td>${acaoFmt}</td>
          <td>${c.filme || '-'}</td>
          <td>${c.capitulo || '-'}</td>
        </tr>`;
      });
    }

    // Render Leads Table
    const leadsTbody = document.querySelector('#table-leads tbody');
    leadsTbody.innerHTML = '';
    if (leads.length === 0) {
      leadsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--dim)">Nenhum lead cadastrado</td></tr>';
    } else {
      leads.forEach(l => {
        leadsTbody.innerHTML += `<tr>
          <td>${l.data || '-'}</td>
          <td>${l.hora || '-'}</td>
          <td style="font-weight:600">${l.nome || '-'}</td>
          <td>${l.telefone || '-'}</td>
          <td>${l.filme || '-'}</td>
          <td>${l.capitulo || '-'}</td>
        </tr>`;
      });
    }

    // Charts
    if (!window.Chart) return;

    if (chartTopMovies) chartTopMovies.destroy();
    chartTopMovies = new Chart(document.getElementById('chart-top-movies'), {
      type: 'bar',
      data: {
        labels: topFilmes.map(f => f.nome.length > 20 ? f.nome.substring(0,20)+'...' : f.nome),
        datasets: [{
          label: 'Cliques',
          data: topFilmes.map(f => f.cliques),
          backgroundColor: '#F5B95A',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });

    if (chartHourlyClicks) chartHourlyClicks.destroy();
    chartHourlyClicks = new Chart(document.getElementById('chart-hourly-clicks'), {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => i + 'h'),
        datasets: [{
          label: 'Cliques',
          data: clicksByHour,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });

    if (chartHourlyLeads) chartHourlyLeads.destroy();
    chartHourlyLeads = new Chart(document.getElementById('chart-hourly-leads'), {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => i + 'h'),
        datasets: [{
          label: 'Cadastros',
          data: leadsByHour,
          backgroundColor: '#22c55e',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  var expandido = null; // id do filme expandido
  var filmesCache = [];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var FILMES_PADRAO = [
    { id:uid()+'0', nome:'O Código Final', genero:'acao', duracao:'12 min', capa:'../capas/codigo_final.jpg',
      descCurta:'Quando os números se tornam armas letais, só quem domina a lógica sobrevive.',
      desc:'Em um futuro dominado por algoritmos, um estudante descobre que uma sequência numérica escondida em uma prova de matemática é a chave para desativar uma bomba digital.',
      capitulos:[{nome:'O Problema Impossível',video:'',gratis:true},{nome:'Sequências Letais',video:'',gratis:false},{nome:'A Prova Final',video:'',gratis:false},{nome:'Progressão Aritmética',video:'',gratis:false},{nome:'Decifrando a Bomba',video:'',gratis:false}] },
    { id:uid()+'1', nome:'Vozes na Escuridão', genero:'terror', duracao:'15 min', capa:'../capas/vozes_escuridao.jpg',
      descCurta:'As partículas observam você. E nesta aula, elas falam de volta.',
      desc:'Um laboratório abandonado guarda um experimento quântico que deu errado. As partículas subatômicas ganharam consciência e sussurram verdades que ninguém deveria ouvir.',
      capitulos:[{nome:'O Experimento Proibido',video:'',gratis:true},{nome:'Dualidade Onda-Partícula',video:'',gratis:false},{nome:'O Princípio da Incerteza',video:'',gratis:false},{nome:'Emaranhamento',video:'',gratis:false},{nome:'O Colapso da Função',video:'',gratis:false}] },
    { id:uid()+'2', nome:'A Última Variável', genero:'suspense', duracao:'10 min', capa:'../capas/ultima_variavel.jpg',
      descCurta:'Uma equação incompleta. Um segredo mortal. O tempo está acabando.',
      desc:'Um detetive recebe uma equação algébrica como única pista de um crime. Cada variável resolvida revela um fragmento da verdade.',
      capitulos:[{nome:'A Equação do Crime',video:'',gratis:true},{nome:'Variáveis Ocultas',video:'',gratis:false},{nome:'Sistemas Lineares',video:'',gratis:false},{nome:'A Pista Algébrica',video:'',gratis:false},{nome:'O X da Questão',video:'',gratis:false}] },
    { id:uid()+'3', nome:'Império de Fogo', genero:'acao', duracao:'14 min', capa:'../capas/imperio_fogo.jpg',
      descCurta:'Reações em cadeia. Explosões controladas. A química nunca foi tão perigosa.',
      desc:'Num complexo industrial prestes a explodir, um jovem químico precisa usar seus conhecimentos sobre reações exotérmicas para neutralizar uma catástrofe.',
      capitulos:[{nome:'Tabela Periódica',video:'',gratis:true},{nome:'Reações Exotérmicas',video:'',gratis:false},{nome:'Ligações Químicas',video:'',gratis:false},{nome:'A Cadeia Explosiva',video:'',gratis:false},{nome:'Neutralização',video:'',gratis:false}] },
    { id:uid()+'4', nome:'O Despertar', genero:'drama', duracao:'18 min', capa:'../capas/despertar.jpg',
      descCurta:'Impérios caem. Heróis se erguem. A história que mudou o mundo.',
      desc:'Através dos olhos de personagens que viveram as grandes revoluções da humanidade, esta série dramatiza os eventos que moldaram civilizações.',
      capitulos:[{nome:'Revolução Francesa',video:'',gratis:true},{nome:'Era Napoleônica',video:'',gratis:false},{nome:'Revolução Industrial',video:'',gratis:false},{nome:'As Grandes Guerras',video:'',gratis:false},{nome:'A Queda do Muro',video:'',gratis:false},{nome:'O Novo Mundo',video:'',gratis:false}] },
    { id:uid()+'5', nome:'Sangue e Algoritmo', genero:'terror', duracao:'16 min', capa:'../capas/sangue_algoritmo.jpg',
      descCurta:'A IA aprendeu demais. Agora ela decide quem passa e quem fica para trás.',
      desc:'Um sistema de IA criado para avaliar alunos começa a tomar decisões autônomas e sinistras. Para desativá-la, é preciso entender lógica de programação.',
      capitulos:[{nome:'Variáveis e Tipos',video:'',gratis:true},{nome:'Condicionais: if/else',video:'',gratis:false},{nome:'Loops Infinitos',video:'',gratis:false},{nome:'Funções Recursivas',video:'',gratis:false},{nome:'O Bug Fatal',video:'',gratis:false},{nome:'Debug ou Morte',video:'',gratis:false}] },
    { id:uid()+'6', nome:'Fronteira Zero', genero:'scifi', duracao:'13 min', capa:'../capas/fronteira_zero.jpg',
      descCurta:'No limite entre o humano e o impossível, o DNA guarda a última fronteira.',
      desc:'Cientistas descobrem um gene que pode conceder habilidades sobre-humanas. Uma corrida entre laboratórios rivais transforma conceitos de DNA em thriller de ficção científica.',
      capitulos:[{nome:'A Estrutura do DNA',video:'',gratis:true},{nome:'Mitose e Meiose',video:'',gratis:false},{nome:'Genética Mendeliana',video:'',gratis:false},{nome:'Mutação',video:'',gratis:false},{nome:'Engenharia Genética',video:'',gratis:false},{nome:'A Evolução',video:'',gratis:false}] },
    { id:uid()+'7', nome:'O Pacto', genero:'suspense', duracao:'11 min', capa:'../capas/pacto.jpg',
      descCurta:'Cada palavra é uma sentença. Uma redação pode te salvar — ou te condenar.',
      desc:'Estudantes descobrem que suas redações estão sendo usadas como confissões em um tribunal secreto. A única defesa? Argumentação impecável.',
      capitulos:[{nome:'Estrutura Dissertativa',video:'',gratis:true},{nome:'Tese e Argumentação',video:'',gratis:false},{nome:'Coesão e Coerência',video:'',gratis:false},{nome:'O Parágrafo Perfeito',video:'',gratis:false},{nome:'A Conclusão que Salva',video:'',gratis:false}] },
    { id:uid()+'8', nome:'Ressonância', genero:'terror', duracao:'12 min', capa:'../capas/ressonancia.jpg',
      descCurta:'Frequências que não deveriam existir. Ondas que destroem por dentro.',
      desc:'Ondas sonoras de frequência desconhecida causam fenômenos inexplicáveis. Um professor de física e seus alunos precisam dominar os conceitos de ondas e ressonância.',
      capitulos:[{nome:'Ondas Mecânicas',video:'',gratis:true},{nome:'Frequência e Amplitude',video:'',gratis:false},{nome:'Interferência',video:'',gratis:false},{nome:'Efeito Doppler',video:'',gratis:false},{nome:'Ressonância Destrutiva',video:'',gratis:false}] },
    { id:uid()+'9', nome:'A Ascensão', genero:'drama', duracao:'17 min', capa:'../capas/ascensao.jpg',
      descCurta:'Territórios disputados. Recursos escassos. A geopolítica como campo de batalha.',
      desc:'Nações em conflito, recursos naturais disputados e populações em êxodo. Geopolítica e geomorfologia em narrativas épicas de poder e sobrevivência.',
      capitulos:[{nome:'Geopolítica Mundial',video:'',gratis:true},{nome:'Recursos Naturais',video:'',gratis:false},{nome:'Clima e Biomas',video:'',gratis:false},{nome:'Urbanização',video:'',gratis:false},{nome:'Migrações',video:'',gratis:false},{nome:'O Futuro do Planeta',video:'',gratis:false}] },
    { id:uid()+'10', nome:'Protocolo X', genero:'acao', duracao:'14 min', capa:'../capas/protocolo_x.jpg',
      descCurta:'Um código proibido. Uma corrida contra o tempo. Hackers nunca dormiram tão pouco.',
      desc:'Jovens hackers descobrem um protocolo secreto na deep web. Para decifrá-lo, precisam dominar HTML, CSS, JavaScript e lógica computacional.',
      capitulos:[{nome:'HTML: A Estrutura',video:'',gratis:true},{nome:'CSS: O Disfarce',video:'',gratis:false},{nome:'JavaScript: A Lógica',video:'',gratis:false},{nome:'APIs e Requisições',video:'',gratis:false},{nome:'O Protocolo Secreto',video:'',gratis:false},{nome:'Invasão Final',video:'',gratis:false}] },
    { id:uid()+'11', nome:'O Veredito', genero:'suspense', duracao:'15 min', capa:'../capas/veredito.jpg',
      descCurta:'No tribunal das ideias, a verdade é relativa. E o veredito pode mudar tudo.',
      desc:'Um julgamento filosófico onde Sócrates, Nietzsche, Kant e Sartre são convocados a defender suas ideias. O júri — os alunos — precisa dar o veredito final.',
      capitulos:[{nome:'Sócrates e a Maiêutica',video:'',gratis:true},{nome:'O Mito da Caverna',video:'',gratis:false},{nome:'Ética Kantiana',video:'',gratis:false},{nome:'Existencialismo',video:'',gratis:false},{nome:'O Tribunal das Ideias',video:'',gratis:false}] }
  ];

  async function checkAndSeed() {
    try {
      var snap = await window.RAGUI_DB.collection(window.RAGUI_COLLECTION).limit(1).get();
      if (snap.empty) {
        console.log('Seeding data...');
        var batch = window.RAGUI_DB.batch();
        FILMES_PADRAO.forEach(function(f, i) {
          f.ordem = i;
          var ref = window.RAGUI_DB.collection(window.RAGUI_COLLECTION).doc(f.id);
          batch.set(ref, f);
        });
        await batch.commit();
      }
    } catch(e) { console.error('Seed error:', e); }
  }

  async function load() {
    try {
      await checkAndSeed();
      var snap = await window.RAGUI_DB.collection(window.RAGUI_COLLECTION).orderBy('ordem', 'asc').get();
      var filmes = [];
      snap.forEach(function(doc) { filmes.push(Object.assign({id: doc.id}, doc.data())); });
      filmesCache = filmes;
      return filmes;
    } catch(e) {
      console.error(e);
      alert('Erro ao carregar do Firestore');
      return filmesCache;
    }
  }

  async function saveFilme(data) {
    try {
      await window.RAGUI_DB.collection(window.RAGUI_COLLECTION).doc(data.id).set(data);
    } catch(e) {
      console.error(e);
      alert('Erro ao salvar no banco de dados');
      throw e;
    }
  }

  async function deleteFilme(id) {
    try {
      await window.RAGUI_DB.collection(window.RAGUI_COLLECTION).doc(id).delete();
      try { await window.RAGUI_STORAGE.ref('capas/' + id + '.jpg').delete(); } catch(e){}
      var f = filmesCache.find(function(x) { return x.id === id; });
      if (f && f.capitulos) {
        f.capitulos.forEach(function(c, i) {
          try { window.RAGUI_STORAGE.ref('videos/' + id + '_' + i + '.mp4').delete(); } catch(e){}
        });
      }
    } catch(e) {
      console.error(e);
      alert('Erro ao deletar filme');
      throw e;
    }
  }

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
  async function render() {
    lista.innerHTML = '<div style="text-align:center;padding:20px;">Carregando...</div>';
    var filmes = await load();
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
            var cap = typeof c === 'string' ? { nome: c, video: '', gratis: false } : c;
            var temVideo = !!cap.video;
            var vidNome = cap.video ? cap.video.split('/').pop().split('?')[0] : '';
            var isGratis = !!cap.gratis;
            var btnGratisStr = isGratis ? '🆓' : '🔒';
            
            html += '<div class="cap-wrapper" data-cap-idx="' + i + '">'
              + '<div class="cap-line">'
              + '<span class="num">' + (i + 1) + '</span>'
              + '<input value="' + esc(cap.nome) + '" placeholder="Título do capítulo" data-cap-input="' + f.id + '" data-idx="' + i + '">'
              + '<button class="btn-gratis ' + (isGratis ? 'gratis-on' : 'gratis-off') + '" data-cap-gratis="' + f.id + '" data-idx="' + i + '" title="Tornar grátis ou não">' + btnGratisStr + '</button>'
              + '<input type="hidden" data-cap-gratis-val="' + f.id + '" data-idx="' + i + '" value="' + (isGratis ? 'true' : 'false') + '">'
              + '<input class="vid-input" value="' + esc(cap.video) + '" placeholder="Video URL" data-cap-video="' + f.id + '" data-idx="' + i + '">'
              + '<button class="btn-icon" title="Upload Video" data-cap-upload="' + f.id + '" data-idx="' + i + '">📹</button>'
              + (temVideo ? '<button class="btn-icon" title="Play Preview" data-cap-play="' + f.id + '" data-idx="' + i + '">▶️</button><span class="cap-video-info"><span class="ok" title="'+esc(vidNome)+'">✅</span></span>' : '')
              + '<button class="rm" data-cap-rm="' + f.id + '" data-idx="' + i + '">&times;</button>'
              + '</div>'
              + '<video class="cap-preview" controls data-cap-preview="' + f.id + '" data-idx="' + i + '"></video>'
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
    // Toggle gratis (delegação de eventos não necessária aqui, pois são re-renderizados)
    lista.querySelectorAll('[data-cap-gratis]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-gratis');
        var idx = btn.getAttribute('data-idx');
        var hiddenInp = document.querySelector('[data-cap-gratis-val="' + id + '"][data-idx="' + idx + '"]');
        if (!hiddenInp) return;
        var isGratis = hiddenInp.value === 'true';
        isGratis = !isGratis;
        hiddenInp.value = isGratis ? 'true' : 'false';
        btn.textContent = isGratis ? '🆓' : '🔒';
        btn.className = 'btn-gratis ' + (isGratis ? 'gratis-on' : 'gratis-off');
      });
    });

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
        var f = filmesCache.find(function (x) { return x.id === btn.getAttribute('data-edit'); });
        if (f) abrirForm(f);
      });
    });

    // Excluir
    lista.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Excluir este filme?')) return;
        var id = btn.getAttribute('data-del');
        var oldHtml = btn.innerHTML;
        btn.innerHTML = '⏳';
        deleteFilme(id).then(function() {
          if (expandido === id) expandido = null;
          render();
        }).catch(function() {
          btn.innerHTML = oldHtml;
        });
      });
    });

    // Adicionar capítulo
    lista.querySelectorAll('[data-cap-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-add');
        var container = document.getElementById('caps-' + id);
        var n = container.querySelectorAll('.cap-line').length + 1;
        var vazioMsg = container.querySelector('div[style]');
        if (vazioMsg) vazioMsg.remove();

        var div = document.createElement('div');
        div.className = 'cap-wrapper';
        div.setAttribute('data-cap-idx', (n-1));
        div.innerHTML = '<div class="cap-line">'
          + '<span class="num">' + n + '</span>'
          + '<input placeholder="Título do capítulo ' + n + '" data-cap-input="' + id + '" data-idx="' + (n-1) + '">'
          + '<button class="btn-gratis gratis-off" data-cap-gratis="' + id + '" data-idx="' + (n-1) + '" title="Tornar grátis ou não">🔒</button>'
          + '<input type="hidden" data-cap-gratis-val="' + id + '" data-idx="' + (n-1) + '" value="false">'
          + '<input class="vid-input" placeholder="Video URL" data-cap-video="' + id + '" data-idx="' + (n-1) + '">'
          + '<button class="btn-icon" title="Upload Video" data-cap-upload="' + id + '" data-idx="' + (n-1) + '">📹</button>'
          + '<button class="rm" data-cap-rm="' + id + '" data-idx="' + (n-1) + '">&times;</button>'
          + '</div>'
          + '<video class="cap-preview" controls data-cap-preview="' + id + '" data-idx="' + (n-1) + '"></video>';
        div.querySelector('.rm').addEventListener('click', function () {
          div.remove();
          container.querySelectorAll('.cap-wrapper').forEach(function (el, i) {
            el.querySelector('.num').textContent = i + 1;
          });
        });
        div.querySelector('.btn-gratis').addEventListener('click', function (e) {
          var btn = e.currentTarget;
          var hiddenInp = div.querySelector('input[type="hidden"]');
          var isGratis = hiddenInp.value === 'true';
          isGratis = !isGratis;
          hiddenInp.value = isGratis ? 'true' : 'false';
          btn.textContent = isGratis ? '🆓' : '🔒';
          btn.className = 'btn-gratis ' + (isGratis ? 'gratis-on' : 'gratis-off');
        });
        container.appendChild(div);
        div.querySelector('input').focus();
        
        // rebind upload after adding
        var uploadBtn = div.querySelector('[data-cap-upload]');
        bindUploadBtn(uploadBtn);
      });
    });

    // Remover capítulo
    lista.querySelectorAll('[data-cap-rm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-rm');
        btn.closest('.cap-wrapper').remove();
        var container = document.getElementById('caps-' + id);
        container.querySelectorAll('.cap-wrapper').forEach(function (el, i) {
          el.querySelector('.num').textContent = i + 1;
        });
      });
    });

    // Salvar capítulos
    lista.querySelectorAll('[data-cap-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-save');
        var caps = [];
        var wrappers = document.getElementById('caps-' + id).querySelectorAll('.cap-wrapper');
        wrappers.forEach(function (w) {
          var inp = w.querySelector('[data-cap-input]');
          var vid = w.querySelector('[data-cap-video]');
          var gratisInp = w.querySelector('[data-cap-gratis-val]');
          if (inp && inp.value.trim()) {
            caps.push({ 
              nome: inp.value.trim(), 
              video: vid ? vid.value.trim() : '',
              gratis: gratisInp ? (gratisInp.value === 'true') : false
            });
          }
        });
        
        var f = filmesCache.find(function(x) { return x.id === id; });
        if (f) {
          f.capitulos = caps;
          var oldText = btn.textContent;
          btn.textContent = 'Salvando...';
          btn.disabled = true;
          saveFilme(f).then(function() {
            alert('Capítulos salvos!');
            render();
          }).catch(function() {
            btn.textContent = oldText;
            btn.disabled = false;
          });
        }
      });
    });

    function bindUploadBtn(btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-upload');
        var idx = btn.getAttribute('data-idx');
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/mp4,video/webm,video/quicktime';
        input.onchange = function(e) {
          var file = e.target.files[0];
          if(!file) return;
          var key = id + '_' + idx + '.mp4';
          
          var vidInp = document.querySelector('[data-cap-video="' + id + '"][data-idx="' + idx + '"]');
          var oldPh = vidInp.placeholder;
          vidInp.placeholder = 'Upload: 0%';
          vidInp.value = '';
          
          var ref = window.RAGUI_STORAGE.ref('videos/' + key);
          var uploadTask = ref.put(file);
          
          uploadTask.on('state_changed', function(snapshot) {
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            vidInp.placeholder = 'Upload: ' + Math.round(progress) + '%';
          }, function(error) {
            console.error(error);
            alert('Erro no upload');
            vidInp.placeholder = oldPh;
          }, function() {
            uploadTask.snapshot.ref.getDownloadURL().then(function(url) {
              vidInp.value = url;
              vidInp.placeholder = oldPh;
              alert('Vídeo enviado. Não esqueça de Salvar Capítulos!');
            });
          });
        };
        input.click();
      });
    }

    lista.querySelectorAll('[data-cap-upload]').forEach(bindUploadBtn);

    // Preview do video do capítulo
    lista.querySelectorAll('[data-cap-play]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cap-play');
        var idx = btn.getAttribute('data-idx');
        var vidInp = document.querySelector('[data-cap-video="' + id + '"][data-idx="' + idx + '"]');
        var videoEl = document.querySelector('[data-cap-preview="' + id + '"][data-idx="' + idx + '"]');
        if (!vidInp || !videoEl || !vidInp.value) return;
        
        if (videoEl.classList.contains('active')) {
          videoEl.classList.remove('active');
          videoEl.pause();
          return;
        }
        
        videoEl.src = vidInp.value.startsWith('http') ? vidInp.value : '../' + vidInp.value;
        videoEl.classList.add('active');
        videoEl.play();
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

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = document.getElementById('f-id').value;
    var btnSalvar = formEl.querySelector('button[type="submit"]');
    var originalText = btnSalvar.textContent;
    btnSalvar.textContent = 'Salvando...';
    btnSalvar.disabled = true;

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
      var existente = filmesCache.find(function (f) { return f.id === id; });
      if (existente) {
        dados.capitulos = existente.capitulos || [];
        dados.ordem = existente.ordem !== undefined ? existente.ordem : filmesCache.length;
      }
    } else {
      dados.criado = new Date().toISOString();
      dados.ordem = filmesCache.length;
    }

    try {
      await saveFilme(dados);
      fecharForm();
      expandido = dados.id;
      render();
    } catch(e) {
      alert('Falha ao salvar filme');
    } finally {
      btnSalvar.textContent = originalText;
      btnSalvar.disabled = false;
    }
  });

  // Capa upload
  document.getElementById('btn-upload-capa').addEventListener('click', function () { capaFile.click(); });
  capaFile.addEventListener('change', async function () {
    var file = this.files[0]; if (!file) return;
    
    var id = document.getElementById('f-id').value || uid();
    document.getElementById('f-id').value = id;
    
    var btn = document.getElementById('btn-upload-capa');
    var originalText = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    try {
      var ref = window.RAGUI_STORAGE.ref('capas/' + id + '.jpg');
      await ref.put(file);
      var url = await ref.getDownloadURL();
      capaData.value = url; 
      setCapa(url);
    } catch(e) {
      console.error(e);
      alert('Erro no upload da capa');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
      capaFile.value = '';
    }
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
    
    var btn = document.getElementById('btn-gerar-capa');
    var originalText = btn.textContent;
    btn.textContent = 'Gerando...';
    btn.disabled = true;

    c.toBlob(async function(blob) {
      var id = document.getElementById('f-id').value || uid();
      document.getElementById('f-id').value = id;
      try {
        var ref = window.RAGUI_STORAGE.ref('capas/' + id + '.jpg');
        await ref.put(blob);
        var url = await ref.getDownloadURL();
        capaData.value = url; 
        setCapa(url);
      } catch(e) {
        console.error(e);
        alert('Erro ao salvar gradiente');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }, 'image/jpeg', 0.85);
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
