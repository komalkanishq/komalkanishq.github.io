(function () {
  var root = document.documentElement;
  var cfg = {};
  try { cfg = JSON.parse(document.getElementById('wedding-config').textContent); } catch (e) {}
  var filled = function (v) { return typeof v === 'string' && v.indexOf('[') === -1 && v.trim() !== ''; };
  var toDate = function (v) { var d = filled(v) ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
  var start = toDate(cfg.start);
  var end = toDate(cfg.end) || (start && new Date(start.getTime() + 3 * 3600e3));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* 1. Envelope: tap the seal, the flaps part like curtains */
  var envelope = $('envelope');
  function openEnvelope() {
    if (envelope.classList.contains('open')) return;
    envelope.classList.add('open');
    root.classList.remove('locked');
    setTimeout(function () { root.classList.add('opened'); }, reduced ? 0 : 500);
    setTimeout(function () { envelope.remove(); }, reduced ? 0 : 1500);
  }
  $('seal').addEventListener('click', openEnvelope);

  /* Sections fade in as they scroll into view */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* Countdown */
  var cells = {};
  document.querySelectorAll('#countdown b').forEach(function (b) { cells[b.dataset.u] = b; });
  function tick() {
    var s = Math.max(0, Math.floor((start - Date.now()) / 1000));
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    cells.d.textContent = Math.floor(s / 86400);
    cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
    cells.m.textContent = pad(Math.floor(s % 3600 / 60));
    cells.s.textContent = pad(s % 60);
  }
  if (start) { tick(); setInterval(tick, 1000); }

  /* Save the date: Google Calendar link */
  var save = $('save-date');
  if (start) {
    var stamp = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    save.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Komal & Kanishk’s Engagement') +
      '&dates=' + stamp(start) + '/' + stamp(end) +
      (filled(cfg.mapQuery) ? '&location=' + encodeURIComponent(cfg.mapQuery) : '') +
      '&details=' + encodeURIComponent(location.href.split(/[?#]/)[0]);
  } else {
    save.classList.add('is-off');
    save.title = 'The date has not been set yet';
    save.addEventListener('click', function (e) { e.preventDefault(); });
  }

  /* Embedded map (no API key needed) */
  if (filled(cfg.mapQuery)) {
    $('map').src = 'https://www.google.com/maps?q=' + encodeURIComponent(cfg.mapQuery) + '&output=embed';
    $('map-ph').remove();
  }

  /* 4. Scratch to reveal (a glittering sage disc over the date) */
  var canvas = $('scratch');
  var ctx = canvas.getContext('2d');
  var box = $('scratch-box');
  var startAlpha = 0, revealed = false, drawing = false, last = null, moves = 0;

  function paintHeart() {
    var r = box.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var s = canvas.width / 100;
    var path = new Path2D();
    path.arc(50, 50, 48.5, 0, Math.PI * 2);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    var g = ctx.createRadialGradient(38, 32, 4, 50, 50, 52);
    g.addColorStop(0, '#a3ae7a'); g.addColorStop(.6, '#7a8456'); g.addColorStop(1, '#5a653d');
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.strokeStyle = 'rgba(241,220,174,.7)';
    ctx.lineWidth = .5;
    ctx.beginPath(); ctx.arc(50, 50, 44.5, 0, Math.PI * 2); ctx.stroke();
    var colors = ['#f1dcae', '#ffffff', '#c9a66b', '#dfe6c4'];
    for (var i = 0; i < 1600; i++) {
      var x = Math.random() * 100, y = Math.random() * 100;
      if (!ctx.isPointInPath(path, x * s, y * s)) continue;
      ctx.globalAlpha = .25 + Math.random() * .6;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, .18 + Math.random() * .45, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = .9;
    ctx.fillStyle = '#fbf7ee';
    ctx.textAlign = 'center';
    ctx.font = '600 6px "Cormorant SC", serif';
    ctx.fillText('SCRATCH HERE', 50, 52);
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    startAlpha = coverage();
  }
  function coverage() {
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data, n = 0;
    for (var i = 3; i < data.length; i += 32) if (data[i] > 0) n++;
    return n;
  }
  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  }
  function scratchTo(p) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = canvas.width * .13;
    ctx.beginPath();
    ctx.moveTo((last || p).x, (last || p).y);
    ctx.lineTo(p.x + .1, p.y);
    ctx.stroke();
    last = p;
    if (++moves % 12 === 0) check();
  }
  function check() {
    if (!revealed && coverage() < startAlpha * .45) finish();
  }
  function finish() {
    if (revealed) return;
    revealed = true;
    canvas.classList.add('done');
    $('reveal-all').remove();
    $('forever').hidden = false;
    var r = box.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2);
  }
  canvas.addEventListener('pointerdown', function (e) {
    drawing = true; last = null;
    canvas.setPointerCapture(e.pointerId);
    scratchTo(point(e));
  });
  canvas.addEventListener('pointermove', function (e) { if (drawing) scratchTo(point(e)); });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    canvas.addEventListener(t, function () { drawing = false; last = null; check(); });
  });
  $('reveal-all').addEventListener('click', finish);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(paintHeart);

  /* Gold confetti burst */
  function confetti(ox, oy) {
    if (reduced) return;
    var c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    var k = c.getContext('2d');
    k.scale(dpr, dpr);
    var golds = ['#c9a66b', '#e9d3a3', '#b8914f', '#f1d2bc', '#fbf7ee', '#7a8456'];
    var bits = [];
    for (var i = 0; i < 170; i++) {
      var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      bits.push({
        x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: golds[i % golds.length]
      });
    }
    var t0 = performance.now();
    (function frame(t) {
      k.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(function (b) {
        b.vx *= .985; b.vy = b.vy * .985 + .28;
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        k.save(); k.translate(b.x, b.y); k.rotate(b.r);
        k.fillStyle = b.c; k.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
        k.restore();
      });
      if (t - t0 < 3500) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  /* Living hero: water running down the real fountain + rose petals drifting down.
     Coordinates are fractions of assets/garden.jpg (1000 x 825). */
  var hero = $('hero'), water = $('water'), petalsCv = $('petals');
  var STREAMS = [[.29, .385, .29, .57], [.505, .625, .29, .57], [.37, .52, .62, .70]];
  var SPOUTS = [{ x: .555, y: .565, vx: .0021, vy: -.0006 }, { x: .355, y: .565, vx: -.0018, vy: -.0004 }];
  var drops = [], petals = [], heroOn = true;
  function fit(cv, el) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(el.offsetWidth * dpr);
    cv.height = Math.round(el.offsetHeight * dpr);
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function newPetal(top) {
    var w = hero.offsetWidth;
    return {
      x: Math.random() * w, y: top ? -20 - Math.random() * hero.offsetHeight : -20,
      s: 6 + Math.random() * 7, vy: .35 + Math.random() * .55, sway: Math.random() * 6.28,
      rot: Math.random() * 6.28, vr: (Math.random() - .5) * .03, flip: Math.random() * 6.28,
      tint: Math.random() < .55 ? ['#fbe3d6', '#efb9a3', '#d98f78'] : ['#fffaf2', '#f3e6d3', '#d9c6a8']
    };
  }
  function drawPetal(k, p) {
    k.save();
    k.translate(p.x, p.y);
    k.rotate(p.rot);
    k.scale(1, .35 + .65 * Math.abs(Math.cos(p.flip)));
    var g = k.createRadialGradient(-p.s * .2, -p.s * .3, 1, 0, 0, p.s * 1.1);
    g.addColorStop(0, p.tint[0]); g.addColorStop(.6, p.tint[1]); g.addColorStop(1, p.tint[2]);
    k.fillStyle = g;
    k.shadowColor = 'rgba(91,70,54,.18)'; k.shadowBlur = 3; k.shadowOffsetY = 2;
    k.beginPath();
    k.moveTo(0, -p.s);
    k.bezierCurveTo(p.s * .95, -p.s * .9, p.s * .85, p.s * .55, 0, p.s);
    k.bezierCurveTo(-p.s * .85, p.s * .55, -p.s * .95, -p.s * .9, 0, -p.s);
    k.fill();
    k.restore();
  }
  function living() {
    if (reduced || !water) return;
    var scene = water.parentElement;
    function size() { fit(water, scene); fit(petalsCv, hero); }
    size();
    window.addEventListener('resize', size);
    for (var i = 0; i < 16; i++) petals.push(newPetal(true));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { heroOn = e[0].isIntersecting; if (heroOn) requestAnimationFrame(frame); })
        .observe(hero);
    }
    var wk = water.getContext('2d'), pk = petalsCv.getContext('2d');
    function frame() {
      if (!heroOn) return;
      var w = scene.offsetWidth, h = scene.offsetHeight;
      // water: thin bright streaks falling through each stream, arcs from the spouts
      STREAMS.forEach(function (r) {
        for (var n = 0; n < 4; n++) drops.push({ x: (r[0] + Math.random() * (r[1] - r[0])) * w, y: r[2] * h + Math.random() * 6,
          vx: 0, vy: .6 + Math.random() * 1.2, end: r[3] * h, len: 5 + Math.random() * 10, a: .25 + Math.random() * .4 });
      });
      SPOUTS.forEach(function (s) {
        drops.push({ x: s.x * w, y: s.y * h, vx: (s.vx + (Math.random() - .5) * .0005) * w, vy: s.vy * h,
          end: .72 * h, len: 4 + Math.random() * 4, a: .35 + Math.random() * .3 });
      });
      wk.clearRect(0, 0, w, h);
      wk.lineCap = 'round';
      drops = drops.filter(function (d) {
        d.vy += .09; d.x += d.vx; d.y += d.vy;
        var fade = Math.max(0, Math.min(1, (d.end - d.y) / 30));
        wk.strokeStyle = 'rgba(255,255,255,' + (d.a * fade).toFixed(3) + ')';
        wk.lineWidth = 1.1;
        wk.beginPath(); wk.moveTo(d.x, d.y); wk.lineTo(d.x - d.vx * 2, d.y - d.len); wk.stroke();
        return d.y < d.end;
      });
      // petals
      pk.clearRect(0, 0, hero.offsetWidth, hero.offsetHeight);
      petals.forEach(function (p, i) {
        p.sway += .012; p.flip += .03; p.rot += p.vr;
        p.y += p.vy; p.x += Math.sin(p.sway) * .5;
        if (p.y > hero.offsetHeight + 20) petals[i] = newPetal(false);
        drawPetal(pk, p);
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'complete') living(); else window.addEventListener('load', living);

  /* Fountain video plays only while it is on screen (saves data and battery) */
  var vid = document.querySelector('.slide video');
  if (vid && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !reduced) { vid.preload = 'auto'; vid.play().catch(function () {}); } else vid.pause();
    }, { threshold: .4 }).observe(vid);
  }

  /* Photo carousel dots (only when there is more than one photo) */
  var track = $('carousel');
  var slides = track.querySelectorAll('.slide');
  if (slides.length > 1) {
    var dots = $('dots');
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Photo ' + (i + 1));
      b.addEventListener('click', function () { track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); });
      dots.appendChild(b);
    });
    var mark = function () {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      dots.querySelectorAll('button').forEach(function (b, j) { b.setAttribute('aria-current', i === j); });
    };
    track.addEventListener('scroll', mark, { passive: true });
    mark();
    if (!reduced) setInterval(function () {
      var i = (Math.round(track.scrollLeft / track.clientWidth) + 1) % slides.length;
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }, 6000);
  }

  /* RSVP: posts to a Google Form through a hidden iframe */
  var form = $('rsvp-form');
  if (form) {
    var status = $('rsvp-status'), sent = false;
    form.addEventListener('submit', function (e) {
      var ready = filled(form.getAttribute('action')) &&
        Array.prototype.every.call(form.elements, function (el) { return !el.name || filled(el.name); });
      if (!ready) {
        e.preventDefault();
        status.textContent = 'RSVP is not connected yet. Please contact us directly.';
        return;
      }
      sent = true;
      status.textContent = 'Sending…';
    });
    $('rsvp-sink').addEventListener('load', function () {
      if (!sent) return;
      sent = false;
      form.reset();
      status.textContent = 'Thank you! Your RSVP has been received ♥';
    });
  }

  /* Background music: the button only appears if audio/music.mp3 exists. Never autoplays. */
  var music = $('music'), audio = $('bgm');
  if (location.protocol.indexOf('http') === 0 && window.fetch) {
    fetch(audio.getAttribute('src'), { method: 'HEAD' })
      .then(function (r) { if (r.ok) music.hidden = false; })
      .catch(function () {});
  }
  music.addEventListener('click', function () {
    var on = audio.paused;
    if (on) audio.play(); else audio.pause();
    music.setAttribute('aria-pressed', on);
    music.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  });
})();
