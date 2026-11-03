/* TechNext proposal template: interactions. Markup is the finished state; this script only animates and recalculates. */
(() => {
  'use strict';
  window.__tnp = 1;
  const root = document.documentElement;
  const RM = root.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const money = (n, d = 2) => Number(n).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: d });
  const ease = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));

  function tween(from, to, dur, draw) {
    if (RM || !dur || from === to) { draw(to); return; }
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      draw(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- pricing model ---------------- */
  const VAT = 0.12;
  const PLANS = {
    essential: { name: 'Essential', price: 18000, sla: { p1r: '4 business hours', p1f: 'Within 1 business day', p2r: '1 business day', p2f: 'Within 3 business days', p3r: '2 business days', p3f: 'Within 10 business days', p4r: '3 business days', cover: '' } },
    priority: { name: 'Priority', price: 32000, sla: { p1r: '2 business hours', p1f: 'Within 8 business hours', p2r: '4 business hours', p2f: 'Within 2 business days', p3r: '1 business day', p3f: 'Within 5 business days', p4r: '2 business days', cover: '' } },
    dedicated: { name: 'Dedicated', price: 58000, sla: { p1r: '1 business hour', p1f: 'Within 4 business hours', p2r: '2 business hours', p2f: 'Within 1 business day', p3r: '4 business hours', p3f: 'Within 3 business days', p4r: '1 business day', cover: ', plus Saturday 9:00 am to 1:00 pm in the last week of each month' } }
  };
  const state = { plan: 'priority', opts: {} };
  const prev = {};

  function baseUntaxed() {
    return $$('[data-line]').reduce((s, tr) => {
      const q = +tr.dataset.qty, u = +tr.dataset.unit, d = +(tr.dataset.disc || 0);
      return s + q * u * (1 - d / 100);
    }, 0);
  }

  function optLines() {
    return $$('[data-opt]').filter(o => state.opts[o.dataset.opt]).map(o => {
      const qty = state.opts[o.dataset.opt];
      return { key: o.dataset.opt, name: o.dataset.name, desc: o.dataset.desc, qty, unit: +o.dataset.unit, amt: qty * +o.dataset.unit };
    });
  }

  function setOut(key, text) { $$('[data-out="' + key + '"]').forEach(el => { el.textContent = text; }); }

  function setMoney(key, value, render, bump) {
    const from = prev[key] == null ? value : prev[key];
    prev[key] = value;
    const els = $$('[data-out="' + key + '"]');
    tween(from, value, 650, v => els.forEach(el => { el.textContent = render(v); }));
    if (bump && from !== value && !RM) els.forEach(el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
  }

  function recalc() {
    const opts = optLines();
    const untaxed = baseUntaxed() + opts.reduce((s, o) => s + o.amt, 0);
    const vat = Math.round(untaxed * VAT * 100) / 100;
    const grand = untaxed + vat;
    const plan = PLANS[state.plan];

    const box = $('[data-opts]'); if (box) box.classList.toggle('has-on', opts.length > 0);
    const body = $('[data-opt-lines]');
    if (body) {
      const keep = new Set(Array.from(body.querySelectorAll('tr[data-k]')).map(r => r.dataset.k));
      body.innerHTML = opts.length ? '<tr class="qs"><td colspan="5">Optional items added</td></tr>' + opts.map(o =>
        '<tr data-k="' + o.key + '"' + (keep.has(o.key) ? '' : ' class="opt-on"') + '><td>' + o.name + '<small>' + o.desc + '</small></td><td class="r">' + o.qty + '</td><td class="r">' + money(o.unit) + '</td><td class="r"></td><td class="r amt">' + money(o.amt) + '</td></tr>').join('') : '';
    }

    setMoney('grand', grand, v => 'PHP ' + money(v, 0), true);
    setMoney('grand-plain', grand, v => money(v));
    setMoney('grand-2', grand, v => 'PHP ' + money(v));
    setMoney('untaxed', untaxed, v => money(v));
    setMoney('untaxed-php', untaxed, v => 'PHP ' + money(v));
    setMoney('vat', vat, v => 'PHP ' + money(v));
    const g = Math.round(grand), p1 = Math.round(g * 0.5), p2 = Math.round(g * 0.3), p3 = g - p1 - p2;
    setMoney('pay1', p1, v => 'PHP ' + money(v, 0));
    setMoney('pay2', p2, v => 'PHP ' + money(v, 0));
    setMoney('pay3', p3, v => 'PHP ' + money(v, 0));
    setOut('recur-line', 'PHP ' + money(plan.price) + ' + VAT');
    setOut('recurring', '+ PHP ' + money(plan.price, 0) + ' / month + VAT, support from Feb 2027');
    setOut('plan-name', plan.name);
    setOut('plan-price', 'PHP ' + money(plan.price, 0));
    updateMailSigned();
  }

  /* support plan */
  $$('[data-plans] input').forEach(inp => inp.addEventListener('change', () => {
    if (!inp.checked) return;
    state.plan = inp.value;
    const sla = PLANS[state.plan].sla;
    $$('[data-sla]').forEach(el => {
      const k = el.dataset.sla;
      if (k === 'cover') { el.textContent = sla.cover; return; }
      if (el.textContent === sla[k]) return;
      if (RM) { el.textContent = sla[k]; return; }
      el.classList.add('flip');
      setTimeout(() => { el.textContent = sla[k]; el.classList.remove('flip'); }, 180);
    });
    recalc();
  }));

  /* optional items */
  $$('[data-opt]').forEach(o => {
    const btn = $('.opt-btn', o), qty = $('.qty', o), out = qty && $('output', qty), label = $('span', btn);
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on);
      label.textContent = on ? 'Added' : 'Add';
      o.classList.toggle('is-on', on);
      if (qty) { qty.hidden = !on; if (on && out) out.value = out.textContent = '1'; }
      if (on) state.opts[o.dataset.opt] = 1; else delete state.opts[o.dataset.opt];
      recalc();
    });
    if (qty) $$('button', qty).forEach(b => b.addEventListener('click', () => {
      const n = Math.max(1, Math.min(5, (state.opts[o.dataset.opt] || 1) + +b.dataset.q));
      state.opts[o.dataset.opt] = n;
      out.textContent = n;
      recalc();
    }));
  });

  /* ---------------- signature ---------------- */
  const dlgSign = $('#dlg-sign');
  const pad = $('[data-pad]'), canvas = pad && $('canvas', pad), typed = $('[data-typed]'), hint = $('[data-hint]');
  let ctx, ink = false, drawing = false, mode = 'draw', last = null;

  function sizeCanvas() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect(), dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1F1F3D';
    ink = false; hint.hidden = false;
  }
  function pt(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  if (canvas) {
    canvas.addEventListener('pointerdown', e => { if (mode !== 'draw') return; if (!ctx || !canvas.width || canvas.width === 300) sizeCanvas(); drawing = true; last = pt(e); canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#1F1F3D'; ctx.fill(); });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = pt(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
      ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; ink = true; hint.hidden = true; $('[data-err]', dlgSign).textContent = '';
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, () => { drawing = false; }));
  }
  $('[data-clear]') && $('[data-clear]').addEventListener('click', () => { sizeCanvas(); });

  function setMode(m) {
    mode = m;
    $$('.tabs [data-mode]', dlgSign).forEach(b => { const on = b.dataset.mode === m; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    const isType = m === 'type';
    typed.hidden = !isType; canvas.style.visibility = isType ? 'hidden' : 'visible';
    hint.textContent = isType ? 'Typed from your full name' : 'Sign above the line';
    hint.hidden = !isType && ink;
    $('[data-clear]').hidden = isType;
    typed.textContent = $('#sg-name').value.trim();
  }
  $$('.tabs [data-mode]', dlgSign).forEach(b => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
    b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = b.dataset.mode === 'draw' ? 'type' : 'draw'; setMode(n); $('[data-mode="' + n + '"]', dlgSign).focus(); } });
  });
  $('#sg-name') && $('#sg-name').addEventListener('input', e => { typed.textContent = e.target.value.trim(); $('#sg-name').parentElement.classList.remove('bad'); });

  function openSign() {
    if (!dlgSign) return;
    dlgSign.showModal();
    sizeCanvas(); setMode(mode);
  }
  $$('[data-open-sign]').forEach(b => b.addEventListener('click', openSign));
  $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog.dlg').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  async function signatureImage(name) {
    if (mode === 'draw') return canvas.toDataURL('image/png');
    try { await document.fonts.load('700 56px Caveat'); } catch (e) { /* fall back to the next face */ }
    const c = document.createElement('canvas'); c.width = 900; c.height = 220;
    const x = c.getContext('2d'); x.fillStyle = '#1F1F3D'; x.font = '700 96px Caveat, "Segoe Print", cursive'; x.textBaseline = 'middle';
    x.fillText(name, 24, 116, 852);
    return c.toDataURL('image/png');
  }

  let signed = null;
  $('[data-sign-form]') && $('[data-sign-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#sg-name').value.trim(), title = $('#sg-title').value.trim(), err = $('[data-err]', dlgSign);
    if (name.length < 2) { $('#sg-name').parentElement.classList.add('bad'); err.textContent = 'Enter your full name to sign.'; $('#sg-name').focus(); return; }
    if (mode === 'draw' && !ink) { err.textContent = 'Draw your signature above the line, or switch to Type.'; return; }
    const img = await signatureImage(name);
    const when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    signed = { name, title, when };
    $$('[data-sig-img]').forEach(i => { i.src = img; });
    $$('[data-sig-who]').forEach(w => { w.innerHTML = '<b></b><span></span>'; w.firstChild.textContent = name; w.lastChild.textContent = (title ? title + ', ' : '') + 'Sample Trading Corp. · signed ' + when; });
    root.classList.add('is-signed');
    $$('[data-status-pill]').forEach(p => { p.textContent = 'Signed'; p.className = 'pill pill--ok'; });
    $$('.o-status span').forEach(s => { const i = +s.dataset.st; s.className = i < 2 ? 'done' : 'on'; });
    updateMailSigned();
    dlgSign.close();
    const target = $('#sign');
    target && target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  });

  function updateMailSigned() {
    const a = $('[data-mail-signed]'); if (!a) return;
    const total = $('[data-out="grand"]') ? $('[data-out="grand"]').textContent : '';
    const body = 'Hello TechNext,\n\nWe accept proposal S00147 (BIR CAS on Odoo) for ' + total + ' including VAT, with the ' + PLANS[state.plan].name + ' support plan.' +
      (signed ? '\n\nSigned by ' + signed.name + (signed.title ? ', ' + signed.title : '') + ' on ' + signed.when + '.' : '') + '\n\nThe signed PDF is attached.\n';
    a.href = 'mailto:sales@technext.asia?cc=jeric@technext.asia&subject=' + encodeURIComponent('Signed proposal S00147 - Sample Trading Corp.') + '&body=' + encodeURIComponent(body);
  }

  /* request changes */
  const dlgCh = $('#dlg-changes');
  $$('[data-open-changes]').forEach(b => b.addEventListener('click', () => dlgCh && dlgCh.showModal()));
  $('[data-changes-form]') && $('[data-changes-form]').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#ch-msg').value.trim(), err = $('[data-err]', dlgCh);
    if (!msg) { err.textContent = 'Write what you would like us to change.'; $('#ch-msg').focus(); return; }
    err.textContent = '';
    location.href = 'mailto:jeric@technext.asia?cc=sales@technext.asia&subject=' + encodeURIComponent('Changes to proposal S00147 - Sample Trading Corp.') + '&body=' + encodeURIComponent(msg + '\n');
    dlgCh.close();
  });

  /* ---------------- print ---------------- */
  let reclosed = [];
  function preparePrint() {
    $$('.rv, .gantt, [data-hero-pack] .ic').forEach(el => el.classList.add('in'));
    reclosed = $$('details:not([open])'); reclosed.forEach(d => { d.open = true; });
  }
  addEventListener('beforeprint', preparePrint);
  addEventListener('afterprint', () => { reclosed.forEach(d => { d.open = false; }); reclosed = []; });
  $$('[data-print]').forEach(b => b.addEventListener('click', () => { preparePrint(); setTimeout(() => window.print(), 60); }));

  /* ---------------- expiry ---------------- */
  (function expiry() {
    const el = $('[data-expiry]'); if (!el) return;
    const exp = new Date('2026-12-03T23:59:59+08:00');
    const days = Math.ceil((exp - Date.now()) / 864e5);
    const span = $('span', el);
    if (days < 0) { el.classList.add('is-expired'); span.innerHTML = 'Expired on <b>3 Dec 2026</b>. Ask us to renew it.'; }
    else span.innerHTML = 'Valid until <b>3 Dec 2026</b> · ' + (days === 0 ? 'last day' : days + (days === 1 ? ' day' : ' days') + ' left');
  })();

  /* ---------------- compare slider ---------------- */
  const cmp = $('[data-cmp]');
  if (cmp) {
    const range = $('.cmp-range', cmp);
    const set = v => cmp.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    if (!RM && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (!en.isIntersecting) return; io.disconnect();
        const keys = [[0, 50], [700, 72], [1500, 34], [2300, 50]];
        const t0 = performance.now();
        const step = t => {
          const el = t - t0; let i = 0;
          while (i < keys.length - 2 && el > keys[i + 1][0]) i++;
          const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
          const k = Math.min(1, (el - ta) / (tb - ta));
          const s = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const v = va + (vb - va) * s;
          set(v); range.value = v;
          if (el < keys[keys.length - 1][0]) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 400);
      }), { threshold: .45 });
      io.observe(cmp);
    }
  }

  /* ---------------- calculator ---------------- */
  const calc = $('[data-calc]');
  if (calc) {
    const ins = $$('input[type=range]', calc);
    const run = () => {
      const v = {}; ins.forEach(i => { v[i.dataset.k] = +i.value; i.style.setProperty('--fill', ((i.value - i.min) / (i.max - i.min) * 100) + '%'); });
      $('[data-v="inv"]', calc).textContent = money(v.inv, 0);
      $('[data-v="min"]', calc).textContent = v.min.toFixed(1);
      $('[data-v="rate"]', calc).textContent = money(v.rate, 0);
      const hours = v.inv * v.min / 60;
      $('[data-c="hours"]', calc).textContent = money(Math.round(hours), 0) + ' hours';
      $('[data-c="year"]', calc).textContent = 'PHP ' + money(Math.round(hours * v.rate * 12), 0);
    };
    ins.forEach(i => i.addEventListener('input', run)); run();
  }

  /* ---------------- flow tabs ---------------- */
  const tabs = $$('.flow-row [role=tab]');
  function selectTab(t, focus) {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % tabs.length;
      if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') n = 0; if (k === 'End') n = tabs.length - 1;
      if (n > -1) { e.preventDefault(); selectTab(tabs[n], true); }
    });
  });

  /* ---------------- requirements filter ---------------- */
  $$('[data-req-filter] input').forEach(inp => inp.addEventListener('change', () => {
    const v = inp.value;
    $$('[data-req] .cell').forEach(c => c.classList.toggle('dim', v !== 'all' && c.dataset.c !== v));
  }));

  /* ---------------- gantt ---------------- */
  const gantt = $('[data-gantt]');
  if (gantt) {
    const info = $('[data-g-info]');
    $$('[data-g]', gantt).forEach(b => b.addEventListener('click', () => {
      const [t, w, d] = b.dataset.g.split('|');
      $('[data-gi-t]', info).textContent = t + '.';
      $('[data-gi-d]', info).textContent = d;
      $('[data-gi-w]', info).textContent = w;
      $$('[data-g]', gantt).forEach(x => x.removeAttribute('aria-current'));
      b.setAttribute('aria-current', 'true');
    }));
    const tog = $('[data-pay-toggle]');
    tog && tog.addEventListener('change', () => gantt.classList.toggle('hide-pay', !tog.checked));
    const start = new Date('2026-11-16T00:00:00+08:00'), frac = (Date.now() - start) / (864e5 * 7 * 12);
    if (frac > 0 && frac < 1) $$('.g-track', gantt).forEach(tr => { const m = document.createElement('span'); m.className = 'g-today'; m.style.left = (frac * 100) + '%'; tr.appendChild(m); });
  }

  /* ---------------- reveal on scroll ---------------- */
  const revealables = $$('.rv, .gantt');
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealables.forEach(el => io.observe(el));
  } else revealables.forEach(el => el.classList.add('in'));

  /* pause loops off-screen */
  if ('IntersectionObserver' in window) {
    const lo = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('paused', !en.isIntersecting)));
    $$('.cover-panel, .flow').forEach(el => lo.observe(el));
  }

  /* ---------------- scrollspy + progress ---------------- */
  const links = $$('.toc a'), secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window && secs.length) {
    const so = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => { const on = a.hash === '#' + en.target.id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-30% 0px -65% 0px' });
    secs.forEach(s => so.observe(s));
  }
  const prog = $('[data-prog]'), doc = $('#main');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!prog || !doc) return;
      const r = doc.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      prog.style.transform = 'scaleX(' + k + ')';
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------------- cover replay (plays once) ---------------- */
  const cover = $('.cover');
  function heroIntro() {
    cover.classList.add('is-ready');
    if (RM) return;
    const rows = $$('.o-lines tbody tr', cover);
    rows.forEach(r => r.classList.add('off'));
    const st = $$('.o-status span', cover);
    st[0].className = 'on'; st[1].className = '';
    rows.forEach((r, i) => setTimeout(() => r.classList.remove('off'), 700 + i * 240));
    const tot = $('[data-count-hero]', cover);
    const final = prev['grand-plain'] || 434560;
    setTimeout(() => tween(0, final, 1400, v => { tot.textContent = money(v); }), 800);
    setTimeout(() => { if (!root.classList.contains('is-signed')) { st[0].className = 'done'; st[1].className = 'on'; } }, 2300);
    $$('[data-hero-pack] .ic', cover).forEach((ic, i) => setTimeout(() => ic.classList.add('in'), 1500 + i * 220));
  }

  recalc();
  requestAnimationFrame(heroIntro);
})();
