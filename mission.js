import { api } from "./api.js";
import { initLayout, fmt, qs } from "./ui.js";

initLayout();

api.getStats().then(s => {
  qs("#mRehomed").textContent = fmt(s.rehomed);
  qs("#mKg").textContent = s.kg < 10 ? s.kg.toFixed(1) : fmt(s.kg);
  qs("#mListed").textContent = fmt(s.listed);
}).catch(() => {});
