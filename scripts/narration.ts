/**
 * The narration script.
 *
 * One block per segment, written to be SPOKEN, not read: short sentences, no
 * subordinate clauses, numbers said the way a person says them.
 *
 * Claims here are deliberately conservative. What is proven is the MECHANISM —
 * that loss is bounded and reserved before an order exists. Profitability over
 * two and a half sessions is not proven and nothing below claims it. Numbers
 * marked {{...}} are filled from measured account state before the final cut;
 * none of them are narrated until they have actually happened.
 */
export type Block = { segment: string; secs: number; text: string };

export const NARRATION: Block[] = [
  {
    segment: "01-open",
    secs: 21,
    text:
      "Give an autonomous agent a brokerage account and it will place trades. " +
      "That part is easy now. " +
      "The hard question is the one nobody shows you. " +
      "What happens when it's wrong? " +
      "Most trading agents can answer what they bought. " +
      "Very few can tell you what it costs them if it goes against them, " +
      "before they buy it.",
  },
  {
    segment: "02-cover",
    secs: 36,
    text:
      "This is Vig. It sells iron condors on index E T Fs, through Alpaca. " +
      "The number at the top is the whole product. " +
      "Uncovered exposure. Zero dollars. " +
      "Underneath it, two figures that are always identical. " +
      "The worst case if every open structure breaks against us. " +
      "And the capital already set aside to pay for exactly that. " +
      "They match because they have to. " +
      "An order that would not be covered is never sent. " +
      "Everything on this page was read from a live paper account through the Alpaca command line tool. " +
      "There is no demo mode, and no seeded data.",
  },
  {
    segment: "03-structure",
    secs: 39,
    text:
      "Each open structure is drawn as its own payoff. " +
      "Sell a put spread below the market. Sell a call spread above it. " +
      "We collect premium from the bulls and the bears at the same time. " +
      "The flat floors on either side are the point. " +
      "The loss cannot get deeper than that, no matter where price goes. " +
      "And price can only ever break one side. It cannot finish below the put and above the call. " +
      "So the worst case is one width, less the credit. Known exactly, before the order exists. " +
      "The white line is where the market is right now. " +
      "As long as it stays in the corridor, the structure expires worthless and we keep the premium.",
  },
  {
    segment: "04-decision",
    secs: 27,
    text:
      "Here is the part worth watching. " +
      "Every order is submitted twice. Once as a dry run, which renders the exact request without sending it. " +
      "Then again, as the identical command. The proof and the order are the same request. " +
      "And right now the agent is refusing. The book is full, and every gate says no by name."
  },
  {
    segment: "05-limits",
    secs: 27,
    text:
      "One more thing, and it is the honest part. " +
      "Last night one network read failed. The agent lost track of what it held and opened twice the book it should have. " +
      "The number on screen is what that cost. " +
      "Every position stayed covered. Uncovered exposure never left zero. " +
      "Vig never takes a position it can't cover."
  },
];
