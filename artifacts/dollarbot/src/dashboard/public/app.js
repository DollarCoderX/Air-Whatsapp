(() => {
  const activityEl = document.getElementById('activity');
  const providersEl = document.getElementById('providersList');
  const stateEl = document.getElementById('state');
  const numberEl = document.getElementById('number');
  const uptimeEl = document.getElementById('uptime');
  const statusEl = document.getElementById('status');
  const openBtn = document.getElementById('openBtn');
  const filterInput = document.getElementById('filterInput');
  const allBtn = document.getElementById('allBtn');
  const activityBtn = document.getElementById('activityBtn');
  const providerBtn = document.getElementById('providerBtn');
  const copyLatest = document.getElementById('copyLatest');
  const clearBtn = document.getElementById('clearBtn');

  function addActivity(text) {
    const li = document.createElement('li');
    li.className = 'activity-item';
    const ts = new Date();
    li.innerHTML = `<span class="meta">${ts.toLocaleTimeString()}</span><div class="txt">${escapeHtml(text)}</div><div class="meta-actions"><button class="btn small copy">Copy</button></div>`;
    activityEl.prepend(li);
    trim(activityEl, 500);
    attachCopyHandlers(li);
  }

  function addProvider(text) {
    const li = document.createElement('li');
    const cls = /error|failed|fail/i.test(text) ? 'error' : (/warn/i.test(text) ? 'warn' : '');
    li.className = cls;
    const ts = new Date();
    li.innerHTML = `<span class="meta">${ts.toLocaleTimeString()}</span><div class="txt">${escapeHtml(text)}</div><div class="meta-actions"><button class="btn small copy">Copy</button></div>`;
    providersEl.prepend(li);
    trim(providersEl, 800);
    attachCopyHandlers(li);
  }

  function trim(el, max) { while (el.childElementCount > max) el.removeChild(el.lastChild); }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function attachCopyHandlers(li){ li.querySelectorAll('.copy').forEach(b=> b.onclick = ()=>{ const txt = li.querySelector('.txt').textContent; navigator.clipboard?.writeText(txt).then(()=>{ b.textContent='Copied'; setTimeout(()=>b.textContent='Copy',900); }).catch(()=>{}); }); }

  // SSE connect
  const sse = new EventSource('/dashboard/sse');
  sse.onopen = () => { statusEl.textContent = 'Connected'; statusEl.className = 'pill'; };
  sse.onerror = () => { statusEl.textContent = 'Disconnected'; statusEl.className = 'pill'; };

  sse.addEventListener('status', (e) => {
    try {
      const d = JSON.parse(e.data);
      stateEl.textContent = d.state || '—';
      numberEl.textContent = d.number ? '+' + d.number : '—';
      uptimeEl.textContent = formatUptime(d.uptimeMs || d.uptime || 0);
    } catch (err) {}
  });

  sse.addEventListener('activity', (e) => {
    try { const d = JSON.parse(e.data); addActivity(`[ACT] ${d.text}`); } catch {}
  });

  sse.addEventListener('provider', (e) => {
    try { const d = JSON.parse(e.data); addProvider(`[PROV] ${d.text}`); } catch {}
  });

  // initial status poll
  fetch('/status.json').then(r=>r.json()).then(j=>{
    stateEl.textContent = j.state || '—'; numberEl.textContent = j.number || '—'; uptimeEl.textContent = j.uptimeMs ? formatUptime(j.uptimeMs) : '—';
    (j.activity||[]).forEach(a=> addActivity(a.text));
  }).catch(()=>{});

  // UI controls
  allBtn.onclick = ()=> setFilter('all');
  activityBtn.onclick = ()=> setFilter('activity');
  providerBtn.onclick = ()=> setFilter('provider');
  clearBtn.onclick = ()=> { activityEl.innerHTML=''; providersEl.innerHTML=''; };
  copyLatest.onclick = ()=> { const node = activityEl.firstElementChild || providersEl.firstElementChild; if (node){ const t = node.querySelector('.txt')?.textContent || node.textContent; navigator.clipboard?.writeText(t).catch(()=>{}); } };
  openBtn.onclick = ()=> window.open(window.location.href, '_blank');

  filterInput.oninput = ()=> applyTextFilter(filterInput.value.trim());

  let currentFilter = 'all';
  function setFilter(f){ currentFilter = f; allBtn.classList.toggle('active', f==='all'); activityBtn.classList.toggle('active', f==='activity'); providerBtn.classList.toggle('active', f==='provider'); applyFilter(); }
  function applyFilter(){ applyTextFilter(filterInput.value.trim()); }
  function applyTextFilter(q){ const show = (node)=>{ if (!q) return true; return node.textContent.toLowerCase().includes(q.toLowerCase()); };
    Array.from(activityEl.children).forEach(n=> n.style.display = (currentFilter==='all' || currentFilter==='activity') && show(n) ? '' : 'none');
    Array.from(providersEl.children).forEach(n=> n.style.display = (currentFilter==='all' || currentFilter==='provider') && show(n) ? '' : 'none');
  }

  function formatUptime(v){ if (!v) return '—'; let ms = Number(v); if (ms < 1000000) { if (ms > 1000 && ms < 1000000) return Math.floor(ms/1000)+'s'; } if (ms < 60000) return Math.floor(ms/1000)+'s'; const s = Math.floor(ms/1000); return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`; }
})();
