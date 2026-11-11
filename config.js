// ─────────────────────────────────────────────────────────────
//  ThreadForward — configuration
//
//  1. Create a Firebase project (console.firebase.google.com)
//  2. Add a Web App and paste its config below.
//  3. Enable: Authentication → Anonymous + Email/Password,
//     Firestore Database, Storage.
//  4. Deploy the rules in /firebase (see README).
//
//  While apiKey is empty the site runs in DEMO MODE: everything
//  works, but data is stored only in this browser (localStorage).
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.12.2";

// Pick-up points shown on forms and items. Add cities as you grow.
export const HUBS = ["Hong Kong Hub", "Pop-up Booth", "Ship to me"];

// Prices are set by the team when a piece is listed.
export const CURRENCY = "HK$";

export const CATEGORIES = [
  { id: "tops",      label: "Tops & Tees" },
  { id: "shirts",    label: "Shirts & Blouses" },
  { id: "knitwear",  label: "Knitwear" },
  { id: "outerwear", label: "Jackets & Coats" },
  { id: "denim",     label: "Denim" },
  { id: "bottoms",   label: "Trousers & Skirts" },
  { id: "dresses",   label: "Dresses" },
  { id: "accessories", label: "Bags & Accessories" }
];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"];

export const CONDITIONS = [
  { id: "like-new", label: "Like new" },
  { id: "great",    label: "Great — light wear" },
  { id: "good",     label: "Good — visible wear" },
  { id: "repair",   label: "Needs a small repair" }
];

// Rough per-garment estimates used for the impact counters.
// Clearly labelled as estimates on the site. Adjust as you refine your methodology.
export const IMPACT = {
  tops:        { kg: 0.25, waterL: 2700 },
  shirts:      { kg: 0.30, waterL: 2700 },
  knitwear:    { kg: 0.50, waterL: 3000 },
  outerwear:   { kg: 1.00, waterL: 4000 },
  denim:       { kg: 0.80, waterL: 7500 },
  bottoms:     { kg: 0.50, waterL: 3000 },
  dresses:     { kg: 0.40, waterL: 3000 },
  accessories: { kg: 0.30, waterL: 1000 }
};

// Hygiene checklist the review team completes before publishing.
export const HYGIENE_CHECKS = [
  { id: "washed",    label: "Freshly washed / clean" },
  { id: "stains",    label: "No stains or discolouration" },
  { id: "odour",     label: "No odour" },
  { id: "pests",     label: "No mould, pests or bed-bug signs" },
  { id: "fabric",    label: "Fabric intact (no thinning / large holes)" },
  { id: "hardware",  label: "Zips, buttons & seams work" }
];
