---
inclusion: always
---

# Ramellian Executive Travels — Frontend Constitution

This document is the authoritative engineering contract for the Ramellian Executive Travels React frontend. Every contributor and every AI-assisted session must follow these rules without exception.

---

## 1. Test-Driven Development (TDD) — Non-Negotiable

We write tests **before** implementation. No production code exists without a failing test that justifies it.

### The Red-Green-Refactor Cycle

1. **Red** — Write a failing test that describes the exact behavior needed.
2. **Green** — Write the minimum production code to make that test pass.
3. **Refactor** — Clean up without breaking the test.

### Rules

- Every component, hook, utility, and service function must have a corresponding test file alongside it.
- Test files are colocated: `Button.tsx` → `Button.test.tsx`.
- Integration tests (user flows) live in `src/__tests__/`.
- No `// TODO: add tests later`. If a feature ships without tests, it is not done.
- Minimum coverage targets: **80 % lines, 80 % branches, 100 % on critical paths** (auth, payment, booking).
- Run tests in single-pass mode for CI: `vitest --run`.

### Test Libraries

| Purpose | Library |
|---|---|
| Unit / component tests | Vitest + React Testing Library |
| User-event simulation | `@testing-library/user-event` |
| API mocking | MSW (Mock Service Worker) |
| Assertions | Vitest built-ins (`expect`) |
| Accessibility assertions | `jest-axe` via vitest |

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 | Functional components only, no class components |
| Language | JavaScript (ES2022+) | JSDoc for type hints on public APIs |
| Build tool | Vite | Fast HMR, native ESM |
| Routing | React Router v6 | File-based route organisation under `src/pages/` |
| State — server | TanStack Query v5 | All API calls via `useQuery` / `useMutation` |
| State — client | Zustand | Auth token, UI state, cart/booking draft |
| Forms | React Hook Form + Zod | Schema-first validation |
| Styling | Tailwind CSS v3 | Design tokens in `tailwind.config.js` |
| HTTP client | Axios | Base instance in `src/lib/api.js` |
| Notifications | react-hot-toast | Consistent feedback |
| Date handling | date-fns | Locale-aware, tree-shakable |
| Icons | Lucide React | Consistent icon set |
| PDF viewing | react-pdf | Contract display |
| Signature capture | react-signature-canvas | Contract signing |
| Payments redirect | Native `window.location` | Pesapal redirect flow |
| Testing | Vitest + RTL + MSW | See TDD section |

---

## 3. Project Structure

```
src/
  assets/           # Logos, images, fonts
  components/       # Reusable, stateless widgets
    ui/             # Primitives: Button, Input, Card, Badge, Modal…
    layout/         # Navbar, Footer, Sidebar, PageWrapper
    forms/          # BookingForm, SearchBar, DateRangePicker…
    vehicles/       # VehicleCard, VehicleGrid, VehicleDetail…
    booking/        # BookingSteps, BookingSummary, BookingStatus…
    payment/        # ContractViewer, SignaturePad, PaymentStatus…
  hooks/            # Custom hooks (useVehicles, useBooking, useAuth…)
  lib/              # api.js, queryClient.js, constants.js, utils.js
  pages/            # Route-level components (one file per route)
  store/            # Zustand stores (authStore.js, bookingStore.js)
  __tests__/        # Integration and E2E-style flow tests
  App.jsx
  main.jsx
```

---

## 4. Component Rules

- **One component per file.** No barrel-of-components files.
- **Simple and reusable.** A component does one thing well. If it needs a prop to change behaviour fundamentally, split it.
- **Props over state.** Lift state up rather than duplicate it.
- **No inline styles.** Use Tailwind classes exclusively.
- **Accessible by default.** Every interactive element must have an `aria-label` or visible label. Forms must use `<label>` elements. Run `jest-axe` in every component test.
- Widgets (cards, badges, modals) are in `src/components/ui/` and accept generic props — never hardcode business content inside a widget.

---

## 5. API Integration Rules

All API calls go through `src/lib/api.js`. Direct `fetch` or `axios` calls in components are forbidden.

```js
// src/lib/api.js — base instance
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

- TanStack Query keys follow the pattern `['resource', params]`.
- Mutations invalidate related queries on success.
- `401` → clear auth store and redirect to `/login`.
- `422` → surface `fieldErrors` on form fields.
- `503` / `500` → show a retryable error toast.

---

## 6. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Component file | PascalCase | `VehicleCard.jsx` |
| Hook file | camelCase, `use` prefix | `useVehicles.js` |
| Store file | camelCase, `Store` suffix | `authStore.js` |
| Utility file | camelCase | `formatCurrency.js` |
| Test file | same name, `.test.` infix | `VehicleCard.test.jsx` |
| CSS / Tailwind config | kebab-case tokens | `brand-gold`, `brand-dark` |

---

## 7. Brand & Theme

### Palette (derived from ramellianexecutivetravels.co.ke)

| Token | Hex | Usage |
|---|---|---|
| `brand-dark` | `#1A1A2E` | Primary background, navbar |
| `brand-navy` | `#16213E` | Section backgrounds |
| `brand-gold` | `#C9A84C` | Primary CTA, accents, highlights |
| `brand-gold-light` | `#E8C97A` | Hover states, borders |
| `brand-white` | `#F5F5F5` | Body text on dark |
| `brand-grey` | `#8A8A9A` | Secondary text, dividers |

### Typography

- Headings: **Playfair Display** (serif) — luxury, authority
- Body: **Inter** (sans-serif) — clarity, readability
- Load both via Google Fonts in `index.html`.

### Logo

- Place the Ramellian logo SVG/PNG in `src/assets/logo.png`.
- Always use the `<Logo />` component from `src/components/ui/Logo.jsx` — never raw `<img>` tags.

---

## 8. Git Workflow

- Feature branches: `feature/<short-description>`
- All commits must pass `vitest --run` before push (enforced by pre-commit hook).
- PR titles: `[scope] brief description` e.g. `[auth] add email verification flow`.
- No direct commits to `main`.

---

## 9. Environment Variables

All environment variables are prefixed `VITE_` and documented in `.env.example`:

```
# Development — local network backend
VITE_API_BASE_URL=http://192.168.8.11:8080
VITE_SWAGGER_URL=http://192.168.8.11:8080/swagger-ui/index.html
VITE_PESAPAL_ENV=sandbox
```

Never commit `.env` files.

---

## 10. Definition of Done

A feature is **done** when:

1. Failing test written first.
2. Implementation makes test pass.
3. Accessibility assertions pass (`jest-axe`).
4. Code reviewed and merged via PR.
5. No console errors in development mode.
6. Responsive on mobile (375 px), tablet (768 px), and desktop (1280 px).
