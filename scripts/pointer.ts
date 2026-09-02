/**
 * A synthetic pointer, with optional zoom and real interaction.
 *
 * Playwright records no cursor, so a scripted capture reads as a screenshot
 * that happens to move. A pointer gives the shot agency: the eye follows it and
 * it lands on whatever the narration is describing.
 *
 * Three capabilities, each optional per move:
 *   label   a caption pinned to the cursor
 *   click   Playwright fires the real action once the cursor has ARRIVED, so
 *           the click is visibly caused by the cursor rather than teleporting
 *   zoom    the page scales toward the target and holds, then releases
 *
 * Zoom transforms `document.body`. The pointer and captions are therefore
 * appended to `documentElement`, outside the transform: a transformed ancestor
 * becomes the containing block for `position: fixed` descendants, which would
 * otherwise break both. The pointer reads getBoundingClientRect, which is
 * already post-transform, so it lands correctly at any scale.
 */
export type Move = {
  at: number;
  sel: string;
  label?: string;
  /** Fire a real click on `sel` once the cursor arrives. */
  click?: boolean;
  /** Type into `sel` after arriving. Implies click. */
  type?: string;
  /** Scale to hold while parked here. 1 releases. ~1.5-1.8 reads well. */
  zoom?: number;
};

export const TRAVEL_MS = 1050;   // cursor travel; actions fire after this

/** Per-project. Selectors are CSS in the page being filmed. */
export const MOVES: Record<string, Move[]> = {
  // Zoom is used four times in the whole film, on the four beats that carry the
  // argument: the figure itself, the equality under it, a payoff floor, and a
  // refusal. Everywhere else the shot plays flat — a push-in on every move is
  // nausea, and it spends the emphasis the four real moments need.

  "01-open": [
    { at: 4.0, sel: ".mark" },
    { at: 11.0, sel: "#positions .pos:first-child, #pos-empty", label: "an agent with a live account" },
    { at: 18.5, sel: "#reserved", label: "but what does it cost if it's wrong?" },
  ],

  "02-cover": [
    { at: 3.0, sel: ".hero .label" },
    { at: 6.5, sel: ".hero .zero", label: "uncovered exposure", zoom: 1.9 },
    { at: 16.0, sel: ".hero .equation", label: "these two always match", zoom: 1.5 },
    { at: 26.0, sel: "#hero-worst" },
    { at: 30.0, sel: "#hero-res" },
    { at: 36.0, sel: "footer", zoom: 1 },
  ],

  "03-structure": [
    { at: 3.5, sel: "#positions .pos:first-child .sym" },
    { at: 9.0, sel: "#positions .pos:first-child .payoff svg" },
    { at: 17.0, sel: "#positions .pos:first-child .floors .cap", label: "the loss cannot get deeper", zoom: 1.7 },
    { at: 28.0, sel: "#positions .pos:first-child .payoff", zoom: 1 },
    { at: 34.0, sel: "#positions .pos:first-child .axis .now", label: "where the market is now" },
    { at: 40.0, sel: "#positions .pos:nth-child(2)" },
  ],

  "04-decision": [
    { at: 3.0, sel: ".meter" },
    { at: 8.0, sel: "#reserved", label: "reserved before the order" },
    // The one real interaction in the film, and it lands on the sentence that
    // needs proving: the cursor opens the receipt and the exact command that
    // placed the structure is there to read.
    { at: 13.0, sel: "#positions .pos:first-child .receipt-toggle", label: "the command that placed it", click: true },
    { at: 19.0, sel: "#positions .pos:first-child .rcmd" },
    { at: 27.5, sel: "#decisions .dec.refused, #decisions .dec:last-child", label: "a gate saying no", zoom: 1.6 },
    { at: 35.0, sel: "#decisions", zoom: 1 },
  ],

  "05-limits": [
    { at: 6.0, sel: "footer" },
    { at: 16.0, sel: ".hero .zero" },
    { at: 28.0, sel: ".claim", label: "" },
  ],
};

export const POINTER_RUNTIME = `
(moves => {
  const root = document.documentElement;
  const p = document.createElement('div');
  p.id = '__ptr';
  p.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 22 22">' +
    '<path d="M3 1 L3 17 L7.2 13.2 L10 19.5 L12.6 18.3 L9.9 12.2 L15.5 12.2 Z"' +
    ' fill="#fff" stroke="rgba(0,0,0,.85)" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
    '<span class="__ptr-l"></span>';
  const css = document.createElement('style');
  css.textContent = \`
    /* Zoom lives on body; the cursor lives outside it so a transformed
       ancestor cannot capture its fixed positioning. */
    body{transition:transform 1.15s cubic-bezier(.3,.02,.2,1);will-change:transform;}
    #__ptr{position:fixed;left:0;top:0;z-index:100000;pointer-events:none;opacity:0;
      transform:translate(-50%,-50%);
      transition:opacity .45s ease, left 1.05s cubic-bezier(.33,.02,.2,1),
                 top 1.05s cubic-bezier(.33,.02,.2,1);}
    #__ptr.on{opacity:1;}
    #__ptr .__ptr-l{position:absolute;left:22px;top:12px;white-space:nowrap;
      font-family:"Azeret Mono",ui-monospace,Menlo,monospace;font-size:11px;
      letter-spacing:-.01em;color:#4fd1c5;background:rgba(6,7,9,.92);
      border:1px solid rgba(79,209,197,.34);padding:3px 8px;border-radius:2px;
      opacity:0;transition:opacity .3s ease;}
    #__ptr.labelled .__ptr-l{opacity:1;}
    #__ptr::after{content:"";position:absolute;left:1px;top:1px;width:26px;height:26px;
      margin:-13px 0 0 -13px;border:1.5px solid rgba(79,209,197,.9);border-radius:50%;
      opacity:0;transform:scale(.35);}
    #__ptr.ping::after{animation:ptrPing .62s cubic-bezier(.2,.7,.2,1);}
    @keyframes ptrPing{0%{opacity:.95;transform:scale(.35)}100%{opacity:0;transform:scale(1.9)}}
    /* A press ring, so a real click reads as a click. */
    #__ptr.press::before{content:"";position:absolute;left:1px;top:1px;width:16px;height:16px;
      margin:-8px 0 0 -8px;border-radius:50%;background:rgba(79,209,197,.55);
      animation:ptrPress .34s ease-out;}
    @keyframes ptrPress{0%{opacity:.9;transform:scale(.2)}100%{opacity:0;transform:scale(1.5)}}
  \`;
  document.head.appendChild(css);
  root.appendChild(p);
  const lab = p.querySelector('.__ptr-l');

  window.__ptrPress = () => {
    p.classList.remove('press');
    void p.offsetWidth;
    p.classList.add('press');
  };

  moves.forEach(m => setTimeout(() => {
    const el = document.querySelector(m.sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    p.style.left = Math.round(r.left + Math.min(r.width * 0.5, 90)) + 'px';
    p.style.top  = Math.round(r.top + r.height / 2) + 'px';
    p.classList.add('on');
    lab.textContent = m.label || '';
    p.classList.toggle('labelled', !!m.label);
    p.classList.remove('ping');
    setTimeout(() => p.classList.add('ping'), 1050);

    // Zoom toward the target and hold. Origin is the element's centre in page
    // space, so the thing being discussed stays put while everything else grows.
    if (m.zoom !== undefined) {
      const b = document.body;
      if (m.zoom === 1) { b.style.transform = ''; b.style.transformOrigin = ''; }
      else {
        const cx = r.left + r.width / 2 + scrollX;
        const cy = r.top + r.height / 2 + scrollY;
        b.style.transformOrigin = cx + 'px ' + cy + 'px';
        b.style.transform = 'scale(' + m.zoom + ')';
      }
    }
  }, m.at * 1000));
})(__MOVES__);
`;
