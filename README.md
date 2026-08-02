# Zwaraa Lagoon Stays

Build a web app for a cabin resort reservation site called "Zwaraa" (حلق الواد الزوارع),

a lagoon-side cabin stay in Nefza, Tunisia. It has ONE type of accommodation — sleeping

cabins over the water — available in two booking modes: Half-Day or 24 Hours. Each cabin

has its own price for each mode and comes with an included package (meals, a boat ride,

etc. — shown on its detail page).

=== DESIGN DIRECTION (important) ===

The design must be minimal, clean, and NOT look like generic AI-generated UI. Avoid:

- Default purple/blue gradient themes

- Glassmorphism, frosted glass, or any blurred/backdrop-blur elements

- Generic SaaS dashboard look (card soup, drop shadows everywhere, rounded-everything)

- Stock "beach resort" clichés (turquoise gradients, palm tree icons, cursive script fonts)

Instead, use this identity, taken directly from the real place's photos — a saturated

turquoise lagoon, golden amber shallows, white cabins with coral-pink pointed roofs on

stilts over the water, and forested green hills behind. The palette should be vivid and

alive, not muted:

Colors:

- #FFF9EF warm white (base background)

- #0E8CA8 lagoon turquoise (primary color — headers, nav, key text)

- #E8A63D golden amber (secondary accent — icons, tags, dividers)

- #EE7B6D coral pink (the standout accent, from the cabin roofs — use for the main CTA

  button and any "this matters" highlight)

- #2E6B3D forest green (supporting accent from the hills)

- #173238 deep teal-black (body text)

Typography:

- Headings: a warm, slightly rounded serif (Lora or Fraunces)

- Body: a clean grotesque sans-serif (Inter or General Sans)

- Prices and dates: a monospace font for precision

Signature visual element: a simple hand-drawn wave-line as a section divider (not a

straight line), and cabin photos framed with a subtle asymmetric wooden-plank border

instead of plain rounded rectangles. Let the coral pink recur deliberately across the

UI (buttons, active states, small tags) so it reads as an intentional brand color, not

just a photo accident. Keep ornamentation minimal — this is the one distinctive touch,

everything else should be quiet, generous whitespace, no clutter.

Photography style should feel documentary/authentic (wide shots of cabins on the water),

not staged luxury lifestyle photography.

=== LANGUAGE ===

The site must support French and Arabic (with a language switcher). Arabic content

should render right-to-left. Use French as the default language.

=== PAGES TO BUILD ===

1. HOMEPAGE

   - Hero section with the resort name, a short description, and location

   - "Available cabins" section: a grid of cabin cards, each showing a photo, the

     cabin name, its Half-Day price, and its 24-Hour price

   - Each cabin card is clickable and goes to that cabin's detail page

2. CABIN DETAIL PAGE (one per cabin, dynamic route e.g. /cabins/[id])

   - Full photo gallery

   - Description and capacity

   - "What's included" section listing the package that comes with the cabin

     (meals, boat ride, etc.)

   - Half-Day and 24-Hour prices, each with a "Reserve" button

   - A date picker to check availability before starting the reservation

3. RESERVATION FLOW (triggered from the cabin detail page)

   Step 1 — pick a date and slot (Half-Day or 24 Hours)

   Step 2 — reservation form with these exact fields:

     - CIN (national ID number)

     - Full name (nom et prénom)

     - Phone number

     - Date of birth

     - Number of people

   Step 3 — review screen: cabin, date, slot, included package, total price

   Step 4 — SIMULATED payment screen:

     - Do NOT integrate a real payment provider yet.

     - Build a fake card payment form (card number, expiry, CVV — accept any input,

       no real validation against a payment network)

     - On submit, show a short, tasteful loading/processing animation (1-2 seconds)

     - Then show a success state

   Step 5 — Bill / receipt page:

     - Show a clean receipt/invoice-style summary: reservation ID, cabin, date,

       slot, guest name, total amount, "Paid" status

     - Add a subtle success animation on this page (e.g. a checkmark that draws

       itself in, or the receipt sliding/fading in) — tasteful and quick, not

       flashy or slow

4. ADMIN DASHBOARD (separate route, e.g. /admin, protected)

   - Login screen: email + password only (no social login, no sign-up flow needed

     for MVP — a single or few pre-set admin accounts is fine)

   - Reservations list: table of all reservations with filters/search, and full

     CRUD (view details, edit, cancel/delete a reservation)

   - Cabins management: ability to edit each cabin's Half-Day and 24-Hour price

   - Dashboard summary: total revenue / total amount collected, and count of

     reservations (e.g. this week/month)

=== DATA MODEL ===

Use this structure (adapt to whatever backend/database the builder provides):

Cabin: id, name, capacity, description, photos[], included_package, price_half_day,

  price_24h, is_active

Reservation: id, cabin_id, reservation_date, slot (half_day | 24h), cin, full_name,

  phone, date_of_birth, guests_count, status (pending | confirmed | cancelled |

  completed), total_price, payment_status (unpaid | paid), created_at

Transaction (simulated): id, reservation_id, amount, status (success | failed),

  simulated (always true for now), created_at

=== FUNCTIONAL NOTES ===

- A cabin + date + slot combination must not be double-booked — block a slot as

  soon as a reservation is pending, not just when it's confirmed.

- The admin dashboard is the only place prices can be changed; the guest side

  always reads the current price live.

- Keep the whole flow mobile-first — most guests will book from a phone.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/633fb4d8-fba2-4f2a-b0bb-0b34ffe3e652).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
