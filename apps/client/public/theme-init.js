// Применяем сохранённую тему до первой отрисовки — без вспышки белого.
// Отдельный файл, чтобы не нарушать Content-Security-Policy (script-src 'self').
(function () {
  try {
    var stored = localStorage.getItem('ht-theme') || 'system';
    var dark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (error) {
    /* localStorage может быть недоступен */
  }
})();