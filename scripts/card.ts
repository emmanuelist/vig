/**
 * Title cards.
 *
 * A card is filmed like any other segment, so it inherits the same trimming,
 * timing and mixing. It is a generated page rather than an ffmpeg overlay
 * because this ffmpeg has no drawtext, and because a card built in HTML
 * inherits the product's own typography instead of looking bolted on.
 *
 * Per project: edit THEME and the CARDS list.
 */
export type Card = {
  /** Segment name. Prefix with a number so it sorts into place. */
  name: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  secs: number;
};

export const THEME = {
  ground: "#0a0a0c",
  ink: "#ece9e3",
  dim: "#918d85",
  /* Brass, the colour this product uses for capital standing behind a
     position. The card opens the film, so it opens in the product's palette
     rather than in whatever the pipeline was last used for. */
  accent: "#d8b26a",
  credit: "#86b06b",
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
  sans: 'Archivo, ui-sans-serif, system-ui, sans-serif',
  fonts: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
};

export function cardHTML(c: Card): string {
  const t = THEME;
  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fonts}" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;background:${t.ground};overflow:hidden}
  body{display:grid;place-items:center;font-family:${t.sans};color:${t.ink}}
  .w{max-width:60ch;padding:0 60px;text-align:center}
  .glyph{width:104px;height:62px;display:block;margin:0 auto}
  .glyph path{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);
     animation:draw 1.5s cubic-bezier(.16,.7,.2,1) forwards}
  .glyph .f1{animation-delay:.25s} .glyph .f2{animation-delay:.45s}
  .glyph .pl{animation-delay:.85s;animation-duration:1.7s}
  @keyframes draw{to{stroke-dashoffset:0}}
  .k{font-family:${t.sans};font-size:14px;letter-spacing:.26em;text-transform:uppercase;
     color:${t.dim};opacity:0;margin-top:30px;
     animation:up 1.1s cubic-bezier(.2,.7,.2,1) 3.4s forwards}
  h1{font-family:${t.sans};font-weight:700;letter-spacing:-.05em;line-height:1;
     font-size:clamp(56px,8.5vw,124px);margin:34px 0 0;opacity:0;
     animation:settle 1.9s cubic-bezier(.16,.62,.16,1) 1.5s forwards}
  @keyframes settle{
    0%{opacity:0;transform:scale(1.09);filter:blur(9px);letter-spacing:.02em}
    100%{opacity:1;transform:none;filter:none;letter-spacing:-.05em}}
  p{font-size:25px;color:${t.dim};margin:26px 0 0;opacity:0;
    animation:up 1.2s cubic-bezier(.2,.7,.2,1) 2.5s forwards}
  .rule{height:1px;width:0;margin:34px auto 0;background:${t.accent};opacity:.45;
    animation:open 1.5s cubic-bezier(.16,.62,.16,1) 2.9s forwards}
  @keyframes open{to{width:210px}}
  @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  /* A faint field, so a card is not a flat colour next to a lit product. */
  body::before{content:"";position:fixed;inset:0;pointer-events:none;
    background:radial-gradient(120% 80% at 50% 46%,rgba(216,178,106,.05),transparent 60%)}
</style>
<div class="w">
  <svg class="glyph" viewBox="0 0 40 24" fill="none" aria-hidden="true">
    <path class="f1" style="--len:7"  d="M1 18H8"  stroke="${t.accent}" stroke-width="2.6" stroke-linecap="square"/>
    <path class="f2" style="--len:7"  d="M32 18H39" stroke="${t.accent}" stroke-width="2.6" stroke-linecap="square"/>
    <path class="pl" style="--len:41" d="M8 18L14 6H26L32 18" stroke="${t.credit}" stroke-width="2.2" stroke-linejoin="round" fill="none"/>
  </svg>
  <h1>${c.title}</h1>
  ${c.subtitle ? `<p>${c.subtitle}</p>` : ""}
  <div class="rule"></div>
  ${c.kicker ? `<div class="k">${c.kicker}</div>` : ""}
</div>`;
}

/** Per project. Empty list = no cards, pipeline behaves as before. */
export const CARDS: Card[] = [
  {
    name: "00-open",
    kicker: "Alpaca AI Trading Agents Hackathon",
    title: "Vig",
    subtitle: "It never takes a position it can't cover.",
    secs: 9,
  },
];
