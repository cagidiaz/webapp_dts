/* Start the Office handshake before React and CRM authentication. */
(function () {
  'use strict';
  if (!/^\/outlook-(?:crm|addin)\/?$/.test(window.location.pathname)) return;
  var hosted = window.self !== window.top || /(?:[?&])_host_info=/i.test(window.location.search) || Boolean(window.Office);
  if (!hosted) {
    window.__dtsOfficeReady = Promise.resolve(null);
    return;
  }
  var replaceState = window.history.replaceState;
  var pushState = window.history.pushState;
  function restoreHistory() {
    if (typeof replaceState === 'function') window.history.replaceState = replaceState;
    if (typeof pushState === 'function') window.history.pushState = pushState;
  }
  window.__dtsOfficeReady = new Promise(function (resolve, reject) {
    var finished = false;
    var timer = setTimeout(function () { finish(new Error('OFFICE_READY_TIMEOUT')); }, 15000);
    function finish(error, info) {
      restoreHistory();
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(info);
    }
    function ready() {
      restoreHistory();
      if (!window.Office || typeof window.Office.onReady !== 'function') {
        finish(new Error('OFFICE_RUNTIME_UNAVAILABLE'));
        return;
      }
      try {
        Promise.resolve(window.Office.onReady()).then(function (info) { finish(null, info); }, finish);
      } catch (error) { finish(error); }
    }
    if (window.Office && typeof window.Office.onReady === 'function') { ready(); return; }
    var script = document.createElement('script');
    script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
    script.async = true;
    script.onload = ready;
    script.onerror = function () { finish(new Error('OFFICE_SCRIPT_UNAVAILABLE')); };
    document.head.appendChild(script);
  });
  // The framework attaches its handler later; avoid an unhandled rejection meanwhile.
  window.__dtsOfficeReady.catch(function () {});
}());
