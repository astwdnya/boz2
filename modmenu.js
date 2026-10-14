// ========================================================
// BO1 Zombies - Ultimate Mod Menu (Devils Hack)
// ========================================================

import { CoopSoldier3D, projectToGameRect } from './coop3d.js';

const WEAPONS_DB = [
  // --- Wonder Weapons ---
  { id: 'ray_gun_zm', name: 'Ray Gun', pap: 'Porter\'s X2 Ray Gun', cat: 'wonder', type: 'raygun', img: 'Ray Gun.png', desc: 'سلاح پرتو لیزری نمادین زامبی با شلیک ماده تاریک' },
  { id: 'ray_gun_upgraded_zm', name: 'Porter\'s X2 Ray Gun', pap: 'ارتقا یافته (تیر قرمز)', cat: 'pap', type: 'raygun', img: 'Ray Gun.png', desc: 'ری‌گان ارتقا یافته با آسیب دوچندان و لیزر قرمز' },
  { id: 'thundergun_zm', name: 'Thundergun', pap: 'Zeus Cannon', cat: 'wonder', type: 'thunder', img: 'Thundergun.png', desc: 'پرتاب موج انفجاری بادی و پرتاب ده‌ها زامبی به هوا' },
  { id: 'thundergun_upgraded_zm', name: 'Zeus Cannon', pap: 'ارتقا یافته (تندرگان)', cat: 'pap', type: 'thunder', img: 'Thundergun.png', desc: 'زئوس کنون با ظرفیت خشاب ۲ برابر و برد نابودکننده' },
  { id: 'freezegun_zm', name: "Winter's Howl", pap: "Winter's Fury", cat: 'wonder', type: 'freezegun', img: "Winter's Howl.png", desc: 'فریز کننده و منجمد کردن فوری زامبی‌ها به یخ' },
  { id: 'freezegun_upgraded_zm', name: "Winter's Fury", pap: 'ارتقا یافته (خشم زمستان)', cat: 'pap', type: 'freezegun', img: "Winter's Howl.png", desc: 'انجماد سراسری و شکستن آنی زامبی‌ها' },
  { id: 'minigun_zm', name: 'Death Machine', pap: 'مینی‌گان نابودگر', cat: 'wonder', type: 'minigun', img: 'Death Machine.png', desc: 'شلیک رگباری فوق سریع بدون کاهش تیر' },
  { id: 'tesla_gun_zm', name: 'Wunderwaffe DG-2', pap: 'Wunderwaffe DG-3 JZ', cat: 'wonder', type: 'wonder', img: 'Wunderwaffe DG-2.png', desc: 'شلیک جریان صاعقه زنجیره‌ای ۲۰۰ هزار ولتی بین زامبی‌ها' },
  { id: 'tesla_gun_upgraded_zm', name: 'Wunderwaffe DG-3 JZ', pap: 'ارتقا یافته (واندِروَفه)', cat: 'pap', type: 'wonder', img: 'Wunderwaffe DG-2.png', desc: 'کشتن زنجیره‌ای ۲۴ زامبی در کسری از ثانیه' },
  { id: 'sniper_explosive_zm', name: 'Scavenger', pap: 'Hyena Infra-Dead', cat: 'wonder', type: 'sniper', img: 'Scavenger.png', desc: 'اسنایپر با گلوله‌های مینی‌نوک انفجاری قدرتمند' },
  { id: 'sniper_explosive_upgraded_zm', name: 'Hyena Infra-Dead', pap: 'ارتقا یافته (اسکاونجر)', cat: 'pap', type: 'sniper', img: 'Scavenger.png', desc: 'دوربین دید در شب مادون قرمز و انفجار ویرانگر' },
  { id: 'humangun_zm', name: 'V-R11', pap: 'V-R11 Lazarus', cat: 'wonder', type: 'wonder', img: 'V-R11.png', desc: 'تبدیل زامبی‌ها به انسان و طعمه انحرافی زامبی‌های دیگر' },
  { id: 'humangun_upgraded_zm', name: 'V-R11 Lazarus', pap: 'ارتقا یافته (وی-آر۱۱)', cat: 'pap', type: 'wonder', img: 'V-R11.png', desc: 'افزایش مدت اثر انسان‌سازی و جان بی‌نهایت موقت' },
  { id: 'shrink_ray_zm', name: '31-79 JGb215 (Baby Gun)', pap: 'The Fractilizer', cat: 'wonder', type: 'wonder', img: '31-79 JGb215.png', desc: 'کوچک‌کننده زامبی‌ها به اندازه اسباب‌بازی و له کردن آن‌ها' },
  { id: 'shrink_ray_upgraded_zm', name: 'The Fractilizer', pap: 'ارتقا یافته (بیبی گان)', cat: 'pap', type: 'wonder', img: '31-79 JGb215.png', desc: 'کوچک‌سازی ده‌ها زامبی همزمان با زمان اثر طولانی' },
  { id: 'microwavegundw_zm', name: 'Wave Gun', pap: 'Max Wave Gun', cat: 'wonder', type: 'wonder', img: 'Wave Gun.png', desc: 'دو سلاح تپانچه‌ای مجزا یا تفنگ مایکروویو ترکیبی' },
  { id: 'microwavegundw_upgraded_zm', name: 'Max Wave Gun', pap: 'ارتقا یافته (ویو گان)', cat: 'pap', type: 'wonder', img: 'Wave Gun.png', desc: 'انفجار و باد کردن زامبی‌ها تا متلاشی شدن در هوا' },
  { id: 'cymbal_monkey_zm', name: 'Monkey Bomb', pap: 'Cymbal Monkey', cat: 'wonder', type: 'special', img: 'Monkey Bomb.png', desc: 'جذب تمام زامبی‌های مپ و انفجار مهیب' },

  // --- Assault Rifles ---
  { id: 'commando_zm', name: 'Commando', pap: 'Predator', cat: 'rifle', type: 'rifle', img: 'Commando.png', desc: 'تفنگ هجومی دقیق و محبوب با دمیج بالا' },
  { id: 'commando_upgraded_zm', name: 'Predator (Commando)', pap: 'ارتقا یافته (پرداتور)', cat: 'pap', type: 'rifle', img: 'Commando.png', desc: 'خشاب پرظرفیت و شلیک سریع لیزری' },
  { id: 'galil_zm', name: 'Galil', pap: 'Lamentation', cat: 'rifle', type: 'rifle', img: 'Galil.png', desc: 'تفنگ قدرتمند گالیل با خشاب ۳۵ تیر' },
  { id: 'galil_upgraded_zm', name: 'Lamentation (Galil)', pap: 'ارتقا یافته (لمنتیشن)', cat: 'pap', type: 'rifle', img: 'Galil.png', desc: 'خشاب ۶۰ تیری با دوربین اپتیکال رددات' },
  { id: 'famas_zm', name: 'Famas', pap: 'G-115 Compressor', cat: 'rifle', type: 'rifle', img: 'FAMAS.png', desc: 'بولپاپ فرانسوی با بالاترین نواخت تیر در رایفل‌ها' },
  { id: 'famas_upgraded_zm', name: 'G-115 Compressor', pap: 'ارتقا یافته (فاماس)', cat: 'pap', type: 'rifle', img: 'FAMAS.png', desc: 'نواخت تیر فوق‌العاده با تیر تقویت‌شده ۱۱۵' },
  { id: 'aug_acog_zm', name: 'AUG ACOG', pap: 'AUG-50M3', cat: 'rifle', type: 'rifle', img: 'AUG.png', desc: 'مجهز به دوربین ACOG با دقت شلیک بالا' },
  { id: 'aug_upgraded_zm', name: 'AUG-50M3', pap: 'ارتقا یافته (+ شات‌گان زیرلوله)', cat: 'pap', type: 'rifle', img: 'AUG.png', desc: 'دارای شات‌گان کمکی زیر لوله' },
  { id: 'm16_zm', name: 'M16', pap: 'Skullpiercer', cat: 'rifle', type: 'rifle', img: 'M16.png', desc: 'شلیک سه‌تیر رگباری (Burst) با دقت عالی' },
  { id: 'm16_upgraded_zm', name: 'Skullpiercer (M16)', pap: 'ارتقا یافته (+ نارنجک‌انداز)', cat: 'pap', type: 'rifle', img: 'M16.png', desc: 'تمام اتوماتیک به همراه نارنجک‌انداز زیر لوله' },
  { id: 'fnfal_zm', name: 'FN FAL', pap: 'EPC WN', cat: 'rifle', type: 'rifle', img: 'FN FAL.png', desc: 'تک‌تیر نیمه‌خودکار با قدرت نفوذ بالا' },
  { id: 'fnfal_upgraded_zm', name: 'EPC WN (FN FAL)', pap: 'ارتقا یافته', cat: 'pap', type: 'rifle', img: 'FN FAL.png', desc: 'شلیک ۳ تیر همزمان و قدرت انفجاری' },
  { id: 'ak47_zm', name: 'AK47', pap: 'Red Beast', cat: 'rifle', type: 'rifle', img: 'AK-47.png', desc: 'کلاشینکف کلاسیک با دمیج بی‌رقیب' },
  { id: 'ak47_upgraded_zm', name: 'Red Beast (AK47)', pap: 'ارتقا یافته', cat: 'pap', type: 'rifle', img: 'AK-47.png', desc: 'کلاشینکف تقویت‌شده با خشاب دوبل' },
  { id: 'g11_lps_zm', name: 'G11 Low Power Scope', pap: 'G115 Generator', cat: 'rifle', type: 'rifle', img: 'G11.png', desc: 'تفنگ بدون پوکه آلمانی با دوربین اسکوپ' },
  { id: 'g11_upgraded_zm', name: 'G115 Generator', pap: 'ارتقا یافته (G11)', cat: 'pap', type: 'rifle', img: 'G11.png', desc: 'تمام اتوماتیک و شلیک سریع گلوله‌های ۱۱۵' },
  { id: 'm14_zm', name: 'M14', pap: 'Mnesia', cat: 'rifle', type: 'rifle', img: 'M14.png', desc: 'رایفل دیواری مپ با دقت تک‌تیر' },
  { id: 'm14_upgraded_zm', name: 'Mnesia (M14)', pap: 'ارتقا یافته', cat: 'pap', type: 'rifle', img: 'M14.png', desc: 'دارای گریپ و خشاب پرظرفیت' },

  // --- Submachine Guns (SMG) ---
  { id: 'ak74u_zm', name: 'AK74u', pap: 'AK74fu2', cat: 'smg', type: 'smg', img: 'AK74u.png', desc: 'محبوب‌ترین اسلحه دیواری زامبی بلک آپس' },
  { id: 'ak74u_upgraded_zm', name: 'AK74fu2', pap: 'ارتقا یافته (AK74u)', cat: 'pap', type: 'smg', img: 'AK74u.png', desc: 'خشاب ۴۰ تیر و سرعت جابه‌جایی بالا' },
  { id: 'mp40_zm', name: 'MP40', pap: 'The Afterburner', cat: 'smg', type: 'smg', img: 'MP40.png', desc: 'مسلسل خاطره‌انگیز جنگ جهانی دوم در ناخت' },
  { id: 'mp40_upgraded_zm', name: 'The Afterburner (MP40)', pap: 'Pack-a-Punch', cat: 'pap', type: 'smg', img: 'MP40 (The Afterburner).png', desc: 'خشاب ۶۴ تیری و نرخ آتش ارتقایافته' },
  { id: 'mp5k_zm', name: 'MP5K', pap: 'MP115 Kollider', cat: 'smg', type: 'smg', img: 'MP5K.png', desc: 'مسلسل سبک و ارگونومیک با ریلود سریع' },
  { id: 'mp5k_upgraded_zm', name: 'MP115 Kollider', pap: 'ارتقا یافته (MP5K)', cat: 'pap', type: 'smg', img: 'MP5K.png', desc: 'نواخت تیر ویرانگر و خشاب بزرگ' },
  { id: 'mpl_zm', name: 'MPL', pap: 'MPL-LF', cat: 'smg', type: 'smg', img: 'MPL.png', desc: 'مسلسل دیواری با دوربین رددات داخلی' },
  { id: 'mpl_upgraded_zm', name: 'MPL-LF', pap: 'ارتقا یافته (MPL)', cat: 'pap', type: 'smg', img: 'MPL.png', desc: 'ظرفیت خشاب ارتقایافته' },
  { id: 'pm63_zm', name: 'PM63', pap: 'Tokyo & Rose', cat: 'smg', type: 'smg', img: 'PM63.png', desc: 'مسلسل تک‌دست لهستانی' },
  { id: 'pm63_upgraded_zm', name: 'Tokyo & Rose (Dual PM63)', pap: 'ارتقا یافته (دوتایی دوقلو)', cat: 'pap', type: 'smg', img: 'PM63.png', desc: 'دو اسلحه در هر دو دست (Akimbo Dual Wield)' },
  { id: 'spectre_zm', name: 'Spectre', pap: 'Phantom', cat: 'smg', type: 'smg', img: 'Spectre.png', desc: 'مسلسل مدرن فشرده با هندلینگ بالا' },
  { id: 'spectre_upgraded_zm', name: 'Phantom (Spectre)', pap: 'ارتقا یافته', cat: 'pap', type: 'smg', img: 'Spectre.png', desc: 'سرعت تیراندازی رعدآسا' },

  // --- Light Machine Guns (LMG) ---
  { id: 'rpk_zm', name: 'RPK', pap: 'Rave Pounding Krew', cat: 'lmg', type: 'lmg', img: 'RPK.png', desc: 'تیربار سنگین روسی با خشاب کاسه‌ای ۱۰۰ تایی' },
  { id: 'rpk_upgraded_zm', name: 'Rave Pounding Krew', pap: 'ارتقا یافته (RPK)', cat: 'pap', type: 'lmg', img: 'RPK.png', desc: 'خشاب ۱۲۵ تیری با دمیج کشنده در راندهای بالا' },
  { id: 'hk21_zm', name: 'HK21', pap: 'H115 Oscillator', cat: 'lmg', type: 'lmg', img: 'HK21.png', desc: 'تیربار آلمانی با برد بسیار زیاد' },
  { id: 'hk21_upgraded_zm', name: 'H115 Oscillator', pap: 'ارتقا یافته (HK21)', cat: 'pap', type: 'lmg', img: 'HK21.png', desc: 'خشاب ۱۵۰ تیر با صدای پرصلابت' },
  { id: 'm60_zm', name: 'M60', pap: 'Slow Death', cat: 'lmg', type: 'lmg', img: 'M60.png', desc: 'تیربار سنگین ویتنام با قدرت آتش کوبنده' },
  { id: 'm60_upgraded_zm', name: 'Slow Death (M60)', pap: 'ارتقا یافته (مرگ تدریجی)', cat: 'pap', type: 'lmg', img: 'M60.png', desc: 'خشاب ۱۵۰ تایی با دمیج نفوذی مرگبار' },

  // --- Shotguns ---
  { id: 'rottweil72_zm', name: 'Olympia', pap: 'Hades', cat: 'shotgun', type: 'shotgun', img: 'Olympia.png', desc: 'شات‌گان دیواری دولول شروع بازی در ناخت با پخش ساچمه متمرکز' },
  { id: 'rottweil72_upgraded_zm', name: 'Hades (Olympia)', pap: 'ارتقا یافته (هیدیز)', cat: 'pap', type: 'shotgun', img: 'Olympia.png', desc: 'پرتاب تیرهای آتشین سوزان و ساچمه‌های شعله‌ور' },
  { id: 'spas_zm', name: 'SPAS-12', pap: 'SPA-AZ24', cat: 'shotgun', type: 'shotgun', img: 'SPAS-12.png', desc: 'شات‌گان معروف ایتالیایی با پخش ساچمه متراکم' },
  { id: 'spas_upgraded_zm', name: 'SPA-AZ24 (SPAS-12)', pap: 'ارتقا یافته (تمام اتوماتیک)', cat: 'pap', type: 'shotgun', img: 'SPAS-12.png', desc: 'شات‌گان تمام خودکار و خشاب ۲۴ تیر ریلود یکجا' },
  { id: 'hs10_zm', name: 'HS10', pap: 'Typhoid & Mary', cat: 'shotgun', type: 'shotgun', img: 'HS-10.png', desc: 'شات‌گان نیمه‌خودکار تک‌دست' },
  { id: 'hs10_upgraded_zm', name: 'Typhoid & Mary (Dual HS10)', pap: 'ارتقا یافته (دوتایی دوقلو)', cat: 'pap', type: 'shotgun', img: 'HS-10.png', desc: 'دو شات‌گان قدرتمند در هر دو دست (Dual Wield)' },
  { id: 'ithaca_zm', name: 'Stakeout (Ithaca)', pap: 'Raid', cat: 'shotgun', type: 'shotgun', img: 'Stakeout.png', desc: 'شات‌گان دیواری پمپی با دمیج هدشات سنگین' },
  { id: 'ithaca_upgraded_zm', name: 'Raid (Stakeout)', pap: 'ارتقا یافته', cat: 'pap', type: 'shotgun', img: 'Stakeout.png', desc: 'ریلود دوتایی فشنگ و شلیک همزمان' },

  // --- Sniper Rifles ---
  { id: 'l96a1_zm', name: 'L96A1', pap: 'L115 Isolator', cat: 'sniper', type: 'sniper', img: 'L96A1.png', desc: 'تک‌تیرانداز بولت‌اکشن با قدرت نفوذ از چند زامبی' },
  { id: 'l96a1_upgraded_zm', name: 'L115 Isolator', pap: 'ارتقا یافته (L96A1)', cat: 'pap', type: 'sniper', img: 'L96A1.png', desc: 'یک تیر به هر کجای بدن = مرگ قطعی' },
  { id: 'dragunov_zm', name: 'Dragunov', pap: 'D3K-Destroyer', cat: 'sniper', type: 'sniper', img: 'Dragunov.png', desc: 'اسنایپر نیمه‌خودکار معروف دراگونوف' },
  { id: 'dragunov_upgraded_zm', name: 'D3K-Destroyer', pap: 'ارتقا یافته', cat: 'pap', type: 'sniper', img: 'Dragunov.png', desc: 'دوربین بدون لگد و هدشات چندتایی' },

  // --- Pistols & Specials ---
  { id: 'm1911_zm', name: 'M1911 Colt', pap: 'Mustang & Sally', cat: 'pistol', type: 'pistol', img: 'M1911.png', desc: 'کلت ابتدایی بازی که در دست دارید' },
  { id: 'm1911_upgraded_zm', name: 'Mustang & Sally', pap: 'ارتقا یافته (راکت‌انداز دوقلو!)', cat: 'pap', type: 'pistol', img: 'M1911.png', desc: 'پرتاب نارنجک و موشک‌های دوقلو در هر دست!' },
  { id: 'python_zm', name: 'Python .357', pap: 'Cobra', cat: 'pistol', type: 'pistol', img: 'Python.png', desc: 'رولور مگنوم سنگین با صدای رعدآسا' },
  { id: 'python_upgraded_zm', name: 'Cobra (Python)', pap: 'ارتقا یافته (کبرا)', cat: 'pap', type: 'pistol', img: 'Python.png', desc: 'ریلود سریع با خشاب سرعتی اسپیدلودر' },
  { id: 'cz75_zm', name: 'CZ75', pap: 'Calamity', cat: 'pistol', type: 'pistol', img: 'CZ75.png', desc: 'تپانچه تمام‌اتوماتیک دقیق' },
  { id: 'cz75dw_upgraded_zm', name: 'Calamity & Jane (Dual CZ75)', pap: 'ارتقا یافته (دوتایی دوقلو)', cat: 'pap', type: 'pistol', img: 'CZ75.png', desc: 'دو کلت اتوماتیک همزمان در دو دست' },
  { id: 'crossbow_explosive_zm', name: 'Crossbow Explosive', pap: 'Awful Lawton', cat: 'special', type: 'special', img: 'Crossbow.png', desc: 'تیر و کمان با تیرهای انفجاری C4' },
  { id: 'crossbow_explosive_upgraded_zm', name: 'Awful Lawton', pap: 'ارتقا یافته (جذب کننده زامبی)', cat: 'pap', type: 'special', img: 'Crossbow.png', desc: 'تیرهای کمان مثل میمون بمبی زامبی‌ها را جذب می‌کنند!' },
  { id: 'china_lake_zm', name: 'China Lake', pap: 'China Beach', cat: 'special', type: 'special', img: 'China Lake.png', desc: 'نارنجک‌انداز پمپی پرتاب ۴۰ میلی‌متری' },
  { id: 'china_lake_upgraded_zm', name: 'China Beach', pap: 'ارتقا یافته', cat: 'pap', type: 'special', img: 'China Lake.png', desc: 'ریلود آنی و انفجارهای شعله‌ور' },
  { id: 'm72_law_zm', name: 'M72 LAW', pap: 'M72 Anarchy', cat: 'special', type: 'special', img: 'M72 LAW.png', desc: 'آر‌پی‌جی راکت‌انداز انفرادی' },
  { id: 'm72_law_upgraded_zm', name: 'M72 Anarchy', pap: 'ارتقا یافته (رگبار راکت)', cat: 'pap', type: 'special', img: 'M72 LAW.png', desc: 'خشاب ۸ راکت آماده شلیک پیاپی' },
  { id: 'knife_ballistic_zm', name: 'Ballistic Knife', pap: 'The Krauss Refibrillator', cat: 'special', type: 'knife', img: 'Ballistic Knife.png', desc: 'چاقوی فنری پرتابی با چاقوزنی سریع' },
  { id: 'knife_ballistic_upgraded_zm', name: 'The Krauss Refibrillator', pap: 'ارتقا یافته (احیاگر)', cat: 'pap', type: 'knife', img: 'Ballistic Knife.png', desc: 'با شلیک تیر به یار مرده بلافاصله او را زنده می‌کند' },
  { id: 'bowie_knife_zm', name: 'Bowie Knife', pap: 'Melee Weapon', cat: 'special', type: 'knife', img: 'Bowie Knife.png', desc: 'چاقوی مرگبار یک ضربه تا راند ۱۲' },
  { id: 'claymore_zm', name: 'Claymore', pap: 'Explosive Trap', cat: 'special', type: 'special', img: 'Claymore.png', desc: 'تله‌های انفجاری جهت‌دار روی زمین' }
];

// Stylized Vector Silhouette SVGs
function getWeaponSvg(type, cat) {
  if (type === 'raygun') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M10 24 L22 24 L25 18 L48 18 L52 14 L85 14 L88 18 L95 18 L95 24 L88 24 L85 28 L52 28 L48 24 L30 24 L26 36 L18 36 L22 24 Z" fill="cyan" opacity="0.9"/>
      <circle cx="80" cy="21" r="5" fill="#ff4081"/>
      <circle cx="65" cy="21" r="4" fill="cyan"/>
      <circle cx="50" cy="21" r="3" fill="#ff4081"/>
      <rect x="86" y="19" width="8" height="4" fill="#fff"/>
    </svg>`;
  }
  if (type === 'thunder') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M12 26 L22 26 L26 16 L55 16 L65 10 L85 8 L95 6 L95 34 L85 32 L65 26 L45 26 L40 36 L30 36 L34 26 Z" fill="#00e5ff" opacity="0.9"/>
      <ellipse cx="90" cy="20" rx="3" ry="12" fill="#fff"/>
      <circle cx="50" cy="21" r="6" fill="#ff5722"/>
    </svg>`;
  }
  if (type === 'freezegun') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M15 26 L28 26 L30 18 L60 18 L70 14 L92 14 L92 26 L70 26 L60 22 L38 22 L32 36 L22 36 L25 26 Z" fill="#80d8ff"/>
      <rect x="50" y="15" width="20" height="10" rx="2" fill="#e0f7fa"/>
    </svg>`;
  }
  if (type === 'minigun') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <rect x="15" y="18" width="30" height="12" rx="3" fill="#ff5722"/>
      <rect x="45" y="16" width="48" height="3" fill="#fff"/>
      <rect x="45" y="21" width="50" height="3" fill="#fff"/>
      <rect x="45" y="26" width="48" height="3" fill="#fff"/>
      <circle cx="28" cy="30" r="8" fill="#d50000"/>
    </svg>`;
  }
  if (type === 'rifle') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M8 24 L20 20 L40 20 L48 24 L88 24 L94 22 L94 25 L88 26 L65 26 L55 36 L48 36 L52 26 L35 26 L28 34 L20 34 L22 26 L12 28 Z" fill="#fff" opacity="0.85"/>
      <rect x="52" y="17" width="16" height="3" fill="#ff5722"/>
    </svg>`;
  }
  if (type === 'smg') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M15 22 L28 22 L36 18 L75 18 L82 20 L82 24 L60 24 L52 35 L44 35 L48 24 L32 24 L28 34 L20 34 L22 24 Z" fill="#fff" opacity="0.85"/>
    </svg>`;
  }
  if (type === 'lmg') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M8 22 L25 18 L50 18 L92 18 L92 23 L65 23 L60 30 L45 30 L42 23 L28 23 L22 34 L15 34 L18 24 Z" fill="#fff" opacity="0.85"/>
      <ellipse cx="50" cy="27" rx="8" ry="6" fill="#ff5722"/>
    </svg>`;
  }
  if (type === 'shotgun') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M8 24 L25 22 L55 20 L92 20 L92 24 L65 24 L45 24 L32 32 L22 32 L26 24 Z" fill="#fff" opacity="0.85"/>
      <rect x="55" y="24" width="14" height="4" rx="2" fill="#ff7043"/>
    </svg>`;
  }
  if (type === 'sniper') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M6 24 L22 21 L50 21 L96 21 L96 23 L70 23 L35 23 L26 33 L18 33 L20 24 Z" fill="#fff" opacity="0.85"/>
      <rect x="40" y="15" width="24" height="4" rx="1" fill="#00e5ff"/>
      <rect x="48" y="19" width="8" height="2" fill="#fff"/>
    </svg>`;
  }
  if (type === 'pistol') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M30 18 L68 18 L68 24 L48 24 L40 36 L28 36 L34 24 L30 24 Z" fill="#fff" opacity="0.85"/>
    </svg>`;
  }
  if (type === 'knife') {
    return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
      <path d="M20 24 L45 24 L85 18 C70 28 50 28 45 28 L20 28 Z" fill="#fff"/>
      <rect x="15" y="23" width="10" height="6" rx="2" fill="#ff5722"/>
    </svg>`;
  }
  // Default / Special
  return `<svg viewBox="0 0 100 40" class="weapon-icon-svg">
    <circle cx="50" cy="20" r="10" fill="#ff5722"/>
    <rect x="35" y="18" width="30" height="4" fill="#fff"/>
  </svg>`;
}

// ========================================================
// Mod Menu Engine Bridge & State
// ========================================================
class ModMenuManager {
  constructor() {
    this.isOpen = false;
    this.activeTab = 'cheats';
    this.searchQuery = '';
    this.categoryFilter = 'all';

    // State of Cheats
    this.state = {
      god: false,
      ammo: false,
      oneHit: false,
      esp: false,
      noReload: false,
      noRecoil: false,
      bulletRange: false,
      noClip: false,
      freezeZombies: false,
      fullbright: false,
      thirdPerson: false,
      speed: 190, // normal: 190
      fov: 65,
    };

    this.espAnimFrame = null;
    this.coopPlayers = [];
    this.coopSyncTimer = null;
    this.isTabScoreboardVisible = false;

    // --- Co-op v3: true shared-state networking ---
    this.coop3d = new CoopSoldier3D();      // WebGL 3D teammate renderer
    this.coopWs = null;                     // WebSocket transport
    this.wsRtt = 0;                         // measured round-trip ms
    this.localKills = 0;                    // real zombie kill counter
    this._prevAliveIds = null;              // alive entity id set (kill diffing)
    this.killFeed = [];                     // recent co-op events
    this._peerZb = new Map();               // peer zombie snapshots
    this._peerZbMiss = new Map();           // peer zombie miss-streaks (kill confirm)
    this._peerLastSeen = new Map();
    this._spawnAligned = false; this._spawnDeadline = 0;
    this._moving = false; this._myScore = 500;
    this._coopStopped = false;
    this._httpFallbackStarted = false; this._httpFallbackActive = false;
    this.setupGlobalHotkeys();
    this.init();

    // Auto-heal overlay if document.body was replaced by landing.js
    setInterval(() => {
      this.ensureMounted();
      this.checkAutoStartCoop();
    }, 800);
  }

  checkAutoStartCoop() {
    if (document.body?.dataset?.screen === 'playing' && !this._coopSyncStarted) {
      this._coopSyncStarted = true;
      this.setupCoopSync();
    }
  }

  ensureMounted() {
    if (!document.getElementById('modmenu-overlay') || !document.getElementById('modmenu-badge')) {
      this.init();
    }
  }

  onGameEnter() {
    this.ensureMounted();
    this.cmd('set bg_fallDamageMaxHeight 99999');
    setTimeout(() => {
      this.checkAutoStartCoop();
    }, 1000);
  }

  teleport(x, y, z, yawDeg) {
    try {
      const rx = Math.round(x);
      const ry = Math.round(y);
      const rz = Math.round(z);
      const yaw = (typeof yawDeg === 'number' && Number.isFinite(yawDeg)) ? Math.round(yawDeg) : 0;
      // setviewpos requires 4 arguments in Black Ops: x y z yaw
      this.cmd(`setviewpos ${rx} ${ry} ${rz} ${yaw}`);
    } catch (e) {
      console.warn('[CO-OP] Teleport error:', e);
    }
  }

  alignInitialSpawn(p) {
    if (this._spawnAligned) return;
    if (!p || typeof p.x !== 'number' || !Number.isFinite(p.x) || (p.x === 0 && p.y === 0)) return;
    const cam = this.getMemoryContext()?.camera;
    if (!cam || !cam.valid) return;
    // Place the client side-by-side with the host using the HOST's right vector
    // (right = fwd rotated -90deg around world Z-up) instead of a fixed +60 X offset.
    const yaw = (typeof p.yaw === 'number') ? p.yaw : Math.atan2(p.fwdY ?? 0, p.fwdX ?? 1);
    const rx = Math.sin(yaw), ry = -Math.cos(yaw);
    const fl = Math.hypot(rx, ry) || 1;
    const ox = (rx / fl) * 72, oy = (ry / fl) * 72;
    const myYawDeg = Math.atan2(cam.fwd.y, cam.fwd.x) * 180 / Math.PI;
    this.teleport(p.x + ox, p.y + oy, p.z, myYawDeg);
    this._spawnAligned = true;
    this.pushKillFeed(`⚡ Spawn aligned with ${p.name || 'Host'}`);
  }

  syncRemotePlayersToEngine(memCtx) {
    // v3: teammates render as TRUE 3D soldiers via coop3d.js (WebGL layer driven by
    // the engine camera read from WASM memory). No CG snapshot mutation, no 2D body.
  }

  setupGlobalHotkeys() {
    if (window.__modMenuHotkeysBound) return;
    window.__modMenuHotkeysBound = true;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Insert' || e.code === 'F1' || e.code === 'F2' || e.code === 'Backquote') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.toggle();
      } else if (e.code === 'Tab') {
        this.showScoreboard();
      }
    }, true);

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') {
        this.hideScoreboard();
      }
    }, true);
  }

  setupCoopSync() {
    let partyData = null;
    try {
      const raw = sessionStorage.getItem('bo1z-online-party');
      if (raw) partyData = JSON.parse(raw);
    } catch (e) {}

    if (!partyData || !partyData.room) return;

    this.partyData = partyData;
    this.myPid = partyData.playerId || 'p-player';
    this.myName = (partyData.room.players || []).find(p => p.id === this.myPid)?.name
      || (partyData.isHost ? 'Host' : 'Player');
    this.roomId = partyData.room.id;
    this._spawnDeadline = performance.now() + 25000;

    // Ensure the shared render loop (ESP canvas + 3D soldiers) is active
    if (!this.espAnimFrame) this.startESPOverlay();

    this.coopStartNetwork();
  }

  // ---- Build this player's compact state (camera from engine memory) ----
  coopBuildState(includeZombies) {
    const memCtx = this.getMemoryContext();
    const cam = memCtx?.camera;
    const valid = Boolean(cam && cam.valid);
    const x = valid ? cam.x : (this._lastX ?? 0);
    const y = valid ? cam.y : (this._lastY ?? 0);
    const z = valid ? cam.z : (this._lastZ ?? 0);
    if (valid) { this._lastX = x; this._lastY = y; this._lastZ = z; }
    const yaw = valid ? Math.atan2(cam.fwd.y, cam.fwd.x) : 0;
    const pitch = valid ? Math.asin(Math.max(-1, Math.min(1, cam.fwd.z))) : 0;

    let score = 500;
    if (memCtx?.cgPtr && memCtx?.heapU32) {
      const sc = memCtx.heapU32[(memCtx.cgPtr + 372736) >> 2];
      if (sc > 0 && sc < 1000000) score = sc;
    }
    this._myScore = score;

    const st = {
      x: +x.toFixed(1), y: +y.toFixed(1), z: +z.toFixed(1),
      yaw: +yaw.toFixed(3), pitch: +pitch.toFixed(3),
      mv: Boolean(this._moving), cr: false, alive: true,
      name: this.myName, isHost: Boolean(this.partyData?.isHost),
      sc: score, k: this.localKills,
    };
    if (includeZombies && memCtx) {
      const zl = this.getLiveZombies(memCtx);
      st.zb = zl.slice(0, 40).map(zz => [zz.id, Math.round(zz.x), Math.round(zz.y), Math.round(zz.z)]);
    }
    return st;
  }

  // ---- Transport: WebSocket hub (server.py) with HTTP polling fallback ----
  coopStartNetwork() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const pathBase = location.pathname.replace(/[^/]*$/, '');
    const wsUrl = `${proto}://${location.host}${pathBase}ws`;

    let ws = null, wsOk = false, reconnectDelay = 1000, tick = 0;

    const connect = () => {
      if (this._coopStopped) return;
      try { ws = new WebSocket(wsUrl); } catch (e) { this.coopStartHttpFallback(); return; }
      ws.onopen = () => {
        wsOk = true; reconnectDelay = 1000;
        try {
          ws.send(JSON.stringify({ t: 'join', room: this.roomId, pid: this.myPid,
            name: this.myName, isHost: Boolean(this.partyData?.isHost) }));
          this.pushKillFeed('🌐 Live co-op sync connected');
        } catch (e) {}
      };
      ws.onmessage = (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.t === 's' && msg.s) {
          msg.s.playerId = msg.p;
          this.coopApplyPeer(msg.s);
        } else if (msg.t === 'gone') {
          this.coopPlayers = this.coopPlayers.filter(p => p.playerId !== msg.p);
          this._peerZb.delete(msg.p);
          this.pushKillFeed(`👋 ${msg.n || 'Player'} left the game`);
        } else if (msg.t === 'pong') {
          this.wsRtt = Math.max(1, Math.round(performance.now() - (msg.ts || 0)));
        }
      };
      ws.onclose = () => {
        wsOk = false;
        this.coopStartHttpFallback();
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(8000, reconnectDelay * 2);
      };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
      this.coopWs = ws;
    };
    connect();

    // App-level ping for the scoreboard RTT readout.
    setInterval(() => {
      if (wsOk && this.coopWs?.readyState === 1) {
        try { this.coopWs.send(JSON.stringify({ t: 'ping', ts: performance.now() })); } catch (e) {}
      }
    }, 2000);

    // 30 Hz state push; zombie snapshot piggybacks at ~7.5 Hz.
    this.coopSyncTimer = setInterval(() => {
      tick++;
      try {
        if (document.body?.dataset?.screen !== 'playing') return;
        const st = this.coopBuildState(tick % 4 === 0);
        // movement detection from sent-position deltas (30 Hz)
        if (this._lastSentX !== undefined) {
          const sp = Math.hypot(st.x - this._lastSentX, st.y - this._lastSentY, st.z - this._lastSentZ) / 0.033;
          this._moving = sp > 25;
        }
        this._lastSentX = st.x; this._lastSentY = st.y; this._lastSentZ = st.z;
        st.mv = Boolean(this._moving);

        if (wsOk && this.coopWs?.readyState === 1) {
          this.coopWs.send(JSON.stringify({ t: 's', s: st }));
        } else {
          this._coopHttpPayload = st;
        }

        // Spawn alignment retries during the first 25 s (host state may arrive late).
        if (!this.partyData?.isHost && !this._spawnAligned && performance.now() < this._spawnDeadline) {
          const host = this.coopPlayers.find(p => p.isHost);
          if (host) this.alignInitialSpawn(host);
        }
      } catch (e) {}
    }, 33);

    window.addEventListener('beforeunload', () => { this._coopStopped = true; try { this.coopWs?.close(); } catch (e) {} });
  }

  coopStartHttpFallback() {
    if (this._httpFallbackStarted) return;
    this._httpFallbackStarted = true;
    this._httpFallbackActive = true;
    const send = async () => {
      if (this._coopStopped) return;
      try {
        if (this.coopWs?.readyState === 1) { this._httpFallbackActive = false; return; }
        const st = this._coopHttpPayload || this.coopBuildState(false);
        if (!st || !this.roomId) return;
        const resp = await fetch('/api/rooms/sync', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: this.roomId, playerId: this.myPid, state: st })
        });
        const res = await resp.json();
        if (res.success && Array.isArray(res.others)) {
          for (const other of res.others) this.coopApplyPeer({ ...other, playerId: other.playerId });
        }
      } catch (e) {}
    };
    setInterval(send, 150);
    send();
  }

  // ---- Apply a peer state: roster, kill relay, spawn alignment ----
  coopApplyPeer(st) {
    if (!st || st.playerId === this.myPid) return;
    const idx = this.coopPlayers.findIndex(p => p.playerId === st.playerId);
    if (idx >= 0) this.coopPlayers[idx] = st; else this.coopPlayers.push(st);
    this._peerLastSeen.set(st.playerId, performance.now());
    const now = performance.now();
    this.coopPlayers = this.coopPlayers.filter(p => now - (this._peerLastSeen.get(p.playerId) || 0) < 2500);

    // --- Zombie kill relay: peer snapshot diff -> confirm 2 misses -> kill twin here.
    if (Array.isArray(st.zb)) {
      const prev = this._peerZb.get(st.playerId);
      const nowIds = new Set(st.zb.map(e => e[0]));
      const missMap = this._peerZbMiss.get(st.playerId) || new Map();
      if (prev) {
        for (const [id, x, y, z] of prev) {
          if (nowIds.has(id)) { missMap.delete(id); continue; }
          const streak = (missMap.get(id) || 0) + 1;
          if (streak >= 2) {
            missMap.delete(id);
            if (this.killLocalZombieNear(x, y, z)) {
              this.pushKillFeed(`💀 ${st.name || 'Peer'} killed a zombie (synced)`);
            }
          } else {
            missMap.set(id, streak);
          }
        }
      }
      this._peerZbMiss.set(st.playerId, missMap);
      this._peerZb.set(st.playerId, st.zb);
    }

    if (!this._spawnAligned && !this.partyData?.isHost && st.isHost) this.alignInitialSpawn(st);
  }

  // ---- Kill the local zombie twin nearest to a peer-reported death position ----
  killLocalZombieNear(x, y, z, tol = 130) {
    const memCtx = this.getMemoryContext();
    if (!memCtx || !memCtx.centitiesBase || !memCtx.heapU8) return false;
    const { heapU8, heapU16, heapF32, centitiesBase } = memCtx;
    let best = -1, bestD = tol;
    for (let i = 1; i < 1024; i++) {
      const entPtr = centitiesBase + i * 808;
      if (entPtr + 808 > heapU8.byteLength) break;
      if ((heapU8[entPtr + 804] & 2) === 0) continue;          // not in scene
      const eType = heapU16[(entPtr + 678) / 2];
      if (eType !== 17 && eType !== 19) continue;               // not an actor
      if ((heapU8[entPtr + 494] & 4) !== 0) continue;           // already corpse
      const ex = heapF32[(entPtr + 48) / 4], ey = heapF32[(entPtr + 52) / 4], ez = heapF32[(entPtr + 56) / 4];
      if (!Number.isFinite(ex) || (ex === 0 && ey === 0 && ez === 0)) continue;
      const d = Math.hypot(ex - x, ey - y, ez - z);
      if (d <= bestD) { bestD = d; best = i; }
    }
    if (best < 0) return false;
    const ptr = centitiesBase + best * 808;
    heapU8[ptr + 494] |= 4; // ACTOR_FLAG_CORPSE — engine's own dead flag
    // Push REAL engine damage through the console so health/gore stay consistent:
    try {
      const sx = x.toFixed(1), sy = y.toFixed(1), sz = (z + 96).toFixed(1), dz = z.toFixed(1);
      this.cmd(`magicbullet ray_gun_upgraded_zm ${sx} ${sy} ${sz} ${sx} ${sy} ${dz}`);
    } catch (e) {}
    return true;
  }

  // ---- Real kill counter: local alive-set diffing ----
  trackLocalKills(zombies) {
    const nowIds = new Set(zombies.map(z => z.id));
    if (this._prevAliveIds) {
      for (const id of this._prevAliveIds) {
        if (!nowIds.has(id)) this.localKills++;
      }
    }
    this._prevAliveIds = nowIds;
  }

  // ---- Kill feed / co-op event overlay ----
  pushKillFeed(text) {
    this.killFeed.push({ text: String(text).slice(0, 90), t: performance.now() });
    if (this.killFeed.length > 6) this.killFeed.shift();
  }

  drawKillFeed(ctx) {
    const now = performance.now();
    this.killFeed = this.killFeed.filter(k => now - k.t < 5000);
    if (!this.killFeed.length) return;
    ctx.save();
    ctx.font = 'bold 12px -apple-system, sans-serif';
    this.killFeed.forEach((k, i) => {
      const age = (now - k.t) / 5000;
      ctx.globalAlpha = Math.max(0, 1 - age * age);
      const tw = ctx.measureText(k.text).width;
      ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
      ctx.fillRect(14, 64 + i * 20, tw + 14, 17);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText(k.text, 21, 77 + i * 20);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  showScoreboard() {
    this.isTabScoreboardVisible = true;
    let sb = document.getElementById('coop-scoreboard-overlay');
    if (!sb) {
      this.init();
      sb = document.getElementById('coop-scoreboard-overlay');
    }
    if (!sb) return;

    const isHost = Boolean(this.partyData?.isHost);
    const myName = this.myName || 'You';
    const ping = this.wsRtt ? `${this.wsRtt}ms` : this._httpFallbackActive ? 'poll' : '—';

    let rowsHtml = `
      <tr class="coop-sb-row ${isHost ? 'host-row' : 'client-row'}">
        <td class="coop-sb-name">
          <span class="coop-sb-badge ${isHost ? 'host' : 'client'}">${isHost ? '👑 HOST' : '🧟 CO-OP'}</span>
          <span>${myName} (You)</span>
        </td>
        <td style="color: #60a5fa; font-weight: 700;">${this._myScore ?? 500}</td>
        <td>${this.localKills}</td>
        <td>—</td>
        <td><span style="color: #10b981; font-weight: 600;">● ALIVE</span></td>
        <td style="color: #9ca3af; font-family: monospace;">${ping}</td>
      </tr>
    `;

    if (this.coopPlayers && this.coopPlayers.length > 0) {
      for (const other of this.coopPlayers) {
        const otherIsHost = Boolean(other.isHost);
        const age = performance.now() - (this._peerLastSeen.get(other.playerId) || 0);
        const alive = age < 1200;
        rowsHtml += `
          <tr class="coop-sb-row ${otherIsHost ? 'host-row' : 'client-row'}">
            <td class="coop-sb-name">
              <span class="coop-sb-badge ${otherIsHost ? 'host' : 'client'}">${otherIsHost ? '👑 HOST' : '🧟 CO-OP'}</span>
              <span>${other.name || 'Friend'}</span>
            </td>
            <td style="color: #60a5fa; font-weight: 700;">${other.sc ?? 500}</td>
            <td>${other.k ?? 0}</td>
            <td>—</td>
            <td><span style="color: ${alive ? '#10b981' : '#f59e0b'}; font-weight: 600;">● ${alive ? 'ALIVE' : 'SYNC…'}</span></td>
            <td style="color: #9ca3af; font-family: monospace;">${this.wsRtt ? this.wsRtt + 'ms' : '—'}</td>
          </tr>
        `;
      }
    } else {
      const otherRoomPlayer = (this.partyData?.room?.players || []).find(p => p.id !== this.myPid);
      if (otherRoomPlayer) {
        const oHost = Boolean(otherRoomPlayer.isHost);
        rowsHtml += `
          <tr class="coop-sb-row ${oHost ? 'host-row' : 'client-row'}">
            <td class="coop-sb-name">
              <span class="coop-sb-badge ${oHost ? 'host' : 'client'}">${oHost ? '👑 HOST' : '🧟 CO-OP'}</span>
              <span>${otherRoomPlayer.name}</span>
            </td>
            <td style="color: #60a5fa; font-weight: 700;">—</td>
            <td>—</td>
            <td>—</td>
            <td><span style="color: #f59e0b; font-weight: 600;">● CONNECTING</span></td>
            <td style="color: #9ca3af; font-family: monospace;">—</td>
          </tr>
        `;
      }
    }

    const tbody = document.getElementById('coop-sb-tbody');
    if (tbody) tbody.innerHTML = rowsHtml;
    sb.classList.add('active');
  }

  hideScoreboard() {
    this.isTabScoreboardVisible = false;
    const sb = document.getElementById('coop-scoreboard-overlay');
    if (sb) sb.classList.remove('active');
  }


  // Execute console command directly into game engine
  cmd(command) {
    try {
      const engine = globalThis.__kisakEngine;
      if (engine && typeof engine.executeCommand === 'function') {
        const ok = engine.executeCommand(command);
        this.log(`[CMD] ${command}`);
        return ok;
      }
      // Fallback: wasm module direct call
      const mod = globalThis.__kisakModule;
      if (mod && (mod._Cbuf_AddText || mod.Cbuf_AddText || mod.wasmExports?.Cbuf_AddText) && mod._malloc) {
        const fn = mod._Cbuf_AddText || mod.Cbuf_AddText || mod.wasmExports?.Cbuf_AddText;
        const buf = mod.HEAPU8?.buffer || mod.HEAPF32?.buffer || mod.wasmMemory?.buffer || mod.buffer || globalThis.__kisakWasmHeap;
        if (!buf) return false;
        const str = command.endsWith('\n') ? command : command + '\n';
        const enc = new TextEncoder().encode(str);
        const ptr = mod._malloc(enc.length + 1);
        new Uint8Array(buf, ptr, enc.length + 1).set(enc);
        new Uint8Array(buf)[ptr + enc.length] = 0;
        fn(0, ptr);
        mod._free(ptr);
        this.log(`[WASM-CMD] ${command}`);
        return true;
      }
      this.log(`[WARN] Engine not ready yet to execute: ${command}`);
      return false;
    } catch (e) {
      console.warn('[MODMENU] cmd error:', e);
      return false;
    }
  }

  setDvar(name, val) {
    try {
      const engine = globalThis.__kisakEngine;
      if (engine && typeof engine.setDvar === 'function') {
        return engine.setDvar(name, val);
      }
      return this.cmd(`set ${name} ${val}`);
    } catch (e) {
      console.warn('[MODMENU] setDvar error:', e);
      return false;
    }
  }

  log(msg) {
    console.log('[MODMENU]', msg);
    const logEl = document.getElementById('modmenu-console-log');
    if (logEl) {
      logEl.textContent += '\n' + msg;
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  toast(text, success = true) {
    const container = document.getElementById('modmenu-toasts');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `mod-toast ${success ? 'success' : ''}`;
    toast.innerHTML = `<span>${success ? '⚡' : 'ℹ️'}</span> <span>${text}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // --- Toggle Cheats Implementation ---
  toggleGod(enabled = !this.state.god) {
    this.state.god = enabled;
    if (enabled) {
      this.cmd('god; demigod');
      this.setDvar('player_deathInvulnerableTime', '999999');
      // Fix for jump crash: PM_GroundTrace asserts (bg_fallDamageMinHeight > 0) && (bg_fallDamageMinHeight < bg_fallDamageMaxHeight).
      // By setting min to 99998 and max to 99999, the assertion is always satisfied AND fall damage is completely disabled!
      this.setDvar('bg_fallDamageMinHeight', '99998');
      this.setDvar('bg_fallDamageMaxHeight', '99999');
      this.applyDirectFallDamageMemory(true);
      this.toast('God Mode: ON');
    } else {
      this.cmd('god');
      this.setDvar('player_deathInvulnerableTime', '0');
      this.setDvar('bg_fallDamageMinHeight', '140');
      this.setDvar('bg_fallDamageMaxHeight', '300');
      this.applyDirectFallDamageMemory(false);
      this.toast('God Mode: OFF', false);
    }
    this.updateCardUI('god', this.state.god);
  }

  // Direct memory write for fall damage dvars to completely prevent PM_GroundTrace assertion crash
  applyDirectFallDamageMemory(godEnabled) {
    try {
      const mod = globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
      if (!mod) return;
      const buf = mod.HEAPU8?.buffer || mod.HEAPF32?.buffer || mod.wasmMemory?.buffer || mod.buffer;
      if (!buf) return;
      const u32 = new Uint32Array(buf);
      const f32 = new Float32Array(buf);
      const minPtr = u32[0xad8ebc >> 2]; // bg_fallDamageMinHeight
      const maxPtr = u32[0xad8ec0 >> 2]; // bg_fallDamageMaxHeight
      if (minPtr > 0 && maxPtr > 0 && minPtr < buf.byteLength - 64 && maxPtr < buf.byteLength - 64) {
        const minVal = godEnabled ? 99998.0 : 140.0;
        const maxVal = godEnabled ? 99999.0 : 300.0;
        f32[(minPtr + 24) >> 2] = minVal;
        f32[(minPtr + 28) >> 2] = minVal;
        f32[(maxPtr + 24) >> 2] = maxVal;
        f32[(maxPtr + 28) >> 2] = maxVal;
      }
    } catch (e) {}
  }

  toggleAmmo(enabled = !this.state.ammo) {
    this.state.ammo = enabled;
    if (enabled) {
      this.setDvar('player_sustainAmmo', '1');
      this.setDvar('sf_use_ignoreammo', '1');
      this.cmd('give ammo');
      this.toast('Infinite Ammo: ON');
    } else {
      this.setDvar('player_sustainAmmo', '0');
      this.setDvar('sf_use_ignoreammo', '0');
      this.toast('Infinite Ammo: OFF', false);
    }
    this.updateCardUI('ammo', this.state.ammo);
  }

  // --- One Hit Kill Implementation (Every weapon, pistol, rifle, knife kills in 1 hit) ---
  toggleOneHit(enabled = !this.state.oneHit) {
    this.state.oneHit = enabled;
    if (enabled) {
      // 1. Force explosive impact: every bullet detonates with fatal splash damage
      this.setDvar('bg_forceExplosiveBullets', '1');

      // 2. Set zombie health to 1 (every zombie dies instantly from any damage)
      this.setDvar('level_zombie_health', '1');
      this.setDvar('zombie_health', '1');
      this.setDvar('zombie_insta_kill', '1');

      // 3. Maximum player damage multipliers (1000 is engine maximum domain limit)
      this.setDvar('player_damageMultiplier', '1000');
      this.setDvar('player_meleeDamageMultiplier', '1000');
      this.setDvar('player_radiusDamageMultiplier', '1000');
      this.setDvar('kisak_damagescale', '1000');
      this.setDvar('defaultHitDamage', '200'); // engine maximum domain is 200
      this.setDvar('scr_game_onlyheadshots', '0');

      // 4. Perks: max bullet damage and explosive damage (batched in single command)
      this.cmd('specialty_bulletdamage 1; specialty_explosivedamage 1; perk_bulletPenetrationMultiplier 30; perk_weapMeleeMultiplier 30');

      // 5. In-Memory fatal damage patch on all loaded weapons
      this.applyWeaponMemoryMods();
      if (!this.espAnimFrame) {
        this.startESPOverlay();
      }

      this.toast('One Hit Kill: ON');
    } else {
      if (!this.state.bulletRange) this.setDvar('bg_forceExplosiveBullets', '0');
      this.setDvar('player_damageMultiplier', '1');
      this.setDvar('player_meleeDamageMultiplier', '1');
      this.setDvar('player_radiusDamageMultiplier', '1');
      this.setDvar('kisak_damagescale', '1');
      this.setDvar('zombie_health', '150');
      this.setDvar('level_zombie_health', '150');
      this.setDvar('zombie_insta_kill', '0');
      this.setDvar('defaultHitDamage', '100');
      this.applyWeaponMemoryMods();
      if (!this.state.esp && !this.state.noRecoil && !this.state.bulletRange) {
        this.stopESPOverlay();
      }
      this.toast('One Hit Kill: OFF', false);
    }
    this.updateCardUI('oneHit', this.state.oneHit);
  }

  // --- Real In-Memory Context Helper (Exact refdef.vieworg & viewaxis matrix from WorldPosToScreenPos) ---
  getMemoryContext() {
    if (document.body?.dataset?.screen !== 'playing') return null;
    const mod = globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
    if (!mod) return null;
    const buf = mod.HEAPU8?.buffer || mod.HEAPF32?.buffer || mod.wasmMemory?.buffer || mod.buffer;
    if (!buf) return null;

    const heapU32 = new Uint32Array(buf);
    const heapF32 = new Float32Array(buf);
    const heapU16 = new Uint16Array(buf);
    const heapU8  = new Uint8Array(buf);

    // cgArray pointer in KisakBlack-web.wasm: 12717552 (0xc20df0)
    const cgPtr = heapU32[12717552 / 4] || 0;
    // cg_entitiesArray pointer in KisakBlack-web.wasm: 12123212 (0xb8fc4c)
    const centitiesBase = heapU32[12123212 / 4] || 0;

    if (!cgPtr || !centitiesBase) return null;

    // EXACT Camera refdef from engine's WorldPosToScreenPos (func 3685):
    // refdef.vieworg (Camera position in 3D world):
    const camX = heapF32[(cgPtr + 274060) / 4]; // 0x42e8c
    const camY = heapF32[(cgPtr + 274064) / 4]; // 0x42e90
    const camZ = heapF32[(cgPtr + 274068) / 4]; // 0x42e94

    // tanHalfFov:
    let tanFovX = heapF32[(cgPtr + 274048) / 4]; // 0x42e80
    let tanFovY = heapF32[(cgPtr + 274052) / 4]; // 0x42e84

    // refdef.viewaxis (3x3 orthogonal camera basis matrix calculated every frame by engine):
    // Forward vector (look direction):
    const fwdX = heapF32[(cgPtr + 274076) / 4]; // 0x42e9c
    const fwdY = heapF32[(cgPtr + 274080) / 4]; // 0x42ea0
    const fwdZ = heapF32[(cgPtr + 274084) / 4]; // 0x42ea4

    // Left basis vector (axis1):
    const axis1X = heapF32[(cgPtr + 274088) / 4]; // 0x42ea8
    const axis1Y = heapF32[(cgPtr + 274092) / 4]; // 0x42eac
    const axis1Z = heapF32[(cgPtr + 274096) / 4]; // 0x42eb0

    // Right basis vector is negative Left basis:
    const rightX = -axis1X;
    const rightY = -axis1Y;
    const rightZ = -axis1Z;

    // Up basis vector (viewaxis[2]):
    const upX = heapF32[(cgPtr + 274100) / 4]; // 0x42eb4
    const upY = heapF32[(cgPtr + 274104) / 4]; // 0x42eb8
    const upZ = heapF32[(cgPtr + 274108) / 4]; // 0x42ebc

    // Fallback if FOV tangents uninitialized:
    if (!tanFovX || tanFovX <= 0 || !Number.isFinite(tanFovX)) {
      tanFovX = Math.tan(((this.state.fov || 65) * Math.PI / 180) / 2);
    }
    if (!tanFovY || tanFovY <= 0 || !Number.isFinite(tanFovY)) {
      tanFovY = tanFovX * (9 / 16);
    }

    const hasCamera = Number.isFinite(camX) && Number.isFinite(camY) && Number.isFinite(camZ) &&
                      Number.isFinite(fwdX) && (fwdX !== 0 || fwdY !== 0 || fwdZ !== 0);

    return {
      heapU32,
      heapF32,
      heapU16,
      heapU8,
      cgPtr,
      centitiesBase,
      camera: {
        x: camX, y: camY, z: camZ,
        fwd: { x: fwdX, y: fwdY, z: fwdZ },
        axis1: { x: axis1X, y: axis1Y, z: axis1Z },
        right: { x: rightX, y: rightY, z: rightZ },
        up: { x: upX, y: upY, z: upZ },
        tanFovX, tanFovY,
        valid: hasCamera
      }
    };
  }

  // --- Real Zombie Discovery Scanner (Verified from func 11221 & CG_GetEntityOrigin) ---
  getLiveZombies(memCtx) {
    if (!memCtx || !memCtx.camera.valid || !memCtx.centitiesBase) return [];
    const { heapF32, heapU16, heapU8, centitiesBase, camera } = memCtx;

    const zombies = [];

    // Scan entities: 1 to 1024 (Entity 0 is the local player; 1..1023 are world entities)
    for (let i = 1; i < 1024; i++) {
      const entPtr = centitiesBase + i * 808;
      if (entPtr + 808 > heapU8.byteLength) break;

      // 1. Entity active in scene check: (flags & 2 !== 0 from func 11221)
      const sceneFlag = heapU8[entPtr + 804];
      if ((sceneFlag & 2) === 0) continue;

      // 2. Entity type at offset 678 (0x2a6): eType == 17 is ACTOR (Zombie)!
      const eType = heapU16[(entPtr + 678) / 2];
      if (eType !== 17 && eType !== 19) continue;

      // 3. Corpse check at offset 494 (0x1ee): bit 2 (0x4) is ACTOR_FLAG_CORPSE from AimTarget_UpdateClientTargets
      // Alive zombies have (actorFlag & 4) === 0. Dead corpses have (actorFlag & 4) !== 0.
      const actorFlag = heapU8[entPtr + 494];
      if ((actorFlag & 4) !== 0) continue; // Skip corpses (dead zombies)!

      // 4. Exact 3D World Coordinates from CG_GetEntityOrigin (func 4405) & func 11221:
      // Offset 48 (0x30) = X, 52 (0x34) = Y, 56 (0x38) = Z
      const x = heapF32[(entPtr + 48) / 4];
      const y = heapF32[(entPtr + 52) / 4];
      const z = heapF32[(entPtr + 56) / 4];

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (x === 0 && y === 0 && z === 0) continue;

      // Distance from player camera:
      const dx = x - camera.x;
      const dy = y - camera.y;
      const dz = z - camera.z;
      const dist = Math.hypot(dx, dy, dz);

      // Distance range check: active zombies within 6000 units (~150 meters)
      if (dist < 5 || dist > 6000) continue;

      zombies.push({
        id: i,
        x, y, z,
        distUnits: dist,
        distMeters: Math.round(dist * 0.0254),
        eType
      });
    }

    return zombies;
  }

  // --- World-To-Screen 3D Perspective Projector (Exact Math from WorldPosToScreenPos func 3685) ---
  projectWorldToScreen(wx, wy, wz, cam, width, height) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const dz = wz - cam.z;

    // Dot product with engine's forward vector:
    const distForward = dx * cam.fwd.x + dy * cam.fwd.y + dz * cam.fwd.z;
    if (distForward <= 4.0) return null; // Behind camera or closer than near-plane

    // Dot products with axis1 (left) and up vectors from WorldPosToScreenPos:
    const distAxis1 = dx * cam.axis1.x + dy * cam.axis1.y + dz * cam.axis1.z;
    const distUp    = dx * cam.up.x    + dy * cam.up.y    + dz * cam.up.z;

    // Exact formulas from WorldPosToScreenPos (func 3685):
    // screenX = (width * 0.5) * (1.0 - (distAxis1 / tanFovX) / distForward);
    // screenY = (height * 0.5) * (1.0 - (distUp / tanFovY) / distForward);
    const screenX = (width * 0.5)  * (1.0 - (distAxis1 / (cam.tanFovX * distForward)));
    const screenY = (height * 0.5) * (1.0 - (distUp    / (cam.tanFovY * distForward)));

    return {
      x: screenX,
      y: screenY,
      distForward,
      distAxis1,
      distUp
    };
  }

  // --- Zombie Box ESP & Wallhack Implementation ---
  toggleESP(enabled = !this.state.esp) {
    this.state.esp = enabled;
    if (enabled) {
      // 1. Engine 3D Bounding Boxes around all zombies
      this.cmd('g_entinfo 2');
      this.setDvar('g_entinfo', '2');
      this.cmd('g_entinfo_maxdist 10000');
      this.setDvar('g_entinfo_maxdist', '10000');
      this.cmd('g_entinfo_scale 1.5');
      this.setDvar('g_entinfo_scale', '1.5');
      this.cmd('g_entinfo_type 0');
      this.setDvar('g_entinfo_type', '0');

      // 2. Wallhack: draw entities and text through walls
      this.cmd('cg_drawThroughWalls 1');
      this.setDvar('cg_drawThroughWalls', '1');

      // 3. Glowing enemy highlights & silhouettes
      this.cmd('cg_playerHighlightBrightness 5');
      this.setDvar('cg_playerHighlightBrightness', '5');
      this.cmd('cg_playerHighlightEnemyColor 1 0 0 1');
      this.setDvar('cg_playerHighlightEnemyColor', '1 0 0 1');
      this.cmd('cg_playerHighlightTargetSize 35');
      this.setDvar('cg_playerHighlightTargetSize', '35');

      // 4. Enemy indicators & 3D crosshair
      this.cmd('g_compassShowEnemies 1');
      this.setDvar('g_compassShowEnemies', '1');
      this.cmd('cg_drawCrosshair3D 1');
      this.setDvar('cg_drawCrosshair3D', '1');
      this.cmd('ai_debugEntIndex -1');

      // 5. Start HUD Tactical Overlay Canvas with Real Zombie Tracking
      this.startESPOverlay();

      this.toast('Zombie ESP: ON');
    } else {
      this.cmd('g_entinfo 0');
      this.setDvar('g_entinfo', '0');
      this.cmd('cg_drawThroughWalls 0');
      this.setDvar('cg_drawThroughWalls', '0');
      this.cmd('cg_playerHighlightBrightness 0');
      this.setDvar('cg_playerHighlightBrightness', '0');
      this.cmd('cg_drawCrosshair3D 0');
      this.setDvar('cg_drawCrosshair3D', '0');
      this.cmd('g_compassShowEnemies 0');
      this.setDvar('g_compassShowEnemies', '0');
      this.stopESPOverlay();
      this.toast('Zombie ESP: OFF', false);
    }
    this.updateCardUI('esp', this.state.esp);
  }

  // --- 3D Military Soldier Character Skin & Tactical Model Renderer ---
  drawTacticalSoldier(ctx, cx, headY, feetY, bHeight, bWidth, isHost, tm) {
    ctx.save();

    const scale = Math.max(0.2, bHeight / 68); // 68 units = standard player height
    const headRadius = Math.max(3.5, 5.5 * scale);
    const shoulderWidth = Math.max(8, 16 * scale);
    const neckY = headY + headRadius * 2;
    const waistY = headY + bHeight * 0.52;
    const kneeY = headY + bHeight * 0.76;

    const primaryCamo = isHost ? '#47553b' : '#3e4a3d'; // US Marine Olive Drab
    const vestColor = '#2d3326';   // Tactical chest rig
    const helmetColor = '#3f4733'; // M1 Steel Helmet
    const skinColor = '#d2a679';   // Marine face & hands
    const gunColor = '#1e2328';    // Weapon
    const glowColor = isHost ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)';

    // 0. Soft Allied Aura
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = Math.min(16, Math.max(4, 8 * scale));

    // 1. LEGS & COMBAT BOOTS
    const legWidth = Math.max(2.5, 4.5 * scale);
    const leftHipX = cx - shoulderWidth * 0.28;
    const rightHipX = cx + shoulderWidth * 0.28;

    // Left Leg
    ctx.fillStyle = primaryCamo;
    ctx.beginPath();
    ctx.moveTo(leftHipX - legWidth * 0.5, waistY);
    ctx.lineTo(leftHipX - legWidth * 0.6, kneeY);
    ctx.lineTo(leftHipX - legWidth * 0.4, feetY - 2 * scale);
    ctx.lineTo(leftHipX + legWidth * 0.4, feetY - 2 * scale);
    ctx.lineTo(leftHipX + legWidth * 0.5, kneeY);
    ctx.lineTo(leftHipX + legWidth * 0.5, waistY);
    ctx.closePath();
    ctx.fill();

    // Right Leg
    ctx.beginPath();
    ctx.moveTo(rightHipX - legWidth * 0.5, waistY);
    ctx.lineTo(rightHipX - legWidth * 0.5, kneeY);
    ctx.lineTo(rightHipX - legWidth * 0.4, feetY - 2 * scale);
    ctx.lineTo(rightHipX + legWidth * 0.4, feetY - 2 * scale);
    ctx.lineTo(rightHipX + legWidth * 0.6, kneeY);
    ctx.lineTo(rightHipX + legWidth * 0.5, waistY);
    ctx.closePath();
    ctx.fill();

    // Combat Jump Boots
    ctx.fillStyle = '#181b18';
    ctx.beginPath();
    ctx.roundRect(leftHipX - legWidth * 0.7, feetY - 4 * scale, legWidth * 1.5, 4 * scale + 1, 1);
    ctx.roundRect(rightHipX - legWidth * 0.6, feetY - 4 * scale, legWidth * 1.5, 4 * scale + 1, 1);
    ctx.fill();

    // Knee Protectors
    ctx.fillStyle = vestColor;
    ctx.fillRect(leftHipX - legWidth * 0.5, kneeY - 2 * scale, legWidth, 4 * scale);
    ctx.fillRect(rightHipX - legWidth * 0.5, kneeY - 2 * scale, legWidth, 4 * scale);

    // 2. TORSO, JACKET & TACTICAL LOADOUT VEST
    ctx.fillStyle = primaryCamo;
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth * 0.5, neckY);
    ctx.lineTo(cx + shoulderWidth * 0.5, neckY);
    ctx.lineTo(cx + shoulderWidth * 0.38, waistY);
    ctx.lineTo(cx - shoulderWidth * 0.38, waistY);
    ctx.closePath();
    ctx.fill();

    // Modular Tactical Plate Carrier
    ctx.fillStyle = vestColor;
    const vestTop = neckY + 1 * scale;
    const vestHeight = (waistY - vestTop) * 0.88;
    const vestWidth = shoulderWidth * 0.75;
    ctx.beginPath();
    ctx.roundRect(cx - vestWidth * 0.5, vestTop, vestWidth, vestHeight, 2);
    ctx.fill();

    // Ammo Pouches
    ctx.fillStyle = '#1c2017';
    const pouchW = vestWidth * 0.24;
    const pouchH = vestHeight * 0.35;
    const pouchY = vestTop + vestHeight * 0.45;
    ctx.fillRect(cx - vestWidth * 0.38, pouchY, pouchW, pouchH);
    ctx.fillRect(cx - pouchW * 0.5, pouchY, pouchW, pouchH);
    ctx.fillRect(cx + vestWidth * 0.14, pouchY, pouchW, pouchH);

    // Shoulder Radio & Antenna
    ctx.fillStyle = '#111311';
    ctx.fillRect(cx - shoulderWidth * 0.42, neckY - 2 * scale, 3 * scale, 8 * scale);
    ctx.beginPath();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.moveTo(cx - shoulderWidth * 0.4, neckY - 2 * scale);
    ctx.lineTo(cx - shoulderWidth * 0.42, neckY - 8 * scale);
    ctx.stroke();

    // 3. ARMS & WEAPON
    const armWidth = Math.max(2, 3.8 * scale);
    const lShX = cx - shoulderWidth * 0.48;
    const rShX = cx + shoulderWidth * 0.48;
    const handX = cx + (tm.fwdX > 0 ? 3 : -3) * scale;
    const handY = neckY + vestHeight * 0.55;

    // Left Arm
    ctx.fillStyle = primaryCamo;
    ctx.beginPath();
    ctx.moveTo(lShX, neckY);
    ctx.lineTo(handX - 4 * scale, handY);
    ctx.lineTo(handX - 2 * scale, handY + armWidth);
    ctx.lineTo(lShX + armWidth, neckY + 4 * scale);
    ctx.closePath();
    ctx.fill();

    // Right Arm
    ctx.beginPath();
    ctx.moveTo(rShX, neckY);
    ctx.lineTo(handX + 6 * scale, handY + 1 * scale);
    ctx.lineTo(handX + 4 * scale, handY + armWidth + 1 * scale);
    ctx.lineTo(rShX - armWidth, neckY + 4 * scale);
    ctx.closePath();
    ctx.fill();

    // Combat Gloves
    ctx.fillStyle = '#222520';
    ctx.beginPath();
    ctx.arc(handX - 3 * scale, handY + 2 * scale, Math.max(1.5, 2.5 * scale), 0, Math.PI * 2);
    ctx.arc(handX + 5 * scale, handY + 2 * scale, Math.max(1.5, 2.5 * scale), 0, Math.PI * 2);
    ctx.fill();

    // 4. WEAPON (Thompson / M16 Assault Rifle)
    ctx.fillStyle = gunColor;
    const gunLen = Math.max(12, 22 * scale);
    const gunThick = Math.max(2, 3.2 * scale);
    const aimDir = tm.fwdX < 0 ? -1 : 1;
    const barrelX = handX + (aimDir * gunLen * 0.65);
    const stockX = handX - (aimDir * gunLen * 0.35);

    ctx.beginPath();
    ctx.rect(Math.min(barrelX, stockX), handY, Math.abs(barrelX - stockX), gunThick);
    ctx.fill();
    ctx.fillStyle = '#3a2b1c';
    ctx.fillRect(stockX - (aimDir > 0 ? 3 * scale : 0), handY - 1 * scale, 3 * scale, gunThick * 1.8);
    ctx.fillStyle = '#15171a';
    ctx.fillRect(handX - 1 * scale, handY + gunThick, 3 * scale, 5 * scale);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(barrelX, handY + 0.5 * scale, 2 * scale, gunThick * 0.6);

    // 5. HEAD & M1 STEEL HELMET
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, headY + headRadius * 1.1, headRadius * 0.78, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - headRadius * 0.45, headY + headRadius * 0.95, headRadius * 0.35, headRadius * 0.25);
    ctx.fillRect(cx + headRadius * 0.1, headY + headRadius * 0.95, headRadius * 0.35, headRadius * 0.25);

    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(cx, headY + headRadius * 0.75, headRadius * 1.05, Math.PI * 0.85, Math.PI * 2.15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#272c20';
    ctx.lineWidth = Math.max(1.5, 2.2 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - headRadius * 1.25, headY + headRadius * 0.9);
    ctx.quadraticCurveTo(cx, headY + headRadius * 0.75, cx + headRadius * 1.25, headY + headRadius * 0.9);
    ctx.stroke();

    // 6. ALLIED CONTOUR
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  // --- Off-Screen Allied Radar / Directional Pointer ---
  drawOffscreenIndicator(ctx, tm, cam, w, h) {
    if (!cam || !cam.valid) return;
    const dx = tm.x - cam.x;
    const dy = tm.y - cam.y;
    const camYaw = Math.atan2(cam.fwd.y, cam.fwd.x);
    const targetYaw = Math.atan2(dy, dx);
    let diff = targetYaw - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const distM = Math.round(Math.hypot(dx, dy, tm.z - cam.z) * 0.0254);
    const arrowDist = Math.min(w, h) * 0.44;
    const ax = w / 2 + Math.sin(diff) * arrowDist;
    const ay = h / 2 - Math.cos(diff) * arrowDist;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(diff);

    ctx.fillStyle = tm.isHost ? '#f59e0b' : '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-9, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${tm.isHost ? '👑' : '🧟'} ${tm.name || 'Friend'} [${distM}m]`, ax, Math.min(h - 12, Math.max(20, ay + 18)));
    ctx.restore();
  }

  // --- Real Zombie Box ESP & Live Radar Renderer ---
  startESPOverlay() {
    let canvas = document.getElementById('modmenu-esp-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'modmenu-esp-canvas';
      document.body.appendChild(canvas);
    }
    if (this.state.esp) {
      canvas.classList.add('active');
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanAngle = 0;
    let frameCount = 0;

    const render = () => {
      const isParty = Boolean(sessionStorage.getItem('bo1z-online-party'));
      const needsLoop = isParty || this.state.esp || this.state.noRecoil || this.state.bulletRange || this.state.oneHit;
      if (!needsLoop) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        this.espAnimFrame = null;
        return;
      }

      frameCount++;

      // 1. Fetch live in-memory entities and player camera matrix
      const memCtx = this.getMemoryContext();

      // Real-time zeroing of camera kickAngles and weapon gunKickAngles every frame (Laser No Recoil)
      if (this.state.noRecoil && memCtx?.cgPtr && memCtx?.heapF32) {
        const f32 = memCtx.heapF32;
        // cg->kickAngles: float[3] at cgPtr + 373880
        const ka = (memCtx.cgPtr + 373880) >> 2;
        f32[ka] = 0; f32[ka + 1] = 0; f32[ka + 2] = 0;
        // cg->kickVelocity: float[3] at cgPtr + 373892
        const kv = (memCtx.cgPtr + 373892) >> 2;
        f32[kv] = 0; f32[kv + 1] = 0; f32[kv + 2] = 0;
        // cg->gunKickAngles: float[3] at cgPtr + 388300
        const gka = (memCtx.cgPtr + 388300) >> 2;
        f32[gka] = 0; f32[gka + 1] = 0; f32[gka + 2] = 0;
        // cg->gunKickVelocity: float[3] at cgPtr + 388312
        const gkv = (memCtx.cgPtr + 388312) >> 2;
        f32[gkv] = 0; f32[gkv + 1] = 0; f32[gkv + 2] = 0;
      }

      // Periodically sync weapon memory modifications (every 30 frames) to handle weapon switches / reloading
      if (frameCount % 30 === 0 && (this.state.noRecoil || this.state.bulletRange || this.state.oneHit)) {
        this.applyWeaponMemoryMods();
      }

      const hasCoop = Boolean(this.coopPlayers && this.coopPlayers.length > 0);
      const shouldDraw = this.state.esp || hasCoop;

      const nowT = performance.now();
      const dtMs = this._lastEspT ? Math.min(100, nowT - this._lastEspT) : 16.7;
      this._lastEspT = nowT;

      // If visual ESP overlay and co-op sync are disabled, skip canvas drawing
      if (!shouldDraw) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.remove('active');
        this.coop3d.hide();
        this.espAnimFrame = requestAnimationFrame(render);
        return;
      }

      if (!canvas.classList.contains('active')) {
        canvas.classList.add('active');
      }

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      scanAngle = (scanAngle + 0.04) % (Math.PI * 2);

      const cam = memCtx?.camera;

      // Letterbox-correct rect of the engine canvas: every world projection maps here.
      const gameEl = document.getElementById('game');
      const gameRect = (gameEl && gameEl.getBoundingClientRect) ? gameEl.getBoundingClientRect()
        : { left: 0, top: 0, width: w, height: h };

      // Local zombie scan always runs in a party: kill tracking + ESP share one scan.
      const zombies = (this.state.esp || hasCoop) ? this.getLiveZombies(memCtx) : [];
      if (hasCoop) this.trackLocalKills(zombies);

      // ---------------- TRUE 3D TEAMMATE SOLDIERS (WebGL, engine camera) ----------------
      if (hasCoop && cam && cam.valid) {
        const tms3d = [];
        for (const tm of this.coopPlayers) {
          if (typeof tm.x !== 'number' || !Number.isFinite(tm.x)) continue;
          tms3d.push({
            pid: tm.playerId || tm.name || 'p', x: tm.x, y: tm.y, z: tm.z,
            yaw: tm.yaw || 0, pitch: tm.pitch || 0,
            moving: Boolean(tm.mv), crouch: Boolean(tm.cr), dead: !tm.alive,
            name: tm.name || 'Friend', isHost: Boolean(tm.isHost),
          });
        }
        if (tms3d.length) this.coop3d.update(tms3d, cam, gameRect, dtMs);
        else this.coop3d.hide();
      } else {
        this.coop3d.hide();
      }

      // ---------------- 2D TAGS: nametag / health / snapline (letterbox-correct) ----------------
      if (hasCoop && cam && cam.valid) {
        for (const tm of this.coopPlayers) {
          if (typeof tm.x !== 'number') continue;
          const feetP = projectToGameRect(tm.x, tm.y, tm.z, cam, gameRect);
          const headP = projectToGameRect(tm.x, tm.y, tm.z + 68, cam, gameRect);
          if (feetP && headP) {
            const feet = { x: gameRect.left + feetP.x, y: gameRect.top + feetP.y };
            const head = { x: gameRect.left + headP.x, y: gameRect.top + headP.y };
            const distM = Math.round(feetP.distForward * 0.0254);
            const bHeight = Math.max(20, feet.y - head.y);
            const bWidth = Math.max(12, bHeight * 0.45);

            ctx.save();
            // Snapline from bottom-center of the GAME rect (not the window)
            ctx.beginPath();
            ctx.strokeStyle = tm.isHost ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.45)';
            ctx.setLineDash([4, 4]);
            ctx.moveTo(gameRect.left + gameRect.width / 2, gameRect.top + gameRect.height - 20);
            ctx.lineTo(feet.x, feet.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Floating nametag above the 3D soldier's head
            const tagY = head.y - 18;
            const tagText = `${tm.isHost ? '👑' : '🧟'} ${tm.name || 'Friend'} [${distM}m]`;
            ctx.font = 'bold 11px -apple-system, sans-serif';
            const tagW = ctx.measureText(tagText).width + 16;
            const tagX = feet.x - tagW / 2;

            ctx.fillStyle = 'rgba(10, 12, 18, 0.9)';
            ctx.strokeStyle = tm.isHost ? '#f59e0b' : '#10b981';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tagX, tagY - 14, tagW, 18, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(tagText, tagX + 8, tagY - 1);

            // Readiness bar under the tag
            const hpW = Math.min(60, tagW);
            const hpX = feet.x - hpW / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(hpX, tagY + 6, hpW, 3);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(hpX, tagY + 6, hpW * ((tm.sc || 500) > 0 ? 1 : 0.2), 3);
            ctx.restore();
          } else {
            // Teammate off-screen: 3D radar directional indicator (window-space, fine)
            this.drawOffscreenIndicator(ctx, tm, cam, w, h);
          }
        }
      }

      // Co-op event feed
      this.drawKillFeed(ctx);


      // 2. Draw Real 2D Bounding Boxes on 3D Screen
      let closestZombie = null;
      let minDistance = Infinity;

      if (cam && cam.valid) {
        for (const z of zombies) {
          if (z.distUnits < minDistance) {
            minDistance = z.distUnits;
            closestZombie = z;
          }

          // Project Zombie feet (z.z) and head (z.z + 64 units) — letterbox-correct
          const feetP = projectToGameRect(z.x, z.y, z.z, cam, gameRect);
          const headP = projectToGameRect(z.x, z.y, z.z + 64, cam, gameRect);
          if (!feetP || !headP) continue;
          const feet = { x: gameRect.left + feetP.x, y: gameRect.top + feetP.y };
          const head = { x: gameRect.left + headP.x, y: gameRect.top + headP.y };

          const boxHeight = feet.y - head.y;
          if (boxHeight <= 4 || boxHeight > h * 1.6) continue;

          const boxWidth = Math.max(8, boxHeight * 0.44);
          const boxLeft = feet.x - boxWidth / 2;
          const boxTop = head.y;

          // Frustum culling: skip if offscreen
          if (boxLeft + boxWidth < -80 || boxLeft > w + 80 || boxTop + boxHeight < -80 || boxTop > h + 80) continue;

          ctx.save();

          // A. Snapline (tracer line from bottom center to zombie feet)
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 23, 68, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.moveTo(w / 2, h - 18);
          ctx.lineTo(feet.x, feet.y);
          ctx.stroke();

          // B. Semi-transparent background fill
          ctx.fillStyle = 'rgba(255, 23, 68, 0.08)';
          ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);

          // C. Tactical Corner Brackets (Modern Cyber ESP Aesthetics)
          ctx.strokeStyle = '#ff1744';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff1744';
          ctx.shadowBlur = 6;
          const cornerLen = Math.min(16, boxWidth * 0.35);

          // Top-Left Corner
          ctx.beginPath();
          ctx.moveTo(boxLeft, boxTop + cornerLen);
          ctx.lineTo(boxLeft, boxTop);
          ctx.lineTo(boxLeft + cornerLen, boxTop);
          ctx.stroke();

          // Top-Right Corner
          ctx.beginPath();
          ctx.moveTo(boxLeft + boxWidth - cornerLen, boxTop);
          ctx.lineTo(boxLeft + boxWidth, boxTop);
          ctx.lineTo(boxLeft + boxWidth, boxTop + cornerLen);
          ctx.stroke();

          // Bottom-Left Corner
          ctx.beginPath();
          ctx.moveTo(boxLeft, boxTop + boxHeight - cornerLen);
          ctx.lineTo(boxLeft, boxTop + boxHeight);
          ctx.lineTo(boxLeft + cornerLen, boxTop + boxHeight);
          ctx.stroke();

          // Bottom-Right Corner
          ctx.beginPath();
          ctx.moveTo(boxLeft + boxWidth - cornerLen, boxTop + boxHeight);
          ctx.lineTo(boxLeft + boxWidth, boxTop + boxHeight);
          ctx.lineTo(boxLeft + boxWidth, boxTop + boxHeight - cornerLen);
          ctx.stroke();

          // D. Head Critical Hit Marker (Neon diamond on head)
          ctx.fillStyle = '#00e5ff';
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(head.x, head.y + 4, 3, 0, Math.PI * 2);
          ctx.fill();

          // E. Mini Vertical Health Bar (Left of box)
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
          ctx.fillRect(boxLeft - 7, boxTop, 4, boxHeight);
          ctx.fillStyle = '#00e676';
          ctx.fillRect(boxLeft - 6, boxTop + 1, 2, boxHeight - 2);

          // F. Target Info Badge (Below feet: Distance in meters)
          const badgeText = `💀 ${z.distMeters}m`;
          ctx.font = 'bold 10px monospace';
          const textW = ctx.measureText(badgeText).width;
          ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
          ctx.fillRect(feet.x - textW / 2 - 4, feet.y + 4, textW + 8, 16);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(badgeText, feet.x - textW / 2, feet.y + 16);

          ctx.restore();
        }
      }

      // 3. Top HUD Scanner Status
      ctx.save();
      ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.75)';
      ctx.lineWidth = 1.5;
      const bannerW = 380;
      const bannerH = 34;
      const bannerX = (w - bannerW) / 2;
      ctx.beginPath();
      ctx.roundRect(bannerX, 16, bannerW, bannerH, 6);
      ctx.fill();
      ctx.stroke();

      // Pulsing indicator dot
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bannerX + 20, 33, 5, 0, Math.PI * 2);
      ctx.fill();

      // Banner text with live hostile counter
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText(`REAL ZOMBIE ESP // ${zombies.length} HOSTILES ACTIVE`, bannerX + 36, 38);
      ctx.restore();

      // 4. Tactical 360° Threat Radar (Top Right)
      const radarR = 68;
      const radarX = w - radarR - 28;
      const radarY = radarR + 28;

      ctx.save();
      ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Range rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      [0.35, 0.7].forEach(ratio => {
        ctx.beginPath();
        ctx.arc(radarX, radarY, radarR * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis cross
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(radarX - radarR, radarY); ctx.lineTo(radarX + radarR, radarY);
      ctx.moveTo(radarX, radarY - radarR); ctx.lineTo(radarX, radarY + radarR);
      ctx.stroke();

      // Rotating Scanner Sweep
      const sweepGrad = ctx.createConicGradient(scanAngle, radarX, radarY);
      sweepGrad.addColorStop(0, 'rgba(255, 23, 68, 0.35)');
      sweepGrad.addColorStop(0.2, 'transparent');
      sweepGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarR - 1, 0, Math.PI * 2);
      ctx.fill();

      // Cardinal directions
      ctx.fillStyle = '#8b98a5';
      ctx.font = '9px monospace';
      ctx.fillText('N', radarX - 3, radarY - radarR + 12);
      ctx.fillText('S', radarX - 3, radarY + radarR - 4);
      ctx.fillText('E', radarX + radarR - 12, radarY + 3);
      ctx.fillText('W', radarX - radarR + 4, radarY + 3);

      // Player center blip (green)
      ctx.fillStyle = '#00e676';
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(radarX, radarY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Plot REAL Live Zombies on Radar using Engine Basis (NO FAKE BLIPS!)
      if (cam && cam.valid) {
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#ff1744';

        const maxRadarDist = 2800; // ~70 meters max radar view

        for (const z of zombies) {
          const rDx = z.x - cam.x;
          const rDy = z.y - cam.y;

          // Project delta onto camera horizontal forward and right vectors:
          const relForward = rDx * cam.fwd.x   + rDy * cam.fwd.y;
          const relRight   = rDx * cam.right.x + rDy * cam.right.y;

          const dist2D = Math.hypot(relForward, relRight);
          const scale = Math.min(radarR - 6, (dist2D / maxRadarDist) * (radarR - 6)) / (dist2D || 1);

          // Straight ahead (+relForward) maps to UP on radar (-Y)
          // Right (+relRight) maps to RIGHT on radar (+X)
          const rx = radarX + relRight * scale;
          const ry = radarY - relForward * scale;

          ctx.beginPath();
          ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Plot Teammates on Radar as Cyan / Red blips
        if (hasCoop) {
          for (const tm of this.coopPlayers) {
            if (typeof tm.x !== 'number') continue;
            const rDx = tm.x - cam.x;
            const rDy = tm.y - cam.y;
            const relForward = rDx * cam.fwd.x   + rDy * cam.fwd.y;
            const relRight   = rDx * cam.right.x + rDy * cam.right.y;
            const dist2D = Math.hypot(relForward, relRight);
            const scale = Math.min(radarR - 6, (dist2D / 2800) * (radarR - 6)) / (dist2D || 1);
            const rx = radarX + relRight * scale;
            const ry = radarY - relForward * scale;

            ctx.save();
            ctx.shadowColor = tm.isHost ? '#ef4444' : '#00e5ff';
            ctx.shadowBlur = 9;
            ctx.fillStyle = tm.isHost ? '#ef4444' : '#00e5ff';
            ctx.beginPath();
            ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      ctx.restore();

      // 6. Central Tactical Target Tracker Brackets
      ctx.save();
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = closestZombie ? '#ff1744' : 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.2;
      const rSize = 24;
      ctx.beginPath();
      ctx.moveTo(cx - rSize, cy - rSize + 8); ctx.lineTo(cx - rSize, cy - rSize); ctx.lineTo(cx - rSize + 8, cy - rSize);
      ctx.moveTo(cx + rSize - 8, cy - rSize); ctx.lineTo(cx + rSize, cy - rSize); ctx.lineTo(cx + rSize, cy - rSize + 8);
      ctx.moveTo(cx - rSize, cy + rSize - 8); ctx.lineTo(cx - rSize, cy + rSize); ctx.lineTo(cx - rSize + 8, cy + rSize);
      ctx.moveTo(cx + rSize - 8, cy + rSize); ctx.lineTo(cx + rSize, cy + rSize); ctx.lineTo(cx + rSize, cy + rSize - 8);
      ctx.stroke();

      ctx.fillStyle = closestZombie ? '#ff1744' : 'rgba(0, 229, 255, 0.7)';
      ctx.font = '10px monospace';
      const lockText = closestZombie ? `[LOCKED: ${closestZombie.distMeters}m]` : '[SCANNER ACTIVE]';
      const lockW = ctx.measureText(lockText).width;
      ctx.fillText(lockText, cx - lockW / 2, cy + rSize + 16);
      ctx.restore();

      this.espAnimFrame = requestAnimationFrame(render);
    };

    if (this.espAnimFrame) cancelAnimationFrame(this.espAnimFrame);
    this.espAnimFrame = requestAnimationFrame(render);
  }

  stopESPOverlay() {
    const canvas = document.getElementById('modmenu-esp-canvas');
    if (canvas) {
      canvas.classList.remove('active');
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Only cancel the animation frame if no background weapon mods are active
    if (!this.state.noRecoil && !this.state.bulletRange && !this.state.oneHit) {
      if (this.espAnimFrame) {
        cancelAnimationFrame(this.espAnimFrame);
        this.espAnimFrame = null;
      }
    }
  }

  toggleNoReload(enabled = !this.state.noReload) {
    this.state.noReload = enabled;
    if (enabled) {
      this.cmd('player_sustainAmmo 1');
      this.setDvar('perk_weapReloadMultiplier', '0.001');
      this.toast('No Reload: ON');
    } else {
      if (!this.state.ammo) this.cmd('player_sustainAmmo 0');
      this.setDvar('perk_weapReloadMultiplier', '1');
      this.toast('No Reload: OFF', false);
    }
    this.updateCardUI('noReload', this.state.noReload);
  }

  // --- No Recoil Implementation (Reverse-engineered WeaponDef & ViewKick / GunKick) ---
  toggleNoRecoil(enabled = !this.state.noRecoil) {
    this.state.noRecoil = enabled;
    this.applyNoRecoilDvars(enabled);
    this.applyWeaponMemoryMods();
    if (enabled && !this.espAnimFrame) {
      this.startESPOverlay();
    } else if (!enabled && !this.state.esp && !this.state.bulletRange && !this.state.oneHit) {
      this.stopESPOverlay();
    }
    this.toast(`No Recoil: ${enabled ? 'ON' : 'OFF'}`);
    this.updateCardUI('noRecoil', this.state.noRecoil);
  }

  applyNoRecoilDvars(enable = true) {
    const mod = globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
    const buf = mod?.HEAPU8?.buffer || mod?.HEAPF32?.buffer || mod?.wasmMemory?.buffer || mod?.buffer;
    if (buf) {
      const u32 = new Uint32Array(buf);
      const f32 = new Float32Array(buf);
      const setDvarFloat = (ptrAddr, val) => {
        const dvarPtr = u32[ptrAddr >> 2];
        if (dvarPtr > 0 && dvarPtr < buf.byteLength - 64) {
          f32[(dvarPtr + 24) >> 2] = val; // current.value
          f32[(dvarPtr + 28) >> 2] = val; // latched.value
        }
      };

      if (enable) {
        setDvarFloat(0xad8e70, 0.0); // bg_viewKickScale
        setDvarFloat(0xad8e74, 0.0); // bg_viewKickMax
        setDvarFloat(0xad8e78, 0.0); // bg_viewKickMin
        setDvarFloat(0xad8e7c, 0.0); // bg_viewKickRandom
        setDvarFloat(0xae91e4, 0.0001); // perk_weapSpreadMultiplier
        setDvarFloat(0xad6df8, 0.0); // jump_spreadAdd
      } else {
        setDvarFloat(0xad8e70, 0.2);
        setDvarFloat(0xad8e74, 90.0);
        setDvarFloat(0xad8e78, 0.5);
        setDvarFloat(0xad8e7c, 0.4);
        setDvarFloat(0xae91e4, 1.0);
        setDvarFloat(0xad6df8, 2.0);
      }
    }

    if (enable) {
      this.setDvar('bg_viewKickScale', '0');
      this.setDvar('bg_viewKickMin', '0');
      this.setDvar('bg_viewKickMax', '0');
      this.setDvar('bg_viewKickRandom', '0');
      this.setDvar('perk_weapSpreadMultiplier', '0.0001');
      this.setDvar('jump_spreadAdd', '0');
      this.setDvar('bg_aimSpreadMoveSpeedThreshold', '9999');
      this.setDvar('bg_bobMax', '0');
      this.setDvar('bg_weaponBobMax', '0');
      this.setDvar('bg_weaponBobAmplitudeBase', '0');
      this.setDvar('bg_viewBobAmplitudeBase', '0');
      this.cmd('specialty_bulletaccuracy 1');
    } else {
      this.setDvar('bg_viewKickScale', '0.2');
      this.setDvar('bg_viewKickMin', '0.5');
      this.setDvar('bg_viewKickMax', '90');
      this.setDvar('bg_viewKickRandom', '0.4');
      this.setDvar('perk_weapSpreadMultiplier', '1');
      this.setDvar('jump_spreadAdd', '2');
      this.setDvar('bg_bobMax', '8');
      this.setDvar('bg_weaponBobMax', '8');
      this.setDvar('bg_weaponBobAmplitudeBase', '1');
      this.setDvar('bg_viewBobAmplitudeBase', '1');
    }
  }

  // --- Master WeaponDef In-Memory Patcher (Recoil, Spread, Range, and Damage) ---
  applyWeaponMemoryMods() {
    try {
      const mod = globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
      if (!mod) return;
      const buf = mod.HEAPU8?.buffer || mod.HEAPF32?.buffer || mod.wasmMemory?.buffer || mod.buffer;
      if (!buf) return;
      const u32 = new Uint32Array(buf);
      const f32 = new Float32Array(buf);

      // In KisakBlack-web.wasm:
      // 0xb05db8 = bg_lastParsedWeaponIndex (count of weapons loaded)
      // 0xb05dc0 = bg_weaponDefs (array of WeaponVariantDef pointers)
      const maxWeapon = u32[0xb05db8 >> 2] || 0;
      if (maxWeapon <= 0 || maxWeapon > 256) return;

      if (!this.origWeaponDefs) this.origWeaponDefs = new Map();

      for (let i = 0; i <= maxWeapon; i++) {
        const entryPtr = u32[(0xb05dc0 + i * 4) >> 2];
        if (!entryPtr || entryPtr < 1024 || entryPtr >= buf.byteLength - 2048) continue;
        const weapDef = u32[(entryPtr + 8) >> 2];
        if (!weapDef || weapDef < 1024 || weapDef >= buf.byteLength - 2048) continue;

        // Backup clean original parameters on first encounter
        if (!this.origWeaponDefs.has(weapDef)) {
          this.origWeaponDefs.set(weapDef, {
            viewKickScale: f32[(weapDef + 1676) >> 2],
            viewKickPitchMin: f32[(weapDef + 1680) >> 2],
            viewKickPitchMax: f32[(weapDef + 1684) >> 2],
            viewKickYawMin: f32[(weapDef + 1688) >> 2],
            viewKickYawMax: f32[(weapDef + 1692) >> 2],
            gunKickPitchMin: f32[(weapDef + 1712) >> 2],
            gunKickPitchMax: f32[(weapDef + 1716) >> 2],
            gunKickYawMin: f32[(weapDef + 1720) >> 2],
            gunKickYawMax: f32[(weapDef + 1724) >> 2],
            adsViewKickScale: f32[(weapDef + 1744) >> 2],
            adsViewKickPitchMin: f32[(weapDef + 1748) >> 2],
            adsViewKickPitchMax: f32[(weapDef + 1752) >> 2],
            adsViewKickYawMin: f32[(weapDef + 1756) >> 2],
            adsViewKickYawMax: f32[(weapDef + 1760) >> 2],
            adsGunKickPitchMin: f32[(weapDef + 1780) >> 2],
            adsGunKickPitchMax: f32[(weapDef + 1784) >> 2],
            adsGunKickYawMin: f32[(weapDef + 1788) >> 2],
            adsGunKickYawMax: f32[(weapDef + 1792) >> 2],
            fAdsSpread: f32[(weapDef + 1160) >> 2],
            fHipSpreadStandMin: f32[(weapDef + 1228) >> 2],
            fHipSpreadStandMax: f32[(weapDef + 1232) >> 2],
            fHipSpreadDuckedMin: f32[(weapDef + 1236) >> 2],
            fHipSpreadDuckedMax: f32[(weapDef + 1240) >> 2],
            fHipSpreadProneMin: f32[(weapDef + 1244) >> 2],
            fHipSpreadProneMax: f32[(weapDef + 1248) >> 2],
            range: f32[(weapDef + 840) >> 2],
            damage: u32[(weapDef + 860) >> 2],
            minDamage: u32[(weapDef + 1952) >> 2],
            maxDamageRange: f32[(weapDef + 1960) >> 2],
            minDamageRange: f32[(weapDef + 1964) >> 2]
          });
        }

        const orig = this.origWeaponDefs.get(weapDef);

        // --- 1. RECOIL & SPREAD MODIFICATIONS ---
        if (this.state.noRecoil) {
          // Zero out all view kick (hip & ads)
          f32[(weapDef + 1676) >> 2] = 0.0;
          f32[(weapDef + 1680) >> 2] = 0.0;
          f32[(weapDef + 1684) >> 2] = 0.0;
          f32[(weapDef + 1688) >> 2] = 0.0;
          f32[(weapDef + 1692) >> 2] = 0.0;
          f32[(weapDef + 1744) >> 2] = 0.0;
          f32[(weapDef + 1748) >> 2] = 0.0;
          f32[(weapDef + 1752) >> 2] = 0.0;
          f32[(weapDef + 1756) >> 2] = 0.0;
          f32[(weapDef + 1760) >> 2] = 0.0;
          // Zero out all gun model kick (hip & ads)
          f32[(weapDef + 1712) >> 2] = 0.0;
          f32[(weapDef + 1716) >> 2] = 0.0;
          f32[(weapDef + 1720) >> 2] = 0.0;
          f32[(weapDef + 1724) >> 2] = 0.0;
          f32[(weapDef + 1780) >> 2] = 0.0;
          f32[(weapDef + 1784) >> 2] = 0.0;
          f32[(weapDef + 1788) >> 2] = 0.0;
          f32[(weapDef + 1792) >> 2] = 0.0;
          // Zero out spread (perfect laser accuracy)
          f32[(weapDef + 1160) >> 2] = 0.0;
          f32[(weapDef + 1228) >> 2] = 0.0;
          f32[(weapDef + 1232) >> 2] = 0.0;
          f32[(weapDef + 1236) >> 2] = 0.0;
          f32[(weapDef + 1240) >> 2] = 0.0;
          f32[(weapDef + 1244) >> 2] = 0.0;
          f32[(weapDef + 1248) >> 2] = 0.0;
        } else if (orig) {
          f32[(weapDef + 1676) >> 2] = orig.viewKickScale;
          f32[(weapDef + 1680) >> 2] = orig.viewKickPitchMin;
          f32[(weapDef + 1684) >> 2] = orig.viewKickPitchMax;
          f32[(weapDef + 1688) >> 2] = orig.viewKickYawMin;
          f32[(weapDef + 1692) >> 2] = orig.viewKickYawMax;
          f32[(weapDef + 1744) >> 2] = orig.adsViewKickScale;
          f32[(weapDef + 1748) >> 2] = orig.adsViewKickPitchMin;
          f32[(weapDef + 1752) >> 2] = orig.adsViewKickPitchMax;
          f32[(weapDef + 1756) >> 2] = orig.adsViewKickYawMin;
          f32[(weapDef + 1760) >> 2] = orig.adsViewKickYawMax;
          f32[(weapDef + 1712) >> 2] = orig.gunKickPitchMin;
          f32[(weapDef + 1716) >> 2] = orig.gunKickPitchMax;
          f32[(weapDef + 1720) >> 2] = orig.gunKickYawMin;
          f32[(weapDef + 1724) >> 2] = orig.gunKickYawMax;
          f32[(weapDef + 1780) >> 2] = orig.adsGunKickPitchMin;
          f32[(weapDef + 1784) >> 2] = orig.adsGunKickPitchMax;
          f32[(weapDef + 1788) >> 2] = orig.adsGunKickYawMin;
          f32[(weapDef + 1792) >> 2] = orig.adsGunKickYawMax;
          f32[(weapDef + 1160) >> 2] = orig.fAdsSpread;
          f32[(weapDef + 1228) >> 2] = orig.fHipSpreadStandMin;
          f32[(weapDef + 1232) >> 2] = orig.fHipSpreadStandMax;
          f32[(weapDef + 1236) >> 2] = orig.fHipSpreadDuckedMin;
          f32[(weapDef + 1240) >> 2] = orig.fHipSpreadDuckedMax;
          f32[(weapDef + 1244) >> 2] = orig.fHipSpreadProneMin;
          f32[(weapDef + 1248) >> 2] = orig.fHipSpreadProneMax;
        }

        // --- 2. BULLET RANGE & PENETRATION MODIFICATIONS ---
        if (this.state.bulletRange) {
          f32[(weapDef + 840) >> 2]  = 65536.0; // range
          f32[(weapDef + 1960) >> 2] = 65536.0; // maxDamageRange
          f32[(weapDef + 1964) >> 2] = 65536.0; // minDamageRange
          if (!this.state.oneHit) {
            u32[(weapDef + 1952) >> 2] = u32[(weapDef + 860) >> 2]; // minDamage = damage (no dropoff)
          }
        } else if (orig && !this.state.oneHit) {
          f32[(weapDef + 840) >> 2]  = orig.range;
          f32[(weapDef + 1960) >> 2] = orig.maxDamageRange;
          f32[(weapDef + 1964) >> 2] = orig.minDamageRange;
          u32[(weapDef + 1952) >> 2] = orig.minDamage;
        }

        // --- 3. ONE HIT KILL DAMAGE MODIFICATIONS ---
        if (this.state.oneHit) {
          u32[(weapDef + 860) >> 2]  = 99999; // fatal base damage
          u32[(weapDef + 1952) >> 2] = 99999; // fatal min damage
        } else if (orig && !this.state.bulletRange) {
          u32[(weapDef + 860) >> 2]  = orig.damage;
          u32[(weapDef + 1952) >> 2] = orig.minDamage;
        }
      }
    } catch (e) {
      console.warn('[MODMENU] applyWeaponMemoryMods error:', e);
    }
  }

  // --- Bullet Range Multiplier Implementation (Extreme distance & full penetration) ---
  toggleBulletRange(enabled = !this.state.bulletRange) {
    this.state.bulletRange = enabled;
    this.applyBulletRangeDvars(enabled);
    this.applyWeaponMemoryMods();
    if (enabled && !this.espAnimFrame) {
      this.startESPOverlay();
    } else if (!enabled && !this.state.esp && !this.state.noRecoil && !this.state.oneHit) {
      this.stopESPOverlay();
    }
    this.toast(`Bullet Range & Pen: ${enabled ? 'ON' : 'OFF'}`);
    this.updateCardUI('bulletRange', this.state.bulletRange);
  }

  applyBulletRangeDvars(enable = true) {
    const mod = globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
    const buf = mod?.HEAPU8?.buffer || mod?.HEAPF32?.buffer || mod?.wasmMemory?.buffer || mod?.buffer;
    if (buf) {
      const u32 = new Uint32Array(buf);
      const f32 = new Float32Array(buf);
      const setDvarFloat = (ptrAddr, val) => {
        const dvarPtr = u32[ptrAddr >> 2];
        if (dvarPtr > 0 && dvarPtr < buf.byteLength - 64) {
          f32[(dvarPtr + 24) >> 2] = val; // current.value
          f32[(dvarPtr + 28) >> 2] = val; // latched.value
        }
      };
      const setDvarBool = (ptrAddr, val) => {
        const dvarPtr = u32[ptrAddr >> 2];
        if (dvarPtr > 0 && dvarPtr < buf.byteLength - 64) {
          u32[(dvarPtr + 24) >> 2] = val ? 1 : 0;
          u32[(dvarPtr + 28) >> 2] = val ? 1 : 0;
        }
      };

      if (enable) {
        setDvarFloat(0x87c3fc0, 65536.0); // bulletrange
        setDvarBool(0x52f55a8, true);     // bullet_penetrationEnabled
        setDvarFloat(0xae9200, 30.0);    // perk_bulletPenetrationMultiplier
        setDvarFloat(0xad9128, 0.0);     // bullet_penetrationMinFxDist
      } else {
        setDvarFloat(0x87c3fc0, 8192.0);
        setDvarBool(0x52f55a8, true);
        setDvarFloat(0xae9200, 1.0);
        setDvarFloat(0xad9128, 30.0);
      }
    }

    if (enable) {
      this.setDvar('bullet_penetrationEnabled', '1');
      this.setDvar('perk_bulletPenetrationMultiplier', '30'); // domain: 0 to 30
      this.setDvar('bullet_penetrationMinFxDist', '0');
      this.setDvar('bulletrange', '65536'); // domain: 0 to 65536
      this.setDvar('defaultHitDamage', '200'); // domain: 1 to 200
      this.setDvar('bg_forceExplosiveBullets', '1');
      this.setDvar('aim_aimAssistRangeScale', '10');
      this.setDvar('aim_autoAimRangeScale', '10');
      this.setDvar('player_meleeRange', '1000');
      this.setDvar('meleeChargeRange', '1000');
      this.cmd('specialty_bulletpenetration 1; specialty_bulletdamage 1; specialty_bulletaccuracy 1');
    } else {
      this.setDvar('bullet_penetrationEnabled', '1');
      this.setDvar('perk_bulletPenetrationMultiplier', '1');
      this.setDvar('bullet_penetrationMinFxDist', '30');
      this.setDvar('bulletrange', '8192');
      this.setDvar('defaultHitDamage', '100');
      if (!this.state.oneHit) this.setDvar('bg_forceExplosiveBullets', '0');
      this.setDvar('aim_aimAssistRangeScale', '1');
      this.setDvar('aim_autoAimRangeScale', '1');
      this.setDvar('player_meleeRange', '64');
      this.setDvar('meleeChargeRange', '64');
    }
  }

  toggleNoClip(enabled = !this.state.noClip) {
    this.state.noClip = enabled;
    this.cmd('noclip');
    this.toast(`No Clip: ${this.state.noClip ? 'ON' : 'OFF'}`);
    this.updateCardUI('noClip', this.state.noClip);
  }

  toggleFreezeZombies(enabled = !this.state.freezeZombies) {
    this.state.freezeZombies = enabled;
    this.cmd(enabled ? 'ai_disableSpawn 1' : 'ai_disableSpawn 0');
    this.toast(`Freeze Spawns: ${enabled ? 'ON' : 'OFF'}`);
    this.updateCardUI('freezeZombies', this.state.freezeZombies);
  }

  toggleFullbright(enabled = !this.state.fullbright) {
    this.state.fullbright = enabled;
    this.cmd(enabled ? 'r_fullbright 1' : 'r_fullbright 0');
    this.toast(`Fullbright: ${enabled ? 'ON' : 'OFF'}`);
    this.updateCardUI('fullbright', this.state.fullbright);
  }

  toggleThirdPerson(enabled = !this.state.thirdPerson) {
    this.state.thirdPerson = enabled;
    this.cmd(enabled ? 'cg_thirdPerson 1' : 'cg_thirdPerson 0');
    this.toast(`Third Person: ${enabled ? 'ON' : 'OFF'}`);
    this.updateCardUI('thirdPerson', this.state.thirdPerson);
  }

  setSpeed(val) {
    this.state.speed = Number(val);
    this.cmd(`g_speed ${this.state.speed}`);
    this.setDvar('g_speed', String(this.state.speed));
    this.toast(`Speed: ${this.state.speed}`);

    const input = document.getElementById('mod-speed-range');
    const valText = document.getElementById('mod-speed-val');
    if (input) input.value = this.state.speed;
    if (valText) valText.textContent = `${this.state.speed} (${(this.state.speed / 190).toFixed(1)}x)`;

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.speed) === this.state.speed);
    });
  }

  setFov(val) {
    this.state.fov = Number(val);
    this.cmd(`cg_fov ${this.state.fov}`);
    const valText = document.getElementById('mod-fov-val');
    if (valText) valText.textContent = `${this.state.fov}°`;
  }

  giveWeapon(weaponId, weaponName) {
    this.cmd(`give ${weaponId}`);
    this.cmd('give ammo');
    this.toast(`Equipped: ${weaponName || weaponId}`);
    setTimeout(() => this.applyWeaponMemoryMods(), 100);
  }

  syncAllUI() {
    const keys = ['god', 'ammo', 'noRecoil', 'bulletRange', 'oneHit', 'noReload', 'esp', 'freezeZombies', 'fullbright', 'noClip', 'thirdPerson'];
    keys.forEach(k => {
      this.updateCardUI(k, !!this.state[k]);
    });
    const speedInput = document.getElementById('mod-speed-range');
    const speedVal = document.getElementById('mod-speed-val');
    if (speedInput) speedInput.value = this.state.speed || 190;
    if (speedVal) speedVal.textContent = this.state.speed || 190;

    const fovInput = document.getElementById('mod-fov-range');
    const fovVal = document.getElementById('mod-fov-val');
    if (fovInput) fovInput.value = this.state.fov || 65;
    if (fovVal) fovVal.textContent = `${this.state.fov || 65}°`;
  }

  updateCardUI(key, active) {
    const check = document.getElementById(`check-${key}`);
    if (check) check.classList.toggle('checked', active);
    const row = document.getElementById(`row-${key}`);
    if (row) row.classList.toggle('active', active);
  }

  // --- Toggle Mod Menu Window ---
  toggle() {
    this.ensureMounted();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.ensureMounted();
    this.isOpen = true;
    const overlay = document.getElementById('modmenu-overlay');
    if (overlay) overlay.classList.add('active');
    this.syncAllUI();

    // Unlock mouse so player can interact with the menu
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch (e) {}

    this.log('Mod Menu opened with [INSERT / F1]');
  }

  close() {
    this.isOpen = false;
    const overlay = document.getElementById('modmenu-overlay');
    if (overlay) overlay.classList.remove('active');

    // Clicking canvas will re-lock pointer automatically
    const canvas = document.getElementById('game');
    if (canvas) canvas.focus();

    this.log('Mod Menu closed');
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.dev-tab-btn, .mod-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.dev-content, .mod-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  renderWeaponsGrid() {
    const grid = document.getElementById('modmenu-weapons-grid');
    if (!grid) return;

    const query = this.searchQuery.toLowerCase().trim();
    const cat = this.categoryFilter;

    const filtered = WEAPONS_DB.filter(w => {
      const matchCat = cat === 'all' || w.cat === cat || (cat === 'pap' && w.cat === 'pap');
      const matchSearch = !query || 
                          w.name.toLowerCase().includes(query) || 
                          w.id.toLowerCase().includes(query) || 
                          (w.pap && w.pap.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="dev-weapons-empty">No weapons found</div>';
      return;
    }

    grid.innerHTML = filtered.map(w => {
      const isWonder = w.cat === 'wonder';
      const isPap = w.cat === 'pap';
      const cardClass = isWonder ? 'dev-weapon-card wonder' : isPap ? 'dev-weapon-card pap' : 'dev-weapon-card';
      const badgeText = isWonder ? 'WONDER' : isPap ? 'PAP' : w.cat.toUpperCase();
      
      const imgHtml = w.img
        ? `<div class="dev-weapon-img-wrap">
             <img src="/bo1z/gunimages/${encodeURIComponent(w.img)}" 
                  alt="${w.name}" 
                  class="dev-weapon-img" 
                  loading="lazy"
                  onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
             <div class="dev-weapon-icon-fallback" style="display:none;">
               ${getWeaponSvg(w.type, w.cat)}
             </div>
           </div>`
        : `<div class="dev-weapon-img-wrap fallback">
             <div class="dev-weapon-icon-fallback">
               ${getWeaponSvg(w.type, w.cat)}
             </div>
           </div>`;

      return `
        <div class="${cardClass}" data-id="${w.id}">
          <div class="dev-weapon-top">
            <span class="dev-weapon-badge">${badgeText}</span>
          </div>
          ${imgHtml}
          <div class="dev-weapon-info">
            <div class="dev-weapon-name" title="${w.name}">${w.name}</div>
            ${w.pap ? `<div class="dev-weapon-sub" title="${w.pap}">${w.pap}</div>` : ''}
          </div>
          <button class="dev-weapon-btn" onclick="window.__modMenu.giveWeapon('${w.id}', '${w.name.replace(/'/g, "\\'")}')">
            EQUIP
          </button>
        </div>
      `;
    }).join('');
  }

  // --- HTML Injection ---
  init() {
    document.getElementById('modmenu-badge')?.remove();
    document.getElementById('modmenu-overlay')?.remove();
    document.getElementById('modmenu-toasts')?.remove();
    document.getElementById('coop-scoreboard-overlay')?.remove();

    // 1. Watermark Floating Badge (Bottom-Right matching photo)
    const badge = document.createElement('div');
    badge.id = 'modmenu-badge';
    badge.title = 'Click or Press INSERT / F1 to toggle';
    badge.innerHTML = `
      <span class="badge-icon">🌸</span>
      <div class="badge-info">
        <span class="badge-title">devonch</span>
        <span class="badge-version">v2.5.2</span>
      </div>
      <span class="badge-key">INSERT / F1</span>
    `;
    const handleBadgeClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } catch (err) {}
      this.toggle();
    };
    badge.onclick = handleBadgeClick;
    badge.onmousedown = handleBadgeClick;
    document.body.appendChild(badge);

    // 2. Co-Op Scoreboard Overlay (TAB)
    const scoreboard = document.createElement('div');
    scoreboard.id = 'coop-scoreboard-overlay';
    scoreboard.innerHTML = `
      <div class="coop-sb-header">
        <div class="coop-sb-title">
          <span>💀</span>
          <span>BLACK OPS ZOMBIES // CO-OP SCOREBOARD</span>
        </div>
        <div style="font-size: 11px; color: #fca5a5;">[HOLD TAB TO VIEW]</div>
      </div>
      <table class="coop-sb-table">
        <thead>
          <tr>
            <th>PLAYER</th>
            <th>POINTS</th>
            <th>KILLS</th>
            <th>HEADSHOTS</th>
            <th>STATUS</th>
            <th>PING</th>
          </tr>
        </thead>
        <tbody id="coop-sb-tbody"></tbody>
      </table>
    `;
    document.body.appendChild(scoreboard);


    // 2. Toasts Container
    const toasts = document.createElement('div');
    toasts.id = 'modmenu-toasts';
    document.body.appendChild(toasts);

    // 3. Online Party Squad HUD (if in active multiplayer room)
    try {
      const partyData = sessionStorage.getItem('bo1z-online-party');
      if (partyData) {
        const party = JSON.parse(partyData);
        if (party && party.room) {
          const squad = document.createElement('div');
          squad.id = 'lobby-ingame-squad';
          squad.innerHTML = `
            <span style="font-size: 15px;">👥</span>
            <div>
              <strong style="color: #ffffff;">${party.room.name}</strong>
              <span style="color: #c084fc; font-size: 11px; margin-left: 6px;">[${party.room.id}]</span>
              <div style="font-size: 10.5px; color: #10b981; display: flex; align-items: center; gap: 4px; margin-top: 1px;">
                <span style="width: 5px; height: 5px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                <span>${party.isHost ? '👑 HOST' : 'MEMBER'} // ${(party.room.players || []).length} Players</span>
              </div>
            </div>
          `;
          document.body.appendChild(squad);
        }
      }
    } catch (e) {}


    // 3. Modal Overlay (Minimalist 3-Column Layout from photo)
    const overlay = document.createElement('div');
    overlay.id = 'modmenu-overlay';
    overlay.innerHTML = `
      <div id="modmenu-modal">
        <!-- Top Bar matching photo -->
        <div class="dev-header">
          <div class="dev-header-left">
            <span class="dev-logo-icon">🌸</span>
            <span class="dev-brand-name">devonch</span>
          </div>

          <!-- Segmented Tab Pill -->
          <div class="dev-tabs">
            <button class="dev-tab-btn active" data-tab="cheats">Cheats</button>
            <button class="dev-tab-btn" data-tab="weapons">Weapons</button>
            <button class="dev-tab-btn" data-tab="console">Console</button>
          </div>

          <!-- Close Icon -->
          <button class="dev-close-btn" onclick="window.__modMenu.close()">✕</button>
        </div>

        <!-- TAB 1: Cheats (3-Column Layout exactly like photo) -->
        <div class="dev-content active" id="tab-cheats">
          <div class="dev-columns-grid">
            <!-- Column 1: Combat -->
            <div class="dev-col">
              <div class="dev-section-title"><span>Combat</span><span class="dev-status-pill">ON</span></div>
              <div class="dev-rows-list">
                <div class="dev-row" id="row-god" onclick="window.__modMenu.toggleGod()">
                  <div class="dev-check-circle" id="check-god">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">God Mode</span>
                </div>

                <div class="dev-row" id="row-ammo" onclick="window.__modMenu.toggleAmmo()">
                  <div class="dev-check-circle" id="check-ammo">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Infinite Ammo</span>
                </div>

                <div class="dev-row" id="row-noRecoil" onclick="window.__modMenu.toggleNoRecoil()">
                  <div class="dev-check-circle" id="check-noRecoil">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">No Recoil</span>
                </div>

                <div class="dev-row" id="row-bulletRange" onclick="window.__modMenu.toggleBulletRange()">
                  <div class="dev-check-circle" id="check-bulletRange">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Bullet Range & Pen</span>
                </div>

                <div class="dev-row" id="row-oneHit" onclick="window.__modMenu.toggleOneHit()">
                  <div class="dev-check-circle" id="check-oneHit">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">One Hit Kill</span>
                </div>

                <div class="dev-row" id="row-noReload" onclick="window.__modMenu.toggleNoReload()">
                  <div class="dev-check-circle" id="check-noReload">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">No Reload</span>
                </div>
              </div>
            </div>

            <!-- Column 2: Visuals & World -->
            <div class="dev-col">
              <div class="dev-section-title"><span>Visuals & World</span><span class="dev-status-pill">ON</span></div>
              <div class="dev-rows-list">
                <div class="dev-row" id="row-esp" onclick="window.__modMenu.toggleESP()">
                  <div class="dev-check-circle" id="check-esp">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Zombie Box ESP</span>
                </div>

                <div class="dev-row" id="row-freezeZombies" onclick="window.__modMenu.toggleFreezeZombies()">
                  <div class="dev-check-circle" id="check-freezeZombies">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Freeze Spawns</span>
                </div>

                <div class="dev-row" id="row-fullbright" onclick="window.__modMenu.toggleFullbright()">
                  <div class="dev-check-circle" id="check-fullbright">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Fullbright</span>
                </div>

                <div class="dev-row" id="row-noClip" onclick="window.__modMenu.toggleNoClip()">
                  <div class="dev-check-circle" id="check-noClip">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">No Clip</span>
                </div>

                <div class="dev-row" id="row-thirdPerson" onclick="window.__modMenu.toggleThirdPerson()">
                  <div class="dev-check-circle" id="check-thirdPerson">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span class="dev-row-text">Third Person</span>
                </div>
              </div>
            </div>

            <!-- Column 3: Tuning & Quick Actions -->
            <div class="dev-col">
              <div class="dev-section-title"><span>Tuning</span></div>
              <div class="dev-tuning-list">
                <!-- Speed Slider -->
                <div class="dev-slider-item">
                  <div class="dev-slider-track-wrap">
                    <input type="range" id="mod-speed-range" class="dev-slider" min="190" max="500" step="10" value="190" oninput="window.__modMenu.setSpeed(this.value)">
                    <span class="dev-pill-val" id="mod-speed-val">190</span>
                  </div>
                  <span class="dev-slider-label">Speed</span>
                </div>

                <!-- FOV Slider -->
                <div class="dev-slider-item">
                  <div class="dev-slider-track-wrap">
                    <input type="range" id="mod-fov-range" class="dev-slider" min="65" max="115" step="5" value="65" oninput="window.__modMenu.setFov(this.value)">
                    <span class="dev-pill-val" id="mod-fov-val">65°</span>
                  </div>
                  <span class="dev-slider-label">FOV</span>
                </div>

                <!-- Action buttons styled like photo -->
                <div class="dev-actions-list">
                  <div class="dev-action-btn" onclick="window.__modMenu.cmd('give money 500000'); window.__modMenu.toast('+500K Points!')">
                    <span class="dev-action-tag">+500K</span>
                    <span class="dev-action-name">Points</span>
                  </div>
                  <div class="dev-action-btn" onclick="window.__modMenu.cmd('kill'); window.__modMenu.toast('Zombies Cleared!')">
                    <span class="dev-action-tag">Kill</span>
                    <span class="dev-action-name">Nearby</span>
                  </div>
                  <div class="dev-action-btn" onclick="window.__modMenu.cmd('revive'); window.__modMenu.toast('Self Revived!')">
                    <span class="dev-action-tag">Revive</span>
                    <span class="dev-action-name">Player</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: Weapons (Clean Compact Cards) -->
        <div class="dev-content" id="tab-weapons">
          <div class="dev-weapons-toolbar">
            <input type="text" id="weapon-search-input" class="dev-search-input" placeholder="Search weapon..." oninput="window.__modMenu.onSearch(this.value)">
            <div class="dev-cat-pills">
              <button class="dev-cat-pill active" data-cat="all" onclick="window.__modMenu.onFilterCat('all', this)">All</button>
              <button class="dev-cat-pill" data-cat="wonder" onclick="window.__modMenu.onFilterCat('wonder', this)">Wonder</button>
              <button class="dev-cat-pill" data-cat="pap" onclick="window.__modMenu.onFilterCat('pap', this)">Pack-a-Punch</button>
              <button class="dev-cat-pill" data-cat="rifle" onclick="window.__modMenu.onFilterCat('rifle', this)">Rifle</button>
              <button class="dev-cat-pill" data-cat="smg" onclick="window.__modMenu.onFilterCat('smg', this)">SMG</button>
              <button class="dev-cat-pill" data-cat="lmg" onclick="window.__modMenu.onFilterCat('lmg', this)">LMG</button>
              <button class="dev-cat-pill" data-cat="shotgun" onclick="window.__modMenu.onFilterCat('shotgun', this)">Shotgun</button>
              <button class="dev-cat-pill" data-cat="sniper" onclick="window.__modMenu.onFilterCat('sniper', this)">Sniper</button>
              <button class="dev-cat-pill" data-cat="pistol" onclick="window.__modMenu.onFilterCat('pistol', this)">Pistol</button>
              <button class="dev-cat-pill" data-cat="special" onclick="window.__modMenu.onFilterCat('special', this)">Special</button>
            </div>
          </div>
          <div class="dev-weapons-grid" id="modmenu-weapons-grid"></div>
        </div>

        <!-- TAB 3: Console -->
        <div class="dev-content" id="tab-console">
          <div class="dev-console-container">
            <div class="dev-quick-cmds">
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('god')">god</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('give ammo')">give ammo</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('give ray_gun_upgraded_zm')">give ray_gun</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('give thundergun_upgraded_zm')">give thundergun</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('noclip')">noclip</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('player_sustainAmmo 1')">infinite ammo</span>
              <span class="dev-cmd-chip" onclick="window.__modMenu.runCustomCmd('timescale 1')">timescale 1</span>
            </div>
            <div class="dev-console-log" id="modmenu-console-log">Command Terminal Ready. Type any command below:</div>
            <div class="dev-console-row">
              <input type="text" id="console-cmd-input" class="dev-console-input" placeholder="Type console command (e.g. noclip, god, give ammo)..." onkeydown="if(event.key==='Enter')window.__modMenu.submitConsole()">
              <button class="dev-console-btn" onclick="window.__modMenu.submitConsole()">EXEC</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tab buttons event listener
    overlay.querySelectorAll('.dev-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Close on overlay backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Initial weapons render
    this.renderWeaponsGrid();

    // Safety initialization: ensure bg_fallDamageMaxHeight is always safely above bg_fallDamageMinHeight to prevent jump assertion crash
    setTimeout(() => {
      this.cmd('set bg_fallDamageMaxHeight 99999');
    }, 1500);
  }

  onSearch(query) {
    this.searchQuery = query;
    this.renderWeaponsGrid();
  }

  onFilterCat(cat, el) {
    this.categoryFilter = cat;
    document.querySelectorAll('.dev-cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    this.renderWeaponsGrid();
  }

  runCustomCmd(cmd) {
    this.cmd(cmd);
    this.toast(`Command: ${cmd}`);
  }

  submitConsole() {
    const input = document.getElementById('console-cmd-input');
    if (!input || !input.value.trim()) return;
    const command = input.value.trim();
    this.cmd(command);
    this.toast(`Console: ${command}`);
    input.value = '';
  }
}

// Instantiate and expose globally
window.__modMenu = new ModMenuManager();
console.log('[MODMENU] Initialized successfully. Toggle hotkey: [INSERT]');
