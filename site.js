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

  /* 4. Opening: a short film of the room tidying itself, played forward and back by scrolling.
        The film is a row of still frames (img/tidy/f00.jpg ...) drawn on a canvas.
        To replace the film: export new frames into img/tidy/ and set FRAMES to how many there are. */
  var story = document.querySelector('.tidy-story');
  if (story) {
    var FRAMES = 48, FOCUS_X = 0.46, FOCUS_Y = 0.62;
    var stage = story.querySelector('.tidy-stage');
    var canvas = story.querySelector('.tidy-canvas');
    var one = story.querySelector('.tidy-line.one');
    var two = story.querySelector('.tidy-line.two');
    var hint = story.querySelector('.tidy-hint');
    var ctx = canvas.getContext('2d');
    var frames = [], shown = -1, queued = false;
    var smooth = function (a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    for (var i = 0; i < FRAMES; i++) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = queue;
      im.src = 'img/tidy/f' + (i < 10 ? '0' : '') + i + '.jpg';
      frames.push(im);
    }
    var ready = function (im) { return im && im.complete && im.naturalWidth > 0; };
    var nearest = function (want) {
      for (var d = 0; d < FRAMES; d++) {
        if (ready(frames[want - d])) return want - d;
        if (ready(frames[want + d])) return want + d;
      }
      return -1;
    };
    var fit = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(stage.clientWidth * dpr), h = Math.round(stage.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; shown = -1; }
    };
    function draw() {
      queued = false;
      fit();
      var top = parseFloat(getComputedStyle(stage).top) || 0;
      var box = story.getBoundingClientRect();
      var run = box.height - stage.offsetHeight;
      var p = run > 0 ? Math.min(1, Math.max(0, (top - box.top) / run)) : 1;
      /* the film runs over the first 85% of the scroll; the tidy room then rests for a moment */
      var film = Math.min(1, p / 0.85);
      var n = nearest(Math.round(film * (FRAMES - 1)));
      if (n >= 0 && n !== shown) {
        var im = frames[n], cw = canvas.width, ch = canvas.height;
        var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
        var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        ctx.drawImage(im, (cw - dw) * FOCUS_X, (ch - dh) * FOCUS_Y, dw, dh);
        shown = n;
      }
      one.style.opacity = 1 - smooth(0.4, 0.52, p);
      two.style.opacity = smooth(0.5, 0.64, p);
      hint.style.opacity = 1 - smooth(0, 0.1, p);
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    draw();
  }
})();
