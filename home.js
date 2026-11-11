import { api } from "./api.js";
import { initLayout, itemCard, skeletonCards, swingTag, fmt, qs, QR_ICON } from "./ui.js";

initLayout();
qs("[data-qr]").outerHTML = QR_ICON;

// marquee — duplicated once for a seamless loop
const words = ["Curated secondhand", "Less new. More you.", "Digital passports", "No greenwashing", "Circular by design"];
const run = words.map(w => `<span>${w}</span><i>✺</i>`).join("");
qs("#marquee").innerHTML = run + run;

const d = new Date();
qs("#heroEdition").textContent = `Edition ${String(d.getMonth() + 1).padStart(2, "0")} / ${String(d.getFullYear()).slice(2)}`;

const latest = qs("#latest");
latest.innerHTML = skeletonCards(3);

(async () => {
  try {
    const items = await api.listListings({ limit: 6 });
    latest.innerHTML = items.length
      ? items.map(itemCard).join("")
      : `<div class="empty"><h3>The rack is empty.</h3><p>Be the first to add something. <a class="link" href="donate.html">Give clothes</a></p></div>`;
    const feat = items[0];
    const tagData = feat
      ? { ...feat, href: `item.html?id=${encodeURIComponent(feat.id)}` }
      : { passportId: "TF-2026-000001", title: "Your piece, next", size: "Any", href: "donate.html" };
    qs("#passportTag").innerHTML = swingTag(feat ? { ...feat, href: `passport.html?id=${encodeURIComponent(feat.passportId)}` } : tagData);
  } catch (e) {
    latest.innerHTML = `<div class="empty"><h3>Couldn't load the rack.</h3><p>${e.message}</p></div>`;
  }
  try {
    const s = await api.getStats();
    qs("#sListed").textContent = fmt(s.listed);
    qs("#sKg").textContent = s.kg < 10 ? s.kg.toFixed(1) : fmt(s.kg);
    qs("#sWater").textContent = s.waterL >= 10000 ? `${(s.waterL / 1000).toFixed(0)}k` : fmt(s.waterL);
  } catch { /* leave dashes */ }
})();
