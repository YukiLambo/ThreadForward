// ─────────────────────────────────────────────────────────────
//  ThreadForward — backend service layer
//
//  Every page talks to the backend ONLY through the functions
//  exported here. Swap Firebase for another backend (Supabase,
//  your own REST API…) by rewriting this one file.
//
//  Collections
//   submissions/{id}  private  — full donor submission (admins + donor)
//   listings/{id}     public   — approved item, public fields only
//   requests/{id}     private  — recipient requests (admins)
//   subscribers/{id}  private  — newsletter emails (admins)
//   registrations/{id} private — workshop sign-ups (admins)
//   admins/{uid}      private  — presence = admin rights
// ─────────────────────────────────────────────────────────────
import { firebaseConfig, FIREBASE_SDK, IMPACT } from "./config.js";

export const MODE = firebaseConfig.apiKey ? "firebase" : "demo";

// ── shared helpers ───────────────────────────────────────────
export function makePassportId(campus = "HKBU") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TF-${new Date().getFullYear()}-${campus.toUpperCase().slice(0, 5)}-${s}`;
}

export function impactFor(category) {
  return IMPACT[category] || { kg: 0.4, waterL: 2500 };
}

/** Resize + compress an image file in the browser before upload. */
export function compressImage(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unsupported image")); };
    img.src = url;
  });
}

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

/** Fields that are safe to publish on the public wardrobe. */
function publicListingFrom(sub) {
  const first = (sub.donorName || "").trim().split(/\s+/)[0] || "";
  return {
    passportId: sub.passportId,
    title: sub.title,
    category: sub.category,
    size: sub.size,
    condition: sub.condition,
    material: sub.material || "",
    brand: sub.brand || "",
    description: sub.description || "",
    story: sub.story || "",
    photos: sub.photos || [],
    campus: sub.campus,
    donorDisplay: sub.showDonorName && first ? first : "",
    impact: impactFor(sub.category),
    status: "available"
  };
}

// ═════════════════════════════════════════════════════════════
//  DEMO BACKEND (localStorage) — used until Firebase is configured
// ═════════════════════════════════════════════════════════════
const DEMO_KEY = "tf_demo_v4";
const SEED = [
  { id: "seed-1", passportId: "TF-2026-HKBU-0842", title: "Rust corduroy blazer", category: "outerwear", size: "M", condition: "great", material: "Cotton corduroy", brand: "Vintage, unbranded", description: "Oversized, soft wale, sits beautifully over a printed shirt. Light wear on the cuffs.", story: "Found at a Sham Shui Po stall, worn to every gallery opening.", photos: ["look-01.jpg"], campus: "HKBU", donorDisplay: "Alex", status: "available" },
  { id: "seed-2", passportId: "TF-2026-POLYU-0193", title: "Mesh tee with organza sleeves", category: "tops", size: "S", condition: "like-new", material: "Polyester mesh, organza", brand: "", description: "A statement layer. Worn once to a showcase.", story: "", photos: ["look-02.jpg"], campus: "PolyU", donorDisplay: "", status: "available" },
  { id: "seed-3", passportId: "TF-2026-CITYU-0411", title: "Everyday shirt bundle", category: "shirts", size: "L", condition: "good", material: "Cotton, linen", brand: "Mixed", description: "Five easy shirts in warm tones. Take one or take them all.", story: "", photos: ["look-03.jpg"], campus: "CityU", donorDisplay: "", status: "available" },
  { id: "seed-4", passportId: "TF-2026-HKBU-0107", title: "Paisley wide-leg jeans", category: "denim", size: "M", condition: "great", material: "Cotton denim", brand: "", description: "Relaxed fit with an all-over paisley print.", story: "First piece ever rehomed through ThreadForward.", photos: ["hero.jpg"], campus: "HKBU", donorDisplay: "Sam", status: "claimed" }
].map(x => ({ ...x, impact: impactFor(x.category), approvedAt: Date.now() - 86400000 }));

function dLoad() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const fresh = { submissions: [], listings: SEED, requests: [], subscribers: [], registrations: [] };
  dSave(fresh);
  return fresh;
}
function dSave(db) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); }
  catch (e) { throw new Error("Browser storage is full — in demo mode photos are kept locally. Clear demo data from the admin page."); }
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const wait = ms => new Promise(r => setTimeout(r, ms));

const demo = {
  async submitDonation(data, files, onProgress = () => {}) {
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const blob = await compressImage(files[i], 700, 0.7);
      photos.push(await blobToDataURL(blob));
      onProgress((i + 1) / files.length);
    }
    const db = dLoad();
    const sub = { ...data, id: uid(), passportId: makePassportId(data.campus), photos, status: "pending", createdAt: Date.now() };
    db.submissions.unshift(sub);
    dSave(db);
    await wait(300);
    return { id: sub.id, passportId: sub.passportId };
  },
  async listListings({ category, size, campus, includeClaimed = false, limit } = {}) {
    let items = dLoad().listings;
    if (!includeClaimed) items = items.filter(i => i.status !== "claimed");
    if (category) items = items.filter(i => i.category === category);
    if (size) items = items.filter(i => i.size === size);
    if (campus) items = items.filter(i => i.campus === campus);
    items = items.sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
    return limit ? items.slice(0, limit) : items;
  },
  async getListing(id) { return dLoad().listings.find(l => l.id === id) || null; },
  async findByPassport(pid) {
    const p = pid.trim().toUpperCase();
    return dLoad().listings.find(l => l.passportId.toUpperCase() === p) || null;
  },
  async requestItem(listingId, data) {
    const db = dLoad();
    const l = db.listings.find(x => x.id === listingId);
    if (!l) throw new Error("Item not found");
    if (l.status !== "available") throw new Error("Sorry — someone has already reserved this piece.");
    l.status = "reserved";
    db.requests.unshift({ ...data, id: uid(), listingId, listingTitle: l.title, passportId: l.passportId, status: "open", createdAt: Date.now() });
    dSave(db);
    await wait(300);
  },
  async subscribe(email) {
    const db = dLoad();
    if (!db.subscribers.some(s => s.email === email)) db.subscribers.push({ email, createdAt: Date.now() });
    dSave(db);
  },
  async registerWorkshop(data) {
    const db = dLoad();
    db.registrations.unshift({ ...data, id: uid(), createdAt: Date.now() });
    dSave(db);
  },
  async getStats() {
    const db = dLoad();
    const claimed = db.listings.filter(l => l.status === "claimed");
    return {
      listed: db.listings.length,
      rehomed: claimed.length,
      kg: claimed.reduce((s, l) => s + (l.impact?.kg || 0), 0),
      waterL: claimed.reduce((s, l) => s + (l.impact?.waterL || 0), 0)
    };
  },
  // admin
  _admin: false,
  _listeners: [],
  onAdminChange(cb) { this._listeners.push(cb); cb(this._admin ? { email: "demo@threadforward" } : null); },
  async adminSignIn() { this._admin = true; this._listeners.forEach(cb => cb({ email: "demo@threadforward" })); },
  async adminSignOut() { this._admin = false; this._listeners.forEach(cb => cb(null)); },
  async listSubmissions(status) {
    const s = dLoad().submissions;
    return status ? s.filter(x => x.status === status) : s;
  },
  async reviewSubmission(id, { decision, checklist, notes }) {
    const db = dLoad();
    const sub = db.submissions.find(s => s.id === id);
    if (!sub) throw new Error("Submission not found");
    sub.status = decision; sub.checklist = checklist; sub.reviewNotes = notes; sub.reviewedAt = Date.now();
    if (decision === "approved") db.listings.unshift({ ...publicListingFrom(sub), id, approvedAt: Date.now() });
    dSave(db);
  },
  async listRequests() { return dLoad().requests; },
  async listRegistrations() { return dLoad().registrations; },
  async listSubscribers() { return dLoad().subscribers; },
  async setRequestStatus(reqId, status) {
    const db = dLoad();
    const r = db.requests.find(x => x.id === reqId);
    if (!r) return;
    r.status = status;
    const l = db.listings.find(x => x.id === r.listingId);
    if (l) l.status = status === "collected" ? "claimed" : status === "cancelled" ? "available" : l.status;
    dSave(db);
  },
  async resetDemo() { localStorage.removeItem(DEMO_KEY); }
};

// ═════════════════════════════════════════════════════════════
//  FIREBASE BACKEND
// ═════════════════════════════════════════════════════════════
let _fb;
async function fb() {
  if (_fb) return _fb;
  const [appM, authM, fsM, stM] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`),
    import(`${FIREBASE_SDK}/firebase-storage.js`)
  ]);
  const app = appM.initializeApp(firebaseConfig);
  _fb = { A: authM, F: fsM, S: stM, auth: authM.getAuth(app), db: fsM.getFirestore(app), st: stM.getStorage(app) };
  return _fb;
}
async function ensureUser() {
  const { A, auth } = await fb();
  await auth.authStateReady();
  if (!auth.currentUser) await A.signInAnonymously(auth);
  return auth.currentUser;
}
const snapList = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
const ts = v => (v && typeof v.toMillis === "function" ? v.toMillis() : v);

const firebase = {
  async submitDonation(data, files, onProgress = () => {}) {
    const user = await ensureUser();
    const { F, S, db, st } = await fb();
    const ref = F.doc(F.collection(db, "submissions"));
    const passportId = makePassportId(data.campus);
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const blob = await compressImage(files[i]);
      const r = S.ref(st, `submissions/${user.uid}/${ref.id}/${i}.jpg`);
      await S.uploadBytes(r, blob, { contentType: "image/jpeg" });
      photos.push(await S.getDownloadURL(r));
      onProgress((i + 1) / files.length);
    }
    await F.setDoc(ref, { ...data, passportId, photos, status: "pending", ownerUid: user.uid, createdAt: F.serverTimestamp() });
    return { id: ref.id, passportId };
  },
  async listListings({ category, size, campus, includeClaimed = false, limit } = {}) {
    const { F, db } = await fb();
    const q = F.query(F.collection(db, "listings"), F.orderBy("approvedAt", "desc"), F.limit(200));
    let items = snapList(await F.getDocs(q)).map(i => ({ ...i, approvedAt: ts(i.approvedAt) }));
    // filter client-side → no composite indexes needed
    if (!includeClaimed) items = items.filter(i => i.status !== "claimed");
    if (category) items = items.filter(i => i.category === category);
    if (size) items = items.filter(i => i.size === size);
    if (campus) items = items.filter(i => i.campus === campus);
    return limit ? items.slice(0, limit) : items;
  },
  async getListing(id) {
    const { F, db } = await fb();
    const s = await F.getDoc(F.doc(db, "listings", id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },
  async findByPassport(pid) {
    const { F, db } = await fb();
    const q = F.query(F.collection(db, "listings"), F.where("passportId", "==", pid.trim().toUpperCase()), F.limit(1));
    const r = snapList(await F.getDocs(q));
    return r[0] || null;
  },
  async requestItem(listingId, data) {
    await ensureUser();
    const { F, db } = await fb();
    const lRef = F.doc(db, "listings", listingId);
    const rRef = F.doc(F.collection(db, "requests"));
    await F.runTransaction(db, async tx => {
      const l = await tx.get(lRef);
      if (!l.exists()) throw new Error("Item not found");
      if (l.data().status !== "available") throw new Error("Sorry — someone has already reserved this piece.");
      tx.update(lRef, { status: "reserved" });
      tx.set(rRef, { ...data, listingId, listingTitle: l.data().title, passportId: l.data().passportId, status: "open", createdAt: F.serverTimestamp() });
    });
  },
  async subscribe(email) {
    await ensureUser();
    const { F, db } = await fb();
    await F.addDoc(F.collection(db, "subscribers"), { email, createdAt: F.serverTimestamp() });
  },
  async registerWorkshop(data) {
    await ensureUser();
    const { F, db } = await fb();
    await F.addDoc(F.collection(db, "registrations"), { ...data, createdAt: F.serverTimestamp() });
  },
  async getStats() {
    const items = await this.listListings({ includeClaimed: true });
    const claimed = items.filter(l => l.status === "claimed");
    return {
      listed: items.length,
      rehomed: claimed.length,
      kg: claimed.reduce((s, l) => s + (l.impact?.kg || 0), 0),
      waterL: claimed.reduce((s, l) => s + (l.impact?.waterL || 0), 0)
    };
  },
  // admin
  async onAdminChange(cb) {
    const { A, F, auth, db } = await fb();
    A.onAuthStateChanged(auth, async user => {
      if (!user || user.isAnonymous) return cb(null);
      const a = await F.getDoc(F.doc(db, "admins", user.uid)).catch(() => null);
      cb(a && a.exists() ? user : { ...user, notAdmin: true, uid: user.uid, email: user.email });
    });
  },
  async adminSignIn(email, password) {
    const { A, auth } = await fb();
    await A.signInWithEmailAndPassword(auth, email, password);
  },
  async adminSignOut() { const { A, auth } = await fb(); await A.signOut(auth); },
  async listSubmissions(status) {
    const { F, db } = await fb();
    const base = F.collection(db, "submissions");
    const q = status ? F.query(base, F.where("status", "==", status)) : F.query(base, F.orderBy("createdAt", "desc"), F.limit(200));
    return snapList(await F.getDocs(q)).map(s => ({ ...s, createdAt: ts(s.createdAt) })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  async reviewSubmission(id, { decision, checklist, notes }) {
    const { F, db, auth } = await fb();
    const sRef = F.doc(db, "submissions", id);
    const snap = await F.getDoc(sRef);
    if (!snap.exists()) throw new Error("Submission not found");
    const b = F.writeBatch(db);
    b.update(sRef, { status: decision, checklist, reviewNotes: notes, reviewedAt: F.serverTimestamp(), reviewedBy: auth.currentUser.uid });
    if (decision === "approved") b.set(F.doc(db, "listings", id), { ...publicListingFrom(snap.data()), approvedAt: F.serverTimestamp() });
    await b.commit();
  },
  async listRequests() {
    const { F, db } = await fb();
    return snapList(await F.getDocs(F.query(F.collection(db, "requests"), F.orderBy("createdAt", "desc")))).map(r => ({ ...r, createdAt: ts(r.createdAt) }));
  },
  async listRegistrations() {
    const { F, db } = await fb();
    return snapList(await F.getDocs(F.query(F.collection(db, "registrations"), F.orderBy("createdAt", "desc")))).map(r => ({ ...r, createdAt: ts(r.createdAt) }));
  },
  async listSubscribers() {
    const { F, db } = await fb();
    return snapList(await F.getDocs(F.collection(db, "subscribers")));
  },
  async setRequestStatus(reqId, status) {
    const { F, db } = await fb();
    const rRef = F.doc(db, "requests", reqId);
    const r = await F.getDoc(rRef);
    if (!r.exists()) return;
    const b = F.writeBatch(db);
    b.update(rRef, { status });
    const lStatus = status === "collected" ? "claimed" : status === "cancelled" ? "available" : null;
    if (lStatus) b.update(F.doc(db, "listings", r.data().listingId), { status: lStatus });
    await b.commit();
  },
  async resetDemo() {}
};

export const api = MODE === "firebase" ? firebase : demo;
