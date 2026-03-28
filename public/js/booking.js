// public/js/booking.js
// Master Executive Booking Form Logic
console.log("EXECUTIVE BOOKING JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("rtd-bookingModal");
  if (!modal) return;

  const card = modal.querySelector(".rtd-card");
  const form = document.getElementById("rtdForm");
  const successOverlay = document.getElementById("rtdSuccess");
  const lottiePlayer = document.getElementById("rtdLottie");
  const closeBtn = modal.querySelector(".rtd-close");
  const doneBtn = document.getElementById("rtdDone");
  const cardBody = modal.querySelector(".rtd-body");
  const submitBtn = form.querySelector(".rtd-btn-submit");
  
  const typeEl = document.getElementById("rtdType");
  const numDaysWrap = document.getElementById("rtdNumDaysWrap");
  const bookingIdEl = document.getElementById("rtdBookingId");
  const copyBtn = document.getElementById("rtdCopyId");

  // --- Modal Show/Hide Logic ---
  function showModal() {
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // LOCK BACKGROUND SCROLL
    setTimeout(() => document.getElementById("rtdName")?.focus(), 160);
  }

  function hideModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // UNLOCK BACKGROUND SCROLL
    setTimeout(() => restoreForm(), 300); // Reset form silently after hiding
  }

  // Bind Open triggers (Elements with class 'open-booking')
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".open-booking");
    if (!trigger) return;
    e.preventDefault();
    showModal();
  });

  // Bind Close triggers
  closeBtn?.addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") hideModal();
  });

  // --- Dynamic Form Fields ---
  function toggleDays() {
    if (!numDaysWrap || !typeEl) return;
    const v = typeEl.value.toLowerCase();
    if (v === "outstation" || v === "custom") {
      numDaysWrap.style.display = "flex"; // Changed from "" to flex to maintain grid
    } else {
      numDaysWrap.style.display = "none";
      const nd = document.getElementById("rtdNumDays");
      if (nd) nd.value = "";
    }
  }
  typeEl?.addEventListener("change", toggleDays);
  toggleDays();

  // --- Email Validation Polish ---
  const rtdEmail = document.getElementById('rtdEmail');
  if (rtdEmail) {
    rtdEmail.addEventListener('blur', () => {
      const wrap = rtdEmail.closest('.rtd-input-wrap');
      if (rtdEmail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rtdEmail.value)) {
        wrap.style.borderColor = "#EF4444"; // Red error state
      } else {
        wrap.style.borderColor = ""; // Reset
      }
    });
  }

  // --- Success & Reset Handlers ---
  function revealSuccessPanel() {
    // Freeze card height so layout doesn't jump
    const rect = card.getBoundingClientRect();
    card.style.minHeight = Math.ceil(rect.height) + "px";
    
    // Crossfade UI
    cardBody.style.opacity = "0";
    setTimeout(() => {
      cardBody.style.display = "none";
      successOverlay.classList.add("show");
      successOverlay.hidden = false;
      
      // Play Animations
      try { if (lottiePlayer) lottiePlayer.play(); } catch (e) {}
      playLuxurySparkles();
    }, 200);
  }

  function restoreForm() {
    successOverlay.classList.remove("show");
    setTimeout(() => {
      successOverlay.hidden = true;
      cardBody.style.display = "";
      setTimeout(() => cardBody.style.opacity = "1", 50);
      
      card.style.minHeight = "";
      form.reset();
      toggleDays();
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Request Booking <i class="fa-solid fa-arrow-right"></i>';
      }
    }, 300);
  }

  doneBtn?.addEventListener("click", () => {
    hideModal();
  });

  // --- Copy ID Logic ---
  copyBtn?.addEventListener("click", async () => {
    try {
      const id = bookingIdEl?.textContent || "";
      if (!id) return;
      await navigator.clipboard.writeText(id);
      
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> COPIED';
      copyBtn.style.color = "#FFFFFF";
      
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.color = "";
      }, 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  });

  // --- Form Submission (Backend API) ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Trigger Loading State
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    }

    const payload = {
      fullName: document.getElementById("rtdName")?.value || "",
      phone: document.getElementById("rtdPhone")?.value || "",
      email: document.getElementById("rtdEmail")?.value || "",
      bookingType: document.getElementById("rtdType")?.value || "",
      carType: document.getElementById("rtdCar")?.value || "",
      numDays: document.getElementById("rtdNumDays")?.value || null,
      date: document.getElementById("rtdDate")?.value || "",
      time: document.getElementById("rtdTime")?.value || "",
      pickup: document.getElementById("rtdPickup")?.value || "",
      notes: document.getElementById("rtdNotes")?.value || ""
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res) throw new Error("No response from server");

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error((data && data.error) ? data.error : "Failed to submit booking.");
      }

      // Populate ID and Show Success
      if (bookingIdEl) bookingIdEl.textContent = data.bookingId || "RT-EX-9982"; 
      revealSuccessPanel();

    } catch (err) {
      console.error("Submit error", err);
      alert(err.message || "Failed to submit booking. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Request Booking <i class="fa-solid fa-arrow-right"></i>';
      }
    }
  });

  // --- Luxury Sparkles Helper (Gold/White instead of Rainbow) ---
  function playLuxurySparkles() {
    let layer = document.getElementById('rtdLuxurySparkles');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'rtdLuxurySparkles';
      layer.style.position = 'absolute';
      layer.style.inset = '0';
      layer.style.pointerEvents = 'none';
      layer.style.zIndex = '60';
      successOverlay.appendChild(layer);
    }
    
    layer.innerHTML = '';
    const colors = ['#D4AF37', '#AA8222', '#FFFFFF', '#F3D266'];
    
    for (let i = 0; i < 15; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.width = Math.random() > 0.5 ? '4px' : '6px';
      el.style.height = el.style.width;
      el.style.borderRadius = '50%';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.left = (20 + Math.random() * 60) + '%';
      el.style.bottom = '40%';
      el.style.opacity = '0';
      el.style.boxShadow = `0 0 8px ${el.style.background}`;
      layer.appendChild(el);
      
      setTimeout(() => {
        el.style.transition = `transform 1200ms cubic-bezier(.2,.9,.2,1), opacity 1000ms`;
        el.style.transform = `translateY(-${60 + Math.random() * 80}px) translateX(${Math.random() * 40 - 20}px) scale(${Math.random() * 1.5 + 0.5})`;
        el.style.opacity = '0.8';
        
        // Fade out
        setTimeout(() => el.style.opacity = '0', 600);
      }, i * 40);
    }
  }

});