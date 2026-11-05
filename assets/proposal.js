/* TechNext proposal template: interactions. Markup is the finished state; this script only animates and recalculates. */
(() => {
  'use strict';
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

  /* ---------------- pricing model: every price stated once, no tax lines ---------------- */
  const PLANS = {
    essential: { ref: 'C1', name: 'Essential', sla: { p1r: '4 business hours', p1f: 'Within 1 business day', p2r: '1 business day', p2f: 'Within 3 business days', p3r: '2 business days', p3f: 'Within 10 business days', p4r: '3 business days', cover: '' } },
    priority: { ref: 'C2', name: 'Priority', sla: { p1r: '2 business hours', p1f: 'Within 8 business hours', p2r: '4 business hours', p2f: 'Within 2 business days', p3r: '1 business day', p3f: 'Within 5 business days', p4r: '2 business days', cover: '' } },
    dedicated: { ref: 'C3', name: 'Dedicated', sla: { p1r: '1 business hour', p1f: 'Within 4 business hours', p2r: '2 business hours', p2f: 'Within 1 business day', p3r: '4 business hours', p3f: 'Within 3 business days', p4r: '1 business day', cover: ', plus Saturday 9:00 am to 1:00 pm in the last week of each month' } }
  };
  const ODOO = { '3-25': 'D1', '3-30': 'D2', '5-25': 'D3', '5-30': 'D4' };
  const state = { plan: 'priority', opts: {}, odoo: '3-25' };
  const prev = {};
  const baseFee = () => $$('[data-line]').reduce((s, tr) => s + (+tr.dataset.amt || 0), 0);

  function optLines() {
    return $$('[data-opt]').filter(o => state.opts[o.dataset.opt]).map(o => {
      const qty = state.opts[o.dataset.opt];
      return { key: o.dataset.opt, ref: o.dataset.ref, qty, amt: qty * +o.dataset.unit };
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

  const odooRef = () => { const p = state.odoo.split('-'); return ODOO[state.odoo] + ', ' + p[0] + ' years, ' + p[1] + ' users'; };
  const optRefs = () => optLines().map(o => o.ref + (o.qty > 1 ? ' 00d7' + o.qty : ''));

  function recalc() {
    const opts = optLines(), refs = optRefs(), plan = PLANS[state.plan];
    setMoney('fee-total', baseFee() + opts.reduce((s, o) => s + o.amt, 0), v => 'PHP ' + money(v, 0), true);
    setOut('opt-note', refs.length ? 'Includes optional ' + refs.join(', ') : '');
    setOut('opt-refs', refs.length ? refs.join(', ') : 'None added');
    setOut('plan-ref', plan.ref + ' ' + plan.name);
    setOut('plan-name', plan.name);
    setOut('odoo-ref', odooRef());
    updateMailSigned();
  }

  /* C: support plan (the service levels in Part 3 follow it) */
  $$('[data-plans] input').forEach(inp => inp.addEventListener('change', () => {
    if (!inp.checked) return;
    state.plan = inp.value;
    $$('[data-plans] tbody tr').forEach(tr => tr.classList.toggle('is-on', !!$('input:checked', tr)));
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

  /* B: optional items join the total in A */
  $$('[data-opt]').forEach(o => {
    const btn = $('.opt-btn', o), qty = $('.qty', o), out = qty && $('output', qty), label = $('span', btn);
    const name = $('b', o).textContent;
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on);
      btn.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + name);
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

  /* D: Odoo licence, choose one (term x users); a row click picks it too */
  const opick = $('[data-opick]');
  if (opick) {
    const pickOdoo = () => {
      state.odoo = $('input[name=oterm]:checked', opick).value + '-' + $('input[name=ousers]:checked', opick).value;
      $$('[data-otbl] tr[data-o]').forEach(tr => tr.classList.toggle('is-on', tr.dataset.o === state.odoo));
      recalc();
    };
    opick.addEventListener('change', pickOdoo);
    $$('[data-otbl] tr[data-o]').forEach(tr => tr.addEventListener('click', () => {
      const p = tr.dataset.o.split('-');
      $('input[name=oterm][value="' + p[0] + '"]', opick).checked = true;
      $('input[name=ousers][value="' + p[1] + '"]', opick).checked = true;
      pickOdoo();
    }));
  }

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
    $$('[data-sig-name]').forEach(e => { e.textContent = name + (title ? ', ' + title : ''); });
    $$('[data-sig-date]').forEach(e => { e.textContent = when; });
    $$('[data-sig-who]').forEach(w => { w.innerHTML = '<b></b><span></span>'; w.firstChild.textContent = name; w.lastChild.textContent = (title ? title + ', ' : '') + 'Sample Trading Corp. · signed ' + when; });
    root.classList.add('is-signed');
    $$('[data-status-pill]').forEach(p => { p.textContent = 'Signed'; p.className = 'pill pill--ok'; });
    $$('.o-status [data-st]').forEach(s => { const i = +s.dataset.st; s.className = i < 2 ? 'done' : 'on'; });
    updateMailSigned();
    dlgSign.close();
    showPart(3, { target: 'sign' });
  });

  function updateMailSigned() {
    const a = $('[data-mail-signed]'); if (!a) return;
    const plan = PLANS[state.plan], refs = optRefs();
    const body = 'Hello TechNext,\n\nWe accept proposal S00147 (BIR CAS on Odoo) and its terms, with support plan ' + plan.ref + ' ' + plan.name +
      ', Odoo option ' + odooRef() + ' and optional items: ' + (refs.length ? refs.join(', ') : 'none') + '.' +
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
    $$('.rv, .gantt, .mix, .ptl, [data-hero-pack] .ic').forEach(el => el.classList.add('in'));
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
  const tabs = $$('.core-box [role=tab]');
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
  const revealables = $$('.rv, .gantt, .mix, .ptl');
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealables.forEach(el => io.observe(el));
  } else revealables.forEach(el => el.classList.add('in'));

  /* pause loops off-screen */
  if ('IntersectionObserver' in window) {
    const lo = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('paused', !en.isIntersecting)));
    $$('.cover-panel').forEach(el => lo.observe(el));
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
      const r = ($('.part:not([hidden])') || doc).getBoundingClientRect();
      const k = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      prog.style.transform = 'scaleX(' + k + ')';
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ================= v2: parts, showcase, architecture, chart, tilt ================= */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- parts ---------- */
  const partEls = $$('.part[data-part]');
  const partTabs = $$('[data-partbar] [role=tab]');
  const ind = $('[data-partbar] .ind');
  let curPart = 1;
  function moveInd() {
    const t = partTabs[curPart - 1]; if (!t || !ind) return;
    ind.style.transform = 'translateX(' + t.offsetLeft + 'px) scaleX(' + t.offsetWidth + ')';
  }
  function showPart(n, o) {
    o = o || {};
    n = Math.max(1, Math.min(3, +n || 1));
    const changed = n !== curPart;
    const apply = () => {
      curPart = n;
      root.dataset.part = n;
      partEls.forEach(p => { p.hidden = +p.dataset.part !== n; });
      partTabs.forEach((t, i) => { const on = i === n - 1; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      $$('[data-toc-part]').forEach(g => g.classList.toggle('on', +g.dataset.tocPart === n));
      moveInd();
      if (changed && !RM && !document.startViewTransition) { const el = partEls[n - 1]; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
      onScroll();
      if (o.focus && changed) partEls[n - 1].focus({ preventScroll: true });
    };
    const after = () => {
      if (o.scroll !== false) {
        const t = o.target ? document.getElementById(o.target) : $('#portal');
        if (t) t.scrollIntoView({ behavior: RM || o.instant ? 'auto' : 'smooth', block: 'start' });
      }
      if (o.hash !== false) try { history.replaceState(null, '', '#' + (o.target || 'part-' + n)); } catch (e) { /* file:// may refuse */ }
    };
    if (changed && !RM && !o.instant && document.startViewTransition) document.startViewTransition(apply).updateCallbackDone.then(after, after);
    else { apply(); after(); }
  }
  function partOf(id) { const el = document.getElementById(id); const p = el && el.closest('.part[data-part]'); return p ? +p.dataset.part : 0; }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); showPart(g.dataset.goto, { focus: !g.matches('[role=tab]') }); return; }
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const id = a.getAttribute('href').slice(1), p = partOf(id);
    if (p && p !== curPart) { e.preventDefault(); showPart(p, { target: id, focus: true }); }
  });
  partTabs.forEach((t, i) => t.addEventListener('keydown', e => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % 3; if (e.key === 'ArrowLeft') n = (i + 2) % 3;
    if (e.key === 'Home') n = 0; if (e.key === 'End') n = 2;
    if (n > -1) { e.preventDefault(); showPart(n + 1, { scroll: false }); partTabs[n].focus(); }
  }));
  function fromHash(instant) {
    const h = decodeURIComponent(location.hash.slice(1));
    const m = /^part-(\d)$/.exec(h);
    if (m) showPart(+m[1], { instant, scroll: !instant, hash: false });
    else if (h && partOf(h)) showPart(partOf(h), { instant, target: h, hash: false });
    else if (instant) showPart(1, { instant: true, scroll: false, hash: false });
  }
  addEventListener('hashchange', () => fromHash(false));
  addEventListener('resize', moveInd);

  /* ---------- tilt (pointer-driven camera on the Odoo screens) ---------- */
  const fine = matchMedia('(pointer: fine)').matches;
  $$('[data-tilt]').forEach(t => {
    const base = t.matches('.hero-stage') ? { rx: 0, ry: 0 } : { rx: 5, ry: -9 };
    const set = (rx, ry) => { t.style.setProperty('--rx', rx + 'deg'); t.style.setProperty('--ry', ry + 'deg'); };
    if (RM) return;
    set(base.rx, base.ry);
    if (!fine) return;
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      set((base.rx - y * 5).toFixed(2), (base.ry + x * 9).toFixed(2));
      t.style.setProperty('--px', x.toFixed(3)); t.style.setProperty('--py', y.toFixed(3));
    });
    t.addEventListener('pointerleave', () => { set(base.rx, base.ry); t.style.setProperty('--px', 0); t.style.setProperty('--py', 0); });
  });

  /* ---------- services showcase (an auto tour of looping Odoo scenes) ---------- */
  const show = $('[data-show]');
  if (show) {
    const svcs = $$('.svc', show), scenes = svcs.map(s => document.getElementById(s.getAttribute('aria-controls')));
    const crumb = $('[data-sc-crumb]'), icon = $('[data-sc-icon]'), get = $('[data-sc-get]'), ref = $('[data-sc-ref]');
    const tog = $('[data-show-toggle]'), replay = $('[data-show-replay]');
    const count = $('[data-sc-count]'), nEl = $('[data-sc-n]'), crumbHost = crumb && crumb.closest('.crumb'), railI = $('.svc-rail i', show);
    let cur = 0, started = false;
    if (RM) {
      show.classList.remove('auto');
      if (tog) tog.hidden = true;
      if (replay) replay.hidden = true;
      const note = document.createElement('span'); note.className = 'show-note'; note.textContent = 'Finished frames shown. Pick a service to see it.';
      tog && tog.parentElement.appendChild(note);
    }
    const countScene = sc => $$('[data-scount]', sc).forEach(el => {
      const to = +el.dataset.scount, f = el.dataset.sfmt || '{n}';
      const host = el.closest('.a, .ln'), d = host ? parseFloat(host.style.getPropertyValue('--d')) || 0 : 0;
      el.textContent = f.replace('{n}', 0);
      setTimeout(() => tween(0, to, 1200, v => { el.textContent = f.replace('{n}', Math.round(v).toLocaleString('en-PH')); }), d * 1000 + 250);
    });
    const play = sc => { if (RM) return; sc.classList.remove('play', 'enter'); void sc.offsetWidth; sc.classList.add('play', 'enter'); countScene(sc); runCursor(sc); };
    const restartBar = s => { const b = $('.prog i', s); if (b) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; } };
    function setAuto(on) {
      show.classList.toggle('auto', on);
      if (tog) { $('span', tog).textContent = on ? 'Pause tour' : 'Play tour'; $('use', tog).setAttribute('href', on ? '#i-pause' : '#i-play'); }
      if (on) { restartBar(svcs[cur]); get.setAttribute('aria-live', 'off'); }
    }
    function select(i, o) {
      o = o || {};
      const N = svcs.length, ni = (i + N) % N, dir = o.dir || ((((ni - cur) + N) % N) <= N / 2 ? 'next' : 'prev');
      cur = ni;
      svcs.forEach((s, k) => { const on = k === cur; s.setAttribute('aria-selected', on); s.tabIndex = on ? 0 : -1; s.classList.toggle('past', k < cur); });
      if (railI) railI.style.setProperty('--rail', (cur / (N - 1)).toFixed(3));
      if (count) count.innerHTML = String(cur + 1).padStart(2, '0') + ' <i>of ' + String(N).padStart(2, '0') + '</i>';
      scenes[cur].dataset.dir = dir;
      if (crumbHost && !RM) { crumbHost.classList.remove('swap'); void crumbHost.offsetWidth; crumbHost.classList.add('swap'); }
      scenes.forEach((sc, k) => { sc.classList.toggle('on', k === cur); if (k !== cur) sc.classList.remove('play', 'enter'); });
      const s = svcs[cur], ic = $('.svc-ic', s);
      crumb.textContent = s.dataset.crumb;
      if (ic) icon.src = ic.src;
      const items = s.dataset.get.split('|');
      get.setAttribute('aria-live', o.user ? 'polite' : 'off');
      get.innerHTML = items.map(t => '<li><svg class="ic"><use href="#i-check"/></svg>' + esc(t) + '</li>').join('');
      if (nEl) nEl.textContent = items.length;
      ref.textContent = s.dataset.ref;
      restartBar(s);
      const rail = s.parentElement;
      if (rail.scrollWidth > rail.clientWidth + 4) rail.scrollTo({ left: s.offsetLeft - 8, behavior: RM ? 'auto' : 'smooth' });
      play(scenes[cur]);
      if (o.user) setAuto(false);
      if (o.focus) s.focus();
    }
    svcs.forEach((s, i) => {
      s.addEventListener('click', () => select(i, { user: true }));
      s.addEventListener('keydown', e => {
        let n = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = i + 1;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = i - 1;
        if (e.key === 'Home') n = 0; if (e.key === 'End') n = svcs.length - 1;
        if (n > -1) { e.preventDefault(); select(n, { user: true, focus: true }); }
      });
    });
    show.addEventListener('animationend', e => {
      if (e.animationName === 'progress' && show.classList.contains('auto')) select(cur + 1);
    });
    show.addEventListener('pointerenter', () => show.classList.add('hold'));
    show.addEventListener('pointerleave', () => show.classList.remove('hold'));
    tog && tog.addEventListener('click', () => setAuto(!show.classList.contains('auto')));
    replay && replay.addEventListener('click', () => { play(scenes[cur]); restartBar(svcs[cur]); });
    const prevB = $('[data-sc-prev]'), nextB = $('[data-sc-next]');
    prevB && prevB.addEventListener('click', () => select(cur - 1, { user: true, dir: 'prev' }));
    nextB && nextB.addEventListener('click', () => select(cur + 1, { user: true, dir: 'next' }));
    document.addEventListener('visibilitychange', () => show.classList.toggle('hold', document.hidden || show.matches(':hover')));
    window.__tnpSelect = i => { started = true; select(i, { user: true }); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(en => {
        const vis = en.isIntersecting && en.intersectionRatio >= .6;
        show.classList.toggle('paused', !vis);
        if (vis && !started) { started = true; select(0); }
      }), { threshold: [0, .6, 1] }).observe(show);
    }
  }

  /* ---------- architecture: three sites -> one database -> BIR outputs ---------- */
  const arch = $('[data-arch]');
  function drawArch() {
    if (!arch || !arch.offsetWidth) return;
    const svg = $('[data-arch-svg]', arch), box = arch.getBoundingClientRect(), core = $('[data-core]', arch).getBoundingClientRect();
    const rel = r => ({ l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 });
    const C = rel(core), side = getComputedStyle(arch).gridTemplateColumns.trim().split(/\s+/).length > 1;
    const clampY = y => Math.max(C.t + 36, Math.min(C.b - 24, y));
    let paths = '', dots = '', n = 0;
    const add = (d, el, delay) => {
      const id = 'ap' + n++;
      paths += '<path id="' + id + '" d="' + d + '"/>';
      if (!RM) dots += '<circle r="4.5"><animateMotion dur="2.8s" repeatCount="indefinite" begin="' + delay + 's" path="' + d + '"/></circle>';
      el.dataset.path = id;
    };
    $$('[data-from]', arch).forEach((el, i) => {
      const a = rel(el.getBoundingClientRect());
      let d;
      if (side) { const y2 = clampY(a.cy), mx = (a.r + C.l) / 2; d = 'M' + a.r + ',' + a.cy + ' C' + mx + ',' + a.cy + ' ' + mx + ',' + y2 + ' ' + C.l + ',' + y2; }
      else { const my = (a.b + C.t) / 2; d = 'M' + a.cx + ',' + a.b + ' C' + a.cx + ',' + my + ' ' + C.cx + ',' + my + ' ' + C.cx + ',' + C.t; }
      add(d, el, (i * .55).toFixed(2));
    });
    $$('[data-to]', arch).forEach((el, i) => {
      const a = rel(el.getBoundingClientRect());
      let d;
      if (side) { const y1 = clampY(a.cy), mx = (C.r + a.l) / 2; d = 'M' + C.r + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + a.cy + ' ' + a.l + ',' + a.cy; }
      else { const my = (C.b + a.t) / 2; d = 'M' + C.cx + ',' + C.b + ' C' + C.cx + ',' + my + ' ' + a.cx + ',' + my + ' ' + a.cx + ',' + a.t; }
      add(d, el, (1.2 + i * .4).toFixed(2));
    });
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.innerHTML = paths + dots;
  }
  if (arch) {
    if ('ResizeObserver' in window) new ResizeObserver(drawArch).observe(arch); else addEventListener('resize', drawArch);
    arch.addEventListener('pointerover', e => { const n = e.target.closest('[data-path]'); if (n) { n.classList.add('hot'); const p = document.getElementById(n.dataset.path); p && p.classList.add('hot'); } });
    arch.addEventListener('pointerout', e => { const n = e.target.closest('[data-path]'); if (n) { n.classList.remove('hot'); const p = document.getElementById(n.dataset.path); p && p.classList.remove('hot'); } });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => {
      const svg = $('[data-arch-svg]', arch);
      if (svg && svg.pauseAnimations) { if (en.isIntersecting) svg.unpauseAnimations(); else svg.pauseAnimations(); }
    })).observe(arch);
  }


  /* ---------- demo cursor inside a scene: parks, presses, the target answers ---------- */
  function runCursor(sc) {
    const cur = $('.cur', sc); if (!cur || RM || !cur.animate) return;
    if (cur._a) cur._a.cancel();
    const targets = $$('[data-cur]', sc).map(el => ({ el, t: parseFloat(el.dataset.cur) * 1000 })).sort((a, b) => a.t - b.t);
    if (!targets.length) return;
    const off = el => { let x = 0, y = 0, n = el; while (n && n !== sc) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x: x + el.offsetWidth * .5, y: y + el.offsetHeight * .55 }; };
    const W = sc.clientWidth, H = sc.clientHeight, total = targets[targets.length - 1].t + 800, e = 'cubic-bezier(.16,1,.3,1)';
    const start = { x: W * .92, y: H * .95 };
    const kf = [{ transform: 'translate(' + start.x + 'px,' + start.y + 'px)', opacity: 0, offset: 0, easing: e },
                { transform: 'translate(' + start.x + 'px,' + start.y + 'px)', opacity: 1, offset: Math.max(0, targets[0].t - 900) / total, easing: e }];
    targets.forEach(({ el, t }) => {
      const p = off(el), at = 'translate(' + p.x + 'px,' + p.y + 'px)';
      kf.push({ transform: at + ' scale(1)', opacity: 1, offset: Math.max(0, t - 130) / total, easing: 'ease-in' });
      kf.push({ transform: at + ' scale(.8)', opacity: 1, offset: t / total, easing: e });
      kf.push({ transform: at + ' scale(1)', opacity: 1, offset: Math.min(1, (t + 110) / total), easing: e });
      setTimeout(() => { if (!sc.classList.contains('on')) return; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }, t);
    });
    const last = off(targets[targets.length - 1].el);
    kf.push({ transform: 'translate(' + (last.x + 26) + 'px,' + (last.y + 34) + 'px)', opacity: 0, offset: 1 });
    cur._a = cur.animate(kf, { duration: total, fill: 'forwards' });
  }

  /* ---------- hero: lines open their service; the window flattens as you scroll ---------- */
  $$('.oline').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.svc;
    showPart(1, { target: 'services' });
    setTimeout(() => window.__tnpSelect && window.__tnpSelect(i), RM ? 0 : 520);
  }));
  const sayOut = $('[data-say-out]');
  $$('.o-step button').forEach(b => b.addEventListener('click', () => {
    $$('.o-step button').forEach(x => x.removeAttribute('aria-current'));
    b.setAttribute('aria-current', 'step');
    if (sayOut) { sayOut.textContent = b.dataset.say; if (!RM) { sayOut.classList.remove('swap'); void sayOut.offsetWidth; sayOut.classList.add('swap'); } }
    if (b.dataset.st === '2' && !root.classList.contains('is-signed')) { const s = $('.hero-foot [data-open-sign]'); if (s && !RM) { s.classList.remove('sign-pulse'); void s.offsetWidth; s.classList.add('sign-pulse'); } }
  }));
  const hWin = $('.hero-win'), hStage = $('.hero-stage');
  function heroScroll() {
    if (!hWin || !hStage || RM || innerWidth <= 760) return;
    const top = hStage.getBoundingClientRect().top + scrollY;
    if (scrollY > top + innerHeight && hWin.style.getPropertyValue('--srx') === '0.00deg') return;
    const k = Math.min(1, Math.max(0, scrollY / Math.max(1, top - innerHeight * .12)));
    hWin.style.setProperty('--srx', (14 * (1 - k)).toFixed(2) + 'deg');
    hWin.style.setProperty('--ss', (.95 + .05 * k).toFixed(3));
  }
  addEventListener('scroll', () => requestAnimationFrame(heroScroll), { passive: true });
  addEventListener('resize', heroScroll);

  /* ================= hero FX: apps on the grid, light along the lines, Nexi, intro dial ================= */
  const FX = (() => {
    const coverEl = $('.cover'), bg = $('[data-hero-bg]');
    if (!coverEl || !bg || !bg.getContext) return null;
    const DPR = Math.min(1.5, window.devicePixelRatio || 1), G = 48;
    const LEFT = ['accountant', 'sale', 'documents', 'project'];
    const RIGHT = ['account', 'spreadsheet_dashboard', 'website_slides', 'helpdesk'];
    const ROWS = $$('.oline'), ROWKEYS = ROWS.map(b => b.dataset.key);
    const srcMap = {}; $$('.fx-src img').forEach(i => { srcMap[i.dataset.key] = i; });
    const soft = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 4);
    const inout = k => { k = Math.min(1, Math.max(0, k)); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    const S = { W: 0, H: 0, cv: bg, ctx: bg.getContext('2d'), mode: 'hero', run: false, vis: true, last: 0, t0: performance.now(), px: 0, py: 0, has: false, tgt: null, zones: [], hover: null, hotRow: null, hotNode: null, pulse: null, nextPulse: 0, pulseI: 0, wide: false, dial: null, rot: 0, rotT: 0, trackP: 0, trackA: 0, introActive: false, press: null };
    const nodes = LEFT.concat(RIGHT).filter(k => srcMap[k]).map((k, i) => ({
      key: k, img: srcMap[k], name: srcMap[k].dataset.app, mine: ROWKEYS.includes(k), side: LEFT.includes(k) ? -1 : 1,
      rank: (LEFT.includes(k) ? LEFT : RIGHT).indexOf(k), ord: i, x: -300, y: -300, hx: 0, hy: 0, show: false, ix: 0, iy: 0, ang: 0,
      a: 0, sc: 1, size: 36, ph: i * 1.31, glow: 0, spr: null, tw: null
    }));
    const olist = $('.olines', coverEl), ind = olist ? document.createElement('li') : null;
    if (ind) { ind.className = 'oline-ind'; ind.setAttribute('aria-hidden', 'true'); olist.prepend(ind); olist.classList.add('ind-on'); }
    function moveInd(key) {
      ROWS.forEach(b => b.parentElement.classList.toggle('hot', !!key && b.dataset.key === key));
      if (!ind) return; const b = key && ROWS[ROWKEYS.indexOf(key)];
      if (!b) { ind.classList.remove('on'); return; }
      const li = b.parentElement; ind.style.transform = 'translateY(' + li.offsetTop + 'px)'; ind.style.height = li.offsetHeight + 'px'; ind.classList.add('on');
    }
    const rel = el => { const cr = coverEl.getBoundingClientRect(), b = el.getBoundingClientRect(); return { l: b.left - cr.left, t: b.top - cr.top, r: b.right - cr.left, b: b.bottom - cr.top, w: b.width, h: b.height }; };
    const inZ = (x, y, Z, p) => Z.some(q => x > q.l - p && x < q.r + p && y > q.t - p && y < q.b + p);
    function sprite(n) {
      if (n.spr || !n.img.complete || !n.img.naturalWidth) return n.spr;
      const c = document.createElement('canvas'), s = Math.ceil(72 * DPR); c.width = c.height = s;
      try { c.getContext('2d').drawImage(n.img, 0, 0, s, s); n.spr = c; } catch (e) { n.spr = null; }
      return n.spr;
    }
    function size(cv, W, H) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }

    /* hero: two mirrored groups of apps on grid intersections beside the headline */
    const TARGET = [[.17, .09], [.045, .16], [.17, .23], [.045, .30]];
    function layoutHero() {
      const W = coverEl.clientWidth, H = coverEl.clientHeight; S.W = W; S.H = H; S.wide = W >= 1180;
      const Z = S.zones = ['.cover-top', '.hero-copy h1', '.hero-sub', '.hero2 .cover-cta', '.hchips', '.hero-win'].map(s => $(s, coverEl)).filter(e => e && e.offsetWidth).map(rel);
      const win = $('.hero-win', coverEl);
      if (win) { const w = rel(win); Z.push({ l: w.l - 150, t: w.t - 170, r: w.l, b: w.b }, { l: w.r, t: w.t - 170, r: w.r + 150, b: w.b }, { l: w.r - 230, t: w.t - 215, r: w.r + 130, b: w.t + 10 }); }
      nodes.forEach(n => { n.show = false; });
      if (!S.wide) return;
      const h1 = $('.hero-copy h1', coverEl), H1 = h1 ? rel(h1) : { l: W * .3, r: W * .7 };
      [-1, 1].forEach(side => {
        nodes.filter(n => n.side === side).sort((a, b) => a.rank - b.rank).forEach(n => {
          const y = (3 + n.rank) * G - .5, inner = n.rank % 2 === 0;
          const tx = side < 0 ? (inner ? H1.l - 140 : H1.l - 236) : (inner ? H1.r + 140 : H1.r + 236);
          const g0 = Math.round((Math.max(64, Math.min(W - 64, tx)) + .5) / G);
          for (const off of [0, side, -side, 2 * side, -2 * side]) {
            const x = (g0 + off) * G - .5;
            if (x < 40 || x > W - 40 || inZ(x, y, Z, 36)) continue;
            n.hx = x; n.hy = y; n.show = true; break;
          }
        });
      });
    }

    /* route from an app to its quotation row, along the grid: down, across, down, into the row */
    const heroWin = $('.hero-win', coverEl), RC = { f: -1, w: null, r: [] };
    function route(n) {
      const i = ROWKEYS.indexOf(n.key); if (i < 0 || !heroWin) return null;
      if (RC.f !== S.fid) { RC.f = S.fid; RC.w = rel(heroWin); RC.r = []; }
      const w = RC.w, r = RC.r[i] || (RC.r[i] = rel(ROWS[i])), ry = (r.t + r.b) / 2, left = n.side < 0, ct = w.t;
      const edge = left ? w.l + 2 : w.r - 2, lane = left ? w.l - 24 - (n.rank % 4) * 10 : w.r + 24 + (n.rank % 4) * 10, top = Math.min(w.t - 30, ct - 22) - (n.rank % 4) * 10;
      const ln = left ? w.l - 22 - n.rank * 12 : w.r + 22 + n.rank * 12, sy = n.y + 24;
      const P = [[n.x, n.y], [n.x, sy], [ln, sy], [ln, ry], [edge, ry]];
      const out = [P[0]]; P.slice(1).forEach(p => { const q = out[out.length - 1]; if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) > .5) out.push(p); });
      let L = 0; const seg = [];
      for (let k = 1; k < out.length; k++) { const d = Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]); seg.push(d); L += d; }
      return { P: out, seg, L, row: ROWS[i] };
    }
    function at(R, d) {
      d = Math.max(0, Math.min(R.L, d));
      for (let k = 0; k < R.seg.length; k++) { if (d <= R.seg[k] || k === R.seg.length - 1) { const t = R.seg[k] ? d / R.seg[k] : 0, a = R.P[k], b = R.P[k + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; } d -= R.seg[k]; }
      return R.P[R.P.length - 1];
    }
    function strokeRoute(c, R, upto) {
      c.beginPath(); c.moveTo(R.P[0][0], R.P[0][1]);
      let left = upto == null ? R.L : upto;
      for (let k = 1; k < R.P.length && left > 0; k++) {
        const d = R.seg[k - 1], a = R.P[k - 1], b = R.P[k];
        if (left >= d) { if (k < R.P.length - 1 && left > d + 12) { c.arcTo(b[0], b[1], R.P[k + 1][0], R.P[k + 1][1], 12); } else c.lineTo(b[0], b[1]); left -= d; }
        else { const t = left / d; c.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); left = 0; }
      }
      c.stroke();
    }

    /* ---------- loop ---------- */
    function frame(now) {
      if (!S.run) return;
      requestAnimationFrame(frame);
      S.fid = (S.fid || 0) + 1;
      if ((!S.vis && S.mode === 'hero') || document.hidden) { S.last = now; return; }
      const dt = Math.min(.05, (now - (S.last || now)) / 1000); S.last = now;
      step(now, dt); draw(now);
      if (NX) NX.update(now, dt);
    }
    function step(now, dt) {
      const t = (now - S.t0) / 1000, pxn = S.has ? S.px / S.W - .5 : 0, pyn = S.has ? S.py / S.H - .5 : 0, intro = S.mode === 'intro';
      if (intro && S.dial) { S.rotT = S.has ? pxn * .9 : 0; S.rot += dt * .06; S.rotOff = (S.rotOff || 0) + (S.rotT - (S.rotOff || 0)) * (1 - Math.exp(-dt * 3)); }
      nodes.forEach(n => {
        if (n.tw) {
          const k = (now - n.tw.s) / n.tw.d, e = n.tw.e(k);
          if (k <= 0) { n.x = n.tw.fx; n.y = n.tw.fy; n.a = n.tw.fa; n.sc = n.tw.fs; return; }
          n.x = n.tw.fx + (n.tw.tx - n.tw.fx) * e; n.y = n.tw.fy + (n.tw.ty - n.tw.fy) * e; n.sc = n.tw.fs + (n.tw.ts - n.tw.fs) * e;
          n.a = n.tw.fa + (n.tw.ta - n.tw.fa) * Math.min(1, k * 4);
          if (k >= 1) n.tw = null;
          return;
        }
        let tx, ty;
        if (intro && S.dial) { const g = n.ang + S.rot + S.rotOff; tx = S.dial.cx + Math.cos(g) * S.dial.r; ty = S.dial.cy + Math.sin(g) * S.dial.r; }
        else { const dep = n.mine ? 1 : .6; tx = n.hx - pxn * 10 * dep + Math.cos(t * .5 + n.ph) * 2; ty = n.hy - pyn * 8 * dep + Math.sin(t * .62 + n.ph) * 3; }
        const k = 1 - Math.exp(-dt * (intro ? 9 : 6)); n.x += (tx - n.x) * k; n.y += (ty - n.y) * k;
        const want = n === S.hover || n === S.hotNode ? 1.12 : 1; n.sc += (want - n.sc) * (1 - Math.exp(-dt * 12));
        n.glow = Math.max(0, n.glow - dt * 1.6);
      });
      if (S.press) { const k = (now - S.press.t) / 340; if (k >= 1) S.press = null; }
      S.hover = null;
      if (S.has && !(S.tgt && S.tgt.closest && S.tgt.closest('a,button,input,label,.hero-win,.nexi,.intro-act'))) {
        let bd = 1e9; nodes.forEach(n => { if (n.a < .5) return; const d = Math.hypot(n.x - S.px, n.y - S.py); if (d < 30 && d < bd) { bd = d; S.hover = n; } });
      }
      (intro ? S.cv.parentElement : coverEl).classList.toggle('fx-hover', !!S.hover);
      if (!intro) {
        const hoverMine = S.hover && S.hover.mine ? S.hover : null;
        const hot = hoverMine || S.hotNode;
        const hk = (hot ? hot.key : null) || (S.hotRow ? S.hotRow.dataset.key : null);
        if (hk !== S.lastHot) { S.lastHot = hk; moveInd(hk); }
        if (!S.pulse && !hot && S.wide && now > S.nextPulse && S.vis) {
          const list = nodes.filter(n => n.mine && n.show && n.a > .8);
          if (list.length) { const n = list[S.pulseI++ % list.length], R = route(n); if (R) S.pulse = { n, R, t: now, d: 1150 + R.L * .55 }; }
        }
        if (S.pulse && now - S.pulse.t > S.pulse.d) {
          const li = S.pulse.R.row.parentElement; li.classList.remove('ping'); void li.offsetWidth; li.classList.add('ping');
          S.pulse.n.glow = 1; S.pulse = null; S.nextPulse = now + 2300;
        }
      }
    }
    function draw(now) {
      const c = S.ctx, W = S.W, H = S.H, intro = S.mode === 'intro';
      c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
      /* grid light under the cursor */
      if (S.has && !intro) {
        const R = 220, x0 = Math.floor((S.px - R) / G), x1 = Math.ceil((S.px + R) / G), y0 = Math.floor((S.py - R) / G), y1 = Math.ceil((S.py + R) / G);
        c.lineWidth = 1;
        for (let gx = x0; gx <= x1; gx++) { const x = gx * G - .5, dx = Math.abs(x - S.px); if (dx > R) continue; const h = Math.sqrt(R * R - dx * dx), g = c.createLinearGradient(0, S.py - h, 0, S.py + h); const a = (.22 * (1 - dx / R)).toFixed(3); g.addColorStop(0, 'rgba(49,103,202,0)'); g.addColorStop(.5, 'rgba(49,103,202,' + a + ')'); g.addColorStop(1, 'rgba(49,103,202,0)'); c.strokeStyle = g; c.beginPath(); c.moveTo(x, S.py - h); c.lineTo(x, S.py + h); c.stroke(); }
        for (let gy = y0; gy <= y1; gy++) { const y = gy * G - .5, dy = Math.abs(y - S.py); if (dy > R) continue; const w = Math.sqrt(R * R - dy * dy), g = c.createLinearGradient(S.px - w, 0, S.px + w, 0); const a = (.22 * (1 - dy / R)).toFixed(3); g.addColorStop(0, 'rgba(49,103,202,0)'); g.addColorStop(.5, 'rgba(49,103,202,' + a + ')'); g.addColorStop(1, 'rgba(49,103,202,0)'); c.strokeStyle = g; c.beginPath(); c.moveTo(S.px - w, y); c.lineTo(S.px + w, y); c.stroke(); }
        c.fillStyle = '#3167CA';
        for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const x = gx * G - .5, y = gy * G - .5, d = Math.hypot(x - S.px, y - S.py); if (d > R * .8) continue; c.globalAlpha = .5 * (1 - d / (R * .8)); c.fillRect(x - 1.5, y - 1.5, 3, 3); }
        c.globalAlpha = 1;
      }
      /* intro: the dial track with its ticks */
      if (intro && S.dial && S.trackA > 0) {
        const D = S.dial, p = S.trackP;
        c.strokeStyle = 'rgba(49,103,202,' + (.22 * S.trackA).toFixed(3) + ')'; c.lineWidth = 1.2;
        c.beginPath(); c.arc(D.cx, D.cy, D.r, -Math.PI / 2, -Math.PI / 2 + p * 6.283); c.stroke();
        c.strokeStyle = 'rgba(49,103,202,' + (.28 * S.trackA).toFixed(3) + ')';
        const pa = S.has ? Math.atan2(S.py - D.cy, S.px - D.cx) : null;
        for (let k = 0; k < 60; k++) {
          const g = k / 60 * 6.283 + S.rot * .5; if (k / 60 > p) break;
          let near = 0; if (pa !== null) { let d = Math.abs(((g - pa) % 6.283 + 9.425) % 6.283 - 3.1416); near = Math.max(0, 1 - d / .55); near *= near; }
          const r1 = D.r + 12, r2 = D.r + (k % 5 ? 16 : 22) + near * 9;
          c.strokeStyle = 'rgba(49,103,202,' + ((.28 + near * .62) * S.trackA).toFixed(3) + ')'; c.lineWidth = 1.2 + near * .9;
          c.beginPath(); c.moveTo(D.cx + Math.cos(g) * r1, D.cy + Math.sin(g) * r1); c.lineTo(D.cx + Math.cos(g) * r2, D.cy + Math.sin(g) * r2); c.stroke();
        }
        c.lineWidth = 1.2;
        if (p >= 1) { const g = (now - S.t0) / 1000 * .9 - Math.PI / 2, x = D.cx + Math.cos(g) * D.r, y = D.cy + Math.sin(g) * D.r; trail(c, k => { const gg = g - k * .03; return [D.cx + Math.cos(gg) * D.r, D.cy + Math.sin(gg) * D.r]; }, S.trackA); nodes.forEach(n => { if (Math.hypot(n.x - x, n.y - y) < 10) n.glow = Math.max(n.glow, .8); }); }
      }
      /* the active route: the hovered row or app, or the travelling pulse */
      if (!intro) {
        const hot = (S.hover && S.hover.mine ? S.hover : null) || S.hotNode;
        if (hot && S.wide) { const R = route(hot); if (R) { c.save(); c.strokeStyle = 'rgba(49,103,202,.55)'; c.lineWidth = 1.5; c.setLineDash([5, 7]); c.lineDashOffset = -now / 28; strokeRoute(c, R); c.restore(); const e = R.P[R.P.length - 1]; c.fillStyle = '#3167CA'; c.beginPath(); c.arc(e[0], e[1], 3.5, 0, 6.283); c.fill(); } }
        else if (S.pulse) {
          const P = S.pulse, k = (now - P.t) / P.d, d = inout(k) * P.R.L;
          trail(c, j => at(P.R, d - j * 7), Math.min(1, Math.sin(Math.min(1, k) * Math.PI) * 2.5));
        }
      }
      /* apps */
      nodes.forEach(n => {
        if (n.a <= .02) return;
        const spr = sprite(n); if (!spr) return;
        let s = n.size * n.sc;
        if (S.press && S.press.n === n) { const k = (now - S.press.t) / 340; s *= k < .25 ? 1 - .2 * (k / .25) : .8 + .25 * soft((k - .25) / .75) - .05 * Math.max(0, (k - .7) / .3); }
        if (n.glow > 0) { c.fillStyle = 'rgba(49,103,202,' + (.12 * n.glow).toFixed(3) + ')'; c.beginPath(); c.arc(n.x, n.y, s * .78, 0, 6.283); c.fill(); }
        c.globalAlpha = n.a * (n.mine ? 1 : .62) * (n === S.hover ? 1 : .94);
        c.drawImage(spr, n.x - s / 2, n.y - s / 2, s, s);
        c.globalAlpha = 1;
      });
      const lab = S.hover || (S.hotNode && !intro ? S.hotNode : null);
      if (lab && lab.a > .5) label(c, lab);
    }
    function trail(c, fn, alpha) {
      for (let j = 14; j >= 0; j--) { const p = fn(j); c.fillStyle = 'rgba(49,103,202,' + ((1 - j / 15) * .55 * alpha).toFixed(3) + ')'; c.beginPath(); c.arc(p[0], p[1], 2.6 * (1 - j / 22), 0, 6.283); c.fill(); }
      const h = fn(0); c.fillStyle = 'rgba(49,103,202,' + (.18 * alpha).toFixed(3) + ')'; c.beginPath(); c.arc(h[0], h[1], 7, 0, 6.283); c.fill();
      c.fillStyle = '#3167CA'; c.globalAlpha = alpha; c.beginPath(); c.arc(h[0], h[1], 2.8, 0, 6.283); c.fill(); c.globalAlpha = 1;
    }
    function label(c, n) {
      const txt = 'Odoo ' + n.name, sub = n.mine ? 'In your proposal' : '';
      c.font = '700 12.5px Inter, system-ui, sans-serif'; const w1 = c.measureText(txt).width;
      c.font = '600 11.5px Inter, system-ui, sans-serif'; const w2 = sub ? c.measureText(sub).width : 0;
      const w = Math.max(w1, w2) + 22, h = sub ? 42 : 28;
      let x = n.x + n.size * .62 + 10, y = n.y - h / 2;
      if (x + w > S.W - 8 || n.side > 0) x = n.x - n.size * .62 - 10 - w;
      if (x < 8) x = n.x + n.size * .62 + 10;
      y = Math.max(6, Math.min(S.H - h - 6, y));
      c.fillStyle = '#fff'; c.strokeStyle = '#E3E9F5'; c.lineWidth = 1;
      c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, 10); else c.rect(x, y, w, h); c.fill(); c.stroke();
      c.fillStyle = '#1F1F3D'; c.font = '700 12.5px Inter, system-ui, sans-serif'; c.textBaseline = 'middle'; c.fillText(txt, x + 11, y + (sub ? 14 : h / 2));
      if (sub) { c.fillStyle = '#137A4A'; c.font = '600 11.5px Inter, system-ui, sans-serif'; c.fillText(sub, x + 11, y + 29); }
    }
    function start() { if (S.run || RM) return; S.run = true; S.last = 0; requestAnimationFrame(frame); }
    function staticDraw() { if (S.mode === 'hero') nodes.forEach(n => { n.x = n.hx; n.y = n.hy; n.a = n.show ? 1 : 0; n.sc = 1; n.tw = null; }); draw(performance.now()); if (NX) NX.update(performance.now(), 1); }
    function pickAt(cx, cy) {
      const r = S.cv.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      let best = null, bd = 1e9; nodes.forEach(n => { if (n.a < .5) return; const d = Math.hypot(n.x - x, n.y - y); if (d < 30 && d < bd) { bd = d; best = n; } });
      return best;
    }

    /* ---------- input ---------- */
    addEventListener('pointermove', e => {
      const r = S.cv.getBoundingClientRect();
      S.px = e.clientX - r.left; S.py = e.clientY - r.top; S.tgt = e.target;
      S.has = e.pointerType !== 'touch' && S.px >= 0 && S.py >= 0 && S.px <= r.width && S.py <= r.height;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { S.has = false; });
    addEventListener('pointerdown', e => {
      const n = pickAt(e.clientX, e.clientY); if (!n) return;
      if (e.target.closest('a,button,input,textarea,label,select,.hero-win,.nexi,dialog,.intro-act')) return;
      if (S.mode === 'hero' && !coverEl.contains(e.target)) return;
      S.press = { n, t: performance.now() }; n.glow = 1;
      if (S.mode === 'hero' && n.mine) { const b = ROWS[ROWKEYS.indexOf(n.key)]; if (b) setTimeout(() => b.click(), RM ? 0 : 260); }
      if (RM) staticDraw();
    }, { passive: true });
    ROWS.forEach(b => {
      const on = () => { S.hotNode = nodes.find(q => q.key === b.dataset.key && q.show) || null; S.hotRow = b; S.lastHot = b.dataset.key; moveInd(b.dataset.key); if (NX) NX.line(b); if (RM) staticDraw(); };
      const off = () => { S.hotNode = null; S.hotRow = null; S.lastHot = null; moveInd(null); if (NX) NX.unline(); if (RM) staticDraw(); };
      b.addEventListener('pointerenter', on); b.addEventListener('focus', on);
      b.addEventListener('pointerleave', off); b.addEventListener('blur', off);
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => { S.vis = en.isIntersecting; coverEl.classList.toggle('paused', !en.isIntersecting); })).observe(coverEl);
    let rz = 0;
    const relayout = () => { if (S.mode !== 'hero') return; layoutHero(); size(bg, S.W, S.H); if (RM) staticDraw(); if (NX) NX.restation(); };
    const onResize = () => { clearTimeout(rz); rz = setTimeout(relayout, 220); };
    const afterFonts = () => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(relayout, 60)); };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(coverEl); else addEventListener('resize', onResize);

    /* ---------- Nexi: perched on the quotation, glides down its edge to the row you point at ---------- */
    const NX = (() => {
      const el = $('[data-nexi]', coverEl), bub = $('[data-nexi-say]', coverEl);
      if (!el || !bub) return null;
      const poses = {}; $$('.nexi-pose', el).forEach(i => { poses[i.dataset.pose] = i; });
      const sq = $('.nexi-sq', el);
      const N = { x: -300, y: -300, tx: -300, ty: -300, pose: 'hello', hover: false, sayUntil: 0, tip: 0, greeted: false, back: 0, idle: 0, loved: false };
      const TIPS = ['Every price is in Part 2. Parts 1 and 3 have none.', 'Point at a line to see where it comes from.', 'Add an option in Part 2 and every total updates.', 'Sign in Part 3, then email us the signed PDF.', "Booklets and retyping? It's not you, it's the process."];
      function pose(p) {
        if (!poses[p] || p === N.pose) return;
        if (poses[p].dataset.src && !poses[p].getAttribute('src')) poses[p].src = poses[p].dataset.src;
        poses[N.pose].classList.remove('on'); poses[p].classList.add('on'); N.pose = p;
        if (!RM && sq && sq.animate) sq.animate([{ transform: 'scale(1.05,.95)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
      function say(t, ms) { if (!t) return; bub.textContent = t; bub.classList.add('on'); N.sayUntil = performance.now() + (ms || 3000); place(); if (RM || !S.run) { clearTimeout(N.hideT); N.hideT = setTimeout(() => bub.classList.remove('on'), ms || 3000); } }
      function box() { return { w: el.offsetWidth, h: el.offsetHeight }; }
      function corner() {
        const win = $('.hero-win', coverEl), b = box(), W = coverEl.clientWidth;
        if (!win) return { x: W - 80, y: 160 };
        const w = rel(win);
        if (W >= 1180) return { x: w.r + b.w * .35, y: w.t - b.h * .5 };
        return { x: w.r - b.w * (W < 760 ? .8 : .9), y: w.t - b.h * (W < 760 ? .58 : .56) };
      }
      function to(x, y, p) { N.tx = x; N.ty = y; if (p) pose(p); if (RM || !S.run) { N.x = x; N.y = y; update(performance.now(), 0); } }
      function home(t, ms) { const c = corner(); to(c.x, c.y, 'hello'); say(t, ms || 3000); }
      function place() {
        const W = coverEl.clientWidth, b = box(), bw = bub.offsetWidth, bh = bub.offsetHeight;
        let bx = N.x > W * .6 ? N.x - bw + b.w * .4 : N.x - bw / 2; bx = Math.max(10, Math.min(W - bw - 10, bx));
        let by = N.y - b.h * .52 - bh - 10, below = false; if (by < 8) { by = N.y + b.h * .52 + 10; below = true; }
        bub.classList.toggle('below', below);
        bub.style.setProperty('--bx', bx.toFixed(1) + 'px'); bub.style.setProperty('--by', by.toFixed(1) + 'px');
        bub.style.setProperty('--tx', Math.max(14, Math.min(bw - 14, N.x - bx)).toFixed(1) + 'px');
      }
      let lastX = -300;
      function update(now, dt) {
        const k = RM || !dt ? 1 : 1 - Math.exp(-dt * 4.2);
        N.x += (N.tx - N.x) * k; N.y += (N.ty - N.y) * k;
        const vy = dt > 0 ? (N.x - lastX) / dt : 0; lastX = N.x;
        const b = box(), tilt = RM ? 0 : Math.max(-6, Math.min(6, vy * .02));
        el.style.transform = 'translate(' + (N.x - b.w / 2).toFixed(1) + 'px,' + (N.y - b.h / 2).toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
        if (bub.classList.contains('on')) { place(); if (now > N.sayUntil) bub.classList.remove('on'); }
        if (N.back && now > N.back && !N.hover) { N.back = 0; home(); }
        if (S.mode === 'hero' && !N.hover && !N.back && now > N.idle && S.vis) { N.idle = now + 9000 + Math.random() * 4000; pose(N.pose === 'think' ? 'hello' : 'think'); }
      }
      function line(btn) {
        const W = coverEl.clientWidth, win = $('.hero-win', coverEl), b = box(); if (!win) return;
        const w = rel(win), L = rel(btn), nm = (btn.querySelector('.onm') || {}).textContent || '', tm = (btn.querySelector('.otm') || {}).textContent || '';
        N.back = 0;
        if (W >= 1180) { to(w.r + b.w * .95, (L.t + L.b) / 2, 'point-left'); bub.classList.remove('on'); }
        else if (W >= 760) say(nm + ' · ' + tm, 2200);
      }
      function unline() { N.back = performance.now() + 1400; }
      el.addEventListener('pointerenter', () => { N.hover = true; pose('hello'); if (!N.greeted) { N.greeted = true; say('Hi! Click me for a tip.', 2200); } });
      el.addEventListener('pointerleave', () => { N.hover = false; });
      el.addEventListener('pointerdown', () => { if (!RM && sq && sq.animate) sq.animate([{ transform: 'none' }, { transform: 'scale(.9,.86)', offset: .25 }, { transform: 'scale(1.03,1.02)', offset: .7 }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' }); });
      el.addEventListener('click', e => { e.stopPropagation(); pose('celebrate'); say(TIPS[N.tip++ % TIPS.length], 3800); setTimeout(() => { if (N.pose === 'celebrate') pose('hello'); }, 1000); });
      new MutationObserver(() => { if (root.classList.contains('is-signed') && !N.loved) { N.loved = true; pose('love'); say('Thank you! Kick-off comes next.', 4200); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
      function arrive(x, y, p, t, ms) {
        N.x = N.tx = x; N.y = N.ty = y; lastX = x; pose(p || 'hello');
        el.classList.add('on'); update(performance.now(), 0);
        if (!RM && el.animate) $('.nexi-in', el).animate([{ transform: 'translate(40px,-60px) scale(1.6)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'none', opacity: 1 }], { duration: 640, easing: 'cubic-bezier(.16,1,.3,1)' });
        if (t) setTimeout(() => say(t, ms || 3000), RM ? 0 : 480);
      }
      function enter(t, ms) { const c = corner(); arrive(c.x, c.y, 'hello', t, ms); }
      return { update, line, unline, arrive, enter, home, say, pose, restation: () => { if (!N.back) home(); } };
    })();

    function dial(W, H) { const phone = W < 760; return { cx: W / 2, cy: H * (phone ? .33 : .36), r: phone ? Math.min(W * .34, 132) : Math.min(H * .23, 210) }; }

    /* ---------- public ---------- */
    return {
      get introActive() { return S.introActive; },
      pickAt, dial,
      heroStart() {
        layoutHero(); S.mode = 'hero'; S.cv = bg; S.ctx = bg.getContext('2d'); size(bg, S.W, S.H);
        const now = performance.now(), gaps = [0, 70, 120, 190, 230, 300];
        nodes.forEach(n => { n.size = n.mine ? 38 : 32; n.x = n.hx; n.y = n.hy; n.a = 0; n.tw = n.show ? { fx: n.hx, fy: n.hy, tx: n.hx, ty: n.hy, fa: 0, ta: 1, fs: 1.55, ts: 1, s: now + 520 + gaps[n.rank] + (n.side > 0 ? 40 : 0), d: 520, e: soft } : null; });
        S.nextPulse = now + 1900;
        if (RM) Promise.all(nodes.map(n => n.img.decode ? n.img.decode().catch(() => 0) : 0)).then(staticDraw); else start();
        afterFonts();
        if (NX) NX.enter(S.W < 760 ? null : 'Point at a line to see where it comes from.', 4200);
      },
      introStart(cv, zonesFn, nexiAt) {
        S.introActive = true; S.mode = 'intro'; S.cv = cv; S.ctx = cv.getContext('2d');
        const W = cv.clientWidth, H = cv.clientHeight; S.W = W; S.H = H; size(cv, W, H);
        layoutHero(); S.W = W; S.H = H;
        S.dial = dial(W, H); S.rot = 0; S.rotOff = 0; S.trackA = 1; S.trackP = 0;
        const now = performance.now(), N = nodes.length;
        nodes.forEach((n, i) => {
          n.ang = -Math.PI / 2 + i / N * 6.283; n.size = n.mine ? (W < 760 ? 32 : 40) : (W < 760 ? 26 : 32);
          const tx = S.dial.cx + Math.cos(n.ang) * S.dial.r, ty = S.dial.cy + Math.sin(n.ang) * S.dial.r;
          n.x = tx; n.y = ty; n.a = 0;
          n.tw = { fx: tx, fy: ty, tx, ty, fa: 0, ta: 1, fs: 2.1, ts: 1, s: now + 380 + i * 55 + (i % 3) * 12, d: 480, e: soft };
        });
        const tStart = now + 300;
        const tick = () => { const k = (performance.now() - tStart) / 900; S.trackP = Math.max(0, Math.min(1, soft(k))); if (k < 1 && S.mode === 'intro') requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        start();
        if (NX && nexiAt) setTimeout(() => { const p = nexiAt(); NX.arrive(p.x, p.y, 'hello', W < 760 ? null : 'Hi, Mr. Dela Cruz! I’m Nexi.'); }, 1050);
      },
      handoff(done) {
        layoutHero(); const W = S.W, H = S.H, now = performance.now(), win = $('.hero-win', coverEl), crumb = win && $('.crumb img', win), cr = crumb ? rel(crumb) : null;
        S.W = innerWidth; S.H = innerHeight;
        const fade = () => { const k0 = performance.now(); const f = () => { const k = (performance.now() - k0) / 500; S.trackA = Math.max(0, 1 - k); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
        fade();
        nodes.forEach((n, i) => {
          const gx = n.show ? n.hx : cr ? cr.l + cr.w / 2 : W / 2, gy = n.show ? n.hy : cr ? cr.t + cr.h / 2 : H / 2;
          n.tw = { fx: n.x, fy: n.y, tx: gx, ty: gy, fa: n.a, ta: n.show ? 1 : 0, fs: n.sc, ts: n.show ? 1 : .4, s: now + 40 + i * 36, d: 760, e: soft };
          if (n.show) n.size = n.mine ? 38 : 32;
        });
        if (NX) setTimeout(() => NX.home(coverEl.clientWidth < 760 ? null : 'Point at a line to see where it comes from.', 4200), 240);
        setTimeout(() => {
          S.mode = 'hero'; S.introActive = false; S.dial = null; S.cv = bg; S.ctx = bg.getContext('2d');
          S.W = coverEl.clientWidth; S.H = coverEl.clientHeight; size(bg, S.W, S.H);
          S.nextPulse = performance.now() + 1600; afterFonts();
          done && done();
        }, 1100);
      },
      skipIntro() {
        S.introActive = false; S.mode = 'hero'; S.dial = null; S.cv = bg; S.ctx = bg.getContext('2d');
        layoutHero(); size(bg, S.W, S.H);
        nodes.forEach(n => { n.tw = null; n.x = n.hx; n.y = n.hy; n.a = n.show ? 1 : 0; n.sc = 1; n.size = n.mine ? 38 : 32; });
        S.nextPulse = performance.now() + 1200;
        if (NX) NX.home();
      }
    };
  })();

  /* ---------- start the hero (with or without the intro) ---------- */
  function startHero() {
    requestAnimationFrame(heroIntro);
    setTimeout(() => cover.classList.add('is-ready'), 1200);
    if (FX && !FX.introActive) { try { FX.heroStart(); } catch (e) { /* the hero still works without FX */ } }
    $$('[data-cd]').forEach(el => {
      const d = Math.ceil((new Date(el.dataset.cd + 'T00:00:00+08:00') - Date.now()) / 864e5), f = el.dataset.f || '{n} days';
      if (d < 0) { el.textContent = ''; return; }
      el.textContent = f.replace('{n}', d);
      if (!RM && !el.dataset.done) { el.dataset.done = 1; setTimeout(() => tween(0, d, 900, v => { el.textContent = f.replace('{n}', Math.round(v)); }), 700); }
    });
  }

  /* ---------- arrival intro: the Odoo apps gather, the plane lands, Nexi says hello ---------- */
  function runIntro() {
    const box = $('[data-intro]'); if (!box) return false;
    let seen = false;
    try { seen = sessionStorage.getItem('tnp-intro') === '1'; } catch (e) { /* storage blocked: play it */ }
    const ok = FX && !RM && !seen && !location.hash && scrollY < 4 && window.CSS && CSS.supports('offset-path', 'path("M0 0")') && box.animate;
    if (!ok) { box.remove(); return false; }
    try { sessionStorage.setItem('tnp-intro', '1'); } catch (e) { /* ignore */ }
    const mainEl = $('#main'), plane = $('[data-intro-plane]', box), trail = $('[data-intro-trail]', box), svg = $('.intro-trail', box), line = $('[data-intro-line]', box), words = $$('span', line), act = $('[data-intro-act]', box), openB = $('[data-intro-open]', box), skip = $('[data-intro-skip]', box), cv = $('[data-intro-canvas]', box);
    box.hidden = false; root.classList.add('intro-on'); if (mainEl) mainEl.inert = true;
    const wis = words.map(w => { const i = document.createElement('span'); i.className = 'wi'; while (w.firstChild) i.appendChild(w.firstChild); w.appendChild(i); return i; });
    const numW = words.find(w => /\d/.test(w.textContent)), numWi = numW && $('.wi', numW), numTxt = numW ? numW.textContent : '';
    const hint = $('.intro-hint', box); if (hint && matchMedia('(pointer: coarse)').matches) hint.textContent = 'Tap the button to open, or tap an app to see its name.';
    let done = false, anims = [], auto = 0, viaKey = false;
    const cleanup = () => { removeEventListener('keydown', onKey); removeEventListener('wheel', onWheel); removeEventListener('scroll', onScroll2); clearTimeout(auto); };
    const end = () => { box.remove(); root.classList.remove('intro-on'); if (mainEl) mainEl.inert = false; const c = $('.hero2 .btn-primary'); if (c && viaKey) c.focus({ preventScroll: true }); else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); };
    function open() {
      if (done) return; done = true; cleanup();
      const exitE = 'cubic-bezier(.55,0,.9,.35)', moveE = 'cubic-bezier(.65,0,.25,1)';
      const ttl = $('.hero-win .o-ttl', cover), logo = $('.cover-top .lockup .tn', cover);
      const tR = ttl && ttl.getBoundingClientRect(), lR = logo && logo.getBoundingClientRect();
      box.classList.add('opening');
      /* the words leave upwards through their masks; the proposal number travels into the quotation */
      wis.forEach((w, i) => { if (w === numWi) return; anims.push(w.animate([{ transform: 'none' }, { transform: 'translateY(-108%)' }], { duration: 260, delay: i * 22, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })); });
      if (numW && tR && tR.top > 0 && tR.bottom < innerHeight) {
        const r = numW.getBoundingClientRect(), k = parseFloat(getComputedStyle(ttl).fontSize) / parseFloat(getComputedStyle(numW).fontSize);
        numW.style.transformOrigin = '0 0'; numW.style.overflow = 'visible'; ttl.style.visibility = 'hidden';
        const f = numW.animate([{ transform: 'none', color: '#1F1F3D' }, { transform: 'translate(' + (tR.left - r.left) + 'px,' + (tR.top - r.top + (tR.height - r.height * k) / 2) + 'px) scale(' + k + ')', color: '#1F1F3D' }], { duration: 780, delay: 60, easing: moveE, fill: 'forwards' });
        anims.push(f); f.onfinish = () => { ttl.style.visibility = ''; numW.style.opacity = 0; };
        setTimeout(() => { ttl.style.visibility = ''; }, 1300);
      } else if (numWi) anims.push(numWi.animate([{ transform: 'none' }, { transform: 'translateY(-108%)' }], { duration: 340, easing: exitE, fill: 'forwards' }));
      /* the plane flies home into the logo's plane mark */
      if (lR && lR.width) {
        const pr = plane.getBoundingClientRect(), x0 = pr.left + pr.width / 2, y0 = pr.top + pr.height / 2;
        const L = trail.getTotalLength(), a = trail.getPointAtLength(Math.max(0, mid * L - 2)), b = trail.getPointAtLength(Math.min(L, mid * L + 2));
        const ang0 = Math.atan2(b.y - a.y, b.x - a.x) + 35 * Math.PI / 180, w = plane.offsetWidth, h = plane.offsetHeight;
        const x2 = lR.left + lR.width * .0945, y2 = lR.top + lR.height * .497, s2 = lR.width * .155 / w;
        const x1 = (x0 + x2) / 2 - 80, y1 = Math.min(y0, y2) - 140;
        anims.forEach(an => { if (an.effect && an.effect.target === plane) an.cancel(); });
        plane.style.offsetPath = 'none';
        const kf = []; for (let i = 0; i <= 14; i++) { const t = i / 14, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, u = 1 - e;
          const x = u * u * x0 + 2 * u * e * x1 + e * e * x2, y = u * u * y0 + 2 * u * e * y1 + e * e * y2, ang = ang0 * (1 - e), s = 1 + (s2 - 1) * e;
          kf.push({ transform: 'translate(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px) rotate(' + ang + 'rad) scale(' + s + ')', opacity: t > .9 ? 1 - (t - .9) * 10 : 1 }); }
        const pf = plane.animate(kf, { duration: 860, easing: 'linear', fill: 'forwards' }); anims.push(pf);
        pf.onfinish = () => { logo.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: .35 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
      }
      /* the hero answers: the headline rises again from its mask, then the CAS line and the buttons */
      cover.classList.add('rehero'); void cover.offsetWidth;
      requestAnimationFrame(() => { cover.classList.remove('rehero'); cover.classList.add('reveal'); });
      FX.handoff(end);
    }
    function skipNow() { if (done) return; done = true; cleanup(); anims.forEach(a => a.cancel()); FX.skipIntro(); cover.classList.add('reveal'); end(); }
    const onKey = e => { viaKey = true; if (e.key === 'Escape') { e.preventDefault(); skipNow(); } else if (['Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key) && !e.target.closest('[data-intro-skip]')) { e.preventDefault(); open(); } };
    const onWheel = () => open();
    const onScroll2 = () => { if (scrollY > 8) skipNow(); };
    try {
      const W = innerWidth, H = innerHeight, D = FX.dial(W, H), cx = D.cx, cy = D.cy;
      line.style.top = (cy + D.r + (W < 760 ? 40 : 54)) + 'px';
      const sx = -.14 * W, sy = .95 * H, c1x = .16 * W, c1y = .55 * H, ex = 1.16 * W, ey = -.16 * H;
      const d = 'M' + sx + ',' + sy + ' Q' + c1x + ',' + c1y + ' ' + cx + ',' + cy + ' T' + ex + ',' + ey;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); trail.setAttribute('d', d);
      const half = document.createElementNS('http://www.w3.org/2000/svg', 'path'); half.setAttribute('d', 'M' + sx + ',' + sy + ' Q' + c1x + ',' + c1y + ' ' + cx + ',' + cy); svg.appendChild(half);
      var mid = half.getTotalLength() / trail.getTotalLength(), mPct = (mid * 100).toFixed(2) + '%'; half.remove();
      plane.style.offsetPath = 'path("' + d + '")';
      act.style.top = (line.offsetTop + line.offsetHeight + 22) + 'px';
      const lr = () => { const b = line.getBoundingClientRect(), a = act.getBoundingClientRect(), p = plane.getBoundingClientRect(); return [{ l: b.left - 30, t: b.top - 14, r: b.right + 30, b: b.bottom + 10 }, { l: Math.min(a.left, W / 2 - 160), t: a.top - 6, r: Math.max(a.right, W / 2 + 160), b: a.bottom + 50 }, { l: cx - 70, t: cy - 60, r: cx + 70, b: cy + 60 }, { l: cx + (W < 760 ? -70 : 210), t: cy - (W < 760 ? 230 : 110), r: cx + (W < 760 ? 70 : 380), b: cy + (W < 760 ? -80 : 90) }]; };
      const nexiAt = () => W < 760 ? { x: cx, y: cy - D.r - 70 } : { x: cx + D.r + 130, y: cy - 6 };
      const land = 'cubic-bezier(.16,1,.3,1)';
      anims.push(plane.animate([{ offsetDistance: '0%', transform: 'scale(2.6)', opacity: 0 }, { opacity: 1, offset: .12 }, { offsetDistance: mPct, transform: 'scale(1)', opacity: 1 }], { duration: 820, delay: 120, easing: land, fill: 'both' }));
      anims.push(trail.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 1 - mid }], { duration: 820, delay: 120, easing: land, fill: 'both' }));
      words.forEach(w => { w.style.opacity = 1; });
      wis.forEach((w, i) => anims.push(w.animate([{ transform: 'translateY(108%)' }, { transform: 'none' }], { duration: 560, delay: 420 + i * 70 + (i % 2) * 18, easing: land, fill: 'both' })));
      if (numWi) {
        const t0 = performance.now() + 470, dur = 720, fin = numTxt.split('');
        const roll = () => { if (done) { numWi.textContent = numTxt; return; } const k = (performance.now() - t0) / dur;
          numWi.textContent = fin.map((ch, j) => !/\d/.test(ch) || k > .25 + j * .13 ? ch : String((Math.floor(performance.now() / 45) + j * 3) % 10)).join('');
          if (k < 1.1) requestAnimationFrame(roll); else numWi.textContent = numTxt; };
        requestAnimationFrame(roll);
      }
      box.style.setProperty('--gx', cx + 'px'); box.style.setProperty('--gy', cy + 'px'); box.classList.add('grid-in');
      FX.introStart(cv, lr, nexiAt);
      startHero();
      setTimeout(() => { if (done) return; act.classList.add('on'); openB.focus({ preventScroll: true }); }, 1450);
      auto = setTimeout(open, 9000);
      openB.addEventListener('click', open);
      skip.addEventListener('click', skipNow);
      box.addEventListener('click', e => { if (e.target.closest('button')) return; if (FX.pickAt(e.clientX, e.clientY)) return; open(); });
      addEventListener('keydown', onKey);
      addEventListener('wheel', onWheel, { passive: true });
      addEventListener('scroll', onScroll2, { passive: true });
    } catch (err) { cleanup(); box.remove(); root.classList.remove('intro-on'); if (mainEl) mainEl.inert = false; return false; }
    return true;
  }

  /* ---------------- cover replay (plays once) ---------------- */
  const cover = $('.cover');
  function heroIntro() {
    cover.classList.add('is-ready');
    if (RM) return;
    const rows = $$('.o-lines tbody tr', cover);
    rows.forEach(r => r.classList.add('off'));
    const st = $$('.o-status [data-st]', cover);
    if (st.length < 2) return;
    st[0].className = 'on'; st[1].className = '';
    rows.forEach((r, i) => setTimeout(() => r.classList.remove('off'), 700 + i * 240));
    setTimeout(() => { if (!root.classList.contains('is-signed')) { st[0].className = 'done'; st[1].className = 'on'; } }, 2300);
    $$('[data-hero-pack] .ic', cover).forEach((ic, i) => setTimeout(() => ic.classList.add('in'), 1500 + i * 220));
  }

  recalc();
  fromHash(true);
  moveInd();
  heroScroll();
  if (!runIntro()) startHero();
  window.__tnp = 1;
  /* the other Nexi poses load once the page is idle */
  const lazyPoses = () => $$('.nexi-pose[data-src]').forEach(i => { if (!i.getAttribute('src')) i.src = i.dataset.src; });
  if (document.readyState === 'complete') (window.requestIdleCallback || setTimeout)(lazyPoses, 1500);
  else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(lazyPoses, { timeout: 2500 }), { once: true });
})();
