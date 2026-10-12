/**
 * ITER — La Energía de las Estrellas
 * main.js — Interacciones, animaciones y lógica principal
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. UTILIDADES
───────────────────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function on(el, event, fn, opts) {
  if (!el) return;
  el.addEventListener(event, fn, opts);
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function lerp(a, b, t)    { return a + (b - a) * t; }

function ready(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ─────────────────────────────────────────────────────────────
   2. PROGRESS BAR
───────────────────────────────────────────────────────────── */
function initProgressBar() {
  const bar = qs('#progressBar');
  if (!bar) return;
  let ticking = false;

  function update() {
    const scrollTop = window.scrollY;
    const docH     = document.documentElement.scrollHeight - window.innerHeight;
    const pct      = docH > 0 ? (scrollTop / docH) * 100 : 0;
    bar.style.width = clamp(pct, 0, 100) + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   3. NAVBAR — scroll + menú móvil
───────────────────────────────────────────────────────────── */
function initNav() {
  const nav        = qs('#nav');
  const menuBtn    = qs('#menuBtn');
  const menuClose  = qs('#menuClose');
  const mobileMenu = qs('#mobileMenu');
  const mobileLinks = qsa('.nav__mobile-link');
  const navLinks    = qsa('.nav__link');

  /* Clase --scrolled */
  function onScroll() {
    nav?.classList.toggle('nav--scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Abrir / cerrar menú móvil */
  function openMenu() {
    mobileMenu?.classList.add('open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    menuClose?.focus();
  }
  function closeMenu() {
    mobileMenu?.classList.remove('open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuBtn?.focus();
  }

  on(menuBtn,   'click',   openMenu);
  on(menuClose, 'click',   closeMenu);
  mobileLinks.forEach(l => on(l, 'click', closeMenu));
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) closeMenu();
  });

  /* Link activo al hacer scroll */
  const sections = qsa('section[id]');
  function updateActive() {
    const mid = window.scrollY + window.innerHeight / 2;
    let current = '';
    sections.forEach(s => { if (s.offsetTop <= mid) current = s.id; });
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href')?.slice(1) === current);
    });
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  /* Focus trap en menú móvil */
  on(document, 'keydown', e => {
    if (!mobileMenu?.classList.contains('open') || e.key !== 'Tab') return;
    const focusable = qsa('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', mobileMenu);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}


/* ─────────────────────────────────────────────────────────────
   4. BACK TO TOP
───────────────────────────────────────────────────────────── */
function initBackToTop() {
  const btn = qs('#backToTop');
  if (!btn) return;
  const toggle = () => { btn.hidden = window.scrollY <= 500; };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  on(btn, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}


/* ─────────────────────────────────────────────────────────────
   5. REVEAL ON SCROLL
───────────────────────────────────────────────────────────── */
function initReveal() {
  const els = qsa('.reveal');
  if (!els.length) return;

  if (prefersReduced) { els.forEach(el => el.classList.add('visible')); return; }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, _, arr) => {
    /* Escalonar hermanos directos */
    const siblings = Array.from(el.parentElement?.querySelectorAll(':scope > .reveal') ?? []);
    const idx = siblings.indexOf(el);
    if (idx > 0) el.dataset.delay = String(idx * 80);
    obs.observe(el);
  });
}


/* ─────────────────────────────────────────────────────────────
   6. HERO — reveal escalonado + contadores animados
───────────────────────────────────────────────────────────── */
function initHero() {
  /* Reveal escalonado */
  const items = [
    { el: qs('.hero__eyebrow'), delay: 200 },
    { el: qs('.hero__title'),   delay: 400 },
    { el: qs('.hero__subtitle'),delay: 600 },
    { el: qs('.hero__cta'),     delay: 800 },
    { el: qs('.hero__stats'),   delay: 1000 },
  ];
  items.forEach(({ el, delay }) => {
    if (!el) return;
    if (prefersReduced) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
    el.style.transition = 'opacity .7s ease, transform .7s ease';
    setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, delay);
  });

  /* Contadores */
  const statEls = qsa('.hero__stat-number[data-target]');
  if (!statEls.length) return;
  let triggered = false;
  const statsEl = qs('.hero__stats');
  if (!statsEl) return;

  const obs = new IntersectionObserver(entries => {
    if (triggered || !entries[0].isIntersecting) return;
    triggered = true;
    statEls.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur    = 1600;
      const start  = performance.now();

      function tick(now) {
        const t    = clamp((now - start) / dur, 0, 1);
        const ease = 1 - Math.pow(1 - t, 4); // easeOutQuart
        el.textContent = prefix + Math.round(lerp(0, target, ease)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    obs.disconnect();
  }, { threshold: 0.5 });
  obs.observe(statsEl);
}


/* ─────────────────────────────────────────────────────────────
   7. SMOOTH ANCHOR SCROLL
───────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  on(document, 'click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = qs(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = qs('#nav')?.offsetHeight ?? 70;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: 'smooth' });
  });
}


/* ─────────────────────────────────────────────────────────────
   8. COMPARE TABS (Fisión / Fusión)
───────────────────────────────────────────────────────────── */
function initCompareTabs() {
  const tabs   = qsa('.compare__tab');
  const panels = qsa('.compare__panel');
  if (!tabs.length) return;

  function activate(tab) {
    const id = tab.dataset.tab;
    tabs.forEach(t => {
      const active = t.dataset.tab === id;
      t.classList.toggle('compare__tab--active', active);
      t.setAttribute('aria-selected', String(active));
    });
    panels.forEach(p => {
      const active = p.id === `panel-${id}`;
      p.classList.toggle('compare__panel--active', active);
      p.hidden = !active;
    });
  }

  tabs.forEach(tab => {
    on(tab, 'click', () => activate(tab));
    on(tab, 'keydown', e => {
      const idx = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') { e.preventDefault(); const next = tabs[(idx + 1) % tabs.length]; next.focus(); activate(next); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); const prev = tabs[(idx - 1 + tabs.length) % tabs.length]; prev.focus(); activate(prev); }
    });
  });
}


/* ─────────────────────────────────────────────────────────────
   9. TOKAMAK INTERACTIVO
───────────────────────────────────────────────────────────── */
function initTokamak() {
  const parts     = qsa('.tok-part');
  const labels    = qsa('.tok-label');
  const infoPanels = qsa('.tok-info-panel', qs('#tokamakInfo') ?? document);
  if (!parts.length) return;

  function show(partId) {
    infoPanels.forEach(p => { p.hidden = p.dataset.part !== partId; });
    labels.forEach(l  => l.classList.toggle('active', l.dataset.part === partId));
    parts.forEach(p   => p.classList.toggle('tok-part--active', p.dataset.part === partId));
  }

  /* Mostrar default */
  show('default');

  parts.forEach(part => {
    const id = part.dataset.part;
    on(part, 'click', () => show(id));
    on(part, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(id); } });
    on(part, 'mouseenter', () => labels.forEach(l => { if (l.dataset.part === id) l.style.color = 'var(--clr-cyan)'; }));
    on(part, 'mouseleave', () => labels.forEach(l => { if (l.dataset.part === id && !l.classList.contains('active')) l.style.color = ''; }));
  });

  labels.forEach(label => {
    label.style.pointerEvents = 'auto';
    on(label, 'click', () => show(label.dataset.part));
  });
}


/* ─────────────────────────────────────────────────────────────
   10. CHALLENGE CARDS — expandibles
───────────────────────────────────────────────────────────── */
function initChallengeCards() {
  const toggles = qsa('.challenge-card__toggle');

  toggles.forEach(btn => {
    const card       = btn.closest('.challenge-card');
    const expandable = card?.querySelector('.challenge-card__expandable');
    if (!expandable) return;

    on(btn, 'click', () => {
      const isOpen = expandable.classList.contains('open');
      expandable.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.innerHTML = isOpen
        ? 'Ver detalles <span aria-hidden="true">↓</span>'
        : 'Ocultar detalles <span aria-hidden="true">↑</span>';

      if (!isOpen) {
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
      }
    });
  });
}


/* ─────────────────────────────────────────────────────────────
   11. Q METER — animación de barras al entrar en viewport
───────────────────────────────────────────────────────────── */
function initQMeter() {
  const qMeter = qs('.q-meter');
  if (!qMeter || prefersReduced) return;

  const bars    = qsa('.q-scale__bar', qMeter);
  const targets = bars.map(b => b.style.height || '0%');
  bars.forEach(b => { b.style.height = '0%'; b.style.transition = 'none'; });

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    bars.forEach((b, i) => {
      setTimeout(() => {
        b.style.transition = 'height 1s cubic-bezier(0.34,1.1,0.64,1)';
        b.style.height = targets[i];
      }, i * 150);
    });
    obs.disconnect();
  }, { threshold: 0.4 });
  obs.observe(qMeter);
}


/* ─────────────────────────────────────────────────────────────
   12. SYNTHESIS FLOW — entrada animada
───────────────────────────────────────────────────────────── */
function initSynthesisFlow() {
  const flows = qsa('.synthesis__flow');
  if (!flows.length || prefersReduced) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const items  = qsa('.syn-item',  entry.target);
      const arrows = qsa('.syn-arrow', entry.target);
      items.forEach((item, i) => {
        item.style.opacity = '0'; item.style.transform = 'translateY(12px)';
        setTimeout(() => {
          item.style.transition = 'opacity .5s ease, transform .5s ease';
          item.style.opacity = '1'; item.style.transform = 'translateY(0)';
        }, i * 120);
      });
      arrows.forEach((a, i) => {
        a.style.opacity = '0';
        setTimeout(() => { a.style.transition = 'opacity .4s ease'; a.style.opacity = '.5'; }, (i + 1) * 120 + 60);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  flows.forEach(f => obs.observe(f));
}


/* ─────────────────────────────────────────────────────────────
   13. TIMELINE — entrada animada
───────────────────────────────────────────────────────────── */
function initTimeline() {
  const items = qsa('.timeline__item');
  if (!items.length || prefersReduced) return;

  items.forEach(item => { item.style.opacity = '0'; item.style.transform = 'translateY(20px)'; });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.transition = 'opacity .6s ease, transform .6s ease';
      entry.target.style.opacity    = '1';
      entry.target.style.transform  = 'translateY(0)';
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  items.forEach(i => obs.observe(i));
}


/* ─────────────────────────────────────────────────────────────
   14. VIABILITY TABLE — highlight de filas al hover
───────────────────────────────────────────────────────────── */
function initViabilityTable() {
  const rows = qsa('.vt-row');
  rows.forEach(row => {
    on(row, 'mouseenter', () => row.style.background = 'rgba(6,182,212,.05)');
    on(row, 'mouseleave', () => row.style.background = '');
  });

  /* Animación de entrada de los badges */
  const wrap = qs('.vt-wrap');
  if (!wrap || prefersReduced) return;

  const badges = qsa('.vt-badge', wrap);
  badges.forEach(b => { b.style.opacity = '0'; b.style.transform = 'scale(.8)'; });

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    badges.forEach((b, i) => {
      setTimeout(() => {
        b.style.transition = 'opacity .4s ease, transform .4s var(--ease-bounce, cubic-bezier(.34,1.56,.64,1))';
        b.style.opacity    = '1';
        b.style.transform  = 'scale(1)';
      }, i * 40);
    });
    obs.disconnect();
  }, { threshold: 0.3 });
  obs.observe(wrap);
}


/* ─────────────────────────────────────────────────────────────
   15. HEATING CARDS — hover glow
───────────────────────────────────────────────────────────── */
function initHeatingCards() {
  const cards = qsa('.heating__item');
  cards.forEach(card => {
    on(card, 'mouseenter', () => { card.style.borderColor = 'rgba(6,182,212,.3)'; card.style.boxShadow = '0 0 20px rgba(6,182,212,.12)'; });
    on(card, 'mouseleave', () => { card.style.borderColor = ''; card.style.boxShadow = ''; });
  });
}


/* ─────────────────────────────────────────────────────────────
   16. SECONDARY CARDS — expandir al hacer clic en el icono
    (Tarjetas secundarias ya muestran todo, solo añadimos hover)
───────────────────────────────────────────────────────────── */
function initSecondaryCards() {
  const cards = qsa('.secondary-card');
  cards.forEach(card => {
    on(card, 'mouseenter', () => { card.style.borderColor = 'rgba(6,182,212,.35)'; });
    on(card, 'mouseleave', () => { card.style.borderColor = ''; });
  });
}


/* ─────────────────────────────────────────────────────────────
   17. DELAY NOTE — animación de entrada suave
───────────────────────────────────────────────────────────── */
function initDelayNote() {
  const note = qs('.delay-note');
  if (!note || prefersReduced) return;
  note.style.opacity   = '0';
  note.style.transform = 'translateX(-12px)';

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    note.style.transition = 'opacity .6s ease, transform .6s ease';
    note.style.opacity    = '1';
    note.style.transform  = 'translateX(0)';
    obs.disconnect();
  }, { threshold: 0.5 });
  obs.observe(note);
}


/* ─────────────────────────────────────────────────────────────
   18. HERO PARALLAX — overlay al hacer scroll
───────────────────────────────────────────────────────────── */
function initHeroParallax() {
  const overlay = qs('.hero__overlay');
  if (!overlay || prefersReduced) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const heroH = qs('.hero')?.offsetHeight ?? window.innerHeight;
      if (window.scrollY < heroH) overlay.style.opacity = String(0.7 + (window.scrollY / heroH) * 0.3);
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   19. PLASMA BALL — interacción con mouse
───────────────────────────────────────────────────────────── */
function initPlasmaBall() {
  const ball    = qs('.plasma-ball');
  const parent  = ball?.parentElement;
  if (!ball || !parent || prefersReduced) return;

  on(parent, 'mousemove', e => {
    const r  = ball.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) / r.width;
    const dy = (e.clientY - (r.top  + r.height / 2)) / r.height;
    ball.style.transform = `translate(${dx * 8}px, ${dy * 8}px)`;
  });
  on(parent, 'mouseleave', () => {
    ball.style.transition = 'transform .5s ease';
    ball.style.transform  = '';
    setTimeout(() => { ball.style.transition = ''; }, 500);
  });
}


/* ─────────────────────────────────────────────────────────────
   20. CURSOR GLOW (solo desktop con pointer fino)
───────────────────────────────────────────────────────────── */
function initCursorGlow() {
  if (!window.matchMedia('(pointer: fine)').matches || prefersReduced) return;

  const glow = document.createElement('div');
  Object.assign(glow.style, {
    position: 'fixed', width: '400px', height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6,182,212,.04) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: '1',
    transform: 'translate(-50%,-50%)',
    left: '-999px', top: '-999px',
  });
  document.body.appendChild(glow);

  let mx = -999, my = -999, gx = -999, gy = -999;
  function animate() {
    gx = lerp(gx, mx, .08); gy = lerp(gy, my, .08);
    glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
    requestAnimationFrame(animate);
  }
  on(document, 'mousemove', e => { mx = e.clientX; my = e.clientY; });
  on(document, 'mouseleave', () => { mx = -999; my = -999; });
  animate();
}


/* ─────────────────────────────────────────────────────────────
   21. TOKAMAK PLASMA — pausar animación fuera del viewport
───────────────────────────────────────────────────────────── */
function initTokamakPlasma() {
  const plasma = qs('.tok-plasma');
  if (!plasma) return;
  const obs = new IntersectionObserver(entries => {
    plasma.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
  }, { threshold: 0.1 });
  obs.observe(plasma);
}


/* ─────────────────────────────────────────────────────────────
   22. SECTION OBSERVER — clase in-view
───────────────────────────────────────────────────────────── */
function initSectionObserver() {
  const sections = qsa('section[id]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting));
  }, { threshold: 0.15 });
  sections.forEach(s => obs.observe(s));
}


/* ─────────────────────────────────────────────────────────────
   23. FONTS READY
───────────────────────────────────────────────────────────── */
function initFonts() {
  document.fonts?.ready.then(() => document.documentElement.classList.add('fonts-loaded'));
}


/* ─────────────────────────────────────────────────────────────
   24. INITIALIZACIÓN
───────────────────────────────────────────────────────────── */
ready(() => {
  initProgressBar();
  initNav();
  initBackToTop();
  initSmoothScroll();
  initHero();
  initHeroParallax();
  initReveal();
  initCompareTabs();
  initTokamak();
  initTokamakPlasma();
  initChallengeCards();
  initQMeter();
  initSynthesisFlow();
  initTimeline();
  initViabilityTable();
  initHeatingCards();
  initSecondaryCards();
  initDelayNote();
  initPlasmaBall();
  initSectionObserver();
  initFonts();
  initCursorGlow();

  console.log('%cITER — La Energía de las Estrellas', 'color:#06b6d4;font-size:14px;font-weight:bold;');
  console.log('%cPágina web educativa sobre fusión nuclear', 'color:#94a3b8;font-size:11px;');
});
