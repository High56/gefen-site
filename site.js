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

  /* 4. Opening: a short film of the room tidying itself, tied to the page scroll.
        The page scrolls normally; the film plays over the first part of that scroll and is
        fully tidy before the room has left the screen. Frames are img/tidy/f000.webp ...
        To replace the film: export new frames into img/tidy/ and set FRAMES to how many there are. */
  var story = document.querySelector('.tidy-story');
  if (story) {
    var FRAMES = 97;          /* how many frame files there are */
    var RUN = 0.45;           /* the film finishes after scrolling this share of the room's height */
    var CATCH_UP = 110;       /* milliseconds the picture takes to catch up with the scroll; smaller = snappier */
    var FOCUS_X = 0.5, FOCUS_Y = 0.4;
    var canvas = story.querySelector('.tidy-canvas');
    var ctx = canvas.getContext('2d');
    var frames = new Array(FRAMES), cur = 0, drawn = -1, ticking = false, last = 0;
    var ready = function (im) { return im && im.complete && im.naturalWidth > 0; };
    var name = function (i) { return 'img/tidy/f' + ('00' + i).slice(-3) + '.webp'; };
    /* load a rough pass first (every 8th frame), then fill the gaps, so early scrolling always has a picture */
    var order = [];
    [8, 4, 2, 1].forEach(function (step) {
      for (var i = 0; i < FRAMES; i += step) if (order.indexOf(i) < 0) order.push(i);
    });
    order.forEach(function (i) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { drawn = -1; kick(); };
      im.src = name(i);
      frames[i] = im;
    });
    var nearest = function (want) {
      for (var d = 0; d < FRAMES; d++) {
        if (ready(frames[want - d])) return want - d;
        if (ready(frames[want + d])) return want + d;
      }
      return -1;
    };
    var fit = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(story.clientWidth * dpr), h = Math.round(story.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = -1; }
    };
    var paint = function (im, alpha) {
      var cw = canvas.width, ch = canvas.height;
      var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, (cw - dw) * FOCUS_X, (ch - dh) * FOCUS_Y, dw, dh);
    };
    var target = function () {
      var h = story.offsetHeight || 1;
      var p = -story.getBoundingClientRect().top / (h * RUN);
      return p < 0 ? 0 : p > 1 ? 1 : p;
    };
    function step(now) {
      ticking = false;
      fit();
      var want = target();
      var dt = last ? Math.min(100, now - last) : 16;
      last = now;
      cur += (want - cur) * (1 - Math.exp(-dt / CATCH_UP));
      if (Math.abs(want - cur) < 0.0008) cur = want;
      var pos = cur * (FRAMES - 1);
      if (Math.abs(pos - drawn) > 0.01) {
        var a = Math.floor(pos), mix = pos - a;
        var ia = nearest(a);
        if (ia >= 0) {
          paint(frames[ia], 1);
          /* blend a little of the next frame in, so the motion glides instead of stepping */
          if (mix > 0.02 && ia === a && ready(frames[a + 1])) paint(frames[a + 1], mix);
          ctx.globalAlpha = 1;
          drawn = pos;
        }
      }
      if (cur !== want) kick(); else last = 0;
    }
    function kick() { if (!ticking) { ticking = true; requestAnimationFrame(step); } }
    cur = target();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    kick();
  }
})();
