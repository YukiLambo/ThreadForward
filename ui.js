// Shared UI: header, footer, toasts, item cards, newsletter.
import { api, MODE } from "./api.js";
import { CATEGORIES, CONDITIONS, CURRENCY } from "./config.js";

export const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const catLabel = id => CATEGORIES.find(c => c.id === id)?.label || id;
export const condLabel = id => CONDITIONS.find(c => c.id === id)?.label || id;
export const fmt = n => Math.round(n).toLocaleString("en-HK");
export const qs = (s, el = document) => el.querySelector(s);
export const qsa = (s, el = document) => [...el.querySelectorAll(s)];
export const param = k => new URLSearchParams(location.search).get(k);
export const priceLabel = l => (Number(l?.price) > 0 ? `${CURRENCY}${fmt(l.price)}` : "Price on request");

// QR glyph used by the scan buttons (from the original ThreadForward design)
export const QR_ICON = `<svg class="qr-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-3 0h2v3h-2v-3zm5 3h3v2h-3v-2zm-5 2h2v3h-2v-3zm3 1h2v2h-2v-2zm3 0h2v2h-2v-2zm-1-6h3v2h-3v-2z"/></svg>`;

const NAV = [
  ["wardrobe.html", "Shop the drop"],
  ["donate.html", "Give clothes"],
  ["mission.html", "Our mission"],
  ["workshops.html", "Workshops"],
  ["passport.html", "Passport"]
];

function current() {
  const p = location.pathname.split("/").pop() || "index.html";
  return p === "" ? "index.html" : p;
}

const LOGO = `Thread<i>forward</i>`;

function header() {
  const cur = current();
  const link = ([h, l]) => `<a href="${h}" ${cur === h ? 'aria-current="page"' : ""}>${l}</a>`;
  const links = NAV.filter(([h]) => h !== "donate.html").map(link).join("");
  const mob = [["index.html", "Home"], ...NAV].map(link).join("");
  return `
  ${MODE === "demo" ? `<div class="demo-bar">Demo mode — data stays in this browser. Add Firebase keys in config.js to go live.</div>` : ""}
  <header class="site-header">
    <div class="wrap nav">
      <a class="logo" href="index.html" aria-label="ThreadForward home">${LOGO}</a>
      <nav class="nav__links" aria-label="Main">${links}</nav>
      <div class="nav__right">
        <button class="nav__scan" type="button" data-scan>${QR_ICON}<span>Scan passport</span></button>
        <a class="nav__cta" href="donate.html">Give clothes <span aria-hidden="true">→</span></a>
        <button class="menu-btn" aria-label="Open menu" aria-expanded="false">Menu</button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" role="dialog" aria-label="Menu">
    <div class="mobile-menu__top"><a class="logo" href="index.html">${LOGO}</a>
      <button class="menu-btn" style="display:block" aria-label="Close menu">Close</button></div>
    <nav>${mob}</nav>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:28px">
      <a class="nav__cta" href="donate.html" style="margin-top:0">Give clothes <span aria-hidden="true">→</span></a>
      <button class="nav__scan nav__scan--dark" type="button" data-scan>${QR_ICON}<span>Scan passport</span></button>
    </div>
  </div>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer__grid">
        <p class="footer__mark">${LOGO}</p>
        <div><h4>Use it</h4><ul>
          <li><a href="wardrobe.html">Shop the drop</a></li>
          <li><a href="donate.html">Give clothes</a></li>
          <li><a href="passport.html">Check a passport</a></li>
          <li><a href="workshops.html">Workshops</a></li></ul></div>
        <div><h4>About</h4><ul>
          <li><a href="mission.html">Mission &amp; SDGs</a></li>
          <li><a href="mission.html#impact">Impact</a></li>
          <li><a href="https://www.instagram.com/threadfoward/" target="_blank" rel="noopener">Instagram @threadfoward</a></li>
          </ul></div>
      </div>
      <div class="footer__base"><span>© ${new Date().getFullYear()} ThreadForward</span><span>Built for a longer life.</span><span>Impact figures are estimates.</span></div>
    </div>
  </footer>
  <div class="toast" role="status" aria-live="polite"></div>`;
}

let toastTimer;
export function toast(msg, isError = false) {
  const t = qs(".toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
}

export function itemCard(l) {
  const status = l.status === "reserved" ? `<span class="card__status card__status--reserved">Reserved</span>`
    : l.status === "claimed" ? `<span class="card__status card__status--claimed">Rehomed</span>` : "";
  const img = l.photos?.[0] ? `<img src="${esc(l.photos[0])}" alt="${esc(l.title)}" loading="lazy">` : "";
  return `<a class="card" href="item.html?id=${encodeURIComponent(l.id)}">
    <div class="card__img">${img}${status}</div>
    <div class="card__meta"><h3 class="card__title">${esc(l.title)}</h3><span class="card__sub">${esc(priceLabel(l))}</span></div>
    <div class="card__id">Size ${esc(l.size)} · ${esc(l.passportId)}</div>
  </a>`;
}

export function skeletonCards(n = 3) {
  return Array.from({ length: n }, () => `<div class="card"><div class="card__img skeleton"></div><div class="card__meta"><span class="card__title skeleton" style="width:60%;height:1.4em"></span></div></div>`).join("");
}

export function swingTag({ passportId, title, size, price, href, bg }) {
  const tagName = href ? "a" : "div";
  return `<${tagName} class="tag" ${href ? `href="${href}"` : ""} ${bg ? `style="--tag-bg:${bg}"` : ""}>
    <span class="tag__id">${esc(passportId)}</span>
    <span class="tag__name">${esc(title)}</span>
    <span class="tag__row"><span>Size ${esc(size || "")}</span><span>${esc(priceLabel({ price }))}</span></span>
  </${tagName}>`;
}

export function bindNewsletter(root = document) {
  qsa("form[data-newsletter]", root).forEach(f => {
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const input = qs("input[type=email]", f);
      const btn = qs("button", f);
      if (!input.checkValidity()) return toast("Enter a valid email address.", true);
      btn.disabled = true;
      try {
        await api.subscribe(input.value.trim().toLowerCase());
        f.reset();
        toast("You're on the list. First dibs incoming.");
      } catch (err) { toast(err.message || "Couldn't subscribe. Try again.", true); }
      btn.disabled = false;
    });
  });
}

export function initLayout() {
  document.body.insertAdjacentHTML("afterbegin", header());
  document.body.insertAdjacentHTML("beforeend", footer());
  const menu = qs(".mobile-menu");
  const [openBtn, closeBtn] = qsa(".menu-btn");
  openBtn?.addEventListener("click", () => { menu.classList.add("open"); openBtn.setAttribute("aria-expanded", "true"); closeBtn.focus(); });
  closeBtn?.addEventListener("click", () => { menu.classList.remove("open"); openBtn.setAttribute("aria-expanded", "false"); openBtn.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") menu.classList.remove("open"); });
  bindNewsletter();
  document.addEventListener("click", e => { if (e.target.closest("[data-scan]")) { e.preventDefault(); menu.classList.remove("open"); openScanner(); } });
  const onScroll = () => document.body.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const ready = () => requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  (document.fonts?.ready || Promise.resolve()).then(ready);
  setTimeout(ready, 1200); // never hold content hostage to webfonts
}


// ── Passport scanner pop-up ─────────────────────────────────
// Scans the QR on a ThreadForward tag with the camera, or takes a typed ID,
// then opens that piece's digital passport.
let scanStream, scanRaf;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    s.onload = () => res(window.jsQR); s.onerror = () => rej(new Error("Scanner failed to load"));
    document.head.appendChild(s);
  });
}
const goToPassport = raw => {
  let id = (raw || "").trim();
  try { id = new URL(id).searchParams.get("id") || id; } catch { /* plain ID */ }
  if (id) location.href = `passport.html?id=${encodeURIComponent(id.toUpperCase())}`;
};
function stopScan() {
  cancelAnimationFrame(scanRaf);
  scanStream?.getTracks().forEach(t => t.stop());
  scanStream = null;
}
export function openScanner() {
  let m = qs("#scanModal");
  if (!m) {
    document.body.insertAdjacentHTML("beforeend", `
    <div class="modal" id="scanModal" role="dialog" aria-modal="true" aria-labelledby="scanTitle">
      <div class="modal__box scan-box">
        <button class="modal__close" type="button" aria-label="Close">✕</button>
        <p class="kicker">Optical passport reader</p>
        <h2 class="display display--m" id="scanTitle" style="font-size:2.2rem">Scan the tag</h2>
        <p class="muted" style="margin:10px 0 18px">Point your camera at the QR code on the garment's ThreadForward tag.</p>
        <div class="scanner scan-view"><video playsinline muted></video><div class="scanner__line"></div><p class="scan-msg">Starting camera…</p></div>
        <form class="signup scan-form" style="margin-top:22px">
          <label class="sr-only" for="scanId">Passport ID</label>
          <input id="scanId" placeholder="Or type the ID: TF-2026-XXXXXX" autocomplete="off" spellcheck="false">
          <button type="submit" aria-label="Open passport">→</button>
        </form>
      </div>
    </div>`);
    m = qs("#scanModal");
    const close = () => { stopScan(); m.classList.remove("open"); };
    qs(".modal__close", m).addEventListener("click", close);
    m.addEventListener("click", e => { if (e.target === m) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && m.classList.contains("open")) close(); });
    qs(".scan-form", m).addEventListener("submit", e => { e.preventDefault(); goToPassport(qs("#scanId").value); });
  }
  m.classList.add("open");
  startCamera(m);
}
async function startCamera(m) {
  const video = qs("video", m), msg = qs(".scan-msg", m);
  msg.hidden = false; msg.textContent = "Starting camera…";
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = scanStream; await video.play(); msg.hidden = true;
  } catch {
    msg.textContent = "Camera not available here. Type the ID below, or scan the tag with your phone's camera app.";
    return;
  }
  let detect;
  if ("BarcodeDetector" in window) {
    const d = new window.BarcodeDetector({ formats: ["qr_code"] });
    detect = async () => (await d.detect(video))[0]?.rawValue;
  } else {
    try {
      const jsQR = await loadJsQR();
      const c = document.createElement("canvas"), ctx = c.getContext("2d", { willReadFrequently: true });
      detect = async () => {
        if (!video.videoWidth) return null;
        c.width = video.videoWidth; c.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        return jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data;
      };
    } catch { msg.hidden = false; msg.textContent = "Scanner couldn't load. Type the ID below."; return; }
  }
  const tick = async () => {
    if (!scanStream) return;
    try { const v = await detect(); if (v) { stopScan(); return goToPassport(v); } } catch { /* keep trying */ }
    scanRaf = requestAnimationFrame(tick);
  };
  tick();
}
