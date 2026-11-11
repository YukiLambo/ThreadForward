// Shared UI: header, footer, toasts, item cards, newsletter.
import { api, MODE } from "./api.js";
import { CATEGORIES, CONDITIONS } from "./config.js";

export const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const catLabel = id => CATEGORIES.find(c => c.id === id)?.label || id;
export const condLabel = id => CONDITIONS.find(c => c.id === id)?.label || id;
export const fmt = n => Math.round(n).toLocaleString("en-HK");
export const qs = (s, el = document) => el.querySelector(s);
export const qsa = (s, el = document) => [...el.querySelectorAll(s)];
export const param = k => new URLSearchParams(location.search).get(k);

const NAV = [
  ["wardrobe.html", "Shop the rack"],
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
        <a class="nav__cta" href="donate.html">Give clothes <span aria-hidden="true">→</span></a>
        <button class="menu-btn" aria-label="Open menu" aria-expanded="false">Menu</button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" role="dialog" aria-label="Menu">
    <div class="mobile-menu__top"><a class="logo" href="index.html">${LOGO}</a>
      <button class="menu-btn" style="display:block" aria-label="Close menu">Close</button></div>
    <nav>${mob}</nav>
    <a class="nav__cta" href="donate.html">Give clothes <span aria-hidden="true">→</span></a>
  </div>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer__grid">
        <p class="footer__mark">${LOGO}</p>
        <div><h4>Use it</h4><ul>
          <li><a href="wardrobe.html">Shop the rack</a></li>
          <li><a href="donate.html">Give clothes</a></li>
          <li><a href="passport.html">Check a passport</a></li>
          <li><a href="workshops.html">Workshops</a></li></ul></div>
        <div><h4>About</h4><ul>
          <li><a href="mission.html">Mission &amp; SDGs</a></li>
          <li><a href="mission.html#impact">Impact</a></li>
          <li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="admin.html">Team login</a></li></ul></div>
      </div>
      <div class="footer__base"><span>© ${new Date().getFullYear()} ThreadForward · HKBU</span><span>Built for a longer life.</span><span>Impact figures are estimates.</span></div>
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
    <div class="card__meta"><h3 class="card__title">${esc(l.title)}</h3><span class="card__sub">Size ${esc(l.size)} / ${esc(l.campus)}</span></div>
    <div class="card__id">${esc(l.passportId)}</div>
  </a>`;
}

export function skeletonCards(n = 3) {
  return Array.from({ length: n }, () => `<div class="card"><div class="card__img skeleton"></div><div class="card__meta"><span class="card__title skeleton" style="width:60%;height:1.4em"></span></div></div>`).join("");
}

export function swingTag({ passportId, title, size, campus, href, bg }) {
  const tagName = href ? "a" : "div";
  return `<${tagName} class="tag" ${href ? `href="${href}"` : ""} ${bg ? `style="--tag-bg:${bg}"` : ""}>
    <span class="tag__id">${esc(passportId)}</span>
    <span class="tag__name">${esc(title)}</span>
    <span class="tag__row"><span>${esc(size || "")}</span><span>${esc(campus || "")}</span></span>
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
  const hdr = qs(".site-header");
  const onScroll = () => document.body.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const ready = () => requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  (document.fonts?.ready || Promise.resolve()).then(ready);
  setTimeout(ready, 1200); // never hold content hostage to webfonts
}
