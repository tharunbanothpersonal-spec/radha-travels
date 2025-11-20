// public/js/admin-assign-ui-patch.js
document.addEventListener('DOMContentLoaded', () => {
  // focus search box
  const q = document.getElementById('q');
  if (q) { q.focus(); }

  // Animate booking card entrance
  const observer = new MutationObserver(() => {
    document.querySelectorAll('#bookingsList .booking-card').forEach((el, i) => {
      el.style.opacity = 0;
      el.style.transform = 'translateY(6px)';
      setTimeout(() => { el.style.transition = 'all .28s ease'; el.style.opacity = 1; el.style.transform = 'translateY(0)'; }, 40 + i*30);
    });
  });
  const list = document.getElementById('bookingsList');
  if (list) observer.observe(list, { childList: true, subtree: false });

  // small success micro-animation for Assign button
  const allotBtn = document.getElementById('allotBtn');
  if (allotBtn) {
    const original = allotBtn.innerHTML;
    const showSuccess = () => {
      allotBtn.disabled = true;
      allotBtn.innerHTML = '✔ Assigned';
      setTimeout(() => { allotBtn.innerHTML = original; allotBtn.disabled = false; }, 1200);
    };
    // listen for a custom event that your JS should dispatch when assign succeeded:
    document.addEventListener('rt:assign-success', showSuccess);
  }

  // Undo toast close
  document.getElementById('undoClose')?.addEventListener('click', () => {
    const t = document.getElementById('undoToast'); if (t) t.style.display = 'none';
  });
});
