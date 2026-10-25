# Ramellian Executive Travels — Menu & Navigation Structure

**Version:** 1.0  
**Date:** September 2026  
**Inspiration:** otto.rentals marketplace navigation, adapted for Ramellian's chauffeur + rental model

---

## 1. Navigation Philosophy

Borrowed from otto.rentals' marketplace approach:
- The **primary nav** drives discovery (search/browse first, sign-up later).
- A **persistent search/booking bar** is always accessible — users should never wonder where to start a booking.
- Role-aware menus shift context: a logged-in renter sees their dashboard links; an owner/admin sees their panel links.
- **Mobile-first hamburger drawer** collapses all nav into a clean single column.

---

## 2. Top Navigation Bar (Desktop)

*Updated 2026-09-24: "Vehicles" and "Services" are not in the top bar (browsing is **Rent a Car**; Services
stays in the footer). It is one line: the logo is always at the top left, and **About**, **Terms & Conditions**, **Privacy Policy** (both added 2026-10-25) and **Contact** are at the far
right end (from `xl`; below that they're in the ☰ menu), after the buttons (visitor) or icons and avatar (signed in). The left menu does not
repeat the logo.*

**Visitor:**
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]  (Rent a Car) (List Your Car) (Log In)  │  About  Terms & Conditions  Privacy Policy  Contact  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Signed in (any role):**
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  [RAMELLIAN LOGO]                        💬  🔔  [Avatar ▾]    │  About   Contact  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

The Owner / Admin panels are reached from the avatar menu (§4).

---

## 3. Dropdown Menus

### 3.1 Vehicles ▾

```
┌──────────────────────────────────────────────────┐
│  🔍  Browse All Vehicles                         │
│  ─────────────────────────────────────────────   │
│  BY SERVICE TYPE                                 │
│  🚗  Self-Drive Rentals                          │
│  🧑‍✈️  Chauffeured Hire                            │
│  ─────────────────────────────────────────────   │
│  BY VEHICLE TIER                                 │
│  ⭐  Standard Fleet (Serena, Noah, Voxy, Touran) │
│  👑  Executive Fleet (Prado & VIP vehicles)      │
└──────────────────────────────────────────────────┘
```

Routes:
- Browse All → `/vehicles`
- Self-Drive → `/vehicles?selfDrive=true`
- Chauffeured → `/vehicles?chauffeured=true`
- Standard → `/vehicles?tier=standard`
- Executive → `/vehicles?tier=executive`

### 3.2 Services ▾

```
┌──────────────────────────────────────────────────┐
│  ALL SERVICES                                    │
│  🏢  Corporate Transport                         │
│  ✈️  Airport Transfers                           │
│  💒  Events & Weddings                           │
│  🗺️  Long-Distance Routes                        │
│  🤝  Conferences & Business Meetings             │
│  🔒  Secure Journey Management                   │
│  ─────────────────────────────────────────────   │
│  📋  Request a Custom Quote                      │
└──────────────────────────────────────────────────┘
```

Routes:
- Each service → `/services#corporate`, `/services#airport`, etc.
- Custom Quote → `/contact?type=quote`

---

## 4. User Account Menu (Avatar Dropdown)

### Renter

```
┌──────────────────────────────┐
│  [Avatar]  John Kamau        │
│  john@example.com            │
│  ─────────────────────────── │
│  📋  My Bookings             │
│  📄  My Documents            │
│  👤  Profile & Settings      │
│  ─────────────────────────── │
│  🚪  Log Out                 │
└──────────────────────────────┘
```

### Owner / Manager

```
┌──────────────────────────────┐
│  [Avatar]  Fleet Manager     │
│  ─────────────────────────── │
│  📋  Fleet Bookings          │
│  📊  Owner Reports           │
│  🧑‍✈️  Assign Chauffeurs        │
│  ─────────────────────────── │
│  🚪  Log Out                 │
└──────────────────────────────┘
```

### Admin

```
┌──────────────────────────────┐
│  [Avatar]  Admin             │
│  ─────────────────────────── │
│  🛡️  Admin Dashboard         │
│  📋  All Bookings            │
│  📊  Platform Reports        │
│  📝  Contract Templates      │
│  ─────────────────────────── │
│  🚪  Log Out                 │
└──────────────────────────────┘
```

---

## 5. Mobile Navigation (Hamburger Drawer)

```
┌─────────────────────────────┐
│  ✕                          │
│  About                      │
│  Contact                    │
│  ─────────────────────────  │
│  (Rent a Car)               │
│  (List Your Car)            │
└─────────────────────────────┘
```

When authenticated, the bottom buttons are replaced by the user's name, role badge, and links to their dashboard.

---

## 6. Dashboard Sidebar Navigation

**Rule (2026-09-24): a signed-in person always has this left menu, on every page** — including the public
pages (home, browse vehicles, a vehicle, About, Contact, FAQ), the booking flow, the Inbox and Messages. It
is always the SAME menu: chosen only by the person's roles (admin › owner/manager › renter) and, for an owner, the
side they are using (the renter side has a **Switch to Car Owner** item; the owner menu has **Switch to Renter**),
never by the page or URL, so Profile / Documents / Inbox / Browse Vehicles never swap it for another. An owner who also rents gets
My Bookings added after Fleet Bookings. Only visitors are without it. **Profile is always the
item right below Overview.** For a signed-in person the top bar's logo sits in a column the same width as this
menu, so it is exactly at the top of the menu, on the same line as About / Contact.

*Updated 2026-09-24: the sidebar opens with the signed-in person's profile photo and name (a link to their
Profile); the logo is in the top bar, so it isn't repeated. The Inbox (`/inbox`) opens inside the same menu the person was in, so the menu
never disappears when it is clicked.*

*Updated 2026-09-24: roles pick the menu, **permissions (from the access token's `permissions` claim) pick the
items in it** — each item may list the permissions that unlock it (any one is enough; none listed = always shown).
My Bookings `BOOKING_READ` · Documents `DOCUMENT_READ`/`DOCUMENT_UPLOAD` · My Vehicles `VEHICLE_CREATE`/`UPDATE`/`MANAGE` ·
Add Vehicle `VEHICLE_CREATE`/`MANAGE` · Fleet Bookings and owner Reports `BOOKING_READ`/`MANAGE` · admin All Bookings and
Reports `BOOKING_MANAGE`. A token with no permission list is judged by role alone. See `src/lib/permissions.js`.*

*Updated 2026-09-24: the Admin Panel also has **Users** (`USER_MANAGE`), **All Vehicles** (`VEHICLE_MANAGE`) and
**Review Documents** (`DOCUMENT_REVIEW`). A visitor's top bar starts with a **Log In** button (also beside the
hamburger on phones). Signing in has no "log in as" choice — see `src/lib/landing.js`: admins land on `/admin`,
owners on `/owner` (or `/dashboard` if that was their last side), everyone else on `/dashboard`.*

*Updated 2026-09-24: a person with two roles gets a **grouped** menu — collapsible headings (`group` on a menu item,
rendered by `DashboardLayout`): an administrator sees **Administration** (Users, All Bookings, All Vehicles, Review
Documents, Add Vehicle, Reports, Contract Templates) and, if they also own vehicles, **My Fleet** (My Vehicles,
Fleet Bookings); an owner who also rents sees **My Fleet** and **My Rentals**. The heading holding the current
page is open, the rest are folded. On phones (below `md`) the menu is a drawer from the left, opened with ☰ at
the top-left of the top bar (2026-10-25; it used to be a sideways-scrolling strip), with the site links below it. Single-role menus stay flat. Each heading has an
icon (Administration, Documents, My Fleet, My Rentals). The administrator's **Documents** heading holds Review
Documents, Approved Documents and Rejected Documents (all `DOCUMENT_REVIEW`).*

*Updated 2026-09-24: new items — **Audit Log** (`/admin/audit-log`, end of the Administration group) for
administrators (followed by **Announcements**, `/admin/announcements`); **Vehicle Approvals**
(`/admin/vehicles/approvals`, `VEHICLE_MANAGE`), with **Approved Vehicles** (`/admin/vehicles/approved`) and **Rejected Vehicles**
(`/admin/vehicles/rejected`) beside it, all under a **Vehicles** heading together with All Vehicles and Add Vehicle; **Roles & Permissions**
(`/admin/roles`, `PERMISSION_MANAGE`, right after Users); and **Contract Templates** (`/owner/contracts`, after Reports; also in an owner-who-rents's My Fleet
group) for owners.*

### Renter Dashboard (`/dashboard/*`)

```
┌──────────────────────────┐
│  (photo)  Ann Lee        │
│           Renter         │
│  ─────────────────────── │
│  📊  Overview            │
│  👤  Profile             │
│  📋  My Bookings         │
│  📄  Documents           │
│  ─────────────────────── │
│  🔍  Browse Vehicles     │
│  📞  Support             │
└──────────────────────────┘
```

### Owner Dashboard (`/owner/*`)

```
┌──────────────────────────┐
│  (photo)  Ann Lee        │
│           Car Owner      │
│  OWNER PANEL             │
│  ─────────────────────── │
│  📊  Overview            │
│  📋  Bookings            │
│  🧑‍✈️  Chauffeur Assignment  │
│  📊  Reports             │
│  ─────────────────────── │
│  ← Back to Main Site     │
└──────────────────────────┘
```

### Admin Panel (`/admin/*`)

```
┌──────────────────────────┐
│  (photo)  Ann Lee        │
│           Administrator  │
│  ADMIN PANEL             │
│  ─────────────────────── │
│  📊  Dashboard           │
│  📋  All Bookings        │
│  📊  Reports             │
│  📝  Contract Templates  │
│  ─────────────────────── │
│  ← Back to Main Site     │
└──────────────────────────┘
```

---

## 7. Footer Navigation

```
┌─────────────────────────────────────────────────────────┐
│  [RAMELLIAN LOGO]                                       │
│  Executive chauffeur and self-drive rentals             │
│  across Nairobi.                                        │
│  📍 Nairobi, Kenya                                      │
│  Contact Us →                                           │
│                                                         │
│  SERVICES          VEHICLES         COMPANY             │
│  Corporate         Browse All       About Us            │
│  Airport           Self-Drive       Contact             │
│  Weddings          Chauffeured      FAQ                 │
│  Long-Distance     Standard Fleet   Privacy Policy      │
│  Conferences       Executive Fleet  Terms of Service    │
│  Secure Journeys                                        │
│                                                         │
│  © 2026 Ramellian Executive Travels. All rights reserved│
└─────────────────────────────────────────────────────────┘
```

Detailed contact channels (phone, WhatsApp) live on the Contact page
(§9, `PUB-05`), not hardcoded in the footer — see `ContactPage` in the
implementation plan (11.15).

---

## 8. Booking Bar (Persistent Hero Widget)

Displayed on the home page hero and optionally as a sticky bar on the `/vehicles` page.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [📍 Pick-up Location]  [📅 Start Date & Time]  [📅 End Date & Time] │
│  [🚗 Self-Drive ● / Chauffeured ○]              [🔍 Search Vehicles] │
└──────────────────────────────────────────────────────────────────────┘
```

- On submit, encodes all values into URL params and navigates to `/vehicles`.
- Start/end date-time fields open a single `DateRangePicker` modal.
- Location field filters by `location` param.

---

## 9. Route → NavItem Mapping

The Navbar is global — it renders on every route, including auth, the
booking flow, and the dashboard/owner/admin panels (which get it in
addition to their own sidebar, not instead of it).

| Route | Active NavItem |
|---|---|
| `/` | — (logo only) |
| `/vehicles*` | Vehicles |
| `/services*` | Services |
| `/about` | About |
| `/contact` | Contact |
| `/faq` | — (footer only) |
| `/dashboard*` | Avatar menu |
| `/owner*` | Owner Panel |
| `/admin*` | Admin Panel |
| `/auth/*` | — (no active item; Navbar still shown) |
| `/book/*` | — (no active item; Navbar still shown) |

---

## 10. NavLink Component Interface

```jsx
// Used in both desktop nav and mobile drawer
<NavLink
  to="/vehicles"
  label="Vehicles"
  dropdown={vehiclesDropdownItems}
  activeClassName="text-brand-gold border-b-2 border-brand-gold"
/>
```

The `dropdown` prop is optional; if provided, the link renders as a `<button>` that toggles a `<DropdownMenu>` panel. If absent, it renders as a `<Link>`.
