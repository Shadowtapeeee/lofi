// Выбор темы до первой отрисовки, чтобы не было вспышки светлого или тёмного фона.
(function () {
  var root = document.documentElement;
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('lofi2:prefs:last')) || {}; } catch (e) {}
  var theme = prefs.theme || 'system';
  if (theme === 'system') {
    var tgDark = null;
    try {
      var params = new URLSearchParams(location.hash.slice(1)).get('tgWebAppThemeParams');
      var bg = params && JSON.parse(params).bg_color;
      if (bg && /^#[\da-f]{6}$/i.test(bg)) {
        var n = parseInt(bg.slice(1), 16);
        tgDark = ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 140;
      }
    } catch (e) {}
    theme = tgDark !== null ? (tgDark ? 'dark' : 'light') : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  root.dataset.theme = theme;
  root.dataset.motion = prefs.motion === 'reduced' ? 'reduced' : 'full';
  root.dataset.glass = prefs.glass === false ? 'off' : 'on';
  root.dataset.scale = prefs.textScale || 'm';
  if (/tgWebAppData=/.test(location.hash)) root.dataset.telegram = 'true';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f4f4f2' : '#050506';
})();
