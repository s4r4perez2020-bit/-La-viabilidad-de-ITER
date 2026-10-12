/**
 * ITER — La Energía de las Estrellas
 * plasma-animation.js — Simulación de partículas canvas para el hero
 *
 * Simula un plasma de confinamiento magnético:
 * - Partículas de plasma en órbita helicoidal (confinamiento)
 * - Partículas alfa (20% energía restante en el sistema)
 * - Neutrones que escapan (80% energía — sin carga, no confinados)
 * - Líneas de campo magnético toroidal
 * - Disrupciones periódicas aleatorias
 * - Pausa automática cuando la pestaña no es visible
 */

(function () {
  'use strict';

  /* ── CONFIGURACIÓN ──────────────────────────────────────── */
  const CFG = {
    PLASMA_COUNT:      110,
    ALPHA_COUNT:       6,
    FIELD_LINE_COUNT:  10,
    DISRUPTION_EVERY:  8000,   // ms entre disrupciones
    DISRUPTION_DUR:    1200,   // ms duración disrupción
  };

  /* ── PALETA ─────────────────────────────────────────────── */
  const C = {
    ion_hot:  { r:249, g:115, b:22  },   // naranja  — plasma caliente
    ion_warm: { r:6,   g:182, b:212 },   // cian     — plasma medio
    ion_cool: { r:59,  g:130, b:246 },   // azul     — borde
    neutron:  { r:255, g:255, b:255 },   // blanco   — neutrones
    alpha:    { r:16,  g:185, b:129 },   // verde    — partículas alfa
    field:    { r:6,   g:182, b:212 },   // cian     — campo magnético
  };

  /* ── ESTADO GLOBAL ──────────────────────────────────────── */
  let canvas, ctx;
  let W, H, cx, cy;
  let particles  = [];
  let fieldLines = [];
  let running    = false;
  let animId;
  let lastTime   = 0;
  let bgPulse    = 0;

  /* Disrupción */
  let disrupting     = false;
  let disruptTimer   = 0;
  let disruptFactor  = 0;

  /* Preferencia reducida */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── UTILIDADES ─────────────────────────────────────────── */
  const rand    = (a, b)     => a + Math.random() * (b - a);
  const clamp   = (v, a, b)  => Math.min(Math.max(v, a), b);
  const lerp    = (a, b, t)  => a + (b - a) * t;

  function rgba(c, alpha) {
    return `rgba(${c.r},${c.g},${c.b},${clamp(alpha, 0, 1)})`;
  }

  function lerpColor(a, b, t) {
    return { r: Math.round(lerp(a.r, b.r, t)), g: Math.round(lerp(a.g, b.g, t)), b: Math.round(lerp(a.b, b.b, t)) };
  }

  /* ── INICIALIZAR CANVAS ─────────────────────────────────── */
  function initCanvas() {
    canvas = document.getElementById('plasmaCanvas');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    resize();
    return true;
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth  || window.innerWidth;
    H = canvas.offsetHeight || window.innerHeight;
    if (W === 0 || H === 0) return;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    cx = W / 2;
    cy = H / 2;
  }

  /* ── CLASE PARTÍCULA ────────────────────────────────────── */
  class Particle {
    constructor(type) {
      this.type = type; // 'plasma' | 'alpha' | 'neutron'
      this.trail = [];
      this.reset();
    }

    reset() {
      const torusA = W * 0.28;

      if (this.type === 'neutron') {
        /* Neutrones: salen del centro hacia el exterior (no confinados) */
        const angle = rand(0, Math.PI * 2);
        const r     = rand(torusA * 0.05, torusA * 0.2);
        this.x  = cx + Math.cos(angle) * r;
        this.y  = cy + Math.sin(angle) * r;
        const speed = rand(1.8, 3.8);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life    = 1;
        this.decay   = rand(0.01, 0.02);
        this.radius  = rand(1.2, 2.2);
        this.color   = C.neutron;
        this.maxTrail = 6;

      } else if (this.type === 'alpha') {
        /* Partículas alfa: confinadas, radio mayor */
        const angle  = rand(0, Math.PI * 2);
        this.angle   = angle;
        this.orbitR  = rand(torusA * 0.1, torusA * 0.5);
        this.angVel  = rand(0.006, 0.014) * (Math.random() > .5 ? 1 : -1);
        this.phaseZ  = rand(0, Math.PI * 2);
        this.phaseZV = rand(0.012, 0.028);
        this.zAmpl   = H * rand(0.05, 0.1);
        this.x = cx + Math.cos(this.angle) * this.orbitR;
        this.y = cy + Math.sin(this.angle) * this.orbitR;
        this.life    = rand(0.6, 1);
        this.decay   = rand(0.003, 0.007);
        this.radius  = rand(2, 3.5);
        this.color   = C.alpha;
        this.maxTrail = 14;

      } else {
        /* Plasma: confinamiento helicoidal en toro */
        const angle  = rand(0, Math.PI * 2);
        this.angle   = angle;
        this.orbitR  = rand(torusA * 0.04, torusA * 0.88);
        this.angVel  = rand(0.002, 0.009) * (Math.random() > .5 ? 1 : -1);
        this.phaseZ  = rand(0, Math.PI * 2);
        this.phaseZV = rand(0.007, 0.022);
        this.zAmpl   = H * rand(0.03, 0.13);
        this.x = cx + Math.cos(angle) * this.orbitR;
        this.y = cy + Math.sin(angle) * this.orbitR;

        /* Color según temperatura (radio → temperatura) */
        const temp = 1 - (this.orbitR / (torusA * 0.88));
        if (temp > 0.7)       this.color = C.ion_hot;
        else if (temp > 0.35) this.color = lerpColor(C.ion_warm, C.ion_hot, (temp - 0.35) / 0.35);
        else                  this.color = lerpColor(C.ion_cool, C.ion_warm, temp / 0.35);

        this.life    = rand(0.4, 1);
        this.decay   = rand(0.001, 0.004);
        this.radius  = rand(0.7, 3.2);
        this.maxTrail = Math.floor(14 * (this.orbitR / (torusA * 0.88)));
      }
    }

    update(dt, dFactor) {
      /* Guardar trail */
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.shift();

      if (this.type === 'neutron') {
        this.x    += this.vx;
        this.y    += this.vy;
        this.life -= this.decay;

      } else if (this.type === 'alpha') {
        this.angle  += this.angVel  * dt * 60 * (1 + dFactor * 0.4);
        this.phaseZ += this.phaseZV * dt * 60;
        const torusA = W * 0.28;
        const r = this.orbitR * (1 + dFactor * rand(-0.15, 0.15));
        this.x = cx + Math.cos(this.angle) * r;
        this.y = cy + Math.sin(this.angle) * r + Math.sin(this.phaseZ) * this.zAmpl;
        this.life -= this.decay * dt * 60;

      } else {
        const turb = dFactor * rand(-1.2, 1.2);
        this.angle  += this.angVel  * dt * 60 + turb * 0.008;
        this.phaseZ += this.phaseZV * dt * 60;
        const torusA = W * 0.28;
        let r = this.orbitR;
        /* Durante disrupción, partículas del borde se desplazan más */
        if (dFactor > 0.3 && this.orbitR > torusA * 0.6) {
          r = this.orbitR * (1 + dFactor * 0.35 * Math.sin(this.phaseZ));
        }
        this.x = cx + Math.cos(this.angle) * r + turb;
        this.y = cy + Math.sin(this.angle) * r + Math.sin(this.phaseZ) * this.zAmpl + turb * 0.5;
        this.life -= this.decay * dt * 60;
      }

      if (this.life <= 0) this.reset();
      /* Neutrones: recolocar si salen del viewport */
      if (this.type === 'neutron') {
        if (this.x < -60 || this.x > W + 60 || this.y < -60 || this.y > H + 60) this.reset();
      }
    }

    draw() {
      /* Trail */
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = rgba(this.color, this.life * 0.10);
        ctx.lineWidth   = this.radius * 0.5;
        ctx.stroke();
      }

      /* Glow */
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2.8);
      grd.addColorStop(0,   rgba(this.color, this.life * 0.85));
      grd.addColorStop(0.4, rgba(this.color, this.life * 0.35));
      grd.addColorStop(1,   rgba(this.color, 0));
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      /* Núcleo */
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = rgba(this.color, this.life);
      ctx.fill();
    }
  }

  /* ── LÍNEAS DE CAMPO ────────────────────────────────────── */
  class FieldLine {
    constructor(index) {
      const spread   = (Math.PI * 2) / CFG.FIELD_LINE_COUNT;
      this.baseAngle = index * spread;
      this.rRatio    = 0.48 + (index % 3) * 0.13;
      this.opacity   = rand(0.04, 0.09);
    }

    draw(dFactor) {
      const torusA = W * this.rRatio * 0.52;
      const torusB = H * this.rRatio * 0.38;
      const perturb = dFactor * Math.sin(this.baseAngle + Date.now() * 0.0008) * 0.12;
      const rx = torusA * (1 + perturb);
      const ry = torusB * (1 + perturb * 0.5);

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, this.baseAngle * 0.08, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.field, this.opacity * (1 - dFactor * 0.5));
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    }
  }

  /* ── FONDO DINÁMICO ─────────────────────────────────────── */
  function drawBackground(dFactor) {
    /* Fade con trail */
    ctx.fillStyle = `rgba(5,11,24,${disrupting ? 0.14 : 0.22})`;
    ctx.fillRect(0, 0, W, H);

    bgPulse += 0.007;
    const pulseA = (Math.sin(bgPulse) * 0.5 + 0.5) * 0.025 + 0.008;
    const pulseR = (Math.sin(bgPulse * 0.7) * 0.5 + 0.5) * W * 0.2 + W * 0.08;

    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR + W * 0.12);
    if (dFactor > 0.2) {
      /* Disrupción: destello naranja-cian */
      grd.addColorStop(0,   `rgba(249,115,22,${pulseA * (1 + dFactor * 1.4)})`);
      grd.addColorStop(0.3, `rgba(6,182,212,${pulseA * 0.5})`);
      grd.addColorStop(1,   'rgba(5,11,24,0)');
    } else {
      grd.addColorStop(0,   `rgba(6,182,212,${pulseA * 1.4})`);
      grd.addColorStop(0.3, `rgba(59,130,246,${pulseA * 0.55})`);
      grd.addColorStop(1,   'rgba(5,11,24,0)');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── DISRUPCIÓN ─────────────────────────────────────────── */
  function triggerDisruption() {
    if (disrupting) return;
    disrupting   = true;
    disruptTimer = 0;
    /* Emitir neutrones extra */
    for (let i = 0; i < 7; i++) particles.push(new Particle('neutron'));
    setTimeout(() => { disrupting = false; }, CFG.DISRUPTION_DUR);
  }

  /* ── LOOP PRINCIPAL ─────────────────────────────────────── */
  function loop(ts) {
    if (!running) return;
    const dt = clamp((ts - lastTime) / 1000, 0, 0.05);
    lastTime = ts;

    /* Calcular factor de disrupción */
    if (disrupting) {
      disruptTimer += dt * 1000;
      const p = disruptTimer / CFG.DISRUPTION_DUR;
      disruptFactor = p < 0.2 ? p / 0.2 : 1 - ((p - 0.2) / 0.8);
      disruptFactor = clamp(disruptFactor, 0, 1);
    } else {
      disruptFactor = 0;
    }

    drawBackground(disruptFactor);
    fieldLines.forEach(fl => fl.draw(disruptFactor));
    particles.forEach(p  => { p.update(dt, disruptFactor); p.draw(); });

    animId = requestAnimationFrame(loop);
  }

  /* ── CREAR PARTÍCULAS ───────────────────────────────────── */
  function createParticles() {
    particles  = [];
    fieldLines = [];

    for (let i = 0; i < CFG.FIELD_LINE_COUNT; i++) fieldLines.push(new FieldLine(i));

    const count = reduced ? Math.floor(CFG.PLASMA_COUNT * 0.35) : CFG.PLASMA_COUNT;
    for (let i = 0; i < count; i++) {
      const p = new Particle('plasma');
      p.life = rand(0.2, 1);   // estados distribuidos desde el inicio
      particles.push(p);
    }

    if (!reduced) {
      for (let i = 0; i < CFG.ALPHA_COUNT; i++) particles.push(new Particle('alpha'));
    }
  }

  /* ── GESTIÓN DE VISIBILIDAD ─────────────────────────────── */
  function handleVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(animId);
    } else {
      if (!running) {
        running  = true;
        lastTime = performance.now();
        animId   = requestAnimationFrame(loop);
      }
    }
  }

  /* ── INICIALIZACIÓN ─────────────────────────────────────── */
  function init() {
    if (!initCanvas()) return;
    createParticles();

    running  = true;
    lastTime = performance.now();
    animId   = requestAnimationFrame(loop);

    /* Resize con debounce */
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { resize(); createParticles(); }, 200);
    });

    /* Pausar cuando tab no es visible */
    document.addEventListener('visibilitychange', handleVisibility);

    /* Pausar cuando hero sale del viewport */
    const hero = document.querySelector('.hero');
    if (hero) {
      new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          if (!running) { running = true; lastTime = performance.now(); animId = requestAnimationFrame(loop); }
        } else {
          running = false;
          cancelAnimationFrame(animId);
        }
      }, { threshold: 0 }).observe(hero);
    }

    /* Disrupciones periódicas */
    if (!reduced) {
      setTimeout(() => {
        triggerDisruption();
        setInterval(() => {
          if (running && !disrupting && Math.random() < 0.65) triggerDisruption();
        }, CFG.DISRUPTION_EVERY);
      }, 5000);
    }
  }

  /* ── ARRANQUE ───────────────────────────────────────────── */
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
