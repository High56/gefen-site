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

  /* 4. Scroll films: a short film of a room tidying itself, played forward and back by the page scroll.
        Any element with data-film="folder/" and data-frames="N" plays the frames folder/f000.webp ... on
        its <canvas>. The page always scrolls normally; nothing is pinned.
        data-mode="strip": a tall picture; the film runs while the picture travels up through the screen.
        data-mode="cover": a full-screen picture at the top; the film runs over the first part of the scroll. */
  var CATCH_UP = 110;         /* milliseconds the picture takes to catch up with the scroll; smaller = snappier */
  function film(root) {
    var FRAMES = parseInt(root.getAttribute('data-frames'), 10) || 0;
    var dir = root.getAttribute('data-film');
    var strip = root.getAttribute('data-mode') === 'strip';
    var canvas = root.querySelector('canvas');
    if (!FRAMES || !canvas) return;
    var FOCUS_X = 0.5, FOCUS_Y = strip ? 0.5 : 0.4;
    var ctx = canvas.getContext('2d');
    var frames = new Array(FRAMES), cur = 0, drawn = -1, ticking = false, last = 0;
    var ready = function (im) { return im && im.complete && im.naturalWidth > 0; };
    /* load a rough pass first (every 8th frame), then fill the gaps, so early scrolling always has a picture */
    var order = [];
    [8, 4, 2, 1].forEach(function (step) {
      for (var i = 0; i < FRAMES; i += step) if (order.indexOf(i) < 0) order.push(i);
    });
    order.forEach(function (i) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { drawn = -1; kick(); };
      im.src = dir + 'f' + ('00' + i).slice(-3) + '.webp';
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
      var w = Math.round(root.clientWidth * dpr), h = Math.round(root.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; drawn = -1; }
    };
    var paint = function (im, alpha) {
      var cw = canvas.width, ch = canvas.height;
      var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, (cw - dw) * FOCUS_X, (ch - dh) * FOCUS_Y, dw, dh);
    };
    /* how far through the film we should be, 0 to 1, from where the picture is on the screen */
    var target = function () {
      var box = root.getBoundingClientRect(), h = box.height || 1, p;
      if (strip) {
        var vh = window.innerHeight;
        var pageTop = box.top + (window.pageYOffset || 0);
        var from = Math.min(vh * 0.55, pageTop);                  /* messy until the top of the strip is here */
        var to = Math.min(vh * 0.9 - h, from - vh * 0.5);         /* tidy once the strip has travelled to here */
        p = (from - box.top) / (from - to);
      } else {
        p = -box.top / (h * 0.45);
      }
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
  Array.prototype.forEach.call(document.querySelectorAll('[data-film]'), film);
})();
