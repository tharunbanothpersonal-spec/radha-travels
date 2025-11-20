// public/js/admin-assign.js
// Updated: filters/tabs support + "Allotted" view + driver info in list
(() => {

  // DOM refs
  const qInp = document.getElementById('q'), searchBtn = document.getElementById('searchBtn');
  const bookingsList = document.getElementById('bookingsList'), totalCount = document.getElementById('totalCount');
  const selBookingId = document.getElementById('selBookingId'), selBookingName = document.getElementById('selBookingName');
  const pickupEl = document.getElementById('pickup'), dropEl = document.getElementById('drop'), datetimeEl = document.getElementById('datetime'), notesEl = document.getElementById('notes');
  const driverName = document.getElementById('driverName'), driverPhone = document.getElementById('driverPhone');
  const vehicleModel = document.getElementById('vehicleModel'), vehicleReg = document.getElementById('vehicleReg');
  const allotBtn = document.getElementById('allotBtn'), clearBtn = document.getElementById('clearBtn'), msgDiv = document.getElementById('msg');
  const refreshBtn = document.getElementById('refreshBtn'), refreshBtnHeader = document.getElementById('refreshBtnHeader');
  const logoutBtn = document.getElementById('logoutBtn'), openResetPageBtn = document.getElementById('openResetPage');
  const changePwdModal = document.getElementById('changePwdModal'), openChangeBtn = document.getElementById('openChangePwdBtn');
  const cancelChange = document.getElementById('cancelChange'), submitChange = document.getElementById('submitChange'), changeMsg = document.getElementById('changeMsg');
  const confirmModal = document.getElementById('confirmModal'), confirmText = document.getElementById('confirmText');
  const confirmOk = document.getElementById('confirmOk'), confirmCancel = document.getElementById('confirmCancel');
  const undoToast = document.getElementById('undoToast'), undoBtn = document.getElementById('undoBtn'), undoClose = document.getElementById('undoClose');
  const driverSuggestions = document.getElementById('driverSuggestions');
  const tabs = Array.from(document.querySelectorAll('.tab'));

  let cache = [], currentBooking = null, lastAssign = null, timer = null;
  let currentFilter = 'unassigned'; // unassigned | today | all | allotted

  function showMsg(text, ok=true) {
    if (!msgDiv) return;
    msgDiv.style.display = text ? 'block' : 'none';
    msgDiv.textContent = text || '';
    msgDiv.className = ok ? 'msg ok' : 'msg err';
    if (!text) msgDiv.className = '';
  }

  // build querystring helper
  function qs(params) {
    return Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  }

  // fetch bookings from server with currentFilter and optional q
  async function fetchBookings(q = '') {
    bookingsList.innerHTML = '<div class="list-empty">Loading…</div>';
    try {
      const params = { filter: currentFilter };
      if (q) params.q = q;
      const url = '/api/bookings' + (Object.keys(params).length ? '?' + qs(params) : '');
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch failed ' + res.status);
      const data = await res.json();
      cache = Array.isArray(data) ? data : (data.bookings || []);
      renderList(cache);
      if (totalCount) totalCount.textContent = cache.length;
      console.debug('[admin] bookings loaded', cache.length, 'filter=', currentFilter, 'q=', q, 'sample:', (cache.slice(0,5).map(b=>b.booking_id||b.bookingId)));
    } catch (e) {
      bookingsList.innerHTML = '<div class="list-empty">Unable to load bookings</div>';
      console.error(e);
    }
  }

  function renderList(rows) {
    bookingsList.innerHTML = '';
    if (!rows || !rows.length) { bookingsList.innerHTML = '<div class="list-empty">No bookings</div>'; return; }
    rows.forEach(b => {
      const driverInfo = (b.driver_name ? `<div class="small muted">Driver: ${escapeHtml(b.driver_name)} ${b.driver_phone ? '• ' + escapeHtml(b.driver_phone) : ''}</div>` : '');
      const vehicleInfo = (b.vehicle_regno ? `<div class="small muted">Vehicle: ${escapeHtml(b.vehicle_model||'')} ${escapeHtml(b.vehicle_regno||'')}</div>` : '');
      const status = (b.status || 'pending').toLowerCase();
      const pillClass = status === 'allotted' ? 'allotted' : (status === 'completed' ? 'completed' : 'pending');
      const el = document.createElement('div');
      el.className = 'booking-card';
      el.innerHTML = `<div>
          <div class="booking-id">${escapeHtml(b.booking_id||b.bookingId||'—')}</div>
          <div class="booking-meta">${escapeHtml(b.full_name||b.fullName||'')} • ${escapeHtml(b.phone||'')}</div>
          <div class="muted small">${escapeHtml(b.date||'')} ${escapeHtml(b.time||'')}</div>
          ${driverInfo}
          ${vehicleInfo}
        </div>
        <div>
          <span class="pill ${pillClass}">${(b.status||'pending').toUpperCase()}</span>
          <div style="height:8px"></div>
          <button class="btn ghost loadBtn" data-id="${escapeAttr(b.booking_id||b.bookingId||'')}">Load</button>
        </div>`;
      bookingsList.appendChild(el);
    });
    Array.from(document.querySelectorAll('.loadBtn')).forEach(btn => btn.addEventListener('click', () => loadBookingDetails(btn.dataset.id)));
  }

  // load single booking (server query)
  async function loadBookingDetails(id) {
    try {
      const res = await fetch('/api/bookings/' + encodeURIComponent(id), { credentials: 'include' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const b = data.booking || data || {};
      currentBooking = b;
      selBookingId.textContent = b.booking_id || b.bookingId || '—';
      selBookingName.textContent = (b.full_name || b.fullName || '') + ' • ' + (b.phone || '');
      pickupEl.textContent = b.pickup || b.pickup_location || '—';
      dropEl.textContent = b.drop || b.destination || '—';
      datetimeEl.textContent = (b.date || '') + ' ' + (b.time || '');
      notesEl.textContent = b.notes || '—';
      const status = (b.status || 'pending').toUpperCase();
      const statusPill = document.getElementById('statusPill');
      if (statusPill) {
        statusPill.textContent = status;
        statusPill.className = 'status-pill ' + status.toLowerCase();
      }
      // driver fields (show assigned values if any)
      driverName.value = b.driver_name || '';
      driverPhone.value = b.driver_phone || '';
      vehicleModel.value = b.vehicle_model || '';
      vehicleReg.value = b.vehicle_regno || '';
      // small visual highlight if already allotted
      if (b.driver_name) {
        showMsg(`This booking is already assigned to ${b.driver_name} (${b.driver_phone || 'no phone'})`, true);
      } else {
        showMsg('');
      }
    } catch (e) {
      console.error(e);
      showMsg('Booking not found', false);
    }
  }

  // search: try server-by-id first (robust), else server-side q (preferred)
  searchBtn && searchBtn.addEventListener('click', async () => {
    const q = (qInp.value || '').trim();
    if (!q) { fetchBookings(); return; }

    // looks like booking id -> try id endpoint first
    const looksLikeBookingId = /^RT|rt/i.test(q) || q.includes('-');
    if (looksLikeBookingId) {
      try {
        const r = await fetch('/api/bookings/' + encodeURIComponent(q), { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          renderList([data.booking || data]);
          return;
        }
      } catch(e) { console.warn('id lookup failed', e); }
    }

    // server-side q search (preferred to client-only)
    try {
      await fetchBookings(q);
    } catch (e) {
      // fallback to client-side filter if server-search fails
      console.warn('server search failed, falling back to client filter', e);
      const qlow = q.toLowerCase();
      const filtered = cache.filter(r => (r.booking_id||r.bookingId||'').toString().toLowerCase().includes(qlow) ||
        (r.full_name||r.fullName||'').toString().toLowerCase().includes(qlow) || (r.phone||'').toString().includes(qlow));
      renderList(filtered);
    }
  });

  // tabs: wire up filter buttons
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const f = t.dataset.filter;
      if (f) {
        currentFilter = f;
        // clear search input when changing filter
        qInp.value = '';
        fetchBookings();
      }
    });
  });

  // confirm + assign
  function openConfirm(text, onOk) {
    if (!confirmModal) return onOk();
    confirmText.textContent = text;
    confirmModal.style.display = 'flex';
    confirmOk.onclick = () => { confirmModal.style.display = 'none'; onOk(); };
    confirmCancel.onclick = () => confirmModal.style.display = 'none';
  }

  allotBtn && allotBtn.addEventListener('click', () => {
    if (!currentBooking) return showMsg('Pick a booking first', false);
    const bookingId = currentBooking.booking_id || currentBooking.bookingId;
    const driver = { name: driverName.value.trim(), phone: driverPhone.value.trim() };
    const vehicle = { model: vehicleModel.value.trim(), regNo: vehicleReg.value.trim() };
    if (!driver.name || !driver.phone || !vehicle.model || !vehicle.regNo) return showMsg('Driver & vehicle required', false);
    openConfirm(`Assign ${driver.name} (${driver.phone}) to ${bookingId}?`, () => doAssign(bookingId, driver, vehicle));
  });

  async function doAssign(bookingId, driver, vehicle) {
    showMsg('Assigning — please wait...');
    allotBtn.disabled = true;
    try {
      const res = await fetch('/admin/bookings/' + encodeURIComponent(bookingId) + '/allot', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver, vehicle })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { showMsg(data && data.error ? data.error : 'Allot failed', false); return; }
      showMsg('Assigned and user notified', true);
      lastAssign = { bookingId, driver, vehicle, ts: Date.now() };
      showUndo();
      await loadBookingDetails(bookingId);
      setTimeout(() => fetchBookings(), 700);
    } catch (e) {
      console.error(e); showMsg('Network error', false);
    } finally { allotBtn.disabled = false; }
  }

  // undo toast
  function showUndo() {
    if (!undoToast) return;
    undoToast.style.display = 'flex';
    setTimeout(() => { hideUndo(); }, 9000);
  }
  function hideUndo() {
    if (!undoToast) return;
    undoToast.style.display = 'none';
  }
  undoBtn && undoBtn.addEventListener('click', async () => {
    if (!lastAssign) return;
    try {
      const res = await fetch('/admin/bookings/' + encodeURIComponent(lastAssign.bookingId) + '/allot', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver: null, vehicle: null, undo: true })
      });
      const d = await res.json();
      hideUndo();
      showMsg(d && d.ok ? 'Assignment undone' : (d.error || 'Undo failed'), d && d.ok);
      setTimeout(() => fetchBookings(), 700);
    } catch (e) { console.error(e); showMsg('Undo failed', false); }
  });
  undoClose && (undoClose.onclick = hideUndo);

  // driver suggestions (local cache first)
  driverName.addEventListener('input', () => {
    const q = driverName.value.trim().toLowerCase();
    if (!q) { driverSuggestions.style.display = 'none'; return; }
    clearTimeout(timer);
    timer = setTimeout(() => {
      const drivers = [];
      cache.forEach(b => { if (b.driver_name) drivers.push({ name: b.driver_name, phone: b.driver_phone }); });
      const uniq = [];
      drivers.forEach(d => { if (!uniq.find(x => x.name === d.name && x.phone === d.phone)) uniq.push(d); });
      const matches = uniq.filter(d => d.name.toLowerCase().includes(q) || (d.phone||'').includes(q)).slice(0, 8);
      if (!matches.length) { driverSuggestions.style.display = 'none'; return; }
      driverSuggestions.innerHTML = matches.map(m => `<div class="item" data-name="${escapeAttr(m.name)}" data-phone="${escapeAttr(m.phone||'')}"><strong>${escapeHtml(m.name)}</strong> <span class="muted small">${escapeHtml(m.phone||'')}</span></div>`).join('');
      driverSuggestions.style.display = 'block';
      Array.from(driverSuggestions.querySelectorAll('.item')).forEach(it => it.addEventListener('click', () => {
        driverName.value = it.dataset.name || '';
        driverPhone.value = it.dataset.phone || '';
        driverSuggestions.style.display = 'none';
      }));
    }, 200);
  });

  document.addEventListener('click', (e) => { if (!driverSuggestions.contains(e.target) && e.target !== driverName) driverSuggestions.style.display = 'none'; });

  // search click / refresh / other handlers
  refreshBtn && refreshBtn.addEventListener('click', () => fetchBookings());
  refreshBtnHeader && refreshBtnHeader.addEventListener('click', () => fetchBookings());
  clearBtn && clearBtn.addEventListener('click', () => { driverName.value=''; driverPhone.value=''; vehicleModel.value=''; vehicleReg.value=''; showMsg('Cleared', true); });
  logoutBtn && logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/admin/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { console.warn('logout failed', e); }
    window.location.href = '/';
  });
  openResetPageBtn && openResetPageBtn.addEventListener('click', () => window.open('/admin/reset.html', '_blank'));
  // Go to allotted bookings
const goAllottedBtn = document.getElementById('goAllottedBtn');
if (goAllottedBtn) {
  goAllottedBtn.addEventListener('click', () => {
    // activate tab
    const allottedTab = document.querySelector('.tab[data-filter="allotted"]');
    if (allottedTab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      allottedTab.classList.add('active');
    }

    // set filter
    currentFilter = 'allotted';

    // clear search
    if (qInp) qInp.value = '';

    // fetch allotted bookings
    fetchBookings();

    // scroll to list
    const listPanel = document.querySelector('.list-panel');
    if (listPanel) listPanel.scrollIntoView({ behavior: "smooth" });
  });
}


  // change password (modal)
  if (openChangeBtn) openChangeBtn.addEventListener('click', () => { if (changePwdModal) changePwdModal.style.display = 'flex'; if (changeMsg) changeMsg.innerText = ''; });
  if (cancelChange) cancelChange.addEventListener('click', () => { if (changePwdModal) changePwdModal.style.display = 'none'; });
  if (submitChange) submitChange.addEventListener('click', async () => {
    const cur = document.getElementById('curPwd').value, np = document.getElementById('newPwd').value;
    if (!cur || !np || np.length < 8) { if (changeMsg) { changeMsg.style.color = '#b00'; changeMsg.innerText = 'Provide current + new (8+ chars)'; } return; }
    if (changeMsg) { changeMsg.style.color = '#444'; changeMsg.innerText = 'Updating...'; }
    try {
      const r = await fetch('/admin/auth/change-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cur, newPassword: np }) });
      const d = await r.json();
      if (!r.ok || !d.ok) { if (changeMsg) { changeMsg.style.color = '#b00'; changeMsg.innerText = d.error || 'Change failed'; } return; }
      if (changeMsg) { changeMsg.style.color = '#080'; changeMsg.innerText = 'Password changed — logging out'; }
      setTimeout(() => { window.location.href = '/'; }, 900);
    } catch (e) { console.error(e); if (changeMsg) { changeMsg.style.color = '#b00'; changeMsg.innerText = 'Network error'; } }
  });

  // small helpers
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }
  function escapeAttr(s){ return (s||'').replace(/"/g, '&quot;'); }

  // If allot page was reached from allotted list, auto-load pending booking id
  const pendingToLoad = localStorage.getItem('lastBookingToLoad');
  if (pendingToLoad) {
    localStorage.removeItem('lastBookingToLoad');
    setTimeout(() => {
      if (typeof loadBookingDetails === 'function') loadBookingDetails(pendingToLoad);
      else window.__pendingBookingToLoad = pendingToLoad;
    }, 250);
  }

  // initial load
  fetchBookings();
})();
