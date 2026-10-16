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
│   │   ├── ServicesSection
│   │   │   └── ServiceCard (×6)
│   │   ├── FeaturedVehiclesSection
│   │   │   └── VehicleRow (×3: Available now, Chauffeured, Self-Drive)
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
| `Button` | `variant` (default / danger / dark), `size` (sm/md/lg/icon), `loading`, `disabled`, `to` / `href` (render as a link), `onClick`, `type`, `children` | The one button for the whole portal, and it has one look: the navbar "Rent a Car" gold-outline pill. There is no filled or text-only version (`danger` is the same pill in red, `dark` the same pill in ink for a gold surface). Every button and link that looks like a button uses it — never hand-style a `<button>`/`<Link>`. |
| `RangeSlider` | `label`, `min`, `max`, `step`, `value` `{min,max}`, `onCommit`, `format` | Two-handle slider (price range); keyboard accessible; reports once when a handle is let go |
| `ToggleChip` | `active`, `onClick`, `size` (sm/md), `children` | On/off pill (filters, trip types, booking modes); gold outline + soft tint when on |
| `SegmentedControl` | `options[]`, `value`, `onChange`, `label`, `kind` (radio/tab), `size` | Pick-one switch (booking mode, fleet tier) |
| `Input` | `label`, `name`, `type`, `error`, `hint`, `register` (RHF) | Wraps label + input + error |
| `Textarea` | `label`, `name`, `maxLength`, `error`, `register` | Shows character count |
| `Select` | `label`, `name`, `options[]`, `error`, `register` | Accessible `<select>` |
| `Card` | `children`, `className` | Neutral container |
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
| `StepIndicator` | `steps[]`, `currentStep` | Wizard progress |
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

The one place the fonts are chosen — **Plus Jakarta Sans** for headings and text. `tailwind.config.js` builds the
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
        'brand-dark':       '#1A1A2E',
        'brand-navy':       '#16213E',
        'brand-gold':       '#C9A84C',
        'brand-gold-light': '#E8C97A',
        'brand-white':      '#F5F5F5',
        'brand-grey':       '#8A8A9A',
      },
      fontFamily: {
        heading: fontStack(FONTS.heading),   // fonts are set in src/theme/fonts.js
        body:    fontStack(FONTS.body),
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.18)',
        glow: '0 0 16px 0 rgba(201,168,76,0.35)',
      },
    },
  },
  plugins: [],
};
```

### Design Tokens in Practice

```
Background pages:    bg-brand-dark
Background sections: bg-brand-navy
Primary CTA:         bg-brand-gold text-brand-dark hover:bg-brand-gold-light
Secondary CTA:       border border-brand-gold text-brand-gold hover:bg-brand-gold/10
Body text:           text-brand-white
Muted text:          text-brand-grey
Card surface:        bg-white/5 or bg-brand-navy
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
