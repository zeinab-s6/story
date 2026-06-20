import { getAgeRange } from '../data/ageRules.js';
import { STORY_GOALS } from '../data/storyGoals.js';

function buildChildName(input) {
  return input.childName || 'دوست کوچولوی ما';
}

function buildStoryBase(input, overrides) {
  const childName = buildChildName(input);
  const ageRange = getAgeRange(input.age);
  const goalLabel = STORY_GOALS[input.goal].labelFa;

  return {
    title: overrides.title,
    ageRange,
    goal: input.goal,
    durationMinutes: input.durationMinutes,
    parentEffort: overrides.parentEffort || 'low',
    parentIntro: overrides.parentIntro(childName, input),
    storyText: overrides.storyText(childName, input),
    interactionPoints: overrides.interactionPoints(childName, input),
    calmingAction: overrides.calmingAction(childName, input),
    followUpQuestion: overrides.followUpQuestion(childName, input),
    safetyNote: overrides.safetyNote || `این قصه برای ${goalLabel} طراحی شده و کاملاً آرام و مناسب سن ${input.age} سالگی است.`,
  };
}

const TEMPLATES = {
  sleep: {
    title: 'ستاره‌های خواب‌آلود',
    parentEffort: 'low',
    parentIntro: (name) => `قبل از شروع، ${name} را در آغوش بگیرید و نفس عمیق بکشید.`,
    storyText: (name, input) =>
      `شب آرامی بود. ${name} و ${input.interest} کوچولو کنار هم نشسته بودند.\n` +
      `آسمان نرم و آبی بود. یک ستاره کوچک آرام آرام چشمک می‌زد.\n` +
      `«نفس عمیق...» ستاره گفت. ${name} هم نفس کشید. آرام... آرام...\n` +
      `باد ملایمی لالایی می‌خواند. ${input.interest} چشمانش را بست.\n` +
      `ستاره‌ها یکی یکی خاموش شدند. ${name} هم خوابید.`,
    interactionPoints: () => ['با هم نفس عمیق بکشید', 'آرام بگویید: شب بخیر ستاره‌ها'],
    calmingAction: () => 'دستتان را آرام روی قلب کودک بگذارید.',
    followUpQuestion: (name) => `${name} عزیز، کدام ستاره امشب بیشتر دوستت داشت؟`,
  },

  cleanup: {
    title: 'ماموریت قهرمانان مرتب',
    parentEffort: 'medium',
    parentIntro: (name) => `${name} امروز قهرمان ماموریت مرتب‌سازی است!`,
    storyText: (name, input) =>
      `${name} و ${input.interest} یک ماموریت ویژه داشتند: اتاق را مرتب کنند!\n` +
      `هر اسباب‌بازی جای مخصوص خودش را داشت. ${input.interest} می‌گفت: «بیا با هم بگذاریمش سر جاش!»\n` +
      `یکی یکی، آرام آرام، همه چیز سر جایش رفت.\n` +
      `اتاق برق زد! ${name} لبخند زد. ماموریت تمام شد!`,
    interactionPoints: () => ['یک اسباب‌بازی را با هم جمع کنید', 'بگویید: قهرمان مرتب!'],
    calmingAction: () => 'با هم یک آهنگ کوتاه مرتب‌سازی بخوانید.',
    followUpQuestion: (name) => `${name}، کدام اسباب‌بازی اول جایش را پیدا کرد؟`,
  },

  food: {
    title: 'کشف طعم‌های جدید',
    parentEffort: 'low',
    parentIntro: (name) => `${name} امروز یک کاوشگر طعم است!`,
    storyText: (name, input) =>
      `${name} و ${input.interest} دور میز نشسته بودند.\n` +
      `یک بشقاب رنگارنگ بود. ${input.interest} گفت: «بیا ببینیم این چه طعمی دارد!»\n` +
      `${name} با کنجکاوی نگاه کرد. یک تکه کوچک برداشت.\n` +
      `«مممم!» گفت. طعم جدیدی بود! ${input.interest} هم خندید.\n` +
      `کاوش ادامه داشت. هر لقمه یک ماجرای کوچک بود.`,
    interactionPoints: () => ['با هم بوی غذا را حس کنید', 'بگویید: چه طعم جالبی!'],
    calmingAction: () => 'بدون فشار، یک لقمه کوچک امتحان کنید.',
    followUpQuestion: (name) => `${name}، این طعم شبیه چه چیزی بود؟`,
  },

  calm: {
    title: 'جعبه آرامش',
    parentEffort: 'low',
    parentIntro: (name) => `وقتی ${name} ناراحت است، جعبه آرامش کمک می‌کند.`,
    storyText: (name, input) =>
      `${name} احساس سنگینی داشت. ${input.interest} یک جعبه کوچک آورد.\n` +
      `داخلش نرم بود. «بیا نفس بکشیم» گفت ${input.interest}.\n` +
      `یک... دو... سه... ${name} نفس کشید. احساس سبک‌تری کرد.\n` +
      `جعبه آرامش همیشه آنجاست. ${name} می‌داند که احساساتش مهم هستند.`,
    interactionPoints: () => ['با هم سه نفس عمیق بکشید', 'بگویید: احساساتم مهم است'],
    calmingAction: () => 'آغوش گرم و نفس عمیق با هم.',
    followUpQuestion: (name) => `${name} عزیز، الان چه احساسی داری؟`,
  },

  waiting: {
    title: 'بازی صبر کوچولو',
    parentEffort: 'low',
    parentIntro: (name) => `در انتظار، ${name} می‌تواند یک بازی کوچک بازی کند.`,
    storyText: (name, input) =>
      `${name} و ${input.interest} باید کمی صبر می‌کردند.\n` +
      `«بیا یک بازی بکنیم!» گفت ${input.interest}.\n` +
      `دهانشان را بستند. ساکت... ساکت... ${name} خندید!\n` +
      `بعد انگشتانشان را شمردند: یک، دو، سه...\n` +
      `صبر کردن با بازی راحت‌تر شد!`,
    interactionPoints: () => ['دهان را ببندید و بشمارید', 'انگشتان را یکی یکی بشمارید'],
    calmingAction: () => 'با هم آهسته بشمارید تا ۱۰.',
    followUpQuestion: (name) => `${name}، تا چند توانستی بشماری؟`,
  },

  'screen-free': {
    title: 'دنیای تخیل',
    parentEffort: 'medium',
    parentIntro: (name) => `${name} امروز بدون صفحه، دنیای تخیل را کشف می‌کند.`,
    storyText: (name, input) =>
      `${name} و ${input.interest} تصمیم گرفتند یک ماجرای واقعی بسازند.\n` +
      `«بیا یک قلعه از بالش بسازیم!» گفت ${input.interest}.\n` +
      `${name} بالش‌ها را چید. یک تونل ساختند. یک پل ساختند!\n` +
      `دنیای تخیلشان پر از رنگ و شادی بود. هیچ صفحه‌ای لازم نبود.`,
    interactionPoints: () => ['با بالش یک سازه بسازید', 'داستان خودتان را تعریف کنید'],
    calmingAction: () => 'با وسایل اطراف یک بازی تخیلی بسازید.',
    followUpQuestion: (name) => `${name}، قلعه‌ات چه شکلی بود؟`,
  },

  brushing: {
    title: 'ماجرای مسواک قهرمان',
    parentEffort: 'low',
    parentIntro: (name) => `${name} و مسواک قهرمان، آماده ماجرای امشب!`,
    storyText: (name, input) =>
      `${name} مسواک کوچکش را برداشت. ${input.interest} گفت: «وقت تمیز کردن دندان‌های قشنگ!»\n` +
      `بالا و پایین، چپ و راست. مسواک می‌رقصید!\n` +
      `دندان‌ها برق زدند. ${name} لبخند زد.\n` +
      `«آفرین قهرمان!» گفت ${input.interest}. دندان‌های سالم و شاد!`,
    interactionPoints: () => ['با هم مسواک بزنید', 'بگویید: دندان‌هایم برق می‌زنند!'],
    calmingAction: () => 'یک آهنگ کوتاه مسواک‌زدن بخوانید.',
    followUpQuestion: (name) => `${name}، کدام دندان اول تمیز شد؟`,
  },

  bath: {
    title: 'حمام حبابی',
    parentEffort: 'low',
    parentIntro: (name) => `وقت حمام گرم برای ${name} و دوستش!`,
    storyText: (name, input) =>
      `آب گرم و نرم بود. ${name} و ${input.interest} وارد حمام شدند.\n` +
      `حباب‌های کوچک روی آب رقصیدند. پلک پلک... پلک پلک...\n` +
      `${input.interest} صابون را گرفت. آرام آرام تمیز شدند.\n` +
      `آب تمیز، بدن تمیز، ${name} خوشحال!`,
    interactionPoints: () => ['حباب‌ها را بشمارید', 'بگویید: آب گرم و نرم است'],
    calmingAction: () => 'آب را آرام روی دست کودک بریزید.',
    followUpQuestion: (name) => `${name}، چند حباب دیدی؟`,
  },

  dressing: {
    title: 'لباس‌های رنگی',
    parentEffort: 'medium',
    parentIntro: (name) => `${name} امروز لباس‌های رنگی‌اش را انتخاب می‌کند.`,
    storyText: (name, input) =>
      `صبح شده بود. ${name} و ${input.interest} جلوی کمد ایستاده بودند.\n` +
      `«کدام لباس امروز؟» پرسید ${input.interest}.\n` +
      `${name} یک لباس رنگی انتخاب کرد. آستین اول، بعد آستین دوم.\n` +
      `دکمه‌ها یکی یکی بسته شدند. ${name} آماده ماجرای روز بود!`,
    interactionPoints: () => ['یک آستین را با هم بپوشانید', 'بگویید: من آماده‌ام!'],
    calmingAction: () => 'با هم یک لباس را انتخاب و بپوشید.',
    followUpQuestion: (name) => `${name}، امروز کدام رنگ را انتخاب کردی؟`,
  },
};

export function generateStoryWithMock(input) {
  const template = TEMPLATES[input.goal];
  if (!template) {
    throw new Error(`قالب mock برای هدف "${input.goal}" وجود ندارد.`);
  }

  return buildStoryBase(input, template);
}
