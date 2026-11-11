import { api } from "./api.js";
import { initLayout, esc, qs } from "./ui.js";

initLayout();

// Edit your upcoming sessions here.
const SESSIONS = [
  "Session A — HKBU, date TBC",
  "Session B — HKBU, date TBC",
  "Notify me when dates are announced"
];
qs("#session").innerHTML = SESSIONS.map(s => `<option>${esc(s)}</option>`).join("");

qs("#wsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, err = qs("#wsErr");
  const bad = f.querySelector(":invalid");
  if (bad) { err.textContent = bad.type === "email" ? "Enter a valid email address." : "Add your name and email."; bad.focus(); return; }
  const btn = qs("button", f);
  btn.disabled = true; btn.textContent = "Saving…";
  const d = Object.fromEntries(new FormData(f));
  try {
    await api.registerWorkshop({ ...d, name: d.name.trim(), email: d.email.trim().toLowerCase() });
    qs("#wsPanel").innerHTML = `<p class="kicker">Seat saved</p><h2 class="display display--m" style="font-size:2rem">See you there, ${esc(d.name.split(" ")[0])}.</h2><p>We'll email the venue and time to <strong>${esc(d.email)}</strong>. Remember to bring one clean garment.</p><a class="btn" href="wardrobe.html">Browse the rack meanwhile</a>`;
  } catch (ex) {
    err.textContent = ex.message || "Couldn't save your seat. Try again.";
    btn.disabled = false; btn.textContent = "Save my seat";
  }
});
