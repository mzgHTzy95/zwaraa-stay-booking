import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "fr" | "ar";

type Dict = Record<string, string>;

const fr: Dict = {
  "brand.name": "Zwaraa",
  "brand.tagline": "Halq El Oued Ezzouaraa",
  "brand.location": "Nefza, Béja — Tunisie",
  "nav.cabins": "Bungalows",
  "nav.place": "Le lieu",
  "nav.admin": "Administration",
  "hero.title": "Dormir au-dessus de la lagune",
  "hero.text":
    "Quatre bungalows sur pilotis posés sur l'eau turquoise de Nefza. On y vient pour une demi-journée ou pour vingt-quatre heures, repas et tour en barque compris.",
  "hero.cta": "Voir les bungalows",
  "cabins.title": "Bungalows disponibles",
  "cabins.subtitle": "Un seul type d'hébergement, deux façons d'y rester.",
  "slot.half_day": "Demi-journée",
  "slot.24h": "24 heures",
  "cabin.capacity": "Jusqu'à {n} personnes",
  "cabin.view": "Voir le bungalow",
  "cabin.included": "Ce qui est compris",
  "cabin.gallery": "Galerie",
  "cabin.checkAvailability": "Vérifier la disponibilité",
  "cabin.pickDate": "Choisissez une date",
  "cabin.available": "Disponible",
  "cabin.unavailable": "Déjà réservé",
  "cabin.reserve": "Réserver",
  "cabin.close": "Fermer",
  "cabin.perPerson": "par personne / 24 h",
  "pack.title": "Formule 24 heures — prix par personne",
  "pack.note":
    "Le tarif 24 heures s'entend par personne. Il comprend l'ensemble de la formule ci-dessous.",
  "pack.meals": "Trois repas : petit-déjeuner, déjeuner et dîner",
  "pack.horse": "Balade à cheval",
  "pack.boat": "Tours en barque disponibles toute la journée",
  "pack.kayak": "Sortie en kayak tandem",
  "book.nights": "Nombre de jours (24 h)",
  "book.nightsNote": "Vous pouvez rester plus de 24 heures : choisissez le nombre de jours.",
  "book.nightsValue": "{n} × 24 h",
  "book.priceDetail": "{price} × {guests} pers. × {nights} j.",

  "book.title": "Réservation",
  "book.step1": "Date et créneau",
  "book.step2": "Vos informations",
  "book.step3": "Vérification",
  "book.step4": "Paiement",
  "book.date": "Date",
  "book.slot": "Créneau",
  "book.cin": "CIN (numéro de carte d'identité)",
  "book.fullName": "Nom et prénom",
  "book.phone": "Numéro de téléphone",
  "book.dob": "Date de naissance",
  "book.guests": "Nombre de personnes",
  "book.continue": "Continuer",
  "book.back": "Retour",
  "book.review": "Vérifiez votre réservation",
  "book.cabin": "Bungalow",
  "book.guest": "Client",
  "book.total": "Total",
  "book.confirmPay": "Confirmer et payer",
  "book.payment": "Paiement par carte",
  "book.paymentNote": "Paiement simulé — aucune carte réelle n'est débitée.",
  "book.cardNumber": "Numéro de carte",
  "book.cardName": "Nom sur la carte",
  "book.expiry": "Expiration",
  "book.cvv": "CVV",
  "book.pay": "Payer {amount}",
  "book.processing": "Traitement du paiement…",
  "book.selectSlotFirst": "Choisissez une date et un créneau.",
  "book.taken": "Ce créneau vient d'être réservé. Choisissez-en un autre.",
  "receipt.title": "Reçu de réservation",
  "receipt.paid": "Payé",
  "receipt.ref": "Référence",
  "receipt.amount": "Montant",
  "receipt.thanks": "Merci, votre séjour est confirmé.",
  "receipt.print": "Imprimer",
  "receipt.home": "Retour à l'accueil",
  "admin.title": "Administration",
  "admin.login": "Connexion",
  "admin.email": "E-mail",
  "admin.password": "Mot de passe",
  "admin.signIn": "Se connecter",
  "admin.signOut": "Déconnexion",
  "admin.reservations": "Réservations",
  "admin.cabinsTab": "Bungalows",
  "admin.revenue": "Recettes encaissées",
  "admin.count": "Réservations",
  "admin.week": "Cette semaine",
  "admin.month": "Ce mois-ci",
  "admin.search": "Rechercher (nom, CIN, référence…)",
  "admin.status": "Statut",
  "admin.all": "Tous",
  "admin.save": "Enregistrer",
  "admin.delete": "Supprimer",
  "admin.cancel": "Annuler",
  "admin.edit": "Modifier",
  "admin.noAccess": "Ce compte n'a pas les droits d'administration.",
  "admin.priceHalf": "Prix demi-journée",
  "admin.price24": "Prix 24 heures",
  "admin.empty": "Aucune réservation.",
  "admin.addCabin": "Ajouter un bungalow",
  "admin.name": "Nom (FR)",
  "admin.nameAr": "Nom (AR)",
  "admin.capacity": "Capacité",
  "admin.create": "Créer",
  "admin.available": "Disponible à la réservation",
  "admin.unavailable": "Indisponible",
  "admin.makeUnavailable": "Rendre indisponible",
  "admin.makeAvailable": "Rendre disponible",
  "admin.nights": "Jours",

  "status.pending": "En attente",
  "status.confirmed": "Confirmée",
  "status.cancelled": "Annulée",
  "status.completed": "Terminée",
  "pay.unpaid": "Non payé",
  "pay.paid": "Payé",
  "common.loading": "Chargement…",
  "common.error": "Une erreur est survenue.",
  "footer.rights": "Tous droits réservés.",
};

const ar: Dict = {
  "brand.name": "الزوارع",
  "brand.tagline": "حلق الواد الزوارع",
  "brand.location": "نفزة، باجة — تونس",
  "nav.cabins": "البنغالوهات",
  "nav.place": "المكان",
  "nav.admin": "الإدارة",
  "hero.title": "نَم فوق مياه البحيرة",
  "hero.text":
    "أربعة بنغالوهات على ركائز فوق مياه نفزة الفيروزية. تُحجز لنصف يوم أو لأربع وعشرين ساعة، مع الأكل وجولة بالقارب.",
  "hero.cta": "اطّلع على البنغالوهات",
  "cabins.title": "البنغالوهات المتاحة",
  "cabins.subtitle": "نوع إقامة واحد، وطريقتان للبقاء.",
  "slot.half_day": "نصف يوم",
  "slot.24h": "٢٤ ساعة",
  "cabin.capacity": "إلى غاية {n} أشخاص",
  "cabin.view": "عرض البنغالو",
  "cabin.included": "ما يشمله الحجز",
  "cabin.gallery": "الصور",
  "cabin.checkAvailability": "تحقق من التوفر",
  "cabin.pickDate": "اختر تاريخاً",
  "cabin.available": "متاح",
  "cabin.unavailable": "محجوز",
  "cabin.reserve": "احجز",
  "cabin.close": "إغلاق",
  "cabin.perPerson": "للشخص الواحد / ٢٤ ساعة",
  "pack.title": "صيغة ٢٤ ساعة — السعر للشخص الواحد",
  "pack.note": "سعر ٢٤ ساعة يُحتسب للشخص الواحد ويشمل كل ما يلي.",
  "pack.meals": "ثلاث وجبات: الفطور والغداء والعشاء",
  "pack.horse": "ركوب الخيل",
  "pack.boat": "جولات بالقارب طوال اليوم",
  "pack.kayak": "خرجة بقارب الكاياك المزدوج",
  "book.nights": "عدد الأيام (٢٤ ساعة)",
  "book.nightsNote": "يمكنك البقاء أكثر من ٢٤ ساعة: اختر عدد الأيام.",
  "book.nightsValue": "{n} × ٢٤ ساعة",
  "book.priceDetail": "{price} × {guests} أشخاص × {nights} أيام",

  "book.title": "الحجز",
  "book.step1": "التاريخ والفترة",
  "book.step2": "معلوماتك",
  "book.step3": "المراجعة",
  "book.step4": "الدفع",
  "book.date": "التاريخ",
  "book.slot": "الفترة",
  "book.cin": "رقم بطاقة التعريف",
  "book.fullName": "الاسم واللقب",
  "book.phone": "رقم الهاتف",
  "book.dob": "تاريخ الولادة",
  "book.guests": "عدد الأشخاص",
  "book.continue": "متابعة",
  "book.back": "رجوع",
  "book.review": "راجع حجزك",
  "book.cabin": "البنغالو",
  "book.guest": "الحريف",
  "book.total": "المجموع",
  "book.confirmPay": "تأكيد ودفع",
  "book.payment": "الدفع بالبطاقة",
  "book.paymentNote": "دفع تجريبي — لا يتم خصم أي مبلغ حقيقي.",
  "book.cardNumber": "رقم البطاقة",
  "book.cardName": "الاسم على البطاقة",
  "book.expiry": "تاريخ الانتهاء",
  "book.cvv": "الرمز السري",
  "book.pay": "ادفع {amount}",
  "book.processing": "جاري تنفيذ الدفع…",
  "book.selectSlotFirst": "اختر تاريخاً وفترة.",
  "book.taken": "هذه الفترة حُجزت للتو. اختر غيرها.",
  "receipt.title": "وصل الحجز",
  "receipt.paid": "خالص",
  "receipt.ref": "المرجع",
  "receipt.amount": "المبلغ",
  "receipt.thanks": "شكراً، تم تأكيد إقامتك.",
  "receipt.print": "طباعة",
  "receipt.home": "العودة للرئيسية",
  "admin.title": "الإدارة",
  "admin.login": "تسجيل الدخول",
  "admin.email": "البريد الإلكتروني",
  "admin.password": "كلمة المرور",
  "admin.signIn": "دخول",
  "admin.signOut": "خروج",
  "admin.reservations": "الحجوزات",
  "admin.cabinsTab": "البنغالوهات",
  "admin.revenue": "المداخيل المحصّلة",
  "admin.count": "الحجوزات",
  "admin.week": "هذا الأسبوع",
  "admin.month": "هذا الشهر",
  "admin.search": "بحث (الاسم، بطاقة التعريف، المرجع…)",
  "admin.status": "الحالة",
  "admin.all": "الكل",
  "admin.save": "حفظ",
  "admin.delete": "حذف",
  "admin.cancel": "إلغاء",
  "admin.edit": "تعديل",
  "admin.noAccess": "هذا الحساب لا يملك صلاحيات الإدارة.",
  "admin.priceHalf": "سعر نصف اليوم",
  "admin.price24": "سعر ٢٤ ساعة",
  "admin.empty": "لا توجد حجوزات.",
  "admin.addCabin": "إضافة بنغالو",
  "admin.name": "الاسم (بالفرنسية)",
  "admin.nameAr": "الاسم (بالعربية)",
  "admin.capacity": "الطاقة الاستيعابية",
  "admin.create": "إنشاء",
  "admin.available": "متاح للحجز",
  "admin.unavailable": "غير متاح",
  "admin.makeUnavailable": "جعله غير متاح",
  "admin.makeAvailable": "جعله متاحاً",
  "admin.nights": "الأيام",

  "status.pending": "في الانتظار",
  "status.confirmed": "مؤكدة",
  "status.cancelled": "ملغاة",
  "status.completed": "منتهية",
  "pay.unpaid": "غير مدفوع",
  "pay.paid": "مدفوع",
  "common.loading": "جاري التحميل…",
  "common.error": "حدث خطأ.",
  "footer.rights": "كل الحقوق محفوظة.",
};

const dicts: Record<Lang, Dict> = { fr, ar };

type I18nValue = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem("zwaraa-lang");
    if (stored === "ar" || stored === "fr") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("zwaraa-lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let out = dicts[lang][key] ?? dicts.fr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
      }
      return out;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl", setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function formatPrice(amount: number | string, lang: Lang) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${n.toFixed(0)} ${lang === "ar" ? "د.ت" : "DT"}`;
}
