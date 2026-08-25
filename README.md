# Video → Learning App

A Telegram Mini App that turns source material into an interactive learning
app. Gemini reads the source, writes a plan, then writes a single-file web app
from that plan — **in Uzbek and English, with a toggle built into the result**.

Two sections, one API key:

- **Video** — a YouTube lesson becomes an app that drills its key idea.
- **Research** — a paper becomes an interactive explainer of its mechanism,
  from an uploaded PDF or a link the model retrieves itself.

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

## Bilingual output

The interface ships in Uzbek and English (`lib/i18n.ts`), starting in Uzbek
unless the Telegram client is set to English.

The **generated apps** are bilingual too, which is enforced in
`buildSpecAddendum()` in [lib/prompts.ts](lib/prompts.ts). Every generated app
must:

- carry every user-facing string in both languages, authored up front in one
  `T = { uz: {...}, en: {...} }` object — no runtime translation service;
- expose an `OʻZ` / `EN` toggle that switches instantly without losing the
  learner's progress;
- use proper Latin-script Uzbek with `oʻ` / `gʻ` (U+02BB), never a plain
  apostrophe and never Cyrillic;
- give the English term in parentheses on first use for technical vocabulary;
- survive the length difference between the two languages without breaking
  layout.

## What the app refuses

Not every video makes a good lesson, and a confident learning app built on a
misheard one is worse for a student than being told no.

| Guard | Rule | Applies to |
|---|---|---|
| Length | over 30 minutes | video, checked in the browser before any Gemini call |
| Language | anything but English or Russian | both |
| Music | songs and performances | video |
| Audio | unclear speech, or none at all | video |
| Readability | only an abstract or paywall reachable | research |
| Kind | not a paper, preprint or thesis | research |
| Substance | nothing specific to practise | both |

Length is checked client-side with YouTube's iframe player, which needs no API
key — watching an hour of video is the most expensive request the app can make,
so refusing it afterwards would already have spent the user's quota. The model
also reports duration as a backstop, for live streams and any video whose
length the player cannot read.

The other guards ride along with the call that was already watching the video:
screening and spec-writing share one request, so a rejection costs no more than
it has to. Uzbek is excluded on purpose — Gemini understands it far less
reliably than English or Russian.

Rejections are presented as answers rather than errors: no red, no retry
button, and a sentence saying what to pick instead.

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
same-origin access, the prompt forbids `localStorage`, cookies and any network
request — those would throw and break the generated app.

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
lib/prompts.ts                   both prompts — the product's behavior lives here
lib/screening.ts                 the guards, and what counts as an unusable source
lib/source.ts                    what a generation is built from: video, PDF, or link
lib/textGeneration.ts            model discovery, streaming, busy-model handling
lib/telegram.ts                  Mini App SDK wrapper with browser fallbacks
lib/i18n.ts                      interface strings, uz + en
```

## When a model is busy

Google returns "this model is currently experiencing high demand" on its
newest model far more often than on the one behind it. The app tries every
model its key can see, in one quick pass with no delay, and only starts
waiting once all of them have refused. Whichever model worked is remembered
and tried first next time.

If something does fail, the settings screen has a **Run check** button that
probes the key directly and reports, per model, whether text and video
requests are accepted. That is far faster than guessing.
