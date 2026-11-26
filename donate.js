import { api } from "./api.js";
import { CATEGORIES, SIZES, CONDITIONS, HUBS, NOTIFY_FORMSPREE_ID } from "./config.js";
import { initLayout, esc, qs, qsa, swingTag, toast } from "./ui.js";

initLayout();

const MIN = 2, MAX = 6, MAX_MB = 15;
const files = [];
let step = 0;

const opt = (arr, ph) => (ph ? `<option value="">${ph}</option>` : "") + arr.map(a => typeof a === "string" ? `<option>${a}</option>` : `<option value="${a.id}">${esc(a.label)}</option>`).join("");
qs("#category").innerHTML = opt(CATEGORIES, "Choose…");
qs("#size").innerHTML = opt(SIZES, "Choose…");
qs("#condition").innerHTML = opt(CONDITIONS, "Choose…");
qs("#hub").innerHTML = opt(HUBS);

// ── photos ──
const drop = qs("#drop"), input = qs("#photos"), thumbs = qs("#thumbs");
drop.addEventListener("click", () => input.click());
drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });

function addFiles(list) {
  for (const f of list) {
    if (!f.type.startsWith("image/")) { toast(`${f.name} isn't an image.`, true); continue; }
    if (f.size > MAX_MB * 1024 * 1024) { toast(`${f.name} is over ${MAX_MB} MB.`, true); continue; }
    if (files.length >= MAX) { toast(`Up to ${MAX} photos.`, true); break; }
    files.push(f);
  }
  drawThumbs();
}
function drawThumbs() {
  thumbs.innerHTML = files.map((f, i) => `<div class="thumb"><img src="${URL.createObjectURL(f)}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">✕</button></div>`).join("");
  qsa("[data-rm]", thumbs).forEach(b => b.addEventListener("click", () => { files.splice(+b.dataset.rm, 1); drawThumbs(); }));
}

// ── stepper ──
const form = qs("#donateForm"), err = qs("#formErr");
function show(n) {
  step = n;
  qsa(".form-step").forEach(s => s.classList.toggle("on", +s.dataset.step === n));
  qsa(".stepper span").forEach(s => { const i = +s.dataset.s; s.className = i === n ? "on" : i < n ? "done" : ""; });
  qs("#backBtn").hidden = n === 0;
  qs("#nextBtn").hidden = n === 2;
  qs("#submitBtn").hidden = n !== 2;
  err.textContent = "";
  qs("#donatePanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
function validStep(n) {
  if (n === 0) {
    if (files.length < MIN) { err.textContent = `Add at least ${MIN} photos — front and back.`; return false; }
    return true;
  }
  const bad = qsa(`.form-step[data-step="${n}"] :invalid`)[0];
  if (bad) {
    err.textContent = bad.type === "checkbox" ? "Please confirm each hygiene point." : bad.type === "email" ? "Enter a valid email address." : `Fill in “${bad.labels?.[0]?.textContent.split(/[—(]/)[0].trim() || bad.name}”.`;
    bad.focus();
    return false;
  }
  return true;
}
qs("#nextBtn").addEventListener("click", () => { if (validStep(step)) show(step + 1); });
qs("#backBtn").addEventListener("click", () => show(step - 1));

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!validStep(2)) return;
  const d = Object.fromEntries(new FormData(form));
  const data = {
    title: d.title.trim(), category: d.category, size: d.size, condition: d.condition,
    material: d.material.trim(), brand: d.brand.trim(), defects: d.defects.trim(),
    description: d.description.trim(), story: d.story.trim(),
    donorName: d.donorName.trim(), donorEmail: d.donorEmail.trim().toLowerCase(),
    hub: d.hub, dropoff: d.dropoff, showDonorName: !!d.showDonorName,
    selfDeclared: { washed: true, clean: true, allowedType: true }
  };
  const btn = qs("#submitBtn"), bar = qs("#progress");
  btn.disabled = true; btn.textContent = "Uploading photos…"; bar.hidden = false;
  try {
    const res = await api.submitDonation(data, files, p => { qs("div", bar).style.width = `${Math.round(p * 100)}%`; });
    notifyTeam(data, res);
    qs("#donatePanel").innerHTML = `
      <div class="success">
        <p class="kicker">Submitted for review</p>
        <h2 class="display display--m" style="font-size:2.2rem">Thank you. It's in the queue.</h2>
        ${swingTag({ passportId: res.passportId, title: data.title, size: data.size })}
        <p>This is your piece's passport ID. We'll email <strong>${esc(data.donorEmail)}</strong> once it's been reviewed — usually within 3 days. ${data.dropoff.startsWith("I'll") ? `Drop it off at ${esc(data.hub)} with this ID on a slip, and we'll attach its ThreadForward tag.` : "We'll arrange collection by email."}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px">
          <a class="btn btn--ink" href="donate.html">Give another piece</a>
          <a class="btn" href="wardrobe.html">Browse the rack</a>
        </div>
      </div>`;
  } catch (ex) {
    err.textContent = ex.message || "Upload failed. Check your connection and try again.";
    btn.disabled = false; btn.textContent = "Submit for review"; bar.hidden = true;
  }
});

// Emails the team a short notice about a new submission (see NOTIFY_FORMSPREE_ID
// in config.js). Runs in the background; any failure is ignored so the donor's
// submission is never affected.
function notifyTeam(data, res) {
  if (!NOTIFY_FORMSPREE_ID) return;
  const label = (arr, id) => arr.find(a => a.id === id)?.label || id;
  try {
    fetch(`https://formspree.io/f/${encodeURIComponent(NOTIFY_FORMSPREE_ID)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `New donation: ${data.title} (${res.passportId})`,
        "Passport ID": res.passportId,
        Item: data.title,
        Category: label(CATEGORIES, data.category),
        Size: data.size,
        Condition: label(CONDITIONS, data.condition),
        Brand: data.brand || "—",
        Defects: data.defects || "—",
        Donor: data.donorName,
        email: data.donorEmail,
        Hub: data.hub,
        "Drop-off": data.dropoff,
        "Review it": new URL("admin.html", location.href).href
      })
    }).catch(() => {});
  } catch {}
}
