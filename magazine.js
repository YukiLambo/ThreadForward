// ThreadForward — hero: original magazine covers drifting and tumbling through the air.
// Each cover floats upward on its own path, turning slowly in 3D. Covers blur as they
// move fast or fall out of the focal plane (which slowly sweeps near and far), with a
// faint colour fringe on the blur, like a lens. The loop never ends: covers that leave
// the top come back in at the bottom.
// Pauses when the hero is off screen or the tab is hidden. With reduced motion the covers
// are laid out still and sharp.
const field = document.querySelector("[data-fly]");

// Covers: the site's own photos with ThreadForward mastheads, plus type-only issues.
const PHOTO = [
  { img: "look-01.jpg", pos: "50% 30%", mast: "ThreadForward", line: "The Re-Wear Issue", tone: "cream" },
  { img: "look-02.jpg", pos: "50% 20%", mast: "TF", line: "Bring a piece", tone: "ink" },
  { img: "hero.jpg", pos: "60% 50%", mast: "The Dig", line: "Inside the rail", tone: "red" },
  { img: "look-03.jpg", pos: "40% 50%", mast: "Loop", line: "Every piece has a past", tone: "white" },
  { img: "look-01.jpg", pos: "30% 75%", mast: "Second", line: "Corduroy, twice loved", tone: "white" },
  { img: "look-02.jpg", pos: "60% 80%", mast: "Mend", line: "The organza fix", tone: "ink" },
  { img: "hero.jpg", pos: "20% 20%", mast: "No. 11", line: "Denim, second time round", tone: "cream" },
  { img: "look-03.jpg", pos: "80% 30%", mast: "Rail", line: "Ten shirts, one story", tone: "ink" }
];
const TYPE = [
  { bg: "#7A1E16", fg: "#F3E6CF", mast: "Re:Wear", line: "Less new. More you." },
  { bg: "#EFE6D2", fg: "#B23A22", mast: "Pass it on", line: "No. 12 · Hong Kong" },
  { bg: "#2346A0", fg: "#F6F1E6", mast: "Mend & Make", line: "Workshop special" },
  { bg: "#161512", fg: "#DFF75B", mast: "Thrift", line: "400 tonnes a day" },
  { bg: "#D9A441", fg: "#161512", mast: "Again", line: "The good stuff" },
  { bg: "#E9E4DA", fg: "#161512", mast: "Circular", line: "By design" }
];

if (field) {
  const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const covers = [];
  // interleave photo and type covers
  for (let i = 0; i < 18; i++) covers.push(i % 7 === 2 || i % 7 === 5 ? { type: TYPE[(i * 3) % TYPE.length] } : { photo: PHOTO[i % PHOTO.length] });
  field.innerHTML = covers.map(c => c.photo
    ? `<div class="fc fc--${c.photo.tone}" style="--img:url('${c.photo.img}');--pos:${c.photo.pos}"><b>${c.photo.mast}</b><i>${c.photo.line}</i><u></u></div>`
    : `<div class="fc fc--type" style="--bg:${c.type.bg};--fg:${c.type.fg}"><b>${c.type.mast}</b><i>${c.type.line}</i><u></u></div>`
  ).join("");
  const els = [...field.children];

  // Each cover's path: a column across the width, a depth, a rise speed and a tumble.
  const N = els.length;
  const cards = els.map((el, i) => ({
    el,
    col: (i + 0.5) / N + (rnd(i + 1) - 0.5) * 0.06,
    y0: rnd(i + 2),
    z: lerp(-750, 170, rnd(i + 3)),
    rise: lerp(0.018, 0.05, rnd(i + 4)),          // screen heights per second
    sway: lerp(30, 90, rnd(i + 5)), swayF: lerp(0.25, 0.6, rnd(i + 6)),
    // mostly facing the viewer: tilt rocks back and forth, the spin round the middle keeps going
    rx: (rnd(i + 7) - 0.5) * 60, ry: (rnd(i + 8) - 0.5) * 70, rz: rnd(i + 9) * 360,
    ax: lerp(12, 28, rnd(i + 10)), ay: lerp(14, 32, rnd(i + 11)), fx: lerp(0.3, 0.7, rnd(i + 16)), fy: lerp(0.25, 0.6, rnd(i + 17)),
    vz: (rnd(i + 12) - 0.5) * 36, // deg/s
    // now and then a cover catches a gust and spins fast
    gust: lerp(5, 11, rnd(i + 13)), gustAt: rnd(i + 14) * 10,
    s: lerp(0.8, 1.25, rnd(i + 15)),
    lastX: null, lastY: null, f: ""
  }));
  // shuffle the order so neighbours across the screen are at different heights
  cards.sort((a, b) => rnd(a.col * 99) - rnd(b.col * 99)).forEach((c, k) => { c.col = (k + 0.5) / N + (rnd(k + 40) - 0.5) * 0.05; });

  let W = 1, H = 1;
  const measure = () => { W = field.clientWidth || innerWidth; H = field.clientHeight || innerHeight; };
  measure(); addEventListener("resize", measure);

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let running = false, visible = true, t0 = performance.now(), tPaused = 0, pausedAt = 0, last = 0;

  const draw = (t, dt) => {
    const focus = Math.sin(t * 0.33) * 380 - 120;           // focal plane sweeps near and far
    for (const c of cards) {
      const yy = ((c.y0 - t * c.rise) % 1 + 1) % 1;            // 0..1, rising and wrapping
      const g = ((t + c.gustAt) % c.gust) / c.gust;             // 0..1 within this cover's gust cycle
      const gustP = g > 0.86 ? Math.sin(((g - 0.86) / 0.14) * Math.PI) : 0;
      const spin = (g > 0.86 ? (1 - Math.cos(((g - 0.86) / 0.14) * Math.PI)) / 2 : 0) * 220; // a full flip during a gust                                  // extra degrees during a gust
      const x = c.col * W + Math.sin(t * c.swayF + c.y0 * 9) * c.sway - W / 2;
      const y = lerp(1.25, -0.25, yy) * H - H / 2;
      const rx = c.rx + Math.sin(t * c.fx + c.y0 * 7) * c.ax, ry = c.ry + Math.sin(t * c.fy + c.col * 11) * c.ay + spin * (360 / 220), rz = c.rz + c.vz * t;
      c.el.style.transform = `perspective(1300px) translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${c.z.toFixed(0)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) scale(${c.s})`;
      // blur: out of focus + moving fast (screen speed or a gust spin)
      const sp = c.lastX === null || !dt ? 0 : Math.hypot(x - c.lastX, y - c.lastY) / dt;
      c.lastX = x; c.lastY = y;
      const defocus = Math.max(0, Math.abs(c.z - focus) - 120) / 110;
      const b = Math.min(9, defocus + sp / 160 + gustP * 5);
      const q = Math.round(b * 2) / 2;
      const f = q < 0.75 ? "none"
        : `blur(${q}px) drop-shadow(${-(q * 1.3).toFixed(1)}px 0 0 rgba(0,190,255,.55)) drop-shadow(${(q * 1.3).toFixed(1)}px 0 0 rgba(255,96,40,.55))`;
      if (f !== c.f) { c.el.style.filter = f; c.f = f; }
      // near covers pass in front of the headline, far ones behind it (never in front of the copy below)
      const front = c.z > 120 && y < H * 0.05 ? "3" : "1";
      if (c.el.style.zIndex !== front) c.el.style.zIndex = front;
    }
  };

  const frame = now => {
    if (!running) return;
    const t = (now - t0 - tPaused) / 1000;
    draw(t, last ? Math.min(0.1, (now - last) / 1000) : 0);
    last = now;
    requestAnimationFrame(frame);
  };
  const play = () => {
    if (running || !visible || document.hidden || still.matches) return;
    if (pausedAt) { tPaused += performance.now() - pausedAt; pausedAt = 0; }
    running = true; last = 0; requestAnimationFrame(frame);
  };
  const pause = () => { if (running) { running = false; pausedAt = performance.now(); } };

  if (still.matches) { draw(4, 0); cards.forEach(c => { c.el.style.filter = "none"; }); }
  else draw(0, 0);
  field.classList.add("is-ready");

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? play() : pause(); }).observe(field);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  still.addEventListener?.("change", () => (still.matches ? pause() : play()));
  play();
}
