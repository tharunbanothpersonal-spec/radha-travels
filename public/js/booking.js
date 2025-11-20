// public/js/booking.js
// Single-card modal + Lottie success + backend POST integration
// Replaces current public/js/booking.js — paste entire file.

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("rtd-bookingModal");
  if (!modal) return;

  const card = modal.querySelector(".rtd-card");
  const form = document.getElementById("rtdForm");
  const success = document.getElementById("rtdSuccess");
  const lottiePlayer = document.getElementById("rtdLottie");
  const closeBtn = modal.querySelector(".rtd-close");
  const successClose = modal.querySelector(".rtd-close-success") || document.getElementById("rtdDone");
  const cardBody = modal.querySelector(".rtd-card-body");

  // Elements used in form
  const typeEl = document.getElementById("rtdType");
  const numDaysWrap = document.getElementById("rtdNumDaysWrap");
  const bookingIdEl = document.getElementById("rtdBookingId");
  const copyBtn = document.getElementById("rtdCopyId");
  const doneBtn = document.getElementById("rtdDone");

  // make sure placeholders exist for consistent visuals
  modal.querySelectorAll("input, textarea").forEach((i) => {
    if (!i.getAttribute("placeholder")) i.setAttribute("placeholder", " ");
  });

  // --- Brand entrance helper (call on modal open) ---
  function playBrandEntrance() {
    document.querySelectorAll(".rtd-brand, .rtd-brand-premium").forEach((b) => {
      b.classList.remove("rtd-in");
      // force reflow then add
      void b.offsetWidth;
      b.classList.add("rtd-in");
    });
  }

  // --- Modal show/hide animations ---
  function showCard() {
    modal.setAttribute("aria-hidden", "false");
    playBrandEntrance();

    // animate card in
    card.style.opacity = "0";
    card.style.transform = "translateY(12px)";
    requestAnimationFrame(() => {
      card.style.transition = "all .36s cubic-bezier(.2,.9,.2,1)";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    });
    setTimeout(() => document.getElementById("rtdName")?.focus(), 160);
  }

  function hideCard() {
    card.style.opacity = "1";
    card.style.transform = "translateY(0)";
    requestAnimationFrame(() => {
      card.style.transition = "all .28s ease";
      card.style.opacity = "0";
      card.style.transform = "translateY(12px)";
    });
    setTimeout(() => modal.setAttribute("aria-hidden", "true"), 280);
  }

  // delegated open
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".open-booking");
    if (!t) return;
    e.preventDefault();

    // If trigger has data-service / data-source, copy into hidden fields (if present)
    const service = t.dataset?.service || "";
    const source = t.dataset?.source || "";
    const serviceField = document.getElementById("serviceField");
    const sourceField = document.getElementById("formSource");
    if (serviceField) serviceField.value = service;
    if (sourceField) sourceField.value = source;

    showCard();
  });
const rtdEmail = document.getElementById('rtdEmail');
const rtdEmailWrap = document.getElementById('rtdEmailWrap');
if (rtdEmail) {
  rtdEmail.addEventListener('blur', () => {
    if (rtdEmail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rtdEmail.value)) {
      rtdEmailWrap.classList.add('error');
    } else {
      rtdEmailWrap.classList.remove('error');
    }
  });
}

  // close handlers
  closeBtn?.addEventListener("click", hideCard);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideCard();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") hideCard();
  });

  // toggle days for outstation/custom
  function toggleDays() {
    const v = (typeEl?.value || "").toLowerCase();
    if (!numDaysWrap) return;
    if (v === "outstation" || v === "custom") numDaysWrap.style.display = "";
    else {
      numDaysWrap.style.display = "none";
      const nd = document.getElementById("rtdNumDays");
      if (nd) nd.value = "";
    }
  }
  if (typeEl) {
    typeEl.addEventListener("change", toggleDays);
    toggleDays();
  }

  // Helper: play lottie safely
  function playLottie() {
    try {
      if (lottiePlayer && typeof lottiePlayer.play === "function") lottiePlayer.play();
    } catch (err) {
      // ignore
    }
  }

  // Helper: show success overlay (centralized)
  function revealSuccessPanel() {
    // freeze card height so layout doesn't collapse
    const rect = card.getBoundingClientRect();
    card.style.minHeight = Math.ceil(rect.height) + "px";
    card.style.height = Math.ceil(rect.height) + "px";
    card.style.overflow = "hidden";

    // hide form body (we want only the success panel visible)
    if (cardBody) cardBody.style.display = "none";

    // show success centered panel
    if (success) {
      success.hidden = false;
      success.classList.add("show");
    }

    // play lottie & focus Done
    playLottie();
    setTimeout(() => {
      try {
        (doneBtn || successClose)?.focus();
      } catch (e) {}
    }, 320);
  }

  // Helper: restore card and reset
  function restoreAfterDone(closeModal = true) {
    if (success) {
      success.classList.remove("show");
      success.hidden = true;
    }
    if (cardBody) cardBody.style.display = "";
    card.style.minHeight = "";
    card.style.height = "";
    card.style.overflow = "";
    form.reset();
    toggleDays();
    const btn = form.querySelector(".rtd-cta");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Request booking";
    }
    if (closeModal) hideCard();
  }

  // ---------------------------
  // Submit handler (calls backend)
  // ---------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (numDaysWrap && numDaysWrap.style.display !== "none") {
      const nd = document.getElementById("rtdNumDays");
      if (!nd?.value || Number(nd.value) < 1) {
        nd.focus();
        nd.reportValidity?.();
        return;
      }
    }

    const submitBtn = form.querySelector(".rtd-cta");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing…";
    }

    // build payload (IDs must match your HTML)
    const payload = {
      fullName: document.getElementById("rtdName")?.value || "",
      phone: document.getElementById("rtdPhone")?.value || "",
      email: (document.getElementById("rtdEmail")?.value || document.getElementById("email")?.value || ""),
      bookingType: document.getElementById("rtdType")?.value || "",
      carType: document.getElementById("rtdCar")?.value || "",
      numDays: document.getElementById("rtdNumDays")?.value || null,
      date: document.getElementById("rtdDate")?.value || "",
      time: document.getElementById("rtdTime")?.value || "",
      pickup: document.getElementById("rtdPickup")?.value || "",
      notes: document.getElementById("rtdNotes")?.value || "",
      service: (document.getElementById("serviceField")?.value) || (document.querySelector(".open-booking")?.dataset?.service) || "",
      source: (document.getElementById("formSource")?.value) || (document.querySelector(".open-booking")?.dataset?.source) || "website"
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // network-level error
      if (!res) throw new Error("No response from server");

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const err = (data && data.error) ? data.error : "Failed to submit booking. Please try again.";
        // show friendly inline alert (fallback to alert)
        try {
          alert(err);
        } catch (e) {}
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Request booking"; }
        return;
      }

      // success path: use returned bookingId (server-generated)
      if (bookingIdEl && data.bookingId) bookingIdEl.textContent = data.bookingId;
      else if (bookingIdEl) bookingIdEl.textContent = "RT-XXXXX-XXXX"; // fallback visual

      // reveal success panel
      revealSuccessPanel();

    } catch (err) {
      console.error("submit error", err);
      try { alert("Failed to submit booking. Please try again."); } catch (e) {}
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Request booking"; }
    }
  });

  // Done / success close handler
  successClose?.addEventListener("click", () => {
    restoreAfterDone(true);
  });

  // allow copying booking id
  async function flashCopyState(msg = "Copied") {
    if (!copyBtn) return;
    const txt = copyBtn.querySelector(".rtd-copy-text");
    const orig = txt ? txt.textContent : "";
    copyBtn.classList.add("rtd-copied");
    if (txt) txt.textContent = msg;
    setTimeout(() => {
      if (txt) txt.textContent = orig;
      copyBtn.classList.remove("rtd-copied");
    }, 1400);
  }

  copyBtn?.addEventListener("click", async () => {
    try {
      const id = bookingIdEl?.textContent || "";
      if (!id) return;
      await navigator.clipboard.writeText(id);
      flashCopyState("Copied");
    } catch (err) {
      flashCopyState("Copy");
    }
  });

  // clicking booking ID copies too (accessibility)
  bookingIdEl?.addEventListener("click", async () => {
    try {
      const id = bookingIdEl.textContent || "";
      await navigator.clipboard.writeText(id);
      flashCopyState("Copied");
    } catch (e) {
      flashCopyState("Copy");
    }
  });

  // ---------------------------
  // Polished success interactions (ARIA, play lottie, confetti)
  // ---------------------------
  // aria-live helper
  if (!document.getElementById("rtd-announce")) {
    const ann = document.createElement("div");
    ann.id = "rtd-announce";
    ann.setAttribute("aria-live", "polite");
    ann.setAttribute("aria-atomic", "true");
    ann.style.position = "absolute";
    ann.style.left = "-9999px";
    ann.style.width = "1px";
    ann.style.height = "1px";
    ann.style.overflow = "hidden";
    document.body.appendChild(ann);
  }
  const announcer = document.getElementById("rtd-announce");

  // global helper to show polished success (used above as window.rtdShowSuccess)
  function finalizeSuccessPolish() {
    if (!success.classList.contains("show")) success.classList.add("show");
    success.hidden = false;
    try { if (lottiePlayer && typeof lottiePlayer.play === "function") lottiePlayer.play(); } catch (e) {}
    // confetti burst
    playConfetti();
    // booking id shimmer
    if (bookingIdEl) {
      bookingIdEl.classList.remove("enter");
      void bookingIdEl.offsetWidth;
      bookingIdEl.classList.add("enter");
    }
    // focus done button
    setTimeout(() => {
      try { (doneBtn || successClose)?.focus(); } catch (e) {}
    }, 350);

    if (announcer) {
      announcer.textContent = "Booking request received. Confirmation will be sent via WhatsApp.";
      setTimeout(() => { announcer.textContent = ""; }, 5000);
    }
  }
  // expose global hook (some older code paths call window.rtdShowSuccess)
  window.rtdShowSuccess = finalizeSuccessPolish;

  // ---------------------------
  // Confetti helper (lightweight)
  // ---------------------------
  const confettiLayerId = "rtdConfettiLayer";
  function ensureConfettiLayer() {
    let layer = document.getElementById(confettiLayerId);
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = confettiLayerId;
    layer.className = "rtd-confetti";
    const modalWrap = document.getElementById("rtd-bookingModal");
    modalWrap && modalWrap.appendChild(layer);
    return layer;
  }

  function playConfetti() {
    const layer = ensureConfettiLayer();
    layer.innerHTML = "";
    const count = 12;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "dot";
      const colors = ["#1fb169", "#06b05b", "#9fe6c9", "#0a6f48", "#c9f0dd"];
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.left = Math.round(Math.random() * 90) + "%";
      el.style.bottom = "6px";
      layer.appendChild(el);
      const delay = Math.random() * 240;
      el.style.animation = `rtdConfettiFly 1200ms cubic-bezier(.2,.9,.2,1) ${delay}ms forwards`;
    }
    setTimeout(() => { layer.innerHTML = ""; }, 2400);
  }

  // MutationObserver backup: if some other code toggles .show on #rtdSuccess, run polish
  try {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "class") {
          if (success.classList.contains("show")) finalizeSuccessPolish();
        }
      }
    });
    mo.observe(success, { attributes: true, attributeFilter: ["class"] });
  } catch (e) {
    /* ignore */
  }

  // End of DOMContentLoaded handler
});

/* ===== RTD: modal entry/exit + robust success finalize (append to end of public/js/booking.js) ===== */
(function(){
  const modal = document.getElementById('rtd-bookingModal');
  const card  = modal?.querySelector('.rtd-card');
  const brand = modal?.querySelector('.rtd-brand');
  const success = document.getElementById('rtdSuccess');
  const successInner = success?.querySelector('.rtd-success-inner');
  const doneBtn = document.getElementById('rtdDone') || document.querySelector('.rtd-close-success');
  const closeBtn = modal?.querySelector('.rtd-close');

  if (!modal || !card || !success) return;

  // Show card with class and optional brand entrance
  function showModalCard() {
    modal.setAttribute('aria-hidden','false');
    // brand entrance
    if (brand) {
      brand.classList.remove('rtd-in');
      void brand.offsetWidth;
      brand.classList.add('rtd-in');
    }
    // card entrance
    card.classList.remove('rtd-out');
    void card.offsetWidth;
    card.classList.add('rtd-in');
    // reset any previous success state
    success.classList.remove('show');
    success.hidden = true;
    if (card.querySelector('.rtd-card-body')) card.querySelector('.rtd-card-body').classList.remove('dimmed');
  }

  // Hide card
  function hideModalCard() {
    card.classList.remove('rtd-in');
    void card.offsetWidth;
    card.classList.add('rtd-out');
    setTimeout(()=> { modal.setAttribute('aria-hidden','true'); }, 300);
  }

  // Expose to global (used by some code paths)
  window.rtdShowModal = showModalCard;
  window.rtdHideModal = hideModalCard;

  // Finalize success (show success panel, hide form body, play lottie)
  window.rtdFinalizeSuccess = function finalizeSuccess() {
    // hide the scrollable form content but keep the card sizing so layout doesn't jump
    const body = card.querySelector('.rtd-card-body');
    if (body) {
      body.classList.add('dimmed'); // visually dim / blur the background
    }

    // reveal success overlay
    success.hidden = false;
    success.classList.add('show');

    // ensure card stays same size (prevent collapse)
    const rect = card.getBoundingClientRect();
    card.style.minHeight = Math.ceil(rect.height) + 'px';
    card.style.height = Math.ceil(rect.height) + 'px';
    card.style.overflow = 'hidden';

    // play lottie if available
    try { const l = document.getElementById('rtdLottie'); if (l && typeof l.play === 'function') l.play(); } catch(e){}

    // create confetti layer and play a small burst
    (function playConfetti(){
      const id = 'rtdConfettiLayer';
      let layer = document.getElementById(id);
      if (!layer) {
        layer = document.createElement('div');
        layer.id = id;
        layer.className = 'rtd-confetti';
        card.appendChild(layer);
      }
      layer.innerHTML = '';
      for (let i=0;i<10;i++){
        const el = document.createElement('div');
        el.className = 'rtd-dot';
        el.style.position = 'absolute';
        el.style.width = '10px';
        el.style.height = '10px';
        el.style.borderRadius = '6px';
        const palette = ['#1fb169','#06b05b','#9fe6c9','#0a6f48','#c9f0dd'];
        el.style.background = palette[Math.floor(Math.random()*palette.length)];
        el.style.left = (10 + Math.random()*80) + '%';
        el.style.bottom = '8px';
        el.style.transform = `translateY(0)`;
        el.style.opacity = '0';
        layer.appendChild(el);
        // animate via JS
        setTimeout(()=> {
          el.style.transition = `transform 900ms cubic-bezier(.2,.9,.2,1), opacity 900ms`;
          el.style.transform = `translateY(-150px) rotate(${Math.random()*360}deg)`;
          el.style.opacity = '1';
        }, i*60);
      }
      setTimeout(()=> { layer.innerHTML = ''; }, 1400);
    })();

    // focus Done button for keyboard users
    setTimeout(()=> { try { (doneBtn || closeBtn).focus(); } catch(e){} }, 300);
  };

  // Wire Done to restore form (but DO NOT auto-close unless user clicks)
  (doneBtn || document).addEventListener('click', (ev) => {
    if (!ev.target) return;
    const t = ev.target.closest('#rtdDone, .rtd-close-success');
    if (!t) return;
    // restore card body and reset
    const body = card.querySelector('.rtd-card-body');
    if (body) body.classList.remove('dimmed');
    success.classList.remove('show');
    success.hidden = true;
    // remove fixed height so card returns to natural size
    card.style.minHeight = '';
    card.style.height = '';
    card.style.overflow = '';
    // optionally reset form (uncomment if desired)
    try { const form = document.getElementById('rtdForm'); if (form) form.reset(); } catch(e){}
    // put focus back to primary field
    try { document.getElementById('rtdName')?.focus(); } catch(e){}
    // keep modal open (user asked to see Done only)
  });

  // make close button also hide modal
  closeBtn?.addEventListener('click', hideModalCard);
  // background click closes
  modal.addEventListener('click', (ev) => { if (ev.target === modal) hideModalCard(); });
  // Escape key closes
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') hideModalCard(); });

})();
