# Ramellian Executive Travels — Frontend Requirements

**Version:** 1.0  
**Date:** September 2026  
**Source:** FRONTEND_INTEGRATION.md + ramellianexecutivetravels.co.ke  

---

## 1. Overview

Ramellian Executive Travels is a Nairobi-based chauffeur and corporate transport company. The frontend is a React single-page application that connects renters with the backend API, handling vehicle discovery, booking, document verification, contract management, and Pesapal payment processing.

The platform serves three distinct user roles:

| Role | Description |
|---|---|
| **Renter** | Books vehicles for self-drive or chauffeured trips |
| **Owner / Manager** | Lists vehicles, manages bookings, assigns chauffeurs |
| **Admin** | Platform-wide oversight, reporting, contract templates |

---

## 2. Functional Requirements

### 2.1 Authentication & Account

| ID | Requirement |
|---|---|
| AUTH-01 | User can register with name, email, and password via `POST /api/v1/auth/register` |
| AUTH-02 | User receives a verification email and confirms it via `POST /api/v1/auth/verify-email` |
| AUTH-03 | User can log in and receives a JWT access token via `POST /api/v1/auth/login` |
| AUTH-04 | If 2FA is enabled, user completes the second factor via `POST /api/v1/auth/verify-2fa` before accessing protected routes |
| AUTH-05 | JWT token is stored in Zustand (`authStore`) and injected into every request via Axios interceptor |
| AUTH-06 | A `401` response clears the auth store and redirects to `/login` |
| AUTH-07 | User can view and update their profile |
| AUTH-08 | User can log out, which clears the token and redirects to `/` |

---

### 2.2 Vehicle Search & Discovery

| ID | Requirement |
|---|---|
| VEH-01 | Guest and authenticated users can browse available vehicles at `GET /api/v1/vehicles` |
| VEH-02 | Search bar supports free-text query (model, location, color, fuel type, transmission) with 300 ms debounce |
| VEH-03 | Filter panel supports: location, min/max daily price, passenger capacity, fuel type, transmission, self-drive flag, chauffeured flag |
| VEH-04 | Date-range picker sets `startTime` and `endTime` (ISO-8601) to exclude overlapping bookings |
| VEH-05 | Sort options: Recommended, Price Low–High, Price High–Low, Top Rated, Most Seats |
| VEH-06 | Active filters and search query are persisted in the URL query string |
| VEH-07 | Vehicle cards show: photo, model, location, daily price (KES), rating, fuel type, transmission, capacity, availability badge |
| VEH-08 | Selecting a vehicle navigates to a detail page that loads full photos via the vehicle photo endpoints |
| VEH-09 | Vehicle detail page shows all vehicle attributes, an image gallery, and a "Book Now" CTA |
| VEH-10 | Loading skeletons are shown while vehicle data is fetching |
| VEH-11 | Empty state message is shown when no vehicles match the filters |

---

### 2.3 Document Upload & Verification

| ID | Requirement |
|---|---|
| DOC-01 | Authenticated renter can upload identity documents via `POST /api/v1/documents` |
| DOC-02 | Supported document types: National ID, Passport, Driving Licence |
| DOC-03 | Upload UI shows progress indicator and success/error state |
| DOC-04 | Renter can view the current status of each submitted document (pending, approved, rejected) |
| DOC-05 | Self-drive booking gate: requires approved identity document + ID number + approved driving licence |
| DOC-06 | Chauffeured booking gate: requires approved identity document + ID number |
| DOC-07 | If documents are missing or unapproved, the booking flow shows a clear callout with a link to the document upload page |
| DOC-08 | `422` response from the booking endpoint surfaces the specific missing document requirement to the user |

---

### 2.4 Booking Flow

| ID | Requirement |
|---|---|
| BKG-01 | Booking wizard is a multi-step flow: (1) Vehicle selection → (2) Trip details → (3) Review & confirm |
| BKG-02 | Step 2 collects: `startTime`, `endTime`, `bookingMode` (SELF_DRIVE / CHAUFFEURED), optional `tripType`, optional `renterNotes` (max 1000 chars) |
| BKG-03 | `tripType` options: Airport Transfer, Wedding, Corporate Event, Safari, Family Journey, Self-Drive Rental, Cake Transportation |
| BKG-04 | Step 3 shows a summary: vehicle details, dates, `numberOfDays`, `tripType`, `renterNotes`, and total estimated cost |
| BKG-05 | Booking is created via `POST /api/v1/bookings/create` on confirmation |
| BKG-06 | Pending bookings expire after 15 minutes; a countdown timer is shown on the confirmation screen |
| BKG-07 | After booking creation, a frozen contract draft is requested via `POST /api/v1/payments/bookings/{bookingId}/contract/draft` |
| BKG-08 | Renter can view the full `contractText` before accepting |
| BKG-09 | Renter accepts the contract via `POST /api/v1/payments/bookings/{bookingId}/contract/accept` with `{ "accepted": true }` |

---

### 2.5 Payment Flow

| ID | Requirement |
|---|---|
| PAY-01 | After contract acceptance, Pesapal checkout is initiated via `POST /api/v1/payments/pesapal/bookings/{bookingId}/checkout` |
| PAY-02 | Browser is redirected to the Pesapal `redirectUrl` |
| PAY-03 | After return from Pesapal, the app polls `GET /api/v1/payments/pesapal/bookings/{bookingId}/status` |
| PAY-04 | `SUCCESSFUL` status → navigate to booking confirmation screen |
| PAY-05 | `PENDING` status → show "processing" state and continue polling (max 10 attempts, 3 s interval) |
| PAY-06 | Payment status is never determined client-side; all trust comes from the API response |
| PAY-07 | After confirmed payment, retrieve the contract via `GET /api/v1/payments/contracts/{contractId}` |
| PAY-08 | Renter views the contract (PDF or text) and signs via `PUT /api/v1/payments/contracts/{contractId}/sign` with a signature image |
| PAY-09 | Signed and unsigned PDF downloads available via `GET /api/v1/payments/contracts/{contractId}/document?signed=true|false` |

---

### 2.6 Booking Management

| ID | Requirement |
|---|---|
| MGMT-01 | Renter can view all their bookings at `/dashboard/bookings` (`GET /api/v1/bookings/mine`) |
| MGMT-02 | Each booking row shows: vehicle, dates, status badge, total cost, trip type |
| MGMT-03 | Clicking a booking opens the detail view (`GET /api/v1/bookings/{id}`) |
| MGMT-04 | Owner/manager sees their fleet bookings at `/owner/bookings` (`GET /api/v1/bookings/owner`) |
| MGMT-05 | Owner/manager can assign a chauffeur via `PUT /api/v1/bookings/{id}/chauffeur` |
| MGMT-06 | Admin sees all bookings and platform reports via `/admin` routes |

---

### 2.7 Reports

| ID | Requirement |
|---|---|
| RPT-01 | Renter report: `GET /api/v1/bookings/reports/mine` — filterable by date range |
| RPT-02 | Owner report: `GET /api/v1/bookings/reports/owner` — revenue summary, trip type breakdown |
| RPT-03 | Admin report: `GET /api/v1/bookings/reports/admin` — platform-wide summary |
| RPT-04 | Reports render as a summary card + data table; printable via browser print dialog |

---

### 2.8 Contract Templates (Admin)

| ID | Requirement |
|---|---|
| CTPL-01 | Admin can list, create, update, and delete contract templates via `/api/v1/contract-templates/**` |
| CTPL-02 | Template editor supports rich text or Markdown |
| CTPL-03 | Templates are versioned; existing contracts are not affected by template updates |

---

### 2.9 Public-Facing Pages

| ID | Requirement |
|---|---|
| PUB-01 | Home page: hero with fare estimator widget, services section, fleet section, how-it-works, trust signals, CTA |
| PUB-02 | Services page: detailed descriptions of all 6 service types |
| PUB-03 | Fleet page: browsable vehicle grid (mirrors search with no date filter) |
| PUB-04 | About page: company story, team, values |
| PUB-05 | Contact page: WhatsApp quick-link, phone numbers, inquiry form |
| PUB-06 | FAQ page |
| PUB-07 | All public pages are accessible without authentication |

---

## 3. Non-Functional Requirements

### 3.1 Performance

- First Contentful Paint < 2 s on a 4G connection.
- Largest Contentful Paint < 3.5 s.
- Vehicle list must debounce search by 300 ms to avoid hammering the API.
- Images use lazy loading (`loading="lazy"`).
- TanStack Query caches vehicle data for 5 minutes (`staleTime: 5 * 60 * 1000`).

### 3.2 Responsiveness

- Mobile-first layout (375 px base).
- Breakpoints: `sm` 640 px, `md` 768 px, `lg` 1024 px, `xl` 1280 px.
- Hamburger menu on mobile; full horizontal nav on desktop.

### 3.3 Accessibility

- WCAG 2.1 AA target.
- Every component test includes `jest-axe` assertion.
- Keyboard navigation fully supported.
- Focus management on modal open/close.
- Colour contrast ratio ≥ 4.5:1 for all text.

### 3.4 Security

- JWT stored in memory (Zustand), not `localStorage`, to mitigate XSS.
- No secrets or tokens logged to the console.
- All form inputs sanitised via Zod schemas before submission.
- CORS handled server-side; the frontend must not manipulate CORS headers.

### 3.5 Error Handling

| HTTP Status | Frontend Behaviour |
|---|---|
| `400` | Show field-level validation errors |
| `401` | Clear auth, redirect to `/login` |
| `403` | Show permission-denied screen |
| `404` | Show not-found page |
| `409` | Show workflow-conflict message (e.g., vehicle no longer available) |
| `422` | Surface `fieldErrors` on the active form |
| `500` / `503` | Show retryable error toast with "Try again" button |

### 3.6 Internationalisation

- Locale: `en-KE`.
- Currency: KES, formatted as `KES 12,000`.
- Dates: `dd MMM yyyy` (e.g., `01 Oct 2026`).
- Times: 12-hour format with AM/PM.

---

## 4. Out of Scope (v1)

- Marketplace settlement and refunds (Pesapal merchant capability pending).
- Multi-language support beyond English.
- Native mobile app.
- Real-time chat between renter and owner.
- Owner vehicle listing / onboarding flow (separate admin panel).
