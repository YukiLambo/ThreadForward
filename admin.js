import { api, MODE } from "./api.js";
import { HYGIENE_CHECKS } from "./config.js";
import { initLayout, esc, catLabel, condLabel, qs, qsa, toast } from "./ui.js";

initLayout();

const panel = qs("#panel");
let tab = "pending";
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
  qs("#resetDemo")?.addEventListener("click", async () => { if (confirm("Delete all demo data in this browser?")) { await api.resetDemo(); location.reload(); } });
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
        <p class="muted" style="margin:8px 0 0;font-size:.9rem">Donor: ${esc(s.donorName)} &lt;${esc(s.donorEmail)}&gt; · ${esc(s.campus)} · ${esc(s.dropoff || "")}</p>
        ${aiBlock(s.aiScreening)}
        <fieldset class="field" style="margin-top:6px"><legend>Hygiene checklist (all required to publish)</legend>
          ${HYGIENE_CHECKS.map(c => `<label class="check"><input type="checkbox" data-check="${c.id}"> ${esc(c.label)}</label>`).join("")}
        </fieldset>
        <div class="field"><label>Notes <span class="hint">(sent to donor if rejected)</span></label><input data-notes maxlength="300"></div>
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
      if (decision === "approved" && !Object.values(checklist).every(Boolean)) return toast("Tick every hygiene check before publishing.", true);
      if (decision === "rejected" && !notes) return toast("Add a short note explaining the rejection.", true);
      qsa("button", card).forEach(b => (b.disabled = true));
      try {
        await api.reviewSubmission(card.dataset.id, { decision, checklist, notes });
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
