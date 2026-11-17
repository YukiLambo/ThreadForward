// ThreadForward — entrance: a quick loop through the fashion archive.
// Real vintage covers fly in and spin as a tight 3D barrel, then split: most lift
// into a tilted, floating cloud across the top, the rest fan out as a big standing
// row below. Then the scene drifts away and the homepage takes over.
// ~2.9 seconds, once per visit (add ?intro to the address to replay), skippable,
// and never shown to visitors who prefer reduced motion.
//
// Covers: Vogue and Harper's Bazar, 1912–1926. Published before 1929, so they are
// in the public domain in the US. Images are served by Wikimedia Commons.
// index.html starts downloading them in <head> (window.__tfCovers); this list is
// the fallback.
const WM = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";
const FALLBACK = [
  "e/e1/Vogue_cover%2C_November_1st%2C_1912%2C_by_Helen_Dryden.jpg",
  "b/b2/VogueMagazine1Dec1912.jpg",
  "9/9d/Harper%27s_Bazar_June_1913_cover.jpg",
  "f/f6/Harpers_Bazar_cover_December_1915_by_L.bakst.jpg",
  "0/0a/Harper%27s_Bazar_-_cover_-_February_1916_George_Barbier.jpg",
  "2/26/VogueMagazine1Jun1917.jpg",
  "e/ec/VogueMagazine15Mar1919.jpg",
  "6/64/Vogue_cover%2C_July_1st%2C_1919%2C_by_Helen_Dryden.jpg",
  "4/42/Vogue_cover%2C_June_1st%2C_1920%2C_by_Helen_Dryden.jpg",
  "7/7a/VogueMagazine15Jun1920.jpg",
  "0/07/VogueMagazine15Dec1920.jpg",
  "9/99/Harpers_Bazar_-_cover_-_February_1921_-_Ert%C3%A9.jpg",
  "9/9a/Ert%C3%A9_Harpers_Bazar_cover_Feb_1922.jpg",
  "7/73/VogueMagazine1Apr1924.jpg",
  "2/21/VogueMagazine1Jul1924.jpg",
  "0/00/VogueMagazine15Sep1924.jpg",
  "3/33/VogueMagazine1Jan1926.jpg",
  "3/30/VogueMagazine15May1926.jpg",
  "3/32/VogueMagazine15Jul1926.jpg",
  "7/70/VogueMagazine1Oct1926.jpg"
].map(p => `${WM}${p}/330px-${p.split("/").pop()}`);
const COVERS = (Array.isArray(window.__tfCovers) && window.__tfCovers.length) ? window.__tfCovers : FALLBACK;

const root = document.documentElement;
const finish = () => { root.classList.remove("intro"); try { sessionStorage.setItem("tf_intro_seen", "1"); } catch { /* ignore */ } };

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const N = 40; // 20 covers, each used twice, spread around the barrel
const isCloud = i => i % 5 !== 1 && i % 5 !== 3; // 24 go up into the cloud, 16 into the row

async function start() {
  const srcs = Array.from({ length: N }, (_, i) => COVERS[(i * 7) % COVERS.length]);
  const el = document.createElement("div");
  el.className = "intro-overlay";
  el.setAttribute("role", "presentation");
  el.innerHTML = `
    <div class="intro-scene"><div class="intro-stage">
      ${srcs.map((src, i) => `<div class="intro-card"><img alt="" src="${src}" decoding="async"><img class="b" alt="" src="${srcs[(i + 13) % N]}" decoding="async"></div>`).join("")}
    </div></div>
    <p class="intro-label">From the archive · Vogue &amp; Harper's Bazar, 1912–1926</p>
    <button class="intro-skip" type="button">Skip</button>`;
  document.body.appendChild(el);

  let done = false;
  const end = () => {
    if (done) return; done = true;
    el.classList.add("is-out");
    finish();
    setTimeout(() => el.remove(), 450);
  };
  el.querySelector(".intro-skip").addEventListener("click", end);
  addEventListener("keydown", e => { if (e.key === "Escape") end(); }, { once: true });

  // Wait for the covers (they started downloading in <head>), at most ~1.3s.
  const imgs = [...el.querySelectorAll("img")];
  const settle = i => (i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); }));
  await Promise.race([Promise.all(imgs.map(settle)), new Promise(r => setTimeout(r, 1300))]);
  if (done) return;
  // Never show an empty card: reuse covers that did arrive. If almost none did, skip the intro.
  const ready = [...new Set(imgs.filter(i => i.complete && i.naturalWidth > 0).map(i => i.src))];
  if (ready.length < 4) { el.remove(); done = true; finish(); return; }
  imgs.forEach((img, i) => { if (!(img.complete && img.naturalWidth > 0)) img.src = ready[i % ready.length]; });

  const stage = el.querySelector(".intro-stage");
  const cards = [...el.querySelectorAll(".intro-card")];
  // Sizes are re-measured if the window changes (and never trusted when a browser reports 0).
  let vw, vh, cw, ch, narrow, R, fitRing, fitSplit, targets;
  const layout = () => {
    vw = Math.max(innerWidth, root.clientWidth) || 1024;
    vh = Math.max(innerHeight, root.clientHeight) || 768;
    cw = cards[0].offsetWidth || Math.min(200, Math.max(84, vw * 0.125));
    ch = cards[0].offsetHeight || cw * 1.37;
    narrow = vw < 640;
    // the barrel: covers stand edge-out round a central spine, like a book fanned all the way open
    R = cw * 0.62;
    fitRing = Math.min(1.35, (vw * 0.8) / (2 * (R + cw)), (vh * 0.5) / ch);
    fitSplit = Math.min((vw * (narrow ? 1.25 : 1.1)) / (cw * 8), (vh * 0.92) / (ch * 2.45));
    targets = makeTargets();
  };
  // Final layout, after the split
  const makeTargets = () => { let ci = 0, ri = 0; return cards.map((_, i) => {
    if (isCloud(i)) {
      const k = ci++, r = Math.floor(k / 8), c = k % 8;
      return {
        x: (c - 3.5) * cw * 1.02 + (r - 1) * cw * 0.35 + (rnd(i) - 0.5) * cw * 0.3,
        y: -ch * 0.62 - r * ch * 0.2 + (rnd(i + 9) - 0.5) * ch * 0.15,
        z: -r * ch * 0.55 + (rnd(i + 3) - 0.5) * 40,
        rx: 58 + (rnd(i + 5) - 0.5) * 16, ry: -16 + (rnd(i + 7) - 0.5) * 26, rz: (rnd(i + 11) - 0.5) * 28, s: 0.92
      };
    }
    const k = ri++;
    return { x: (k - 7.5) * cw * 0.34 + cw * 0.15, y: ch * 0.38, z: -(15 - k) * cw * 0.05, rx: 0, ry: -66 + k * 1.2, rz: 0, s: 1.22 };
  }); };
  layout();
  addEventListener("resize", layout);

  const T0 = performance.now();
  const ENTER = 0.4, SPIN = 1.25, SPLIT = 0.8, HOLD = 0.45, OUT = 0.4;
  const TOTAL = SPIN + SPLIT + HOLD + OUT;
  const turns = cards.map(() => undefined);

  const frame = now => {
    if (done) return;
    const t = (now - T0) / 1000;
    const enterP = ease(clamp(t / ENTER));
    const spinP = ease(clamp(t / SPIN));
    const splitP = clamp((t - SPIN + 0.1) / SPLIT);
    const outP = ease(clamp((t - SPIN - SPLIT - HOLD) / OUT));
    const spinSpeed = 3 * Math.pow(1 - clamp(t / SPIN), 2); // derivative of the ease
    const ringTurn = -430 * spinP - 30 * clamp((t - SPIN) / 1.2);
    const fit = lerp(fitRing, fitSplit, inOut(splitP));
    const drift = Math.max(0, t - SPIN - SPLIT) * 10;
    stage.style.transform = `translateY(${ch * 0.08 * fit - outP * 70}px) rotateX(${lerp(-7, -4, splitP)}deg) rotateY(${drift * 0.4}deg) scale(${fit * lerp(0.86, 1, enterP) * (1 + outP * 0.15)})`;

    cards.forEach((c, i) => {
      const a = (i / N) * 360 + ringTurn;
      const ar = (a * Math.PI) / 180;
      // fly in from scattered spots across the screen into the barrel
      const spread = 1 - enterP;
      const ring = {
        x: Math.sin(ar) * R + (rnd(i + 17) - 0.5) * (vw / fitRing) * 0.9 * spread,
        y: (rnd(i + 21) - 0.5) * (vh / fitRing) * 0.8 * spread,
        z: Math.cos(ar) * R - rnd(i + 23) * 600 * spread
      };
      const tg = targets[i];
      // each card leaves the barrel at its own moment, cloud cards first
      const p = clamp(splitP * 1.35 - (isCloud(i) ? 0 : 0.12) - rnd(i + 2) * 0.22);
      const e = inOut(p);
      const pageA = a + 90 + rnd(i + 29) * 140 * spread; // each page faces out from the spine
      if (turns[i] === undefined && p > 0) turns[i] = 360 * Math.round((pageA - tg.ry) / 360);
      const ry0 = pageA - (turns[i] || 0);
      const lift = Math.sin(Math.PI * e) * ch * (isCloud(i) ? 0.35 : -0.08);
      const x = lerp(ring.x, tg.x, e), y = lerp(ring.y, tg.y, e) - lift, z = lerp(ring.z, tg.z, e);
      const rx = lerp(0, tg.rx, e), ry = lerp(ry0, tg.ry, e), rz = lerp(0, tg.rz, e), s = lerp(1, tg.s, e);
      const flutter = isCloud(i) ? Math.sin(t * 4 + i) * 3 * e : 0; // paper in a breeze
      c.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + flutter).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${(rx + flutter).toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      const speed = spinSpeed * 0.9 + Math.sin(Math.PI * e) * 0.9;
      const blur = speed > 0.2 ? Math.min(narrow ? 1.6 : 3, speed * 1.3) : 0;
      c.style.setProperty("--blur", `${blur.toFixed(1)}px`);
      c.style.setProperty("--o", String(clamp(t / 0.2) * (1 - outP)));
    });
    if (t >= TOTAL) { removeEventListener("resize", layout); return end(); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if (root.classList.contains("intro")) start().catch(() => finish());
