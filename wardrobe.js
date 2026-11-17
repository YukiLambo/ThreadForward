import { api } from "./api.js";
import { CATEGORIES, SIZES, HUBS } from "./config.js";
import { initLayout, itemCard, skeletonCards, esc, qs, qsa, param } from "./ui.js";
import { mountRack } from "./rack.js";

initLayout();

const state = { category: param("category") || "", size: "", hub: "", includeClaimed: false };

qs("#catChips").innerHTML = [{ id: "", label: "All" }, ...CATEGORIES]
  .map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${state.category === c.id}">${esc(c.label)}</button>`).join("");
qs("#fSize").insertAdjacentHTML("beforeend", SIZES.map(s => `<option>${s}</option>`).join(""));
qs("#fHub").insertAdjacentHTML("beforeend", HUBS.map(s => `<option>${s}</option>`).join(""));

qsa("[data-cat]").forEach(b => b.addEventListener("click", () => {
  state.category = b.dataset.cat;
  qsa("[data-cat]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  load();
}));
qs("#fSize").addEventListener("change", e => { state.size = e.target.value; load(); });
qs("#fHub").addEventListener("change", e => { state.hub = e.target.value; load(); });
qs("#fClaimed").addEventListener("change", e => { state.includeClaimed = e.target.checked; load(); });

// Rail or grid, remembered per visitor
let view = "rail", lastItems = [];
try { view = localStorage.getItem("tf_view") === "grid" ? "grid" : "rail"; } catch { /* storage blocked */ }
function setView(v) {
  view = v;
  try { localStorage.setItem("tf_view", v); } catch { /* storage blocked */ }
  qsa("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
  qs("#railView").hidden = v !== "rail";
  qs("#rack").hidden = v !== "grid";
  if (v === "rail") mountRack(qs("#railView"), lastItems);
}
qsa("[data-view]").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));

async function load() {
  const rack = qs("#rack");
  rack.innerHTML = skeletonCards(6);
  try {
    const items = await api.listListings(state);
    qs("#count").textContent = `${items.length} piece${items.length === 1 ? "" : "s"}`;
    lastItems = items;
    rack.innerHTML = items.length ? items.map(itemCard).join("")
      : `<div class="empty"><h3>Nothing matches yet.</h3><p>Try another filter, or <a class="link" href="donate.html">add a piece of your own</a>.</p></div>`;
    setView(view);
  } catch (e) {
    rack.innerHTML = `<div class="empty"><h3>Couldn't load the rack.</h3><p>${esc(e.message)}</p></div>`;
  }
}
load();
