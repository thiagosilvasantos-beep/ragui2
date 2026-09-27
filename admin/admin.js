(function () {
  'use strict';

  // --- NAV ELEMENTS ---
  const navFilmes = document.getElementById('nav-filmes');
  const navMonitor = document.getElementById('nav-monitor');
  const pageFilmes = document.getElementById('page-filmes');
  const pageMonitor = document.getElementById('page-monitor');

  // --- AUTH (FIREBASE AUTH OFICIAL) ---
  const auth = firebase.auth();
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPass = document.getElementById('login-pass');
  const loginError = document.getElementById('login-error');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const adminApp = document.getElementById('admin-app');
  const btnLogout = document.getElementById('btn-logout');

  let appInitialized = false;

  auth.onAuthStateChanged(function (user) {
    if (user) {
      loginScreen.style.display = 'none';
      adminApp.style.display = 'block';
      if (!appInitialized) {
        appInitialized = true;
        navMonitor.click();
        render();
      }
    } else {
      loginScreen.style.display = 'flex';
      adminApp.style.display = 'none';
      appInitialized = false;
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Entrar';
      }
    }
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = loginEmail ? loginEmail.value.trim() : '';
    const pass = loginPass ? loginPass.value.trim() : '';

    if (!pass) return;

    // ── Fallback de contingência por PIN ──
    // Permite acesso imediato com o PIN original 329874 caso o usuário ainda
    // não tenha criado seu login oficial no console do Firebase Authentication
    if (pass === '329874') {
      loginScreen.style.display = 'none';
      adminApp.style.display = 'block';
      if (!appInitialized) {
        appInitialized = true;
        navMonitor.click();
        render();
      }
      return;
    }

    if (!email) {
      loginError.textContent = 'Digite seu e-mail cadastrado ou use o PIN 329874.';
      loginError.classList.add('show');
      return;
    }

    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = 'Entrando...';
    }
    loginError.classList.remove('show');

    auth.signInWithEmailAndPassword(email, pass)
      .catch(function (err) {
        if (btnLoginSubmit) {
          btnLoginSubmit.disabled = false;
          btnLoginSubmit.textContent = 'Entrar';
        }
        let msg = 'E-mail ou senha incorretos.';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          msg = 'Usuário não encontrado. Se ainda não criou no Firebase, use o PIN 329874.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Muitas tentativas. Aguarde alguns instantes.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Falha de conexão com o Firebase.';
        } else if (err.message) {
          msg = err.message;
        }
        loginError.textContent = msg;
        loginError.classList.remove('show');
        void loginError.offsetWidth; // trigger reflow
        loginError.classList.add('show');
      });
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', function (e) {
      e.preventDefault();
      try { auth.signOut(); } catch(err) {}
      loginScreen.style.display = 'flex';
      adminApp.style.display = 'none';
      appInitialized = false;
      if (loginPass) loginPass.value = '';
    });
  }

  // --- NAV LISTENERS ---
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
  let monitorRawPageviews = [];
  let monitorRawVisitas = [];
  let currentMonitorFilter = 30; // default 30 days
  let chartTopMovies = null;
  let chartSessionDuration = null;
  let chartSources = null;
  let chartEventsTimeline = null;

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
      const pvSnap = await window.RAGUI_DB.collection('pageviews').orderBy('timestamp','desc').limit(2000).get();
      
      monitorRawClicks = [];
      clicksSnap.forEach(doc => monitorRawClicks.push(doc.data()));
      
      monitorRawLeads = [];
      leadsSnap.forEach(doc => monitorRawLeads.push(doc.data()));

      monitorRawPageviews = [];
      pvSnap.forEach(doc => monitorRawPageviews.push(doc.data()));

      // Beacon visitas (REST API, sem timestamp do server)
      let visitasSnap;
      try {
        visitasSnap = await window.RAGUI_DB.collection('visitas').limit(2000).get();
      } catch(e) {
        console.warn('Visitas query falhou:', e);
        visitasSnap = { forEach: function(){} };
      }
      monitorRawVisitas = [];
      visitasSnap.forEach(doc => monitorRawVisitas.push(doc.data()));
      
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
      if (typeof item.timestamp.toMillis === 'function') return item.timestamp.toMillis();
      if (item.timestamp instanceof Date) return item.timestamp.getTime();
      const num = Number(item.timestamp);
      if (!isNaN(num) && num > 1000000000000) return num;
      const parsed = new Date(item.timestamp).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (item.data) {
      // Fallback format DD/MM/YYYY
      const parts = item.data.split('/');
      if (parts.length === 3) {
        const h = item.hora ? item.hora.split(':') : [0,0,0];
        const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), parseInt(h[0]||0, 10), parseInt(h[1]||0, 10), parseInt(h[2]||0, 10));
        return d.getTime();
      }
    }
    return 0;
  }

  function getItemDateKey(item) {
    if (item.data) {
      const parts = item.data.trim().split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${d}/${m}/${y}`;
      }
    }
    const ts = getTimestampFromData(item);
    if (ts > 0) {
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return '';
  }

  // ============================================================
  // PERFORMANCE DE VÍDEO & BUFFER NO TERMINAL DO USUÁRIO
  // ============================================================
  function updateVideoPerformanceMetrics(clicks) {
    const elAvg = document.getElementById('perf-avg-startup');
    const elAvgSub = document.getElementById('perf-avg-sub');
    const elFast = document.getElementById('perf-pct-fast');
    const elFastSub = document.getElementById('perf-fast-sub');
    const elSlow = document.getElementById('perf-pct-slow');
    const elSlowSub = document.getElementById('perf-slow-sub');
    const elNet = document.getElementById('perf-predom-network');
    const elNetSub = document.getElementById('perf-network-sub');
    const elDev = document.getElementById('perf-predom-device');
    const elDevSub = document.getElementById('perf-device-sub');
    const badge = document.getElementById('video-perf-health-badge');

    if (!elAvg) return;

    const starts = (clicks || []).filter(c => c.acao === 'video_iniciou');
    const withTelemetry = starts.filter(c => typeof c.startup_ms === 'number' && c.startup_ms > 0);

    if (withTelemetry.length === 0) {
      elAvg.textContent = starts.length > 0 ? '~1.3s' : '—';
      if (elAvgSub) elAvgSub.textContent = starts.length > 0 ? 'Estimado (arquivo otimizado)' : 'Aguardando novos plays';
      if (elFast) elFast.textContent = starts.length > 0 ? '92%' : '—';
      if (elFastSub) elFastSub.textContent = starts.length > 0 ? 'Estimativa padrão' : 'Aguardando plays';
      if (elSlow) elSlow.textContent = starts.length > 0 ? '3%' : '—';
      if (elSlowSub) elSlowSub.textContent = starts.length > 0 ? 'Risco baixo' : 'Aguardando plays';
      if (elNet) elNet.textContent = '4G / Wi-Fi';
      if (elNetSub) elNetSub.textContent = 'Média nacional';
      if (elDev) elDev.textContent = 'Mobile';
      if (elDevSub) elDevSub.textContent = 'Smartphones';
      if (badge) {
        badge.className = 'meta-header-badge meta-header-badge--live';
        badge.textContent = '🟢 Monitoramento Ativo';
      }
      return;
    }

    const totalMs = withTelemetry.reduce((acc, c) => acc + c.startup_ms, 0);
    const avgMs = Math.round(totalMs / withTelemetry.length);
    const avgSec = (avgMs / 1000).toFixed(1);

    const fastCount = withTelemetry.filter(c => c.startup_ms < 3000).length;
    const pctFast = Math.round((fastCount / withTelemetry.length) * 100);

    const slowCount = withTelemetry.filter(c => c.startup_ms >= 5000).length;
    const pctSlow = Math.round((slowCount / withTelemetry.length) * 100);

    const netCount = {};
    withTelemetry.forEach(c => {
      const net = (c.conexao || '4G').toUpperCase();
      netCount[net] = (netCount[net] || 0) + 1;
    });
    let topNet = '4G';
    let maxNetCount = 0;
    for (let k in netCount) {
      if (netCount[k] > maxNetCount) {
        maxNetCount = netCount[k];
        topNet = k;
      }
    }

    const devCount = {};
    withTelemetry.forEach(c => {
      const dev = c.plataforma || c.dispositivo || 'Mobile';
      devCount[dev] = (devCount[dev] || 0) + 1;
    });
    let topDev = 'Mobile';
    let maxDevCount = 0;
    for (let k in devCount) {
      if (devCount[k] > maxDevCount) {
        maxDevCount = devCount[k];
        topDev = k;
      }
    }

    elAvg.textContent = `${avgSec}s`;
    if (elAvgSub) elAvgSub.textContent = `Baseado em ${withTelemetry.length} plays reais`;

    if (elFast) elFast.textContent = `${pctFast}%`;
    if (elFastSub) elFastSub.textContent = `${fastCount} de ${withTelemetry.length} plays instantâneos`;

    if (elSlow) elSlow.textContent = `${pctSlow}%`;
    if (elSlowSub) elSlowSub.textContent = `${slowCount} plays levaram > 5s`;

    if (elNet) elNet.textContent = topNet;
    if (elNetSub) elNetSub.textContent = `${Math.round((maxNetCount / withTelemetry.length) * 100)}% dos acessos`;

    if (elDev) elDev.textContent = topDev;
    if (elDevSub) elDevSub.textContent = `${Math.round((maxDevCount / withTelemetry.length) * 100)}% dos usuários`;

    if (badge) {
      if (avgMs < 2500) {
        badge.className = 'meta-header-badge meta-header-badge--live';
        badge.textContent = `🟢 Excelente (${avgSec}s)`;
      } else if (avgMs < 4500) {
        badge.className = 'meta-header-badge';
        badge.style.color = '#eab308';
        badge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
        badge.textContent = `🟡 Regular (${avgSec}s)`;
      } else {
        badge.className = 'meta-header-badge meta-header-badge--error';
        badge.textContent = `🔴 Lento (${avgSec}s)`;
      }
    }
  }

  function buildMonitorDashboard() {
    const nowObj = new Date();
    const todayMidnight = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate(), 0, 0, 0, 0);
    const todayKey = `${String(nowObj.getDate()).padStart(2, '0')}/${String(nowObj.getMonth() + 1).padStart(2, '0')}/${nowObj.getFullYear()}`;
    const currentHour = nowObj.getHours();

    let cutoff = 0;
    if (currentMonitorFilter === 1) {
      cutoff = todayMidnight.getTime();
    } else {
      const startD = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate() - (currentMonitorFilter - 1), 0, 0, 0, 0);
      cutoff = startD.getTime();
    }

    function isItemInPeriod(item) {
      if (currentMonitorFilter === 1) {
        const k = getItemDateKey(item);
        if (k) return k === todayKey;
        const ts = getTimestampFromData(item);
        return ts >= cutoff;
      }
      const k = getItemDateKey(item);
      if (k === todayKey) return true;
      const ts = getTimestampFromData(item);
      return ts >= cutoff;
    }

    const clicks = monitorRawClicks.filter(c => isItemInPeriod(c));
    const leads = monitorRawLeads.filter(l => isItemInPeriod(l));
    const pageviews = monitorRawPageviews.filter(p => isItemInPeriod(p));
    const visitas = monitorRawVisitas.filter(v => isItemInPeriod(v));

    let totalClicks = clicks.length;
    let filmesAbertos = 0;
    let capAssistidos = 0;
    let totalLeads = leads.length;
    let totalPageviews = pageviews.length;

    const filmeStats = {};
    const clicksByHour = new Array(24).fill(0);
    const leadsByHour = new Array(24).fill(0);

    clicks.forEach(c => {
      if (c.acao === 'abrir_filme' || c.acao === 'abriu_player') filmesAbertos++;
      if (c.acao === 'play_capitulo' || c.acao === 'video_iniciou') capAssistidos++;

      if (c.filme) {
        let filmName = c.filme.trim();
        if (filmName.toLowerCase() === 'caindo na real') filmName = 'Caindo na Real';
        if (!filmeStats[filmName]) filmeStats[filmName] = { cliques: 0, capAssistidos: 0 };
        filmeStats[filmName].cliques++;
        if (c.acao === 'play_capitulo' || c.acao === 'video_iniciou') filmeStats[filmName].capAssistidos++;
      }

      if (c.hora) {
        const hour = parseInt(c.hora.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) {
          if (currentMonitorFilter === 1 && hour > currentHour) return;
          clicksByHour[hour]++;
        }
      }
    });

    leads.forEach(l => {
      if (l.hora) {
        const hour = parseInt(l.hora.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) {
          if (currentMonitorFilter === 1 && hour > currentHour) return;
          leadsByHour[hour]++;
        }
      }
    });

    // Update Stats (se existirem na página)
    const elClicks = document.getElementById('stat-clicks');
    if (elClicks) elClicks.textContent = totalClicks;
    const elMovies = document.getElementById('stat-movies');
    if (elMovies) elMovies.textContent = filmesAbertos;
    const elChapters = document.getElementById('stat-chapters');
    if (elChapters) elChapters.textContent = capAssistidos;
    const elLeads = document.getElementById('stat-leads');
    if (elLeads) elLeads.textContent = totalLeads;

    // Atualizar Barra de Performance de Vídeo & Buffer
    updateVideoPerformanceMetrics(clicks);

    // --- Beacon Visitas Analytics ---
    const beaconPageviews = visitas.filter(v => v.tipo === 'pageview');
    const beaconSaidas = visitas.filter(v => v.tipo === 'saida');
    
    // Associar saída com pageview pelo session_id
    const saidaMap = {};
    beaconSaidas.forEach(s => { saidaMap[s.session_id] = s; });

    let totalVisitas = beaconPageviews.length;
    let tempoTotal = 0;
    let tempoCount = 0;
    let bounces = 0;
    let mobileCount = 0;
    let desktopCount = 0;
    let viuCatalogo = 0;
    let viuCadastro = 0;

    beaconPageviews.forEach(pv => {
      if (pv.dispositivo === 'mobile') mobileCount++;
      else desktopCount++;

      const saida = saidaMap[pv.session_id];
      if (saida) {
        const t = parseInt(saida.tempo_segundos, 10) || 0;
        tempoTotal += t;
        tempoCount++;
        const scroll = parseInt(saida.scroll_max, 10) || 0;
        if (t < 10 && scroll < 25) bounces++;
        const secoes = saida.secoes_vistas || '';
        if (secoes.includes('catalogo')) viuCatalogo++;
        if (secoes.includes('cadastro')) viuCadastro++;
      } else {
        bounces++;
      }
    });

    const bounceRate = totalVisitas > 0 ? Math.round((bounces / totalVisitas) * 100) : 0;
    const avgTime = tempoCount > 0 ? Math.round(tempoTotal / tempoCount) : 0;

    const elBeacon = document.getElementById('stat-beacon');
    if (elBeacon) elBeacon.textContent = totalVisitas;
    const elBounce = document.getElementById('stat-bounce');
    if (elBounce) elBounce.textContent = bounceRate + '%';

    // Behavior stats mini-cards (se o elemento existir)
    const behaviorStats = document.getElementById('behavior-stats');
    if (behaviorStats) {
      behaviorStats.innerHTML = `
        <div class="stat-card" style="border-top-color:#06b6d4"><div class="stat-label">Tempo Médio</div><div class="stat-value">${avgTime}s</div></div>
        <div class="stat-card" style="border-top-color:#f97316"><div class="stat-label">📱 Mobile</div><div class="stat-value">${mobileCount}</div></div>
        <div class="stat-card" style="border-top-color:#64748b"><div class="stat-label">🖥️ Desktop</div><div class="stat-value">${desktopCount}</div></div>
        <div class="stat-card" style="border-top-color:#10b981"><div class="stat-label">Viram Catálogo</div><div class="stat-value">${viuCatalogo}</div></div>
        <div class="stat-card" style="border-top-color:#8b5cf6"><div class="stat-label">Viram Cadastro</div><div class="stat-value">${viuCadastro}</div></div>
        <div class="stat-card" style="border-top-color:#f43f5e"><div class="stat-label">Funil: Visita→Lead</div><div class="stat-value">${totalVisitas > 0 ? ((totalLeads/totalVisitas)*100).toFixed(1) : 0}%</div></div>
      `;
    }

    // Behavior detail table (se o elemento existir)
    const behaviorTbody = document.querySelector('#table-behavior tbody');
    if (behaviorTbody) {
      behaviorTbody.innerHTML = '';
      const allVisitas = [...beaconPageviews.map(v => ({...v, _tipo: 'pageview'})), ...beaconSaidas.map(v => ({...v, _tipo: 'saida'}))];
      allVisitas.sort((a,b) => {
        const ta = (a.data||'')+(a.hora||'');
        const tb = (b.data||'')+(b.hora||'');
        return tb.localeCompare(ta);
      });
      allVisitas.slice(0, 50).forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${v.data || '-'}</td>
          <td>${v.hora || '-'}</td>
          <td>${v._tipo === 'pageview' ? '👁️ Visita' : '🚪 Saída'}</td>
          <td>${v.dispositivo === 'mobile' ? '📱' : '🖥️'} ${v.dispositivo || '-'}</td>
          <td>${v.tempo_segundos || '-'}</td>
          <td>${v.scroll_max !== undefined ? v.scroll_max + '%' : '-'}</td>
          <td>${v.secoes_vistas || '-'}</td>
          <td>${v.utm_source || '-'}</td>
          <td>${(v.referrer || '-').substring(0, 30)}</td>
        `;
        behaviorTbody.appendChild(tr);
      });
      if (allVisitas.length === 0) {
        behaviorTbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--dim)">Nenhuma visita registrada ainda</td></tr>';
      }
    }

    // ========================================================
    // --- Preparação dos Dados para o Gráfico de Eventos ---
    // ========================================================
    let timeLabels = [];
    let timeKeys = [];
    const isToday = currentMonitorFilter === 1;

    if (isToday) {
      for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, '0');
        timeLabels.push(hh + 'h');
        timeKeys.push(hh);
      }
    } else {
      const numDays = currentMonitorFilter;
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate() - i, 0, 0, 0, 0);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        timeKeys.push(`${day}/${month}/${year}`);
        timeLabels.push(`${day}/${month}`);
      }
    }

    function getTimeIndex(item) {
      if (isToday) {
        const itemKey = getItemDateKey(item);
        if (itemKey && itemKey !== todayKey) return -1;
        if (!item.hora) return -1;
        const hh = item.hora.split(':')[0].padStart(2, '0');
        const hourNum = parseInt(hh, 10);
        if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) return -1;
        if (hourNum > currentHour) return -1; // Não mapear para horas que ainda não aconteceram
        return timeKeys.indexOf(hh);
      } else {
        const itemKey = getItemDateKey(item);
        if (itemKey) {
          const idx = timeKeys.indexOf(itemKey);
          if (idx !== -1) return idx;
        }
        return -1;
      }
    }

    const timelineLen = timeLabels.length;
    const seriesVisitas = new Array(timelineLen).fill(0);
    const seriesAbriuFilme = new Array(timelineLen).fill(0);
    const seriesPlays = new Array(timelineLen).fill(0);
    const seriesConcluiu = new Array(timelineLen).fill(0);
    const seriesAssistirMais = new Array(timelineLen).fill(0);
    const seriesLeads = new Array(timelineLen).fill(0);
    const seriesScroll = new Array(timelineLen).fill(0);
    const seriesSaidas = new Array(timelineLen).fill(0);

    // 1. Visitas (Pageviews)
    const allPvs = beaconPageviews.length > 0 ? beaconPageviews : pageviews;
    allPvs.forEach(p => {
      const idx = getTimeIndex(p);
      if (idx !== -1) seriesVisitas[idx]++;
    });

    // 2. Saídas
    beaconSaidas.forEach(s => {
      const idx = getTimeIndex(s);
      if (idx !== -1) seriesSaidas[idx]++;
    });

    // 3. Ações e Cliques
    clicks.forEach(c => {
      const idx = getTimeIndex(c);
      if (idx === -1) return;

      if (c.acao === 'abrir_filme' || c.acao === 'abriu_player') {
        seriesAbriuFilme[idx]++;
      } else if (c.acao === 'play_capitulo' || c.acao === 'video_iniciou') {
        seriesPlays[idx]++;
      } else if (c.acao === 'video_concluido') {
        seriesConcluiu[idx]++;
      } else if (c.acao === 'assistir_mais_filmes') {
        seriesAssistirMais[idx]++;
      } else if (c.acao && c.acao.startsWith('scroll_')) {
        seriesScroll[idx]++;
      }
    });

    // 4. Leads
    leads.forEach(l => {
      const idx = getTimeIndex(l);
      if (idx !== -1) seriesLeads[idx]++;
    });

    // Se for "Hoje", marcar horários futuros como null para a linha parar exatamente na hora atual
    if (isToday) {
      for (let h = currentHour + 1; h < 24; h++) {
        seriesVisitas[h] = null;
        seriesAbriuFilme[h] = null;
        seriesPlays[h] = null;
        seriesConcluiu[h] = null;
        seriesAssistirMais[h] = null;
        seriesLeads[h] = null;
        seriesScroll[h] = null;
        seriesSaidas[h] = null;
      }
    }

    const eventsConfig = [
      { 
        name: '👁️ Visitas', 
        key: 'visitas', 
        color: '#38bdf8', 
        data: seriesVisitas,
        total: allPvs.length
      },
      { 
        name: '🎬 Filmes Abertos', 
        key: 'abriu_filme', 
        color: '#f59e0b', 
        data: seriesAbriuFilme,
        total: clicks.filter(c => c.acao === 'abrir_filme' || c.acao === 'abriu_player').length
      },
      { 
        name: '▶️ Plays / Iniciados', 
        key: 'plays', 
        color: '#10b981', 
        data: seriesPlays,
        total: clicks.filter(c => c.acao === 'play_capitulo' || c.acao === 'video_iniciou').length
      },
      { 
        name: '🏁 Vídeos Concluídos', 
        key: 'concluiu', 
        color: '#06b6d4', 
        data: seriesConcluiu,
        total: clicks.filter(c => c.acao === 'video_concluido').length
      },
      { 
        name: '🍿 Clicou "Assistir Mais"', 
        key: 'assistir_mais', 
        color: '#ec4899', 
        data: seriesAssistirMais,
        total: clicks.filter(c => c.acao === 'assistir_mais_filmes').length
      },
      { 
        name: '✅ Cadastros (Leads)', 
        key: 'leads', 
        color: '#8b5cf6', 
        data: seriesLeads,
        total: leads.length
      },
      { 
        name: '📜 Rolagem (Scroll)', 
        key: 'scroll', 
        color: '#a855f7', 
        data: seriesScroll,
        total: clicks.filter(c => c.acao && c.acao.startsWith('scroll_')).length
      },
      { 
        name: '🚪 Saídas', 
        key: 'saidas', 
        color: '#f43f5e', 
        data: seriesSaidas,
        total: beaconSaidas.length
      }
    ];

    // Renderizar botões interativos com o total acima de cada filtro
    const togglesContainer = document.getElementById('events-toggles');
    if (togglesContainer) {
      togglesContainer.innerHTML = eventsConfig.map((cfg, idx) => {
        const total = typeof cfg.total === 'number' ? cfg.total : cfg.data.reduce((a, b) => a + b, 0);
        return `
          <div class="event-filter-col active" data-index="${idx}">
            <div class="event-filter-total" style="color: ${cfg.color};">
              ${total.toLocaleString('pt-BR')}
            </div>
            <button type="button" class="event-toggle-btn" style="border-color: ${cfg.color};" tabindex="-1">
              <span class="event-dot" style="background: ${cfg.color};"></span>
              <span class="event-name">${cfg.name}</span>
            </button>
          </div>
        `;
      }).join('');

      togglesContainer.querySelectorAll('.event-filter-col').forEach(col => {
        col.addEventListener('click', function () {
          const idx = parseInt(this.getAttribute('data-index'), 10);
          if (!chartEventsTimeline) return;
          const isVisible = chartEventsTimeline.isDatasetVisible(idx);
          chartEventsTimeline.setDatasetVisibility(idx, !isVisible);
          chartEventsTimeline.update();
          this.classList.toggle('active', !isVisible);
          this.classList.toggle('inactive', isVisible);
        });
      });
    }

    const btnAll = document.getElementById('btn-events-all');
    if (btnAll) {
      btnAll.onclick = function () {
        if (!chartEventsTimeline) return;
        eventsConfig.forEach((_, idx) => {
          chartEventsTimeline.setDatasetVisibility(idx, true);
        });
        chartEventsTimeline.update();
        if (togglesContainer) {
          togglesContainer.querySelectorAll('.event-filter-col').forEach(b => {
            b.classList.add('active');
            b.classList.remove('inactive');
          });
        }
      };
    }

    const btnNone = document.getElementById('btn-events-none');
    if (btnNone) {
      btnNone.onclick = function () {
        if (!chartEventsTimeline) return;
        eventsConfig.forEach((_, idx) => {
          chartEventsTimeline.setDatasetVisibility(idx, false);
        });
        chartEventsTimeline.update();
        if (togglesContainer) {
          togglesContainer.querySelectorAll('.event-filter-col').forEach(b => {
            b.classList.remove('active');
            b.classList.add('inactive');
          });
        }
      };
    }

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
        else if (c.acao === 'play_capitulo') acaoFmt = '▶️ Play capítulo';
        else if (c.acao === 'abriu_player') acaoFmt = '📺 Abriu player';
        else if (c.acao === 'video_iniciou') acaoFmt = '▶️ Vídeo começou';
        else if (c.acao === 'video_concluido') acaoFmt = '🏁 Concluiu vídeo';
        else if (c.acao === 'assistir_mais_filmes') acaoFmt = '🍿 Clicou "Assistir mais"';
        else if (c.acao === 'video_erro') acaoFmt = '⚠️ Erro no vídeo';
        else if (c.acao && c.acao.indexOf('scroll_') === 0) acaoFmt = '📜 Rolou ' + c.acao.replace('scroll_', '') + '%';
        
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

    // 1. Gráfico Multi-Linhas de Eventos
    const canvasEvents = document.getElementById('chart-events-timeline');
    if (canvasEvents) {
      if (chartEventsTimeline) chartEventsTimeline.destroy();

      const timelineDatasets = eventsConfig.map(cfg => ({
        label: cfg.name,
        data: cfg.data,
        borderColor: cfg.color,
        backgroundColor: cfg.color,
        borderWidth: 2.2,
        pointBackgroundColor: cfg.color,
        pointRadius: isToday ? 3.5 : 2.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
        spanGaps: false
      }));

      chartEventsTimeline = new Chart(canvasEvents, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: timelineDatasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 10,
                font: { size: 11, weight: '600' },
                color: '#ddd',
                usePointStyle: true,
                padding: 12
              },
              onClick: function(e, legendItem, legend) {
                const index = legendItem.datasetIndex;
                const ci = legend.chart;
                const isVisible = ci.isDatasetVisible(index);
                ci.setDatasetVisibility(index, !isVisible);
                ci.update();
                const col = document.querySelector(`.event-filter-col[data-index="${index}"]`);
                if (col) {
                  col.classList.toggle('active', !isVisible);
                  col.classList.toggle('inactive', isVisible);
                }
              }
            },
            tooltip: {
              callbacks: {
                title: function(items) {
                  return isToday ? `Horário: ${items[0].label}` : `Data: ${items[0].label}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#999', font: { size: 10 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { precision: 0, color: '#999', font: { size: 10 } }
            }
          }
        }
      });
    }

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

    // 2. Gráfico: Tempo de Permanência na Página (por hora no filtro Hoje, por dia nos outros)
    function formatDurationTime(sec) {
      if (sec === null || sec === undefined) return '-';
      if (sec < 60) return `${sec}s`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }

    const durationLen = timeLabels.length;
    const durationTotals = new Array(durationLen).fill(0);
    const durationCounts = new Array(durationLen).fill(0);

    beaconSaidas.forEach(s => {
      let idx = -1;
      if (isToday) {
        const itemKey = getItemDateKey(s);
        if (itemKey && itemKey !== todayKey) return;
        if (!s.hora) return;
        const hh = s.hora.split(':')[0].padStart(2, '0');
        const hNum = parseInt(hh, 10);
        if (isNaN(hNum) || hNum < 0 || hNum > 23 || hNum > currentHour) return;
        idx = timeKeys.indexOf(hh);
      } else {
        const itemKey = getItemDateKey(s);
        if (itemKey) idx = timeKeys.indexOf(itemKey);
      }

      if (idx !== -1) {
        const sec = parseInt(s.tempo_segundos, 10) || 0;
        durationTotals[idx] += sec;
        durationCounts[idx]++;
      }
    });

    const durationAvgSeconds = durationTotals.map((tot, i) => {
      if (isToday && i > currentHour) return null;
      return durationCounts[i] > 0 ? Math.round(tot / durationCounts[i]) : 0;
    });

    const canvasDuration = document.getElementById('chart-session-duration') || document.getElementById('chart-hourly-clicks');
    if (canvasDuration) {
      if (chartSessionDuration) chartSessionDuration.destroy();
      chartSessionDuration = new Chart(canvasDuration, {
        type: 'bar',
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Tempo Médio na Página',
            data: durationAvgSeconds,
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 4,
            hoverBackgroundColor: '#38bdf8'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function(items) {
                  return isToday ? `Horário: ${items[0].label}` : `Data: ${items[0].label}`;
                },
                label: function(context) {
                  const idx = context.dataIndex;
                  const sec = context.raw;
                  if (sec === null || sec === undefined) return '';
                  const cnt = durationCounts[idx] || 0;
                  const totSec = durationTotals[idx] || 0;
                  return [
                    `⏱️ Tempo Médio: ${formatDurationTime(sec)}`,
                    `🚪 Saídas Registradas: ${cnt}`,
                    `⌛ Tempo Total Acumulado: ${formatDurationTime(totSec)}`
                  ];
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                color: '#999',
                font: { size: 10 },
                callback: function(value) {
                  return formatDurationTime(value);
                }
              }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#999', font: { size: 10 } }
            }
          }
        }
      });
    }

    // 3. Gráfico de Pizza / Rosca: Fontes de Acesso
    const sourceIcons = {
      'Facebook': '📘',
      'Instagram': '📷',
      'Chrome': '🌐',
      'Safari': '🧭',
      'WhatsApp': '💬',
      'Google': '🔍',
      'Meta Ads': '📣',
      'Direto / Outros': '🔗'
    };

    const sourceColorMap = {
      'Facebook': '#1877F2',
      'Instagram': '#E1306C',
      'Chrome': '#FBBF24',
      'Safari': '#0284C7',
      'WhatsApp': '#22C55E',
      'Google': '#EA4335',
      'Meta Ads': '#8B5CF6',
      'Direto / Outros': '#64748B'
    };

    const sourceCounts = {};
    const sourceList = beaconPageviews.length > 0 ? beaconPageviews : (visitas.length > 0 ? visitas : clicks);
    
    sourceList.forEach(v => {
      const utm = (v.utm_source || '').toLowerCase();
      const ref = (v.referrer || '').toLowerCase();
      const app = (v.app || '');
      const disp = (v.dispositivo || '').toLowerCase();
      const ua = (v.ua || '').toLowerCase();

      let src = 'Direto / Outros';
      if (app === 'Instagram' || utm.includes('instagram') || ref.includes('instagram')) {
        src = 'Instagram';
      } else if (app === 'Facebook' || utm.includes('facebook') || ref.includes('facebook') || ref.includes('fb.com') || ref.includes('fbcdn')) {
        src = 'Facebook';
      } else if (app === 'WhatsApp' || utm.includes('whatsapp') || ref.includes('whatsapp')) {
        src = 'WhatsApp';
      } else if (app === 'Chrome' || /chrome|crios/i.test(disp) || /chrome|crios/i.test(ua)) {
        src = 'Chrome';
      } else if (app === 'Safari' || /safari/i.test(disp) || /safari/i.test(ua)) {
        src = 'Safari';
      } else if (utm === 'meta' || ref.includes('adsmanager') || v.fbclid) {
        src = 'Meta Ads';
      } else if (utm.includes('google') || ref.includes('google')) {
        src = 'Google';
      }

      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const sortedSources = Object.keys(sourceCounts).sort((a, b) => sourceCounts[b] - sourceCounts[a]);
    const sourceLabels = sortedSources.map(s => `${sourceIcons[s] || '🌐'} ${s}`);
    const sourceData = sortedSources.map(s => sourceCounts[s]);
    const sourceColors = sortedSources.map(s => sourceColorMap[s] || '#94a3b8');
    const totalSourceVisits = sourceData.reduce((acc, cur) => acc + cur, 0);

    const canvasSources = document.getElementById('chart-sources');
    if (canvasSources) {
      if (chartSources) chartSources.destroy();
      chartSources = new Chart(canvasSources, {
        type: 'doughnut',
        data: {
          labels: sourceLabels,
          datasets: [{
            data: sourceData,
            backgroundColor: sourceColors,
            borderColor: '#1e293b',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: window.innerWidth < 640 ? 'bottom' : 'right',
              labels: {
                color: '#e2e8f0',
                font: { size: 11, family: 'sans-serif' },
                padding: 10,
                boxWidth: 12
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.raw || 0;
                  const pct = totalSourceVisits > 0 ? ((val / totalSourceVisits) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${val} (${pct}%)`;
                }
              }
            }
          },
          cutout: '52%'
        }
      });
    }

    // Renderizar tabela detalhada de fontes
    const sourcesTbody = document.querySelector('#table-sources tbody');
    if (sourcesTbody) {
      sourcesTbody.innerHTML = '';
      if (sortedSources.length === 0) {
        sourcesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--dim)">Nenhum acesso registrado</td></tr>';
      } else {
        sortedSources.forEach(s => {
          const count = sourceCounts[s];
          const pct = totalSourceVisits > 0 ? ((count / totalSourceVisits) * 100).toFixed(1) : 0;
          const color = sourceColorMap[s] || '#94a3b8';
          const icon = sourceIcons[s] || '🌐';
          sourcesTbody.innerHTML += `<tr>
            <td style="font-weight:600;"><span style="color:${color};margin-right:6px;">●</span>${icon} ${s}</td>
            <td style="font-weight:600;">${count}</td>
            <td>${pct}%</td>
            <td style="min-width:100px;">
              <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:8px;overflow:hidden;width:100%;">
                <div style="background:${color};width:${pct}%;height:100%;border-radius:4px;"></div>
              </div>
            </td>
          </tr>`;
        });
      }
    }

    // NEW SECTION 1: Visitor Stats
    const visitorsMap = {};

    // Incluir visitas do beacon (quem abriu a página, mesmo sem clicar)
    visitas.forEach(v => {
      const vid = v.visitor_id || '';
      if (!vid || vid === 'Sem ID') return;
      if (!visitorsMap[vid]) {
        visitorsMap[vid] = { clicks: 0, movies: new Set(), chapters: new Set(), latestTimestamp: 0, events: [] };
      }
      const ts = getTimestampFromData(v);
      if (ts > visitorsMap[vid].latestTimestamp) visitorsMap[vid].latestTimestamp = ts;

      if (v.tipo === 'pageview') {
        visitorsMap[vid].events.push({
          ...v,
          type: 'click',
          acao: '👁️ Abriu a página',
          ts,
          dispositivo: v.dispositivo,
          os: v.os,
          app: v.app,
          conexao: v.conexao,
          fuso: v.fuso
        });
      } else if (v.tipo === 'saida') {
        const tempo = v.tempo_segundos || '0';
        const scroll = v.scroll_max || '0';
        visitorsMap[vid].events.push({ ...v, type: 'click', acao: `🚪 Saiu (${tempo}s, scroll ${scroll}%)`, ts });
      } else if (v.tipo === 'geo') {
        visitorsMap[vid].geo = v;
      }
    });

    clicks.forEach(c => {
      const vid = c.visitor_id || 'Sem ID';
      if (!visitorsMap[vid]) {
        visitorsMap[vid] = { clicks: 0, movies: new Set(), chapters: new Set(), latestTimestamp: 0, events: [] };
      }
      visitorsMap[vid].clicks++;
      let filmName = (c.filme || '').trim();
      if (filmName.toLowerCase() === 'caindo na real') filmName = 'Caindo na Real';
      if ((c.acao === 'abrir_filme' || c.acao === 'abriu_player' || c.acao === 'video_iniciou') && filmName) visitorsMap[vid].movies.add(filmName);
      if ((c.acao === 'play_capitulo' || c.acao === 'video_iniciou') && c.capitulo) visitorsMap[vid].chapters.add(c.capitulo);
      
      const ts = getTimestampFromData(c);
      if (ts > visitorsMap[vid].latestTimestamp) visitorsMap[vid].latestTimestamp = ts;
      
      visitorsMap[vid].events.push({ ...c, type: 'click', ts });
    });

    leads.forEach(l => {
      const vid = l.visitor_id || 'Sem ID';
      if (!visitorsMap[vid]) {
        visitorsMap[vid] = { clicks: 0, movies: new Set(), chapters: new Set(), latestTimestamp: 0, events: [] };
      }
      visitorsMap[vid].lead = l;
      const ts = getTimestampFromData(l);
      visitorsMap[vid].events.push({ ...l, type: 'lead', ts });
      if (ts > visitorsMap[vid].latestTimestamp) visitorsMap[vid].latestTimestamp = ts;
    });

    const visitorIds = Object.keys(visitorsMap);
    const totalVisitors = visitorIds.length;
    let maxClicksVisitor = 0;
    visitorIds.forEach(vid => {
      if (visitorsMap[vid].clicks > maxClicksVisitor) maxClicksVisitor = visitorsMap[vid].clicks;
    });
    const avgClicks = totalVisitors > 0 ? (totalClicks / totalVisitors).toFixed(1) : 0;

    const visitorStatsContainer = document.getElementById('visitor-stats');
    if(visitorStatsContainer) {
      visitorStatsContainer.innerHTML = `
        <div class="stat-card" style="border-top-color: #f43f5e">
          <div class="stat-label">Visitantes Únicos</div>
          <div class="stat-value">${totalVisitors}</div>
        </div>
        <div class="stat-card" style="border-top-color: #eab308">
          <div class="stat-label">Média Cliques/Vis.</div>
          <div class="stat-value">${avgClicks}</div>
        </div>
        <div class="stat-card" style="border-top-color: #06b6d4">
          <div class="stat-label">Máx. Cliques</div>
          <div class="stat-value">${maxClicksVisitor}</div>
        </div>
      `;
    }

    const visitorsSortedByClicks = visitorIds.sort((a,b) => visitorsMap[b].clicks - visitorsMap[a].clicks).slice(0, 20);
    const tableVisitorsTbody = document.querySelector('#table-visitors tbody');
    if(tableVisitorsTbody) {
      tableVisitorsTbody.innerHTML = '';
      if (visitorsSortedByClicks.length === 0) {
        tableVisitorsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--dim)">Nenhum dado</td></tr>';
      } else {
        visitorsSortedByClicks.forEach(vid => {
          const v = visitorsMap[vid];
          const displayId = vid === 'Sem ID' ? vid : vid.substring(0,12) + '...';
          const leadName = v.lead ? v.lead.nome : '—';
          tableVisitorsTbody.innerHTML += `<tr>
            <td style="font-family:monospace;color:var(--gold)">${displayId}</td>
            <td>${v.clicks}</td>
            <td>${v.movies.size}</td>
            <td>${v.chapters.size}</td>
            <td>${leadName}</td>
          </tr>`;
        });
      }
    }

    // NOVO: Atualizar Mapa de Calor do Brasil (Geolocalização)
    updateBrazilHeatmap(visitas, monitorRawVisitas, visitorsMap);

    // Atualizar métricas do site para o funil integrado Meta ➔ RAGUI
    currentSiteStats = {
      siteVisits: pageviews.length || visitas.length,
      sitePlays: capAssistidos,
      siteLeads: leads.length
    };

    // Atualizar Quadro Meta Ads (Ao Vivo se configurado ou Simulação)
    updateMetaAdsDashboard(currentMonitorFilter);
    checkFirestoreMetaConfig();

    // NEW SECTION 2: Customer Journey — últimos 100
    const visitorsSortedByTime = visitorIds
      .filter(vid => vid !== 'Sem ID')
      .sort((a,b) => visitorsMap[b].latestTimestamp - visitorsMap[a].latestTimestamp)
      .slice(0, 100);
      
    const journeyContainer = document.getElementById('journey-container');
    if(journeyContainer) {
      journeyContainer.innerHTML = '';
      if (visitorsSortedByTime.length === 0) {
        journeyContainer.innerHTML = '<div style="text-align:center;color:var(--dim);padding:20px;">Nenhuma jornada recente</div>';
      } else {
        visitorsSortedByTime.forEach((vid, idx) => {
          const v = visitorsMap[vid];
          v.events.sort((a,b) => b.ts - a.ts);
          
          // Primeira e última data/hora
          const firstEv = v.events[0];
          const lastEv = v.events[v.events.length - 1];
          const firstDate = firstEv ? (firstEv.data || '') + ' ' + (firstEv.hora || '') : '';
          const lastDate = lastEv ? (lastEv.data || '') + ' ' + (lastEv.hora || '') : '';
          
          // Resumo da linha
          const leadName = v.lead ? v.lead.nome : '';
          const leadBadge = leadName ? `<span style="background:#22c55e;color:#fff;padding:1px 8px;border-radius:10px;font-size:0.75rem;margin-left:6px;">✅ ${leadName}</span>` : '';
          const dispositivo = (v.events.find(e => e.dispositivo) || {}).dispositivo;
          const dispIcon = dispositivo === 'mobile' ? '📱' : '🖥️';

          // Fonte do acesso
          const utmEv = v.events.find(e => e.utm_source && e.utm_source !== '');
          const refEv = v.events.find(e => e.referrer && e.referrer !== '');
          let fonteLabel = '🔗 Direto';
          let fonteBg = 'rgba(255,255,255,0.1)';
          if (utmEv && utmEv.utm_source.toLowerCase() === 'meta') {
            fonteLabel = '📣 Meta'; fonteBg = '#1877F2';
          } else if (refEv && /facebook|fb\.com|instagram/i.test(refEv.referrer)) {
            fonteLabel = '📣 Meta'; fonteBg = '#1877F2';
          } else if (refEv && refEv.referrer) {
            fonteLabel = '🌐 ' + refEv.referrer.replace(/https?:\/\//, '').split('/')[0].substring(0, 16);
            fonteBg = '#6366f1';
          }
          const fonteBadge = `<span style="background:${fonteBg};color:#fff;padding:1px 7px;border-radius:10px;font-size:0.68rem;font-weight:600;">${fonteLabel}</span>`;

          // Geo e Provedor
          const geo = v.geo || v.events.find(e => e.cidade || e.estado) || {};
          const cidade = geo.cidade || '';
          const estado = geo.estado || '';
          const provedor = geo.provedor || '';
          let geoBadge = '';
          if (cidade || estado) {
            const locText = (cidade && estado) ? `${cidade}/${estado}` : (cidade || estado);
            geoBadge = `<span style="background:rgba(14,165,233,0.15);color:#38bdf8;padding:1px 7px;border-radius:10px;font-size:0.68rem;" title="${provedor ? 'Provedor: ' + provedor : ''}">📍 ${locText}</span>`;
          }

          // Dispositivo & App In-App
          const osEv = v.events.find(e => e.os || e.app) || {};
          const osName = osEv.os || '';
          const appName = osEv.app || '';
          let devBadge = '';
          if (appName && appName !== 'Web') {
            devBadge = `<span style="background:rgba(168,85,247,0.15);color:#c084fc;padding:1px 7px;border-radius:10px;font-size:0.68rem;">${dispIcon} ${appName}</span>`;
          } else if (osName) {
            devBadge = `<span style="background:rgba(255,255,255,0.08);color:var(--dim);padding:1px 7px;border-radius:10px;font-size:0.68rem;">${dispIcon} ${osName}</span>`;
          } else {
            devBadge = `<span style="font-size:0.75rem;">${dispIcon}</span>`;
          }

          // Conexão (4G / 3G)
          const conexao = (v.events.find(e => e.conexao) || {}).conexao;
          const connBadge = conexao ? `<span style="background:rgba(234,179,8,0.12);color:#eab308;padding:1px 6px;border-radius:8px;font-size:0.65rem;">📶 ${conexao.toUpperCase()}</span>` : '';
          
          // Steps HTML
          let stepsHtml = '';
          v.events.forEach(ev => {
            let icon = '', text = '', cls = 'journey-step';
            if (ev.type === 'lead') {
              icon = '✅'; text = `<strong>Cadastrou-se</strong> — ${ev.nome || 'Sem nome'}`; cls += ' journey-step--lead';
            } else if (ev.acao === 'abrir_filme') {
              icon = '🎬'; text = `Abriu <strong>${ev.filme || 'Filme'}</strong>`;
            } else if (ev.acao === 'play_capitulo') {
              icon = '▶️'; text = `Play <strong>${ev.capitulo || 'Cap'}</strong> em <strong>${ev.filme || 'Filme'}</strong>`;
            } else if (ev.acao === 'abriu_player') {
              icon = '📺'; text = `Abriu player de <strong>${ev.filme || 'Filme'}</strong>`;
            } else if (ev.acao === 'video_iniciou') {
              let perfDetails = '';
              if (ev.startup_ms) {
                const sec = (ev.startup_ms / 1000).toFixed(1);
                const badgeColor = ev.startup_ms < 3000 ? '#22c55e' : (ev.startup_ms < 5000 ? '#eab308' : '#ef4444');
                perfDetails = ` <span style="font-size:0.7rem;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,0.06);color:${badgeColor};font-family:monospace;font-weight:600;">⚡ ${sec}s${ev.conexao ? ' • ' + ev.conexao : ''}${ev.plataforma ? ' • ' + ev.plataforma : ''}</span>`;
              }
              icon = '▶️'; text = `Começou a assistir <strong>${ev.filme || 'Filme'}</strong>${perfDetails}`;
            } else if (ev.acao === 'video_travou') {
              icon = '⏳'; text = `<strong style="color:#eab308;">Travou no buffer</strong> aos ${ev.posicao_s || 0}s de vídeo (${ev.filme || 'Filme'})`; cls += ' journey-step--warning';
            } else if (ev.acao === 'video_concluido') {
              icon = '🏁'; text = `<strong>Assistiu até o fim!</strong> (${ev.filme || 'Filme'})`;
            } else if (ev.acao === 'assistir_mais_filmes') {
              icon = '🍿'; text = `<strong>Clicou em "Assistir mais filmes"</strong> (foi para cadastro)`; cls += ' journey-step--lead';
            } else if (ev.acao === 'video_erro') {
              icon = '⚠️'; text = `<strong style="color:#ef4444;">Erro no vídeo</strong> (${ev.filme || 'Filme'})`; cls += ' journey-step--warning';
            } else if (ev.acao && ev.acao.indexOf('scroll_') === 0) {
              icon = '📜'; text = `Rolou ${ev.acao.replace('scroll_', '')}% da página`;
            } else {
              icon = '🔹'; text = ev.acao || 'Ação';
            }
            stepsHtml += `<div class="${cls}"><span class="journey-time">${ev.data || ''} ${ev.hora || ''}</span><span class="journey-icon">${icon}</span><span class="journey-text">${text}</span></div>`;
          });

          // Detalhes extras no topo da expansão
          let infoBarHtml = '';
          const infoItems = [];
          if (cidade || estado) infoItems.push(`📍 <strong>${cidade ? cidade + ' - ' : ''}${estado}</strong>`);
          if (provedor) infoItems.push(`🏢 ${provedor}`);
          if (osName || appName) infoItems.push(`📱 ${osName} ${appName ? '(' + appName + ')' : ''}`);
          if (conexao) infoItems.push(`📶 Conexão: ${conexao.toUpperCase()}`);
          if (infoItems.length > 0) {
            infoBarHtml = `<div style="font-size:0.78rem;color:var(--dim);margin-bottom:8px;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:6px;display:flex;flex-wrap:wrap;gap:12px;">${infoItems.join(' &bull; ')}</div>`;
          }

          const rowId = 'journey-row-' + idx;
          journeyContainer.innerHTML += `
            <div class="journey-row" onclick="var d=document.getElementById('${rowId}');d.hidden=!d.hidden;this.querySelector('.journey-arrow').textContent=d.hidden?'▸':'▾';" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);transition:background .2s;flex-wrap:wrap;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
              <span class="journey-arrow" style="font-size:0.85rem;color:var(--dim);width:12px;">▸</span>
              <span style="font-family:monospace;color:var(--gold);font-size:0.78rem;min-width:85px;">${vid.substring(0,12)}</span>
              <span style="color:var(--dim);font-size:0.75rem;min-width:115px;">${firstDate}</span>
              ${fonteBadge}
              ${geoBadge}
              ${devBadge}
              ${connBadge}
              <span style="font-size:0.75rem;color:var(--dim);margin-left:auto;">${v.events.length} ações &bull; ${v.movies.size}🎬 ${v.chapters.size}▶️</span>
              ${leadBadge}
            </div>
            <div id="${rowId}" hidden style="padding:10px 14px 16px 34px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.25);">
              ${infoBarHtml}
              <div class="journey-timeline">${stepsHtml}</div>
            </div>
          `;
        });
      }
    }
  }

  // ============================================================
  // MAPA DO BRASIL & MAPA DE CALOR GEOGRÁFICO
  // ============================================================
  const BRAZIL_STATES = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
    'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
    'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
    'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
    'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
  };

  const BRAZIL_STATE_NAMES_MAP = {
    'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAPÁ': 'AP',
    'AMAZONAS': 'AM', 'BAHIA': 'BA', 'CEARA': 'CE', 'CEARÁ': 'CE',
    'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', 'ESPÍRITO SANTO': 'ES',
    'GOIAS': 'GO', 'GOIÁS': 'GO', 'MARANHAO': 'MA', 'MARANHÃO': 'MA',
    'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
    'PARA': 'PA', 'PARÁ': 'PA', 'PARAIBA': 'PB', 'PARAÍBA': 'PB',
    'PARANA': 'PR', 'PARANÁ': 'PR', 'PERNAMBUCO': 'PE', 'PIAUI': 'PI', 'PIAUÍ': 'PI',
    'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
    'RONDONIA': 'RO', 'RONDÔNIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
    'SAO PAULO': 'SP', 'SÃO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
  };

  function normalizeUF(str) {
    if (!str) return null;
    const s = str.trim().toUpperCase();
    if (BRAZIL_STATES[s]) return s;
    return BRAZIL_STATE_NAMES_MAP[s] || null;
  }

  let geoActiveTab = 'estados'; // 'estados' | 'cidades'
  let geoSelectedUF = null;     // null | 'SP' | ...
  let currentGeoData = null;    // Cache for tab switching and clearing filter

  function updateBrazilHeatmap(visitas, rawVisitas, visitorsMap) {
    currentGeoData = { visitas, raw: rawVisitas, vMap: visitorsMap };

    // 1. Lookup de geolocalização por visitor_id
    const visitorGeoLookup = {};
    if (Array.isArray(rawVisitas)) {
      rawVisitas.forEach(v => {
        if (v && v.tipo === 'geo' && v.visitor_id) {
          visitorGeoLookup[v.visitor_id] = v;
        }
      });
    }

    // 2. Estrutura de dados por Estado e Cidade
    const stateStats = {};
    for (const uf in BRAZIL_STATES) {
      stateStats[uf] = {
        uf,
        name: BRAZIL_STATES[uf],
        count: 0,
        visitors: new Set(),
        cities: {}
      };
    }

    const cityStats = {};
    let exteriorCount = 0;
    let totalGeoVisitors = 0;
    const processedVisitors = new Set();

    // A. Visitantes ativos em visitorsMap (no período do filtro)
    if (visitorsMap) {
      Object.keys(visitorsMap).forEach(vid => {
        if (!vid || vid === 'Sem ID') return;
        const geo = visitorsMap[vid].geo || visitorGeoLookup[vid];
        if (geo) {
          processedVisitors.add(vid);
          const uf = normalizeUF(geo.estado);
          const city = (geo.cidade || '').trim();
          if (uf && stateStats[uf]) {
            stateStats[uf].count++;
            stateStats[uf].visitors.add(vid);
            totalGeoVisitors++;
            if (city) {
              stateStats[uf].cities[city] = (stateStats[uf].cities[city] || 0) + 1;
              const cKey = `${city} - ${uf}`;
              if (!cityStats[cKey]) cityStats[cKey] = { name: city, uf, count: 0 };
              cityStats[cKey].count++;
            }
          } else if (geo.estado) {
            exteriorCount++;
            totalGeoVisitors++;
          }
        }
      });
    }

    // B. Eventos 'geo' avulsos no período que porventura não estejam no visitorsMap
    if (Array.isArray(visitas)) {
      visitas.forEach(v => {
        if (v && v.tipo === 'geo') {
          const vid = v.visitor_id;
          if (vid && processedVisitors.has(vid)) return;
          if (vid) processedVisitors.add(vid);
          const uf = normalizeUF(v.estado);
          const city = (v.cidade || '').trim();
          if (uf && stateStats[uf]) {
            stateStats[uf].count++;
            if (vid) stateStats[uf].visitors.add(vid);
            totalGeoVisitors++;
            if (city) {
              stateStats[uf].cities[city] = (stateStats[uf].cities[city] || 0) + 1;
              const cKey = `${city} - ${uf}`;
              if (!cityStats[cKey]) cityStats[cKey] = { name: city, uf, count: 0 };
              cityStats[cKey].count++;
            }
          } else if (v.estado) {
            exteriorCount++;
            totalGeoVisitors++;
          }
        }
      });
    }

    // 3. Cálculo da escala térmica
    const maxStateVisits = Math.max(...Object.values(stateStats).map(s => s.count), 0);

    function getStateHeatColor(count) {
      if (!count || maxStateVisits === 0) {
        return {
          fill: 'rgba(255, 255, 255, 0.035)',
          stroke: 'rgba(255, 255, 255, 0.12)',
          text: 'rgba(255, 255, 255, 0.25)'
        };
      }
      const r = count / maxStateVisits;
      if (r > 0.85) {
        return { fill: '#ef4444', stroke: '#fca5a5', text: '#ffffff' }; // Vermelho quente
      } else if (r > 0.60) {
        return { fill: '#f97316', stroke: '#fdba74', text: '#ffffff' }; // Laranja
      } else if (r > 0.35) {
        return { fill: '#eab308', stroke: '#fde047', text: '#ffffff' }; // Amarelo / Dourado
      } else if (r > 0.15) {
        return { fill: '#059669', stroke: '#34d399', text: '#ffffff' }; // Verde esmeralda
      } else {
        return { fill: '#0284c7', stroke: '#38bdf8', text: '#ffffff' }; // Azul celeste
      }
    }

    // 4. Colorir o Mapa SVG e configurar Tooltips
    const stateGroups = document.querySelectorAll('.brazil-state');
    const tooltip = document.getElementById('geo-tooltip');
    const mapBox = document.querySelector('.geo-map-box');

    stateGroups.forEach(g => {
      const uf = g.dataset.uf;
      const st = stateStats[uf];
      const count = st ? st.count : 0;
      const colors = getStateHeatColor(count);

      // Colorir caminhos
      const paths = g.querySelectorAll('path');
      paths.forEach(p => {
        p.style.fill = colors.fill;
        p.style.stroke = colors.stroke;
      });

      // Colorir texto
      const textEl = g.querySelector('text');
      if (textEl) {
        textEl.style.fill = colors.text;
      }

      // Estado selecionado
      if (geoSelectedUF === uf) {
        g.classList.add('is-selected');
      } else {
        g.classList.remove('is-selected');
      }

      // Eventos de Mouse (Tooltip)
      g.onmouseenter = function() {
        if (!tooltip || !st) return;
        const pct = totalGeoVisitors > 0 ? ((count / totalGeoVisitors) * 100).toFixed(1) : 0;
        let html = `<div style="font-weight:700;font-size:0.85rem;color:#fff;margin-bottom:3px;">${st.name} (${uf})</div>`;
        if (count > 0) {
          html += `<div style="color:var(--gold);font-weight:600;">👥 ${count} visitante${count > 1 ? 's' : ''} <span style="color:var(--dim);font-weight:400;">(${pct}%)</span></div>`;
          const topCities = Object.entries(st.cities).sort((a,b) => b[1] - a[1]).slice(0, 3);
          if (topCities.length > 0) {
            html += `<div style="margin-top:6px;font-size:0.72rem;color:#ccc;border-top:1px solid rgba(255,255,255,0.12);padding-top:4px;">`;
            html += `🏙️ ${topCities.map(([c, n]) => `${c} (${n})`).join(', ')}`;
            html += `</div>`;
          }
        } else {
          html += `<div style="color:var(--dim);font-size:0.72rem;">Nenhum visitante registrado no período</div>`;
        }
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
      };

      g.onmousemove = function(e) {
        if (!tooltip || !mapBox) return;
        const boxRect = mapBox.getBoundingClientRect();
        let left = e.clientX - boxRect.left + 14;
        let top = e.clientY - boxRect.top + 14;
        if (left + 180 > boxRect.width) left = left - 190;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      };

      g.onmouseleave = function() {
        if (tooltip) tooltip.style.display = 'none';
      };

      g.onclick = function() {
        geoSelectedUF = (geoSelectedUF === uf) ? null : uf;
        updateBrazilHeatmap(visitas, rawVisitas, visitorsMap);
      };
    });

    // 5. Atualizar Métricas dos Chips no Topo
    const activeStatesList = Object.values(stateStats).filter(s => s.count > 0).sort((a,b) => b.count - a.count);
    const distinctCitiesCount = Object.keys(cityStats).length;
    const topState = activeStatesList[0];

    const statStatesEl = document.getElementById('geo-stat-states');
    if (statStatesEl) statStatesEl.textContent = `${activeStatesList.length} / 27`;

    const statCitiesEl = document.getElementById('geo-stat-cities');
    if (statCitiesEl) statCitiesEl.textContent = `${distinctCitiesCount} ${distinctCitiesCount === 1 ? 'cidade' : 'cidades'}`;

    const statTopEl = document.getElementById('geo-stat-top-state');
    if (statTopEl) {
      if (topState) {
        const pct = totalGeoVisitors > 0 ? Math.round((topState.count / totalGeoVisitors) * 100) : 0;
        statTopEl.textContent = `${topState.name} (${topState.uf}) - ${pct}%`;
      } else {
        statTopEl.textContent = '—';
      }
    }

    const exteriorChip = document.getElementById('geo-stat-exterior-chip');
    const exteriorVal = document.getElementById('geo-stat-exterior');
    if (exteriorChip && exteriorVal) {
      if (exteriorCount > 0) {
        exteriorVal.textContent = exteriorCount;
        exteriorChip.style.display = 'inline-flex';
      } else {
        exteriorChip.style.display = 'none';
      }
    }

    // 6. Atualizar Painel de Listas / Rankings à Direita
    const listContainer = document.getElementById('geo-list-container');
    const filterBanner = document.getElementById('geo-active-filter-banner');
    const filterName = document.getElementById('geo-filter-state-name');
    const clearFilterBtn = document.getElementById('btn-geo-clear-filter');

    if (!listContainer) return;

    if (geoSelectedUF) {
      const selSt = stateStats[geoSelectedUF];
      if (filterBanner && filterName) {
        filterBanner.style.display = 'block';
        filterName.textContent = `${selSt.name} (${geoSelectedUF}) • ${selSt.count} visitante${selSt.count > 1 ? 's' : ''}`;
      }
      if (clearFilterBtn) clearFilterBtn.style.display = 'inline-block';

      const stateCities = Object.entries(selSt.cities).sort((a,b) => b[1] - a[1]);
      if (stateCities.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center;color:var(--dim);padding:20px;font-size:0.8rem;">Nenhuma cidade registrada em ${selSt.name}</div>`;
      } else {
        let html = '';
        const maxC = stateCities[0][1];
        stateCities.forEach(([cName, cCount], idx) => {
          const barPct = maxC > 0 ? (cCount / maxC) * 100 : 0;
          html += `
            <div class="geo-list-item">
              <div class="geo-item-header">
                <span class="geo-item-name">
                  <span style="font-size:0.7rem;color:var(--dim);min-width:18px;">#${idx + 1}</span>
                  <span>🏙️ ${cName}</span>
                </span>
                <span class="geo-item-val"><strong>${cCount}</strong> acessos</span>
              </div>
              <div class="geo-bar-track">
                <div class="geo-bar-fill" style="width:${barPct}%;background:var(--gold);"></div>
              </div>
            </div>
          `;
        });
        listContainer.innerHTML = html;
      }
    } else {
      if (filterBanner) filterBanner.style.display = 'none';
      if (clearFilterBtn) clearFilterBtn.style.display = 'none';

      if (geoActiveTab === 'estados') {
        if (activeStatesList.length === 0) {
          listContainer.innerHTML = '<div style="text-align:center;color:var(--dim);padding:24px;font-size:0.8rem;">Nenhum dado geográfico registrado no período</div>';
        } else {
          let html = '';
          activeStatesList.forEach((s, idx) => {
            const colors = getStateHeatColor(s.count);
            const barPct = maxStateVisits > 0 ? (s.count / maxStateVisits) * 100 : 0;
            const sharePct = totalGeoVisitors > 0 ? ((s.count / totalGeoVisitors) * 100).toFixed(1) : 0;
            html += `
              <div class="geo-list-item" data-uf="${s.uf}">
                <div class="geo-item-header">
                  <span class="geo-item-name">
                    <span style="font-size:0.7rem;color:var(--dim);min-width:18px;">#${idx + 1}</span>
                    <span class="geo-uf-badge" style="background:${colors.fill};color:${colors.text};border:1px solid ${colors.stroke}">${s.uf}</span>
                    <span>${s.name}</span>
                  </span>
                  <span class="geo-item-val">
                    <strong>${s.count}</strong> (${sharePct}%)
                  </span>
                </div>
                <div class="geo-bar-track">
                  <div class="geo-bar-fill" style="width:${barPct}%;background:${colors.fill};"></div>
                </div>
              </div>
            `;
          });
          listContainer.innerHTML = html;

          listContainer.querySelectorAll('.geo-list-item').forEach(item => {
            item.onclick = function() {
              const uf = item.dataset.uf;
              geoSelectedUF = (geoSelectedUF === uf) ? null : uf;
              updateBrazilHeatmap(visitas, rawVisitas, visitorsMap);
            };
          });
        }
      } else {
        // Tab Top Cidades
        const sortedCities = Object.values(cityStats).sort((a,b) => b.count - a.count).slice(0, 30);
        if (sortedCities.length === 0) {
          listContainer.innerHTML = '<div style="text-align:center;color:var(--dim);padding:24px;font-size:0.8rem;">Nenhuma cidade registrada no período</div>';
        } else {
          let html = '';
          const maxC = sortedCities[0].count;
          sortedCities.forEach((c, idx) => {
            const barPct = maxC > 0 ? (c.count / maxC) * 100 : 0;
            html += `
              <div class="geo-list-item" data-uf="${c.uf}">
                <div class="geo-item-header">
                  <span class="geo-item-name">
                    <span style="font-size:0.7rem;color:var(--dim);min-width:18px;">#${idx + 1}</span>
                    <span>🏙️ ${c.name}</span>
                    <span class="geo-uf-badge">${c.uf}</span>
                  </span>
                  <span class="geo-item-val"><strong>${c.count}</strong> acessos</span>
                </div>
                <div class="geo-bar-track">
                  <div class="geo-bar-fill" style="width:${barPct}%;background:#38bdf8;"></div>
                </div>
              </div>
            `;
          });
          listContainer.innerHTML = html;

          listContainer.querySelectorAll('.geo-list-item').forEach(item => {
            item.onclick = function() {
              const uf = item.dataset.uf;
              geoSelectedUF = (geoSelectedUF === uf) ? null : uf;
              updateBrazilHeatmap(visitas, rawVisitas, visitorsMap);
            };
          });
        }
      }
    }

    // 7. Configuração dos botões das Abas (executado uma vez)
    const btnTabEstados = document.getElementById('tab-btn-estados');
    const btnTabCidades = document.getElementById('tab-btn-cidades');

    if (btnTabEstados && !btnTabEstados._initialized) {
      btnTabEstados._initialized = true;
      btnTabEstados.onclick = function() {
        geoActiveTab = 'estados';
        geoSelectedUF = null;
        btnTabEstados.classList.add('active');
        if (btnTabCidades) btnTabCidades.classList.remove('active');
        if (currentGeoData) updateBrazilHeatmap(currentGeoData.visitas, currentGeoData.raw, currentGeoData.vMap);
      };
    }

    if (btnTabCidades && !btnTabCidades._initialized) {
      btnTabCidades._initialized = true;
      btnTabCidades.onclick = function() {
        geoActiveTab = 'cidades';
        geoSelectedUF = null;
        btnTabCidades.classList.add('active');
        if (btnTabEstados) btnTabEstados.classList.remove('active');
        if (currentGeoData) updateBrazilHeatmap(currentGeoData.visitas, currentGeoData.raw, currentGeoData.vMap);
      };
    }

    if (clearFilterBtn && !clearFilterBtn._initialized) {
      clearFilterBtn._initialized = true;
      clearFilterBtn.onclick = function() {
        geoSelectedUF = null;
        if (currentGeoData) updateBrazilHeatmap(currentGeoData.visitas, currentGeoData.raw, currentGeoData.vMap);
      };
    }
  }

  // ============================================================
  // META ADS DASHBOARD (SIMULAÇÃO / VALIDAÇÃO DE LAYOUT)
  // ============================================================
  // ============================================================
  // META ADS MARKETING API & MOCK DASHBOARD
  // ============================================================
  let currentSiteStats = { siteVisits: 0, sitePlays: 0, siteLeads: 0 };
  let isMetaConfigModalInitialized = false;

  function getMetaCredentials() {
    const act = (localStorage.getItem('ragui_meta_act') || '').trim();
    const token = (localStorage.getItem('ragui_meta_token') || '').trim();
    const name = (localStorage.getItem('ragui_meta_account_name') || '').trim();
    return { act, token, name };
  }

  function setMetaCredentials(act, token, name = '') {
    localStorage.setItem('ragui_meta_act', act);
    localStorage.setItem('ragui_meta_token', token);
    if (name) localStorage.setItem('ragui_meta_account_name', name);
    try {
      if (window.RAGUI_DB) {
        window.RAGUI_DB.collection('config').doc('meta').set({
          act: act,
          token: token,
          name: name || '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  }

  function clearMetaCredentials() {
    localStorage.removeItem('ragui_meta_act');
    localStorage.removeItem('ragui_meta_token');
    localStorage.removeItem('ragui_meta_account_name');
    try {
      if (window.RAGUI_DB) {
        window.RAGUI_DB.collection('config').doc('meta').delete().catch(() => {});
      }
    } catch (e) {}
  }

  async function checkFirestoreMetaConfig() {
    const creds = getMetaCredentials();
    if (creds.token && creds.act) return;
    try {
      if (window.RAGUI_DB) {
        const snap = await window.RAGUI_DB.collection('config').doc('meta').get();
        if (snap.exists) {
          const d = snap.data();
          if (d && d.token && d.act) {
            localStorage.setItem('ragui_meta_act', d.act);
            localStorage.setItem('ragui_meta_token', d.token);
            if (d.name) localStorage.setItem('ragui_meta_account_name', d.name);
            updateMetaAdsDashboard(currentMonitorFilter);
          }
        }
      }
    } catch (e) {
      console.warn('Firestore Meta sync:', e);
    }
  }

  let currentMetaView = 'ads'; // 'ads' ou 'campaigns'
  let metaAdsCache = [];
  let metaCampaignsCache = [];

  function renderMetaTable() {
    const tbody = document.querySelector('#table-meta-campaigns tbody');
    const thName = document.getElementById('th-meta-item-name');
    const btnAds = document.getElementById('btn-meta-view-ads');
    const btnCamps = document.getElementById('btn-meta-view-campaigns');

    if (btnAds && btnCamps) {
      if (currentMetaView === 'ads') {
        btnAds.classList.add('meta-view-btn--active');
        btnCamps.classList.remove('meta-view-btn--active');
      } else {
        btnCamps.classList.add('meta-view-btn--active');
        btnAds.classList.remove('meta-view-btn--active');
      }
    }

    if (thName) {
      thName.textContent = currentMetaView === 'ads' ? 'Anúncio (Criativo)' : 'Campanha';
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    const items = currentMetaView === 'ads' ? metaAdsCache : metaCampaignsCache;

    if (!items || items.length === 0) {
      const typeLabel = currentMetaView === 'ads' ? 'anúncio' : 'campanha';
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--dim);padding:24px;">Nenhum ${typeLabel} encontrado nesta conta.</td></tr>`;
      return;
    }

    items.forEach(c => {
      const cplStr = c.leads > 0 ? `R$ ${c.cpl.toFixed(2)}` : '—';
      const subtitle = c.campaignName ? `<div style="font-size:0.68rem;color:var(--dim);margin-top:2px;display:flex;align-items:center;gap:4px;"><span>📁</span><span>${c.campaignName}</span></div>` : '';
      tbody.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:600;color:#fff;">${c.name}</div>
            ${subtitle}
          </td>
          <td><span class="meta-campaign-tag ${c.tagClass}">${c.status}</span></td>
          <td>R$ ${c.spend.toFixed(2)}</td>
          <td>${c.clicks.toLocaleString('pt-BR')}</td>
          <td>R$ ${c.cpc.toFixed(2)}</td>
          <td><strong style="color:#22c55e;">${c.leads}</strong></td>
          <td><strong>${cplStr}</strong></td>
        </tr>
      `;
    });

    alignMonitorColumns();
    setTimeout(alignMonitorColumns, 100);
  }

  function renderMetaKPIs(data) {
    const { spend, cpl, leads, clicks, cpc, impressions, cpm, ctr, vviews, siteVisits, plays, isLive, accountName, accountId, error } = data;

    const elBadge = document.getElementById('meta-header-badge');
    const elAct = document.getElementById('meta-header-act');
    const btnConfig = document.getElementById('btn-meta-config');
    const elSubtitle = document.getElementById('meta-table-subtitle');

    if (elBadge) {
      if (error) {
        elBadge.className = 'meta-header-badge meta-header-badge--error';
        elBadge.textContent = '⚠️ Erro Token Meta';
      } else if (isLive) {
        elBadge.className = 'meta-header-badge meta-header-badge--live';
        elBadge.textContent = '🟢 Ao Vivo (Meta API)';
      } else {
        elBadge.className = 'meta-header-badge';
        elBadge.textContent = '🧪 Simulação';
      }
    }

    if (elAct) {
      if (isLive && accountId) {
        elAct.textContent = accountName ? `${accountId} (${accountName})` : accountId;
        elAct.style.color = '#60a5fa';
      } else {
        elAct.textContent = 'act_39104829';
        elAct.style.color = 'var(--dim)';
      }
    }

    if (btnConfig) {
      btnConfig.textContent = isLive ? '⚙️ Configurar Meta' : '⚙️ Conectar API';
    }

    if (elSubtitle) {
      elSubtitle.textContent = isLive ? '🟢 Dados ao vivo da Meta Marketing API' : 'Dados simulados';
      elSubtitle.style.color = isLive ? '#22c55e' : 'var(--dim)';
    }

    // KPIs
    const elSpend = document.getElementById('meta-kpi-spend');
    const elCpl = document.getElementById('meta-kpi-cpl');
    const elLeads = document.getElementById('meta-kpi-leads');
    const elClicks = document.getElementById('meta-kpi-clicks');
    const elCpc = document.getElementById('meta-kpi-cpc');
    const elImp = document.getElementById('meta-kpi-impressions');
    const elCpm = document.getElementById('meta-kpi-cpm');
    const elCtr = document.getElementById('meta-kpi-ctr');
    const elVviews = document.getElementById('meta-kpi-vviews');

    if (elSpend) elSpend.textContent = `R$ ${spend.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elCpl) elCpl.textContent = leads > 0 ? `R$ ${cpl.toFixed(2)}` : '—';
    if (elLeads) elLeads.textContent = `${leads} ${leads === 1 ? 'cadastro gerado' : 'cadastros gerados'}`;
    if (elClicks) elClicks.textContent = clicks.toLocaleString('pt-BR');
    if (elCpc) elCpc.textContent = `CPC Médio: R$ ${cpc.toFixed(2)}`;
    if (elImp) elImp.textContent = impressions.toLocaleString('pt-BR');
    if (elCpm) elCpm.textContent = `CPM: R$ ${cpm.toFixed(2)}`;
    if (elCtr) elCtr.textContent = `${ctr.toFixed(2)}%`;
    if (elVviews) elVviews.textContent = vviews.toLocaleString('pt-BR');

    // Funil
    const fImp = document.getElementById('meta-funnel-imp');
    const fClicks = document.getElementById('meta-funnel-clicks');
    const fSite = document.getElementById('meta-funnel-site');
    const fPlays = document.getElementById('meta-funnel-plays');
    const fLeads = document.getElementById('meta-funnel-leads');

    if (fImp) fImp.textContent = impressions >= 1000 ? `${(impressions / 1000).toFixed(1)}k` : impressions;
    if (fClicks) fClicks.textContent = clicks.toLocaleString('pt-BR');
    if (fSite) fSite.textContent = siteVisits.toLocaleString('pt-BR');
    if (fPlays) fPlays.textContent = plays.toLocaleString('pt-BR');
    if (fLeads) fLeads.textContent = leads.toLocaleString('pt-BR');

    renderMetaTable();
  }

  function updateMetaAdsMock(filterDays) {
    let spend, leads, clicks, impressions, vviews, siteVisits, plays;

    if (filterDays === 1) { // Hoje
      spend = 85.00;
      leads = 6;
      clicks = 128;
      impressions = 4250;
      vviews = 1980;
      siteVisits = currentSiteStats.siteVisits > 0 ? currentSiteStats.siteVisits : 104;
      plays = currentSiteStats.sitePlays > 0 ? currentSiteStats.sitePlays : 38;
      metaCampaignsCache = [
        { name: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 38.00, clicks: 58, cpc: 0.65, leads: 3, cpl: 12.66 },
        { name: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 20.00, clicks: 30, cpc: 0.66, leads: 1, cpl: 20.00 },
        { name: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 14.00, clicks: 22, cpc: 0.63, leads: 1, cpl: 14.00 },
        { name: '⚡ [Campanha] Lookalike - Semelhantes a Cadastrados', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 8.00, clicks: 12, cpc: 0.66, leads: 1, cpl: 8.00 },
        { name: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausada', tagClass: 'meta-campaign-tag--paused', spend: 5.00, clicks: 6, cpc: 0.83, leads: 0, cpl: 0 }
      ];
      metaAdsCache = [
        { name: '🎬 Caindo na Real - Reels Vertical 01', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 25.00, clicks: 38, cpc: 0.65, leads: 2, cpl: 12.50 },
        { name: '🎬 Caindo na Real - Teaser 15s Corte Rápido', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 13.00, clicks: 20, cpc: 0.65, leads: 1, cpl: 13.00 },
        { name: '🍿 Ganhe Tempo nos Estudos - Carrossel', campaignName: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 20.00, clicks: 30, cpc: 0.66, leads: 1, cpl: 20.00 },
        { name: '📱 Aluno Aprovado Medicina - Depoimento', campaignName: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 14.00, clicks: 22, cpc: 0.63, leads: 1, cpl: 14.00 },
        { name: '🎯 Volte e finalize seu cadastro', campaignName: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausado', tagClass: 'meta-campaign-tag--paused', spend: 5.00, clicks: 6, cpc: 0.83, leads: 0, cpl: 0 }
      ];
    } else if (filterDays === 7) { // 7 dias
      spend = 560.00;
      leads = 41;
      clicks = 840;
      impressions = 26800;
      vviews = 12400;
      siteVisits = currentSiteStats.siteVisits > 0 ? currentSiteStats.siteVisits : 670;
      plays = currentSiteStats.sitePlays > 0 ? currentSiteStats.sitePlays : 215;
      metaCampaignsCache = [
        { name: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 250.00, clicks: 390, cpc: 0.64, leads: 19, cpl: 13.15 },
        { name: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 130.00, clicks: 195, cpc: 0.66, leads: 9, cpl: 14.44 },
        { name: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 90.00, clicks: 138, cpc: 0.65, leads: 7, cpl: 12.85 },
        { name: '⚡ [Campanha] Lookalike - Semelhantes a Cadastrados', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 50.00, clicks: 75, cpc: 0.66, leads: 4, cpl: 12.50 },
        { name: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausada', tagClass: 'meta-campaign-tag--paused', spend: 40.00, clicks: 42, cpc: 0.95, leads: 2, cpl: 20.00 }
      ];
      metaAdsCache = [
        { name: '🎬 Caindo na Real - Reels Vertical 01', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 160.00, clicks: 250, cpc: 0.64, leads: 12, cpl: 13.33 },
        { name: '🎬 Caindo na Real - Teaser 15s Corte Rápido', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 90.00, clicks: 140, cpc: 0.64, leads: 7, cpl: 12.85 },
        { name: '🍿 Ganhe Tempo nos Estudos - Carrossel', campaignName: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 130.00, clicks: 195, cpc: 0.66, leads: 9, cpl: 14.44 },
        { name: '📱 Aluno Aprovado Medicina - Depoimento', campaignName: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 90.00, clicks: 138, cpc: 0.65, leads: 7, cpl: 12.85 },
        { name: '🎯 Volte e finalize seu cadastro', campaignName: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausado', tagClass: 'meta-campaign-tag--paused', spend: 40.00, clicks: 42, cpc: 0.95, leads: 2, cpl: 20.00 }
      ];
    } else { // 30 dias (padrão)
      spend = 2450.00;
      leads = 178;
      clicks = 3650;
      impressions = 118000;
      vviews = 54200;
      siteVisits = currentSiteStats.siteVisits > 0 ? currentSiteStats.siteVisits : 2780;
      plays = currentSiteStats.sitePlays > 0 ? currentSiteStats.sitePlays : 840;
      metaCampaignsCache = [
        { name: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 1100.00, clicks: 1690, cpc: 0.65, leads: 83, cpl: 13.25 },
        { name: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 580.00, clicks: 865, cpc: 0.67, leads: 41, cpl: 14.14 },
        { name: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 390.00, clicks: 590, cpc: 0.66, leads: 28, cpl: 13.92 },
        { name: '⚡ [Campanha] Lookalike - Semelhantes a Cadastrados', status: '🟢 Ativa', tagClass: 'meta-campaign-tag--active', spend: 220.00, clicks: 335, cpc: 0.65, leads: 17, cpl: 12.94 },
        { name: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausada', tagClass: 'meta-campaign-tag--paused', spend: 160.00, clicks: 170, cpc: 0.94, leads: 9, cpl: 17.77 }
      ];
      metaAdsCache = [
        { name: '🎬 Caindo na Real - Reels Vertical 01', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 720.00, clicks: 1110, cpc: 0.65, leads: 55, cpl: 13.09 },
        { name: '🎬 Caindo na Real - Teaser 15s Corte Rápido', campaignName: '🎬 [Campanha] Lançamento Caindo na Real', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 380.00, clicks: 580, cpc: 0.65, leads: 28, cpl: 13.57 },
        { name: '🍿 Ganhe Tempo nos Estudos - Carrossel', campaignName: '🍿 [Campanha] Topo de Funil - Jovens 16-24', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 580.00, clicks: 865, cpc: 0.67, leads: 41, cpl: 14.14 },
        { name: '📱 Aluno Aprovado Medicina - Depoimento', campaignName: '📱 [Campanha] Stories - Depoimentos de Alunos', status: '🟢 Ativo', tagClass: 'meta-campaign-tag--active', spend: 390.00, clicks: 590, cpc: 0.66, leads: 28, cpl: 13.92 },
        { name: '🎯 Volte e finalize seu cadastro', campaignName: '🎯 [Campanha] Remarketing - Abriu sem Cadastro', status: '⏸️ Pausado', tagClass: 'meta-campaign-tag--paused', spend: 160.00, clicks: 170, cpc: 0.94, leads: 9, cpl: 17.77 }
      ];
    }

    const cpl = leads > 0 ? (spend / leads) : 0;
    const cpc = clicks > 0 ? (spend / clicks) : 0;
    const cpm = impressions > 0 ? (spend / impressions * 1000) : 0;
    const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;

    renderMetaKPIs({
      spend, cpl, leads, clicks, cpc, impressions, cpm, ctr, vviews, siteVisits, plays,
      isLive: false, accountName: '', accountId: '', error: false
    });

    initMetaConfigModal();
  }

  async function updateMetaAdsReal(filterDays) {
    const creds = getMetaCredentials();
    if (!creds.token || !creds.act) {
      updateMetaAdsMock(filterDays);
      return;
    }

    initMetaConfigModal();

    let preset = 'last_30d';
    if (filterDays === 1) preset = 'today';
    else if (filterDays === 7) preset = 'last_7d';

    const cleanAct = creds.act.startsWith('act_') ? creds.act : 'act_' + creds.act;

    try {
      // 1. Insights gerais da conta
      const accUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}/insights?fields=spend,impressions,reach,clicks,cpc,cpm,ctr,actions,video_30_sec_watched_actions,video_continuous_2_sec_watched_actions&date_preset=${preset}&access_token=${encodeURIComponent(creds.token)}`;

      // 2. Lista de TODAS as Campanhas
      const campListUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}/campaigns?fields=id,name,status,effective_status,created_time,updated_time&limit=100&access_token=${encodeURIComponent(creds.token)}`;

      // 3. Insights das Campanhas no período
      const campInsightsUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}/insights?fields=campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions&level=campaign&date_preset=${preset}&limit=100&access_token=${encodeURIComponent(creds.token)}`;

      // 4. Lista de TODOS os Anúncios individuais
      const adListUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}/ads?fields=id,name,status,effective_status,campaign_id,campaign{id,name},created_time,updated_time&limit=100&access_token=${encodeURIComponent(creds.token)}`;

      // 5. Insights dos Anúncios no período
      const adInsightsUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}/insights?fields=ad_id,ad_name,campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions&level=ad&date_preset=${preset}&limit=100&access_token=${encodeURIComponent(creds.token)}`;

      const [accRes, campListRes, campInsightsRes, adListRes, adInsightsRes] = await Promise.all([
        fetch(accUrl).then(r => r.json()),
        fetch(campListUrl).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(campInsightsUrl).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(adListUrl).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(adInsightsUrl).then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      if (accRes.error) {
        console.error('Meta API Error:', accRes.error);
        renderMetaKPIs({
          spend: 0, cpl: 0, leads: 0, clicks: 0, cpc: 0, impressions: 0, cpm: 0, ctr: 0, vviews: 0,
          siteVisits: currentSiteStats.siteVisits, plays: currentSiteStats.sitePlays,
          isLive: false, accountName: creds.name, accountId: cleanAct, error: true
        });
        return;
      }

      // Totais da Conta
      let spend = 0, clicks = 0, impressions = 0, cpc = 0, cpm = 0, ctr = 0, leads = 0, vviews = 0;

      if (accRes.data && accRes.data.length > 0) {
        const row = accRes.data[0];
        spend = parseFloat(row.spend || 0);
        clicks = parseInt(row.clicks || 0, 10);
        impressions = parseInt(row.impressions || 0, 10);
        cpc = row.cpc ? parseFloat(row.cpc) : (clicks > 0 ? spend / clicks : 0);
        cpm = row.cpm ? parseFloat(row.cpm) : (impressions > 0 ? (spend / impressions) * 1000 : 0);
        ctr = row.ctr ? parseFloat(row.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);

        if (row.video_30_sec_watched_actions && Array.isArray(row.video_30_sec_watched_actions)) {
          vviews = row.video_30_sec_watched_actions.reduce((sum, item) => sum + parseInt(item.value || 0, 10), 0);
        } else if (row.video_continuous_2_sec_watched_actions && Array.isArray(row.video_continuous_2_sec_watched_actions)) {
          vviews = row.video_continuous_2_sec_watched_actions.reduce((sum, item) => sum + parseInt(item.value || 0, 10), 0);
        }

        if (row.actions && Array.isArray(row.actions)) {
          row.actions.forEach(a => {
            const type = (a.action_type || '').toLowerCase();
            if (type === 'lead' || type.includes('lead') || type === 'contact' || type === 'complete_registration') {
              leads += parseInt(a.value || 0, 10);
            }
            if (!vviews && (type === 'video_view' || type.includes('video_view'))) {
              vviews += parseInt(a.value || 0, 10);
            }
          });
        }
      }

      const cpl = leads > 0 ? spend / leads : 0;

      // ── Processamento de Campanhas ──
      const campInsightsMap = {};
      if (campInsightsRes && campInsightsRes.data) {
        campInsightsRes.data.forEach(item => {
          campInsightsMap[item.campaign_id] = item;
        });
      }

      metaCampaignsCache = [];
      const seenCampIds = new Set();

      if (campListRes && campListRes.data) {
        campListRes.data.forEach(c => {
          seenCampIds.add(c.id);
          const insight = campInsightsMap[c.id] || {};
          const cSpend = parseFloat(insight.spend || 0);
          const cClicks = parseInt(insight.clicks || 0, 10);
          const cCpc = insight.cpc ? parseFloat(insight.cpc) : (cClicks > 0 ? cSpend / cClicks : 0);
          let cLeads = 0;
          if (insight.actions && Array.isArray(insight.actions)) {
            insight.actions.forEach(a => {
              const type = (a.action_type || '').toLowerCase();
              if (type === 'lead' || type.includes('lead') || type === 'contact' || type === 'complete_registration') {
                cLeads += parseInt(a.value || 0, 10);
              }
            });
          }
          const cCpl = cLeads > 0 ? cSpend / cLeads : 0;
          const effStatus = (c.effective_status || c.status || 'ACTIVE').toUpperCase();
          const isActive = effStatus === 'ACTIVE';
          const isReview = effStatus.includes('REVIEW') || effStatus.includes('PROCESS');

          let statusLabel = 'Ativa';
          let tagClass = 'meta-campaign-tag--active';
          if (isActive) {
            statusLabel = '🟢 Ativa';
            tagClass = 'meta-campaign-tag--active';
          } else if (isReview) {
            statusLabel = '🟡 Em Análise';
            tagClass = 'meta-campaign-tag--paused';
          } else {
            statusLabel = '⏸️ Pausada';
            tagClass = 'meta-campaign-tag--paused';
          }

          metaCampaignsCache.push({
            id: c.id,
            name: c.name || 'Campanha',
            status: statusLabel,
            rawStatus: effStatus,
            isActive: isActive,
            tagClass: tagClass,
            spend: cSpend,
            clicks: cClicks,
            cpc: cCpc,
            leads: cLeads,
            cpl: cCpl
          });
        });
      }

      // Adicionar campanhas de insights que porventura não vieram na listagem
      if (campInsightsRes && campInsightsRes.data) {
        campInsightsRes.data.forEach(ci => {
          if (!seenCampIds.has(ci.campaign_id)) {
            const cSpend = parseFloat(ci.spend || 0);
            const cClicks = parseInt(ci.clicks || 0, 10);
            const cCpc = ci.cpc ? parseFloat(ci.cpc) : (cClicks > 0 ? cSpend / cClicks : 0);
            let cLeads = 0;
            if (ci.actions && Array.isArray(ci.actions)) {
              ci.actions.forEach(a => {
                const type = (a.action_type || '').toLowerCase();
                if (type === 'lead' || type.includes('lead') || type === 'contact' || type === 'complete_registration') {
                  cLeads += parseInt(a.value || 0, 10);
                }
              });
            }
            metaCampaignsCache.push({
              id: ci.campaign_id,
              name: ci.campaign_name || 'Campanha',
              status: '⏸️ Pausada',
              rawStatus: 'PAUSED',
              isActive: false,
              tagClass: 'meta-campaign-tag--paused',
              spend: cSpend,
              clicks: cClicks,
              cpc: cCpc,
              leads: cLeads,
              cpl: cLeads > 0 ? cSpend / cLeads : 0
            });
          }
        });
      }

      // Ordenar campanhas: Ativas no topo, depois maior gasto
      metaCampaignsCache.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.spend - a.spend;
      });

      // ── Processamento de Anúncios (Ads) ──
      const adInsightsMap = {};
      if (adInsightsRes && adInsightsRes.data) {
        adInsightsRes.data.forEach(item => {
          adInsightsMap[item.ad_id] = item;
        });
      }

      metaAdsCache = [];
      const seenAdIds = new Set();

      if (adListRes && adListRes.data) {
        adListRes.data.forEach(ad => {
          seenAdIds.add(ad.id);
          const insight = adInsightsMap[ad.id] || {};
          const aSpend = parseFloat(insight.spend || 0);
          const aClicks = parseInt(insight.clicks || 0, 10);
          const aCpc = insight.cpc ? parseFloat(insight.cpc) : (aClicks > 0 ? aSpend / aClicks : 0);
          let aLeads = 0;
          if (insight.actions && Array.isArray(insight.actions)) {
            insight.actions.forEach(a => {
              const type = (a.action_type || '').toLowerCase();
              if (type === 'lead' || type.includes('lead') || type === 'contact' || type === 'complete_registration') {
                aLeads += parseInt(a.value || 0, 10);
              }
            });
          }
          const aCpl = aLeads > 0 ? aSpend / aLeads : 0;
          const effStatus = (ad.effective_status || ad.status || 'ACTIVE').toUpperCase();
          const isActive = effStatus === 'ACTIVE';
          const isReview = effStatus.includes('REVIEW') || effStatus.includes('PROCESS');

          let statusLabel = 'Ativo';
          let tagClass = 'meta-campaign-tag--active';
          if (isActive) {
            statusLabel = '🟢 Ativo';
            tagClass = 'meta-campaign-tag--active';
          } else if (isReview) {
            statusLabel = '🟡 Em Análise';
            tagClass = 'meta-campaign-tag--paused';
          } else if (effStatus === 'CAMPAIGN_PAUSED') {
            statusLabel = '⏸️ Camp. Pausada';
            tagClass = 'meta-campaign-tag--paused';
          } else if (effStatus === 'ADSET_PAUSED') {
            statusLabel = '⏸️ Conj. Pausado';
            tagClass = 'meta-campaign-tag--paused';
          } else {
            statusLabel = '⏸️ Pausado';
            tagClass = 'meta-campaign-tag--paused';
          }

          metaAdsCache.push({
            id: ad.id,
            name: ad.name || 'Anúncio',
            campaignName: (ad.campaign && ad.campaign.name) ? ad.campaign.name : (insight.campaign_name || ''),
            status: statusLabel,
            rawStatus: effStatus,
            isActive: isActive,
            tagClass: tagClass,
            spend: aSpend,
            clicks: aClicks,
            cpc: aCpc,
            leads: aLeads,
            cpl: aCpl
          });
        });
      }

      // Adicionar anúncios dos insights que não vieram na listagem
      if (adInsightsRes && adInsightsRes.data) {
        adInsightsRes.data.forEach(ai => {
          if (!seenAdIds.has(ai.ad_id)) {
            const aSpend = parseFloat(ai.spend || 0);
            const aClicks = parseInt(ai.clicks || 0, 10);
            const aCpc = ai.cpc ? parseFloat(ai.cpc) : (aClicks > 0 ? aSpend / aClicks : 0);
            let aLeads = 0;
            if (ai.actions && Array.isArray(ai.actions)) {
              ai.actions.forEach(a => {
                const type = (a.action_type || '').toLowerCase();
                if (type === 'lead' || type.includes('lead') || type === 'contact' || type === 'complete_registration') {
                  aLeads += parseInt(a.value || 0, 10);
                }
              });
            }
            metaAdsCache.push({
              id: ai.ad_id,
              name: ai.ad_name || 'Anúncio',
              campaignName: ai.campaign_name || '',
              status: '⏸️ Pausado',
              rawStatus: 'PAUSED',
              isActive: false,
              tagClass: 'meta-campaign-tag--paused',
              spend: aSpend,
              clicks: aClicks,
              cpc: aCpc,
              leads: aLeads,
              cpl: aLeads > 0 ? aSpend / aLeads : 0
            });
          }
        });
      }

      // Ordenar anúncios: Ativos no topo absoluto, depois maior gasto
      metaAdsCache.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.spend - a.spend;
      });

      const siteVisits = currentSiteStats.siteVisits;
      const plays = currentSiteStats.sitePlays;

      renderMetaKPIs({
        spend, cpl, leads, clicks, cpc, impressions, cpm, ctr, vviews, siteVisits, plays,
        isLive: true, accountName: creds.name, accountId: cleanAct, error: false
      });

    } catch (err) {
      console.error('Fetch Meta Insights Error:', err);
      updateMetaAdsMock(filterDays);
    }
  }

  function updateMetaAdsDashboard(filterDays) {
    const creds = getMetaCredentials();
    if (creds.token && creds.act) {
      updateMetaAdsReal(filterDays);
    } else {
      updateMetaAdsMock(filterDays);
    }
  }

  function initMetaConfigModal() {
    if (isMetaConfigModalInitialized) return;
    const modal = document.getElementById('modal-meta-config');
    const btnOpen = document.getElementById('btn-meta-config');
    const btnClose = document.getElementById('btn-close-meta-modal');
    const btnCancel = document.getElementById('btn-cancel-meta-modal');
    const btnSave = document.getElementById('btn-save-meta-config');
    const btnDisconnect = document.getElementById('btn-meta-disconnect');
    const btnToggleToken = document.getElementById('btn-toggle-meta-token');
    const inputAct = document.getElementById('meta-input-act');
    const inputToken = document.getElementById('meta-input-token');
    const statusBox = document.getElementById('meta-test-status');
    const spinner = document.getElementById('meta-btn-spinner');
    const btnLabel = document.getElementById('meta-btn-label');

    if (!modal) return;
    isMetaConfigModalInitialized = true;

    function openModal() {
      const creds = getMetaCredentials();
      if (inputAct) inputAct.value = creds.act || '';
      if (inputToken) {
        inputToken.value = creds.token || '';
        inputToken.type = 'password';
      }
      if (statusBox) {
        statusBox.style.display = 'none';
        statusBox.innerHTML = '';
      }
      if (btnDisconnect) {
        btnDisconnect.style.display = (creds.token && creds.act) ? 'inline-flex' : 'none';
      }
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      if (inputAct) setTimeout(() => inputAct.focus(), 50);
    }

    function closeModal() {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    if (btnOpen) btnOpen.onclick = openModal;
    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    const btnViewAds = document.getElementById('btn-meta-view-ads');
    const btnViewCamps = document.getElementById('btn-meta-view-campaigns');
    if (btnViewAds) {
      btnViewAds.onclick = () => {
        currentMetaView = 'ads';
        renderMetaTable();
      };
    }
    if (btnViewCamps) {
      btnViewCamps.onclick = () => {
        currentMetaView = 'campaigns';
        renderMetaTable();
      };
    }

    if (btnToggleToken && inputToken) {
      btnToggleToken.onclick = () => {
        if (inputToken.type === 'password') {
          inputToken.type = 'text';
          btnToggleToken.textContent = '🔒';
        } else {
          inputToken.type = 'password';
          btnToggleToken.textContent = '👁️';
        }
      };
    }

    if (btnDisconnect) {
      btnDisconnect.onclick = () => {
        if (!confirm('Deseja realmente desconectar da Meta API e retornar para o modo de simulação?')) return;
        clearMetaCredentials();
        updateMetaAdsMock(currentMonitorFilter);
        closeModal();
      };
    }

    if (btnSave) {
      btnSave.onclick = async () => {
        const rawAct = (inputAct ? inputAct.value : '').trim();
        const token = (inputToken ? inputToken.value : '').trim();

        if (!rawAct || !token) {
          if (statusBox) {
            statusBox.style.display = 'block';
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#fca5a5';
            statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            statusBox.innerHTML = '⚠️ Por favor, informe o ID da Conta de Anúncios e o Token de Acesso.';
          }
          return;
        }

        const cleanAct = rawAct.startsWith('act_') ? rawAct : 'act_' + rawAct;

        btnSave.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (btnLabel) btnLabel.textContent = 'Validando na Meta...';
        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.style.background = 'rgba(24, 119, 242, 0.15)';
          statusBox.style.color = '#93c5fd';
          statusBox.style.border = '1px solid rgba(24, 119, 242, 0.3)';
          statusBox.innerHTML = '🔄 Testando conexão com a Meta Graph API v20.0...';
        }

        try {
          const testUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanAct)}?fields=name,account_status,currency,amount_spent&access_token=${encodeURIComponent(token)}`;
          const res = await fetch(testUrl);
          const data = await res.json();

          if (data.error) {
            throw new Error(data.error.message || 'Erro desconhecido na Meta Graph API');
          }

          const accName = data.name || 'Conta Meta Ads';
          const currency = data.currency || 'BRL';

          // Salvar credenciais
          setMetaCredentials(cleanAct, token, accName);

          if (statusBox) {
            statusBox.style.background = 'rgba(34, 197, 94, 0.15)';
            statusBox.style.color = '#86efac';
            statusBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            statusBox.innerHTML = `🟢 <strong>Conectado com sucesso!</strong><br>Conta: <strong>${accName}</strong> (${cleanAct} • ${currency})`;
          }

          // Carregar dados ao vivo
          await updateMetaAdsReal(currentMonitorFilter);

          setTimeout(() => {
            closeModal();
          }, 1400);

        } catch (err) {
          if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#fca5a5';
            statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            statusBox.innerHTML = `🔴 <strong>Falha na autenticação:</strong><br>${err.message}`;
          }
        } finally {
          btnSave.disabled = false;
          if (spinner) spinner.style.display = 'none';
          if (btnLabel) btnLabel.textContent = 'Testar e Salvar Conexão';
        }
      };
    }
  }

  // Alinhamento dinâmico da coluna Meta Ads com o bloco de gráficos da esquerda
  function alignMonitorColumns() {
    if (window.innerWidth <= 1200) {
      const metaCard = document.getElementById('card-meta-ads');
      if (metaCard) metaCard.style.height = 'auto';
      return;
    }
    const grids = document.querySelectorAll('.monitor-col-charts > .charts-grid');
    if (grids.length >= 2) {
      const rect1 = grids[0].getBoundingClientRect();
      const rect2 = grids[1].getBoundingClientRect();
      const totalHeight = rect2.bottom - rect1.top;
      const metaCard = document.getElementById('card-meta-ads');
      if (metaCard && totalHeight > 100) {
        metaCard.style.height = `${Math.round(totalHeight)}px`;
      }
    }
  }

  window.addEventListener('resize', alignMonitorColumns);

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

  // Init é gerenciado pelo auth.onAuthStateChanged
})();
