# Video → Learning App

A Telegram Mini App that turns any YouTube video into an interactive learning
app. Gemini watches the video, writes a plan, then writes a single-file web app
from that plan — **in Uzbek and English, with a toggle built into the result**.

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

## How generation works

1. **Video → plan.** `gemini-2.5-flash` watches the video and returns a JSON
   spec, constrained by a response schema so it cannot drift out of shape.
2. **Plan → app.** `gemini-2.5-pro` streams a single self-contained HTML
   document. Streaming matters here: this step takes a minute or more, and on a
   phone visible progress is the difference between waiting and closing the app.
   If the key has no free quota left on Pro, it falls back to Flash
   automatically rather than dead-ending.

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
App.tsx                        screen layout, URL input, language toggle
components/ContentContainer.tsx generation state machine and the three tabs
components/KeyGate.tsx          bring-your-own-key onboarding
components/ExampleGallery.tsx   the pre-baked example videos
lib/prompts.ts                  both prompts — the product's behavior lives here
lib/textGeneration.ts           Gemini client: streaming, quota fallback, key check
lib/telegram.ts                 Mini App SDK wrapper with browser fallbacks
lib/i18n.ts                     interface strings, uz + en
```

## Known gap

The 12 videos in the example gallery ship with pre-baked English-only apps
inherited from the original sample, so tapping one shows an English app rather
than a bilingual one. They cost no quota and load instantly, which is why they
are still there. Regenerating them through the new bilingual prompt would fix
this at a one-time cost of 12 generations.
