// sticky header shadow
(function(){
  const h = document.querySelector('[data-header]');
  if(!h) return;
  const onScroll = () => h.style.boxShadow = window.scrollY>4 ? '0 6px 16px rgba(15,23,42,.08)' : 'none';
  onScroll(); window.addEventListener('scroll', onScroll);
})();

// mobile nav
  (function(){
    const burger = document.getElementById('burgerBtn');
    const nav    = document.getElementById('siteNav');

    if (!burger || !nav) return;

    function toggleNav() {
      const isOpen = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : ''; // prevent background scroll on mobile
    }

    burger.addEventListener('click', toggleNav);

    // Close menu when clicking a nav link
    nav.querySelectorAll('[data-nav]').forEach(a => {
      a.addEventListener('click', () => {
        if (nav.classList.contains('open')) toggleNav();
      });
    });

    // Close on ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) toggleNav();
    });
  })();
// ===== HERO CAROUSEL + robust splash text + social animations =====
(function () {
  const root = document.getElementById('heroRoot');
  const bg   = document.getElementById('heroBg');
  if (!root || !bg) return;

  const slides = Array.from(bg.querySelectorAll('figure'));
  const dots   = Array.from(document.querySelectorAll('#heroDots button'));

  let i = 0, timer;
  const SLIDE_MS = 6000;

  // Find the animation wrapper in a figure: supports .hero-text or .splash-content
  function getTextWrapper(fig){
    return fig.querySelector('.hero-text') || fig.querySelector('.splash-content');
  }

  // Remove .enter everywhere, then add to the active slide's text wrapper (if present)
  function runTextAnimation(index){
    slides.forEach(fig => {
      const wrap = getTextWrapper(fig);
      if (wrap) wrap.classList.remove('enter');
    });
    const activeWrap = getTextWrapper(slides[index]);
    if (activeWrap) {
      // force reflow so CSS animations restart
      void activeWrap.offsetWidth;
      activeWrap.classList.add('enter');
    }
  }

  function show(n){
    if (!slides.length) return;
    i = (n + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
    dots.forEach((d, idx)   => d.classList.toggle('active', idx === i));

    // Center-left toggle if you still use it
    root.classList.toggle('on-splash', i === 0);

    // 🔥 animate splash (or any slide that has text wrapper)
    runTextAnimation(i);
  }

  function next(){ show(i + 1); }
  function start(){ stop(); timer = setInterval(next, SLIDE_MS); }
  function stop(){ if (timer) clearInterval(timer); }

  // Make social icons animate on first paint
  function markReady(){ root.classList.add('is-ready'); }

  // Kick things off
  show(0);

  // Ensure animations run after first render
  if (document.readyState === 'complete') {
    requestAnimationFrame(() => { markReady(); runTextAnimation(0); });
  } else {
    window.addEventListener('load', () => requestAnimationFrame(() => { markReady(); runTextAnimation(0); }));
  }

  start();

  // Dots navigation
  dots.forEach((d, idx) => d.addEventListener('click', () => { stop(); show(idx); start(); }));

  // Optional: pause on hover (desktop)
  bg.addEventListener('mouseenter', stop);
  bg.addEventListener('mouseleave', start);
})();

// Start CSS-driven entrance once the first frame paints
(function(){
  const root = document.getElementById('heroRoot');
  const bg   = document.getElementById('heroBg');
  if (!root || !bg) return;
  const go = () => {
    root.classList.add('is-ready');
    // animate text for the very first active slide, too
    const activeIndex = Array.from(bg.querySelectorAll('figure')).findIndex(f => f.classList.contains('active')) || 0;
    animateActiveHeroText(bg, activeIndex);
  };
  if (document.readyState === 'complete') requestAnimationFrame(go);
  else window.addEventListener('load', () => requestAnimationFrame(go));
})();


// Animation trigger for the text block inside the active slide
function animateActiveHeroText(bg, activeIndex) {
  const texts = bg.querySelectorAll('.hero-text');
  texts.forEach(t => t.classList.remove('enter'));
  const active = bg.querySelectorAll('figure')[activeIndex]?.querySelector('.hero-text');
  if (active) {
    // force reflow so animation restarts when class toggles
    // eslint-disable-next-line no-unused-expressions
    active.offsetHeight;
    active.classList.add('enter');
  }
}

// Ticker: pause on tab switch for efficiency
(function(){
  const rail = document.querySelector('.ticker-rail');
  if(!rail) return;
  document.addEventListener('visibilitychange', () => {
    rail.style.animationPlayState = document.hidden ? 'paused' : 'running';
  });
})();

// ----- Quick Estimate (modal + pricing) -----
(function(){
  const openBtns  = Array.from(document.querySelectorAll('[data-open-estimate]'));
  const backdrop  = document.querySelector('[data-qe-backdrop]');
  if(!backdrop || !openBtns.length) return;

  const closeBtn  = backdrop.querySelector('[data-qe-close]');
  const form      = document.getElementById('qeForm');
  const serviceEl = document.getElementById('qeService');
  const segEl     = document.getElementById('qeSegment');
  const distEl    = document.getElementById('qeDistance');
  const daysEl    = document.getElementById('qeDays');
  const hoursEl   = document.getElementById('qeHours');

  const distLbl   = document.getElementById('qeDistLbl');
  const daysLbl   = document.getElementById('qeDaysLbl');
  const daysWrap  = document.getElementById('qeDaysWrap');
  const hoursLbl  = document.getElementById('qeHoursLbl');
  const hoursWrap = document.getElementById('qeHoursWrap');
  const outEl     = document.getElementById('qeResult');
  const noteEl    = document.getElementById('qeNote');

  // ---- Pricing config (adjust as needed) ----
  const PRICING = {
    Outstation: {
      Hatchback:       { perKm: 12, minKmPerDay: 300, driverAllowance: 400 },
      Sedan:           { perKm: 14, minKmPerDay: 300, driverAllowance: 500 },
      "Premium Sedan": { perKm: 16, minKmPerDay: 300, driverAllowance: 600 },
      SUV:             { perKm: 18, minKmPerDay: 300, driverAllowance: 600 },
      "Premium SUV":   { perKm: 22, minKmPerDay: 300, driverAllowance: 700 }
    },
    Local: {
      Hatchback:       { baseKm: 80, baseHours: 8, basePrice: 2200, perKm: 12, extraPerHour: 150 },
      Sedan:           { baseKm: 80, baseHours: 8, basePrice: 2600, perKm: 14, extraPerHour: 200 },
      "Premium Sedan": { baseKm: 80, baseHours: 8, basePrice: 3200, perKm: 16, extraPerHour: 250 },
      SUV:             { baseKm: 80, baseHours: 8, basePrice: 3500, perKm: 18, extraPerHour: 250 },
      "Premium SUV":   { baseKm: 80, baseHours: 8, basePrice: 4200, perKm: 22, extraPerHour: 300 }
    },
    Airport: {
      Hatchback:       { flat: 1100 },
      Sedan:           { flat: 1300 },
      "Premium Sedan": { flat: 1600 },
      SUV:             { flat: 1800 },
      "Premium SUV":   { flat: 2200 }
    }
  };

  const inr = n => n.toLocaleString('en-IN');

  // 🔁 Reset only distance/days/hours + outputs
  function resetInputs(){
    distEl.value  = '';
    daysEl.value  = '1';
    hoursEl.value = '8';
    segEl.selectedIndex = 0;
    outEl.hidden  = true;
    noteEl.hidden = true;
  }

  function refreshFields(){
    const svc = serviceEl.value;

    // hide both first
    daysLbl.style.display  = 'none';
    daysWrap.style.display = 'none';
    hoursLbl.style.display = 'none';
    hoursWrap.style.display= 'none';

    if(svc === 'Outstation'){
      distLbl.textContent = 'Estimated Total Distance (km)';
      daysLbl.style.display  = '';
      daysWrap.style.display = '';
      distEl.required = true;
    } else if(svc === 'Local'){
      distLbl.textContent = 'Estimated Total Distance (km) (8hr/80km base)';
      hoursLbl.style.display  = '';
      hoursWrap.style.display = '';
      distEl.required = true;
    } else { // Airport
      distLbl.textContent = 'Distance (optional)';
      distEl.required = false;
    }
  }

  function calcEstimate(e){
    e.preventDefault();
    const svc   = serviceEl.value;
    const seg   = segEl.value;
    const dist  = Number(distEl.value || 0);
    const days  = Math.max(1, Number(daysEl.value  || 1));
    const hours = Math.max(1, Number(hoursEl.value || 1));

    let fare = 0, details = '';

    if(svc === 'Outstation'){
      const p = PRICING.Outstation[seg];
      const chargeableKm = Math.max(dist, days * p.minKmPerDay);
      fare = chargeableKm * p.perKm + days * p.driverAllowance;
      details = `Chargeable: ${chargeableKm} km × ₹${p.perKm}/km + driver ₹${p.driverAllowance}/day × ${days} day(s)`;
    } else if(svc === 'Local'){
      const p = PRICING.Local[seg];
      const extraKm = Math.max(0, dist - p.baseKm);
      const extraHr = Math.max(0, hours - p.baseHours);
      fare = p.basePrice + extraKm * p.perKm + extraHr * p.extraPerHour;
      details = `Base ${p.baseHours} hr / ${p.baseKm} km + extra ${extraKm} km × ₹${p.perKm} + extra ${extraHr} hr × ₹${p.extraPerHour}`;
    } else {
      const p = PRICING.Airport[seg];
      fare = p.flat;
      details = `Flat airport transfer`;
    }

    outEl.textContent = `Estimated fare: ₹${inr(Math.round(fare))} (approx)`;
    outEl.hidden = false;
    noteEl.textContent = details;
    noteEl.hidden = false;
  }

  // Open / Close
  function open(){
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    resetInputs();          // 🔥 fresh fields every open
    refreshFields();
  }
  function close(){
    backdrop.hidden = true;
    document.body.style.overflow = '';
    resetInputs();          // 🔥 clear when closing
  }

  // Events
  openBtns.forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); open(); }));
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => { if(!backdrop.hidden && e.key === 'Escape') close(); });

  // 🔥 When service changes, reset km/days/hours too
  serviceEl.addEventListener('change', () => { resetInputs(); refreshFields(); });

  form.addEventListener('submit', calcEstimate);

  // ensure closed on load
  close();
})();
//social icons on all pages
document.addEventListener("DOMContentLoaded", () => {
  const icons = document.querySelectorAll(".social-dock .sd-btn");
  icons.forEach((btn, i) => {
    btn.style.opacity = "0";
    btn.style.transform = "translateY(12px)";
    setTimeout(() => {
      btn.style.transition = "all .5s ease";
      btn.style.opacity = "1";
      btn.style.transform = "translateY(0)";
    }, 150 * i + 400);
  });
});
// =============== Premium Service Card Animation ===============
(function(){
  function initCards(){
    const cards = document.querySelectorAll(".svc-card-premium");
    if(!cards.length) return;

    const io = new IntersectionObserver((entries, obs)=>{
      entries.forEach((e, i)=>{
        if(e.isIntersecting){
          const el = e.target;
          setTimeout(()=> el.classList.add("animate-in"), (Number(el.dataset.idx) || i)*100);
          obs.unobserve(el);
        }
      });
    }, {rootMargin:"0px 0px -10% 0px"});

    cards.forEach(c=>io.observe(c));
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initCards);
  else initCards();
})();

// small hero parallax (optional)
(function(){
  const hero = document.querySelector('.svc-hero-media');
  if (!hero) return;
  let ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(()=> {
      const rect = hero.getBoundingClientRect();
      const winH = window.innerHeight;
      // when hero is in viewport, shift background-position subtly
      if (rect.top < winH && rect.bottom > 0) {
        const pct = Math.max(0, Math.min(1, (winH - rect.top) / (winH + rect.height)));
        const y = (pct - 0.5) * 8; // -4px -> 4px
        hero.style.backgroundPosition = `center ${50 + y}%`;
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  // run once on load
  onScroll();
})();

