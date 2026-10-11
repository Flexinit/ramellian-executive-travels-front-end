# Ramellian Executive Travels — Implementation Plan

**Version:** 1.0  
**Date:** September 2026  
**Methodology:** Test-Driven Development (Red → Green → Refactor)  

> Every task below follows the TDD cycle. The "Test first" column describes the failing test to write before any implementation code.

---

## Phase 0 — Project Scaffold

**Goal:** A running Vite + React app with all dependencies, Tailwind configured, and the test harness wired up.

| # | Task | Test First | Done |
|---|---|---|---|
| 0.1 | `npm create vite@latest . -- --template react` | — | ☐ |
| 0.2 | Install dependencies: react-router-dom, @tanstack/react-query, zustand, axios, react-hook-form, zod, react-hot-toast, date-fns, lucide-react, react-pdf, react-signature-canvas | — | ☐ |
| 0.3 | Install dev dependencies: vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/user-event, msw, jest-axe, @testing-library/jest-dom | — | ☐ |
| 0.4 | Configure `vite.config.js` with vitest settings (jsdom environment, setupFiles, coverage thresholds) | `vitest --run` exits 0 with empty test suite | ☐ |
| 0.5 | Configure Tailwind CSS v3 with brand tokens (see design.md §7) | — | ☐ |
| 0.6 | Add Google Fonts (Playfair Display, Inter) to `index.html` | — | ☐ |
| 0.7 | Create `.env.example` with `VITE_API_BASE_URL` and `VITE_PESAPAL_ENV` | — | ☐ |
| 0.8 | Create `src/lib/api.js` base Axios instance | `api.test.js` — interceptor attaches `Authorization: Bearer <token>` | ☐ |
| 0.9 | Create `src/lib/queryClient.js` with default options | — | ☐ |
| 0.10 | Create `src/lib/constants.js` — BOOKING_MODES, TRIP_TYPES, SORT_OPTIONS | `constants.test.js` — exports exist and are frozen | ☐ |
| 0.11 | Create `src/lib/utils.js` — `formatCurrency`, `formatDate`, `formatDateRange` | `utils.test.js` — KES formatting, date locale | ☐ |
| 0.12 | Set up MSW handlers file at `src/mocks/handlers.js` and `src/mocks/server.js` | — | ☐ |
| 0.13 | Create `src/store/authStore.js` | `authStore.test.js` — setToken, clearAuth, persists token | ☐ |
| 0.14 | Create `src/store/bookingStore.js` | `bookingStore.test.js` — setDraft, clearDraft | ☐ |
| 0.15 | Create `src/store/uiStore.js` | `uiStore.test.js` — toggleMobileMenu, closeMobileMenu | ☐ |
| 0.16 | Create `src/App.jsx` with `<Routes>` skeleton (all routes → `<div>placeholder</div>`) | `App.test.jsx` — renders without crashing, navigating to `/` renders home placeholder | ☐ |

---

## Phase 1 — UI Primitive Widgets

**Goal:** Build the reusable widget library in `src/components/ui/`. Every widget ships with its test and passes `jest-axe`.

| # | Widget | Test First |
|---|---|---|
| 1.1 | `Button` | Renders label, fires `onClick`, shows spinner when `loading=true`, is disabled when `disabled=true`, axe passes |
| 1.2 | `Input` | Renders label + input, shows error message, `register` prop binds correctly, axe passes |
| 1.3 | `Textarea` | Renders with character counter, shows error, respects `maxLength`, axe passes |
| 1.4 | `Select` | Renders options, selected value reflects `register`, shows error, axe passes |
| 1.5 | `Card` | Renders children, accepts `className` override |
| 1.6 | `Badge` | Renders label, applies correct variant colour class |
| 1.7 | `Modal` | Opens/closes on `isOpen`, traps focus, `onClose` fires on backdrop click, axe passes |
| 1.8 | `Spinner` | Renders with `role="status"` and accessible label |
| 1.9 | `Skeleton` | Renders with correct dimensions, `aria-hidden=true` |
| 1.10 | `EmptyState` | Renders icon, title, description, optional action button |
| 1.11 | `ErrorBanner` | Renders message, fires `onRetry`, axe passes |
| 1.12 | `Logo` | Renders an `<img>` with alt text, uses `src/assets/logo.png` |
| 1.13 | `Avatar` | Shows initials when no `src`, shows image when `src` provided |
| 1.14 | `Divider` | Renders with optional label |
| 1.15 | `Tooltip` | Shows content on hover, accessible via `aria-describedby` |
| 1.16 | `StepIndicator` | Highlights current step, marks completed steps, axe passes |
| 1.17 | `CountdownTimer` | Counts down to `expiresAt`, calls `onExpired` at zero |
| 1.18 | `PriceDisplay` | Formats as `KES 12,000 / day` |

---

## Phase 2 — Layout Components

**Goal:** Navbar, Footer, and page wrapper shells.

| # | Task | Test First |
|---|---|---|
| 2.1 | `Navbar` — logo + nav links + auth buttons | Renders logo, shows Login/Register when unauthenticated, shows avatar when authenticated, axe passes |
| 2.2 | `NavLink` — with optional dropdown | Renders as `<Link>` without dropdown, renders as button+panel with dropdown, active route gets gold underline |
| 2.3 | `DropdownMenu` — vehicles and services panels | Renders all items, closes on outside click, axe passes |
| 2.4 | `MobileMenu` — drawer | Opens/closes via hamburger, all links present, axe passes |
| 2.5 | `UserMenu` — avatar dropdown | Shows correct links per role (renter/owner/admin), logout clears auth store |
| 2.6 | `Footer` | Renders 3 link columns, phone numbers, copyright |
| 2.7 | `PageWrapper` | Wraps children with `<main>`, applies responsive padding |
| 2.8 | `DashboardLayout` — sidebar + outlet | Renders sidebar nav, renders `<Outlet>`, highlights active sidebar item |
| 2.9 | `GuestRoute` | Redirects to `/dashboard` if user is authenticated |
| 2.10 | `PrivateRoute` | Redirects to `/auth/login` if not authenticated |
| 2.11 | `RoleRoute` | Redirects to `/dashboard` if user lacks required role |

---

## Phase 3 — Authentication Pages

| # | Task | Test First |
|---|---|---|
| 3.1 | `useAuth` hook — login mutation | MSW handler for `POST /auth/login`; hook sets token in store on success; on 401 shows error toast |
| 3.2 | `useAuth` hook — register mutation | MSW handler for `POST /auth/register`; navigates to verify-email on success |
| 3.3 | `useAuth` hook — verify email mutation | MSW handler, navigates to login on success |
| 3.4 | `useAuth` hook — verify 2FA mutation | MSW handler, sets token on success |
| 3.5 | `LoginPage` | Submits form, shows field errors on 422, redirects on success |
| 3.6 | `RegisterPage` | Zod schema validates all fields, shows password strength |
| 3.7 | `VerifyEmailPage` | Renders token input, shows success/error state |
| 3.8 | `Verify2faPage` | Renders 6-digit input, calls verify mutation |

---

## Phase 4 — Vehicle Discovery

| # | Task | Test First |
|---|---|---|
| 4.1 | `useVehicles(filters)` hook | MSW list handler; returns paginated data; re-fetches when filters change |
| 4.2 | `useVehicle(id)` hook | MSW detail handler; returns vehicle + photos |
| 4.3 | `SearchBar` component | Debounces input at 300 ms, updates URL `query` param |
| 4.4 | `FilterPanel` component | Each filter control updates URL params; "Clear all" resets params |
| 4.5 | `DateRangePicker` component | Sets `startTime`/`endTime` in ISO-8601; clears on reset; axe passes |
| 4.6 | `SortDropdown` component | Changes `sort` URL param; shows active option |
| 4.7 | `VehicleCard` component | Shows photo, model, price, rating badge, fuel/transmission chips; "Book" navigates to detail |
| 4.8 | `VehicleCardSkeleton` | Renders skeleton placeholders with `aria-hidden` |
| 4.9 | `VehicleGrid` component | Shows skeletons while loading, shows empty state when empty, renders cards when data arrives |
| 4.10 | `VehiclesPage` | Reads URL params, passes to `useVehicles`, renders FilterPanel + VehicleGrid |
| 4.11 | `ImageGallery` component | Shows main image, thumbnails, keyboard navigation, axe passes |
| 4.12 | `VehicleInfoPanel` | Displays all spec badges, daily price, description |
| 4.13 | `VehicleDetailPage` | Fetches vehicle by route param, renders gallery + info + Book Now |

---

## Phase 5 — Document Upload

| # | Task | Test First |
|---|---|---|
| 5.1 | `useDocuments()` hook | MSW handler; returns list of user documents with status |
| 5.2 | `useUploadDocument()` mutation | MSW `POST /documents`; shows upload progress; invalidates documents query |
| 5.3 | `DocumentUploadCard` | File input with accepted types, progress bar, success/error state, axe passes |
| 5.4 | `DocumentStatusList` | Shows each document with status `Badge`, pending/approved/rejected |
| 5.5 | `DocumentsPage` | Renders upload cards for each doc type, shows current status |
| 5.6 | `DocumentGateModal` | Shown when booking is attempted without approved docs; links to DocumentsPage |
| 5.7 | Document gate logic in `BookNowButton` | Clicking "Book Now" with missing docs shows modal, not navigation |

---

## Phase 6 — Booking Wizard

| # | Task | Test First |
|---|---|---|
| 6.1 | `bookingStore` draft management | setDraft persists vehicleId, times, mode, notes; clearDraft resets all |
| 6.2 | `BookingModeToggle` component | Toggles SELF_DRIVE / CHAUFFEURED, updates store |
| 6.3 | `TripTypeSelect` component | Renders all 7 trip types as selectable chips |
| 6.4 | `RenterNotesTextarea` | Character counter, max 1000, updates store |
| 6.5 | `BookingSummaryCard` | Renders vehicle, dates, `numberOfDays`, total price, trip type, notes |
| 6.6 | `Step1_VehicleConfirm` | Shows vehicle card + dates from store |
| 6.7 | `Step2_TripDetails` | DateRangePicker + mode toggle + trip type + notes; validates before advancing |
| 6.8 | `Step3_Review` | Shows BookingSummaryCard, Confirm button creates booking |
| 6.9 | `useCreateBooking()` mutation | MSW `POST /bookings/create`; on success navigates to contract page; on 422 shows doc gate |
| 6.10 | `BookingWizardPage` | StepIndicator shows progress; back/next navigation works; guard redirects if unauthenticated |

---

## Phase 7 — Contract & Payment

| # | Task | Test First |
|---|---|---|
| 7.1 | `useContractDraft(bookingId)` mutation | MSW handler; fires on page load; returns `contractText` |
| 7.2 | `ContractViewer` component | Renders contract text in scrollable box, shows PDF via react-pdf when URL provided, axe passes |
| 7.3 | `useAcceptContract(bookingId)` mutation | MSW `POST /contract/accept`; on success navigates to payment page |
| 7.4 | `ContractPage` | Auto-requests draft on mount; renders ContractViewer + Accept button |
| 7.5 | `usePesapalCheckout(bookingId)` mutation | MSW `POST /pesapal/checkout`; redirects `window.location` to `redirectUrl` |
| 7.6 | `PaymentSummary` component | Shows booking total, vehicle, dates |
| 7.7 | `PaymentPage` | Renders summary + Proceed to Payment button; initiates Pesapal on click |
| 7.8 | `usePaymentStatus(bookingId)` polling query | MSW `GET /pesapal/status`; polls every 3 s; stops at SUCCESSFUL or after 10 attempts |
| 7.9 | Payment status polling UI | Shows spinner while PENDING, success banner on SUCCESSFUL, error on failure |
| 7.10 | `useContract(contractId)` query | MSW `GET /contracts/{id}`; returns contract detail |
| 7.11 | `SignaturePad` component | Captures signature as base64 PNG; Clear button resets; Submit disabled until signature drawn; axe passes |
| 7.12 | `useSignContract(contractId)` mutation | MSW `PUT /contracts/{id}/sign`; on success navigates to confirm |
| 7.13 | `SignaturePage` | Renders ContractViewer + SignaturePad; submit sends signature |
| 7.14 | `BookingConfirmPage` | Shows `CountdownTimer` (expired for confirmed), success message, links to dashboard |

---

## Phase 8 — Dashboard (Renter)

| # | Task | Test First |
|---|---|---|
| 8.1 | `useBooking(id)` query | MSW `GET /bookings/{id}`; returns full detail |
| 8.2 | `BookingRow` component | Shows vehicle, dates, status badge, cost; row is clickable |
| 8.3 | `BookingTable` component | Renders rows, shows empty state, handles loading skeleton |
| 8.4 | `MyBookingsPage` | Fetches `GET /bookings/mine`; renders BookingTable |
| 8.5 | `BookingDetailPage` | Fetches booking by ID; shows all details, contract download links |
| 8.6 | `DashboardPage` | Summary cards: total bookings, upcoming trips, pending docs |
| 8.7 | `ProfilePage` | Renders editable profile form; saves via API |

---

## Phase 9 — Owner Panel

| # | Task | Test First |
|---|---|---|
| 9.1 | `useOwnerBookings()` query | MSW `GET /bookings/owner`; returns owner fleet bookings |
| 9.2 | `useAssignChauffeur(bookingId)` mutation | MSW `PUT /bookings/{id}/chauffeur`; invalidates owner bookings query |
| 9.3 | `ChauffeurAssignModal` | Renders chauffeur name input, submits mutation, shows success toast |
| 9.4 | `OwnerBookingsPage` | Renders BookingTable with chauffeur assign column |
| 9.5 | `OwnerBookingDetailPage` | Full detail + ChauffeurAssignModal |
| 9.6 | `useReports('owner')` query | MSW `GET /bookings/reports/owner`; returns revenue + trip type data |
| 9.7 | `ReportSummaryCards` component | Total revenue, bookings count, top trip type |
| 9.8 | `ReportTable` component | Filterable by date range, printable |
| 9.9 | `OwnerReportsPage` | Renders ReportSummaryCards + ReportTable |

---

## Phase 10 — Admin Panel

| # | Task | Test First |
|---|---|---|
| 10.1 | `AdminDashboardPage` | Summary: all bookings count, revenue, pending documents |
| 10.2 | `AdminBookingsPage` | All bookings table with status filters |
| 10.3 | `useReports('admin')` query | MSW `GET /bookings/reports/admin` |
| 10.4 | `AdminReportsPage` | Platform-wide ReportSummaryCards + ReportTable |
| 10.5 | Contract template CRUD hooks | `useContractTemplates`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate` — all with MSW handlers |
| 10.6 | `ContractTemplateEditor` | Rich text / Markdown editor, save/discard buttons |
| 10.7 | `ContractTemplatesPage` | List templates, open editor, confirm delete |

---

## Phase 11 — Public Pages

| # | Task | Test First | Done |
|---|---|---|---|
| 11.1 | `HeroSection` | Renders headline, sub-copy, booking bar, axe passes | ☑ |
| 11.2 | `FareEstimatorWidget` | Route picker + vehicle class + type; shows estimate KES; "Request this trip" navigates to `/contact` | ✗ Built, then removed at user request ("not needed for now") — not currently in the codebase |
| 11.3 | `ServiceCard` | Icon, title, description | ☑ |
| 11.4 | `ServicesSection` | Renders 6 ServiceCards | ☑ |
| 11.5 | `VehicleTierCard` | Shows tier name, vehicle list, style badge | ☑ |
| 11.6 | `FleetSection` | Renders Standard + Executive tier cards | ☑ |
| 11.7 | `StepCard` | Step number, title, description | ☑ |
| 11.8 | `HowItWorksSection` | Renders 3 StepCards | ☑ |
| 11.9 | `TrustBadge` | Icon + title + description | ☑ |
| 11.10 | `TrustSection` | Renders 4 TrustBadges | ☑ |
| 11.11 | `HomePage` | Renders all sections in order, axe passes | ☑ |
| 11.12 | `ServicesPage` | Anchored sections for each of the 6 service types | ☑ |
| 11.13 | `FleetPage` | VehicleGrid with no date filter (browse mode) | ☑ |
| 11.14 | `AboutPage` | Company story, values | ☑ |
| 11.15 | `ContactPage` | WhatsApp link, phone numbers, inquiry form with Zod validation | ☑ |
| 11.16 | `FaqPage` | Expandable FAQ accordion | ☑ |
| 11.17 | `NotFoundPage` | 404 message + link to home | ☑ |

All Phase 11 components/pages ship with colocated `*.test.jsx` files (axe + behavior), except the removed 11.2.

---

## Phase 12 — Polish & QA

| # | Task | Done |
|---|---|---|
| 12.1 | Run `vitest --coverage` — achieve 80 % line + branch coverage overall | ✗ Currently ~57% lines / 85% branches / 47% functions. Every file touched in Phases 11–12 is at 100%; the gap is entirely pre-existing, untested pages/hooks from Phases 3 & 5–10 (booking wizard, contract, payment, signature, documents, profile, admin/owner panels, auth pages, several hooks). Backfilling those was explicitly deferred by the user as a separate, future undertaking. |
| 12.2 | Audit all components with `jest-axe` — 0 violations | ~ Everything with a test file (all Phase 11 work, plus ErrorBoundary/PageTitle/RouteFallback) has 0 violations. Not independently verified for the untested pages noted above. |
| 12.3 | Responsive smoke test at 375 px, 768 px, 1280 px | ☑ Verified via real headless-browser screenshots (Playwright). Found and fixed a real bug: the Navbar overflowed horizontally at 768–1023 px because its desktop-nav breakpoint (`md`, 768px) didn't leave enough room for the logo + links + auth buttons — moved the Navbar/MobileMenu breakpoint from `md` to `lg` (1024px) in `Navbar.jsx` and `MobileMenu.jsx`. |
| 12.4 | Add `<ErrorBoundary>` at app root and at each major page | ☑ `src/components/layout/ErrorBoundary.jsx`, wrapped around `<App>` in `main.jsx` and around every route's page element in `App.jsx`. |
| 12.5 | Add `react-helmet-async` for page `<title>` tags on each route | ☑ `src/components/layout/PageTitle.jsx`, wired into every page component. |
| 12.6 | Optimise images: lazy loading, `srcSet` for vehicle photos | ~ Added `loading="lazy"`/`decoding="async"` across vehicle photos, avatars, and the hero background slideshow (first frame stays eager for LCP). No `srcSet` — the backend only serves one URL per photo with no documented width variants (see `FRONTEND_INTEGRATION.md` §2), so a fabricated `srcSet` would just 404. |
| 12.7 | Configure Vite build for code splitting (route-level lazy imports) | ☑ Every page in `App.jsx` is a `React.lazy()` chunk behind a single `<Suspense>` boundary; confirmed via `npm run build` output (one small chunk per page). |
| 12.8 | Add pre-commit hook: `vitest --run` must pass before `git commit` | ~ Husky configured (`.husky/pre-commit` runs `npx vitest run`, `"prepare": "husky"` in `package.json`) and confirmed to no-op safely with no `.git` directory present. Activates automatically the first `npm install` after `git init`. |
| 12.9 | Write `README.md`: setup, env vars, test command, build command | ☑ |
| 12.10 | Final `npm run build` — 0 warnings, bundle size audit | ☑ Clean build, 0 warnings. Largest chunks are the shared vendor bundle (~340 kB) and a `react-pdf`/`react-signature-canvas` chunk (~376 kB) pulled in by the contract-signing flow — both expected given those libraries. |

---

## Dependency Map

```
Phase 0 (scaffold)
  └── Phase 1 (widgets)
        └── Phase 2 (layout)
              ├── Phase 3 (auth)
              │     └── Phase 4 (vehicles)
              │           └── Phase 5 (documents)
              │                 └── Phase 6 (booking wizard)
              │                       └── Phase 7 (contract + payment)
              │                             └── Phase 8 (renter dashboard)
              ├── Phase 9 (owner panel) ← depends on Phase 8 patterns
              ├── Phase 10 (admin panel) ← depends on Phase 9 patterns
              └── Phase 11 (public pages) ← can run in parallel with Phase 4+
                    └── Phase 12 (polish)
```

---

## Estimated Timeline

| Phase | Effort |
|---|---|
| 0 — Scaffold | 0.5 day |
| 1 — Widgets | 2 days |
| 2 — Layout | 1 day |
| 3 — Auth | 1 day |
| 4 — Vehicles | 2 days |
| 5 — Documents | 1 day |
| 6 — Booking Wizard | 2 days |
| 7 — Contract + Payment | 2 days |
| 8 — Renter Dashboard | 1.5 days |
| 9 — Owner Panel | 1.5 days |
| 10 — Admin Panel | 1.5 days |
| 11 — Public Pages | 2 days |
| 12 — Polish & QA | 1.5 days |
| **Total** | **~20 days** |
