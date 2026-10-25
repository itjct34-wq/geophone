import { useSyncExternalStore } from 'react';

// Lightweight i18n for the visitor-facing surfaces (consent page, landing, login,
// and the app chrome). No dependency: a module-level store + localStorage.
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

  // ---- Consent page ----
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
  sharingTitle: 'Your location is being shared',
  accuracy: 'Accuracy about {n} m. ',
  finding: 'Finding your position… ',
  lastSent: 'Last sent {time}.',
  stopSharing: 'Stop sharing',
  infoSentMsg: 'The details you chose were sent. Nothing else is being shared.',
  done: 'Done',
  chooseWhat: 'Choose what to share',
  shareLocationBtn: 'Share my location',
  sendDetailsBtn: 'Send the selected details',
  disclaimer: 'Nothing is shared unless you tap the button above. This link stops working on its own after 24 hours.',
  terms: 'Terms',
  privacy: 'Privacy',
  reportOpen: 'Not expecting this? Report or opt out',
  reportPrompt: 'Report this request if you did not expect it.',
  reportPlaceholder: 'What happened? (optional)',
  reportBlockBtn: 'Report and opt my number out',
  reportJustBtn: 'Just report',
  thanks: 'Thank you. ',
  optedOut: 'Your number has been opted out, so this person cannot send it new links.',
  reportSent: 'Your report has been sent.',
  canClose: 'You can close this page.',
  endedTitle: 'This sharing link has ended.',
  expiredTitle: 'This sharing link has expired.',
  invalidTitle: 'This link is not valid.',
  nothingShared: 'Nothing is being shared. You can close this page.',
  stoppedTitle: 'Sharing stopped',
  stoppedBody: 'Nothing more is being sent. You can close this page.',
  loadError: 'Could not load this link.',
  errNoGeo: 'This browser cannot share a location.',
  errEnded: 'This link has ended or expired, so sharing stopped.',
  errSendPos: 'Could not send your position.',
  errDenied: 'Location permission was denied, so nothing was shared. You can allow it in your browser settings and try again.',
  errNoPos: 'Could not get your position. Check that location services are on.',
  errSendDetails: 'Could not send the details you chose.',
  errReport: 'Could not send your report.',

  // ---- Shared chrome ----
  signIn: 'Sign in',
  signOut: 'Sign out',
  getStarted: 'Get started',

  // ---- Landing ----
  heroBadge: 'Consent-based by design',
  heroTitle: 'GeoPhone',
  heroSubtitle:
    'Phone intelligence and maps, done the honest way. Look up carrier, country and line type; explore IPs and networks; run open-source research — free, in your browser. When you need someone’s location, you ask and they agree. No covert tracking.',
  heroTryLookup: 'Try a free phone lookup',
  createFreeAccount: 'Create a free account',
  heroNote: 'No sign-up needed for the free tools. Your lookups stay on your device until you log in.',
  freeToolsTitle: 'Free tools',
  freeToolsSub: 'Use these right now — no account required.',
  toolLookupTitle: 'Phone number lookup',
  toolLookupBody: 'Check any number’s country, carrier, line type and whether it is valid — instantly, no sign-up needed.',
  toolIpTitle: 'IP & network lookup',
  toolIpBody: 'Resolve an IP address or hostname to its network, approximate region and provider.',
  toolOsintTitle: 'Username, email & image search',
  toolOsintBody: 'Open-source research links to find public profiles, breach exposure and matching images across the web.',
  toolHubTitle: 'Resource hub',
  toolHubBody: 'A curated set of trusted, public investigation and safety resources you can use right away.',
  cardTryNow: 'Try it now',
  cardSeeIncluded: 'See what’s included',
  badgeFree: 'Free',
  badgePaid: 'Paid',
  paidTitle: 'Paid features',
  paidSub: 'Consent-based location, the 3D globe and ongoing monitoring. Create an account and request access.',
  toolLiveTitle: 'Consent-based live location',
  toolLiveBody: 'Send a link; when the person agrees, see their live and last known position, cell towers and triangulation.',
  toolGlobeTitle: 'God Eye 3D globe',
  toolGlobeBody: 'A satellite globe that flies to the places you look up, with terrain, labels and orbit.',
  toolInvestTitle: 'Investigations & monitoring',
  toolInvestBody: 'Track public domain and IP records over time and get a clear history of what changed.',
  howTitle: 'How consent-based location works',
  how1t: 'You send a link',
  how1b: 'Create a request and share the link by WhatsApp, SMS, Telegram or email.',
  how2t: 'They see who’s asking',
  how2b: 'The person opens it, sees your name, and chooses exactly what to share.',
  how3t: 'You see it on the map',
  how3b: 'Their live and last known position appears — and they can stop at any time.',
  faqTitle: 'Frequently asked questions',
  faq1q: 'Is GeoPhone free to use?',
  faq1a: 'Yes. Phone number lookup, IP and network lookup, and the open-source research tools are free and work without an account. Live location, the 3D globe, investigations and campaign tools are part of paid access.',
  faq2q: 'Can I find someone’s location from their phone number?',
  faq2a: 'No, and that is by design. A phone number only reveals the country, carrier and line type — never a live position. To see where someone is, you send them a link; they open it, see who is asking, and choose to share. Nothing is collected without their consent.',
  faq3q: 'Do I need to install anything?',
  faq3a: 'No. GeoPhone runs in your browser on any phone or computer. Create a free account to save your lookup history and batch lists.',
  faq4q: 'Is it private and consent-based?',
  faq4a: 'Location sharing only ever works with the other person’s agreement, and they can stop at any time. Read the Terms and Privacy Policy for the full detail.',
  ctaTitle: 'Start with a free lookup',
  ctaBody: 'No card, no install. Try the free tools now, and create an account when you want history, batch lists or paid features.',
  ctaTryFree: 'Try it free',
  footerTagline: 'GeoPhone Intelligence · Maps © OpenStreetMap contributors',

  // ---- Login ----
  loginContinue: 'Sign in to continue',
  loginCreate: 'Create your account',
  loginSub: 'Access phone intelligence and map tools.',
  signupSub: 'Use your email and a password of 8+ characters.',
  emailPh: 'Email',
  passwordPh: 'Password',
  createAccountBtn: 'Create account',
  noAccount: 'No account? Create one',
  haveAccount: 'Already registered? Sign in',
  confirmEmail: 'Check your email to confirm your account, then sign in.',
  somethingWrong: 'Something went wrong.',
  backToGeo: 'Back to GeoPhone',
  byUsing: 'By using GeoPhone you agree to the',
  and: 'and',

  // ---- Navbar ----
  navLookup: 'Single Lookup',
  navLive: 'Live GPS & Towers',
  navBatch: 'Batch Analysis',
  navIp: 'IP & Network',
  navGodEye: 'God Eye',
  navHistory: 'History',
  navInvest: 'Investigations',
  navOsint: 'Username / Email / Image',
  navHub: 'Resource Hub',
  navCampaigns: 'Campaigns & SMS',
  navCustomers: 'Customers',
  navPlan: 'Plan',

  // ---- Plan ----
  planTitle: 'Your plan',
  planFree: 'Free',
  planPaid: 'Paid',
  planStatusAdmin: 'Admin: everything is unlocked.',
  planStatusPaidUntil: 'Paid access until {date}.',
  planStatusEnded: 'Your paid period has ended. Request access to renew it.',
  planStatusFree: 'You are on the free plan.',
  planGetTitle: 'Get paid access',
  planGetBody:
    'Send a request and the admin will put a payment link here. Pay it, tap I’ve paid, and the admin switches your access on once the payment is confirmed.',
  planConsentFooter:
    'Location features only work with a person’s agreement. They open your link, see who is asking, and choose what to share. Nothing is collected without their tap.',
  free1: 'Number lookup: carrier, country, line type and validity',
  free2: 'IP and network lookup',
  free3: 'Username, email and image open-source search',
  free4: 'Resource hub',
  free5: 'Lookup history and saved batch lists',
  paid1: 'Send consent links by WhatsApp, SMS, Telegram or email',
  paid2: 'Live and last known location of people who agree to share',
  paid3: 'Paste a location a person sent you',
  paid4: 'Cell tower map and triangulation',
  paid5: 'God Eye 3D satellite globe',
  paid6: 'Investigations and monitoring of public domain and IP records',
  paid7: 'Campaign short links and test SMS sending',

  // ---- Locked feature ----
  lockedSignInLine: 'Create a free account or sign in to request paid access.',
  lockedSignInBtn: 'Sign in to get access',
  lockedSeePlan: 'See the paid plan',
  lockedLiveTitle: 'Live GPS and towers are part of paid access',
  lockedLiveBody:
    'Send a consent link to see where a person is when they agree to share, with live updates and their last known position. Also includes the cell tower map and triangulation.',
  lockedGodEyeTitle: 'The God Eye globe is part of paid access',
  lockedGodEyeBody: 'A 3D satellite globe that flies to the places you look up, with terrain, labels and orbit.',
  lockedInvestTitle: 'Investigations and monitoring are part of paid access',
  lockedInvestBody: 'Track public domain and IP records over time and keep a clear history of what changed, with automatic rechecks.',
  lockedCampaignTitle: 'Campaigns and SMS are part of paid access',
  lockedCampaignBody: 'Create expiring short links and send them to your own verified numbers by SMS. Sending messages uses a paid provider.',

  // ---- Terms gate ----
  termsGateTitle: 'One step before you send location links',
  termsGateBody: 'Please read and accept the',
  termsGateBody2: 'They cover consent, what is kept, and for how long.',
  termsGateAgree: 'I agree to the Terms and Privacy Policy, and I will only ask people who agree to share their location.',
  termsGateBtn: 'Agree and continue',
  termsGateError: 'Could not save your agreement.',
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

  signIn: 'سائن اِن',
  signOut: 'سائن آؤٹ',
  getStarted: 'شروع کریں',

  heroBadge: 'رضامندی پر مبنی ڈیزائن',
  heroTitle: 'فون انٹیلی جنس اور نقشے — ایمانداری کے ساتھ',
  heroSubtitle:
    'کسی بھی فون نمبر کا کیریئر، ملک اور لائن ٹائپ دیکھیں، آئی پی اور نیٹ ورک کی جانچ کریں، اور اوپن سورس ریسرچ چلائیں — مفت، اپنے براؤزر میں۔ کسی کی لوکیشن چاہیے ہو تو آپ پوچھتے ہیں اور وہ رضامندی دیتے ہیں۔ کوئی خفیہ ٹریکنگ نہیں۔',
  heroTryLookup: 'مفت فون لک اپ آزمائیں',
  createFreeAccount: 'مفت اکاؤنٹ بنائیں',
  heroNote: 'مفت ٹولز کے لیے سائن اپ کی ضرورت نہیں۔ لاگ اِن کرنے تک آپ کے لک اپ آپ ہی کے ڈیوائس پر رہتے ہیں۔',
  freeToolsTitle: 'مفت ٹولز',
  freeToolsSub: 'ابھی استعمال کریں — اکاؤنٹ کی ضرورت نہیں۔',
  toolLookupTitle: 'فون نمبر لک اپ',
  toolLookupBody: 'کسی بھی نمبر کا ملک، کیریئر، لائن ٹائپ اور درستگی فوراً جانچیں — سائن اپ کے بغیر۔',
  toolIpTitle: 'آئی پی اور نیٹ ورک لک اپ',
  toolIpBody: 'کسی آئی پی ایڈریس یا ہوسٹ نیم کو اس کے نیٹ ورک، تخمینی علاقے اور فراہم کنندہ تک حل کریں۔',
  toolOsintTitle: 'یوزرنیم، ای میل اور تصویر کی تلاش',
  toolOsintBody: 'عوامی پروفائلز، ڈیٹا بریچ اور ملتی جلتی تصاویر تلاش کرنے کے لیے اوپن سورس ریسرچ لنکس۔',
  toolHubTitle: 'ریسورس ہب',
  toolHubBody: 'قابلِ اعتماد، عوامی تفتیش اور حفاظت کے وسائل کا منتخب مجموعہ جو آپ فوراً استعمال کر سکتے ہیں۔',
  cardTryNow: 'ابھی آزمائیں',
  cardSeeIncluded: 'دیکھیں کیا شامل ہے',
  badgeFree: 'مفت',
  badgePaid: 'ادائیگی',
  paidTitle: 'ادائیگی والی سہولیات',
  paidSub: 'رضامندی پر مبنی لوکیشن، تھری ڈی گلوب اور مسلسل مانیٹرنگ۔ اکاؤنٹ بنائیں اور رسائی کی درخواست دیں۔',
  toolLiveTitle: 'رضامندی سے لائیو لوکیشن',
  toolLiveBody: 'ایک لنک بھیجیں؛ جب وہ شخص رضامند ہو تو اس کی لائیو اور آخری معلوم لوکیشن، سیل ٹاورز اور ٹرائینگولیشن دیکھیں۔',
  toolGlobeTitle: 'گاڈ آئی تھری ڈی گلوب',
  toolGlobeBody: 'ایک سیٹلائٹ گلوب جو آپ کے تلاش کردہ مقامات کی طرف جاتا ہے — خطے، لیبلز اور مدار کے ساتھ۔',
  toolInvestTitle: 'تفتیش اور مانیٹرنگ',
  toolInvestBody: 'عوامی ڈومین اور آئی پی ریکارڈز کو وقت کے ساتھ ٹریک کریں اور تبدیلیوں کی واضح تاریخ حاصل کریں۔',
  howTitle: 'رضامندی سے لوکیشن کیسے کام کرتی ہے',
  how1t: 'آپ لنک بھیجتے ہیں',
  how1b: 'ایک درخواست بنائیں اور لنک واٹس ایپ، ایس ایم ایس، ٹیلیگرام یا ای میل سے بھیجیں۔',
  how2t: 'وہ دیکھتے ہیں کون پوچھ رہا ہے',
  how2b: 'وہ شخص اسے کھولتا ہے، آپ کا نام دیکھتا ہے، اور طے کرتا ہے کہ کیا شیئر کرنا ہے۔',
  how3t: 'آپ نقشے پر دیکھتے ہیں',
  how3b: 'اُن کی لائیو اور آخری معلوم لوکیشن ظاہر ہوتی ہے — اور وہ کسی بھی وقت روک سکتے ہیں۔',
  faqTitle: 'اکثر پوچھے گئے سوالات',
  faq1q: 'کیا GeoPhone مفت ہے؟',
  faq1a: 'جی ہاں۔ فون نمبر لک اپ، آئی پی اور نیٹ ورک لک اپ، اور اوپن سورس ریسرچ ٹولز مفت ہیں اور بغیر اکاؤنٹ کے کام کرتے ہیں۔ لائیو لوکیشن، تھری ڈی گلوب، تفتیش اور کمپین ٹولز ادائیگی والی رسائی کا حصہ ہیں۔',
  faq2q: 'کیا میں کسی کے فون نمبر سے اس کی لوکیشن معلوم کر سکتا ہوں؟',
  faq2a: 'نہیں، اور یہ جان بوجھ کر ایسا ہے۔ فون نمبر صرف ملک، کیریئر اور لائن ٹائپ بتاتا ہے — کبھی لائیو لوکیشن نہیں۔ کسی کی لوکیشن دیکھنے کے لیے آپ اسے لنک بھیجتے ہیں؛ وہ اسے کھولتا ہے، دیکھتا ہے کون پوچھ رہا ہے، اور شیئر کرنے کا انتخاب کرتا ہے۔ اس کی رضامندی کے بغیر کچھ حاصل نہیں ہوتا۔',
  faq3q: 'کیا مجھے کچھ انسٹال کرنا ہوگا؟',
  faq3a: 'نہیں۔ GeoPhone کسی بھی فون یا کمپیوٹر پر آپ کے براؤزر میں چلتا ہے۔ اپنی لک اپ ہسٹری اور بیچ لسٹس محفوظ کرنے کے لیے مفت اکاؤنٹ بنائیں۔',
  faq4q: 'کیا یہ نجی اور رضامندی پر مبنی ہے؟',
  faq4a: 'لوکیشن شیئرنگ ہمیشہ دوسرے شخص کی رضامندی سے ہی کام کرتی ہے، اور وہ کسی بھی وقت روک سکتے ہیں۔ مکمل تفصیل کے لیے شرائط اور پرائیویسی پالیسی پڑھیں۔',
  ctaTitle: 'ایک مفت لک اپ سے شروع کریں',
  ctaBody: 'نہ کارڈ، نہ انسٹال۔ ابھی مفت ٹولز آزمائیں، اور جب ہسٹری، بیچ لسٹس یا ادائیگی والی سہولیات چاہیں تو اکاؤنٹ بنائیں۔',
  ctaTryFree: 'مفت آزمائیں',
  footerTagline: 'GeoPhone Intelligence · نقشے © OpenStreetMap تعاون کنندگان',

  loginContinue: 'جاری رکھنے کے لیے سائن اِن کریں',
  loginCreate: 'اپنا اکاؤنٹ بنائیں',
  loginSub: 'فون انٹیلی جنس اور نقشہ ٹولز تک رسائی حاصل کریں۔',
  signupSub: 'اپنی ای میل اور کم از کم 8 حروف کا پاس ورڈ استعمال کریں۔',
  emailPh: 'ای میل',
  passwordPh: 'پاس ورڈ',
  createAccountBtn: 'اکاؤنٹ بنائیں',
  noAccount: 'اکاؤنٹ نہیں؟ بنائیں',
  haveAccount: 'پہلے سے رجسٹرڈ؟ سائن اِن',
  confirmEmail: 'اپنے اکاؤنٹ کی تصدیق کے لیے اپنی ای میل دیکھیں، پھر سائن اِن کریں۔',
  somethingWrong: 'کچھ غلط ہو گیا۔',
  backToGeo: 'GeoPhone پر واپس',
  byUsing: 'GeoPhone استعمال کر کے آپ اتفاق کرتے ہیں',
  and: 'اور',

  navLookup: 'واحد لک اپ',
  navLive: 'لائیو جی پی ایس اور ٹاورز',
  navBatch: 'بیچ تجزیہ',
  navIp: 'آئی پی اور نیٹ ورک',
  navGodEye: 'گاڈ آئی',
  navHistory: 'ہسٹری',
  navInvest: 'تفتیش',
  navOsint: 'یوزرنیم / ای میل / تصویر',
  navHub: 'ریسورس ہب',
  navCampaigns: 'کمپینز اور ایس ایم ایس',
  navCustomers: 'صارفین',
  navPlan: 'پلان',

  planTitle: 'آپ کا پلان',
  planFree: 'مفت',
  planPaid: 'ادائیگی',
  planStatusAdmin: 'ایڈمن: سب کچھ کھلا ہوا ہے۔',
  planStatusPaidUntil: 'ادائیگی والی رسائی {date} تک۔',
  planStatusEnded: 'آپ کی ادائیگی کی مدت ختم ہو گئی ہے۔ تجدید کے لیے رسائی کی درخواست دیں۔',
  planStatusFree: 'آپ مفت پلان پر ہیں۔',
  planGetTitle: 'ادائیگی والی رسائی حاصل کریں',
  planGetBody:
    'درخواست بھیجیں اور ایڈمن یہاں ادائیگی کا لنک لگا دے گا۔ اسے ادا کریں، "میں نے ادا کر دیا" دبائیں، اور ادائیگی کی تصدیق ہوتے ہی ایڈمن آپ کی رسائی آن کر دے گا۔',
  planConsentFooter:
    'لوکیشن کی سہولیات صرف کسی شخص کی رضامندی سے کام کرتی ہیں۔ وہ آپ کا لنک کھولتے ہیں، دیکھتے ہیں کون پوچھ رہا ہے، اور منتخب کرتے ہیں کہ کیا شیئر کرنا ہے۔ ان کے دبائے بغیر کچھ حاصل نہیں ہوتا۔',
  free1: 'نمبر لک اپ: کیریئر، ملک، لائن ٹائپ اور درستگی',
  free2: 'آئی پی اور نیٹ ورک لک اپ',
  free3: 'یوزرنیم، ای میل اور تصویر کی اوپن سورس تلاش',
  free4: 'ریسورس ہب',
  free5: 'لک اپ ہسٹری اور محفوظ بیچ لسٹس',
  paid1: 'واٹس ایپ، ایس ایم ایس، ٹیلیگرام یا ای میل سے رضامندی کے لنک بھیجیں',
  paid2: 'شیئر کرنے پر رضامند افراد کی لائیو اور آخری معلوم لوکیشن',
  paid3: 'کسی کی بھیجی ہوئی لوکیشن پیسٹ کریں',
  paid4: 'سیل ٹاور نقشہ اور ٹرائینگولیشن',
  paid5: 'گاڈ آئی تھری ڈی سیٹلائٹ گلوب',
  paid6: 'عوامی ڈومین اور آئی پی ریکارڈز کی تفتیش اور مانیٹرنگ',
  paid7: 'کمپین شارٹ لنکس اور ٹیسٹ ایس ایم ایس بھیجنا',

  lockedSignInLine: 'ادائیگی والی رسائی کی درخواست کے لیے مفت اکاؤنٹ بنائیں یا سائن اِن کریں۔',
  lockedSignInBtn: 'رسائی کے لیے سائن اِن کریں',
  lockedSeePlan: 'ادائیگی والا پلان دیکھیں',
  lockedLiveTitle: 'لائیو جی پی ایس اور ٹاورز ادائیگی والی رسائی کا حصہ ہیں',
  lockedLiveBody:
    'رضامندی کا لنک بھیجیں تاکہ جب کوئی شخص شیئر کرنے پر رضامند ہو تو اس کی لائیو اپ ڈیٹس اور آخری معلوم لوکیشن دیکھ سکیں۔ اس میں سیل ٹاور نقشہ اور ٹرائینگولیشن بھی شامل ہے۔',
  lockedGodEyeTitle: 'گاڈ آئی گلوب ادائیگی والی رسائی کا حصہ ہے',
  lockedGodEyeBody: 'ایک تھری ڈی سیٹلائٹ گلوب جو آپ کے تلاش کردہ مقامات کی طرف جاتا ہے — خطے، لیبلز اور مدار کے ساتھ۔',
  lockedInvestTitle: 'تفتیش اور مانیٹرنگ ادائیگی والی رسائی کا حصہ ہیں',
  lockedInvestBody: 'عوامی ڈومین اور آئی پی ریکارڈز کو وقت کے ساتھ ٹریک کریں اور خودکار دوبارہ جانچ کے ساتھ تبدیلیوں کی واضح تاریخ رکھیں۔',
  lockedCampaignTitle: 'کمپینز اور ایس ایم ایس ادائیگی والی رسائی کا حصہ ہیں',
  lockedCampaignBody: 'میعادی شارٹ لنکس بنائیں اور انہیں اپنے تصدیق شدہ نمبروں پر ایس ایم ایس سے بھیجیں۔ پیغام بھیجنے کے لیے ادائیگی والا فراہم کنندہ استعمال ہوتا ہے۔',

  termsGateTitle: 'لوکیشن لنک بھیجنے سے پہلے ایک قدم',
  termsGateBody: 'براہ کرم پڑھیں اور قبول کریں',
  termsGateBody2: 'یہ رضامندی، کیا محفوظ رہتا ہے، اور کتنی دیر کے لیے — سب کا احاطہ کرتے ہیں۔',
  termsGateAgree: 'میں شرائط اور پرائیویسی پالیسی سے اتفاق کرتا ہوں، اور صرف اُنہی لوگوں سے پوچھوں گا جو اپنی لوکیشن شیئر کرنے پر رضامند ہوں۔',
  termsGateBtn: 'اتفاق کریں اور جاری رکھیں',
  termsGateError: 'آپ کی رضامندی محفوظ نہیں ہو سکی۔',
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
