/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface strings for the app shell itself.
 *
 * Note: the *generated* learning apps carry their own built-in UZ/EN toggle
 * (see lib/prompts.ts) -- this file only covers the surrounding chrome.
 *
 * Uzbek uses the standard Latin orthography with U+02BB (oʻ, gʻ) rather than a
 * plain apostrophe, so the text renders correctly in every Telegram client.
 */

export type Lang = 'uz' | 'en';

export const LANGUAGES: {code: Lang; label: string}[] = [
  {code: 'uz', label: 'OʻZ'},
  {code: 'en', label: 'EN'},
];

const en = {
  subtitle: 'Turn any YouTube video into an interactive learning app',
  inputLabel: 'Paste a YouTube link',
  inputPlaceholder: 'https://www.youtube.com/watch?v=...',
  generate: 'Generate app',
  validating: 'Checking link...',
  generating: 'Generating...',
  regenerate: 'Generate again',
  videoPlaceholder: 'Your video appears here',
  contentPlaceholder: 'Paste a YouTube link or pick an example to begin',
  invalidUrl: 'That does not look like a YouTube link',

  tabApp: 'App',
  tabCode: 'Code',
  tabSpec: 'Plan',

  loadingSpec: 'Watching the video and writing a plan...',
  loadingCode: 'Building your app from the plan...',
  stillWorking: 'Still working - this takes a minute or two',

  error: 'Something went wrong',
  retry: 'Try again',
  quotaFallback: 'Free quota reached on the bigger model, retrying a faster one',
  busyRetry: 'Google is busy right now. Waiting, then trying again',
  switchingModel: 'That model is busy. Switching to another one',
  allBusy: 'All models are busy. Trying again in',
  busyGaveUp:
    'Google is overloaded at the moment. This is temporary - wait a few minutes and press Try again.',

  edit: 'Edit',
  saveRegenerate: 'Save and rebuild',
  cancel: 'Cancel',
  copyCode: 'Copy code',
  copied: 'Copied',
  openFull: 'Open full screen',
  closeFull: 'Close',
  codeHint: 'Edit the HTML and the App tab updates',


  keyTitle: 'Add your Gemini API key',
  keyIntro:
    'This app runs entirely on your device with no server, so it uses your own Google AI Studio key. The free tier is enough for everyday use.',
  keyStep1: 'Open Google AI Studio and create a key',
  keyStep2: 'Paste it below',
  keyGet: 'Get a free key',
  keyPlaceholder: 'AIza...',
  keySave: 'Save key',
  keyChecking: 'Checking key...',
  keyBad: 'That key was rejected. Check it and try again.',
  keyStored:
    'Your key is stored in your own Telegram cloud storage and is never sent anywhere except Google.',
  diagTitle: 'Check what your key can do',
  diagIntro:
    'Runs a few tiny test requests and shows exactly which models work, which are busy, and whether video input is allowed.',
  diagRun: 'Run check',
  diagRunning: 'Checking...',
  diagCopy: 'Copy result',
  keyChange: 'Change API key',
  keyRemove: 'Remove key',
  settings: 'Settings',
  back: 'Back',
  done: 'Done',
};

const uz: typeof en = {
  subtitle: 'Istalgan YouTube videosini interaktiv oʻquv ilovasiga aylantiring',
  inputLabel: 'YouTube havolasini joylashtiring',
  inputPlaceholder: 'https://www.youtube.com/watch?v=...',
  generate: 'Ilova yaratish',
  validating: 'Havola tekshirilmoqda...',
  generating: 'Yaratilmoqda...',
  regenerate: 'Qaytadan yaratish',
  videoPlaceholder: 'Video shu yerda koʻrinadi',
  contentPlaceholder:
    'Boshlash uchun YouTube havolasini joylashtiring yoki namunani tanlang',
  invalidUrl: 'Bu YouTube havolasiga oʻxshamaydi',

  tabApp: 'Ilova',
  tabCode: 'Kod',
  tabSpec: 'Reja',

  loadingSpec: 'Video koʻrilmoqda va reja tuzilmoqda...',
  loadingCode: 'Reja asosida ilova yasalmoqda...',
  stillWorking: 'Hali ishlanmoqda - bu bir-ikki daqiqa oladi',

  error: 'Nimadir xato ketdi',
  retry: 'Qayta urinish',
  quotaFallback:
    'Katta model limiti tugadi, tezroq model bilan qayta urinilmoqda',
  busyRetry: 'Google hozir band. Kutib, qayta urinilmoqda',
  switchingModel: 'Bu model band. Boshqasiga oʻtilmoqda',
  allBusy: 'Barcha modellar band. Qayta urinish:',
  busyGaveUp:
    'Google serverlari hozir juda band. Bu vaqtinchalik - bir necha daqiqa kutib, "Qayta urinish" tugmasini bosing.',

  edit: 'Tahrirlash',
  saveRegenerate: 'Saqlash va qayta yasash',
  cancel: 'Bekor qilish',
  copyCode: 'Kodni nusxalash',
  copied: 'Nusxalandi',
  openFull: 'Toʻliq ekran',
  closeFull: 'Yopish',
  codeHint: 'HTML ni tahrirlang, "Ilova" boʻlimi yangilanadi',


  keyTitle: 'Gemini API kalitingizni kiriting',
  keyIntro:
    'Bu ilova serversiz, faqat sizning qurilmangizda ishlaydi, shuning uchun oʻzingizning Google AI Studio kalitingizdan foydalanadi. Bepul limit kundalik foydalanish uchun yetarli.',
  keyStep1: 'Google AI Studio ni oching va kalit yarating',
  keyStep2: 'Kalitni quyiga joylashtiring',
  keyGet: 'Bepul kalit olish',
  keyPlaceholder: 'AIza...',
  keySave: 'Kalitni saqlash',
  keyChecking: 'Kalit tekshirilmoqda...',
  keyBad: 'Kalit qabul qilinmadi. Tekshirib, qayta urinib koʻring.',
  keyStored:
    'Kalitingiz oʻzingizning Telegram bulut xotirangizda saqlanadi va Google dan boshqa hech qayerga yuborilmaydi.',
  diagTitle: 'Kalitingiz nima qila olishini tekshirish',
  diagIntro:
    'Bir nechta kichik test soʻrovlari yuboradi va qaysi modellar ishlashini, qaysilari band ekanini va video kiritishga ruxsat borligini koʻrsatadi.',
  diagRun: 'Tekshirish',
  diagRunning: 'Tekshirilmoqda...',
  diagCopy: 'Natijani nusxalash',
  keyChange: 'Kalitni oʻzgartirish',
  keyRemove: 'Kalitni oʻchirish',
  settings: 'Sozlamalar',
  back: 'Orqaga',
  done: 'Tayyor',
};

export const strings: Record<Lang, typeof en> = {en, uz};

export type Strings = typeof en;

/**
 * Pick a starting language from the Telegram client.
 *
 * Only an explicitly English client starts in English -- many Uzbek users run
 * Telegram in Russian, and Uzbek serves them better than English does.
 */
export function detectLanguage(telegramCode?: string): Lang {
  return telegramCode?.toLowerCase().startsWith('en') ? 'en' : 'uz';
}
