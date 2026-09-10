// One counted load, then small, noncounting foreground-duration updates.
// No libraries, storage, map-loop work, or timers while the page is hidden.
(() => {
  if (!['jmoul.io', 'www.jmoul.io'].includes(location.hostname) || !/^\/lighthouse-map(?:\/index\.html|\/)?$/.test(location.pathname)) return;
  if (window.__jmoulMapVisitScheduled) return;
  window.__jmoulMapVisitScheduled = true;

  const endpoint = '/wp-admin/admin-ajax.php';
  const intervalMs = 30000, maxSampleMs = 45000, lifetimeMs = 86400000;
  const options = {
    method: 'POST', credentials: 'same-origin', keepalive: true,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Jmoul-Map-Visit': '1' },
  };
  let loaded = document.readyState === 'complete', pageActive = true, loadSent = false;
  let loadTask = null, loadUsesIdle = false, timer = null;
  let token = '', disabled = false, expiresAt = 0, expiresAtWall = 0;
  let activeSince = null, visibleMs = 0, sentMs = 0, pending = 0;
  let hostFrame = null, hostDocument = null, hostWindow = null, frameObserver = null;
  let frameVisible = true, hostListeners = false, moved = null;

  const frameInViewport = () => {
    if (!hostFrame) return true;
    if (!hostFrame.isConnected) return false;
    const rect = hostFrame.getBoundingClientRect();
    const style = hostWindow.getComputedStyle(hostFrame);
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
      && rect.top < hostWindow.innerHeight && rect.left < hostWindow.innerWidth
      && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const visible = () => pageActive && document.visibilityState === 'visible'
    && !document.prerendering && frameVisible
    && (!hostDocument || hostDocument.visibilityState === 'visible')
    && frameInViewport();
  const cancelTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const cancelLoad = () => {
    if (loadTask !== null) {
      if (loadUsesIdle) cancelIdleCallback(loadTask); else clearTimeout(loadTask);
    }
    loadTask = null;
  };
  const stopPresence = () => {
    disabled = true; token = ''; activeSince = null; cancelTimer();
  };
  const usable = () => {
    if (!token || disabled) return false;
    if (performance.now() >= expiresAt || Date.now() >= expiresAtWall) {
      stopPresence(); return false;
    }
    return true;
  };
  const account = () => {
    if (activeSince === null) return;
    const now = performance.now();
    // A delayed browser/OS wake must not turn hours asleep into viewing time.
    visibleMs = Math.min(lifetimeMs, visibleMs + Math.max(0, Math.min(maxSampleMs, now - activeSince)));
    activeSince = now;
  };
  const sendPresence = final => {
    if (!usable()) return;
    const total = Math.floor(visibleMs);
    if (total <= sentMs || total === 0 || pending >= 2 || (!final && pending > 0)) return;
    sentMs = total; pending++;
    // Cumulative values make duplicate or reordered final requests idempotent.
    fetch(endpoint, {
      ...options,
      body: new URLSearchParams({ action: 'jmoul_map_presence', token, visible_ms: String(total) }),
    }).then(async response => {
      if (response.status >= 400 && response.status < 500) { stopPresence(); return; }
      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result && result.success === true && ['administrator_excluded', 'role_excluded', 'ip_excluded', 'bot_excluded'].includes(result.data?.status)) stopPresence();
      }
    }).catch(() => {}).finally(() => { pending--; });
  };
  const schedulePresence = () => {
    if (timer !== null || !usable() || !visible()) return;
    timer = setTimeout(() => {
      timer = null;
      if (!visible()) { reconcile(); return; }
      account(); sendPresence(false); schedulePresence();
    }, intervalMs);
  };
  const sendLoad = () => {
    loadTask = null;
    if (loadSent || !loaded || !visible()) return;
    loadSent = true;
    let referrer = '';
    try {
      const source = new URL(document.referrer);
      if (/^https?:$/.test(source.protocol)) referrer = source.origin;
    } catch (_) { /* Direct visits have no referrer. */ }
    fetch(endpoint, {
      ...options, body: new URLSearchParams({ action: 'jmoul_map_visit', referrer }),
    }).then(response => response.ok ? response.json() : null).then(result => {
      const data = result && result.success === true && result.data;
      if (!data || data.status !== 'accepted' || typeof data.presence_token !== 'string'
        || !data.presence_token.length || data.presence_token.length > 200) return;
      token = data.presence_token;
      expiresAt = performance.now() + lifetimeMs;
      expiresAtWall = Date.now() + lifetimeMs;
      // Server and browser start approximately together, after token issuance.
      reconcile();
    }).catch(() => {}); // Analytics must never interrupt the map.
  };
  const scheduleLoad = () => {
    if (loadSent || loadTask !== null || !loaded || !visible()) return;
    loadUsesIdle = typeof requestIdleCallback === 'function';
    loadTask = loadUsesIdle ? requestIdleCallback(sendLoad, { timeout: 2000 }) : setTimeout(sendLoad, 500);
  };
  function reconcile() {
    if (!visible()) {
      cancelLoad(); cancelTimer();
      if (activeSince !== null) {
        account(); activeSince = null; sendPresence(true);
      }
      return;
    }
    scheduleLoad();
    if (usable()) {
      if (activeSince === null) activeSince = performance.now();
      schedulePresence();
    }
  }
  const attachHostListeners = () => {
    if (!hostDocument || hostListeners) return;
    hostDocument.addEventListener('visibilitychange', reconcile);
    if (moved) {
      hostWindow.addEventListener('scroll', moved, { passive: true });
      hostWindow.addEventListener('resize', moved, { passive: true });
    }
    hostListeners = true;
  };
  const detachHostListeners = () => {
    if (!hostDocument || !hostListeners) return;
    hostDocument.removeEventListener('visibilitychange', reconcile);
    if (moved) {
      hostWindow.removeEventListener('scroll', moved);
      hostWindow.removeEventListener('resize', moved);
    }
    hostListeners = false;
  };

  try {
    if (window.parent !== window && window.frameElement) {
      hostFrame = window.frameElement;
      hostDocument = hostFrame.ownerDocument;
      hostWindow = hostDocument.defaultView;
      frameVisible = frameInViewport();
      if (typeof hostWindow.IntersectionObserver === 'function') {
        frameObserver = new hostWindow.IntersectionObserver(entries => {
          frameVisible = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
          reconcile();
        });
        frameObserver.observe(hostFrame);
      } else {
        moved = () => { frameVisible = frameInViewport(); reconcile(); };
      }
      attachHostListeners();
    }
  } catch (_) { /* Cross-origin framing cannot expose its parent document. */ }

  document.addEventListener('visibilitychange', reconcile);
  document.addEventListener('prerenderingchange', reconcile);
  window.addEventListener('pagehide', () => {
    pageActive = false; reconcile();
    if (frameObserver) frameObserver.disconnect();
    detachHostListeners();
  });
  window.addEventListener('pageshow', () => {
    pageActive = true;
    if (hostFrame) frameVisible = frameInViewport();
    if (frameObserver) frameObserver.observe(hostFrame);
    attachHostListeners();
    reconcile(); // BFCache restores this same state; never recount the load.
  });
  if (loaded) reconcile();
  else window.addEventListener('load', () => { loaded = true; reconcile(); }, { once: true });
})();
