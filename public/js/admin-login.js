// public/js/admin-login.js
document.addEventListener('DOMContentLoaded', function() {
  const openBtn = document.getElementById('adminLoginBtn');
  const modal = document.getElementById('adminLoginModal');
  const cancel = document.getElementById('adminCancel');
  const submit = document.getElementById('adminSubmit');
  const msg = document.getElementById('adminLoginMsg');

  function showModal() {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    msg.textContent = '';
    document.getElementById('adminEmail').focus();
  }
  function hideModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    msg.textContent = '';
  }

  if (openBtn) openBtn.addEventListener('click', showModal);
  if (cancel) cancel.addEventListener('click', hideModal);
  // close on overlay click
  modal && modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  if (submit) {
    submit.addEventListener('click', async () => {
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      if (!email || !password) {
        msg.style.color = '#b00'; msg.textContent = 'Email and password are required';
        return;
      }
      msg.style.color = '#333'; msg.textContent = 'Logging in…';

      try {
        const res = await fetch('/admin/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          msg.style.color = '#b00';
          msg.textContent = data && data.error ? data.error : (data && data.message ? data.message : 'Login failed');
          return;
        }
        // Success: server set an httpOnly cookie — redirect to admin panel
        msg.style.color = '#080';
        msg.textContent = 'Login successful — redirecting to Admin panel...';
        setTimeout(() => {
          window.location.href = "/admin/assign-driver";
        }, 500);
      } catch (err) {
        console.error('Admin login error', err);
        msg.style.color = '#b00';
        msg.textContent = 'Network error';
      }
    });
  }
});

// show forgot modal
const forgotLink = document.getElementById('forgotPwdLink');
forgotLink && forgotLink.addEventListener('click', () => {
  // show a small prompt modal, or use prompt() for quick test:
  const email = prompt('Enter your admin email to receive reset instructions:');
  if (!email) return;
  fetch('/admin/auth/forgot-password', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email })
  }).then(r => r.json()).then(data => {
    alert(data && data.message ? data.message : 'If registered, you will get reset mail.');
  }).catch(e => {
    console.error(e);
    alert('Network error');
  });
});
