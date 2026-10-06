// MÓVILES ALBORAYA · scroll suave, entradas, horario en vivo, carrusel de reseñas, barra flotante,
// mapa bajo demanda y formulario.
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger);

// Destino del formulario: vacío = vista previa (no envía nada).
const FORM_ENDPOINT = '';

// Si GSAP no carga, se muestra todo sin animación.
if (!hasGsap) document.documentElement.classList.remove('js');

// ---------------- Horario real (ficha de Google Maps) ----------------
// 0 = domingo … 6 = sábado · tramos [apertura, cierre] en minutos (horario partido)
const TARDE = [[600, 840], [1020, 1230]];
const HOURS = { 1: TARDE, 2: TARDE, 3: TARDE, 4: TARDE, 5: TARDE, 6: [[600, 840]] };
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

(function hoursNow() {
  // Hora de España, aunque el visitante esté en otra zona horaria.
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const mins = Number(get('hour')) * 60 + Number(get('minute'));

  $(`.hours tr[data-day="${day}"]`)?.classList.add('is-today');

  const today = HOURS[day] || [];
  const now = today.find(([a, b]) => mins >= a && mins < b);
  const next = today.find(([a]) => mins < a);
  let text;
  if (now) {
    text = `Abierto · hasta las ${fmt(now[1])}`;
  } else if (next) {
    text = `Cerrado · abre hoy a las ${fmt(next[0])}`;
  } else {
    let d = day;
    for (let i = 1; i <= 7; i++) { d = (day + i) % 7; if (HOURS[d]) break; }
    text = `Cerrado · abre ${d === (day + 1) % 7 ? 'mañana' : `el ${DAYS[d]}`} a las ${fmt(HOURS[d][0][0])}`;
  }
  const open = !!now;
  $('[data-status]').classList.toggle('is-open', open);
  $('[data-status-text]').textContent = text;
})();

$('[data-year]').textContent = new Date().getFullYear();

// ---------------- Menú móvil ----------------
let lenis = null;
const header = $('[data-header]');
const dock = $('[data-dock]');
const waFloat = $('[data-wa-float]');
const burger = $('[data-burger]');
const menu = $('[data-menu]');
const setMenu = (on) => {
  burger.setAttribute('aria-expanded', String(on));
  burger.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
  menu.hidden = !on;
  header.classList.toggle('is-menu', on);
  dock?.classList.toggle('is-away', on);
  document.body.style.overflow = on ? 'hidden' : '';
  on ? lenis?.stop() : lenis?.start();
};
burger.addEventListener('click', () => setMenu(menu.hidden));
addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && setMenu(false));

// Anclas (con o sin Lenis)
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const el = id.length > 1 && $(id);
  if (!el) return;
  e.preventDefault();
  if (!menu.hidden) setMenu(false);
  lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.3 }) : el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}));

// Cabecera: se vuelve sólida y se esconde al bajar. WhatsApp flotante (escritorio) tras el hero.
let lastY = 0;
const onScroll = () => {
  const y = scrollY;
  header.classList.toggle('is-solid', y > 40);
  header.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.8 && menu.hidden);
  waFloat?.classList.toggle('is-visible', y > innerHeight * 0.7);
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------------- Reseñas: carrusel con flechas ----------------
const track = $('[data-reviews]');
const prev = $('[data-rev-prev]');
const next = $('[data-rev-next]');
if (track && prev && next) {
  const step = () => (track.firstElementChild?.getBoundingClientRect().width || 360) + 18;
  const sync = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
}

// ---------------- Formulario ----------------
const form = $('[data-form]');
const msg = $('[data-form-msg]');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let ok = true;
  $$('input[required], textarea[required]', form).forEach((el) => {
    const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
    if (el.type === 'checkbox') el.closest('.check').classList.toggle('is-invalid', bad);
    else el.setAttribute('aria-invalid', String(bad));
    if (bad) ok = false;
  });
  if (!ok) { msg.textContent = 'Revisa los campos marcados, por favor.'; return; }

  const data = Object.fromEntries(new FormData(form));
  if (FORM_ENDPOINT) {
    try {
      const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(r.status);
    } catch {
      msg.textContent = 'No se ha podido enviar. Llámanos al 643 61 83 00.';
      return;
    }
  }
  form.reset();
  msg.textContent = `Gracias, ${data.nombre.trim().split(' ')[0]}. Te llamaremos muy pronto.`;
});
form.addEventListener('input', (e) => {
  if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false');
  if (e.target.type === 'checkbox') e.target.closest('.check').classList.remove('is-invalid');
});

// ---------------- Mapa (se carga al pulsar, sin cookies de Google antes) ----------------
$('[data-map-load]').addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.title = "Mapa: Móviles Alboraya, Av. de l'Orxata 31, Alboraia";
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  f.src = 'https://maps.google.com/maps?q=39.4963543,-0.3534223&z=17&hl=es&output=embed';
  $('[data-map]').replaceChildren(f);
});

// ================= Movimiento =================
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);

  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1.2, touchMultiplier: 1.6 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Enlace activo del menú
  const links = $$('.header__nav a');
  links.forEach((a) => {
    const sec = $(a.getAttribute('href'));
    sec && ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (s) => a.classList.toggle('is-active', s.isActive),
    });
  });

  // Parte un texto en palabras (.w) conservando las etiquetas internas.
  const splitWords = (root) => {
    root.setAttribute('aria-label', root.textContent.trim());
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType !== 3) return walk(n);
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((t) => {
        if (!t) return;
        if (/^\s+$/.test(t)) return frag.append(t);
        const s = document.createElement('span');
        s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = t;
        frag.append(s);
      });
      n.replaceWith(frag);
    });
    walk(root);
    return $$('.w', root);
  };

  const word = $('[data-hero-word]');
  if (reduced) {
    word.style.visibility = 'visible';
  } else {
    // Hero: la palabra gigante sube letra a letra y la foto se asienta.
    word.setAttribute('aria-label', word.textContent);
    word.innerHTML = [...word.textContent].map((c) => `<span class="ch" aria-hidden="true">${c}</span>`).join('');
    word.style.visibility = 'visible';
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo('[data-hero-img]', { scale: 1.12 }, { scale: 1, duration: 2.6 }, 0)
      .from('.intro__word .ch', { yPercent: 110, duration: 1.4, stagger: 0.04 }, 0.15)
      .to('[data-rise]', { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.7);

    // La foto del hero se queda atrás al bajar
    gsap.to('.intro__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top top', end: 'bottom top', scrub: true } });

    // Titulares: palabras que suben
    $$('[data-words]').forEach((h) => {
      gsap.from(splitWords(h), { yPercent: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: h, start: 'top 85%' } });
    });

    // Texto de la empresa: se enciende palabra a palabra con el scroll (como Vita)
    const light = $('[data-light]');
    gsap.to(splitWords(light), {
      opacity: 1, stagger: 0.04, ease: 'none',
      scrollTrigger: { trigger: light, start: 'top 78%', end: 'bottom 50%', scrub: true },
    });

    // Fotos que se abren como una cortina
    $$('[data-reveal]').forEach((fig) => {
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%' } })
        .to(fig, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' })
        .from($('img', fig), { scale: 1.18, duration: 1.8, ease: 'expo.out' }, 0.1);
    });

    // Tarjetas, averías, reseñas y facilidades entran en cascada
    $$('[data-stagger]').forEach((g) => {
      gsap.from(g.children, { y: 48, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: g, start: 'top 85%' } });
    });

    // Bloque verde de WhatsApp: crece suavemente al entrar
    $$('[data-reveal-up]').forEach((el) => {
      gsap.from(el, { y: 60, scale: 0.94, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    // Proceso: parallax de la foto y pasos en cascada
    gsap.fromTo('[data-parallax]', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.steps__title', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 60%' } });
    gsap.from('.steps__list li', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.steps__list', start: 'top 92%' } });

    // Bloques de texto sueltos
    $$('.visit, .contact, .footer__big a').forEach((el) => {
      gsap.from(el, { y: 32, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
}
