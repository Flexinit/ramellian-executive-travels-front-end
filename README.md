# Ramellian Executive Travels — Frontend

React + Vite frontend for Ramellian Executive Travels: chauffeured and
self-drive vehicle rentals across Nairobi. Talks to the Spring Boot backend
described in [`FRONTEND_INTEGRATION.md`](./FRONTEND_INTEGRATION.md).

## Tech Stack

- **React 18** + **Vite** + **React Router v6**
- **TanStack Query** for server state, **Zustand** for client state (auth,
  in-progress booking draft, UI)
- **React Hook Form** + **Zod** for form validation
- **Tailwind CSS** for styling (brand tokens in `tailwind.config.js`, see
  `docs/design.md` §7)
- **Vitest** + **React Testing Library** + **jest-axe** + **MSW** for testing
- **react-helmet-async** for per-route `<title>` tags

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Environment Variables

Set these in a local `.env` file (see `.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API, e.g. `http://102.68.87.231:8090` locally, `https://ramellianexecutivetravels.co.ke` in production |
| `VITE_SWAGGER_URL` | Swagger UI URL for the backend, used only as a developer reference |
| `VITE_PESAPAL_ENV` | `sandbox` or `live` — which Pesapal environment to initiate checkout against |

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check-free production build to `dist/` (code-split per route) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the full test suite once (`vitest --run`) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with a coverage report (`text`, `lcov`, `html`); thresholds are enforced at 80% lines/branches/functions/statements (see `vite.config.js`) |

## Project Structure

```
src/
├── App.jsx              # Route table (all pages are React.lazy() chunks)
├── main.jsx             # App entry: providers, error boundary, splash screen
├── components/
│   ├── ui/               # Reusable primitives (Button, Input, Modal, ...)
│   ├── layout/            # Navbar, Footer, route guards, ErrorBoundary, PageTitle
│   ├── home/               # Public homepage sections
│   ├── vehicles/, booking/, documents/, payment/, reports/, admin/, forms/
├── pages/                # One file per route
├── hooks/                # TanStack Query hooks, one file per resource
├── store/                # Zustand stores (auth, booking draft, UI)
├── lib/                  # api client, query client, constants, utils
├── mocks/                # MSW handlers used by the test suite
└── test/setup.js         # Vitest + jest-dom + jest-axe + MSW wiring
```

Reference docs live in `docs/`: `requirements.md`, `design.md`,
`menu-structure.md`, and `implementation-plan.md` (the phased build plan
this codebase follows).

## Testing

Every component/page ships with a colocated `*.test.jsx` file following a
red → green → refactor workflow (see `docs/implementation-plan.md`). Tests
run against MSW-mocked API responses (`src/mocks/handlers.js`) and are
checked for accessibility violations with `jest-axe` wherever practical.

Mocked endpoints are built from `import.meta.env.VITE_API_BASE_URL` (set in
`.env.test`), never a hard-coded host, so pointing the app at a different
backend doesn't break the tests.

A pre-commit hook (via [Husky](https://typicode.github.io/husky/)) runs the
full test suite before every commit. It activates automatically the first
time you run `npm install` inside a git repository — if you're starting
fresh: `git init && npm install`.

## Building

```bash
npm run build
```

Output goes to `dist/`. Every route is its own lazy-loaded chunk (see
`src/App.jsx`), so the initial bundle only includes the app shell, the
current page, and shared vendor code.

## Deploying

Production runs on the VPS as a Docker container built by Jenkins on every push to `master`.
Step-by-step setup: [docs/deployment.md](docs/deployment.md).
