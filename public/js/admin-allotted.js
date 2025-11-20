// public/js/admin-allotted.js
// at top of admin-assign.js, after token check and function definitions
const pendingToLoad = localStorage.getItem('lastBookingToLoad');
if (pendingToLoad) {
  localStorage.removeItem('lastBookingToLoad');
  // wait a tick so assign page finishes init then load
  setTimeout(()=> { if (typeof loadBookingDetails === 'function') loadBookingDetails(pendingToLoad); else console.warn('loadBookingDetails not ready'); }, 300);
}

// Improved display for allotted bookings: formatting, clickable phone, sortable columns, load booking link
(() => {

  const qEl = document.getElementById('allottedQ'),
        searchBtn = document.getElementById('searchAllotted'),
        perPageEl = document.getElementById('perPage'),
        prevBtn = document.getElementById('prevPage'),
        nextBtn = document.getElementById('nextPage'),
        tableBody = document.querySelector('#allottedTable tbody'),
        pagerInfo = document.getElementById('pagerInfo'),
        refreshBtn = document.getElementById('refreshAllotted'),
        backBtn = document.getElementById('backBtn'),
        exportBtn = document.getElementById('exportCsv');

  let page = 1, perPage = Number(perPageEl.value || 20), total = 0, lastQuery = '';
  let sortBy = 'allotted_at', sortDir = 'desc'; // default sort

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(d);
    } catch (e) { return iso; }
  }

  function escapeHtml(s){ if(!s && s !== 0) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  function renderRows(rows) {
    tableBody.innerHTML = '';
    if (!rows || !rows.length) {
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:18px;color:#6f7e74">No allotted bookings</td></tr>';
      pagerInfo.textContent = '0 items';
      return;
    }
    rows.forEach(r => {
      const driver = r.driver_name ? `<strong>${escapeHtml(r.driver_name)}</strong><br><a href="tel:${escapeHtml(r.driver_phone||'')}" class="muted small">${escapeHtml(r.driver_phone||'')}</a>` : '-';
      const vehicle = (r.vehicle_model ? `<strong>${escapeHtml(r.vehicle_model)}</strong>` : '') + (r.vehicle_regno ? `<div class="muted small">${escapeHtml(r.vehicle_regno)}</div>` : '');
      // clickable booking id loads into assign-driver page
      const bookingLink = `<a href="#" class="booking-link" data-id="${escapeHtml(r.booking_id)}">${escapeHtml(r.booking_id)}</a>`;
      const row = `<tr>
        <td class="col-id">${bookingLink}</td>
        <td>${escapeHtml(r.full_name)}</td>
        <td><a href="tel:${escapeHtml(r.phone||'')}">${escapeHtml(r.phone||'')}</a></td>
        <td>${escapeHtml(r.pickup||'')}</td>
        <td>${escapeHtml((r.date||'') + ' ' + (r.time||''))}<div class="muted small">${fmtDate(r.allotted_at)}</div></td>
        <td>${driver}</td>
        <td>${vehicle || '-'}</td>
        <td class="muted small">${escapeHtml(r.source||'')}</td>
      </tr>`;
      tableBody.insertAdjacentHTML('beforeend', row);
    });

    // wire booking links
    Array.from(tableBody.querySelectorAll('.booking-link')).forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const id = a.dataset.id;
        // store id for assign page to pick up
        localStorage.setItem('lastBookingToLoad', id);
        window.location.href = '/admin/assign-driver';
      });
    });

    pagerInfo.textContent = `${(page-1)*perPage + 1} - ${Math.min(page*perPage, total)} of ${total}`;
  }

  async function loadPage(q = '') {
    const params = { filter: 'allotted', page, perPage, q, sortBy, sortDir };
    // remove empty q
    const qp = Object.keys(params).filter(k => params[k] !== '' && params[k] !== undefined).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const url = '/api/bookings' + (qp ? '?' + qp : '');
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const rows = data.bookings || [];
      total = data.total || rows.length;
      renderRows(rows);
    } catch (e) {
      console.error(e);
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:18px;color:#6f7e74">Unable to load allotted bookings</td></tr>';
    }
  }

  // simple client-side sort toggles (updates sortBy/sortDir and reload)
  document.querySelectorAll('#allottedTable thead th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const key = th.datasetSort || th.textContent.trim().toLowerCase().replace(/\s+/g, '_');
      if (sortBy === key) sortDir = (sortDir === 'desc') ? 'asc' : 'desc';
      else { sortBy = key; sortDir = 'desc'; }
      page = 1;
      loadPage(lastQuery);
    });
  });

  searchBtn.addEventListener('click', () => { page = 1; lastQuery = qEl.value.trim(); loadPage(lastQuery); });
  perPageEl.addEventListener('change', () => { perPage = Number(perPageEl.value); page = 1; loadPage(lastQuery); });
  prevBtn.addEventListener('click', () => { if (page>1) { page--; loadPage(lastQuery); }});
  nextBtn.addEventListener('click', () => { if ((page*perPage) < total) { page++; loadPage(lastQuery); }});
  refreshBtn.addEventListener('click', () => loadPage(lastQuery));
  backBtn.addEventListener('click', () => window.location.href = '/admin/assign-driver');

  exportBtn.addEventListener('click', async () => {
    try {
      const res = await fetch("/api/bookings", { credentials: "include"});
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const rows = data.bookings || [];
      if (!rows.length) return alert('No rows to export');
      const csv = rows.map(r => [
        r.booking_id, r.full_name, r.phone, r.pickup, (r.date||'') + ' ' + (r.time||''), r.driver_name, r.driver_phone, r.vehicle_model, r.vehicle_regno, r.allotted_at || ''
      ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
      const header = 'Booking ID,Customer,Phone,Pickup,DateTime,Driver,DriverPhone,VehicleModel,VehicleRegNo,AllottedAt\n';
      const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `allotted_bookings_${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Export failed'); }
  });

  // check if assign page should auto-load a booking (when user clicked booking link)
  if (localStorage.getItem('lastBookingToLoad')) {
    // if user navigated from this page, we keep the value until assign page consumes it.
    // nothing to do here in allotted page; assign page should check this key and load.
  }

  // initial
  loadPage('');
})();
