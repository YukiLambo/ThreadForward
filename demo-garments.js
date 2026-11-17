// Placeholder garment cut-outs used ONLY in demo mode, so the rail has
// something to hang before real pieces are uploaded.
const shade = id => `<defs>
  <linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  <linearGradient id="v${id}" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
</defs>`;
const wrap = (id, body) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">${shade(id)}${body}</svg>`)}`;
const shaded = (id, d, fill, extra = "") =>
  `<path d="${d}" fill="${fill}" ${extra}/><path d="${d}" fill="url(#s${id})"/><path d="${d}" fill="url(#v${id})"/>`;

const BLAZER = "M104 8 L150 66 L196 8 L250 26 L272 80 L290 304 L254 310 L242 128 L242 372 L58 372 L58 128 L46 310 L10 304 L28 80 L50 26 Z";
const TEE = "M108 10 Q150 36 192 10 L258 40 L292 112 L248 132 L232 100 L232 352 Q150 362 68 352 L68 100 L52 132 L8 112 L42 40 Z";
const SHIRT = "M110 10 L150 34 L190 10 L250 30 L270 84 L286 300 L254 306 L240 126 L242 368 Q150 380 58 368 L60 126 L46 306 L14 300 L30 84 L50 30 Z";
const KNIT = "M106 12 Q150 40 194 12 L254 34 L274 90 L292 300 L254 308 L238 130 L238 350 L62 350 L62 130 L46 308 L8 300 L26 90 L46 34 Z";
const DENIM = "M108 10 L150 40 L192 10 L252 30 L274 86 L288 286 L254 292 L240 126 L240 318 L60 318 L60 126 L46 292 L12 286 L26 86 L48 30 Z";
const DRESS = "M112 62 Q150 80 188 62 L198 126 Q232 262 254 388 Q150 400 46 388 Q68 262 102 126 Z";

export const DEMO_GARMENTS = {
  blazer: wrap(1, `
    <defs><pattern id="cord" width="5" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="#A34E2C"/><rect width="2" height="10" fill="#8E4024"/></pattern></defs>
    ${shaded(1, BLAZER, "url(#cord)")}
    <path d="M104 8 L150 66 L128 168 L92 40 Z" fill="#7E381F"/><path d="M196 8 L150 66 L172 168 L208 40 Z" fill="#7E381F"/>
    <path d="M150 66 L150 372" stroke="#6E3019" stroke-width="2"/>
    <circle cx="160" cy="214" r="5" fill="#2A1A12"/><circle cx="160" cy="262" r="5" fill="#2A1A12"/>
    <path d="M78 270 L124 270 M176 270 L222 270" stroke="#6E3019" stroke-width="3"/>`),
  meshTee: wrap(2, `
    <defs><pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F26B5B"/><circle cx="3" cy="3" r="1.3" fill="#D8503F"/></pattern></defs>
    <path d="M42 40 L8 112 L52 132 L68 100 L64 48 Z" fill="#7CF0A0" opacity=".85"/><path d="M258 40 L292 112 L248 132 L232 100 L236 48 Z" fill="#7CF0A0" opacity=".85"/>
    <path d="M42 40 C-10 120 30 190 70 180 L68 100 Z" fill="#9BFFC0" opacity=".55"/><path d="M258 40 C310 120 270 190 230 180 L232 100 Z" fill="#9BFFC0" opacity=".55"/>
    ${shaded(2, "M108 10 Q150 36 192 10 L236 30 L232 352 Q150 362 68 352 L64 30 Z", "url(#mesh)")}`),
  shirt: wrap(3, `
    <defs><pattern id="stripe" width="22" height="10" patternUnits="userSpaceOnUse"><rect width="22" height="10" fill="#F1E3C6"/><rect width="7" height="10" fill="#C9643C"/><rect x="11" width="3" height="10" fill="#2F5D8C"/></pattern></defs>
    ${shaded(3, SHIRT, "url(#stripe)")}
    <path d="M110 10 L150 34 L128 60 L102 24 Z M190 10 L150 34 L172 60 L198 24 Z" fill="#F7EEDB" stroke="#B9A88A" stroke-width="1.5"/>
    <path d="M150 34 L150 368" stroke="#B9A88A" stroke-width="10" opacity=".55"/>
    ${[90, 140, 190, 240, 290].map(y => `<circle cx="150" cy="${y}" r="3.5" fill="#FFF8EA" stroke="#9C8B6E"/>`).join("")}`),
  knit: wrap(4, `
    <defs><pattern id="rib" width="8" height="12" patternUnits="userSpaceOnUse"><rect width="8" height="12" fill="#EDE3CF"/><path d="M2 0 Q4 6 2 12 M6 0 Q4 6 6 12" stroke="#D7C9AD" stroke-width="1.6" fill="none"/></pattern></defs>
    ${shaded(4, KNIT, "url(#rib)")}
    <path d="M106 12 Q150 40 194 12 Q150 54 106 12 Z" fill="#D9CBAE"/>
    <rect x="62" y="326" width="176" height="24" fill="#DCCEB1"/><path d="M254 290 L292 300 L290 310 L252 302 Z M46 290 L8 300 L10 310 L48 302 Z" fill="#DCCEB1"/>`),
  denim: wrap(5, `
    ${shaded(5, DENIM, "#4F79A8")}
    <path d="M108 10 L150 40 L192 10 L206 26 L150 64 L94 26 Z" fill="#3E6593"/>
    <path d="M150 64 L150 318" stroke="#C99A3E" stroke-width="2" stroke-dasharray="5 4"/>
    <rect x="84" y="112" width="48" height="44" rx="4" fill="none" stroke="#C99A3E" stroke-width="2" stroke-dasharray="5 4"/>
    <rect x="168" y="112" width="48" height="44" rx="4" fill="none" stroke="#C99A3E" stroke-width="2" stroke-dasharray="5 4"/>
    <rect x="60" y="292" width="180" height="26" fill="#3E6593"/>
    ${[100, 160, 220, 280].map(y => `<circle cx="160" cy="${y}" r="4" fill="#B8862E"/>`).join("")}`),
  dress: wrap(6, `
    <path d="M116 4 L120 66 M184 4 L180 66" stroke="#4F5A2C" stroke-width="4" stroke-linecap="round"/>
    ${shaded(6, DRESS, "#6E7B3A")}
    <path d="M130 140 Q140 270 120 386 M170 140 Q160 270 182 386" stroke="#5D6930" stroke-width="2" fill="none" opacity=".6"/>`)
};
