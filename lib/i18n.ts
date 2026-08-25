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
  contentPlaceholder: 'Your learning app will appear here',
  introStep1: 'Paste a link to a short YouTube lesson',
  introStep2: 'Gemini watches it and designs an app around its main idea',
  introStep3: 'Practise with it, in Uzbek or English',
  invalidUrl: 'That does not look like a YouTube link',
  checkingVideo: 'Checking the video...',

  rejectTitle: 'This video will not work',
  rejectTitlePaper: 'This publication will not work',
  paperFound: 'Found',
  rejectTooLong:
    'The video is longer than 30 minutes. Please pick a shorter one - 3 to 15 minutes works best.',
  rejectLanguage:
    'Only English and Russian videos are supported for now. This one sounds like {lang}.',
  rejectMusic:
    'This looks like a music video rather than a lesson. Pick something that explains or teaches an idea.',
  rejectNoisy:
    'The speech is too unclear to learn from. Pick a video with clean audio.',
  rejectNotEducational:
    'There is no specific idea here to build a lesson around. Pick a video that explains something.',
  rejectUnreadable:
    'Only an abstract or a paywall was reachable, so the full text could not be read. Try the publisher’s own article link instead of a DOI, or upload the PDF.',
  rejectNotResearch:
    'This does not look like a research publication. Try a paper, preprint, or thesis.',

  modeVideo: 'Video',
  modePaper: 'Research',
  paperLabel: 'Link to the publication',
  paperPlaceholder: 'https://doi.org/... or arxiv.org/...',
  paperOr: 'or',
  paperUpload: 'Choose a PDF',
  paperChosen: 'Selected',
  paperTooBig: 'That PDF is too large. The limit is 12 MB.',
  paperNeedInput: 'Add a link or choose a PDF first',
  hintPaywall:
    'This publisher often shows only an abstract. If it is not open access, upload the PDF instead.',
  hintAbstractOnly:
    'PubMed shows abstracts only. Use the PubMed Central full-text link, or upload the PDF.',
  hintBlocked:
    'This site blocks automated readers, so the paper cannot be fetched. Upload the PDF instead.',
  hintDoi:
    'A DOI leads to the publisher, so only the abstract may be readable. Upload the PDF if it is paywalled.',
  generatePaper: 'Build explainer',
  paperPlaceholderText: 'Your explainer will appear here',
  paperStep1: 'Paste a link to a paper, or upload its PDF',
  paperStep2: 'Gemini reads it and designs an interactive explainer',
  paperStep3: 'Explore the mechanism, in Uzbek or English',

  tabApp: 'App',
  tabSpec: 'About',
  tabPlan: 'Developer plan',
  aboutHeading: 'What you will learn',
  buildingNow: 'Building it now...',
  buildingPart: 'Writing part',
  loadingSite: 'Reading the paper and planning the site...',

  variationsTitle: 'Not quite right?',
  variationSimpler: 'Simpler',
  variationVisual: 'More visual',
  variationQuiz: 'As a quiz',

  save: 'Save as file',
  saved: 'Saved',
  savedCopied: 'Copied to clipboard instead',
  saveFailedMsg: 'Could not save the file',
  share: 'Share',
  shareText: 'I made an interactive learning app from this:',
  saveFailed: 'Could not save this to your history',

  historyTitle: 'Your apps',
  historyEmpty: 'Apps you build are kept here',
  historyOpen: 'Open',
  historyDelete: 'Delete',
  historyClear: 'Clear all',
  historyVideo: 'From a video',
  historyPaper: 'From a paper',

  loadingSpec: 'Watching the video and writing a plan...',
  loadingPaper: 'Reading the publication and writing a plan...',
  loadingCode: 'Building your app from the plan...',
  stillWorking: 'Still working - this takes a minute or two',

  error: 'Something went wrong',
  retry: 'Try again',
  quotaFallback: 'Free quota reached on the bigger model, retrying a faster one',
  busyRetry: 'Google is busy right now. Waiting, then trying again',
  switchingModel: 'That model is busy. Switching to another one',
  allBusy: 'All models are busy. Trying again in',
  quotaWait: 'Your key hit its per-minute limit. Waiting',
  quotaDaily:
    'Your key has used up today’s free quota on the larger models. It resets at midnight US Pacific time. Until then the app falls back to the lighter model, or you can add billing to your key.',
  seconds: 's',
  busyGaveUp:
    'Google is overloaded at the moment. This is temporary - wait a few minutes and press Try again.',

  edit: 'Edit',
  saveRegenerate: 'Save and rebuild',
  cancel: 'Cancel',
  copied: 'Copied',
  openFull: 'Open full screen',
  closeFull: 'Close',


  keyNeeded: 'One quick step first',
  keyTitle: 'Add your Gemini API key',
  trouble: 'Having trouble?',
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
  contentPlaceholder: 'Oʻquv ilovangiz shu yerda paydo boʻladi',
  introStep1: 'Qisqa YouTube darsiga havola joylashtiring',
  introStep2: 'Gemini uni koʻrib, asosiy gʻoya boʻyicha ilova loyihalaydi',
  introStep3: 'Oʻzbek yoki ingliz tilida mashq qiling',
  invalidUrl: 'Bu YouTube havolasiga oʻxshamaydi',
  checkingVideo: 'Video tekshirilmoqda...',

  rejectTitle: 'Bu video toʻgʻri kelmaydi',
  rejectTitlePaper: 'Bu nashr toʻgʻri kelmaydi',
  paperFound: 'Topildi',
  rejectTooLong:
    'Video 30 daqiqadan uzun. Iltimos, qisqaroqni tanlang - 3-15 daqiqa eng yaxshi natija beradi.',
  rejectLanguage:
    'Hozircha faqat ingliz va rus tilidagi videolar qoʻllab-quvvatlanadi. Bu video {lang} tilida koʻrinadi.',
  rejectMusic:
    'Bu darsdan koʻra musiqiy videoga oʻxshaydi. Biror gʻoyani tushuntiradigan video tanlang.',
  rejectNoisy:
    'Nutq juda noaniq, undan dars tayyorlab boʻlmaydi. Ovozi toza videoni tanlang.',
  rejectNotEducational:
    'Bu yerda dars quriladigan aniq gʻoya yoʻq. Biror narsani tushuntiradigan video tanlang.',
  rejectUnreadable:
    'Faqat annotatsiya yoki toʻlov devori ochildi, toʻliq matn oʻqilmadi. DOI oʻrniga nashriyotning maqola havolasini bering yoki PDF yuklang.',
  rejectNotResearch:
    'Bu ilmiy nashrga oʻxshamaydi. Maqola, preprint yoki dissertatsiya tanlang.',

  modeVideo: 'Video',
  modePaper: 'Maqola',
  paperLabel: 'Nashrga havola',
  paperPlaceholder: 'https://doi.org/... yoki arxiv.org/...',
  paperOr: 'yoki',
  paperUpload: 'PDF tanlash',
  paperChosen: 'Tanlandi',
  paperTooBig: 'Bu PDF juda katta. Chegara - 12 MB.',
  paperNeedInput: 'Avval havola qoʻshing yoki PDF tanlang',
  hintPaywall:
    'Bu nashriyot koʻpincha faqat annotatsiyani koʻrsatadi. Ochiq kirishda boʻlmasa, PDF yuklang.',
  hintAbstractOnly:
    'PubMed faqat annotatsiyani koʻrsatadi. PubMed Central toʻliq matn havolasidan foydalaning yoki PDF yuklang.',
  hintBlocked:
    'Bu sayt avtomatik oʻqishni bloklaydi, maqolani olib boʻlmaydi. PDF yuklang.',
  hintDoi:
    'DOI nashriyotga olib boradi, faqat annotatsiya oʻqilishi mumkin. Toʻlov devori boʻlsa, PDF yuklang.',
  generatePaper: 'Tushuntiruvchi yaratish',
  paperPlaceholderText: 'Tushuntiruvchingiz shu yerda paydo boʻladi',
  paperStep1: 'Maqolaga havola joylashtiring yoki uning PDF faylini yuklang',
  paperStep2: 'Gemini uni oʻqib, interaktiv tushuntiruvchi loyihalaydi',
  paperStep3: 'Mexanizmni oʻzbek yoki ingliz tilida oʻrganing',

  tabApp: 'Ilova',
  tabSpec: 'Haqida',
  tabPlan: 'Dasturchi rejasi',
  aboutHeading: 'Nimani oʻrganasiz',
  buildingNow: 'Hozir yasalmoqda...',
  buildingPart: 'Qism yozilmoqda:',
  loadingSite: 'Maqola oʻqilmoqda va sayt rejalashtirilmoqda...',

  variationsTitle: 'Toʻgʻri kelmadimi?',
  variationSimpler: 'Soddaroq',
  variationVisual: 'Koʻproq vizual',
  variationQuiz: 'Test koʻrinishida',

  save: 'Fayl qilib saqlash',
  saved: 'Saqlandi',
  savedCopied: 'Oʻrniga buferga nusxalandi',
  saveFailedMsg: 'Faylni saqlab boʻlmadi',
  share: 'Ulashish',
  shareText: 'Men shundan interaktiv oʻquv ilova yasadim:',
  saveFailed: 'Buni tarixga saqlab boʻlmadi',

  historyTitle: 'Ilovalaringiz',
  historyEmpty: 'Siz yasagan ilovalar shu yerda saqlanadi',
  historyOpen: 'Ochish',
  historyDelete: 'Oʻchirish',
  historyClear: 'Hammasini tozalash',
  historyVideo: 'Videodan',
  historyPaper: 'Maqoladan',

  loadingSpec: 'Video koʻrilmoqda va reja tuzilmoqda...',
  loadingPaper: 'Maqola oʻqilmoqda va reja tuzilmoqda...',
  loadingCode: 'Reja asosida ilova yasalmoqda...',
  stillWorking: 'Hali ishlanmoqda - bu bir-ikki daqiqa oladi',

  error: 'Nimadir xato ketdi',
  retry: 'Qayta urinish',
  quotaFallback:
    'Katta model limiti tugadi, tezroq model bilan qayta urinilmoqda',
  busyRetry: 'Google hozir band. Kutib, qayta urinilmoqda',
  switchingModel: 'Bu model band. Boshqasiga oʻtilmoqda',
  allBusy: 'Barcha modellar band. Qayta urinish:',
  quotaWait: 'Kalitingiz daqiqalik limitga yetdi. Kutilmoqda:',
  quotaDaily:
    'Kalitingiz bugungi bepul limitni katta modellarda tugatdi. Limit AQSh Tinch okeani vaqti bilan yarim tunda yangilanadi. Shu paytgacha ilova yengilroq modeldan foydalanadi yoki kalitingizga toʻlovni ulashingiz mumkin.',
  seconds: 's',
  busyGaveUp:
    'Google serverlari hozir juda band. Bu vaqtinchalik - bir necha daqiqa kutib, "Qayta urinish" tugmasini bosing.',

  edit: 'Tahrirlash',
  saveRegenerate: 'Saqlash va qayta yasash',
  cancel: 'Bekor qilish',
  copied: 'Nusxalandi',
  openFull: 'Toʻliq ekran',
  closeFull: 'Yopish',


  keyNeeded: 'Avval bitta qisqa qadam',
  keyTitle: 'Gemini API kalitingizni kiriting',
  trouble: 'Muammo bormi?',
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
