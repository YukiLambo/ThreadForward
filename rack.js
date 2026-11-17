// ThreadForward — the clothes rail.
// Garments hang from hangers on a chrome rail. Moving the pointer across them
// (or scrolling the rail) sets them swinging; picking one glides it to the
// centre, enlarged, with its name, price and a link to the piece.
import { esc, priceLabel } from "./ui.js";

const HANGER = `<svg class="hang__hanger" viewBox="0 0 120 46" aria-hidden="true">
  <path d="M60 22 C60 16 66 15 66 9 A6 6 0 1 0 54 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M60 22 L6 41 Q2 43 6 44 L114 44 Q118 43 114 41 Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
</svg>`;

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function mountRack(root, items, { itemHref = l => `item.html?id=${encodeURIComponent(l.id)}` } = {}) {
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty"><h3>The rail is empty.</h3><p>New pieces land here as soon as they're checked and tagged.</p></div>`;
    return;
  }
  const hasCut = l => !!l.cutout;
  root.innerHTML = `
  <div class="rail" role="region" aria-roledescription="carousel" aria-label="Pieces on the rail">
    <div class="rail__bar" aria-hidden="true"></div>
    <div class="rail__track">
      ${items.map((l, i) => `
      <button class="hang ${hasCut(l) ? "hang--cut" : "hang--photo"}" type="button" data-i="${i}" aria-label="${esc(l.title)}, ${esc(priceLabel(l))}">
        <span class="hang__swing">
          ${HANGER}
          <span class="hang__body">
            ${hasCut(l)
              ? `<img src="${esc(l.cutout)}" alt="" draggable="false" loading="lazy">`
              : `<span class="hang__card"><img src="${esc(l.photos?.[0] || "")}" alt="" draggable="false" loading="lazy"></span>`}
          </span>
        </span>
      </button>`).join("")}
    </div>
    <div class="rail__floor" aria-hidden="true"></div>
  </div>
  <div class="rail__info" aria-live="polite">
    <button class="rail__arrow" type="button" data-step="-1" aria-label="Previous piece">←</button>
    <div class="rail__meta">
      <p class="rail__count"></p>
      <h3 class="rail__title"></h3>
      <p class="rail__sub"></p>
      <a class="btn btn--ink btn--sm rail__cta" href="#">View piece</a>
    </div>
    <button class="rail__arrow" type="button" data-step="1" aria-label="Next piece">→</button>
  </div>`;

  const track = root.querySelector(".rail__track");
  const hangs = [...root.querySelectorAll(".hang")];
  const swings = hangs.map(h => h.querySelector(".hang__swing"));
  let current = -1;

  // ── selection ──
  function select(i, scroll = true) {
    i = Math.max(0, Math.min(items.length - 1, i));
    if (i === current && !scroll) return;
    current = i;
    hangs.forEach((h, j) => { h.classList.toggle("is-on", j === i); h.setAttribute("aria-current", j === i ? "true" : "false"); });
    const l = items[i];
    root.querySelector(".rail__count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    root.querySelector(".rail__title").textContent = l.title;
    root.querySelector(".rail__sub").textContent = `Size ${l.size} · ${priceLabel(l)}`;
    root.querySelector(".rail__cta").href = itemHref(l);
    if (scroll) {
      const h = hangs[i];
      track.scrollTo({ left: h.offsetLeft + h.offsetWidth / 2 - track.clientWidth / 2, behavior: reduceMotion() ? "auto" : "smooth" });
    }
  }
  hangs.forEach((h, i) => h.addEventListener("click", () => {
    if (i === current) location.href = itemHref(items[i]);
    else { kick(i, (i > current ? 1 : -1) * 0.05); select(i); }
  }));
  root.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => select(current + Number(b.dataset.step))));
  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); select(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); select(current - 1); }
  });
  // keep the piece nearest the centre selected while the rail is scrolled by hand
  let settle;
  track.addEventListener("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, d = Infinity;
      hangs.forEach((h, i) => { const dd = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid); if (dd < d) { d = dd; best = i; } });
      if (best !== current) select(best, false);
    }, 120);
  }, { passive: true });

  // ── swing physics (a damped pendulum per garment) ──
  const theta = items.map(() => 0), omega = items.map(() => 0);
  const K = 0.016, DAMP = 0.045, MAX = 0.42;
  let raf = 0;
  function kick(i, w) { if (reduceMotion()) return; omega[i] += w; run(); }
  function run() { if (!raf) raf = requestAnimationFrame(step); }
  function step() {
    raf = 0;
    let energy = 0;
    for (let i = 0; i < theta.length; i++) {
      omega[i] += -K * theta[i] - DAMP * omega[i];
      theta[i] = Math.max(-MAX, Math.min(MAX, theta[i] + omega[i]));
      energy += Math.abs(theta[i]) + Math.abs(omega[i]);
      swings[i].style.transform = `rotate(${theta[i]}rad)`;
    }
    if (energy > 0.0008) run();
    else swings.forEach(s => (s.style.transform = ""));
  }
  // brush past the clothes: pieces near the pointer swing with its movement
  track.addEventListener("pointermove", e => {
    if (reduceMotion() || e.pointerType === "touch") return;
    const dx = e.movementX || 0;
    if (!dx) return;
    hangs.forEach((h, i) => {
      const r = h.getBoundingClientRect();
      const dist = Math.abs(e.clientX - (r.left + r.width / 2));
      if (dist < r.width * 0.75 && e.clientY > r.top && e.clientY < r.bottom) {
        omega[i] += dx * 0.0011 * (1 - dist / (r.width * 0.75));
      }
    });
    run();
  });
  // the whole rail sways a little when it is pushed along
  let lastX = track.scrollLeft;
  track.addEventListener("scroll", () => {
    const d = track.scrollLeft - lastX; lastX = track.scrollLeft;
    if (reduceMotion()) return;
    for (let i = 0; i < omega.length; i++) omega[i] -= Math.max(-0.02, Math.min(0.02, d * 0.0005));
    run();
  }, { passive: true });

  // ── start on the middle piece, with a small entrance sway ──
  requestAnimationFrame(() => {
    select(Math.min(Math.floor(items.length / 2), items.length - 1));
    items.forEach((_, i) => kick(i, (i % 2 ? 1 : -1) * (0.03 + Math.random() * 0.03)));
  });
}
