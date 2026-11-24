/* Gefen website: quote chat window, click-to-play videos, phone menu. */
(function () {
  'use strict';

  /* 1. "Get a quote" opens Gefen's chat in a window on top of the page.
        Without JavaScript the same link simply opens the chat page. */
  var dialog = null;
  function openQuote(link) {
    if (!window.HTMLDialogElement) return false;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'quote-dialog';
      dialog.setAttribute('aria-label', 'צ\'אט להצעת מחיר');
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '×';
      x.setAttribute('aria-label', 'לסגור');
      x.addEventListener('click', function () { dialog.close(); });
      var frame = document.createElement('iframe');
      frame.title = 'צ\'אט עם גפן';
      var page = document.body.getAttribute('data-page') || 'site';
      frame.src = link.href.split('?')[0] + '?embed=1&src=' + encodeURIComponent('site-' + page);
      dialog.appendChild(x);
      dialog.appendChild(frame);
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      document.body.appendChild(dialog);
    }
    dialog.showModal();
    return true;
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-quote]');
    if (link && openQuote(link)) e.preventDefault();
  });

  /* 2. Videos load from YouTube only when tapped. */
  document.addEventListener('click', function (e) {
    var v = e.target.closest && e.target.closest('button.video');
    if (!v || v.classList.contains('playing')) return;
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + v.getAttribute('data-id') + '?autoplay=1&rel=0&playsinline=1';
    frame.title = v.getAttribute('aria-label') || 'סרטון';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    v.classList.add('playing');
    v.appendChild(frame);
  });

  /* 3. The phone menu closes after a choice, on Escape, and on a tap outside. */
  var menu = document.querySelector('details.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.open = false; });
  }
})();
