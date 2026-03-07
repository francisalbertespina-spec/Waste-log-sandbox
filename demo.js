// ═══════════════════════════════════════════════════════════════════════════
// HDJV WMS — demo.js
// Drop this file into your repo and add <script src="demo.js"></script>
// BEFORE <script src="script.js"></script> in index.html.
//
// What it does:
//   1. Injects a "Try Demo" button on the login screen
//   2. On click, sets fake credentials in localStorage (admin role so ALL
//      features are visible)
//   3. Intercepts window.fetch so every call to the real Apps Script backend
//      is silently redirected to local mock data instead
//   4. Shows a persistent "DEMO MODE" banner so viewers know it's a preview
//
// To disable demo mode: remove this script tag from index.html.
// Nothing in script.js or Code.gs needs to change.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── 1. DEMO CREDENTIALS ────────────────────────────────────────────────
  const DEMO_TOKEN  = 'DEMO_TOKEN_READONLY';
  const DEMO_EMAIL  = 'demo.viewer@hdjv.com';
  const DEMO_NAME   = 'Demo Viewer';
  const DEMO_ROLE   = 'admin';                         // full feature access
  const DEMO_EXPIRY = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  // ── 2. MOCK DATA ───────────────────────────────────────────────────────

  // Realistic hazardous waste entries [date, volume, waste, package, user, photo, timestamp, rowIndex]
  const HAZ_HEADERS = ['date','volume','waste name','package','logged by','photo','system time stamp'];

  function hazRows(pkg) {
    const wastes = ['Used Oil','Oil Contaminated Materials','Grease Waste','Lead Compounds','Paint Waste'];
    const users  = ['juan.delacruz@hdjv.com','maria.santos@hdjv.com','pedro.reyes@hdjv.com', DEMO_EMAIL];
    const rows = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i * 2);
      const dateStr = d.toISOString().split('T')[0];
      rows.push([
        dateStr,
        (Math.random() * 50 + 5).toFixed(3),
        wastes[i % wastes.length],
        pkg,
        users[i % users.length],
        'No Photo',
        new Date(d.getTime() + 3600000).toISOString(),
        i + 2   // rowIndex
      ]);
    }
    return rows;
  }

  // Realistic solid waste entries [date, location, waste, package, user, photo, timestamp, rowIndex]
  const SOLID_HEADERS = ['date','location','waste name','package','logged by','photo','system time stamp'];

  function solidRows(pkg) {
    const wastes = ['Residual Solid Waste','Scrap Metal','Wood Waste','Concrete Debris','Mixed Construction Waste'];
    const locs   = ['Pier 4-A','Pier 4-B','Pier 5-A','Pier 5-B','Pier 6-A','Staging Area'];
    const users  = ['juan.delacruz@hdjv.com','maria.santos@hdjv.com','pedro.reyes@hdjv.com', DEMO_EMAIL];
    const rows = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i * 2 - 1);
      const dateStr = d.toISOString().split('T')[0];
      rows.push([
        dateStr,
        locs[i % locs.length],
        wastes[i % wastes.length],
        pkg,
        users[i % users.length],
        'No Photo',
        new Date(d.getTime() + 7200000).toISOString(),
        i + 2
      ]);
    }
    return rows;
  }

  // User list (for admin → Users panel)
  const MOCK_USERS = [
    { email: 'juan.delacruz@hdjv.com',  status: 'Approved', role: 'user'  },
    { email: 'maria.santos@hdjv.com',   status: 'Approved', role: 'user'  },
    { email: 'pedro.reyes@hdjv.com',    status: 'Approved', role: 'admin' },
    { email: 'new.applicant@hdjv.com',  status: 'Pending',  role: 'user'  },
    { email: 'another.user@hdjv.com',   status: 'Pending',  role: 'user'  },
    { email: 'rejected.user@hdjv.com',  status: 'Rejected', role: 'user'  },
  ];

  // Request / idempotency logs
  const MOCK_REQUESTS = Array.from({ length: 12 }, (_, i) => ({
    id:   `fp-${['juan','maria','pedro'][i%3]}-2025-${String(i+1).padStart(2,'0')}-01`,
    time: new Date(Date.now() - i * 86400000 * 3).toISOString()
  }));

  // ── 3. FETCH INTERCEPTOR ───────────────────────────────────────────────
  // We replace window.fetch with a wrapper.
  // If the URL is the real Apps Script endpoint, we handle it locally.
  // All other URLs (Chart.js CDN, etc.) pass through normally.

  const _realFetch = window.fetch.bind(window);
  const SCRIPT_URL_FRAGMENT = 'script.google.com';

  function mockResponse(data) {
    const body = JSON.stringify(data);
    return Promise.resolve(new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  function handleMockGET(url) {
    const u = new URL(url);
    const p = u.searchParams;
    const action = p.get('action');
    const pkg    = p.get('package');

    // ── validateToken ──────────────────────────────────────────────────
    if (action === 'validateToken') {
      return mockResponse({ valid: true, email: DEMO_EMAIL, role: DEMO_ROLE, tokenExpiry: DEMO_EXPIRY });
    }

    // ── refreshToken ───────────────────────────────────────────────────
    if (action === 'refreshToken') {
      return mockResponse({ success: true, tokenExpiry: DEMO_EXPIRY, email: DEMO_EMAIL, role: DEMO_ROLE });
    }

    // ── logout ─────────────────────────────────────────────────────────
    if (action === 'logout') {
      return mockResponse({ success: true, message: 'Logged out successfully' });
    }

    // ── getUsers ───────────────────────────────────────────────────────
    if (action === 'getUsers') {
      return mockResponse(MOCK_USERS);
    }

    // ── approveUser / rejectUser / updateUserStatus ────────────────────
    if (['approveUser','rejectUser','updateUserStatus','updateUserRole','deleteUser'].includes(action)) {
      showDemoBanner('⚠️ Demo mode — user changes are not saved to the server.');
      return mockResponse({ success: true, message: 'Action simulated (demo mode)' });
    }

    // ── getRequests ────────────────────────────────────────────────────
    if (action === 'getRequests') {
      return mockResponse(MOCK_REQUESTS);
    }

    // ── getImageBase64 ─────────────────────────────────────────────────
    if (action === 'getImageBase64') {
      return mockResponse({ error: 'No photo in demo mode' });
    }

    // ── deleteEntry / editEntry ────────────────────────────────────────
    if (action === 'deleteEntry' || action === 'editEntry') {
      showDemoBanner('⚠️ Demo mode — entry changes are not saved to the server.');
      return mockResponse({ success: true });
    }

    // ── fetch records (package query) ──────────────────────────────────
    if (pkg) {
      const wasteType = p.get('wasteType') || 'hazardous';
      if (wasteType === 'solid') {
        return mockResponse([SOLID_HEADERS, ...solidRows(pkg)]);
      }
      return mockResponse([HAZ_HEADERS, ...hazRows(pkg)]);
    }

    // ── login (email param, no action) ────────────────────────────────
    if (p.get('email') && !action) {
      return mockResponse({ status: 'Approved', token: DEMO_TOKEN, role: DEMO_ROLE, tokenExpiry: DEMO_EXPIRY, email: DEMO_EMAIL, name: DEMO_NAME });
    }

    // Fallback — return empty
    return mockResponse({ error: 'Unknown demo action' });
  }

  function handleMockPOST() {
    showDemoBanner('⚠️ Demo mode — waste log submission is disabled. No data is sent to the server.');
    return mockResponse({ success: true });
  }

  window.fetch = function (input, init) {
    // Only intercept calls to the Apps Script backend
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (!url.includes(SCRIPT_URL_FRAGMENT)) {
      return _realFetch(input, init);
    }

    // Check demo mode is active
    if (localStorage.getItem('userToken') !== DEMO_TOKEN) {
      return _realFetch(input, init);
    }

    const method = (init?.method || 'GET').toUpperCase();
    if (method === 'POST') return handleMockPOST();
    return handleMockGET(url);
  };

  // ── 4. DEMO BANNER ─────────────────────────────────────────────────────

  let _bannerTimeout = null;

  function showDemoBanner(msg) {
    let banner = document.getElementById('wms-demo-action-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'wms-demo-action-banner';
      banner.style.cssText = [
        'position:fixed','bottom:72px','left:50%','transform:translateX(-50%)',
        'background:rgba(230,81,0,0.95)','color:#fff','padding:9px 20px',
        'border-radius:20px','font-size:0.82rem','font-weight:600',
        'z-index:99999','text-align:center','max-width:90vw',
        'box-shadow:0 4px 18px rgba(0,0,0,0.22)','pointer-events:none',
        'transition:opacity 0.3s'
      ].join(';');
      document.body.appendChild(banner);
    }
    banner.textContent = msg;
    banner.style.opacity = '1';
    if (_bannerTimeout) clearTimeout(_bannerTimeout);
    _bannerTimeout = setTimeout(() => { banner.style.opacity = '0'; }, 3500);
  }

  function injectPersistentDemoTag() {
    if (document.getElementById('wms-demo-tag')) return;
    const tag = document.createElement('div');
    tag.id = 'wms-demo-tag';
    tag.innerHTML = '🧪 DEMO MODE';
    tag.style.cssText = [
      'position:fixed','top:10px','right:10px',
      'background:linear-gradient(135deg,#e65100,#bf360c)',
      'color:#fff','padding:5px 13px','border-radius:20px',
      'font-size:0.74rem','font-weight:700','letter-spacing:0.06em',
      'z-index:99999','box-shadow:0 3px 10px rgba(0,0,0,0.25)',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(tag);
  }

  // ── 5. INJECT "TRY DEMO" BUTTON INTO LOGIN SCREEN ─────────────────────

  function activateDemo() {
    // Store fake credentials
    localStorage.setItem('userToken',   DEMO_TOKEN);
    localStorage.setItem('userEmail',   DEMO_EMAIL);
    localStorage.setItem('userRole',    DEMO_ROLE);
    localStorage.setItem('tokenExpiry', String(DEMO_EXPIRY));

    // Trigger the app's own post-login flow
    if (typeof displayUserInfo  === 'function') displayUserInfo(DEMO_NAME, DEMO_ROLE);
    if (typeof enableAdminUI    === 'function') enableAdminUI();
    if (typeof showSection      === 'function') showSection('package-section');
    if (typeof startSessionMonitoring === 'function') startSessionMonitoring();
    if (typeof showSidebarForLoggedInUser === 'function') showSidebarForLoggedInUser();

    injectPersistentDemoTag();

    // Show a welcome toast via the app's own toast system
    if (typeof showToast === 'function') {
      showToast('👋 Welcome to the Demo! Explore freely — nothing is saved.', 'info', { duration: 5000 });
    }
  }

  function injectDemoButton() {
    const wrapper = document.getElementById('loginWrapper');
    if (!wrapper || document.getElementById('demo-login-btn')) return;

    const divider = document.createElement('div');
    divider.style.cssText = 'display:flex;align-items:center;gap:10px;margin:18px 0 14px;';
    divider.innerHTML = `
      <div style="flex:1;height:1px;background:#e0e0e0;"></div>
      <span style="color:#aaa;font-size:0.78rem;font-weight:500;white-space:nowrap;">or</span>
      <div style="flex:1;height:1px;background:#e0e0e0;"></div>`;

    const btn = document.createElement('button');
    btn.id = 'demo-login-btn';
    btn.textContent = '🧪 Try Demo (No login required)';
    btn.style.cssText = [
      'width:100%','padding:11px 16px','border-radius:10px',
      'border:2px dashed #e65100','background:transparent',
      'color:#e65100','font-size:0.9rem','font-weight:700',
      'cursor:pointer','transition:background 0.2s,color 0.2s',
      'letter-spacing:0.02em'
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#e65100';
      btn.style.color      = '#fff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color      = '#e65100';
    });
    btn.addEventListener('click', activateDemo);

    const note = document.createElement('p');
    note.style.cssText = 'text-align:center;font-size:0.73rem;color:#aaa;margin:8px 0 0;';
    note.textContent   = 'Pre-loaded with sample data. Changes are not saved.';

    wrapper.appendChild(divider);
    wrapper.appendChild(btn);
    wrapper.appendChild(note);
  }

  // ── 6. RESTORE DEMO SESSION ON PAGE RELOAD ─────────────────────────────
  // If the user already has the demo token stored, re-activate silently
  // so a page refresh doesn't kick them back to the login screen.

  function restoreDemoSession() {
    if (localStorage.getItem('userToken') === DEMO_TOKEN) {
      // Wait for script.js to finish its own window.onload before we patch
      // the session (script.js window.onload runs first; this is a separate listener)
      injectPersistentDemoTag();
    }
  }

  // ── 7. INITIALISE ──────────────────────────────────────────────────────

  // Inject the button as soon as the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    injectDemoButton();
    restoreDemoSession();
  });

  // Also try after a short delay in case Google Sign-In script delays rendering
  window.addEventListener('load', () => {
    injectDemoButton();   // safe — checks for existing button ID
    restoreDemoSession();
  });

})();
