// ThreadForward — the cover story: a short, endless loop of magazine covers.
// The top cover turns on its spine like a page, shows its inside page as it goes,
// then slides to the back of the pile and the next issue steps forward.
// Pauses when the hero is off screen, when the tab is hidden, and on hover.
// Visitors who prefer reduced motion just see the first cover.
const stack = document.querySelector("[data-mag-loop]");

if (stack) {
  const covers = [...stack.querySelectorAll(".cover")];
  let order = covers.map((_, i) => i);
  const HOLD = 1700, TURN = 1050;

  const place = () => order.forEach((ci, k) => {
    const c = covers[ci];
    c.style.setProperty("--k", k);
    c.style.zIndex = String(covers.length - k);
    c.classList.toggle("is-top", k === 0);
  });
  place();

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true, hovered = false, busy = false, timer = 0;
  const canRun = () => visible && !hovered && !document.hidden && !still.matches;

  const turn = () => {
    timer = 0;
    if (!canRun()) return;
    busy = true;
    const top = covers[order[0]];
    top.classList.add("is-turning");
    const anim = top.animate([
      { transform: "translate3d(0,0,0) rotateY(0deg)", opacity: 1 },
      { transform: "translate3d(0,-1%,60px) rotateY(-95deg)", opacity: 1, offset: 0.5 },
      { transform: "translate3d(0,0,0) rotateY(-178deg)", opacity: 1, offset: 0.82 },
      { transform: "translate3d(0,0,-40px) rotateY(-180deg)", opacity: 0 }
    ], { duration: TURN, easing: "cubic-bezier(.55,.06,.3,1)" });
    // halfway through the turn, let the pile step forward underneath
    setTimeout(() => { order.push(order.shift()); place(); top.classList.add("is-turning"); top.style.zIndex = String(covers.length + 1); }, TURN * 0.45);
    anim.onfinish = anim.oncancel = () => {
      top.classList.remove("is-turning");
      top.style.zIndex = "0";
      busy = false;
      schedule();
    };
  };
  const schedule = () => { if (!timer && !busy && canRun()) timer = setTimeout(turn, HOLD); };
  const pause = () => { clearTimeout(timer); timer = 0; };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? schedule() : pause(); }, { threshold: 0.2 }).observe(stack);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : schedule()));
  stack.addEventListener("pointerenter", () => { hovered = true; pause(); });
  stack.addEventListener("pointerleave", () => { hovered = false; schedule(); });
  still.addEventListener?.("change", () => (still.matches ? pause() : schedule()));

  // Don't start while the archive entrance is still playing.
  const root = document.documentElement;
  if (root.classList.contains("intro")) {
    new MutationObserver((_, mo) => { if (!root.classList.contains("intro")) { mo.disconnect(); schedule(); } })
      .observe(root, { attributes: true, attributeFilter: ["class"] });
  } else schedule();
}
