# Ramellian Executive Travels — Frontend Design & Architecture

**Version:** 1.0  
**Date:** September 2026  

---

## 1. Architecture Overview

The application is a React 18 SPA built with Vite. It communicates exclusively with the Ramellian backend REST API. There is no server-side rendering.

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  ┌──────────┐   ┌──────────────────────────┐ │
│  │  Zustand │   │   TanStack Query Cache   │ │
│  │  Stores  │   │  (vehicles, bookings…)   │ │
│  └────┬─────┘   └────────────┬─────────────┘ │
│       │                      │               │
│  ┌────▼──────────────────────▼─────────────┐ │
│  │          React Component Tree           │ │
│  │  Pages → Layout → Components → Widgets  │ │
│  └────────────────────┬────────────────────┘ │
│                       │                      │
│  ┌────────────────────▼────────────────────┐ │
│  │          src/lib/api.js (Axios)         │ │
│  │   + Request interceptor (JWT inject)    │ │
│  └────────────────────┬────────────────────┘ │
└───────────────────────┼─────────────────────┘
                        │ HTTPS / REST
┌───────────────────────▼─────────────────────┐
│        Ramellian Backend (Spring Boot)       │
│    /api/v1/auth  /vehicles  /bookings        │
│    /documents    /payments  /contracts       │
└─────────────────────────────────────────────┘
```

---

## 2. Routing Structure

All routes are declared in `src/App.jsx` using React Router v6 `<Routes>`.

```
/                           → HomePage          (public)
/vehicles                   → VehiclesPage      (public)
/vehicles/:id               → VehicleDetailPage (public)
/services                   → ServicesPage      (public)
/fleet                      → FleetPage         (public)
/about                      → AboutPage         (public)
/contact                    → ContactPage       (public)
/faq                        → FaqPage           (public)

/auth/register              → RegisterPage      (guest only)
/auth/login                 → LoginPage         (guest only)
/auth/verify-email          → VerifyEmailPage   (guest only)
/auth/verify-2fa            → Verify2faPage     (guest only)

/dashboard                  → DashboardPage     (renter)
/dashboard/bookings         → MyBookingsPage    (renter)
/dashboard/bookings/:id     → BookingDetailPage (renter)
/dashboard/documents        → DocumentsPage     (renter)
/dashboard/profile          → ProfilePage       (renter)

/booking                    → BookingCartPage       (public — the selection: vehicles, days x price, total)
/booking/contact            → redirects to /booking/checkout (old contact step; sign-up asks for the phone now)
/booking/checkout           → BookingCheckoutPage   (public; signed in → creates the next booking)
/book/:vehicleId            → redirect to /vehicles/:vehicleId (the old wizard address)
/book/:vehicleId/contract   → ContractPage      (renter)
/book/:vehicleId/payment    → PaymentPage       (renter)
/book/:vehicleId/sign       → SignaturePage     (renter)
/book/:vehicleId/confirm    → BookingConfirmPage(renter)

/owner                      → OwnerDashboardPage    (owner/manager)
/owner/bookings             → OwnerBookingsPage     (owner/manager)
/owner/bookings/:id         → OwnerBookingDetailPage(owner/manager)
/owner/reports              → OwnerReportsPage      (owner/manager)

/admin                      → AdminDashboardPage    (admin)
/admin/bookings             → AdminBookingsPage     (admin)
/admin/reports              → AdminReportsPage      (admin)
/admin/contracts/templates  → ContractTemplatesPage (admin)

*                           → NotFoundPage      (public)
```

### Route Guards

- `<GuestRoute>` — redirects authenticated users away from `/auth/*`.
- `<PrivateRoute>` — redirects unauthenticated users to `/auth/login`.
- `<RoleRoute role="OWNER">` — redirects users without the required role to `/dashboard`.

---

## 3. State Management

### 3.1 Zustand Stores

**`authStore.js`**
```
{
  token: string | null,
  user: { id, email, name, role } | null,
  setToken(token),
  setUser(user),
  clearAuth(),
}
```

**`bookingStore.js`**
```
{
  draft: {
    vehicleId: string | null,
    startTime: string | null,
    endTime: string | null,
    bookingMode: 'SELF_DRIVE' | 'CHAUFFEURED' | null,
    tripType: string | null,
    renterNotes: string,
  },
  setDraft(partial),
  clearDraft(),
}
```

**`uiStore.js`**
```
{
  mobileMenuOpen: boolean,
  toggleMobileMenu(),
  closeMobileMenu(),
}
```

### 3.2 TanStack Query Keys

| Resource | Query Key Pattern |
|---|---|
| Vehicle list | `['vehicles', filterParams]` |
| Vehicle detail | `['vehicles', id]` |
| My bookings | `['bookings', 'mine']` |
| Booking detail | `['bookings', id]` |
| Owner bookings | `['bookings', 'owner']` |
| Documents | `['documents', userId]` |
| Payment status | `['payment-status', bookingId]` |
| Contract | `['contract', contractId]` |

---

## 4. Component Tree

```
App
├── Navbar
│   ├── Logo
│   ├── NavLinks (desktop)
│   ├── MobileMenuButton
│   └── MobileMenu (drawer)
│       └── NavLinks (mobile)
│
├── Pages (via <Outlet>)
│   │
│   ├── HomePage
│   │   ├── HeroSection
│   │   │   └── FareEstimatorWidget
│   │   ├── FeaturedVehiclesSection   (right after the search, like the design's "Best Cars")
│   │   │   └── VehicleRow (×4: Available now, Just added, Chauffeured, Self-Drive)
│   │   ├── ServicesSection
│   │   │   └── ServiceCard (×6)
│   │   ├── HowItWorksSection
│   │   │   └── StepCard (×3)
│   │   └── TrustSection
│   │       └── TrustBadge (×4)
│   │
│   ├── VehiclesPage
│   │   ├── SearchBar
│   │   ├── FilterPanel
│   │   │   ├── PriceRangeSlider
│   │   │   ├── DateRangePicker
│   │   │   ├── SelectFilter (fuel, transmission, capacity)
│   │   │   └── ToggleFilter (self-drive, chauffeured)
│   │   ├── SortDropdown
│   │   └── VehicleGrid
│   │       ├── VehicleCard (×n)
│   │       ├── VehicleCardSkeleton (loading)
│   │       └── EmptyState
│   │
│   ├── VehicleDetailPage
│   │   ├── ImageGallery
│   │   ├── VehicleInfoPanel
│   │   ├── VehicleSpecBadges
│   │   └── AddToBookingPanel
│   │       └── Step2_TripDetails
│   │           ├── DateRangePicker
│   │           ├── BookingModeToggle
│   │           ├── TripTypeSelect
│   │           └── RenterNotesTextarea
│   │
│   ├── BookingCartPage / BookingCheckoutPage
│   │   ├── BookingProgress (StepIndicator)
│   │   ├── BookingSummaryCard
│   │   └── CartTotals
│   │
│   ├── ContractPage
│   │   ├── ContractViewer
│   │   └── BookingUnavailableNotice (owner declined it, or its hold expired)
│   │
│   ├── PaymentPage
│   │   ├── PaymentSummary
│   │   ├── PesapalRedirectButton
│   │   └── BookingUnavailableNotice
│   │
│   ├── SignaturePage
│   │   ├── ContractViewer
│   │   ├── SignaturePad
│   │   └── BookingUnavailableNotice
│   │
│   ├── BookingConfirmPage
│   │   ├── SuccessBanner
│   │   └── BookingSummaryCard
│   │
│   ├── DashboardPage
│   │   └── DashboardSummaryCards
│   │
│   ├── MyBookingsPage
│   │   └── BookingTable
│   │       └── BookingRow (×n)
│   │
│   ├── DocumentsPage
│   │   ├── DocumentUploadCard
│   │   └── DocumentStatusList
│   │
│   └── (owner / admin pages follow same pattern)
│
└── Footer
    ├── FooterBrand
    ├── FooterLinks (columns)
    └── FooterContact
```

---

## 5. Reusable Widget Catalogue (`src/components/ui/`)

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant` (default / outline / danger / dark), `size` (xs/sm/md/lg/icon), `loading`, `disabled`, `to` / `href` (render as a link), `onClick`, `type`, `children` | The one button for the whole portal — the Figma design system's solid charcoal pill ("Book Now"). `outline` is the same pill in white with a grey outline, for a quieter action beside a main one; `danger` is the pill outlined in red; `dark` is a white pill for a charcoal surface. There is no text-only version. Every button and link that looks like a button uses it — never hand-style a `<button>`/`<Link>`. |
| `RangeSlider` | `label`, `min`, `max`, `step`, `value` `{min,max}`, `onCommit`, `format` | Two-handle slider (price range); keyboard accessible; reports once when a handle is let go |
| `ToggleChip` | `active`, `onClick`, `size` (sm/md), `children` | On/off pill (filters, trip types, booking modes); solid charcoal when on, white with a grey outline when off (the design's filter pill) |
| `FloatingActionBar` | `watch` (ref to the page's own action area), `summary`, `label`, `children` (buttons) | A page's main action floating along the bottom on phones/tablets (below `lg`) — the price/total on the left, the buttons on the right — only while the page's own buttons are still further down; above the phone tab bar when signed in; the chat button moves up while it shows. Used on the vehicle page (Book now / Add or Update booking) and Checkout (Continue / Sign up · Log in) |
| `TripTypeIcon` / `TripTypeLabel` | icon: `type`, `size`; label: `type`, `size` | One icon per trip type — General = route, Airport Transfer = plane taking off, Wedding = gem (the ring), Corporate = briefcase, Safari = binoculars, Family Journey = people, Self-Drive Rental = the Self-Drive steering wheel, Cake Transportation = cake; unknown = route. `TripTypeLabel` is icon + label, used in trip-type chips, "Suited for" and booking details |
| `SegmentedControl` | `options[]`, `value`, `onChange`, `label`, `kind` (radio/tab), `size` | Pick-one switch (booking mode, fleet tier) — the design's "Filter Cars Type" switch: selected is the solid accent (navy) pill; an option may carry an `icon` When the options are wider than the screen it scrolls sideways and keeps the chosen one in view |
| `Input` | `label`, `name`, `type`, `error`, `hint`, `register` (RHF) | The design's outlined field: white, grey outline, label set into the top border; error/hint below |
| `Textarea` | `label`, `name`, `maxLength`, `error`, `register` | Same outlined field as Input; shows character count |
| `Select` | `label`, `name`, `options[]`, `error`, `register` | Accessible `<select>`, same outlined field as Input, with a chevron |
| `Card` | `children`, `className` | White card: hairline outline, 14px corners (`rounded-card`), soft shadow |
| `DetailList` / `DetailRow` | `size` (sm/xs); row: `label`, `stacked`, `hidden`, `divider`, `valueClassName` | The one way to show label/value details (booking dates, locations, price lines, totals, handover readings, audit fields) — a small table: two columns (labels, then every value **left-aligned** beside them), rows alternating white/grey, thin outline. `stacked` for free text, `divider` for a line above (a Total). |
| `Badge` | `label`, `variant` (success/warning/danger/info/neutral) | Status pill |
| `Modal` | `isOpen`, `onClose`, `title`, `children` | Focus-trapped overlay |
| `Spinner` | `size`, `color` | Loading indicator |
| `Skeleton` | `width`, `height`, `rounded` | Content placeholder |
| `EmptyState` | `icon`, `title`, `description`, `action` | Zero-results / no-data |
| `ErrorBanner` | `message`, `onRetry` | Retryable error display |
| `Logo` | `size` | Always uses brand asset |
| `Avatar` | `name`, `src`, `size` | Initials fallback |
| `Divider` | `label` | Section separator |
| `Tooltip` | `content`, `children` | Hover info |
| `StepIndicator` | `steps[]`, `currentStep`, `onStepClick` | Wizard progress — the design's step bar: small dots on a thin line, names underneath (done = navy dot with a check, current = ringed dot, to come = faded) |
| `AuthCard` (components/auth) | `children` | The see-through frosted card on the sign-in pages (white tint + strong blur); inside it grey text is darker and field labels sit inside the box (`.auth-glass` rules in index.css) |
| `WebcamCapture` | `isOpen`, `onClose`, `onCapture(file)`, `title`, `hint`; `prefersWebcamWindow()` | Takes a photo with a computer's camera (the ID selfie): mirrored live preview, Take photo → Retake / Use this photo; the saved photo is not mirrored. Phones keep their own camera via `capture` |
| `FeatureTile` / `FeatureGrid` | tile: `icon`, `label`, `value`; grid: `label` | The design's "Car features" tile, compact: icon in a white circle on the left, label and bold value beside it; 2/3/4 across. Grid `initialCount` shows that many first with "Show all N features". On first view the tiles fade up and a gold highlight sweeps across them once (`motion-safe`); hover lifts a tile and turns its icon gold |
| `CountdownTimer` | `expiresAt`, `onExpired` | Booking expiry |
| `PriceDisplay` | `amount`, `period` | `KES 12,000 / day` |

---

## 6. Custom Hooks (`src/hooks/`)

| Hook | Responsibilities |
|---|---|
| `useAuth()` | Login, logout, register, 2FA, token refresh |
| `useVehicles(filters)` | Fetches paginated vehicle list with filters |
| `useVehicle(id)` | Fetches single vehicle + photos |
| `useBooking(id)` | Fetches booking detail |
| `useCreateBooking()` | Mutation: create booking, invalidates `bookings/mine` |
| `useDocuments()` | Fetches user documents |
| `useUploadDocument()` | Mutation: uploads document file |
| `useContractDraft(bookingId)` | Mutation: generates frozen contract draft |
| `useAcceptContract(bookingId)` | Mutation: accepts contract |
| `usePesapalCheckout(bookingId)` | Mutation: initiates Pesapal, returns `redirectUrl` |
| `usePaymentStatus(bookingId)` | Polling query: checks Pesapal payment status |
| `useContract(contractId)` | Fetches contract detail |
| `useSignContract(contractId)` | Mutation: submits signature |
| `useOwnerBookings()` | Fetches owner bookings |
| `useAssignChauffeur(bookingId)` | Mutation: assigns chauffeur |
| `useReports(role)` | Fetches the appropriate report endpoint by role |

---

## 7. Theme Configuration

### Fonts: `src/theme/fonts.js`

The one place the fonts are chosen — **Roboto** for headings and text (the Figma design system's typeface). `tailwind.config.js` builds the
`font-heading` / `font-body` classes from it, `vite.config.js` puts the matching Google Fonts link into
`index.html` (where `<!-- app-fonts -->` stands), and `PageLoader` reads it for its lettering. To switch, change
`heading` / `body` there to any Google Fonts family name and restart `npm run dev`.

### `tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{jsx,js}'],
  theme: {
    extend: {
      colors: {
        canvas:         '#F8F8F8', // page background
        surface:        '#FFFFFF', // cards, panels, the menu
        subtle:         '#EDEDED', // quiet fills: chips, feature tiles, image wells
        line:           '#D7D7D7', // field and card outlines
        ink:            '#000000', // main text
        muted:          '#6B6B6B', // secondary text — the design's #7F7F7F darkened to 5.3:1 for readability
        icon:           '#767676', // outline icons
        accent:         '#16213E', // buttons, selected state, links — Ramellian navy
        'accent-hover': '#25365F',
        'on-accent':    '#FFFFFF', // text on an accent fill
        overlay:        '#131927', // dark bands
        star:           '#C9A84C', // rating stars, unread counts (Ramellian gold)
        'brand-navy':   '#16213E', // Ramellian navy: tab bar, closing banner, hero scrim, letterhead
        'brand-gold':   '#C9A84C', // Ramellian gold for lines, dots, fills — never small text
        'brand-gold-deep': '#8C6D1F', // gold for text on white (section labels)
      },
      fontFamily: {
        heading: fontStack(FONTS.heading),   // fonts are set in src/theme/fonts.js
        body:    fontStack(FONTS.body),
      },
      boxShadow: {
        card: '0 4px 10px 0 rgba(0,0,0,0.06)',
        lift: '0 4px 9.8px 0 rgba(0,0,0,0.25)', // floating bars, the phone tab bar
      },
      borderRadius: { card: '14px', tile: '10px' },
    },
  },
  plugins: [],
};
```

### Design Tokens in Practice

```
Background pages:    bg-canvas
Cards / panels:      bg-surface border border-subtle rounded-card shadow-card   (use Card)
Primary CTA:         Button (bg-accent text-on-accent hover:bg-accent-hover)
Secondary CTA:       Button variant="outline" (bg-surface border-line text-ink)
Selected state:      bg-accent text-on-accent (menu item, chip, segment)
Body text:           text-ink
Muted text:          text-muted
Quiet tile / well:   bg-subtle rounded-tile
Lines on the page:   border-black/10 (or border-line for fields)
```

Source: the Figma community file *Car Rental App UI & UX Design* ("Qent"), DESIGN SYSTEM page — colours, the
Roboto type scale, the pill button, the outlined input, the "Filter Cars Type" switch and the phone "Bottom
Navigation". Phones (below `md`) also get that floating charcoal tab bar (`components/layout/MobileTabBar.jsx`)
for a signed-in person — Home, Search, Messages, Inbox, Profile — alongside the left menu, never instead of it.

```text
**Dark mode** (signed-in people only, never automatic): a `dark` class on <html> swaps the `--c-*` colour variables in
index.css (tailwind colours are `rgb(var(--c-…))`); accent becomes Ramellian gold with navy text. `lib/theme.js`,
`ThemeToggle` (top bar, signed in), and an early script in index.html. Use the theme colours (and `ink/N` for faint
lines/tints, never `black/N`); `well` is the light panel behind car photos in both themes. Printable documents stay white.

Status colours on the light page use the -600/-700 shades (text-red-600, text-green-700…), never -300/-400.
Ramellian colours are mixed in sparingly: buttons and selected states are navy (accent); gold marks section labels,
the hero's highlighted word, today and the picked range in the date picker, the current phone tab, and the
letterhead. Gold is never used for something that can't be chosen.

Background photos: the home hero shows its photo at full colour under a navy gradient with white text (the
slideshow holds still under "reduce motion"); the log-in and sign-up screens (AuthBackdrop) keep a lighter photo behind their card. Every other page follows
the design system: the plain `canvas` page with white cards, no photo. Hero photos must be wide and high-resolution (~1500px+ across).
```

---

## 8. API Layer (`src/lib/api.js`)

```
src/lib/
  api.js          — Axios instance + interceptors
  queryClient.js  — TanStack QueryClient configuration
  constants.js    — BOOKING_MODES, TRIP_TYPES, SORT_OPTIONS, etc.
  utils.js        — formatCurrency, formatDate, formatDateRange
```

### Query Client Defaults

```js
{
  defaultOptions: {
    queries: {
      staleTime:  5 * 60 * 1000,   // 5 min
      gcTime:     10 * 60 * 1000,  // 10 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
}
```

---

## 9. Error Boundary Strategy

- A global `<ErrorBoundary>` wraps the entire app and catches JS runtime errors, showing a fallback with a "Reload" button.
- Page-level error boundaries wrap each route so one broken page doesn't kill the whole app.
- API errors are handled per-query/mutation using `onError` callbacks that call `toast.error()` via react-hot-toast.

---

## 10. Folder-by-Feature vs. Folder-by-Type

The project uses **folder-by-type** (as defined in the constitution) with colocation of tests. This keeps primitives discoverable and avoids deep nesting. When a feature grows beyond 3 files, it gets its own subfolder under `components/`.

---

## 11. Key UX Flows

### Booking Flow (Happy Path)

Everything up to checkout works without an account; the selection (cartStore) and the contact live in localStorage.

```
VehiclesPage
  → Select vehicle → VehicleDetailPage (AddToBookingPanel: dates, mode, notes, price = days x daily price)
  → "Add to booking" → /booking (BookingCartPage) — add more vehicles, edit, remove
  → "Book" → visitors: /booking/contact (phone OR email) → /booking/checkout
             signed in: /booking/checkout
  → checkout, visitor: sign up → verify email → log in → back to /booking/checkout
  → checkout, signed in: live re-check of each vehicle + document gate
  → POST /bookings/create   (ONE vehicle, the next in the selection; bookings are made one at a time
                             so a pending-payment hold cannot run out while an earlier one is paid)
  → POST /contract/draft → ContractPage (read + accept)
  → POST /contract/accept
  → POST /pesapal/checkout → redirect to Pesapal
  → return → PaymentPage (polling status)
  → SUCCESSFUL → SignaturePage (view contract + sign)
  → PUT /contract/sign → BookingConfirmPage ✓ → more vehicles in the selection? → next booking
```

### Document Gate

```
"Continue to contract" clicked on checkout (signed in)
  → useDocuments() → are required docs approved? (ID always; licence too if any vehicle is self-drive)
    YES → POST /bookings/create for the next vehicle (a 422 from the backend shows the same gate)
    NO  → show DocumentGateModal
           → "Upload Documents" → DocumentsPage
```

### A booking that no longer holds

A vehicle can be listed as available and still turn out not to be. `isBookingUnfulfilled(status)` (src/lib/utils.js)
is true for `REJECTED` (the owner declined it) and `EXPIRED` (its pending-payment hold ran out) — deliberately not
`CANCELLED`, which is also how a renter's own cancellation reads. `BookingUnavailableNotice` renders the "couldn't be
fulfilled" message (the owner's note if any, Message the owner, Browse other vehicles) wherever that status can show
up: ContractPage, PaymentPage, SignaturePage, BookingDetailPage.

```
Owner rejects a booking, or its 15-min hold expires, while the renter is on Contract/Payment/Signature
  → useBooking(bookingId, { staleTime: 0 })  — always a fresh fetch, not an earlier page's cached copy
  → status is REJECTED/EXPIRED → BookingUnavailableNotice replaces that step's primary action

PaymentPage "Proceed to Payment" clicked
  → refetch the booking one more time, right before the Pesapal checkout call
  → still REJECTED/EXPIRED? → block checkout.mutate(), show the notice — no charge is ever attempted
  → otherwise → checkout proceeds as normal
```

No refund endpoint exists yet for a booking declined after it was already paid — see `docs/backend-requests.md` §5.
