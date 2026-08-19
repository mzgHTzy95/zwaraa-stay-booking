import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Lang = "fr" | "ar" | "en";

type Dict = Record<string, string>;

const fr: Dict = {
  "brand.name": "Reve-z",
  "brand.tagline": "Halq El Oued Ezzouaraa",
  "brand.location": "Nefza, Béja — Tunisie",
  "nav.cabins": "Bungalows",
  "nav.gallery": "Galerie",
  "nav.place": "Le lieu",
  "nav.admin": "Administration",
  "hero.title": "Dormir au-dessus de la lagune",
  "hero.text":
    "Quatre bungalows sur pilotis posés sur l'eau turquoise de Nefza. On y vient pour une demi-journée ou pour vingt-quatre heures, repas et tour en barque compris.",
  "hero.cta": "Voir les bungalows",
  "cabins.title": "Bungalows disponibles",
  "cabins.subtitle": "Un seul type d'hébergement, deux façons d'y rester.",
  "slot.half_day": "Demi-pontion",
  "slot.24h": "Pontion complète",
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
  "cabin.perPersonHalf": "par personne / demi-journée",
  "cabin.reserved": "Réservé",
  "cabin.filterAll": "Tous",
  "cabin.viewPhotos": "Voir les photos",
  "slot.hoursHalf": "10h – 17h",
  "slot.hours24": "arrivée 14h · départ 12h",
  "book.anyCabin": "Un bungalow sur la lagune",
  "book.anyCabinNote": "Attribué automatiquement à la confirmation",
  "admin.deleteConfirm": "Supprimer définitivement cette réservation ?",
  "search.weekdays": "L,M,M,J,V,S,D",
  "gallery.note":
    "Tous les bungalows proposent les mêmes formules et les mêmes tarifs. Vous réservez une date : un bungalow libre vous est attribué automatiquement.",
  "search.title": "Vérifier les disponibilités",
  "search.subtitle":
    "Choisissez une date, une formule et le nombre de personnes.",
  "search.date": "Date d'arrivée",
  "search.pack": "Formule",
  "search.guests": "Personnes",
  "search.nights": "Nombre de jours",
  "search.cta": "Vérifier la disponibilité",
  "search.legendFree": "Disponible",
  "search.legendTight": "Dernières places",
  "search.legendFull": "Complet",
  "search.free": "{n} bungalow(s) encore libre(s)",
  "search.full": "Complet — choisissez une autre date",
  "search.pickDate": "Sélectionnez une date sur le calendrier.",
  "search.autoAssign": "Un bungalow libre vous sera attribué automatiquement.",
  "search.book": "Réserver cette date",
  "search.capacityWarn":
    "Nombre de personnes supérieur à la capacité d'un bungalow ({n}).",

  "gallery.category.bungalow": "Bungalow",
  "gallery.category.activity": "Activité",
  "gallery.category.food": "Repas",
  "gallery.category.nature": "Nature",
  "gallery.about.kicker": "L'expérience Reve-z",
  "gallery.about.title": "Une immersion totale dans la nature tunisienne",
  "gallery.about.body":
    "Situé à Nefza, au nord-ouest de la Tunisie, Reve-z offre une expérience unique : dormir dans un bungalow sur pilotis, directement sur l'eau. Que ce soit pour une demi-journée ou une nuit complète, chaque séjour inclut des repas locaux et des balades en barque pour découvrir la beauté sauvage de la région.",
  "gallery.about.statLagoon": "Vue lagune",
  "gallery.about.statBungalows": "Bungalows",
  "gallery.included.title": "Ce qui est inclus dans votre séjour",
  "gallery.included.meals.title": "Repas locaux inclus",
  "gallery.included.meals.body":
    "Chaque réservation comprend des repas préparés avec des produits locaux, servis directement dans votre bungalow ou en bord de lagune.",
  "gallery.included.boat.title": "Balade en barque",
  "gallery.included.boat.body":
    "Explorez la lagune à bord d'une barque traditionnelle, encadrée par nos guides locaux — comprise dans chaque formule.",
  "gallery.included.lagoon.title": "Accès 360° à la lagune",
  "gallery.included.lagoon.body":
    "Votre bungalow sur pilotis vous donne un accès direct à l'eau douce de la lagune, entre le fleuve et la Méditerranée.",
  "gallery.included.booking.title": "Réservation simple et sûre",
  "gallery.included.booking.body":
    "Réservez et payez en ligne en quelques minutes, avec confirmation immédiate — sans frais cachés.",
  "gallery.filter.all": "Tout",
  "gallery.filter.empty": "Aucune photo dans cette catégorie pour le moment.",
  "gallery.reserveThis": "Réserver ce bungalow",
  // {current} and {total} are interpolated — keep the exact placeholder names
  "lightbox.position": "Photo {current} sur {total}",
  "lightbox.play": "Lecture automatique",
  "lightbox.pause": "Mettre en pause",

  "home.galleryTeaser.kicker": "Galerie",
  "home.galleryTeaser.title": "Découvrez Reve-z en images",
  "home.galleryTeaser.body":
    "Bungalows, activités, repas et nature — explorez notre galerie complète en photos et vidéos.",
  "home.galleryTeaser.cta": "Voir la galerie",
  "home.galleryTeaser.chipBoat": "Balade en barque",
  "home.galleryTeaser.chipInterior": "Intérieur du bungalow",
  // Big single word used in Option 2 (photo-filled headline) — keep it short,
  // this gets rendered at huge font size.
  "home.galleryTeaser.headlineWord": "GALERIE",

  "pack.title": "Formule 24 h — prix par personne",
  "pack.note": "Le tarif 24 heures s'entend par personne et par jour.",
  "pack.meals": "3 repas inclus",
  "pack.mealsDetail": "Petit-déjeuner, déjeuner et dîner",
  "pack.horse": "Balade à cheval",
  "pack.horseDetail": "Promenade guidée dans la nature",
  "pack.boat": "Tours en barque",
  "pack.boatDetail": "Disponibles toute la journée",
  "pack.kayak": "Kayak tandem",
  "pack.kayakDetail": "Sortie en kayak à deux",
  "book.nights": "Nombre de jours (24 h)",
  "book.nightsNote":
    "Vous pouvez rester plus de 24 heures : choisissez le nombre de jours.",
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
  "book.payment": "Choisissez votre moyen de paiement",
  "book.paymentNote": "Paiement simulé — aucune somme réelle n'est débitée.",
  "book.cardNumber": "Numéro de carte",
  "book.cardName": "Nom sur la carte",
  "book.expiry": "Expiration",
  "book.cvv": "CVV",
  "book.pay": "Payer {amount}",
  "book.processing": "Traitement du paiement…",
  "book.selectSlotFirst": "Choisissez une date et un créneau.",
  "book.taken": "Ce créneau vient d'être réservé. Choisissez-en un autre.",
  "book.payMethod.card": "Carte bancaire",
  "book.payMethod.d17": "D17 (paiement mobile)",
  "book.payMethod.bank": "Virement bancaire",
  "book.payMethod.cash": "Espèces (sur place)",
  "book.payMethod.d17Phone": "Numéro D17",
  "book.payMethod.bankNote":
    "Effectuez un virement à l'ordre de Reve-z — RIB : 12 345 678 901 234 567 890 12. Indiquez votre référence de réservation.",
  "book.payMethod.cashNote":
    "Réglez en espèces à votre arrivée. Votre réservation est confirmée dès maintenant.",
  "book.adults": "Adultes",
  "book.children6_10": "Enfants 6–10 ans",
  "book.childrenUnder5": "Enfants – 5 ans",
  "book.childrenNote":
    "Enfants de 6 à 10 ans : 50 DT · 5 ans et moins : gratuit",
  "receipt.downloadWarning":
    "Téléchargez ou imprimez ce reçu — vous devrez le présenter à votre arrivée au bungalow.",
  "gallery.title": "Galerie des bungalows",
  "gallery.subtitle": "Découvrez l'intérieur de chaque bungalow sur pilotis.",
  "admin.notifications": "Notifications",
  "admin.markAllRead": "Tout marquer comme lu",
  "admin.noNotifications": "Aucune nouvelle notification.",
  "admin.newReservation": "Nouvelle réservation",
  "admin.cin": "CIN client",
  "admin.receipt": "Reçu client",
  "receipt.title": "Reçu de réservation",
  "receipt.paid": "Payé",
  "receipt.ref": "Référence",
  "receipt.amount": "Montant",
  "receipt.thanks": "Merci, votre séjour est confirmé.",
  "receipt.print": "Imprimer",
  "receipt.download": "Télécharger le reçu",
  "receipt.home": "Retour à l'accueil",
  "receipt.saveModalTitle": "Enregistrez votre reçu",
  "receipt.saveModalBody":
    "Nous téléchargeons automatiquement une image de votre reçu. Sauvegardez-la — vous devrez la présenter à votre arrivée au bungalow.",
  "receipt.saveModalDownload": "Télécharger à nouveau",
  "receipt.saveModalClose": "J'ai sauvegardé",
  "admin.title": "Administration",
  "admin.login": "Connexion",
  "admin.email": "E-mail",
  "admin.password": "Mot de passe",
  "admin.signIn": "Se connecter",
  "admin.turnstileLoading": "Vérification en cours...",
  "admin.turnstileRequired": "Complétez la vérification anti-bot.",
  "admin.turnstileError": "Erreur du widget Turnstile. Réessayez.",
  "admin.turnstileFailed": "Vérification échouée. Réessayez.",
  "admin.createFirst": "Créer le compte administrateur",
  "admin.createFirstNote":
    "Aucun compte administrateur n'existe encore. Créez-le maintenant (une seule fois).",
  "admin.signOut": "Déconnexion",
  "admin.reservations": "Réservations",
  "admin.archiveTab": "Archive",
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
  "admin.turnstileLoadError":
    "Impossible de charger la vérification anti-bot. Vérifiez votre connexion.",
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
  "admin.confirm": "Confirmer",
  "admin.complete": "Terminer",
  "admin.quickStatus": "Statut rapide",
  "admin.calendarTab": "Calendrier",
  "admin.occupancy": "Occupation",
  "admin.freeUnits": "{n} libre(s)",
  "admin.noBookingsDay": "Aucune réservation ce jour.",
  "admin.dayDetails": "Réservations du jour",
  "admin.assigned": "Bungalow attribué",
  "admin.prevMonth": "Mois précédent",
  "admin.nextMonth": "Mois suivant",

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

const en: Dict = {
  "brand.name": "Reve-z",
  "brand.tagline": "Halq El Oued Ezzouaraa",
  "brand.location": "Nefza, Béja — Tunisia",
  "nav.cabins": "Bungalows",
  "nav.gallery": "Gallery",
  "nav.place": "The Location",
  "nav.admin": "Administration",
  "hero.title": "Sleep above the lagoon",
  "hero.text":
    "Four stilt bungalows set on the turquoise waters of Nefza. Come for a half-day or twenty-four hours, meals and boat ride included.",
  "hero.cta": "View the bungalows",
  "cabins.title": "Available bungalows",
  "cabins.subtitle": "One type of accommodation, two ways to stay.",
  "slot.half_day": "Half-board",
  "slot.24h": "Full board",
  "cabin.capacity": "Up to {n} people",
  "cabin.view": "View bungalow",
  "cabin.included": "What's included",
  "cabin.gallery": "Gallery",
  "cabin.checkAvailability": "Check availability",
  "cabin.pickDate": "Choose a date",
  "cabin.available": "Available",
  "cabin.unavailable": "Already booked",
  "cabin.reserve": "Reserve",
  "cabin.close": "Close",
  "cabin.perPerson": "per person / 24 hrs",
  "cabin.perPersonHalf": "per person / half-day",
  "cabin.reserved": "Reserved",
  "cabin.filterAll": "All",
  "cabin.viewPhotos": "View photos",
  "slot.hoursHalf": "10 AM – 5 PM",
  "slot.hours24": "check-in 2 PM · check-out 12 PM",
  "book.anyCabin": "A bungalow on the lagoon",
  "book.anyCabinNote": "Automatically assigned upon confirmation",
  "admin.deleteConfirm": "Permanently delete this booking?",
  "search.weekdays": "M,T,W,T,F,S,S",
  "gallery.note":
    "All bungalows offer the same packages and rates. You book a date: an available bungalow is automatically assigned to you.",
  "search.title": "Check availability",
  "search.subtitle": "Choose a date, a package, and the number of guests.",
  "search.date": "Check-in date",
  "search.pack": "Package",
  "search.guests": "Guests",
  "search.nights": "Number of days",
  "search.cta": "Check availability",
  "search.legendFree": "Available",
  "search.legendTight": "Last spots",
  "search.legendFull": "Fully booked",
  "search.free": "{n} bungalow(s) still available",
  "search.full": "Fully booked — please choose another date",
  "search.pickDate": "Select a date on the calendar.",
  "search.autoAssign":
    "An available bungalow will be automatically assigned to you.",
  "search.book": "Book this date",
  "search.capacityWarn":
    "Number of guests exceeds the capacity of one bungalow ({n}).",

  "gallery.category.bungalow": "Bungalow",
  "gallery.category.activity": "Activity",
  "gallery.category.food": "Meals",
  "gallery.category.nature": "Nature",
  "gallery.about.kicker": "The Reve-z Experience",
  "gallery.about.title": "A total immersion in Tunisian nature",
  "gallery.about.body":
    "Located in Nefza, in northwestern Tunisia, Reve-z offers a unique experience: sleeping in a stilt bungalow directly on the water. Whether for a half-day or a full night, every stay includes local meals and boat rides to discover the wild beauty of the region.",
  "gallery.about.statLagoon": "Lagoon view",
  "gallery.about.statBungalows": "Bungalows",
  "gallery.included.title": "What's included in your stay",
  "gallery.included.meals.title": "Local meals included",
  "gallery.included.meals.body":
    "Every booking includes meals prepared with local products, served directly in your bungalow or by the lagoon.",
  "gallery.included.boat.title": "Boat ride",
  "gallery.included.boat.body":
    "Explore the lagoon aboard a traditional boat, guided by our locals — included in every package.",
  "gallery.included.lagoon.title": "360° lagoon access",
  "gallery.included.lagoon.body":
    "Your stilt bungalow gives you direct access to the fresh water of the lagoon, between the river and the Mediterranean Sea.",
  "gallery.included.booking.title": "Simple and secure booking",
  "gallery.included.booking.body":
    "Book and pay online in minutes, with immediate confirmation — no hidden fees.",
  "gallery.filter.all": "All",
  "gallery.filter.empty": "No photos in this category yet.",
  "gallery.reserveThis": "Book this bungalow",
  // {current} and {total} are interpolated — keep the exact placeholder names
  "lightbox.position": "Photo {current} of {total}",
  "lightbox.play": "Autoplay",
  "lightbox.pause": "Pause",

  "home.galleryTeaser.kicker": "Gallery",
  "home.galleryTeaser.title": "Discover Reve-z in pictures",
  "home.galleryTeaser.body":
    "Bungalows, activities, meals, and nature — explore our full photo and video gallery.",
  "home.galleryTeaser.cta": "View the gallery",

  "pack.title": "24-hour package — price per person",
  "pack.note": "The 24-hour rate is per person, per day.",
  "pack.meals": "3 meals included",
  "pack.mealsDetail": "Breakfast, lunch, and dinner",
  "pack.horse": "Horseback ride",
  "pack.horseDetail": "Guided nature ride",
  "pack.boat": "Boat tours",
  "pack.boatDetail": "Available all day",
  "pack.kayak": "Tandem kayak",
  "pack.kayakDetail": "Two-person kayak outing",
  "book.nights": "Number of days (24 h)",
  "book.nightsNote":
    "You can stay longer than 24 hours: choose the number of days.",
  "book.nightsValue": "{n} × 24 hrs",
  "book.priceDetail": "{price} × {guests} guests × {nights} days",

  "book.title": "Booking",
  "book.step1": "Date and slot",
  "book.step2": "Your information",
  "book.step3": "Review",
  "book.step4": "Payment",
  "book.date": "Date",
  "book.slot": "Slot",
  "book.cin": "ID card number (CIN)",
  "book.fullName": "Full name",
  "book.phone": "Phone number",
  "book.dob": "Date of birth",
  "book.guests": "Number of guests",
  "book.continue": "Continue",
  "book.back": "Back",
  "book.review": "Review your booking",
  "book.cabin": "Bungalow",
  "book.guest": "Guest",
  "book.total": "Total",
  "book.confirmPay": "Confirm and pay",
  "book.payment": "Choose your payment method",
  "book.paymentNote": "Simulated payment — no actual money is charged.",
  "book.cardNumber": "Card number",
  "book.cardName": "Name on card",
  "book.expiry": "Expiry",
  "book.cvv": "CVV",
  "book.pay": "Pay {amount}",
  "book.processing": "Processing payment…",
  "book.selectSlotFirst": "Choose a date and a slot.",
  "book.taken": "This slot was just booked. Please choose another one.",
  "book.payMethod.card": "Credit card",
  "book.payMethod.d17": "D17 (mobile payment)",
  "book.payMethod.bank": "Bank transfer",
  "book.payMethod.cash": "Cash (on site)",
  "book.payMethod.d17Phone": "D17 number",
  "book.payMethod.bankNote":
    "Make a bank transfer to Reve-z — RIB: 12 345 678 901 234 567 890 12. Include your booking reference.",
  "book.payMethod.cashNote":
    "Pay in cash upon arrival. Your booking is confirmed now.",
  "book.adults": "Adults",
  "book.children6_10": "Children 6–10 years old",
  "book.childrenUnder5": "Children under 5",
  "book.childrenNote": "Children 6–10 years old: 50 TND · 5 and under: free",
  "receipt.downloadWarning":
    "Download or print this receipt — you must present it upon arrival at the bungalow.",
  "gallery.title": "Bungalow gallery",
  "gallery.subtitle": "Discover the interior of each stilt bungalow.",
  "admin.notifications": "Notifications",
  "admin.markAllRead": "Mark all as read",
  "admin.noNotifications": "No new notifications.",
  "admin.newReservation": "New booking",
  "admin.cin": "Guest ID (CIN)",
  "admin.receipt": "Guest receipt",
  "receipt.title": "Booking receipt",
  "receipt.paid": "Paid",
  "receipt.ref": "Reference",
  "receipt.amount": "Amount",
  "receipt.thanks": "Thank you, your stay is confirmed.",
  "receipt.print": "Print",
  "receipt.download": "Download receipt",
  "receipt.home": "Back to home",
  "receipt.saveModalTitle": "Save your receipt",
  "receipt.saveModalBody":
    "We automatically download an image of your receipt. Save it — you must present it upon arrival at the bungalow.",
  "receipt.saveModalDownload": "Download again",
  "receipt.saveModalClose": "I have saved it",
  "admin.title": "Administration",
  "admin.login": "Login",
  "admin.email": "Email",
  "admin.password": "Password",
  "admin.signIn": "Sign in",
  "admin.turnstileLoading": "Verification in progress...",
  "admin.turnstileRequired": "Complete the anti-bot verification.",
  "admin.turnstileError": "Turnstile widget error. Try again.",
  "admin.turnstileFailed": "Verification failed. Try again.",
  "admin.createFirst": "Create admin account",
  "admin.createFirstNote":
    "No admin account exists yet. Create one now (one-time only).",
  "admin.signOut": "Sign out",
  "admin.reservations": "Bookings",
  "admin.archiveTab": "Archive",
  "admin.cabinsTab": "Bungalows",
  "admin.revenue": "Collected revenue",
  "admin.count": "Bookings",
  "admin.week": "This week",
  "admin.month": "This month",
  "admin.search": "Search (name, ID, reference…)",
  "admin.status": "Status",
  "admin.all": "All",
  "admin.save": "Save",
  "admin.delete": "Delete",
  "admin.cancel": "Cancel",
  "admin.edit": "Edit",
  "admin.noAccess": "This account does not have admin rights.",
  "admin.turnstileLoadError":
    "Failed to load anti-bot verification. Check your connection.",
  "admin.priceHalf": "Half-day price",
  "admin.price24": "24-hour price",
  "admin.empty": "No bookings.",
  "admin.addCabin": "Add a bungalow",
  "admin.name": "Name (FR)",
  "admin.nameAr": "Name (AR)",
  "admin.capacity": "Capacity",
  "admin.create": "Create",
  "admin.available": "Available for booking",
  "admin.unavailable": "Unavailable",
  "admin.makeUnavailable": "Make unavailable",
  "admin.makeAvailable": "Make available",
  "admin.nights": "Days",
  "admin.confirm": "Confirm",
  "admin.complete": "Complete",
  "admin.quickStatus": "Quick status",
  "admin.calendarTab": "Calendar",
  "admin.occupancy": "Occupancy",
  "admin.freeUnits": "{n} available",
  "admin.noBookingsDay": "No bookings on this day.",
  "admin.dayDetails": "Today's bookings",
  "admin.assigned": "Assigned bungalow",
  "admin.prevMonth": "Previous month",
  "admin.nextMonth": "Next month",

  "status.pending": "Pending",
  "status.confirmed": "Confirmed",
  "status.cancelled": "Cancelled",
  "status.completed": "Completed",
  "pay.unpaid": "Unpaid",
  "pay.paid": "Paid",
  "common.loading": "Loading…",
  "common.error": "An error occurred.",
  "footer.rights": "All rights reserved.",
};

const ar: Dict = {
  "brand.name": "الزوارع",
  "brand.tagline": "حلق الواد الزوارع",
  "brand.location": "نفزة، باجة — تونس",

  "nav.cabins": "البنغالوهات",
  "nav.gallery": "التصاور",
  "nav.place": "المكان",
  "nav.admin": "الإدارة",

  "hero.title": "بات فوق مياه البحيرة",
  "hero.text":
    "أربعة بنغالوهات مبنيين فوق مياه بحيرة نفزة الفيروزية. تنجم تحجز بنغالو لنص نهار ولا لـ24 ساعة، مع الماكلة وخرجة بالقارب.",
  "hero.cta": "اكتشف البنغالوهات",

  "cabins.title": "البنغالوهات المتوفّرة",
  "cabins.subtitle": "اختار كيفاش تحب تعيش تجربتك في الزوارع.",
  "slot.half_day": "نص نهار",
  "slot.24h": "24 ساعة",
  "cabin.capacity": "حتى لـ {n} أشخاص",
  "cabin.view": "شوف البنغالو",
  "cabin.included": "شنوة داخل في الحجز",
  "cabin.gallery": "التصاور",
  "cabin.checkAvailability": "ثبّت التوفّر",
  "cabin.pickDate": "اختار التاريخ",
  "cabin.available": "متوفّر",
  "cabin.unavailable": "محجوز",
  "cabin.reserve": "احجز",
  "cabin.close": "سكّر",
  "cabin.perPerson": "للشخص / 24 ساعة",
  "cabin.perPersonHalf": "للشخص / نص نهار",
  "cabin.reserved": "محجوز",
  "cabin.filterAll": "الكل",
  "cabin.viewPhotos": "شوف التصاور",

  "slot.hoursHalf": "10:00 – 17:00",
  "slot.hours24": "الدخول 14:00 · الخروج 12:00",

  "book.anyCabin": "بنغالو على البحيرة",
  "book.anyCabinNote": "نعيّنولك بنغالو متوفّر أوتوماتيكياً وقت التأكيد",

  "admin.deleteConfirm": "تحب تحذف الحجز هذا نهائياً؟",

  "search.weekdays": "ن,ث,ر,خ,ج,س,ح",

  "gallery.note":
    "البنغالوهات الكل عندهم نفس التجهيزات ونفس الأسعار. اختار التاريخ متاعك، وإحنا نعيّنولك بنغالو متوفّر أوتوماتيكياً.",

  "search.title": "ثبّت التوفّر",
  "search.subtitle": "اختار التاريخ، المدّة وعدد الأشخاص.",
  "search.date": "تاريخ الوصول",
  "search.pack": "المدّة",
  "search.guests": "عدد الأشخاص",
  "search.nights": "عدد الأيام",
  "search.cta": "ثبّت التوفّر",
  "search.legendFree": "متوفّر",
  "search.legendTight": "باقي بلايص قليلة",
  "search.legendFull": "كامل",
  "search.free": "{n} بنغالو متوفّر",
  "search.full": "كامل — جرّب تاريخ آخر",
  "search.pickDate": "اختار تاريخ من الرزنامة.",
  "search.autoAssign": "نعيّنولك بنغالو متوفّر أوتوماتيكياً.",
  "search.book": "احجز التاريخ هذا",
  "search.capacityWarn": "عدد الأشخاص أكبر من طاقة البنغالو ({n}).",

  "home.galleryTeaser.kicker": "التصاور",
  "home.galleryTeaser.title": "اكتشف الزوارع بالتصاور",
  "home.galleryTeaser.body":
    "بنغالوهات، أنشطة، ماكلة وطبيعة — تفرّج على تجربتنا كاملة بالتصاور والفيديوهات.",
  "home.galleryTeaser.chipBoat": "نزهة بالقارب",
  "home.galleryTeaser.chipInterior": "داخل البنغالو",
  "home.galleryTeaser.headlineWord": "المعرض",

  "gallery.category.bungalow": "بنغالو",
  "gallery.category.activity": "نشاط",
  "gallery.category.food": "ماكلة",
  "gallery.category.nature": "طبيعة",

  "gallery.about.kicker": "تجربة الزوارع",
  "gallery.about.title": "عيش الطبيعة التونسية على أصولها",
  "gallery.about.body":
    "الزوارع موجودة في نفزة، شمال غرب تونس، وين تستنّاك تجربة مختلفة: بات في بنغالو فوق الماء مباشرة. سواء تحب تقضي نص نهار ولا ليلة كاملة، إقامتك فيها ماكلة محلية وخرجات بالقارب باش تكتشف جمال المنطقة.",
  "gallery.about.statLagoon": "إطلالة على البحيرة",
  "gallery.about.statBungalows": "بنغالوهات",

  "gallery.included.title": "شنوة داخل في إقامتك",

  "gallery.included.meals.title": "ماكلة محلية",
  "gallery.included.meals.body":
    "كل حجز يشمل وجبات محضّرة بمنتوجات محلية، وتتقدّم مباشرة في البنغالو متاعك ولا على ضفاف البحيرة.",

  "gallery.included.boat.title": "خرجة بالقارب",
  "gallery.included.boat.body":
    "دور في البحيرة على متن قارب تقليدي مع مرشدين من المنطقة — والخرجة داخلة في كل باقة.",

  "gallery.included.lagoon.title": "إطلالة على البحيرة",
  "gallery.included.lagoon.body":
    "البنغالو مبني فوق الماء ويعطيك إطلالة مباشرة على البحيرة ومياهها، في قلب الطبيعة وبين النهر والبحر الأبيض المتوسط.",

  "gallery.included.booking.title": "حجز ساهل وآمن",
  "gallery.included.booking.body":
    "احجز وخلّص أونلاين في دقائق، مع تأكيد فوري ومن غير مصاريف مخفية.",

  "gallery.filter.all": "الكل",
  "gallery.filter.empty": "ما فماش تصاور في الفئة هاذي حالياً.",
  "gallery.reserveThis": "احجز البنغالو هذا",

  "lightbox.position": "تصويرة {current} من {total}",
  "lightbox.play": "تشغيل أوتوماتيكي",
  "lightbox.pause": "إيقاف مؤقت",

  "pack.title": "24 ساعة — السعر للشخص الواحد",
  "pack.note": "سعر الـ24 ساعة يتحسب للشخص الواحد.",
  "pack.meals": "3 وجبات داخلة",
  "pack.mealsDetail": "فطور، غداء وعشاء",
  "pack.horse": "ركوب الخيل",
  "pack.horseDetail": "جولة في الطبيعة مع مرشد",
  "pack.boat": "خرجات بالقارب",
  "pack.boatDetail": "متوفّرة طوال النهار",
  "pack.kayak": "كاياك مزدوج",
  "pack.kayakDetail": "خرجة كاياك لشخصين",

  "book.nights": "عدد الأيام (24 ساعة)",
  "book.nightsNote": "تحب تقعد أكثر من 24 ساعة؟ اختار عدد الأيام.",
  "book.nightsValue": "{n} × 24 ساعة",
  "book.priceDetail": "{price} × {guests} أشخاص × {nights} أيام",

  "book.title": "الحجز",
  "book.step1": "التاريخ والمدّة",
  "book.step2": "معلوماتك",
  "book.step3": "مراجعة الحجز",
  "book.step4": "الدفع",
  "book.date": "التاريخ",
  "book.slot": "المدّة",
  "book.cin": "رقم بطاقة التعريف",
  "book.fullName": "الاسم واللقب",
  "book.phone": "رقم التليفون",
  "book.dob": "تاريخ الولادة",
  "book.guests": "عدد الأشخاص",
  "book.continue": "كمّل",
  "book.back": "رجوع",
  "book.review": "راجع حجزك",
  "book.cabin": "البنغالو",
  "book.guest": "الحريف",
  "book.total": "المجموع",
  "book.confirmPay": "أكّد وخلّص",
  "book.payment": "اختار طريقة الخلاص",
  "book.paymentNote": "خلاص تجريبي — ما يتقصّ حتى مبلغ حقيقي.",
  "book.cardNumber": "رقم البطاقة",
  "book.cardName": "الاسم على البطاقة",
  "book.expiry": "تاريخ الانتهاء",
  "book.cvv": "الرمز السري",
  "book.pay": "خلّص {amount}",
  "book.processing": "جاري الخلاص…",
  "book.selectSlotFirst": "اختار التاريخ والمدّة.",
  "book.taken": "الفترة هاذي تحجزت توّا. اختار فترة أخرى.",

  "book.payMethod.card": "بطاقة بنكية",
  "book.payMethod.d17": "D17 (خلاص بالهاتف)",
  "book.payMethod.bank": "تحويل بنكي",
  "book.payMethod.cash": "كاش (وقت الوصول)",
  "book.payMethod.d17Phone": "رقم D17",

  "book.payMethod.bankNote":
    "حوّل المبلغ باسم الزوارع — RIB: 12 345 678 901 234 567 890 12. وما تنساش تذكر رقم الحجز.",

  "book.payMethod.cashNote": "خلّص كاش وقت توصل. الحجز متاعك مؤكّد توّا.",

  "book.adults": "كبار",
  "book.children6_10": "صغار من 6 لـ10 سنين",
  "book.childrenUnder5": "صغار أقل من 5 سنين",
  "book.childrenNote": "من 6 لـ10 سنين: 50 د.ت · أقل من 5 سنين: مجاناً",

  "receipt.downloadWarning":
    "حمّل ولا اطبع الوصل هذا — باش تحتاجو وقت توصل للبنغالو.",

  "gallery.title": "تصاور البنغالوهات",
  "gallery.subtitle": "اكتشف تفاصيل كل بنغالو فوق الماء.",

  "admin.notifications": "الإشعارات",
  "admin.markAllRead": "علّم الكل كمقروء",
  "admin.noNotifications": "ما فماش إشعارات جديدة.",
  "admin.newReservation": "حجز جديد",
  "admin.cin": "بطاقة تعريف الحريف",
  "admin.receipt": "وصل الحريف",

  "receipt.title": "وصل الحجز",
  "receipt.paid": "خالص",
  "receipt.ref": "المرجع",
  "receipt.amount": "المبلغ",
  "receipt.thanks": "يعطيك الصحة، تم تأكيد حجزك.",
  "receipt.print": "طباعة",
  "receipt.download": "حمّل الوصل",
  "receipt.home": "ارجع للرئيسية",
  "receipt.saveModalTitle": "حفظ الوصل",
  "receipt.saveModalBody":
    "باش نهبطولك تصويرة للوصل أوتوماتيكياً. احتفظ بيها — باش تحتاجها وقت توصل للبنغالو.",
  "receipt.saveModalDownload": "حمّل الوصل مرة أخرى",
  "receipt.saveModalClose": "حفظت النسخة",

  "admin.title": "الإدارة",
  "admin.login": "تسجيل الدخول",
  "admin.email": "البريد الإلكتروني",
  "admin.password": "كلمة السر",
  "admin.signIn": "دخول",
  "admin.turnstileLoading": "جاري التثبّت...",
  "admin.turnstileRequired": "كمّل التثبّت باش نضمنو إنك موش روبوت.",
  "admin.turnstileError": "صار مشكل في التثبّت. عاود جرّب.",
  "admin.turnstileFailed": "التثبّت فشل. عاود جرّب.",
  "admin.createFirst": "أنشئ حساب المسؤول",
  "admin.createFirstNote":
    "ما فماش حساب مسؤول توّا. أنشئ واحد توا (مرة واحدة برك).",
  "admin.signOut": "خروج",

  "admin.reservations": "الحجوزات",
  "admin.archiveTab": "الأرشيف",
  "admin.cabinsTab": "البنغالوهات",
  "admin.revenue": "المداخيل",
  "admin.count": "الحجوزات",
  "admin.week": "هذا الأسبوع",
  "admin.month": "هذا الشهر",
  "admin.search": "إبحث (الاسم، بطاقة التعريف، المرجع…)",
  "admin.status": "الحالة",
  "admin.all": "الكل",
  "admin.save": "حفظ",
  "admin.delete": "حذف",
  "admin.cancel": "إلغاء",
  "admin.edit": "تعديل",
  "admin.noAccess": "الحساب هذا ما عندوش صلاحيات الإدارة.",
  "admin.turnstileLoadError":
    "ما نجّمش نحملو التثبّت ضد الروبوتات. تثبّت من اتصالك بالإنترنت.",

  "admin.priceHalf": "سعر نص النهار",
  "admin.price24": "سعر 24 ساعة",
  "admin.empty": "ما فماش حجوزات.",
  "admin.addCabin": "زيد بنغالو",
  "admin.name": "الاسم (بالفرنسية)",
  "admin.nameAr": "الاسم (بالعربية)",
  "admin.capacity": "عدد الأشخاص",
  "admin.create": "إنشاء",
  "admin.available": "متوفّر للحجز",
  "admin.unavailable": "موش متوفّر",
  "admin.makeUnavailable": "خلّيه موش متوفّر",
  "admin.makeAvailable": "خلّيه متوفّر",
  "admin.nights": "الأيام",
  "admin.confirm": "تأكيد",
  "admin.complete": "إتمام",
  "admin.quickStatus": "تغيير سريع",
  "admin.calendarTab": "الرزنامة",
  "admin.occupancy": "نسبة الحجز",
  "admin.freeUnits": "{n} متوفّر",
  "admin.noBookingsDay": "ما فماش حجوزات في النهار هذا.",
  "admin.dayDetails": "حجوزات النهار",
  "admin.assigned": "البنغالو المعيّن",
  "admin.prevMonth": "الشهر اللي فات",
  "admin.nextMonth": "الشهر الجاي",

  "status.pending": "في الانتظار",
  "status.confirmed": "مؤكّد",
  "status.cancelled": "ملغى",
  "status.completed": "مكمّل",

  "pay.unpaid": "ما تخلّصش",
  "pay.paid": "خالص",

  "common.loading": "جاري التحميل…",
  "common.error": "صار مشكل.",
  "footer.rights": "جميع الحقوق محفوظة.",
};

const dicts: Record<Lang, Dict> = { fr, ar, en };

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
    const stored = window.localStorage.getItem("Reve-z-lang");
    if (stored === "ar" || stored === "fr" || stored === "en")
      setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("Reve-z-lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let out = dicts[lang][key] ?? dicts.fr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars))
          out = out.replace(`{${k}}`, String(v));
      }
      return out;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl",
      setLang,
      t,
    }),
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
