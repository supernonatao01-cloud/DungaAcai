/* Dunga — interações e animações de scroll */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* WhatsApp de cada unidade — preencha só com DDI+DDD+número, ex.: '5583999999999'.
     Enquanto estiver vazio, o botão de WhatsApp da unidade fica escondido. */
  const WHATS = { caj: '5583993164413', uir: '5583993743751' };
  const WHATS_MSG = 'Olá! Vim pelo site da Dunga Açaí & Gelatos.';
  $$('[data-whats]').forEach(a => {
    const n = WHATS[a.dataset.whats];
    if (!n) return;
    a.href = `https://wa.me/${n}?text=${encodeURIComponent(WHATS_MSG)}`;
    a.hidden = false;
  });

  $('#yr').textContent = new Date().getFullYear();

  /* split de títulos em palavras */
  $$('[data-words]').forEach(el => {
    let i = 0;
    const wrap = (txt, into) => txt.split(/(\s+)/).forEach(tok => {
      if (!tok.trim()) { into.append(tok); return; }
      const w = document.createElement('span'); w.className = 'w';
      const s = document.createElement('span'); s.textContent = tok; s.style.setProperty('--i', i++);
      w.append(s); into.append(w);
    });
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment(); wrap(n.textContent, frag); n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        if (n.tagName === 'EM') { const t = n.textContent; n.textContent = ''; wrap(t, n); } else walk(n);
      }
    });
    walk(el);
  });

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, [data-words]').forEach(el => io.observe(el));
  setTimeout(() => $('.hero__title')?.classList.add('in'), 150);

  /* promoção de hoje */
  const days = [{ d: 3, n: 'Quarta do Açaí' }, { d: 4, n: 'Quinta do Milk Shake' }];
  const today = new Date().getDay();
  const hit = days.find(x => x.d === today);
  const chip = $('#todayChip'), txt = $('#todayTxt');
  if (hit) {
    $(`.promo[data-day="${hit.d}"]`)?.classList.add('is-today');
    $(`.promo[data-day="${hit.d}"] .promo__badge`)?.removeAttribute('hidden');
    txt.textContent = `Hoje é ${hit.n}! Aproveite.`;
  } else {
    const next = days.map(x => ({ ...x, diff: (x.d - today + 7) % 7 })).sort((a, b) => a.diff - b.diff)[0];
    txt.textContent = next.diff === 1 ? `Amanhã tem ${next.n}!` : `Próxima promoção: ${next.n}`;
  }
  chip.hidden = false;

  /* scroll: progresso, nav, tabbar */
  const bar = $('.progress'), nav = $('#topbar');
  let lastY = scrollY;
  const tabs = $$('.tabbar a[data-tab]');
  const secs = tabs.map(t => $('#' + t.dataset.tab));
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--sp', h > 0 ? clamp(y / h) : 0);
    nav.classList.toggle('hide', y > lastY && y > 400 && !nav.matches(':hover'));
    lastY = y;
    let cur = 0;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
    tabs.forEach((t, i) => t.setAttribute('aria-current', i === cur ? 'true' : 'false'));
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  /* palco do hero: parallax com o mouse */
  const stage = $('[data-stage]');
  if (stage && !reduce) {
    const items = $$('[data-depth]', stage);
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5);
    }, { passive: true });
    (function loop() {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      items.forEach(el => {
        const d = +el.dataset.depth;
        el.style.translate = `${(-cx * d).toFixed(2)}px ${(-cy * d).toFixed(2)}px`;
      });
      requestAnimationFrame(loop);
    })();
  }

  /* tilt 3D nos cards */
  if (!reduce) $$('[data-tilt]').forEach(el => {
    const max = 7;
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transition = 'transform .08s linear';
      el.style.transform = `perspective(1000px) rotateX(${(.5 - py) * max}deg) rotateY(${(px - .5) * max * 1.4}deg) scale(1.015)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transition = ''; el.style.transform = ''; });
  });

  /* feedback de toque nos botões */
  $$('[data-press]').forEach(b => {
    b.addEventListener('pointerdown', () => b.classList.add('is-pressed'));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => b.classList.remove('is-pressed')));
  });

  /* seletor de unidade (dialog) */
  const sheet = $('#sheet');
  $$('[data-open-order]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); sheet.showModal(); }));
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });

  /* botão flutuante some quando o CTA ou unidades estão visíveis */
  const fab = $('.fab');
  if (fab) {
    const seen = new Set();
    const fio = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      fab.style.opacity = seen.size ? 0 : 1; fab.style.pointerEvents = seen.size ? 'none' : 'auto';
    }, { threshold: .25 });
    $$('#unidades, .final, .hero').forEach(s => fio.observe(s));
  }
})();
