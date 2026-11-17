// ThreadForward — entrance: a quick loop through the fashion archive.
// Real vintage covers spin as a 3D ring, then split: half lift into a floating,
// tilted mosaic, half fan out as a standing row, and the whole scene drifts
// away to reveal the homepage. ~2.3 seconds, once per visit, skippable, and it
// never plays for visitors who prefer reduced motion.
//
// Covers: Vogue and Harper's Bazar, 1912–1926. Published before 1929, so they
// are in the public domain in the US. Images served by Wikimedia Commons.
const WM = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";
const COVERS = [
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

const root = document.documentElement;
const finish = () => { root.classList.remove("intro"); try { sessionStorage.setItem("tf_intro_seen", "1"); } catch { /* ignore */ } };

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

async function start() {
  const el = document.createElement("div");
  el.className = "intro-overlay";
  el.setAttribute("role", "presentation");
  el.innerHTML = `
    <div class="intro-scene"><div class="intro-stage">
      ${COVERS.map(src => `<div class="intro-card"><img alt="" src="${src}" decoding="async"></div>`).join("")}
    </div></div>
    <p class="intro-label">From the archive · Vogue &amp; Harper's Bazar, 1912–1926</p>
    <button class="intro-skip" type="button">Skip →</button>`;
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

  // wait briefly for the first covers (never longer than ~0.8s)
  const imgs = [...el.querySelectorAll("img")];
  await Promise.race([
    Promise.all(imgs.slice(0, 8).map(i => i.decode().catch(() => {}))),
    new Promise(r => setTimeout(r, 800))
  ]);
  if (done) return;

  const stage = el.querySelector(".intro-stage");
  const cards = [...el.querySelectorAll(".intro-card")];
  const N = cards.length;
  const cw = cards[0].offsetWidth, ch = cards[0].offsetHeight;
  const R = cw * 3.9; // leaves a little air between covers on the ring
  const narrow = innerWidth < 640;
  // scale the whole scene so the ring, and then the split layout, fit the screen
  const fitRing = Math.min(1, (innerWidth * 0.94) / (2 * R + cw));
  const fitSplit = Math.min(1, (innerWidth * 0.92) / (cw * 5.6));

  // where each cover ends up: even covers → floating mosaic, odd → fanned row
  const targets = cards.map((_, i) => {
    if (i % 2 === 0) {
      const k = i / 2, cols = 5, col = k % cols, row = Math.floor(k / cols);
      return { x: (col - (cols - 1) / 2) * cw * 1.08, y: -ch * (narrow ? 0.9 : 0.75) + row * ch * 0.18, z: -row * ch * 0.95,
        rx: 64, ry: -14 + col * 2, rz: -10 + row * 4 };
    }
    const k = (i - 1) / 2;
    return { x: (k - 4.5) * cw * 0.42, y: ch * (narrow ? 0.42 : 0.38), z: 0, rx: 0, ry: -64, rz: 0 };
  });

  el.classList.add("is-playing");
  const T0 = performance.now();
  const SPIN = 1.05, SPLIT = 0.75, HOLD = 0.25, OUT = 0.35;
  const TOTAL = SPIN + SPLIT + HOLD + OUT;

  const frame = now => {
    if (done) return;
    const t = (now - T0) / 1000;
    const spinP = ease(clamp(t / SPIN));
    const splitP = inOut(clamp((t - SPIN + 0.15) / SPLIT));
    const outP = clamp((t - SPIN - SPLIT - HOLD) / OUT);
    const ringTurn = -320 * spinP - 40 * clamp((t - SPIN) / 1);
    // the camera looks slightly down on the ring, then settles
    stage.style.transform = `translateY(${-outP * 60}px) rotateX(${lerp(-14, -8, splitP)}deg) scale(${lerp(0.82, 1, ease(clamp(t / 0.4))) * lerp(fitRing, fitSplit, splitP) * (1 + outP * 0.12)})`;
    cards.forEach((c, i) => {
      const a = (i / N) * 360 + ringTurn;
      const ar = (a * Math.PI) / 180;
      const ring = { x: Math.sin(ar) * R, y: 0, z: Math.cos(ar) * R, ry: a };
      const tg = targets[i];
      // take the short way round to the target angle (decided once, when the split begins)
      if (c.turn === undefined && splitP > 0) c.turn = 360 * Math.round((a - tg.ry) / 360);
      const ry0 = a - (c.turn || 0);
      const p = clamp(splitP * 1.15 - (i % 2 ? 0.08 : 0) - (i / N) * 0.12);
      const e = inOut(p);
      const x = lerp(ring.x, tg.x, e), y = lerp(ring.y, tg.y, e) - Math.sin(Math.PI * e) * 40 * (i % 2 ? -0.3 : 1);
      const z = lerp(ring.z, tg.z, e), rx = lerp(0, tg.rx, e), ry = lerp(ry0, tg.ry, e), rz = lerp(0, tg.rz, e);
      // a little wave across the floating mosaic, like paper in a breeze
      const wave = i % 2 === 0 ? Math.sin(t * 5 + i) * 4 * e : 0;
      c.style.transform = `translate3d(${x}px, ${y + wave}px, ${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`;
      const speed = (1 - spinP) * 1.2 + Math.sin(Math.PI * e) * 0.9;
      c.style.setProperty("--blur", speed > 0.15 ? `${Math.min(2.4, speed * 1.6).toFixed(2)}px` : "0px");
      c.style.setProperty("--o", String(clamp(t / 0.25) * (1 - outP)));
    });
    if (t >= TOTAL) return end();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if (root.classList.contains("intro")) start().catch(() => finish());
