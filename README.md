# Video → Learning App

A Telegram Mini App that turns source material into an interactive learning
app. Gemini reads the source, writes a plan, then writes a single-file web app
from that plan.

Two sections, one API key:

- **Video** — a YouTube lesson becomes an app that drills its key idea.
- **Research** — a paper becomes a long-form explainer *website*: hero, the
  problem, the mechanism, an interactive visual, the numbers, the limitations,
  the citation. From an uploaded PDF or a link the model retrieves itself.
  Where the subject is genuinely spatial it gets a real 3D scene the reader
  can orbit; where it is not, it gets a diagram, because a gratuitous rotating
  object explains nothing.

Based on Aaron Wade's Google AI Studio sample, rebuilt for Telegram.

## Running cost: $0

| Piece | How | Cost |
|---|---|---|
| Hosting | GitHub Pages (static build) | free |
| Backend, database | none — there isn't one | free |
| Bot | BotFather | free |
| Gemini calls | each user's own AI Studio key | free tier |

There is no server, so there is nowhere to hide a shared API key. Each user
adds their own free [Google AI Studio](https://aistudio.google.com/apikey) key
once; it lives in their private Telegram cloud storage and is sent only to
Google. Your quota is never spent on someone else's video.

## Language

The **interface** is Uzbek and English, starting in Uzbek unless the Telegram
client is set to English (`lib/i18n.ts`).

**Generated output is English only.** It used to be bilingual, with every
string carried twice behind a toggle — and that cost more than it bought.
Doubling every label halves the room a figure has, doubles the text a single
generation must produce, and constrains every layout decision to whichever
language runs longer. The reference builds are English, and matching their
quality meant matching that.

## The house style, and where it came from

Three AI Studio explainers built from unrelated papers -- quantum error
correction, SARS-CoV-2 genomics, paediatric cardiac surgery -- turned out to
share a byte-identical scaffold, and the only difference in their document head
was the `<title>`. Their quality comes from a fixed design system, not from
per-paper invention.

`lib/houseStyle.ts` encodes that system so every paper inherits it: Playfair
Display over Inter, the cream/ink/gold palette, `6rem` section rhythm, uppercase
eyebrows above headings, a gold rule beneath them, white figure cards, a drop
cap, a pull quote, metric tiles, author cards, and one inverted dark panel for
the technical centrepiece.

It deliberately does **not** follow the Telegram theme. A research explainer
should look like itself.

The other lever was their data layer. It holds every table row and every raw
record -- all sixteen patients with eighteen fields each -- and the components
compute from it. That is how a reported `r = 0.726` becomes a plot with a
draggable control rather than a sentence. Our `facts` contract now demands the
same: complete tables, per-record rows, statistics, procedure steps, authors.

## How an explainer site is built

A single generation has one output budget, and a whole site does not fit in it:
the hero, the 3D scene, every chart and all the prose end up competing for the
same ceiling. So the research path is written in parts — and the parts are
written at the same time.

**Phase 1, two calls at once.** One reads the paper and returns the verdict,
the plan, the summaries, the site identity and the section list. The other
reads it again and returns `facts` — the metadata, authors, real numbers and
full table rows every later visual is computed from. Together in one response
they were the slowest thing in the pipeline; apart they cost a second read and
halve the wait.

**Phase 2, four at once.** The shell and every section go into one pool. The
shell carries the head, the fixed header, the hero and the language machinery;
each section carries its own instrument. Sections used to wait for the shell so
they could reuse its CSS classes, but the styling is Tailwind now, so the class
vocabulary comes from the brief and nothing waits for anything else.

**Stitching.** Each section replaces its placeholder. A part that fails is
retried once, then skipped rather than losing the site; credits falls back to
markup built straight from the facts, since attribution is pure data.

Eight calls in series became three waves. Four concurrent rather than seven is
bounded by a free key's tokens-per-minute, not its request rate: every part
carries the plan and the facts as input.

## How generation works

1. **Video → screening + plan.** A Flash model watches the video, reports what
   it is (language, length, kind, audio quality), and writes the spec only if
   the video passes. A response schema keeps the JSON in shape.
2. **Plan → app.** The best model the key can reach streams a single
   self-contained HTML document. Streaming matters here: this step takes a
   minute or more, and on a phone visible progress is the difference between
   waiting and closing the app.

Model ids are never hardcoded. The app asks the key which models it may call
and picks the newest, because Google retires model names and a hardcoded one
becomes a 404 on a timer.

The result renders in a sandboxed iframe. Because that sandbox has no
same-origin access, the prompt forbids `localStorage` and cookies in both
modes — those throw and break the page.

Network access differs by mode. A learning app must be entirely inline: it is
small, and a CDN is a failure point it does not need. An explainer website may
load **three.js and nothing else**, from a pinned unpkg URL, since real 3D is
not worth hand-rolling in WebGL.

## What it does beyond generating

- **History.** Finished apps are kept in IndexedDB and reopen instantly, with
  no second generation and no second charge against the user's quota.
- **The plan fills the wait.** Screening returns a learner-facing summary in
  both languages before the app is written, so the minute of building is spent
  reading what is coming rather than watching a spinner.
- **Variations.** *Simpler*, *more visual*, *as a quiz* rebuild from the same
  plan, which costs one call rather than two since the source is never re-read.
- **Sharing.** A generated app cannot be hosted without a server, so the share
  link carries the source instead: the recipient opens the Mini App with it
  ready to build. Set `MINI_APP_PATH` in `lib/deeplink.ts` once BotFather has
  given you the link; until then sharing falls back to the bare source URL.
- **Telegram's own buttons.** MainButton drives the primary action and
  BackButton leaves the settings screen; both fall back to in-page controls
  outside Telegram.

## Develop

```bash
npm install
```

```bash
npm run dev
```

Everything works in a plain browser outside Telegram: the theme falls back to
its own palette, haptics become no-ops, and the key is kept in `localStorage`
instead of Telegram cloud storage.

```bash
npm run typecheck
```

## Deploy free, in three steps

**1. Push to GitHub.** Create a repo and push this folder.

**2. Turn on Pages.** Repo → Settings → Pages → Source: **GitHub Actions**. The
workflow in `.github/workflows/deploy.yml` builds and publishes on every push to
`main`. Your app lands at `https://<user>.github.io/<repo>/`.

**3. Register the Mini App with BotFather.**

- `/newbot` — create the bot and keep the token.
- `/newapp` — pick the bot, give it a title, description, a 640×360 image, and
  paste the Pages URL as the Web App URL.
- `/setmenubutton` — point the bot's menu button at the same URL so the app
  opens from any chat with the bot.

BotFather hands back a `t.me/<bot>/<app>` link. That link is the product.

## Layout

```
App.tsx                         screen layout, URL input, language toggle
components/ContentContainer.tsx  generation state machine and the two tabs
components/KeyGate.tsx           bring-your-own-key onboarding
components/Diagnostics.tsx       probes what the user's key can actually do
components/HistoryList.tsx       apps this device has already built
components/Illustrations.tsx     inline SVG for the empty and refused states
lib/history.ts                   IndexedDB store of finished generations
lib/deeplink.ts                  share links and startapp payloads
lib/prompts.ts                   both prompts — the product's behavior lives here
lib/screening.ts                 the guards, and what counts as an unusable source
lib/source.ts                    what a generation is built from: video, PDF, or link
lib/textGeneration.ts            model discovery, streaming, busy-model handling
lib/telegram.ts                  Mini App SDK wrapper with browser fallbacks
lib/i18n.ts                      interface strings, uz + en
```

## When a model is busy

Google returns "this model is currently experiencing high demand" on its
newest model far more often than on the one behind it — measured on a real
key, the newest returned 503 while the release directly behind it answered
immediately.

So the newest model is tried **last**, not first. Generation starts one
release back, walks the whole list in a single pass with no delay, and only
begins waiting once every model has refused. The newest stays pinned to the
end of the chain, since it is a poor first choice and a perfectly good last
one. Whichever model worked is remembered and tried first next time.

If something does fail, the settings screen has a **Run check** button that
probes the key directly and reports, per model, whether text and video
requests are accepted. That is far faster than guessing.
