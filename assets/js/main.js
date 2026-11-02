/* Mekân şablonu · etkileşimler
   GSAP + ScrollTrigger + SplitText + Lenis varsa kullanır; yoksa sayfa yine tam çalışır. */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));

  let cfg = {};
  try { cfg = JSON.parse($('#config')?.textContent || '{}'); } catch (e) { cfg = {}; }
  const brand = cfg.brand || root.dataset.brand;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const params = new URLSearchParams(location.search);
  const tableNo = (params.get('masa') || '').replace(/[^\w-]/g, '').slice(0, 4);

  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const Split = window.SplitText;
  const hasG = !!(G && ST);
  if (hasG) {
    G.registerPlugin(ST);
    if (Split) G.registerPlugin(Split);
    G.config({ nullTargetWarn: false });
  }
  const motion = hasG && !reduce;

  const store = (area, k, v) => {
    try {
      const s = area === 'session' ? sessionStorage : localStorage;
      if (v === undefined) return s.getItem(k);
      s.setItem(k, v);
    } catch (e) { /* gizli pencere vb. */ }
    return null;
  };

  /* ---------- İstanbul saati ve çalışma saatleri ---------- */
  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const DAYS_S = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MONTHS_S = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function ist(date = new Date()) {
    const p = {};
    fmt.formatToParts(date).forEach((x) => { p[x.type] = x.value; });
    return { day: WD[p.weekday], mins: (+p.hour % 24) * 60 + (+p.minute), y: +p.year, m: +p.month, d: +p.day };
  }
  const hhmm = (m) => {
    m = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + '.' + String(m % 60).padStart(2, '0');
  };
  const ranges = (day) => (cfg.hours && cfg.hours[String(day)]) || [];
  function openState(t = ist()) {
    for (const [a, b] of ranges(t.day)) if (t.mins >= a && t.mins < b) return { open: true, until: b };
    const prev = (t.day + 6) % 7;
    for (const [, b] of ranges(prev)) if (b > 1440 && t.mins + 1440 < b) return { open: true, until: b };
    for (let i = 0; i < 8; i++) {
      const day = (t.day + i) % 7;
      for (const [a] of ranges(day)) if (i > 0 || a > t.mins) return { open: false, day, at: a, inDays: i };
    }
    return { open: false };
  }
  function statusText(s, t) {
    if (s.open) return (s.until - t.mins <= 45 ? 'Kapanmak üzere · ' : 'Açık · kapanış ') + hhmm(s.until);
    if (s.at === undefined) return 'Kapalı';
    if (s.inDays === 0) return 'Kapalı · açılış ' + hhmm(s.at);
    if (s.inDays === 1) return 'Kapalı · yarın ' + hhmm(s.at);
    return 'Kapalı · ' + DAYS[s.day] + ' ' + hhmm(s.at);
  }

  function initClockUI() {
    const statusEl = $('[data-status]');
    const statusTxt = $('[data-status-text]');
    const greet = $('[data-greeting]');
    const clock = $('[data-clock]');
    const sun = $('[data-sunlight]');
    const yearEl = $('[data-year]');
    function tick() {
      const t = ist();
      const s = openState(t);
      if (statusEl && statusTxt) {
        statusEl.classList.toggle('is-open', !!s.open);
        statusTxt.textContent = statusText(s, t);
      }
      $$('[data-hours-table] tr').forEach((tr) => tr.classList.toggle('is-today', +tr.dataset.day === t.day));
      if (yearEl) yearEl.textContent = t.y;
      if (greet) greet.textContent = greeting(t, s);
      if (clock) clock.textContent = 'Şu an ' + hhmm(t.mins) + ' · Kadıköy';
      if (sun) {
        const h = t.mins / 60;
        const k = Math.min(1, Math.max(0, (h - 7) / 13));
        root.style.setProperty('--sun-rot', (-30 + k * 56).toFixed(1) + 'deg');
        root.style.setProperty('--sun-x', (-6 + k * 12).toFixed(1) + 'vw');
        root.style.setProperty('--sun-o', h >= 7 && h < 19.5 ? '.11' : '.05');
      }
      bakeUpdate(t, s);
    }
    tick();
    setInterval(tick, 30000);
  }

  function greeting(t, s) {
    const m = t.mins;
    if (!s.open) {
      if (s.inDays === 0) return 'Günaydın — bugün açılış ' + hhmm(s.at);
      return 'İyi geceler — yarın açılış ' + hhmm(s.at ?? 480);
    }
    if (m < 660) return 'Günaydın — kahvaltı 14.00\'e kadar';
    if (m < 840) return 'Öğle oldu — kahvaltıya son çağrı 14.00';
    if (m < 900) return 'Tünaydın — San Sebastian birazdan fırından çıkıyor';
    if (m < 1080) return 'Tünaydın — San Sebastian fırından yeni çıktı';
    return 'İyi akşamlar — kapanış ' + hhmm(s.until);
  }

  function bakeUpdate(t, s) {
    const rows = $$('[data-bake]');
    if (!rows.length) return;
    const today = ranges(t.day);
    const close = today.length ? Math.max(...today.map((r) => r[1])) : 0;
    rows.forEach((row) => {
      const at = +row.dataset.bake;
      const st = $('[data-bake-status]', row);
      const diff = at - t.mins;
      row.classList.remove('is-out', 'is-soon', 'is-later');
      if (!today.length || t.mins >= close) {
        st.textContent = 'Yarın ' + hhmm(at);
        row.classList.add('is-later');
      } else if (diff <= 0) {
        st.textContent = diff > -90 ? 'Fırından yeni çıktı' : 'Çıktı · ' + hhmm(at);
        row.classList.add('is-out');
      } else if (diff <= 60) {
        st.textContent = diff + ' dk sonra';
        row.classList.add('is-soon');
      } else {
        st.textContent = 'Bugün ' + hhmm(at);
        row.classList.add('is-later');
      }
    });
  }

  /* ---------- Yumuşak kaydırma ve üst çubuk ---------- */
  let lenis = null;
  const header = $('[data-header]');
  let lastY = 0;
  let navOpen = false;
  const headerH = () => (header ? header.offsetHeight : 0);

  const switchEl = $('[data-switch]');
  const narrow = matchMedia('(max-width: 759px)');
  function onScroll(y) {
    // Telefonda şablon seçici, kapaktaki bantla çakışmasın diye kapak geçilince görünür
    if (switchEl && !d.querySelector('dialog[open]')) switchEl.classList.toggle('is-hidden', narrow.matches && y < innerHeight * .7);
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 30);
    if (navOpen) return;
    if (y > 260 && y > lastY + 3) {
      header.classList.add('is-hidden');
      root.style.setProperty('--header-offset', '0px');
    } else if (y < lastY - 3 || y <= 260) {
      header.classList.remove('is-hidden');
      root.style.removeProperty('--header-offset');
    }
    lastY = y;
  }

  function initScroll() {
    if (!reduce && window.Lenis) {
      lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      if (hasG) {
        lenis.on('scroll', ST.update);
        G.ticker.add((time) => lenis.raf(time * 1000));
        G.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      lenis.on('scroll', (e) => onScroll(e.scroll));
    } else {
      addEventListener('scroll', () => onScroll(scrollY), { passive: true });
    }
    onScroll(scrollY);
  }

  function scrollToEl(el, { offset = 0, immediate = false } = {}) {
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { offset: -offset, immediate, duration: immediate ? 0 : 1.4, force: true });
    } else {
      const y = el.getBoundingClientRect().top + scrollY - offset;
      scrollTo({ top: y, behavior: reduce || immediate ? 'auto' : 'smooth' });
    }
  }

  function menubarOffset() {
    const bar = $('[data-menubar]');
    return (bar ? bar.offsetHeight : 0) + headerH() + 8;
  }

  function initAnchors() {
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-kvkk')) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const el = d.getElementById(decodeURIComponent(id));
      if (!el) return;
      e.preventDefault();
      closeNav();
      const inMenu = el.classList.contains('cat');
      scrollToEl(el, { offset: inMenu ? menubarOffset() : 0 });
    });
  }

  /* ---------- Mobil gezinme ---------- */
  const navBtn = $('[data-nav-toggle]');
  const mnav = $('[data-mobile-nav]');
  function openNav() {
    if (!mnav || navOpen) return;
    navOpen = true;
    mnav.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => mnav.classList.add('is-open')));
    navBtn.setAttribute('aria-expanded', 'true');
    navBtn.setAttribute('aria-label', 'Gezinme menüsünü kapat');
    root.classList.add('nav-open');
    lenis?.stop();
    if (motion) G.fromTo($$('.mnav__links a', mnav), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .05, delay: .25 });
  }
  function closeNav() {
    if (!mnav || !navOpen) return;
    navOpen = false;
    mnav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
    navBtn.setAttribute('aria-label', 'Gezinme menüsünü aç');
    root.classList.remove('nav-open');
    lenis?.start();
    setTimeout(() => { if (!navOpen) mnav.hidden = true; }, 800);
  }
  function initNav() {
    navBtn?.addEventListener('click', () => (navOpen ? closeNav() : openNav()));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
    $$('[data-switch] a, .mnav__foot a').forEach((a) => a.addEventListener('click', () => {
      store('session', 'intro-lodos', '1');
      store('session', 'intro-pervaz', '1');
    }));
  }

  /* ---------- Açılış animasyonu ---------- */
  function runIntro(done) {
    const loader = $('[data-loader]');
    if (!root.classList.contains('intro') || !loader || !motion) {
      root.classList.remove('intro');
      loader?.remove();
      done();
      return;
    }
    store('session', 'intro-' + brand, '1');
    lenis?.stop();
    const finish = () => { loader.remove(); root.classList.remove('intro'); lenis?.start(); ST.refresh(); };
    const tl = G.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish });
    if (brand === 'lodos') {
      tl.to('.loader__ring', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
        .to('.loader__tick', { strokeDashoffset: 0, duration: .7, ease: 'power2.out' }, '-=.6')
        .from('.loader__needle, .loader__tail', { rotation: -150, svgOrigin: '60 60', opacity: 0, duration: 1.4, ease: 'elastic.out(1, .5)' }, '-=.7')
        .from('.loader__word span', { yPercent: 115, duration: 1, stagger: .06 }, '-=1.15')
        .from('.loader__meta', { opacity: 0, y: 10, duration: .7 }, '-=.7')
        .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, '+=.2')
        .add(done, '-=.6');
    } else {
      tl.to('.loader__arch', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
        .to('.loader__cross', { strokeDashoffset: 0, duration: .7, ease: 'power2.out' }, '-=.45')
        .fromTo('.loader__sun', { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, '-=.5')
        .from('.loader__word', { yPercent: 40, opacity: 0, duration: 1 }, '-=.9')
        .from('.loader__meta', { opacity: 0, y: 10, duration: .7 }, '-=.6')
        .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, '+=.25')
        .add(done, '-=.6');
    }
  }

  /* ---------- Kapak girişi ---------- */
  function heroIn() {
    const title = $('[data-hero-title]');
    if (!title) return;
    const lines = $$(':scope > span', title);
    if (motion) {
      lines.forEach((l) => {
        const m = d.createElement('span');
        m.className = 'hl-mask';
        l.parentNode.insertBefore(m, l);
        m.appendChild(l);
      });
    }
    title.style.visibility = 'visible';
    title.style.animation = 'none';
    if (!motion) return;
    const tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(lines, { yPercent: 118, duration: 1.5, stagger: .11 }, 0)
      .from('.hero__eyebrow > *, .phero__greet', { opacity: 0, y: 14, duration: .9, stagger: .08 }, .25)
      .from('.hero__lead, .hero__actions > *, .phero__lead, .phero__actions > *, .phero__facts li', { opacity: 0, y: 26, duration: 1.1, stagger: .06 }, .5)
      .from('[data-hero-media] img', { scale: 1.2, duration: 2.6 }, 0)
      .from('.ticker', { yPercent: 100, duration: 1.1 }, .7)
      .from('.header', { yPercent: -100, duration: 1.1, clearProps: 'transform' }, .4);
    const arches = $$('[data-arch]');
    if (arches.length) {
      tl.fromTo(arches, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', stagger: .18 }, .05)
        .from(arches.map((a) => $('img', a)), { scale: 1.35, duration: 2.2 }, .2)
        .from('.phero__stamp', { scale: 0, rotation: -90, duration: 1.2, ease: 'back.out(1.6)' }, 1);
    }
  }

  /* ---------- Kaydırmaya bağlı animasyonlar ---------- */
  function initScrollFX() {
    if (!motion) return;

    // Lodos: imza tabaklar yatay kaydırma. Sabitleme diğer tetikleyicilerin konumunu
    // etkilediği için ilk sırada oluşturulur.
    const mm = G.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const sec = $('[data-hscroll]');
      if (!sec) return undefined;
      const pin = $('.sig__pin', sec);
      const track = $('[data-hscroll-track]', sec);
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = G.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: 1 }
      });
      $$('.sigcard__media img', track).forEach((img) => {
        G.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      return undefined;
    });

    // Lodos kapak: derinlik
    const heroMedia = $('[data-hero-media]');
    if (heroMedia && $('.hero')) {
      G.to(heroMedia, { yPercent: 14, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      G.to('.hero__title', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Görsel açılışları
    $$('[data-reveal]').forEach((el) => {
      const img = $('img', el);
      const tl = G.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
      if (img && !img.hasAttribute('data-speed')) tl.fromTo(img, { scale: 1.28 }, { scale: 1, duration: 2.1, ease: 'expo.out' }, 0);
    });

    // Paralaks
    $$('[data-speed]').forEach((img) => {
      const s = parseFloat(img.dataset.speed) || .4;
      G.fromTo(img, { yPercent: -7 * s }, { yPercent: 7 * s, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Ateş: arka plan yakınlaşması
    const zoom = $('[data-zoom]');
    if (zoom) G.fromTo(zoom, { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.fire', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Menü kağıdı: kenarlardan açılır
    const menuBg = $('.menu__bg');
    if (menuBg) {
      G.fromTo(menuBg, { scaleX: .93, borderRadius: brand === 'lodos' ? 28 : 48 }, {
        scaleX: 1, borderRadius: 0, ease: 'none',
        scrollTrigger: { trigger: '[data-menu]', start: 'top bottom', end: 'top 12%', scrub: true }
      });
    }

    // Üst çubuk tonu: altından geçtiği bölüme göre
    if (header) {
      $$('[data-tone]').forEach((sec) => {
        ST.create({
          trigger: sec, start: 'top top+=40', end: 'bottom top+=40',
          onToggle: (self) => { if (self.isActive) header.dataset.tone = sec.dataset.tone; }
        });
      });
    }

    // Lodos: zaman çizelgesi
    const tlEl = $('[data-timeline]');
    if (tlEl) {
      const lis = $$('li', tlEl);
      ST.create({
        trigger: tlEl, start: 'top 78%', end: 'bottom 55%', scrub: true,
        onUpdate: (self) => {
          tlEl.style.setProperty('--progress', self.progress.toFixed(3));
          lis.forEach((li, i) => li.classList.toggle('is-lit', self.progress >= i / (lis.length - 1) - .04));
        }
      });
      G.from(lis, { opacity: 0, y: 34, duration: 1.1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: tlEl, start: 'top 82%', once: true } });
    }

    // Kahve kartları ve fırın satırları
    G.utils.toArray('.bean, .bake__row, .sigcard--end').forEach((el, i) => {
      G.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', delay: (i % 3) * .08, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    G.from('.dish', { opacity: 0, y: 18, duration: .8, ease: 'power3.out', stagger: { each: .02, from: 'start' }, scrollTrigger: { trigger: '[data-menu-body]', start: 'top 85%', once: true } });

    // Alt bilgideki dev yazı
    const fw = $('[data-footer-word]');
    if (fw) G.from($$('span', fw), { yPercent: 105, duration: 1.5, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: fw, start: 'top 96%', once: true } });

    // Rüzgâr: logo iğnesi kaydırma hızına göre sallanır
    const needle = $('.brand__needle');
    let idle;
    if (needle && lenis) {
      lenis.on('scroll', ({ velocity }) => {
        G.to(needle, { rotation: G.utils.clamp(-50, 50, (velocity || 0) * 2.4), svgOrigin: '20 20', duration: .6, ease: 'power3.out', overwrite: true });
        clearTimeout(idle);
        idle = setTimeout(() => G.to(needle, { rotation: 0, svgOrigin: '20 20', duration: 1.6, ease: 'elastic.out(1, .35)' }), 160);
      });
    }

    // Pervaz: hıza duyarlı kayan yazı
    const mq = $('[data-marquee] .marquee__track');
    if (mq) {
      mq.style.animation = 'none';
      const loop = G.to(mq, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
      let dir = 1;
      let rest;
      if (lenis) {
        lenis.on('scroll', ({ velocity }) => {
          const v = velocity || 0;
          if (Math.abs(v) > .05) dir = v > 0 ? 1 : -1;
          G.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 5, 5)), duration: .3, overwrite: true });
          clearTimeout(rest);
          rest = setTimeout(() => G.to(loop, { timeScale: dir, duration: 1.2, overwrite: true }), 140);
        });
      }
    }

    // Başlık bölmeleri (yazı tipleri yüklendikten sonra)
    if (Split) {
      d.fonts.ready.then(() => {
        $$('[data-split]').forEach((el) => {
          Split.create(el, {
            type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
            onSplit: (self) => G.from(self.lines, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: el, start: 'top 87%', once: true } })
          });
        });
        $$('[data-words]').forEach((el) => {
          Split.create(el, {
            type: 'words', wordsClass: 'w', autoSplit: true,
            onSplit: (self) => G.fromTo(self.words, { opacity: .13 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true } })
          });
        });
        ST.refresh();
      });
    }
  }

  /* ---------- Mıknatıslı düğmeler ---------- */
  function initMagnetic() {
    if (!fine || !motion) return;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = G.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1, .4)' });
      const yTo = G.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .28);
        yTo((e.clientY - r.top - r.height / 2) * .38);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Bildirim ---------- */
  const toastEl = $('[data-toast]');
  let toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3400);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }

  /* ---------- Pencereler ---------- */
  let lastFocus = null;
  function panelFrom(dlg) {
    const desktop = innerWidth >= 900;
    if (dlg.classList.contains('sheet--center')) return desktop ? { opacity: 0, y: 40 } : { yPercent: 100 };
    return desktop ? { xPercent: 100 } : { yPercent: 100 };
  }
  function openDialog(dlg) {
    if (!dlg || dlg.open) return;
    lastFocus = d.activeElement;
    dlg.showModal();
    lenis?.stop();
    $('[data-switch]')?.classList.add('is-hidden');
    const panel = $('[data-sheet-panel]', dlg);
    panel.scrollTop = 0;
    if (motion) G.fromTo(panel, panelFrom(dlg), { xPercent: 0, yPercent: 0, opacity: 1, y: 0, duration: .85, ease: 'expo.out' });
  }
  function closeDialog(dlg) {
    if (!dlg || !dlg.open) return;
    const panel = $('[data-sheet-panel]', dlg);
    const finish = () => {
      dlg.close();
      if (motion) G.set(panel, { clearProps: 'transform,opacity' });
      lenis?.start();
      $('[data-switch]')?.classList.remove('is-hidden');
      lastFocus?.focus?.({ preventScroll: true });
    };
    if (motion) G.to(panel, { ...panelFrom(dlg), duration: .45, ease: 'power3.in', onComplete: finish });
    else finish();
  }
  function initDialogs() {
    $$('dialog.sheet').forEach((dlg) => {
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
      dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
      $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => closeDialog(dlg)));
    });
    const kv = $('[data-kvkk-dialog]');
    $$('[data-kvkk]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openDialog(kv); }));
  }

  /* ---------- Menü ---------- */
  const AL = {
    gluten: ['Gl', 'Gluten içeren tahıllar', 'Cereals with gluten', 1], crust: ['Kb', 'Kabuklular', 'Crustaceans', 2],
    egg: ['Yu', 'Yumurta', 'Egg', 3], fish: ['Bl', 'Balık', 'Fish', 4], peanut: ['Yf', 'Yer fıstığı', 'Peanut', 5],
    soy: ['So', 'Soya', 'Soy', 6], milk: ['Sü', 'Süt', 'Milk', 7], nuts: ['Km', 'Sert kabuklu meyveler', 'Tree nuts', 8],
    celery: ['Kr', 'Kereviz', 'Celery', 9], mustard: ['Hr', 'Hardal', 'Mustard', 10], sesame: ['Ss', 'Susam', 'Sesame', 11],
    sulphite: ['Sf', 'Sülfit', 'Sulphites', 12], lupin: ['Ab', 'Acı bakla', 'Lupin', 13], mollusc: ['Ym', 'Yumuşakçalar', 'Molluscs', 14]
  };
  const EX = { milk: ['milk'], sea: ['crust', 'mollusc'], nuts: ['nuts', 'peanut'], sesame: ['sesame'], fish: ['fish'], egg: ['egg'] };
  let lang = 'tr';

  function initMenu() {
    const menu = $('[data-menu]');
    if (!menu) return;
    const items = $$('.dish', menu);
    const cats = $$('.cat', menu);
    const links = $$('[data-cat-link]', menu);
    const nav = $('[data-cats]', menu);
    const ink = $('.menubar__ink', menu);
    const countEl = $('[data-count]', menu);
    const badge = $('[data-filter-count]', menu);
    const empty = $('[data-empty]', menu);
    const panel = $('[data-filters]', menu);
    const toggle = $('[data-filter-toggle]', menu);
    const sheet = $('[data-sheet]');
    const state = { diet: new Set(), ex: new Set() };

    // Çeviri: data-en taşıyan her öğenin Türkçesi saklanır
    const tEls = [...$$('[data-en]', menu), ...$$('[data-en]', sheet || d.createElement('i')), ...$$('[data-en]', $('[data-tablebar]') || d.createElement('i'))];
    tEls.forEach((el) => { el.dataset.tr = el.textContent; });

    function ok(li) {
      const diet = (li.dataset.diet || '').split(' ');
      const al = (li.dataset.al || '').split(' ');
      for (const k of state.diet) {
        if (k === 'gf') { if (al.includes('gluten')) return false; } else if (!diet.includes(k)) return false;
      }
      for (const k of state.ex) if (EX[k].some((a) => al.includes(a))) return false;
      return true;
    }

    let refreshT;
    function apply() {
      let n = 0;
      items.forEach((li) => { const show = ok(li); li.hidden = !show; if (show) n++; });
      cats.forEach((c) => { c.hidden = !$$('.dish:not([hidden])', c).length; });
      links.forEach((a) => { a.hidden = !!d.getElementById('m-' + a.dataset.catLink)?.hidden; });
      const active = state.diet.size + state.ex.size;
      if (badge) { badge.hidden = !active; badge.textContent = active; }
      if (countEl) countEl.textContent = lang === 'en' ? `Showing ${n} of ${items.length}` : `Gösterilen: ${n} / ${items.length}`;
      if (empty) empty.hidden = n > 0;
      moveInk();
      clearTimeout(refreshT);
      if (hasG) refreshT = setTimeout(() => ST.refresh(), 120);
    }

    $$('[data-filter]', menu).forEach((b) => b.addEventListener('click', () => {
      const [g, k] = b.dataset.filter.split(':');
      const set = state[g];
      const on = !set.has(k);
      if (on) set.add(k); else set.delete(k);
      b.setAttribute('aria-pressed', String(on));
      apply();
    }));
    $('[data-filter-clear]', menu)?.addEventListener('click', () => {
      state.diet.clear(); state.ex.clear();
      $$('[data-filter]', menu).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      apply();
    });
    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.hidden = false;
        if (motion) G.fromTo(panel, { height: 0 }, { height: 'auto', duration: .6, ease: 'expo.out', onComplete: () => ST.refresh() });
      } else if (motion) {
        G.to(panel, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { panel.hidden = true; G.set(panel, { clearProps: 'height' }); ST.refresh(); } });
      } else {
        panel.hidden = true;
      }
    });

    // Dil
    function setLang(l) {
      lang = l;
      tEls.forEach((el) => { el.textContent = l === 'en' ? el.dataset.en : el.dataset.tr; });
      menu.setAttribute('lang', l);
      $$('[data-lang]', menu).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
      $$('.al[data-al]', menu).forEach((a) => { const x = AL[a.dataset.al]; if (x) a.title = l === 'en' ? x[2] : x[1]; });
      store('local', 'menu-lang', l);
      apply();
    }
    $$('[data-lang]', menu).forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

    // Kategori çubuğu
    let activeKey = links[0]?.dataset.catLink;
    function moveInk() {
      const a = links.find((l) => l.dataset.catLink === activeKey && !l.hidden) || links.find((l) => !l.hidden);
      links.forEach((l) => l.classList.toggle('is-active', l === a));
      if (!a || !ink) return;
      ink.style.width = a.offsetWidth + 'px';
      ink.style.transform = `translateX(${a.offsetLeft}px)`;
      const left = a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2;
      nav.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { activeKey = en.target.dataset.cat; moveInk(); } });
      }, { rootMargin: '-38% 0px -58% 0px' });
      cats.forEach((c) => io.observe(c));
    }
    addEventListener('resize', moveInk);

    // Ürün ayrıntısı
    items.forEach((li) => $('.dish__btn', li)?.addEventListener('click', () => openDish(li)));
    function openDish(li) {
      if (!sheet) return;
      const name = $('.dish__name', li).textContent;
      $('[data-sheet-cat]', sheet).textContent = $('.cat__name', li.closest('.cat')).textContent;
      $('[data-sheet-title]', sheet).textContent = name;
      $('[data-sheet-price]', sheet).textContent = $('.dish__price', li).textContent.trim();
      $('[data-sheet-desc]', sheet).textContent = $('.dish__desc', li).textContent;
      const kcal = +li.dataset.kcal;
      $('[data-sheet-kcal]', sheet).textContent = kcal ? kcal + ' kcal' : (lang === 'en' ? 'Depends on weight' : 'Gramaja göre değişir');
      const als = (li.dataset.al || '').split(' ').filter(Boolean);
      const alList = $('[data-sheet-al]', sheet);
      alList.textContent = '';
      if (!als.length) {
        const liEl = d.createElement('li');
        liEl.textContent = lang === 'en' ? 'None declared' : 'Beyan edilen alerjen yok';
        alList.appendChild(liEl);
      }
      als.forEach((k) => {
        const x = AL[k];
        if (!x) return;
        const liEl = d.createElement('li');
        const ab = d.createElement('abbr');
        ab.className = 'al';
        ab.innerHTML = `<sup>${x[3]}</sup>`;
        ab.append(x[0]);
        liEl.append(ab, lang === 'en' ? x[2] : x[1]);
        alList.appendChild(liEl);
      });
      const tags = $('[data-sheet-tags]', sheet);
      tags.textContent = '';
      $$('.dish__tag, .dish__diet', li).forEach((t) => tags.appendChild(t.cloneNode(true)));
      const media = $('[data-sheet-media]', sheet);
      const img = $('img', media);
      if (li.dataset.imgLg) {
        media.hidden = false;
        img.src = li.dataset.imgLg;
        img.alt = name;
      } else {
        media.hidden = true;
        img.removeAttribute('src');
      }
      openDialog(sheet);
    }

    if (store('local', 'menu-lang') === 'en') setLang('en'); else apply();
  }

  /* ---------- İmleç önizlemesi ---------- */
  function initPreview() {
    const pv = $('[data-preview]');
    if (!pv || !fine || !motion) return;
    const img = $('img', pv);
    const targets = $$('.dish.has-img:not(.dish--card), .bake__row[data-img]');
    if (!targets.length) return;
    G.set(pv, { xPercent: 12, yPercent: -50, scale: .82, rotation: -4 });
    const xTo = G.quickTo(pv, 'x', { duration: .6, ease: 'power3' });
    const yTo = G.quickTo(pv, 'y', { duration: .6, ease: 'power3' });
    addEventListener('pointermove', (e) => { xTo(e.clientX + 18); yTo(e.clientY); }, { passive: true });
    let preloaded = false;
    targets.forEach((el) => {
      el.addEventListener('pointerenter', () => {
        if (!preloaded) { preloaded = true; targets.forEach((t) => { const i = new Image(); i.src = t.dataset.img; }); }
        img.src = el.dataset.img;
        G.to(pv, { autoAlpha: 1, scale: 1, rotation: 0, duration: .55, ease: 'expo.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => G.to(pv, { autoAlpha: 0, scale: .86, rotation: -4, duration: .35, ease: 'power2.out', overwrite: 'auto' }));
    });
  }

  /* ---------- Kahve çubukları ---------- */
  function initBars() {
    const bars = $$('[data-bars]');
    if (!bars.length) return;
    if (!('IntersectionObserver' in window)) { bars.forEach((b) => b.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: .4 });
    bars.forEach((b) => io.observe(b));
  }

  /* ---------- Rezervasyon talebi ---------- */
  function initReserve() {
    const form = $('[data-reserve]');
    if (!form) return;
    const R = cfg.reserve || {};
    const slot = R.slot || 30;
    const lead = R.lead ?? 90;
    const daysEl = $('[data-days]', form);
    const timesEl = $('[data-times]', form);
    const partyEl = $('[data-party]', form);
    const hint = $('[data-party-hint]', form);
    const summary = $('[data-summary]', form);
    const err = $('[data-error]', form);
    const confirmDlg = $('[data-confirm]');
    const sel = { mode: 'table', day: null, time: null, party: 2, product: null };
    const firstProduct = $('[data-product]', form);
    if (firstProduct) sel.product = firstProduct.dataset.product;

    const windowsFor = (dow) => {
      if (sel.mode === 'cake') return ranges(dow).length ? [[600, 1080]] : [];
      if (R.windows) { const w = R.windows[String(dow)]; return w ? [w] : []; }
      return ranges(dow).map(([a, b]) => [a, b - lead]);
    };
    function slotsFor(dow, nowMins) {
      const out = [];
      if (sel.mode === 'cake') {
        if (!windowsFor(dow).length) return out;
        return [600, 720, 900, 1080].filter((m) => nowMins < 0 || m >= nowMins + 60);
      }
      windowsFor(dow).forEach(([a, b]) => { for (let m = a; m <= b; m += slot) if (nowMins < 0 || m >= nowMins + 60) out.push(m); });
      return out;
    }
    function chip(label, attrs) {
      const b = d.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.innerHTML = label;
      Object.entries(attrs || {}).forEach(([k, v]) => { b.dataset[k] = v; });
      return b;
    }
    function buildDays() {
      const t = ist();
      daysEl.textContent = '';
      const want = sel.mode === 'cake' ? 10 : (R.windows ? 8 : 14);
      let first = null;
      let made = 0;
      for (let i = sel.mode === 'cake' ? 1 : 0; i < 60 && made < want; i++) {
        const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
        const dow = date.getUTCDay();
        if (R.windows && sel.mode === 'table' && !windowsFor(dow).length) continue;
        const slots = slotsFor(dow, i === 0 ? t.mins : -1);
        const top = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : DAYS_S[dow];
        const b = chip(`<small>${top}</small><b>${date.getUTCDate()}</b><small>${MONTHS_S[date.getUTCMonth()]}</small>`,
          { dow, day: date.getUTCDate(), month: date.getUTCMonth(), offset: i });
        b.setAttribute('aria-label', `${DAYS[dow]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`);
        if (!slots.length) b.disabled = true; else if (!first) first = b;
        b.addEventListener('click', () => selectDay(b));
        daysEl.appendChild(b);
        made++;
      }
      sel.day = null;
      sel.time = null;
      if (first) selectDay(first, true); else renderSummary();
    }
    function selectDay(b, auto) {
      $$('.chip', daysEl).forEach((c) => c.setAttribute('aria-checked', String(c === b)));
      sel.day = { dow: +b.dataset.dow, day: +b.dataset.day, month: +b.dataset.month, offset: +b.dataset.offset };
      const t = ist();
      const slots = slotsFor(sel.day.dow, sel.day.offset === 0 ? t.mins : -1);
      timesEl.textContent = '';
      const keep = slots.includes(sel.time) ? sel.time : null;
      sel.time = keep;
      slots.forEach((m) => {
        const c = chip(hhmm(m), { m });
        if (m === keep) c.setAttribute('aria-checked', 'true');
        c.addEventListener('click', () => {
          $$('.chip', timesEl).forEach((x) => x.setAttribute('aria-checked', String(x === c)));
          sel.time = m;
          renderSummary();
        });
        timesEl.appendChild(c);
      });
      if (!auto && motion) G.from($$('.chip', timesEl), { opacity: 0, y: 8, duration: .4, stagger: .015, ease: 'power2.out' });
      renderSummary();
    }
    function maxParty() { return sel.mode === 'cake' ? 4 : (R.max || 12); }
    function renderParty() {
      partyEl.textContent = sel.party;
      if (sel.mode === 'cake') hint.textContent = '';
      else if (sel.party >= (R.group || 7)) hint.textContent = brand === 'lodos' ? 'Kalabalık gruplar için arka salonu ayarlayabiliriz; sizi arayacağız.' : '7 kişi ve üzeri için lütfen bizi arayın; masaları birleştirelim.';
      else hint.textContent = '';
      renderSummary();
    }
    $$('[data-step]', form).forEach((b) => b.addEventListener('click', () => {
      sel.party = Math.min(maxParty(), Math.max(1, sel.party + +b.dataset.step));
      renderParty();
    }));
    function dateText() {
      if (!sel.day) return '';
      return `${DAYS[sel.day.dow]}, ${sel.day.day} ${MONTHS[sel.day.month]}`;
    }
    function renderSummary() {
      if (!sel.day || sel.time === null) { summary.textContent = sel.day ? 'Bir saat seçin.' : 'Gün ve saat seçin.'; return; }
      summary.textContent = sel.mode === 'cake'
        ? `${sel.product} · ${sel.party} adet · ${dateText()}, ${hhmm(sel.time)} teslim`
        : `${dateText()} · ${hhmm(sel.time)} · ${sel.party} kişi`;
    }

    // Kafe: talep türü sekmeleri ve ürün seçimi
    $$('[data-rmode]', form).forEach((tab) => tab.addEventListener('click', () => {
      sel.mode = tab.dataset.rmode;
      $$('[data-rmode]', form).forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      $$('[data-only]', form).forEach((el) => { el.hidden = el.dataset.only !== sel.mode; });
      $$('[data-mode-label]', form).forEach((el) => { const [a, b] = el.dataset.modeLabel.split('|'); el.textContent = sel.mode === 'cake' ? b : a; });
      sel.party = sel.mode === 'cake' ? 1 : 2;
      renderParty();
      buildDays();
    }));
    $$('[data-product]', form).forEach((p) => p.addEventListener('click', () => {
      $$('[data-product]', form).forEach((x) => x.setAttribute('aria-checked', String(x === p)));
      sel.product = p.dataset.product;
      renderSummary();
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.ad.value.trim();
      const tel = form.elements.tel.value.trim();
      const note = form.elements.not.value.trim();
      const digits = tel.replace(/\D/g, '');
      let msg = '';
      if (!sel.day || sel.time === null) msg = 'Lütfen gün ve saat seçin.';
      else if (name.length < 2) msg = 'Lütfen adınızı yazın.';
      else if (digits.length < 10) msg = 'Telefon numarası eksik görünüyor.';
      else if (!form.elements.kvkk.checked) msg = 'Devam etmek için aydınlatma metnini onaylayın.';
      err.textContent = msg;
      if (msg) {
        if (motion) G.fromTo(err, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
        return;
      }
      const lines = sel.mode === 'cake'
        ? [`Merhaba, ${cfg.name}'dan bütün kek siparişi vermek istiyorum.`, `Ürün: ${sel.product}`, `Adet: ${sel.party}`, `Teslim: ${dateText()}, ${hhmm(sel.time)}`]
        : [`Merhaba, ${cfg.name} için rezervasyon talebim:`, `${dateText()} · ${hhmm(sel.time)}`, `${sel.party} kişi`];
      lines.push(`Ad: ${name}`, `Telefon: ${tel}`);
      if (note) lines.push(`Not: ${note}`);
      $('[data-confirm-text]', confirmDlg).textContent = lines.join('\n');
      openDialog(confirmDlg);
    });
    $('[data-copy]', confirmDlg)?.addEventListener('click', async () => {
      const okCopy = await copy($('[data-confirm-text]', confirmDlg).textContent);
      toast(okCopy ? 'Mesaj panoya kopyalandı.' : 'Kopyalanamadı; metni elle seçebilirsiniz.');
    });

    renderParty();
    buildDays();
  }

  /* ---------- QR masa modu ---------- */
  function initTable() {
    if (!tableNo) return;
    const bar = $('[data-tablebar]');
    if (bar) {
      bar.hidden = false;
      $('[data-table-no]', bar).textContent = tableNo;
      $('[data-wifi]', bar)?.addEventListener('click', async () => {
        const w = cfg.wifi || {};
        const done = await copy(w.pass || '');
        toast(`Ağ: ${w.ssid} · Şifre: ${w.pass}${done ? ' (kopyalandı)' : ''}`);
      });
    }
    const menu = $('[data-menu]');
    if (menu) {
      const go = () => scrollToEl(menu, { immediate: true });
      requestAnimationFrame(go);
      addEventListener('load', () => { go(); if (hasG) ST.refresh(); }, { once: true });
    }
  }

  /* ---------- Başlat ---------- */
  function boot() {
    initScroll();
    initAnchors();
    initNav();
    initDialogs();
    initClockUI();
    initMenu();
    initReserve();
    initBars();
    initScrollFX();
    initMagnetic();
    initPreview();
    initTable();
    runIntro(heroIn);
    if (hasG) addEventListener('load', () => ST.refresh(), { once: true });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
