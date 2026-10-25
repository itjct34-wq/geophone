import { useSyncExternalStore } from 'react';

// Lightweight i18n for the visitor-facing surfaces (consent page, landing).
// No dependency: a module-level store + localStorage, synced across components.
export type Lang = 'en' | 'ur';

const KEY = 'geophone_lang';

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'ur') return stored;
  } catch {
    /* storage blocked */
  }
  try {
    if (navigator.language?.toLowerCase().startsWith('ur')) return 'ur';
  } catch {
    /* no navigator */
  }
  return 'en';
}

let current: Lang = initialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked */
  }
  try {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  } catch {
    /* no document */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const en = {
  langName: 'اردو', // label on the toggle offering the OTHER language
  someone: 'Someone',
  // Consent header
  title: '{who} would like to see your location',
  subtitle: 'You choose exactly what to share, and you can stop at any time.',
  whatToShare: 'What to share',
  posTitle: 'My position',
  posDetail: 'Your phone asks permission first. It updates while this page stays open.',
  nameTitle: 'My name',
  nameDetail: 'Shown to the person who asked.',
  namePlaceholder: 'Type your name',
  deviceTitle: 'My browser and system',
  langTitle: 'My language and time zone',
  connTitle: 'My connection type',
  connUnknown: 'Not reported by this browser',
  // Sharing state
  sharingTitle: 'Your location is being shared',
  accuracy: 'Accuracy about {n} m. ',
  finding: 'Finding your position… ',
  lastSent: 'Last sent {time}.',
  stopSharing: 'Stop sharing',
  infoSentMsg: 'The details you chose were sent. Nothing else is being shared.',
  done: 'Done',
  // Primary button
  chooseWhat: 'Choose what to share',
  shareLocationBtn: 'Share my location',
  sendDetailsBtn: 'Send the selected details',
  disclaimer: 'Nothing is shared unless you tap the button above. This link stops working on its own after 24 hours.',
  terms: 'Terms',
  privacy: 'Privacy',
  // Report control
  reportOpen: 'Not expecting this? Report or opt out',
  reportPrompt: 'Report this request if you did not expect it.',
  reportPlaceholder: 'What happened? (optional)',
  reportBlockBtn: 'Report and opt my number out',
  reportJustBtn: 'Just report',
  thanks: 'Thank you. ',
  optedOut: 'Your number has been opted out, so this person cannot send it new links.',
  reportSent: 'Your report has been sent.',
  canClose: 'You can close this page.',
  // Non-active / stopped states
  endedTitle: 'This sharing link has ended.',
  expiredTitle: 'This sharing link has expired.',
  invalidTitle: 'This link is not valid.',
  nothingShared: 'Nothing is being shared. You can close this page.',
  stoppedTitle: 'Sharing stopped',
  stoppedBody: 'Nothing more is being sent. You can close this page.',
  // Errors
  loadError: 'Could not load this link.',
  errNoGeo: 'This browser cannot share a location.',
  errEnded: 'This link has ended or expired, so sharing stopped.',
  errSendPos: 'Could not send your position.',
  errDenied: 'Location permission was denied, so nothing was shared. You can allow it in your browser settings and try again.',
  errNoPos: 'Could not get your position. Check that location services are on.',
  errSendDetails: 'Could not send the details you chose.',
  errReport: 'Could not send your report.',
};

export type TKey = keyof typeof en;

const ur: Record<TKey, string> = {
  langName: 'English',
  someone: 'کسی',
  title: '{who} آپ کی لوکیشن دیکھنا چاہتے ہیں',
  subtitle: 'آپ خود طے کرتے ہیں کہ کیا شیئر کرنا ہے، اور کسی بھی وقت روک سکتے ہیں۔',
  whatToShare: 'کیا شیئر کرنا ہے',
  posTitle: 'میری لوکیشن',
  posDetail: 'آپ کا فون پہلے اجازت مانگے گا۔ یہ صفحہ کھلا رہنے تک لوکیشن اپ ڈیٹ ہوتی رہے گی۔',
  nameTitle: 'میرا نام',
  nameDetail: 'جس نے پوچھا اُسے دکھایا جائے گا۔',
  namePlaceholder: 'اپنا نام لکھیں',
  deviceTitle: 'میرا براؤزر اور سسٹم',
  langTitle: 'میری زبان اور ٹائم زون',
  connTitle: 'میرے کنکشن کی قسم',
  connUnknown: 'اس براؤزر نے نہیں بتایا',
  sharingTitle: 'آپ کی لوکیشن شیئر ہو رہی ہے',
  accuracy: 'تخمینی درستگی تقریباً {n} میٹر۔ ',
  finding: 'آپ کی لوکیشن تلاش کی جا رہی ہے… ',
  lastSent: 'آخری بار بھیجا گیا {time}۔',
  stopSharing: 'شیئر کرنا روکیں',
  infoSentMsg: 'آپ کی منتخب کردہ تفصیلات بھیج دی گئیں۔ اس کے علاوہ کچھ شیئر نہیں ہو رہا۔',
  done: 'مکمل',
  chooseWhat: 'منتخب کریں کہ کیا شیئر کرنا ہے',
  shareLocationBtn: 'میری لوکیشن شیئر کریں',
  sendDetailsBtn: 'منتخب تفصیلات بھیجیں',
  disclaimer: 'جب تک آپ اوپر دیا گیا بٹن نہیں دباتے، کچھ شیئر نہیں ہوتا۔ یہ لنک 24 گھنٹے بعد خود کام کرنا بند کر دیتا ہے۔',
  terms: 'شرائط',
  privacy: 'پرائیویسی',
  reportOpen: 'غیر متوقع پیغام؟ رپورٹ کریں یا آپٹ آؤٹ کریں',
  reportPrompt: 'اگر آپ کو اس کی توقع نہیں تھی تو اس درخواست کو رپورٹ کریں۔',
  reportPlaceholder: 'کیا ہوا؟ (اختیاری)',
  reportBlockBtn: 'رپورٹ کریں اور میرا نمبر آپٹ آؤٹ کریں',
  reportJustBtn: 'صرف رپورٹ کریں',
  thanks: 'شکریہ۔ ',
  optedOut: 'آپ کا نمبر آپٹ آؤٹ کر دیا گیا ہے، اس لیے یہ شخص اسے نئے لنک نہیں بھیج سکتا۔',
  reportSent: 'آپ کی رپورٹ بھیج دی گئی ہے۔',
  canClose: 'آپ یہ صفحہ بند کر سکتے ہیں۔',
  endedTitle: 'یہ شیئرنگ لنک ختم ہو چکا ہے۔',
  expiredTitle: 'اس شیئرنگ لنک کی میعاد ختم ہو چکی ہے۔',
  invalidTitle: 'یہ لنک درست نہیں ہے۔',
  nothingShared: 'کچھ شیئر نہیں ہو رہا۔ آپ یہ صفحہ بند کر سکتے ہیں۔',
  stoppedTitle: 'شیئرنگ روک دی گئی',
  stoppedBody: 'اب کچھ مزید نہیں بھیجا جا رہا۔ آپ یہ صفحہ بند کر سکتے ہیں۔',
  loadError: 'یہ لنک لوڈ نہیں ہو سکا۔',
  errNoGeo: 'یہ براؤزر لوکیشن شیئر نہیں کر سکتا۔',
  errEnded: 'یہ لنک ختم یا میعاد ختم ہو چکا ہے، اس لیے شیئرنگ رک گئی۔',
  errSendPos: 'آپ کی لوکیشن نہیں بھیجی جا سکی۔',
  errDenied: 'لوکیشن کی اجازت نہیں دی گئی، اس لیے کچھ شیئر نہیں ہوا۔ آپ براؤزر کی ترتیبات میں اجازت دے کر دوبارہ کوشش کر سکتے ہیں۔',
  errNoPos: 'آپ کی لوکیشن حاصل نہیں ہو سکی۔ یقینی بنائیں کہ لوکیشن سروسز آن ہیں۔',
  errSendDetails: 'آپ کی منتخب کردہ تفصیلات نہیں بھیجی جا سکیں۔',
  errReport: 'آپ کی رپورٹ نہیں بھیجی جا سکی۔',
};

const dicts: Record<Lang, Record<TKey, string>> = { en, ur };

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

export interface I18n {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

export function useI18n(): I18n {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return {
    lang,
    dir: lang === 'ur' ? 'rtl' : 'ltr',
    setLang,
    toggle: () => setLang(getLang() === 'ur' ? 'en' : 'ur'),
    t: (key, vars) => translate(lang, key, vars),
  };
}
