import { api } from "./api.js";
import { initLayout, esc, catLabel, condLabel, fmt, qs, param, toast, priceLabel, openScanner } from "./ui.js";

initLayout();

const result = qs("#result");

function passportUrl(pid) {
  const u = new URL("passport.html", location.href);
  u.search = `?id=${encodeURIComponent(pid)}`;
  return u.toString();
}

function render(l) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&color=D9FF22&bgcolor=141414&data=${encodeURIComponent(passportUrl(l.passportId))}`;
  const status = { available: "On the rack", reserved: "Reserved", claimed: "Rehomed" }[l.status] || l.status;
  result.innerHTML = `
  <article class="passport">
    <div class="passport__qr"><img src="${qr}" alt="QR code for passport ${esc(l.passportId)}"></div>
    <div class="passport__body">
      <span class="badge">Hygiene-checked · Tagged</span>
      <p class="mono" style="margin:14px 0 0">${esc(l.passportId)}</p>
      <h2>${esc(l.title)}</h2>
      <dl class="specs" style="margin:0 0 18px">
        <dt>Type</dt><dd>${esc(catLabel(l.category))}, size ${esc(l.size)}</dd>
        <dt>Condition</dt><dd>${esc(condLabel(l.condition))}</dd>
        <dt>Pick-up</dt><dd>${esc(l.hub)}</dd>
        <dt>Price</dt><dd>${esc(priceLabel(l))}</dd>
        ${l.donorDisplay ? `<dt>Previous owner</dt><dd>${esc(l.donorDisplay)}</dd>` : ""}
        <dt>Status</dt><dd>${esc(status)}</dd>
        <dt>Water saved</dt><dd>~${fmt(l.impact?.waterL || 0)} L (est.)</dd>
        <dt>Landfill avoided</dt><dd>~${(l.impact?.kg || 0).toFixed(2)} kg (est.)</dd>
      </dl>
      ${l.story ? `<p class="serif-i" style="font-size:1.25rem;margin:0 0 18px">“${esc(l.story)}”</p>` : ""}
      <a class="btn btn--ink btn--sm" href="item.html?id=${encodeURIComponent(l.id)}">${l.status === "available" ? "Reserve this piece" : "View piece"}</a>
    </div>
  </article>`;
}

async function lookup(pid) {
  pid = (pid || "").trim().toUpperCase();
  if (!pid) return toast("Enter a passport ID.", true);
  result.innerHTML = `<div class="passport skeleton" style="height:320px"></div>`;
  try {
    const l = await api.findByPassport(pid);
    if (!l) {
      result.innerHTML = `<div class="empty"><h3>No passport found for ${esc(pid)}.</h3><p>Check the ID on the tag. Pieces still under review don't have a public passport yet.</p></div>`;
      return;
    }
    render(l);
    history.replaceState(null, "", `?id=${encodeURIComponent(pid)}`);
  } catch (e) {
    result.innerHTML = `<div class="empty"><h3>Couldn't look that up.</h3><p>${esc(e.message)}</p></div>`;
  }
}

qs("#lookup").addEventListener("submit", e => { e.preventDefault(); lookup(qs("#pid").value); });
qs("#sample")?.addEventListener("click", async () => {
  const items = await api.listListings({ includeClaimed: true, limit: 1 });
  if (items[0]) { qs("#pid").value = items[0].passportId; lookup(items[0].passportId); }
  else toast("No passports exist yet.", true);
});

qs("#scanBtn").addEventListener("click", openScanner);

const initial = param("id");
if (initial) { qs("#pid").value = initial; lookup(initial); }
