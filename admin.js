import { api, MODE } from "./api.js";
import { HYGIENE_CHECKS, CATEGORIES, SIZES, CONDITIONS, HUBS, CURRENCY } from "./config.js";
import { initLayout, esc, catLabel, condLabel, qs, qsa, toast } from "./ui.js";

initLayout();

const panel = qs("#panel");
let tab = "add";
const date = t => (t ? new Date(t).toLocaleString("en-HK", { dateStyle: "medium", timeStyle: "short" }) : "—");

// ── auth ──
api.onAdminChange(user => {
  const signedIn = user && !user.notAdmin;
  qs("#login").hidden = signedIn;
  qs("#desk").hidden = !signedIn;
  qs("#who").innerHTML = signedIn
    ? `<span class="muted" style="margin-right:12px">${esc(user.email || "")}</span><button class="btn btn--sm" id="signOut">Sign out</button>${MODE === "demo" ? ` <button class="btn btn--sm" id="resetDemo">Reset demo data</button>` : ""}`
    : "";
  qs("#signOut")?.addEventListener("click", () => api.adminSignOut());
  qs("#resetDemo")?.addEventListener("click", async e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { await api.resetDemo(); location.reload(); return; }
    b.dataset.armed = "1"; b.textContent = "Click again to reset";
    setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset demo data"; }, 4000);
  });
  if (user?.notAdmin) qs("#loginErr").textContent = "This account isn't on the admin list. Add its UID to the “admins” collection in Firestore.";
  if (signedIn) load();
});

if (MODE === "demo") {
  qs("#loginForm").innerHTML = `<p>Demo mode: no password needed. Once Firebase is connected, team members sign in with email and password.</p><button class="btn btn--ink" type="submit">Enter review desk</button>`;
}
qs("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try { await api.adminSignIn(qs("#aEmail")?.value, qs("#aPw")?.value); }
  catch (ex) { qs("#loginErr").textContent = ex.code === "auth/invalid-credential" ? "Wrong email or password." : ex.message; }
});

qsa("[data-tab]").forEach(b => b.addEventListener("click", () => {
  tab = b.dataset.tab;
  qsa("[data-tab]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  load();
}));

async function load() {
  panel.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    if (tab === "add") return renderAdd();
    if (tab === "rack") return renderRack(await api.listListings({ includeClaimed: true }));
    if (tab === "pending") return renderPending(await api.listSubmissions("pending"));
    if (tab === "history") return renderHistory((await api.listSubmissions()).filter(s => s.status !== "pending"));
    if (tab === "requests") return renderRequests(await api.listRequests());
    if (tab === "workshops") return renderTable(await api.listRegistrations(), ["name", "email", "role", "session", "item", "createdAt"]);
    if (tab === "subscribers") return renderTable(await api.listSubscribers(), ["email", "createdAt"]);
  } catch (e) {
    panel.innerHTML = `<div class="empty"><h3>Couldn't load.</h3><p>${esc(e.message)}</p></div>`;
  }
}

function aiBlock(ai) {
  if (!ai) return `<div class="ai">AI pre-screen: ${MODE === "demo" ? "not available in demo mode" : "pending (or the optional function isn't deployed)"}. Review manually.</div>`;
  if (ai.error) return `<div class="ai">AI pre-screen failed: ${esc(ai.error)}</div>`;
  const cls = ai.recommendation === "approve" ? "ai--approve" : ai.recommendation === "reject" ? "ai--reject" : "";
  return `<div class="ai ${cls}"><strong>AI suggests: ${esc(ai.recommendation)}</strong> (score ${esc(ai.score)}). ${esc(ai.summary || "")}
    ${ai.flags?.length ? `<br>Flags: ${ai.flags.map(esc).join(", ")}` : ""}</div>`;
}

function renderPending(list) {
  qs("#nPending").textContent = list.length ? `(${list.length})` : "";
  if (!list.length) { panel.innerHTML = `<div class="empty"><h3>Queue is clear.</h3><p>New donations will appear here.</p></div>`; return; }
  panel.innerHTML = list.map(s => `
    <article class="review" data-id="${esc(s.id)}">
      <div class="review__photos">${(s.photos || []).map(p => `<a href="${esc(p)}" target="_blank" rel="noopener"><img src="${esc(p)}" alt=""></a>`).join("")}</div>
      <div>
        <p class="mono muted" style="margin:0">${esc(s.passportId)} · submitted ${date(s.createdAt)}</p>
        <h3>${esc(s.title)}</h3>
        <p style="margin:0">${esc(catLabel(s.category))} · size ${esc(s.size)} · ${esc(condLabel(s.condition))}${s.material ? ` · ${esc(s.material)}` : ""}${s.brand ? ` · ${esc(s.brand)}` : ""}</p>
        <p style="margin:8px 0 0"><strong>Flaws:</strong> ${esc(s.defects || "none stated")}</p>
        ${s.description ? `<p style="margin:6px 0 0">${esc(s.description)}</p>` : ""}
        <p class="muted" style="margin:8px 0 0;font-size:.9rem">Donor: ${esc(s.donorName)} &lt;${esc(s.donorEmail)}&gt; · ${esc(s.hub)} · ${esc(s.dropoff || "")}</p>
        ${aiBlock(s.aiScreening)}
        <fieldset class="field" style="margin-top:6px"><legend>Hygiene checklist (all required to publish)</legend>
          ${HYGIENE_CHECKS.map(c => `<label class="check"><input type="checkbox" data-check="${c.id}"> ${esc(c.label)}</label>`).join("")}
        </fieldset>
        <div class="form-row">
          <div class="field"><label>Price (${CURRENCY}) <span class="hint">needed to publish</span></label><input data-price type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 120"></div>
          <div class="field"><label>Notes <span class="hint">(sent to donor if rejected)</span></label><input data-notes maxlength="300"></div>
        </div>
        <div class="actions">
          <button class="btn btn--lime btn--sm" data-act="approved">Approve &amp; publish</button>
          <button class="btn btn--sm" data-act="rejected">Reject</button>
        </div>
      </div>
    </article>`).join("");

  qsa(".review").forEach(card => {
    qsa("[data-act]", card).forEach(btn => btn.addEventListener("click", async () => {
      const decision = btn.dataset.act;
      const checklist = Object.fromEntries(qsa("[data-check]", card).map(c => [c.dataset.check, c.checked]));
      const notes = qs("[data-notes]", card).value.trim();
      const price = Number(qs("[data-price]", card).value);
      if (decision === "approved" && !Object.values(checklist).every(Boolean)) return toast("Tick every hygiene check before publishing.", true);
      if (decision === "approved" && !(price > 0)) return toast("Set a price before publishing.", true);
      if (decision === "rejected" && !notes) return toast("Add a short note explaining the rejection.", true);
      qsa("button", card).forEach(b => (b.disabled = true));
      try {
        await api.reviewSubmission(card.dataset.id, { decision, checklist, notes, price: decision === "approved" ? price : null });
        toast(decision === "approved" ? "Published to the rack." : "Rejected. Remember to email the donor.");
        load();
      } catch (e) { toast(e.message, true); qsa("button", card).forEach(b => (b.disabled = false)); }
    }));
  });
}

function renderHistory(list) {
  if (!list.length) { panel.innerHTML = `<div class="empty"><h3>Nothing reviewed yet.</h3></div>`; return; }
  panel.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Passport</th><th>Item</th><th>Decision</th><th>Notes</th><th>Donor</th><th></th></tr></thead><tbody>
  ${list.map(s => `<tr><td class="mono">${esc(s.passportId)}</td><td>${esc(s.title)}</td><td>${esc(s.status)}</td><td>${esc(s.reviewNotes || "")}</td><td>${esc(s.donorEmail)}</td>
    <td>${s.status === "approved" ? `<a class="link" href="passport.html?id=${encodeURIComponent(s.passportId)}" target="_blank">Tag &amp; QR</a>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function renderRequests(list) {
  if (!list.length) { panel.innerHTML = `<div class="empty"><h3>No requests yet.</h3></div>`; return; }
  panel.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>When</th><th>Item</th><th>Requester</th><th>Pick-up</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(r => `<tr data-id="${esc(r.id)}"><td>${date(r.createdAt)}</td><td>${esc(r.listingTitle)}<br><span class="mono muted">${esc(r.passportId)}</span></td>
    <td>${esc(r.name)}<br><a class="link" href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><span class="muted">${esc(r.role || "")}</span>${r.message ? `<br><em>${esc(r.message)}</em>` : ""}</td>
    <td>${esc(r.pickup || "")}</td><td>${esc(r.status)}</td>
    <td>${r.status === "open" ? `<button class="btn btn--sm btn--lime" data-s="collected">Collected</button> <button class="btn btn--sm" data-s="cancelled">Release</button>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`;
  qsa("tr[data-id] [data-s]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    try { await api.setRequestStatus(b.closest("tr").dataset.id, b.dataset.s); toast(b.dataset.s === "collected" ? "Marked as collected — impact counted." : "Released back to the rack."); load(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
}

function renderTable(list, cols) {
  if (!list.length) { panel.innerHTML = `<div class="empty"><h3>Nothing here yet.</h3></div>`; return; }
  const csv = [cols.join(","), ...list.map(r => cols.map(c => `"${String(c === "createdAt" ? date(r[c]) : r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  panel.innerHTML = `<p><a class="btn btn--sm" download="${tab}.csv" href="data:text/csv;charset=utf-8,${encodeURIComponent(csv)}">Download CSV</a></p>
  <div class="table-wrap"><table class="table"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
  ${list.map(r => `<tr>${cols.map(c => `<td>${esc(c === "createdAt" ? date(r[c]) : r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}


// ── Add a piece directly (no donation form, no code) ──
const opts = (arr, ph) => (ph ? `<option value="">${ph}</option>` : "") +
  arr.map(a => typeof a === "string" ? `<option>${a}</option>` : `<option value="${a.id}">${esc(a.label)}</option>`).join("");

function renderAdd() {
  const files = [];
  panel.innerHTML = `
  <div class="split" style="align-items:start">
    <div>
      <h2 class="display display--m">Put a piece<br>on the rack</h2>
      <p class="lede" style="margin-top:20px">For clothes you've collected and checked. Fill this in, add photos and press Publish — it appears on the rack straight away with its own passport.</p>
      <p class="muted" style="margin-top:16px">Only list pieces that have passed your hygiene check.</p>
    </div>
    <form class="panel form" id="addForm" novalidate>
      <div class="field">
        <label for="addPhotos">Photos <span class="hint">— 1 to 6. The first one is the cover.</span></label>
        <div class="drop" id="addDrop" tabindex="0" role="button">
          <input type="file" id="addPhotos" accept="image/*" multiple>
          <strong>Add photos</strong><span class="muted">Drop them here or tap to choose</span>
        </div>
        <div class="thumbs" id="addThumbs"></div>
      </div>
      <div class="field"><label for="aTitle">Name of the piece</label><input id="aTitle" name="title" required maxlength="120" placeholder="e.g. Navy wool overshirt"></div>
      <div class="form-row">
        <div class="field"><label for="aCat">Category</label><select id="aCat" name="category" required>${opts(CATEGORIES, "Choose…")}</select></div>
        <div class="field"><label for="aSize">Size</label><select id="aSize" name="size" required>${opts(SIZES, "Choose…")}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="aCond">Condition</label><select id="aCond" name="condition" required>${opts(CONDITIONS, "Choose…")}</select></div>
        <div class="field"><label for="aHub">Pick-up point</label><select id="aHub" name="hub" required>${opts(HUBS)}</select></div>
      </div>
      <div class="field"><label for="aPrice">Price (${CURRENCY})</label><input id="aPrice" name="price" type="number" min="1" step="1" inputmode="numeric" required placeholder="e.g. 120"></div>
      <div class="form-row">
        <div class="field"><label for="aFabric">Fabric <span class="hint">(optional)</span></label><input id="aFabric" name="material" maxlength="80"></div>
        <div class="field"><label for="aBrand">Brand <span class="hint">(optional)</span></label><input id="aBrand" name="brand" maxlength="60"></div>
      </div>
      <div class="field"><label for="aDesc">Description <span class="hint">(optional)</span></label><textarea id="aDesc" name="description" maxlength="400" placeholder="Fit, feel, any small flaws."></textarea></div>
      <div class="form-row">
        <div class="field"><label for="aStory">Its story <span class="hint">(optional)</span></label><input id="aStory" name="story" maxlength="160"></div>
        <div class="field"><label for="aDonor">Previous owner's first name <span class="hint">(only with their OK)</span></label><input id="aDonor" name="donorName" maxlength="40"></div>
      </div>
      <p class="error-text" id="addErr" role="alert"></p>
      <div class="progress" id="addProg" hidden><div></div></div>
      <button class="btn btn--lime" type="submit">Publish to the rack</button>
    </form>
  </div>`;

  const input = qs("#addPhotos"), drop = qs("#addDrop"), thumbs = qs("#addThumbs");
  const draw = () => {
    thumbs.innerHTML = files.map((f, i) => `<div class="thumb"><img src="${URL.createObjectURL(f)}" alt="Photo ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">✕</button></div>`).join("");
    qsa("[data-rm]", thumbs).forEach(b => b.addEventListener("click", () => { files.splice(+b.dataset.rm, 1); draw(); }));
  };
  const add = list => { for (const f of list) { if (f.type.startsWith("image/") && files.length < 6) files.push(f); } draw(); };
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => add(e.dataTransfer.files));
  input.addEventListener("change", () => { add(input.files); input.value = ""; });

  qs("#addForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, err = qs("#addErr");
    if (!files.length) { err.textContent = "Add at least one photo."; return; }
    const bad = f.querySelector(":invalid");
    if (bad) { err.textContent = `Fill in “${bad.labels?.[0]?.textContent.split(/[—(]/)[0].trim()}”.`; bad.focus(); return; }
    err.textContent = "";
    const d = Object.fromEntries(new FormData(f));
    const btn = qs("button[type=submit]", f), bar = qs("#addProg");
    btn.disabled = true; btn.textContent = "Publishing…"; bar.hidden = false;
    try {
      const res = await api.addListing({
        title: d.title.trim(), category: d.category, size: d.size, condition: d.condition, hub: d.hub, price: Number(d.price),
        material: d.material.trim(), brand: d.brand.trim(), description: d.description.trim(), story: d.story.trim(),
        donorName: d.donorName.trim(), showDonorName: !!d.donorName.trim()
      }, files, p => { qs("div", bar).style.width = `${Math.round(p * 100)}%`; });
      toast(`Published. Passport ${res.passportId}`);
      panel.insertAdjacentHTML("afterbegin", `<div class="panel" style="margin-bottom:28px;background:var(--lime);border-color:var(--lime)"><strong>“${esc(d.title)}” is on the rack.</strong> Passport <span class="mono">${esc(res.passportId)}</span> · <a class="link" href="item.html?id=${encodeURIComponent(res.id)}" target="_blank">View it</a> · <a class="link" href="passport.html?id=${encodeURIComponent(res.passportId)}" target="_blank">Print its QR tag</a></div>`);
      files.length = 0; draw(); f.reset();
      btn.disabled = false; btn.textContent = "Publish to the rack"; bar.hidden = true; qs("div", bar).style.width = "0";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex) {
      err.textContent = ex.message || "Couldn't publish. Check your connection and try again.";
      btn.disabled = false; btn.textContent = "Publish to the rack"; bar.hidden = true;
    }
  });
}

// ── Manage what's on the rack ──
function renderRack(list) {
  if (!list.length) { panel.innerHTML = `<div class="empty"><h3>The rack is empty.</h3><p>Use “+ Add a piece” to list your first item.</p></div>`; return; }
  panel.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Piece</th><th>Passport</th><th>Price (${CURRENCY})</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(l => `<tr data-id="${esc(l.id)}">
    <td style="width:72px"><img src="${esc(l.photos?.[0] || "")}" alt="" style="width:56px;height:70px;object-fit:cover"></td>
    <td><a class="link" href="item.html?id=${encodeURIComponent(l.id)}" target="_blank">${esc(l.title)}</a><br><span class="muted">Size ${esc(l.size)} · ${esc(l.hub)}</span></td>
    <td class="mono">${esc(l.passportId)}</td>
    <td><input data-price type="number" min="0" step="1" value="${esc(l.price ?? "")}" aria-label="Price of ${esc(l.title)}" style="width:90px;border:1px solid var(--ink);padding:8px;background:transparent"></td>
    <td><select data-status aria-label="Status of ${esc(l.title)}">
      ${[["available", "On the rack"], ["reserved", "Reserved"], ["claimed", "Rehomed"]].map(([v, t]) => `<option value="${v}" ${l.status === v ? "selected" : ""}>${t}</option>`).join("")}
    </select></td>
    <td><button class="btn btn--sm btn--plain" data-remove>Take down</button></td></tr>`).join("")}
  </tbody></table></div>`;
  qsa("[data-status]").forEach(sel => sel.addEventListener("change", async () => {
    try { await api.updateListing(sel.closest("tr").dataset.id, { status: sel.value }); toast("Status updated."); }
    catch (e) { toast(e.message, true); }
  }));
  qsa("tr [data-price]").forEach(inp => inp.addEventListener("change", async () => {
    try { await api.updateListing(inp.closest("tr").dataset.id, { price: Math.max(0, Number(inp.value) || 0) }); toast("Price updated."); }
    catch (e) { toast(e.message, true); }
  }));
  qsa("[data-remove]").forEach(b => b.addEventListener("click", async () => {
    if (!b.dataset.armed) {
      b.dataset.armed = "1"; b.textContent = "Click again to remove";
      setTimeout(() => { delete b.dataset.armed; b.textContent = "Take down"; }, 4000);
      return;
    }
    try { await api.removeListing(b.closest("tr").dataset.id); toast("Taken down from the rack."); load(); }
    catch (e) { toast(e.message, true); }
  }));
}
