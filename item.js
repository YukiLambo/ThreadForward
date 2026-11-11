import { api } from "./api.js";
import { initLayout, esc, catLabel, condLabel, fmt, qs, qsa, param, toast, swingTag } from "./ui.js";

initLayout();

const id = param("id");
const box = qs("#item");
const modal = qs("#reqModal");
let listing;

function render(l) {
  document.title = `${l.title} — ThreadForward`;
  const photos = l.photos?.length ? l.photos : [""];
  const statusLine = l.status === "available"
    ? `<button class="btn btn--ink" id="reserveBtn">Reserve this piece</button>`
    : l.status === "reserved"
      ? `<p class="badge" style="background:var(--flame)">Reserved — waiting for pick-up</p>`
      : `<p class="badge" style="background:var(--ink);color:var(--paper)">Rehomed</p>`;
  box.innerHTML = `
  <div class="item">
    <div class="gallery">
      <div class="gallery__main"><img id="mainImg" src="${esc(photos[0])}" alt="${esc(l.title)}"></div>
      ${photos.length > 1 ? `<div class="gallery__thumbs">${photos.map((p, i) =>
        `<button data-i="${i}" aria-current="${i === 0}" aria-label="Photo ${i + 1}"><img src="${esc(p)}" alt=""></button>`).join("")}</div>` : ""}
    </div>
    <div>
      <p class="kicker">${esc(catLabel(l.category))}</p>
      <h1 class="display display--m">${esc(l.title)}</h1>
      ${l.description ? `<p class="lede" style="margin-top:18px">${esc(l.description)}</p>` : ""}
      <dl class="specs">
        <dt>Size</dt><dd>${esc(l.size)}</dd>
        <dt>Condition</dt><dd>${esc(condLabel(l.condition))}</dd>
        ${l.material ? `<dt>Fabric</dt><dd>${esc(l.material)}</dd>` : ""}
        ${l.brand ? `<dt>Brand</dt><dd>${esc(l.brand)}</dd>` : ""}
        <dt>Collect at</dt><dd>${esc(l.campus)} booth</dd>
        <dt>Price</dt><dd>Free · contributions optional</dd>
      </dl>
      ${statusLine}
      <div style="margin-top:44px">
        <p class="kicker">Its passport</p>
        ${swingTag({ ...l, href: `passport.html?id=${encodeURIComponent(l.passportId)}` })}
        <p class="muted" style="font-size:.9rem;margin-top:12px">Choosing this over new saves an estimated ${fmt(l.impact?.waterL || 0)} L of water${l.donorDisplay ? `. Previously loved by ${esc(l.donorDisplay)}` : ""}.</p>
        ${l.story ? `<p class="serif-i" style="font-size:1.3rem;margin-top:10px">“${esc(l.story)}”</p>` : ""}
      </div>
    </div>
  </div>`;

  qsa(".gallery__thumbs button").forEach(b => b.addEventListener("click", () => {
    qs("#mainImg").src = photos[+b.dataset.i];
    qsa(".gallery__thumbs button").forEach(x => x.setAttribute("aria-current", String(x === b)));
  }));
  qs("#reserveBtn")?.addEventListener("click", openModal);
}

function openModal() { modal.classList.add("open"); qs("#rName").focus(); }
function closeModal() { modal.classList.remove("open"); }
qs(".modal__close", modal).addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

qs("#reqForm form").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const err = qs("#reqErr");
  if (!f.checkValidity()) {
    const bad = f.querySelector(":invalid");
    err.textContent = bad?.name === "agree" ? "Tick the box to confirm you'll collect within 7 days." : "Add your name and a valid email.";
    bad?.focus();
    return;
  }
  err.textContent = "";
  const btn = qs("button[type=submit]", f);
  btn.disabled = true; btn.textContent = "Reserving…";
  const d = Object.fromEntries(new FormData(f));
  try {
    await api.requestItem(listing.id, { name: d.name.trim(), email: d.email.trim().toLowerCase(), role: d.role, pickup: d.pickup, message: d.message || "" });
    qs("#reqForm").hidden = true;
    qs("#reqDone").hidden = false;
    qs("#reqPid").textContent = listing.passportId;
    listing.status = "reserved";
    render(listing);
  } catch (ex) {
    err.textContent = ex.message || "Couldn't reserve. Try again.";
    btn.disabled = false; btn.textContent = "Reserve it";
  }
});

(async () => {
  if (!id) { box.innerHTML = `<div class="empty"><h3>No item selected.</h3><p><a class="link" href="wardrobe.html">Browse the rack</a></p></div>`; return; }
  try {
    listing = await api.getListing(id);
    if (!listing) { box.innerHTML = `<div class="empty"><h3>This piece isn't on the rack.</h3><p>It may have been removed. <a class="link" href="wardrobe.html">Browse the rack</a></p></div>`; return; }
    render(listing);
  } catch (e) { toast(e.message, true); }
})();
