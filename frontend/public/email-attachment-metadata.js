/* Shared by the React and static Outlook task panes. No network or file-content access. */
(function (root) {
  'use strict';
  function snapshot(items) {
    if (!Array.isArray(items)) return state('unavailable');
    var visible = items.filter(function (item) { return !item || item.isInline !== true; });
    var partial = visible.length > 100;
    var files = [];
    visible.slice(0, 100).forEach(function (item) {
      if (!item || typeof item.name !== 'string') { partial = true; return; }
      var name = item.name.replace(/[\x00-\x1f\x7f]/g, '').trim();
      if (!name) { partial = true; return; }
      if (name.length > 512) partial = true;
      var file = { name: name.slice(0, 512) };
      if (Number.isSafeInteger(item.size) && item.size >= 0) file.size = item.size;
      files.push(file);
    });
    return { version: 1, status: partial ? 'partial' : 'complete', source: 'office', capturedAt: new Date().toISOString(), files: files, totalKnown: visible.length };
  }
  function state(status) {
    return { version: 1, status: status, source: 'office', capturedAt: new Date().toISOString(), files: [], totalKnown: null };
  }
  function sameItem(item, current, expectedId) {
    if (!item || !current) return false;
    if (expectedId) return item.itemId === expectedId && current.itemId === expectedId;
    return current === item;
  }
  async function capture(item) {
    try {
      if (Array.isArray(item && item.attachments)) return snapshot(item.attachments);
      if (!item || typeof item.getAttachmentsAsync !== 'function') return state('unavailable');
      return await new Promise(function (resolve) {
        var done = false;
        var timer = setTimeout(function () { finish(state('unavailable')); }, 3000);
        function finish(value) { if (!done) { done = true; clearTimeout(timer); resolve(value); } }
        try {
          item.getAttachmentsAsync(function (result) {
            finish(result && result.status === 'succeeded' ? snapshot(result.value) : state('unavailable'));
          });
        } catch (_) { finish(state('unavailable')); }
      });
    } catch (_) { return state('unavailable'); }
  }
  var api = { capture: capture, sameItem: sameItem, snapshot: snapshot };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DtsEmailAttachments = api;
})(typeof window !== 'undefined' ? window : globalThis);
