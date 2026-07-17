/* ============================================================
   TeknikServis Pro – JavaScript
   Interactive Mesh Animation + UI Logic
   ============================================================ */

'use strict';

// ─── INTERACTIVE MESH CANVAS ──────────────────────────────────
(function () {
  const canvas = document.getElementById('mesh-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Config
  const COLS       = 22;
  const ROWS       = 14;
  const MOUSE_PULL = 140;    // px radius of influence
  const STRENGTH   = 0.38;   // how strongly nodes are pulled
  const RETURN_SPD = 0.055;  // spring return speed
  const DAMPING    = 0.78;   // velocity damping
  const DOT_RADIUS = 2.2;
  const LINE_DIST  = 180;    // max line draw distance

  // Color stops for the mesh lines (primary accent palette)
  const PALETTE = ['#6366f1', '#818cf8', '#a78bfa', '#22d3ee', '#6366f1'];

  let W, H, cols, rows;
  let nodes = [];
  let mouse = { x: -9999, y: -9999 };
  let animFrame;

  // ── Build grid ─────────────────────────────────────────────
  function buildGrid() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;

    cols = COLS;
    rows = ROWS;

    const cellW = W / (cols - 1);
    const cellH = H / (rows - 1);

    nodes = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ox = c * cellW;
        const oy = r * cellH;
        nodes.push({
          ox, oy,        // origin / rest position
          x:  ox, y: oy, // current position
          vx: 0, vy: 0,  // velocity
        });
      }
    }
  }

  // ── Gradient color along mesh edges ────────────────────────
  function lineColor(dist) {
    const t   = 1 - dist / LINE_DIST;          // 0 → far, 1 → close
    const idx = t * (PALETTE.length - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.min(lo + 1, PALETTE.length - 1);
    const f   = idx - lo;

    // Parse hex colors
    const parseHex = (h) => {
      const r = parseInt(h.slice(1,3),16);
      const g = parseInt(h.slice(3,5),16);
      const b = parseInt(h.slice(5,7),16);
      return [r,g,b];
    };

    const [r1,g1,b1] = parseHex(PALETTE[lo]);
    const [r2,g2,b2] = parseHex(PALETTE[hi]);
    const r = Math.round(r1 + (r2-r1)*f);
    const g = Math.round(g1 + (g2-g1)*f);
    const b = Math.round(b1 + (b2-b1)*f);

    const alpha = 0.12 + t * 0.35;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Physics update ─────────────────────────────────────────
  function update() {
    for (const n of nodes) {
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < MOUSE_PULL && dist > 0) {
        const force = (1 - dist / MOUSE_PULL) * STRENGTH;
        n.vx += (dx / dist) * force * 4;
        n.vy += (dy / dist) * force * 4;
      }

      // Spring back to origin
      n.vx += (n.ox - n.x) * RETURN_SPD;
      n.vy += (n.oy - n.y) * RETURN_SPD;

      // Damping
      n.vx *= DAMPING;
      n.vy *= DAMPING;

      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // ── Draw ───────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw lines between neighbouring nodes
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];

      // Only connect right and below neighbours (avoid duplicates)
      const neighbours = [i + 1, i + cols]; // right, below

      for (const j of neighbours) {
        if (j >= nodes.length) continue;
        const b = nodes[j];

        // Skip right-edge wrapping
        if (j === i + 1 && (i + 1) % cols === 0) continue;

        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > LINE_DIST) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = lineColor(dist);
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }

    // Draw node dots
    for (const n of nodes) {
      const dx   = n.x - n.ox;
      const dy   = n.y - n.oy;
      const disp = Math.sqrt(dx*dx + dy*dy);
      const t    = Math.min(disp / 30, 1);

      // Interpolate color: dim → bright accent
      const alpha = 0.18 + t * 0.65;
      ctx.beginPath();
      ctx.arc(n.x, n.y, DOT_RADIUS + t * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${alpha})`;
      ctx.fill();
    }

    // Draw mouse-proximity glow
    if (mouse.x > 0) {
      const grad = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, MOUSE_PULL
      );
      grad.addColorStop(0, 'rgba(99,102,241,0.08)');
      grad.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, MOUSE_PULL, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Loop ───────────────────────────────────────────────────
  function loop() {
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // ── Resize ─────────────────────────────────────────────────
  function handleResize() {
    cancelAnimationFrame(animFrame);
    buildGrid();
    loop();
  }

  // ── Mouse / Touch ──────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect  = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // ── Init ───────────────────────────────────────────────────
  buildGrid();
  loop();

  const ro = new ResizeObserver(handleResize);
  ro.observe(canvas.parentElement);
})();


// ─── NAV SCROLL EFFECT ────────────────────────────────────────
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// ─── MOBILE BURGER MENU ───────────────────────────────────────
(function () {
  const burger = document.getElementById('nav-burger');
  const links  = document.getElementById('nav-links');
  if (!burger || !links) return;

  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  // Close on link click
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
})();


// ─── FAQ ACCORDION ────────────────────────────────────────────
(function () {
  const list = document.getElementById('faq-list');
  if (!list) return;

  list.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-item__question');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      list.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();


// ─── COUNTER ANIMATION ────────────────────────────────────────
(function () {
  const counters = document.querySelectorAll('.stat__number[data-target]');
  if (!counters.length) return;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800; // ms
    const start    = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(easeOut(progress) * target);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();


// ─── SCROLL REVEAL ────────────────────────────────────────────
(function () {
  const targets = [
    '.service-card',
    '.feature',
    '.review-card',
    '.contact-card',
    '.faq-item',
  ].join(',');

  const els = document.querySelectorAll(targets);
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  els.forEach((el, i) => {
    // Stagger delay
    el.style.animationDelay = `${(i % 6) * 90}ms`;
    el.style.opacity = '0';
    observer.observe(el);
  });
})();


// ─── SMOOTH ACTIVE NAV HIGHLIGHT ─────────────────────────────
(function () {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = '';
          link.style.background = '';
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.style.color = 'var(--clr-white)';
            link.style.background = 'rgba(99,102,241,0.12)';
          }
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(sec => observer.observe(sec));
})();


// ─── PC CASE MOUSE PARALLAX ──────────────────────────────────
(function () {
  const scene   = document.getElementById('case-scene');
  const imgWrap = document.getElementById('case-img-wrap');
  if (!scene || !imgWrap) return;

  // Current and target tilt values
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  const LERP = 0.07;        // smoothing factor
  const MAX_TILT = 14;      // max degrees
  const MAX_SHIFT = 18;     // max px shift for depth effect

  let rafId;
  let isHovering = false;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    currentX = lerp(currentX, targetX, LERP);
    currentY = lerp(currentY, targetY, LERP);

    // Apply 3D tilt to the image wrapper
    imgWrap.style.transform = `
      perspective(800px)
      rotateX(${-currentY * 0.5}deg)
      rotateY(${currentX}deg)
      translateX(${currentX * MAX_SHIFT / MAX_TILT}px)
      translateY(${currentY * MAX_SHIFT / MAX_TILT * 0.5}px)
    `;

    rafId = requestAnimationFrame(animate);
  }

  // Global mouse tracking (works even outside the scene element)
  document.addEventListener('mousemove', (e) => {
    const rect   = scene.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = e.clientX - cx;
    const dy     = e.clientY - cy;
    const maxDim = Math.max(rect.width, rect.height) / 2;

    targetX = (dx / maxDim) * MAX_TILT;
    targetY = (dy / maxDim) * MAX_TILT;
  });

  // Reset gently on scroll or mouse leave
  document.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
  });

  // Start loop
  animate();

  // Pause animation when off-screen (performance)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!rafId) animate();
      } else {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
  }, { threshold: 0.1 });

  io.observe(scene);
})();

