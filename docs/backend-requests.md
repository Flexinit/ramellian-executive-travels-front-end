# Backend requests

Things the portal's booking flow needs from the backend that the live OpenAPI spec (`/v3/api-docs`) does not
offer today. Each one says what the portal does in the meantime. Checked against the spec on 2026-09-27.

## 1. Combined checkout for several vehicles

**Why.** A renter can put several vehicles in one booking. `POST /bookings/create` takes a single `vehicleId`
(`BookingRequest`), and the contract (`/payments/bookings/{bookingId}/contract/*`) and Pesapal checkout
(`/payments/pesapal/bookings/{bookingId}/checkout`) are all per booking. So several vehicles means several bookings,
several contracts and several payments.

**Ask.** Either of these would let the portal take one payment for the whole selection:

- `POST /bookings/create-batch` taking a list of `BookingRequest` and returning the bookings under one group id, and
  `POST /payments/pesapal/booking-groups/{groupId}/checkout` (plus `.../status`) charging their combined total in one
  Pesapal order; or
- a `PaymentCheckoutRequest` on the existing checkout accepting several `bookingIds`.

Contracts stay per booking (each owner has their own terms); they can all be accepted before the single payment.

**Meanwhile.** The portal creates the bookings one at a time and takes the renter through contract → payment →
signature for each vehicle in turn (`useStartNextBooking` in `src/hooks/useBooking.js`, plus the "Continue with the
next vehicle" button on the confirmation page). Bookings are created only when their turn comes, because a new
booking holds the vehicle for a short while until it is paid. When a combined checkout exists, that hook is the one
place to change.

## 2. Public read of an owner's contract terms

**Why.** The renter would like to read the owner's terms before signing up. Today the contract text only exists
after a booking exists (`POST /payments/bookings/{bookingId}/contract/draft`, which needs a login), and
`GET /contract-templates/mine` is for the owner only, so the portal cannot show real terms to a visitor.

**Ask.** A public `GET /contract-templates/owners/{ownerId}/active` (or the active template embedded in
`VehicleResponse`) returning the owner's approved template (`ContractTemplateResponse.content`). `VehicleResponse` has
`ownerEmail` but no owner id, so it would also need `ownerId` (or the endpoint could take the vehicle id).

**Meanwhile.** The owner's contract is read and accepted after the booking is created, just before payment, and the
checkout page says so.

## 3. How the price is worked out

**Why.** Before a booking exists the portal shows an *estimate*: days × `pricePerDay`, where a day is every started 24
hours with a minimum of one (`billableDays` in `src/lib/cart.js`). The backend's own `numberOfDays` and
`estimatedAmount` on `BookingResponse` are what is actually charged, and the spec does not say how it rounds.

**Ask.** Please confirm the backend's rule (does a 2-day-8-hour trip count as 2 or 3 days? is a same-day trip 0 or 1?)
so the estimate can match it exactly; or expose a price-quote endpoint (`POST /bookings/quote`) the portal can call
without creating a booking.

## 4. Guest contact / reminders — **capture is built and live; nothing can read it back yet**

**Correction (2026-10-04):** this entry's old "approved, not yet built" status was stale. The capture half of
this was actually built and shipped some time ago: `BookingContactPage.jsx`'s "How can we reach you?" step
(the one a visitor fills in before signing up) calls `POST /booking-leads` for every vehicle in their
selection (`useCreateBookingLead`/`bookingLeadsFor`, `src/hooks/useBookingLeads.js`) — confirmed live, public,
201, no auth needed. That part of this item is done; only the status line here was never updated to say so.
(Update 2026-10-12: the separate contact step is gone; the same leads, now with both email and phone, are
sent when a visitor submits the Create Account form at checkout, `RegisterModal.jsx`.)

**Why this is being reopened.** The product owner now wants that captured contact actually usable: visible
to admin/super-admin so staff can follow up with the renter, and explicitly **not** visible to the vehicle
owner (the portal's own copy on that step already promises this: "it is never shown to vehicle owners").
Checked the live spec (`/v3/api-docs`, 2026-10-04): `/api/v1/booking-leads` has **only a `POST`** — no `GET`,
no list, no way to read a lead back by id or at all. So right now this data is being written into the
database and then is completely invisible to everyone, including the staff who are supposed to act on it.

**Ask.** A `GET /booking-leads` (list, newest first — the admin-facing "follow up on these people" queue) and
ideally `GET /booking-leads/{id}`, restricted to `ADMIN`/`MANAGER` tokens only, returning the same
`BookingLeadResponse` shape the `POST` already answers with (`email`/`phoneNumber`, `vehicleId`, `startTime`,
`endTime`, `notes`, `id`, `createdAt`). A vehicle owner's token should get `403` on this — the one-sided
visibility (staff yes, owner no) is a real product requirement here, not an oversight, so it needs enforcing
server-side the same way other owner/admin-scoped endpoints already split by role.

**On "or have it as a column on the booking" (an alternative the product owner floated):** worth flagging
that a lead and a booking aren't the same lifecycle — a `booking-lead` is created the moment someone fills in
"How can we reach you?", often for several vehicles at once, and **before any real `Booking` exists at all**
(most leads never become a booking — that's the whole point of following up on the ones that don't). Adding
a contact column to `BookingResponse` wouldn't capture the leads that never convert, so it doesn't replace a
real leads list — it would only help once a booking already exists, which `renterEmail` already mostly
covers once the visitor actually registers. The `GET /booking-leads` ask above is the one that actually
matches what's being asked for; a booking-column field, if wanted too, would be a separate, smaller addition.

**On "owner should only get a notification":** confirmed this is entirely backend-driven — the frontend has
no mechanism to create, compose, or choose a notification's content at all (see item 12/18, `useNotifications.js`:
the portal only ever reads `NotificationResponse` rows and marks them read; there is no `POST /notifications`
anywhere in this codebase). If a lead or booking event should notify the owner without exposing the renter's
raw contact details, that notification has to be composed and triggered server-side, the same way the
existing "renter booked your vehicle" notification already is — not something achievable from the frontend.

**Meanwhile.** Nothing to build on the frontend yet beyond what's already shipped (the capture). An
admin-facing "Leads" page is the natural next step once `GET /booking-leads` exists, but building it against
an endpoint that doesn't exist risks guessing its response shape wrong — holding off until it's confirmed
live, same approach taken elsewhere in this file.

## 5. Refunding a booking that turns out unavailable

**Why.** A vehicle can be listed as available and still not be — a double booking, a mechanical issue, the owner
simply not having updated it. When that happens after the renter has already paid, the owner declines the booking
(`PUT /bookings/{id}/status`, `status: REJECTED`) or its 15-minute pending-payment hold runs out (`EXPIRED`), and the
renter is shown a "the owner couldn't fulfil this" notice with a way to message the owner (`BookingUnavailableNotice`,
used on the contract, payment, signature and booking-detail pages). But **there is no refund endpoint anywhere in the
spec** — nothing to reverse a Pesapal charge already taken for a booking that no longer stands, and
`PaymentStatusResponse` has no field for a refund's state either.

**Ask.** A `POST /payments/bookings/{bookingId}/refund` (or a `REFUNDED` value on `PaymentStatusResponse.status`) that
reverses the Pesapal charge and records it, so the portal can show the renter the refund actually happened rather than
just apologising.

**Meanwhile.** The portal re-checks the booking's live status right before charging the renter (on the Payment page,
via a fresh `GET /bookings/{id}` — see `useBooking`'s `staleTime: 0` option in `src/hooks/useBookings.js`), which
catches a decline or expiry that happens while the renter is mid-flow. It cannot catch one that happens after payment
has already gone through with Pesapal, and it cannot get the renter's money back. This doesn't fix the root cause —
see the next item.

## 6. Availability driven by actual bookings, not a manual switch

**Why.** A vehicle showing "available" today means only that the owner's `available` toggle is on
(`AvailabilitySwitch`) — nothing connects it to the vehicle's actual bookings:

- Creating a booking (`POST /bookings/create`) never touches `available`, so a vehicle with a paid, confirmed booking
  for next week can still be booked by someone else for an overlapping date, unless the owner happens to have switched
  it off by hand.
- Marking a trip returned (moving its status to `COMPLETED`) never touches `available` either — an owner has to
  remember to switch it back on themselves, and if they forgot to switch it off in the first place, it was never
  really protected.
- `available`/`availableFrom`/`availableTo` on `VehicleResponse` describe one vehicle-wide window, not per-booking
  date ranges, so there's no way for the portal to know "this vehicle is free from the 12th, busy the 5th–11th."

This is the root cause behind item 5 (and behind `BookingUnavailableNotice` existing at all) — that flow handles the
fallout gracefully, it doesn't prevent it.

**Ask.**
1. **What do `startTime`/`endTime` on `GET /vehicles` actually check today?** They're in the spec with no
   description. If they already exclude a vehicle that has a conflicting booking for that range, say so and the
   portal will rely on them; if they only check the vehicle's own `availableFrom`/`availableTo` window, they don't
   solve this.
2. **Auto-block:** once a booking exists in a state that holds the vehicle (`PENDING` through `ACTIVE`), the vehicle
   should stop being offered for its date range — ideally by date range (`GET /vehicles?startTime=&endTime=` excludes
   it only for that window), or at minimum by no longer being creatable as a second booking for overlapping dates
   (`POST /bookings/create` returning a conflict, e.g. 409).
3. **Auto-free:** when a booking is marked returned (`PUT /bookings/{id}/status`, `status: COMPLETED`, or a dedicated
   "return" action), that date range should free up again with no separate step from the owner.

**Meanwhile.** The manual `available` switch is the only mechanism there is, so the portal keeps it and the user
guide asks owners to use it. The portal does **not** try to flip it automatically on booking or on return from the
frontend: `available` is a single vehicle-wide flag with no date range, so guessing when to flip it back (a vehicle
might have another, later booking already on it) risks creating a different double-booking bug rather than fixing
this one. That decision belongs on the backend, once availability is genuinely date-aware.

## 7. Refuse "Sign up with Google" for an email that already has an account

**Why.** `POST /auth/google` is one call for both "Sign in with Google" (LoginPage) and "Sign up with Google"
(RegisterPage) — the only difference today is the button's own label. The backend resolves the verified email from
the Google token and, if an account already exists under it, signs the person into that account; if not, it creates
one. That's normal, expected behaviour for *signing in*, but it means clicking "Sign up with Google" for an email
that already has an account (however it was created — password or Google) currently just logs that person into it,
silently, rather than refusing the way `POST /auth/register` refuses a duplicate email.

**Ask.** The frontend now sends an `intent` field on `POST /auth/google` — `"login"` from the Login page, `"register"`
from the Register page (`GoogleAuthRequest` would need this field added to the schema). When `intent: "register"`
resolves to an email that already has an account, refuse with `409` and a message the portal can show as-is (e.g.
"This email already has an account. Please log in instead.") — mirroring how a duplicate email is already refused
on plain registration. `intent: "login"` keeps today's behaviour (sign in, or create the account the first time).

**Meanwhile.** `intent` is sent already (`useGoogleLogin` in `src/hooks/useAuth.js`) and a `409` on the `'register'`
intent is already handled and shown — but until the backend actually refuses on this field, "Sign up with Google"
for an existing email still silently signs that person in, exactly as before; the frontend can't detect or block
this itself; only the backend knows whether the email exists.

## 8. `POST /bookings/create` refused a freshly-registered renter (403, no body) — **fixed 2026-09-28**

**Was.** Reproduced live: `washioyafelix@gmail.com` logged in fine and got a JWT with `"roles":["CAR_RENTER"]`, but
`GET /users/me` for that same account reported `"roles": []`, `"isCarRenter": false`, `"hasCompletedProfile": false`.
`GET /documents/me` and `POST /bookings/create` both came back `403 Forbidden` with an **empty body** — unlike every
other rejection this backend sends, which carry a proper JSON `{status, error, message}`.

**Now.** Re-tested against the updated backend: `GET /documents/me` answers `200` (`[]`) for the same account, and
`POST /bookings/create` for a real vehicle now returns a proper `422` — `"An approved national ID or passport and
ID number are required before booking"` — exactly the documents gate the portal is built to show, not an unrelated
authorization failure. Confirmed fixed.

**Kept anyway.** The portal still treats a bare 403 on booking creation the same as the documents 422 (opens
`DocumentGateModal` instead of a toast) as a defensive fallback — harmless now, and it means a future regression of
this kind fails the same graceful way instead of silently again. The 422's mention of "ID number" also turned out to
be real: `DocumentUploadCard`'s `requireIdNumber` field existed but was previously wired to nowhere (its value was
collected and then dropped — see `useUploadDocument`). It now actually saves the ID number to the profile
(`PATCH /users/me`) before the document upload starts, on the National ID slot both on `/dashboard/documents` and in
the checkout gate.

## 9. A fallback from an owner's terms to a platform-wide default — **not just a preview issue, blocks real bookings**

**Why.** `GET /contract-templates/owners/{ownerId}/active` only ever matches a template created through
`POST /contract-templates/owner` (tied to that owner by the backend). A template created through
`POST /contract-templates/admin` (`createPlatform`) has no owner at all — confirmed live: approving one there still
leaves `GET /contract-templates/owners/{ownerId}/active` returning 404 for every owner. So today, an administrator
creating a template from the admin Contract Templates page does nothing for any renter's "Preview rental terms"
link — only a template the *owner themselves* submits (then gets approved) ever shows up there.

**This isn't only cosmetic.** A real booking on a vehicle whose owner has no owner-scoped approved template hits
`POST /payments/bookings/{bookingId}/contract/draft` and gets a bare error (`ContractPage.jsx` shows the fallback
"Could not prepare your contract.", no `message` in the body) — the same underlying gap as the preview 404, just
surfacing at the point the renter has already paid nothing but is trying to move to payment. Every one of this
account's own vehicles is in this state right now: only an admin-created (ownerless) template exists, so nobody can
complete a booking on any of them until an owner-scoped template is created and approved.

**Ask.** When an owner has no approved template of their own, have `GET /contract-templates/owners/{ownerId}/active`
fall back to the newest approved platform template, so an administrator can set one sensible default for every owner
who hasn't written their own — and have `POST .../contract/draft` use that same fallback, since it's very likely
reading from the same lookup. Also: give a real `message` on whatever error `.../contract/draft` returns for this
case, so the renter sees why instead of a generic "could not prepare."

**Meanwhile.** Owners are told to create their own template from `/owner/contracts` and have it approved from
`/admin/contracts/templates` — that path works today, and is the immediate fix for the vehicles already blocked.
A template made directly on the admin page only functions as a record for admins to look at; it has no effect on
what any renter sees, or on whether a booking can reach payment.

## 10. Staff completing a booking on a customer's behalf

**Why.** Some renters don't have time to work through sign-up, document upload, contract and payment themselves and
would rather have staff do it for them. There is no way to do this today:

- `BookingRequest` has no field to attribute a booking to anyone but whoever is logged in — no `renterId` or
  equivalent.
- There is no staff/admin endpoint to create a user account. `POST /auth/register` is the only one, and it's the
  same public, self-serve form the portal already uses — nothing lets staff create an account and then act as that
  customer afterwards.
- Document upload (`POST /documents`) is likewise always for the logged-in account, with no way for staff to upload
  on someone else's behalf.

**Ask.** For staff (a MANAGER/ADMIN role) to run an entire booking as a customer — pick or create the customer's
account, upload their documents, accept the contract and pay — the backend needs:
1. A staff-facing way to create a renter account (or reuse `POST /auth/register` with a staff-only variant that
   skips email verification, since staff are vouching for the person directly).
2. `POST /bookings/create` (and `/bookings/create-batch`) to accept an optional `renterId`, honoured only for a
   MANAGER/ADMIN token, attributing the booking to that customer instead of the caller.
3. `POST /documents` to accept the same optional target-user parameter, so staff can upload a customer's ID/licence
   for them.

**Status: all three now exist — built 2026-09-28.** Confirmed in the live spec:
1. `POST /users/admin/renters` (`StaffRenterRequest`: email, firstName, lastName, phoneNumber) →
   `StaffRenterResponse`, which includes a `temporaryPassword` and `accountAlreadyExisted`.
2. `BookingRequest` now has an optional `renterId`.
3. `POST /documents/admin/users/{userId}?documentType=…` uploads a document for that specific user.

The frontend piece (a staff-facing flow: create-or-pick a renter, upload their documents, run the booking through
contract and payment attributed to them) is not built yet — this entry stays open until it is.

## 11. `DocumentResponse` doesn't say whose document it is

**Why.** Confirmed live against the current spec: `DocumentResponse` (what `GET /documents/admin/pending` and
`GET /documents/{id}/content` return) has `id`, `documentType`, `vehicleId`, `originalFileName`, `contentType`,
`fileSize`, `reviewStatus`, `reviewNotes`, `createdAt` — and nothing else. There is no `userId`, `ownerId`, or any
other field saying which account uploaded it. `vehicleId` exists for a vehicle-specific document, but a personal one
(National ID, Driving Licence, Passport, Proof of Address — the vast majority of what admins review) has no owner
reference of any kind.

In practice this means an administrator reviewing `/admin/documents` cannot tell whose National ID they're looking
at — only what's printed on it, if anything is legible. `AdminDocumentsPage.jsx` already says as much in its own
comment ("the card describes the file — what's on it is how you verify it"), which was an accepted workaround before
it was clear how often it would actually matter. It doesn't hold up as a real verification step: it means approving
identity documents without any reliable link back to the account that's supposed to own them, and it makes it
impossible to show a reviewer "these three documents are all for the same person" or to route a rejection's
"please re-upload" back to the right person with any certainty beyond the document itself.

**Ask.** Add a `userId` (or `uploaderId`) field to `DocumentResponse`, populated from whoever was authenticated when
`POST /documents` (or the new `POST /documents/admin/users/{userId}`) was called. Ideally also embed enough of that
person's identity to show on the review card directly — name and email — so an admin isn't forced to cross-reference
a bare id by hand for every single document.

**Meanwhile.** There is no frontend workaround for this — the identity link genuinely doesn't exist in the API
response, so nothing client-side can reconstruct it. `AdminDocumentsPage.jsx` is unchanged (still shows the file
only); this needs the backend field before the review flow can honestly claim to verify identity rather than just
inspect a photo.

## 12. No notification when a document is submitted for review

**Why.** Confirmed: the backend does create notifications for at least one event ("an owner gets one when a renter
books their vehicle," per `useNotifications.js`, tested live), and the frontend already has a full Inbox for them
(`InboxPage.jsx`, a bell + unread badge in every role's menu). But nothing arrives for an administrator when a
renter or owner submits a document for review — tested live on 2026-09-28: uploading a National ID produced no
notification in the reviewing admin's Inbox. Combined with item 11, a pending document sits in the queue with no
signal that it's there and no reliable way to say whose it is once someone finds it.

**Ask.** When a document is submitted (`POST /documents` or the staff-upload variant), create a notification for
whichever role(s) review documents (admin, or a manager with that permission) — same mechanism as the existing
booking notification, just a different trigger and recipient. `type`/`referenceType`/`referenceId` on
`NotificationResponse` already look built for exactly this (e.g. `type: "DOCUMENT_PENDING_REVIEW"`,
`referenceType: "DOCUMENT"`, `referenceId: <document id>`) — this may be more a matter of wiring the trigger up
than adding new API surface.

## 13. `BookingResponse` has no `contractId` — signing a contract was completely broken until worked around

**Why.** `SignaturePage.jsx` fetches the contract to sign via `GET /payments/contracts/{contractId}`, and
previously read that id from `booking.contractId`. Confirmed against the live swagger spec: `BookingResponse` has
no such field (its properties are `id`, `vehicleId`, `renterEmail`, `startTime`, `endTime`, `status`,
`bookingMode`, `estimatedAmount`, `numberOfDays`, `tripType`, `renterNotes`, `dispatcherNotes`, `chauffeurEmail`,
`actualEndTime`, `overstayDays`, `overstayAmount`) — so that read was always `undefined`, and the page's own
`!contract` check then always fell through to a bare "Could not load your contract.", with no way to sign at all.
This was a same-day regression from an earlier assumption written into the code as a known-unconfirmed guess (its
own comment said as much); testing the full booking flow live on 2026-09-28 is what surfaced it. There's also no
`GET /bookings/{id}/contract`-style lookup to fall back on — the only way to get a contract's id is from the
response of drafting or accepting it (`ContractResponse.id`, confirmed present on both).

**Ask.** Either add `contractId` to `BookingResponse` (simplest — every other page that needs it, e.g. the
contract download links on a booking's own page, could then read it directly, same session or not), or add a
`GET /bookings/{id}/contract` (or similar) lookup that returns the current `ContractResponse` for a booking.

**Meanwhile.** `useContractDraft` (`useContract.js`) now stashes the drafted contract's `id` in
`sessionStorage`, keyed by booking id, the moment it's created — the same pattern `PaymentPage.jsx` already used
for `bookingId` to survive Pesapal's full-page redirect. `SignaturePage.jsx` reads it from there instead of the
booking record, which fixes signing for the same session the contract was drafted in (every real checkout).
`BookingDetailPage.jsx`'s contract download links use the same stash, but only work while that session's
sessionStorage still has it — a booking looked at again after the tab that booked it closed has no download
links, since nothing client-side can recover the id at that point.

## 14. `PUT /payments/contracts/{contractId}/sign` returns a 500 before the booking is paid for

**Why.** Tested live on 2026-09-28 while investigating a renter's report that they couldn't sign a contract:
`PUT /payments/contracts/{contractId}/sign` returned `500 {"message":"An unexpected error occurred"}` for a
freshly-drafted contract on a `PENDING` (unpaid) booking — with the exact same payload the frontend sends
(`{signature, consent: true}`), and also with the `data:image/png;base64,` prefix stripped from `signature`, to
rule out that as the cause. `ContractResponse.paymentRequired: true` shows the backend already models "this
contract can't be signed yet" as a real state; the 500 suggests that's enforced by something that throws
unhandled rather than returning a clean 4xx. Manual payment confirmation is disabled
(`POST /payments/bookings/{id}/confirm` → `410 "Manual payment confirmation is disabled; use Pesapal checkout"`),
so a real Pesapal payment — not something this environment can complete — is the only way to get a booking past
`paymentRequired` and confirm whether signing then works cleanly. **Unconfirmed**: whether this 500 also happens
after real payment, or only before it.

**Ask.** If signing before payment is meant to be refused, return a normal 4xx with a clear message (e.g. 409
"Payment required before signing") instead of a 500 — the frontend already has a generic-500 message
(`apiErrorMessage`) that reads oddly for what should be an expected, well-defined refusal. If this 500 also
reproduces *after* a real payment, that's a separate, more serious bug worth its own report — signing is
otherwise unreachable if so.

**Meanwhile.** No frontend workaround changes what the backend does with a signing attempt; `SignaturePage.jsx`
already shows the raw backend error via `apiErrorMessage` on failure (`useSignContract`'s `onError`), so a renter
at least sees *some* message rather than a silent failure, whatever the backend returns.

## 15. `POST /payments/pesapal/bookings/{bookingId}/checkout` consistently returns 500 — no renter can pay

**Why.** While looking into item 14 (signing needs payment first) and a request for "the Pesapal callback URL"
— which is backend config (`PESAPAL_CALLBACK_URL`; `PaymentPage.jsx`'s own comment already notes this isn't
knowable from the frontend, and the frontend never sends one — the checkout-initiation call takes no body at
all) — checkout initiation itself was tested live on 2026-09-28 and found broken:
`POST /payments/pesapal/bookings/{bookingId}/checkout` returned `500 {"message":"An unexpected error
occurred"}` on **two separate fresh bookings, reproduced twice each**. Unlike the transient contract-draft 500s
seen earlier the same day (which succeeded on a bare retry), this did not recover. This is the very first step
of paying (`usePesapalCheckout` in `usePayment.js`, called from `PaymentPage.jsx`'s "Proceed to Payment"): if
it consistently 500s, **no renter can pay for any booking right now**, which also means no booking can ever
reach `paymentRequired: false` — so item 14's open question answers itself as far as it can from here: signing
can't be reached at all today, because payment can't be started at all today.

**Ask.** This is entirely server-side (Pesapal API credentials/config, or an unhandled exception in the
checkout-initiation code) — needs the backend logs for one of these calls to diagnose. Worth checking first
whether the sandbox Pesapal credentials configured on this environment are valid/complete, since
`VITE_PESAPAL_ENV=sandbox` suggests this is a non-production setup that may not be fully wired up. Separately:
the frontend now has a dedicated landing page for Pesapal's own return redirect, `/payment/success` (see the
2026-09-28 changelog entry) — if `PESAPAL_CALLBACK_URL` doesn't already point somewhere on this frontend,
pointing it at `https://<this app>/payment/success?bookingId={id}` (with `{id}` filled in per-transaction) is
the intended target; the page also works without that query param, falling back to a client-side stash, but
the query param is the more reliable of the two.

**Meanwhile.** Nothing to work around client-side — `PaymentPage.jsx` already shows the backend's error message
via `apiErrorMessage` rather than failing silently, but there is no path around the backend actually starting a
Pesapal session. This blocks the entire back half of the booking flow (pay → sign → confirm) for every renter
today.

## 16. No way for the owner to countersign a booking's contract

**Why.** A vehicle owner would like to add their own signature to a booking's contract from the portal, drawn by
hand or mouse the same way a renter already does (`SignaturePad.jsx`, `react-signature-canvas`). The backend has
no such capability today: an owner's `ContractTemplateResponse` (`GET /contract-templates/mine`) is just
`{id, name, version, status, content}` — reusable wording, reviewed once by an administrator, not tied to any one
booking or signature. Per-booking, `ContractResponse` (drafted/accepted at `/payments/bookings/{bookingId}/contract/*`)
and its one `PUT /payments/contracts/{contractId}/sign` (`{signature, consent}`) are both modeled for a single
signer — the renter. There is no field to hold a second (owner) signature, no endpoint to submit one, and nothing
in `BookingResponse`/`ContractResponse` that would show whether an owner has signed.

**Ask.** Either a second signing endpoint per contract (e.g. `PUT /payments/contracts/{contractId}/owner-sign`,
`{signature, consent}`, restricted to the vehicle's own owner) with the resulting image/state exposed back on
`ContractResponse` (e.g. `ownerSignatureUrl` / `ownerSignedAt`), or, if a contract is meant to need both
signatures before it's considered fully executed, a status field showing that (e.g. `awaitingOwnerSignature`).
Worth deciding at the same time whether the renter's own signing should require the owner to have signed first,
or the other way around, since that changes which step gates which in the frontend flow.

**Meanwhile.** Nothing to build against yet — there is no endpoint to call. This is also currently untestable
end-to-end regardless, since item 15 (Pesapal checkout consistently 500s) means no booking can reach a paid,
signable state today. Once a countersign endpoint exists, the frontend piece is small: reuse `SignaturePad.jsx`
(already hand/mouse-capable) on a new owner-facing page/step, the same shape as `SignaturePage.jsx`.

## 17. `PESAPAL_CALLBACK_URL` is configured to port 3000 — payment confirmation never lands

**Why.** Checkout initiation itself now succeeds (progress since item 15 was written) — a renter reaches
Pesapal, and the app's own `PaymentPage` correctly shows its polling UI ("Waiting for Pesapal to confirm your
payment…"). But it then polls forever: the owner confirmed the backend's `PESAPAL_CALLBACK_URL` is set to port
3000, which is not where this frontend runs (Vite's default dev port is 5173; whatever the deployed origin is,
it needs confirming too). Pesapal's callback — its server-to-server confirmation and/or the browser's own
return redirect, depending on which one that config value drives on this backend — never reaches anything real,
so `GET /payments/pesapal/bookings/{bookingId}/status` keeps reporting a non-final status indefinitely, even
though the renter may have completed payment on Pesapal's side.

**Ask.** Point `PESAPAL_CALLBACK_URL` at this frontend's actual origin, e.g.
`https://<this app>/payment/success?bookingId={id}` per item 15's note (`PaymentSuccessPage` is already built to
receive it, with a client-side sessionStorage fallback if the query param is ever missing) — not port 3000.

**Meanwhile.** Nothing client-side can make Pesapal's callback land somewhere it isn't configured to reach, but
the endless, indistinguishable-from-broken spinner is now fixed: `usePaymentStatus`/`paymentStatusQuery`
(`usePayment.js`) already give up polling after `PAYMENT_POLL_MAX_ATTEMPTS` (10 tries, ~30s) with no settled
status — that state just wasn't being surfaced. `PaymentStatusPanel` now shows a distinct "Still waiting on
Pesapal" message with a manual "Check again" button once polling is exhausted, instead of spinning forever with
no explanation (same fix applied to `GroupPaymentPage`'s combined-payment polling).

## 18. The owner's "new booking" notification fires at booking creation, not once payment is confirmed

**Why.** `useNotifications.js`'s own comment already documents the current behaviour: "the backend creates
them — an owner gets one when a renter books their vehicle." That's `POST /bookings/create` succeeding, which
happens *before* Pesapal checkout even starts, not once the payment behind it is actually confirmed. A booking
in that gap can still fail to ever get paid for (the renter abandons checkout, Pesapal declines it, or — as
items 15/17 show — checkout itself is currently broken), so an owner can be notified about, and start expecting,
a booking that never becomes real. The request is to move the trigger to whenever
`GET /payments/pesapal/bookings/{bookingId}/status` would first report `SUCCESSFUL` (the same event
`usePaymentStatus`'s polling on the frontend is already watching for).

**Ask.** Fire the owner's new-booking notification from the same place the booking's payment status is set to
`SUCCESSFUL` (the Pesapal IPN/callback handler — see item 17), instead of from `POST /bookings/create`. Worth
deciding at the same time whether a booking that's created but never paid for should still notify the owner in
some lesser way (e.g. once the payment hold expires unpaid) or not at all.

**Meanwhile.** Nothing to change client-side — the frontend has no part in creating this notification at all;
it only ever reads `GET /notifications` / `GET /notifications/unread-count` and marks entries read. This is a
purely server-side trigger-timing change.

**Update 2026-10-09 — urgent, product decision made.** The product owner has decided: **no new-booking
notification may go to an owner before the booking is paid.** Still happening live: every test booking created
on 2026-10-08/09 (all unpaid, all cancelled within minutes) sent the owner a new-booking notification. Please
move the trigger to payment confirmation as asked above; an unpaid booking that's cancelled or expires should
send the owner nothing at all.

## 19. Drafting a contract isn't idempotent — re-requesting one for a booking that already has one crashes with a raw 500

**Why.** `POST /payments/bookings/{bookingId}/contract/draft` is called again whenever `ContractPage` is
revisited for a booking whose contract was already drafted — the browser's Back button, a stale link, or
simply returning to finish an interrupted checkout. Confirmed from a live backend log:

```
org.springframework.dao.DataIntegrityViolationException: could not execute statement
[ERROR: duplicate key value violates unique constraint "ukoageowo07ggdo2qdjt6cebks7"
 Detail: Key (booking_id)=(32e78702-e32c-434c-95e2-ae8505a7abea) already exists.]
[insert into booking_contract (... booking_id ...) values (...)]
```

`booking_contract.booking_id` has a unique constraint (as it should — one contract per booking), but the
drafting endpoint doesn't check for an existing row first: it always attempts an `INSERT`, which then crashes
on that constraint instead of returning the contract that's already there. The resulting 500's `message` is the
raw Java/Postgres exception text above — exposing internal class names, the SQL statement, and the constraint
name to whatever reads the HTTP response.

**Ask.** Make the draft endpoint idempotent: look up `booking_contract` by `booking_id` first, and if one
already exists, return it (same shape as a successful draft) instead of attempting a second insert. If a fresh
draft is sometimes genuinely wanted (e.g. after some correction), that should be a distinct, explicit operation
— not what happens by accident on a second page load. Either way, nothing should ever put raw exception
text in a response body a frontend might show to a user.

**Meanwhile.** `ContractPage.jsx`'s `ALREADY_HANDLED_HINT` — already used to recognize "this booking's contract
was already accepted" from the backend's wording and show a friendly "already taken care of" screen (with
**Continue to payment**) instead of a raw error — now also matches `"duplicate key"`/`"already exists"`, so
this specific crash gets the same graceful handling rather than showing the stack trace above. It's a
workaround for the display only: the backend still fails the same way underneath, this just stops the renter
from seeing it.

## 20. Please confirm `GET /vehicles`'s `startTime`/`endTime` overlap exclusion actually covers CONFIRMED/ACTIVE bookings

**Why.** A booked vehicle should stay visible in search (not vanish) but be marked **Booked** and refuse to be
added to a new booking for the dates someone already holds it — added in `useVehicleAvailability` and
`useVehicleWindowBooked` (`hooks/useVehicles.js`), used by `VehiclesPage`'s grid badge and
`AddToBookingPanel`'s pre-submit check. Both work entirely by asking `GET /vehicles?startTime=&endTime=` twice
(with and without a date window) and treating whatever drops out as booked — §2 of this guide documents that
parameter as "excludes overlapping bookings," so no backend change should be needed.

That said, this was only checked live against a **PENDING** booking (unpaid, 15-minute hold) — the vehicle
still appeared in a search for its exact dates. That's probably correct (a pending hold expiring in minutes
shouldn't block someone else from seeing the car), but it means the one case that actually matters here —
whether a **CONFIRMED**/**ACTIVE** (paid) booking's dates are genuinely excluded — is unverified: confirming it
needs a real Pesapal sandbox payment actually completed by a person, which isn't something this session could
drive end to end.

**Ask.** Please confirm (or fix, if it isn't already true) that `GET /vehicles`'s `startTime`/`endTime`
exclusion only counts `CONFIRMED` and `ACTIVE` bookings as taken — not `PENDING` ones, which should keep
expiring and releasing the dates as they do today.

**Meanwhile.** The frontend already assumes this is true and is built entirely on top of it; nothing here is
blocked on a backend change, but the "Booked" badge and the booking-blocked message are only as correct as
that exclusion is. Worth one real end-to-end check (create a booking, pay it through Pesapal's sandbox for
real, then search those same dates again) to confirm before relying on it.

## 21. `PESAPAL_CALLBACK_URL` points at a LAN IP the backend's own CORS policy then rejects

**Why.** The dev backend's `PESAPAL_CALLBACK_URL` is currently set to `http://192.168.8.32:5173/payment/success`
(this machine's LAN address) rather than `http://localhost:5173/payment/success`. Confirmed live: the backend's
CORS policy only allows the origin `http://localhost:5173` — a request with `Origin: http://192.168.8.32:5173`
gets `403 "Invalid CORS request"` even with a valid bearer token:

```
$ curl -H "Authorization: Bearer <valid token>" -H "Origin: http://192.168.8.32:5173" \
    http://192.168.8.9:8080/api/v1/vehicles
HTTP/1.1 403
Invalid CORS request
```

The same request with `Origin: http://localhost:5173` returns `200` normally. Since Pesapal's redirect back
lands the browser on the LAN-IP origin, every API call the app makes after that point — loading vehicles,
checking payment status, everything — fails outright. This is what made vehicles stop loading after a
payment: not a frontend bug, the browser is simply stuck on an origin the backend itself refuses to talk to.

**Ask.** Change `PESAPAL_CALLBACK_URL` to `http://localhost:5173/payment/success` (or whatever the real deployed
frontend origin is in production) instead of a LAN IP. `localhost` is reachable from the same machine the
dev server runs on and is already an allowed CORS origin, so this fixes it without widening CORS at all. If a
LAN IP is genuinely needed (testing from a phone on the same network, say), that origin needs to be added to
the backend's CORS allow-list explicitly instead.

**Meanwhile.** Nothing to change client-side — the frontend has no control over which origin Pesapal's own
redirect lands the browser on; that is entirely `PESAPAL_CALLBACK_URL`, set server-side.

## 22. Two new endpoints needed: recording a vehicle's pickup and return handover with real details — **built, on a different contract than proposed (confirmed 2026-10-02)**

**Was.** Today there's no way to capture what actually happens at the two moments that matter most for a
rental's liability — handing the car over, and getting it back. The only thing that exists is the generic
`PUT /bookings/{id}/status`, which moves a booking to any status with a free-text note, and
`PUT /bookings/{id}/return`, whose `BookingReturnRequest` body is just `{ actualEndTime }` — confirmed
against the live OpenAPI spec, nothing about odometer, fuel level, condition, or any acknowledgement from
either party. The frontend had `VehicleHandoverForm`/`VehicleHandoverModal` built against a guessed
`POST /bookings/{id}/pickup` / `POST /bookings/{id}/return` contract that the backend never implemented.

**Now.** A dedicated `vehicle-handover-controller` exists in the live spec, under a different path than
guessed and with the structured fields as query parameters rather than multipart form fields:

- `GET /handovers/bookings/{bookingId}` → `HandoverResponse[]` — this booking's recorded handovers.
- `POST /handovers/bookings/{bookingId}/pickup` and `POST /handovers/bookings/{bookingId}/dropoff` (not
  `/return`) — both take `odometerReading` (int, required), `fuelLevel` (required, the same
  `EMPTY`/`QUARTER`/`HALF`/`THREE_QUARTERS`/`FULL` enum already in `FUEL_LEVELS`), `conditionNotes`,
  `damageNoted`, `damageDescription` and `location` (all optional) as **query parameters**, plus a
  `multipart/form-data` body containing only `signature` (file). Both answer with a `HandoverResponse`
  (`id`, `bookingId`, `vehicleRegistration`, `vehicleModel`, `renterEmail`, `type: "PICKUP"|"DROPOFF"`,
  `handoverTime`, the submitted fields, `signedBy`, `signedAt`, `bookingStatus`) — **not** a
  `BookingResponse`. The frontend (`useVehicleHandover.js`) now calls these for real; `VehicleHandoverForm`
  collects the two new optional fields (damage flag + description, location) alongside the original three.

**Open question.** `HandoverResponse` carries `bookingStatus` but no `actualEndTime`/overstay figures, and
the separate `PUT /bookings/{id}/return` (`BookingReturnRequest: { actualEndTime }` → `BookingResponse`
with `overstayDays`/`overstayAmount`) is still in the spec, untouched. It's not confirmed whether
`POST .../dropoff` also sets the booking's `actualEndTime` internally (so overstay is computed from the
dropoff automatically), or whether the frontend is additionally expected to call
`PUT /bookings/{id}/return` right after a dropoff to get overstay calculated at all. **Please confirm**
which it is — until then, the frontend calls only the handover `dropoff` endpoint and does not chain a
second call to `/bookings/{id}/return`, since calling an endpoint whose effect on an already-dropped-off
booking is unknown risked a worse bug (a duplicate state transition or a 409) than leaving overstay
unconfirmed for now. If a second call is in fact required, `BookingRow.jsx`'s `overstayDays`/`overstayAmount`
display will otherwise silently stay empty after every return.

**Follow-up — confirmed live 2026-10-05: only the renter may submit a handover, not the owner.** The two
endpoints above were originally wired up on the *owner's* side (`OwnerBookingDetailPage.jsx`, and the
owner/admin view of `BookingRow.jsx`) — the product assumption was that the owner/dispatcher records the
vehicle's condition and the renter only signs to confirm it. Tested live: an owner account calling
`POST /handovers/bookings/{bookingId}/pickup` gets a 403 with `"Only the renter can submit handover
details"`. Re-tested with a renter account on the same booking — succeeds. **The frontend now has this the
other way round:** "Record Pickup"/"Record Return" are offered to the renter (My Bookings' expanded row and
`BookingDetailPage.jsx`), not the owner or admin, who instead see the same handover record read-only. The
signature field's direction flipped to match — `VehicleHandoverForm` now asks the renter to fill in the
details and has the owner or their dispatcher (whoever's physically there) sign to confirm it, rather than
the other way round. **Please confirm** this is the intended authorization model (a renter self-reporting
the vehicle's own condition at both pickup and return, with no equivalent owner-side submission at all) —
if not, and an owner/dispatcher submission was meant to be allowed too (e.g. either party, or the backend
meant to key this off the account present at the counter rather than hard-coding "renter"), the frontend can
move the actions back or offer them to both sides once that's clarified.

## 23. `GET /bookings/mine` (and every other booking-list endpoint) 500s on this environment — missing DB column — **fixed 2026-10-03**

**Confirmed fixed.** Re-tested live: `GET /bookings/mine` now returns real data (no 500) for the same
account that reproduced this. The missing-column migration appears to have been run. Re-test item 25 below
too, since it was suspected to share this root cause — confirmed live the same day it does **not**: `booked`
is still wrong even now that this one is fixed, so it's a separate, still-open issue.

**Why.** Reported live 2026-10-02: a renter saw no bookings at all on `/dashboard/bookings`. Tested directly
against this environment's backend (`192.168.8.9:8080`) with a real account: `GET /bookings/mine` returns a
raw `500`:

```
[org.springframework.dao.InvalidDataAccessResourceUsageException] JDBC exception executing SQL
[ERROR: column b1_0.postponement_count does not exist]
... select b1_0.id, ..., b1_0.postponement_count, ... from booking b1_0 ...
```

The `booking` JPA entity now has a `postponementCount` field (almost certainly added for the new
booking-policy postponement feature — see item 24) but this environment's Postgres database was never
migrated to add the column. Since every booking query selects the full entity, this breaks **every**
booking-list endpoint on this environment, not just `/mine` — `/bookings/owner`, `/bookings/{id}`, and the
admin/owner/renter reports all select from the same table and will fail the same way.

**Ask.** Run the missing migration (e.g. `ALTER TABLE booking ADD COLUMN postponement_count integer NOT
NULL DEFAULT 0`, or whatever the real migration script already defines) against this environment's
database. This is purely a deployment/ops gap, not a frontend bug — the frontend's booking queries
(`useBookings.js`) are unchanged and correct against the spec.

**Meanwhile.** Nothing to work around client-side — a query that 500s at the database layer can't be
retried into working from the frontend. Confirm the column exists in this environment before re-testing any
booking list.

## 24. New booking-policy-controller: cancellation — built; postponement and policy management — not yet

**Why.** The live spec has a `booking-policy-controller`:

- `GET /booking-policies/platform` / `PUT /booking-policies/platform` — the platform-wide default policy
  (`BookingPolicyRequest`/`Response`: `freeCancellationWindowHours`, `cancellationDeadlineHours`,
  `lateCancellationRefundPct`, `postponementAllowed`, `postponementDeadlineHours`, `maxPostponements`).
- `GET /booking-policies/owner` / `PUT /booking-policies/owner` — the same shape, scoped to the signed-in
  owner (presumably falling back to the platform default where unset — unconfirmed).
- `GET /booking-policies/bookings/{bookingId}/effective` — the policy actually governing one booking.
- `POST /booking-policies/bookings/{bookingId}/cancel` → `CancellationResponse` (`bookingStatus`,
  `paidAmount`, `refundAmount`, `refundPercent`, `message`) — a policy-aware cancellation.
- `POST /booking-policies/bookings/{bookingId}/postpone` (`PostponementRequest: { startTime, endTime }`) →
  the updated `BookingResponse` — a renter moving their own booking's dates.

This is almost certainly the feature behind item 23's missing `postponement_count` column — the backend is
mid-rollout of it on this environment.

**Now built (2026-10-02).** The renter-facing cancel flow: `CancelBookingModal.jsx` (shared by `BookingRow`
and `BookingDetailPage`, replacing each one's own ad-hoc confirm dialog) reads
`GET /booking-policies/bookings/{bookingId}/effective`, previews the refund a cancellation right now would
get using `lib/cancellation.js`'s `cancellationQuote` (full refund outside `freeCancellationWindowHours`,
`lateCancellationRefundPct` inside it but outside `cancellationDeadlineHours`, refused outright inside the
deadline — "cancellation can't be abused a few hours before pickup" was the explicit product requirement
this answers), and calls `POST /booking-policies/bookings/{bookingId}/cancel` (`useCancelBooking` in
`hooks/useBookingPolicies.js`) instead of the old blunt `PUT /bookings/{id}/status { status: "CANCELLED" }`.
If the policy fails to load, the modal fails open (shows the cancel button with no refund preview) rather
than blocking a cancellation on an unrelated fetch failure — the backend's own response to `/cancel` is
still the real, final word on whether it's actually allowed.

**Still open.** Where an owner edits their own cancellation/postponement policy (a new settings surface —
none exists today), what UI a renter postponing a booking needs (new dates, validated against
`postponementDeadlineHours`/`maxPostponements` from the effective policy), and a platform-default policy
screen for admins. None of these are built yet.

**Meanwhile.** There is no postponement UI and no owner/admin screen to view or edit a booking policy.
Confirm item 23 is fixed on this environment before relying on `/effective` or `/cancel` in production,
since both read from the same `booking` table the 500 comes from.

## 25. `VehicleResponse.booked` is `false` for a vehicle with a real, Confirmed/paid booking — **confirmed to have caused a real double payment**

**Escalation (2026-10-03):** this is no longer a cosmetic "missing badge" issue. Reported live: a renter
booked and paid for the Rolls-Royce Ghost, then — because it still showed no "Booked" badge and an active
**Book** button — booked and paid for the **same vehicle a second time**. This is a direct, real financial
consequence of the bug below: the platform currently lets a renter double-book (and double-pay for) a
vehicle that already has a paid, Confirmed booking on it, with nothing on the frontend able to catch it,
because the backend itself reports the vehicle as not booked. Checked for a frontend contributing cause too
(a double-click race on the payment buttons) and closed that separately as a real but unrelated gap — it
was not what happened here; this is solely the `booked` field. **This needs priority attention and likely a
manual reconciliation/refund for the renter affected.**

**Still broken as of 2026-10-03, after item 23's fix shipped.** Re-tested live the same day item 23 (the
missing `postponement_count` column breaking every booking-list endpoint) was confirmed fixed: `booked` is
still `false` for the Rolls-Royce Ghost, which has a real `CONFIRMED` booking for 2026-10-04 sitting in that
same renter's own `GET /bookings/mine` response. So this is now confirmed **not** the same root cause as
item 23 (ruling out the "shares a cause, might resolve together" theory below) — it's an independently
broken computation that still needs its own fix.

**Why.** Reported live 2026-10-02: a vehicle with a Confirmed (paid) booking on it still showed no
"Booked" badge on `/vehicles`. Confirmed directly against this environment with a real account:
`GET /vehicles` currently returns `"booked": false` for every vehicle in the fleet checked, including the
one with the Confirmed booking. This is **not a frontend bug** — `VehicleCard.jsx`'s badge
(`{isBooked && <Badge label="Booked" .../>}`) and `useVehicleAvailability` (`hooks/useVehicles.js`) do
nothing but mirror this field straight from the backend:

```js
const vehicles = list.map((v) => ({ ...v, isBooked: v.booked === true }));
```

There is no client-side computation to get wrong here — if the backend sends `false`, the frontend shows
no badge, correctly reflecting what it was told.

Item 20 already flagged that whether a **Confirmed/Active** booking actually gets excluded/flagged was
unverified (only a PENDING booking had been tested, which is correctly *not* supposed to badge a vehicle —
see item 6). This closes that gap with a negative result: a Confirmed booking does **not** currently mark
its vehicle as booked either, so whatever computes this field is not working at all right now, for any
booking status. Given item 23 (every booking-table query 500s on this environment over a missing
`postponement_count` column), the most likely explanation is the same root cause — if `booked` is computed
by loading the vehicle's bookings through the same JPA entity, it very plausibly fails or silently
short-circuits to `false` the same way `GET /bookings/mine` hard-fails to a 500.

**Ask.**
1. Please check whether `booked`'s computation touches the `booking` entity (and is therefore also broken
   by item 23's missing column) or is a separate, independently broken code path. Either way, it needs to
   correctly reflect at least `CONFIRMED` and `ACTIVE` bookings before the "Booked" badge (and the
   booked/not-booked distinction `AddToBookingPanel` relies on before letting a renter add an already-taken
   vehicle to a booking) can be trusted again.
2. Given this field alone has now caused a real double-payment, please also treat item 6's "auto-block" ask
   as a priority, not just a nice-to-have: `POST /bookings/create` should refuse (409) a vehicle that
   already has a `CONFIRMED`/`ACTIVE` booking overlapping the requested dates, **server-side**, regardless
   of what `GET /vehicles`'s `booked` field happens to say. A display flag is inherently a read that can be
   stale or buggy (as just shown); the actual creation endpoint is the only place this can be enforced
   reliably, including against two renters racing each other for the same vehicle.

**Meanwhile — partial mitigation shipped 2026-10-03.** `AddToBookingPanel` now also checks the signed-in
renter's own `GET /bookings/mine` (`useRenterVehicleOverlap`, `lib/vehicleBookings.js`'s `overlappingBooking`)
and blocks "Add to booking" if *they themselves* already hold a Pending/Confirmed/Active booking on that
vehicle overlapping the chosen dates — independent of the broken `booked` field, so it actually works. This
is what would have stopped the exact incident described above (the same renter booking the same vehicle
twice). It is **not** a fix for item 25 itself: it has no visibility into any other renter's bookings, so a
different person can still book a vehicle that's already taken, and the public "Booked" badge is still
wrong for everyone. The real fix still needs both asks above.

**Update (2026-10-04) — no longer uniformly broken, but still wrong for at least one real case.**
Re-checked live (`GET /vehicles?search=Cayenne`, same owner account): **Rolls-Royce Ghost now correctly
reports `"booked": true`** — progress since this was last checked. But **Porche Cayenne (KDX00P) still
reports `"booked": false`** despite the renter confirming its booking shows as Confirmed (paid) in My
Bookings. So this is no longer "broken for every vehicle, every time" — it's now inconsistent, correct for
some bookings and wrong for others, which is arguably harder to track down than a uniform failure (and
just as dangerous: a renter or admin has no way to tell which "not booked" reading to trust). Worth checking
whether this correlates with *when* the booking was confirmed relative to whatever fixed the Rolls-Royce
case, or with some other per-booking state (e.g. which code path confirmed the payment). Both asks above
still stand; this update is just a sharper repro for whoever picks it up.

## 26. Platform commission is now a real, settable rate — `BookingQuoteResponse`/`BookingResponse` gained a fee breakdown; a new `platform-settings-controller` sets it

**Why.** Confirmed live 2026-10-03 (a fresh spec diff against the one pulled 2026-10-02): the backend now
has a `platform-settings-controller` — `GET`/`PUT /platform-settings/commission`
(`PlatformSettingsRequest`/`Response`: just `commissionRatePct`, a double 0–100) — and two response shapes
changed to carry the resulting split:

- `BookingQuoteResponse` (`POST /bookings/quote`) **dropped `estimatedAmount`** and replaced it with
  `baseAmount`, `platformFee`, and `totalAmount` — a breaking change. Fixed the same day: `AddToBookingPanel`
  and `CartTotals` (the only two places that read a *quote's* amount, as opposed to an existing booking's
  own `estimatedAmount`) now read `totalAmount`.
- `BookingResponse` (an existing booking) **kept `estimatedAmount` unchanged** and additionally gained
  `baseAmount`/`platformFee` alongside it — not breaking, and not consumed anywhere yet (no UI shows a
  created booking's fee breakdown today).

**Ask.** None — confirmed live 2026-10-03: `GET /platform-settings/commission` needs auth but is readable by
any signed-in role (a renter token got `200 {"commissionRatePct": 1.0}`), while `PUT` refuses a renter token
(`403`) — consistent with "anyone can see the current rate (it's baked into every quote), only an admin can
change it." No further confirmation needed before building against it.

**Not built yet.** No frontend page reads or sets the commission rate, and no booking detail view shows the
new `baseAmount`/`platformFee` split on an existing booking. Both are small, well-shaped additions once
prioritized — this entry stays open until either is built.

## 27. `BookingRequest`/`BookingResponse` pickup/drop-off location fields — **built, confirmed live 2026-10-04**

**Was.** The product wants a renter to say where they want the vehicle handed over and where they'll
leave it, per booking — e.g. "JKIA Terminal 1" for pickup, "Nairobi CBD" for drop-off. `POST
/bookings/create`'s `BookingRequest` previously took only `vehicleId`, `startTime`, `endTime`,
`bookingMode`, optional `tripType`, optional `renterNotes` — no location field, and `BookingResponse` had
none either (see item 13's full property list as it stood then).

**Now.** Confirmed live against `/v3/api-docs` on 2026-10-04: `BookingRequest` gained optional
`pickupLocation`/`dropoffLocation` string fields (alongside the already-confirmed `renterId` from item
10), and `BookingResponse` now returns both back. Neither is in the `required` list — both are genuinely
optional, same as `renterNotes`.

**Built on the frontend the same day.** `PickupLocationInput.jsx`/`DropoffLocationInput.jsx` (new,
`src/components/booking/`) — small self-contained widgets bound to `bookingStore`'s draft, same pattern as
`RenterNotesTextarea`/`TripTypeSelect` — render inline in `Step2_TripDetails.jsx`. The values flow through
`AddToBookingPanel.jsx`'s `addItem()` into the cart item, then through `bookingRequestFor()`
(`useBooking.js`) into the real `POST /bookings/create`/`create-batch` payload. Display: `BookingSummaryCard`
(cart/checkout), `BookingDetailPage`/`OwnerBookingDetailPage` (renter/owner detail views), and `BookingRow`'s
expanded panel (My Bookings / owner / admin tables) all show `pickupLocation`/`dropoffLocation` when set,
labeled distinctly from the existing "Pickup"/"Drop-off" rows (which are the trip's start/end *times*, a
different thing). A 255-char client-side cap (`BOOKING_LOCATION_MAX_LENGTH`, `lib/constants.js`) is a
frontend-only guess at a reasonable limit — not confirmed against any backend-side validation.

**Still not wired up.** The homepage search bar (`BookingBar.jsx`) separately collects a "Pick-up
Location"/"Return Location" before a vehicle is even chosen, encoded into `GET /vehicles`'s `location`/
`returnLocation` query params — that's a search filter, a different flow from the per-booking fields above,
and still isn't carried forward into a booking's own `pickupLocation`/`dropoffLocation` once one is created.
Worth doing as a small follow-up (pre-fill the trip-details draft from the search bar's values) if it'd be
useful, but is a separate, optional enhancement, not part of this ask.

## 28. An administrator can't look up an arbitrary booking's contract — same root cause as item 13, now blocking a real admin need

**Why.** The product wants an administrator (any `ADMIN`-role account — "super admin" in product language is
this same role; confirmed there's no separate tier, see below) to be able to open any booking and see its
contract. Today that's impossible for almost every booking: item 13 already documented that `BookingResponse`
has no `contractId` field, and the only way the frontend ever learns a contract's id is a `sessionStorage`
stash (`stashContractId`/`sessionContractId`, `src/lib/contracts.js`) written the moment `POST
/payments/bookings/{bookingId}/contract/draft` first succeeds — in that one browser tab, for that one
session. Item 13 framed this as a renter-signing problem; it's the identical gap, but it also means an
administrator opening a booking they didn't personally just draft a contract for — which is effectively
every booking, since contracts are drafted by renters during checkout — has no way to find, preview, or
download its contract at all, signed or unsigned.

(Confirmed while researching this: "super admin" has no distinct representation in this frontend — the
real backend token is `["SUPER_ADMIN", ...]`, and `src/lib/constants.js`'s `BACKEND_ROLE_ALIASES` normalizes
`SUPER_ADMIN` straight to the plain `ADMIN` role on login, the same role the whole `/admin/*` section is
already gated on. There's nothing to add permission-wise; the gap is purely the missing contract lookup.)

**Ask.** Either half of item 13's existing ask would fix this too: add `contractId` to `BookingResponse`
(simplest — every page that already loads a booking would then have it for free), or add a `GET
/bookings/{id}/contract` (or similar) lookup. Worth confirming at the same time whether an `ADMIN` token is
actually allowed to call `GET /payments/contracts/{contractId}/document` for a contract on a booking it
didn't create — this wasn't checked, since there's currently no way to reach that call with a real
contract id to test against.

**Meanwhile — partial fix shipped 2026-10-04.** `OwnerBookingDetailPage.jsx` (shared by `/admin/bookings/:id`
and `/owner/bookings/:id`) previously had **no contract section at all** — not even the same-session
fallback `BookingRow.jsx`'s expanded panel and the renter's own `BookingDetailPage.jsx` already had. It now
shows the same `sessionContractId`-based "Unsigned PDF"/"Signed PDF" links those do, so an admin or owner at
least sees a contract when one was drafted in their own current session (e.g. an admin who just stepped
through `ContractPage` themselves to check it, or a shared-device case). This does **not** deliver "see any
booking's contract" — it only ever works for the same narrow case item 13 already describes — but it closes
the gap where the admin/owner detail page showed nothing even in that one case.

## 29. The commission is charged on top of the renter's price — the product wants it deducted from the owner's payout instead

**Why.** The product owner's stated rule (2026-10-05): a renter pays exactly the vehicle's own daily rate —
not "owner's rate + platform's cut" — and the platform's commission comes out of the *owner's* earnings
instead, invisibly to the renter. Confirmed live against the real backend today, this is backed the other way
round. `POST /bookings/quote` for a real vehicle (`pricePerDay: 1.0`, 3 days):

```json
{"numberOfDays":3,"pricePerDay":1.0,"baseAmount":3.0,"platformFee":0.06,"totalAmount":3.06}
```

`GET /platform-settings/commission` is currently `2` (`commissionRatePct`), and `totalAmount` is exactly
`baseAmount + platformFee` (`3.0 + 0.06 = 3.06`) — item 26 already documented this formula when the fee
breakdown shipped, and it was built and confirmed exactly as specced at the time. The product direction has
since changed: this `totalAmount` is what every renter-facing total actually charges (`CartTotals`,
`AddToBookingPanel`, and whatever a created booking's own checkout charges via Pesapal) — so today, every
renter is actually paying 2% more than the vehicle's listed rate, the opposite of the intended model.

**Ask.** Change the formula so the renter is only ever charged the vehicle's own rate:

- `BookingQuoteResponse.totalAmount` should equal `baseAmount` (drop the `+ platformFee`), and whatever a
  created booking actually charges via Pesapal should match — so the renter's price quote, booking total, and
  the amount Pesapal actually collects are all the same number as the owner's own daily rate × days, with no
  addition.
- The commission should instead reduce what the owner receives: `BookingResponse`/`PaymentStatusResponse`
  already carry an `ownerPayout` field — confirm it's (or change it to be) `baseAmount - platformFee`, i.e.
  the owner nets 98% of their own listed rate rather than the renter paying 102% of it. (Unverified: what
  `ownerPayout` is actually set to today, relative to `baseAmount`/`platformFee`, wasn't checked — there's no
  existing booking payment this session could safely read live to confirm, and creating one just to test
  would be a real booking/charge. Worth confirming before assuming which half of this is already correct.)

**Meanwhile.** Nothing in this frontend shows a separate "platform fee" line to a renter anywhere today —
`CartTotals.jsx`, `AddToBookingPanel.jsx`, and `BookingSummaryCard.jsx` all already display only the single
combined `totalAmount`, never a fee breakdown — so there's no "unexplained charge" visible in the UI as it
stands. But the number itself is still inflated by the commission until the backend formula changes; the
frontend has no amount of its own to fall back to instead; it only ever displays what `/bookings/quote` (and
the created booking) return. `AdminPlatformSettingsPage.jsx`'s copy ("The percentage added on top of a
vehicle's own daily rate… shown to renters as the platform fee") still accurately describes today's real,
confirmed-live behavior — it should be rewritten to describe the owner-payout model once the backend formula
actually changes, not before (changing the copy first would describe a behavior the backend doesn't deliver
yet).

**Correction, re-checked same day, minutes later — the original `3.06` example above was misleading.** It
used a `pricePerDay: 1.0` test vehicle, where `platformFee` (2%) and the newly-discovered `transactionFee`
(1.5%, see item 30) happen to round to the same figure at that tiny amount, so `baseAmount + platformFee` and
`baseAmount + transactionFee` were indistinguishable. Re-checked with amounts where they're not equal:

```json
{"baseAmount":2.0,"platformFee":0.04,"transactionFee":0.03,"totalAmount":2.03}
{"baseAmount":15000.0,"platformFee":300.00,"transactionFee":225.00,"totalAmount":15225.00}
```

`totalAmount` is `baseAmount + transactionFee` — **not** `+ platformFee`. `platformFee` (the 2% commission)
is computed and returned in the response but, right now, doesn't appear to be added to the renter's total at
all. This is a meaningfully different, and more encouraging, situation than originally reported: the renter is
still being charged more than the vehicle's own rate, but apparently because of Pesapal's own real processing
fee (arguably a legitimate pass-through cost, not the platform's margin), not the platform's commission. It's
possible the backend is already mid-fix on exactly this ask — commission no longer added to the renter's
charge — and what's left is confirming `ownerPayout` nets out to `baseAmount - platformFee` under this new
formula. That couldn't be confirmed here: every real successful payment on this test account predates this
change (their `platformFee`/`transactionFee` numbers don't match a fresh quote's formula at all — see item
30), and creating a fresh booking just to find out would be a real booking/charge, not something to do without
being asked. Whoever picks this up should create one real test booking under the current formula and check its
`PaymentStatusResponse.ownerPayout` against `baseAmount - platformFee` before deciding whether this item is
actually resolved.

**Confirmed live by a real renter, 2026-10-06 — the receipt was showing the wrong amount.** A renter reported
paying more than their receipt said ("we paid 3 bob but on receipt it's 2"). This is exactly what the
`amount`-vs-`totalAmount` confusion above predicts: `PaymentStatusResponse.amount` looks to be the bare
`baseAmount`, not `baseAmount + transactionFee` (what Pesapal actually collects) — so `Receipt.jsx`'s "Amount
Paid", which read `receipt.amount` directly, was quietly understating what was really charged. **Fixed on
the frontend**: `Receipt.jsx` now shows `booking.estimatedAmount` (the same total already trusted and quoted
to the renter before they ever paid — see `BookingRow`/`BookingDetailPage`'s own `total` calc) first, falling
back to `receipt.amount` only if that's missing. This is a frontend workaround, not a backend fix — whoever
picks up the rest of this item should still confirm (and correct, if `amount` really is just `baseAmount`)
what `PaymentStatusResponse.amount` is supposed to represent, since a receipt field literally reporting the
wrong number is worse than just an inflated renter-facing total.

## 30. `BookingResponse.ownerPayout` is always `null`, even on a paid Completed booking — confirmed live; report endpoints take no filter params

**Why.** The product owner asked for renter receipts (issued at payment, downloadable/previewable, and a
Receipt column on every bookings table) and owner statements with filters (2026-10-05). Built against the live
spec, then checked against real data once the backend came back up mid-session — two real findings:

- **`BookingResponse.ownerPayout` is `null` on every booking `GET /bookings/mine` returns**, Completed ones
  included (checked 5 real bookings on `washioyafelix@gmail.com`, three of them Confirmed/Active/Completed with
  a genuine successful payment behind them — all `null`). This matters because `lib/reports.js`'s new
  `filterReport` needs a per-booking payout figure to recompute the Owner Reports page's "Your Payout" once
  filters narrow the list (the backend's own unfiltered report total isn't broken down per booking to filter
  it, since the report endpoints take no params at all — see below). Fixed the same day: `filterReport` now
  falls back to `estimatedAmount - platformFee` per booking when `ownerPayout` isn't a number
  (`bookingOwnerPayout` in `lib/reports.js`) — an approximation, not exact, per the next finding.
- **The same booking's `PaymentStatusResponse` (`GET /payments/pesapal/bookings/{id}/status`) *does* carry a
  real, populated `ownerPayout`** — but it isn't always `amount - platformFee` cleanly, and the real numbers
  disagree with each other in ways that don't look intentional:
  - Two Completed bookings for the same renter, same vehicle family, same $1 rate: `amount: 1.0, platformFee:
    0.01, ownerPayout: 0.99` — note `platformFee` here is **0.01**, half of the `0.02` (2%) the booking's own
    `BookingResponse.platformFee` field and `/platform-settings/commission` both say. `amount` also doesn't
    include that fee at all (`1.0`, not `1.02`), unlike the pattern below.
  - Two other bookings (different vehicles, same renter): `amount: 2.04, platformFee: 0.04, transactionFee:
    0.0, ownerPayout: 2.0` — here `amount` *is* `baseAmount + platformFee` (item 29's pattern) and
    `ownerPayout` correctly nets back to the base rate.
  - One booking: `amount: 1.015, platformFee: 0.02, transactionFee: 0.015, ownerPayout: 0.98` — a nonzero
    `transactionFee` (not present on `BookingResponse` at all, and not shown on the frontend receipt, per the
    rule behind item 29) appears here and nowhere else, and it comes out of the owner's payout alongside the
    platform fee, leaving the owner with *less* than their own base rate (`0.98` on a `1.0` rate) — the renter
    also didn't pay the `1.02` the quote and booking record both implied, but something in between.
  - `PaymentStatusResponse.receipt` **is confirmed** on all of these — a short alphanumeric code (e.g.
    `UJ3N08KRL1`, `UJ2N08IRTA`, `UJ4N08PMSE`), not a URL. `Receipt.jsx`'s defensive handling (link only if it
    looks like one, otherwise plain text) already does the right thing with this; no frontend change needed.

**Ask.** This reads like more than one bug, not one: (1) populate `BookingResponse.ownerPayout` so the
frontend doesn't have to approximate it; (2) explain why `platformFee` differs between a booking's own record
and its payment's record for the same booking, and why `transactionFee` appears on some payments and not
others — if it's a real Pesapal processing cost, it's being deducted inconsistently and from the wrong party
on at least one booking above (the owner, not absorbed by the platform or added to what the renter pays); (3)
this is on top of item 29's own ask (commission added to the renter's charge rather than deducted from the
owner's payout) — these may turn out to share a root cause once someone with backend access looks at the
actual commission/payout calculation code, but from here they look like at least two separate defects.

**Update, same session, minutes later:** `GET /platform-settings/commission` now also returns
`pesapalTransactionFeeRatePct: 1.5` (it only had `commissionRatePct: 2.0` earlier today) — confirming
`transactionFee` is a deliberately configured, separate rate, not a Pesapal pass-through fluke. `POST
/bookings/quote` now echoes a `transactionFee` too (previously it only had `baseAmount`/`platformFee`/
`totalAmount`).

**Checked again, same session, a bit later still — corrects the line just above.** `totalAmount` *does*
include `transactionFee`, not `platformFee` — confirmed unambiguously with amounts where the two fees don't
round to the same figure (see item 29's own correction, which has the worked numbers). The `0.01`/`0.02`
"half the expected platformFee" oddity in the real payments above now also has a likely innocent explanation
for small amounts specifically: `1.5%` of a `$1` base is `0.015`, which rounds to `0.02` at 2dp — so a
`platformFee`/`transactionFee` pair that look unequal at `$1` may just be two different rates rounding
differently at a tiny, unrealistic test price, not a real inconsistency. It doesn't explain the `2.04`/`2.0`
pair further down this item, though (`0.04` and `0.03` round cleanly from `2%`/`1.5%` of `2.0` with no
ambiguity) — but that pair is a real, already-completed payment, and `transactionFee` is a brand new field
(absent from `BookingResponse` entirely, and from `/bookings/quote` until earlier in this same session), so it
most likely just predates `transactionFee` existing server-side at all, rather than being a live
inconsistency. Whoever's iterating on this backend-side is actively mid-change right now — this item may be
stale again by the time it's read; re-confirm the real numbers rather than trusting any of this verbatim.

Separately — `GET /bookings/reports/{mine|owner|admin}` take no query parameters at all (confirmed against the
live spec 2026-10-05): no date range, no vehicle id, nothing. The owner statements filters just added
(`OwnerReportsPage.jsx`'s filter bar, `filterReport`) work entirely client-side over whatever the endpoint
already returns in full. That's fine at today's scale, but doesn't scale indefinitely — a `from`/`to`/
`vehicleId` on these endpoints (or pagination) would be a reasonable ask once a fleet's booking history grows
large enough that returning everything, every time, on a page that loads automatically, becomes the slow part.

**Meanwhile.** The receipt itself is generated entirely client-side (`Receipt.jsx`, rendered in a modal, with
a "Print / Save as PDF" button — `window.print()`, the same technique `ReportTable`'s own Print button already
uses, since this project has no PDF-generation library) rather than depending on `receipt` being a real
document — confirmed above to be a short code, not a document, so this was the right call. It deliberately
never shows `platformFee`/`transactionFee`, only the total `amount` paid, per the rule behind item 29 — which,
given the `transactionFee` finding above, is now also quietly doing the renter a favor: that fee isn't
reliably reflected in what they were told they'd pay either. The Owner Reports page's "Your Payout" figure is
therefore an approximation whenever filters are active, and may not exactly match the unfiltered report's own
total even before any filter narrows it, given the real inconsistencies found above. The Owner Reports page's
filters (`BookingStatusTabs` + `BookingFilters`, the same ones every other bookings table already has)
now also govern the Revenue tab's summary cards and chart, not just the Bookings tab's table — both tabs share
one filter state via the URL (`useBookingFilters`), so switching tabs keeps the same filter active without
anything being passed between them.

## 31. No field to record that someone accepted the Terms of Service/Privacy Policy — confirmed against the live spec 2026-10-05

**Why.** `RegisterPage`/`RegisterModal` now both require a checked "I agree to the Terms of Service and
Privacy Policy" box before the form will submit at all — real `/terms` and `/privacy` pages now exist too
(the footer already linked to both, but neither route existed until now). `RegisterRequest` has no field for
this, confirmed against the live OpenAPI spec, so the checkbox is enforced entirely client-side: the backend
has no record that a given account ever agreed to anything, or when.

**Ask.** A `termsAcceptedAt` (or similar) field on `RegisterRequest`/the user record, set once at
registration, would make this a real, server-held fact rather than something only the frontend ever knew
happened. Worth doing before the Terms of Service page itself is treated as final and legally relied on —
right now there is no durable record a given renter or owner ever actually agreed to it.

**Also worth noting:** the `TermsPage`/`PrivacyPage` content, and the fixed "Ramellian Platform Terms" clause
every rental contract now starts with (`lib/contractBoilerplate.js`, prepended to a template's `content`
before it's saved — `ContractTemplateRequest` has no separate field for it either), were written by the
product team to describe how the app actually behaves. None of it has been reviewed by a lawyer yet — treat
it as a draft, not as final legal wording, until it has been.

## 32. New in-app bot — built against the live spec 2026-10-06, no conversation history endpoint

**Why.** The user reported the backend had added "WhatsApp booking"; the live spec (re-fetched after an
earlier attempt timed out — the backend was briefly unreachable from this environment) shows a new `Bot` tag
with three endpoints: `POST /bot/inapp` (JWT-authenticated, `InAppBotRequest { message }` →
`InAppBotResponse { text, media: BotMedia[] }`, `BotMedia { type, url, caption, filePath, fileName }`),
`POST /bot/whatsapp/inbound` ("Receive inbound WhatsApp message from Baileys and reply" — a webhook the
WhatsApp provider calls, not something a frontend ever calls), and the pre-existing
`/auth/send-whatsapp-code`/`/auth/verify-whatsapp` pair (already wired up in `useAuth.js`, unrelated to the Bot
tag, just a verification-code channel).

**Built.** `/bot/inapp` now has a real frontend: `hooks/useBot.js`'s `useSendBotMessage`, a chat UI
(`components/chat/AssistantThread.jsx`) modeled on the existing human-to-human `ChatThread.jsx`, and a new
page at `/assistant` in every role's menu.

**Open question — no endpoint to list a past bot conversation.** Nothing in the spec answers "what did the
bot and I talk about before" — only the one-shot send-a-message/get-a-reply endpoint. So `AssistantThread`
keeps the transcript in its own component state only; it's gone the moment the page reloads. If a stored,
resumable bot conversation (the same way `ChatThread`'s human conversations persist via `GET` endpoints) is
wanted, that needs a new backend endpoint — there's nothing to build against yet.

## 33. No way to attach a photo to a vehicle handover — confirmed against the live spec 2026-10-06

**Why.** Asked to let a renter upload photos alongside a pickup/return entry (real evidence of the vehicle's
condition, next to the odometer/fuel/condition-notes/signature already captured). Re-checked both
`POST /handovers/bookings/{bookingId}/pickup` and `.../dropoff` against the live spec: the `multipart/form-data`
body still has exactly one field, `signature` (binary, required) — unchanged since item 22. There's no
`photos`/`images` field, no array of files, nothing. The only other upload endpoints anywhere in the spec are
`POST /vehicles/{id}/photos` and its `DELETE`, which attach to a *vehicle's own listing*, not a booking or a
handover — reusing that endpoint for a handover photo would make it show up as one of that vehicle's listing
photos to every future renter browsing it, which is wrong, not just a workaround.

**Ask.** Add a repeatable `photos` (or similar) part to both handover endpoints' multipart body, and the
matching array to `HandoverResponse`, so a photo taken at pickup or return becomes part of that specific
handover record — the same way `signature` already is — rather than attached to the vehicle in general.
The user's own stated priority for this is a dashboard photo backing up the typed `odometerReading`/
`fuelLevel` fields — real evidence of the mileage and fuel level claimed, not just general vehicle condition.

**Until then:** not built. Uploading a condition photo at handover isn't possible without one of the above;
there's no field to send it to, and no endpoint scoped to the booking/handover rather than the vehicle.

**Update 2026-10-07 — now a hard requirement, still missing.** The product now says a pickup **must** include a
dashboard photo showing the mileage and fuel level; it can't be recorded without one. Re-checked the live spec
(`http://192.168.8.9:8080/v3/api-docs`): both handover endpoints still take only `signature`, and
`HandoverResponse` has no photo field. Please add, on `POST /handovers/bookings/{bookingId}/pickup` (and
`.../dropoff` the same way):
- a **required** `dashboardPhoto` file part (image), refused with a 400 when missing on pickup;
- optionally a repeatable `photos` part for general condition photos;
- `dashboardPhotoUrl` (and `photoUrls: string[]`) on `HandoverResponse`, so the owner and an admin can see it
  in the handover history.

The frontend will then require the photo in `VehicleHandoverForm` (camera capture on a phone, as the guided
vehicle photos already do) and show it in `HandoverHistory`.

## 34. `BookingResponse` gained a `warnings` field — checkout no longer has to block on unapproved documents — confirmed against the live spec 2026-10-06

**Why.** The user asked to simplify checkout: instead of refusing to create a booking until a renter's ID/
licence is approved (item 11's `missingBookingDocuments` gate, enforced client-side before this), let checkout
go straight through and deal with documents afterwards. Re-fetched the live spec to check whether the backend
itself still refuses an unapproved-document booking — it no longer does. `BookingResponse` (and each item
inside `BookingGroupResponse.bookings`) now has a `warnings: string[]` field, returned alongside a normal `201`
on `POST /bookings/create` and `/bookings/create-batch`, instead of the old hard refusal.

**Built.** `useStartNextBooking` (`hooks/useBooking.js`) reads `warnings` off the created booking (deduplicated
with `[...new Set(...)]` across a batch's bookings) and forwards it through navigation state to
`/book/:vehicleId/contract`. `BookingCheckoutPage` no longer blocks `handleContinue` on
`missingBookingDocuments` — it shows a non-blocking amber notice with an **Upload now** shortcut
(`DocumentGateModal`, repurposed from a hard gate to an optional helper) instead, and only opens that same
modal as a true fallback if the backend ever does refuse with 422/403. `ContractPage` shows a new
`BookingWarningsModal` ("Before You Pick Up") once per booking when `warnings` is non-empty, offering
**Upload Documents Now** (straight to `/dashboard/documents`) or **I'll Do It Later**.

**Note.** This is an advisory, not an enforcement mechanism — nothing on the frontend currently re-checks
document approval at pickup (`canRecordPickup` in `lib/utils.js` only gates on the trip's own start date). If
the product wants pickup itself blocked on unapproved documents, that still needs to be asked for and built
separately; today a renter who never uploads anything is only ever reminded, never stopped.

## 35. `GET /vehicles` has no real "recommended" order — confirmed live 2026-10-08

**Why.** Browse Vehicles defaults to **Recommended**, and the portal sends `sort=recommended`. Tested live
(`http://192.168.8.9:8080`): the result comes back in internal-id (UUID) order — identical with or without
`sort` — so the first cars every visitor sees are effectively random. The other sort values do work
(`capacity_desc` sorted 8 → 7 → 5 → 4 seats correctly; the price sorts couldn't be judged, every live vehicle
was priced at 1).

**Ask.** Make `sort=recommended` (and no `sort`) a real order, server-side so it holds across pages:
1. not booked for the requested `startTime`/`endTime` before booked;
2. higher average rating first (unrated treated as the portal's starting rating, 5);
3. listings with at least one photo before those without;
4. then newest listing first.

**Until then.** The portal orders the list itself when Recommended is chosen (`lib/vehicleRanking.js`'s
`recommendedOrder`, applied in `useVehicleAvailability`) using points 1–3, falling back to the backend's order.
That only works because `GET /vehicles` returns the whole list; if it ever paginates, the order must come from here.

**Update 2026-10-09 — newest listings.** The product now wants a **Newest** sort, a "Just added" row and a "New"
badge. `VehicleResponse` has no created date, and `GET /vehicles?sort=newest` is refused with a 400 ("sort must
be recommended, price_asc, price_desc, rating_desc, or capacity_desc"). Please add:
- `createdAt` on `VehicleResponse`;
- `sort=newest` (newest `createdAt` first), and use `createdAt` as the last tie-break in `recommended`.

Until then the portal uses `reviewedAt` (when an admin approved the vehicle — only approved ones are public) as
"listed at", sorts Newest itself and never sends `sort=newest` (`lib/vehicleRanking.js`).

## 36. `VehicleResponse` has no photos — nobody but the uploader ever sees a vehicle's pictures — confirmed live 2026-10-09

**Why.** `POST /vehicles/{id}/photos` accepts uploads, but nothing returns them: `VehicleResponse` (on
`GET /vehicles` and `GET /vehicles/{id}`) has no `photos` field, and there's no `GET` for a vehicle's photos. The
portal shows pictures only because the browser that uploaded them keeps its own copy (`getCachedPhotos` in
`lib/vehiclePhotos.js`). Every other visitor — and the owner on another device — sees the generic outline for
every car, so Browse Vehicles, the home page rows and each vehicle page look identical car to car. Photo files
also answer 403 without a login, so even with URLs a signed-out visitor couldn't load them.

**Ask.**
1. Add `photos: [{ id, url, angle }]` to `VehicleResponse`, in upload order (`angle` is the guided-photo angle the
   portal already sends with each upload).
2. Serve the files of an **approved, listed** vehicle's photos without a login, so visitors can see them
   (keep unapproved vehicles' photos private).

**Until then.** Nothing the frontend can do: there's no list to read. `AuthImage` already loads a public URL
directly when signed out, and `normalizeVehicle` already prefers `photos` from the server over the local copy,
so both start working as soon as the field exists.

## 37. Contracts don't fill in any booking details — please replace `{{fields}}` in the template when drafting — confirmed live 2026-10-09

**Why.** Tested live: drafting a contract (`POST /payments/bookings/{bookingId}/contract/draft`) returns
`contractText` that is the owner's template word for word, and the PDF
(`GET /payments/contracts/{contractId}/document`) is that same text and nothing else. The renter's name and ID
number, the owner, the vehicle, the dates and the amounts appear nowhere in the contract the renter signs, so
the signed document doesn't identify who agreed to what. The product wants these filled in automatically.

**Ask.** When drafting a contract, replace each `{{field}}` in the template with the booking's value (leave a
blank line, `__________`, when there's none — never the raw `{{…}}`). A ready template using them is in
`docs/contract-templates/vehicle-rental-agreement.md`.

| Field | Value |
|---|---|
| `booking_reference` | booking id (or a short reference) |
| `agreement_date` | date the contract is drafted |
| `owner_full_name` | owner's first, middle, last name |
| `owner_business_name`, `owner_business_registration_number`, `owner_tax_number` | owner profile (`businessName`, `businessRegistrationNumber`, `businessTaxNumber`) |
| `owner_location` | owner's `location` |
| `renter_full_name` | renter's first, middle, last name |
| `renter_id_number` | renter's `idNumber` |
| `renter_location` | renter profile |
| `renter_driving_licence_number` | **not stored anywhere yet** — needs a licence-number field on the profile or document |
| `vehicle_model`, `vehicle_registration`, `vehicle_colour`, `vehicle_seats`, `vehicle_fuel_type`, `vehicle_transmission` | the vehicle |
| `vehicle_vin` | vehicle `vin` |
| `vehicle_air_conditioning` | vehicle `hasWorkingAC`, as "Yes"/"No" |
| `vehicle_location`, `vehicle_id` | vehicle `location`, `id` |
| `vehicle_year`, `insurer_name`, `insurance_policy_number`, `insurance_expiry_date` | **not stored yet** — please add to the vehicle (the owner enters them when listing; they're also what an insurance claim needs) |
| `booking_reference`, `booking_created_date_time` | booking `id` (or a short reference), and when it was created — `BookingResponse` has no created time yet |
| `booking_mode`, `trip_type` | booking (`bookingMode`, `tripType`), as words ("Chauffeured", "Wedding") |
| `start_date_time`, `end_date_time`, `pickup_location`, `dropoff_location`, `number_of_days` | booking |
| `trip_destination`, `passenger_count` | **not stored yet** — please add to `BookingRequest` (the booking form will ask for them) |
| `delivery_requested`, `delivery_fee` | booking `deliveryRequested` ("Yes"/"No"), `deliveryFee` |
| `renter_notes`, `dispatcher_notes` | booking `renterNotes`, `dispatcherNotes` |
| `group_booking_reference` | the booking group, when several vehicles were booked together |
| `chauffeur_name` | assigned chauffeur, if any |
| `daily_rate`, `rental_amount`, `total_amount` | vehicle `pricePerDay`, booking `baseAmount`, `estimatedAmount` — formatted "KES 12,000" |
| `free_cancellation_hours`, `cancellation_deadline_hours`, `late_cancellation_refund_percent`, `postponement_terms` | the booking's effective policy (`GET /booking-policies/bookings/{id}/effective`) **as it stood when the contract was drafted** — so a later policy change doesn't rewrite what was agreed. `postponement_terms` e.g. "Allowed up to 24 hours before pick-up, at most 2 times" or "Not allowed" |

**Also — keep the history with the contract.** Section 15 of the template says the pick-up and return handover
records, the payment record, and any extension, postponement, overstay, cancellation or refund form part of the
agreement. Please attach them to the contract as they happen (e.g. as schedules appended to the signed PDF, or
linked from `ContractResponse`), so the signed document plus its schedules is the booking's full history on its
own — including after a vehicle, profile or policy is later edited or deleted. The values filled into the
contract must be a snapshot taken at drafting, not re-read later.

Deliberately **no** phone number or email for either party: the owner sees the contract, and the product rule
is that renter contact details are never shown to owners and phone numbers are never exchanged through the portal.

**Until then.** Since 2026-10-09 the portal fills these fields in **on screen** for the renter reviewing and
signing (`lib/contractFields.js`), so they never see a raw `{{…}}` — but the stored contract and the signed PDF
are still the template's raw text, so the signed document still says `{{renter_full_name}}`. That gap is why this
needs doing server-side before the template goes live.

## 38. Identity selfies and a trusted ID number — a separate selfie document type, and reading the number server-side — requested 2026-10-12

**Why.** The product now asks everyone for a selfie holding their identity document (two for a National ID:
holding the front and the back; one for a Passport: holding the photo page), so an administrator can check the
document belongs to the person uploading it. It also wants the ID / passport number taken from the document,
not typed. `POST /documents` only accepts its fixed `documentType` values (anything else is refused with 400
"Invalid document type"), so the portal currently stacks the document photos and the selfies into **one image**
uploaded as `NATIONAL_ID` / `PASSPORT`. The number is read in the browser (Tesseract) and saved with
`PATCH /users/me` (`idNumber`). A browser-side check can be bypassed by someone calling the API directly.

**Ask.**
1. Accept a new `documentType`, e.g. `SELFIE_WITH_ID`, reviewed like any other document, so a reviewer can
   reject just the selfie. The portal will then upload the selfies on their own.
2. Read the ID / passport number from the uploaded `NATIONAL_ID` / `PASSPORT` image on the server and
   store it as the user's `idNumber`, or at least refuse a `PATCH /users/me` `idNumber` that differs from it, so
   the number can't be changed through the API.


## 39. `GET /vehicles/{id}?startTime&endTime` ignores the dates — says `booked: true` for any window — confirmed live 2026-10-13

**Why.** On the local backend (192.168.8.9:8090), the Mercedes AMG (`385988d3-534c-4794-b9c6-a32857d33556`) has
one booking around 14–15 Oct 2026. `GET /vehicles?startTime=…&endTime=…` answers correctly for each window
(`booked: true` for 14–15 Oct, `false` for 20–21 Oct, March 2027 and January 2030). But
`GET /vehicles/{id}?startTime=…&endTime=…` returns `booked: true` for every one of those windows: it ignores
`startTime`/`endTime` and reports whether the vehicle has a booking anywhere. The vehicle page used this to say
"already booked for those dates", so a renter couldn't book the car on any date.

**Frontend workaround (in place).** The vehicle page now reads `booked` from the dated list and finds the vehicle
in it (`useVehicleWindowBooked`, `src/hooks/useVehicles.js`). That fetches every vehicle to check one.

**Ask.** Make `GET /vehicles/{id}` honour `startTime`/`endTime` the same way the list does, so `booked` means
"booked in this window" when a window is given.

## 40. Only the renter can sign a contract — the owner needs to sign too, each signature dated — requested 2026-10-16

**Why.** The product requires **both** the renter and the owner to sign every rental contract, with the date each
signed. The contract page now shows a signature section with a place for each (`ContractDocument`). But the
backend has only one signature: `POST /payments/contracts/{contractId}/sign` (the renter's signature image) and one
`ContractResponse.signedAt`. There's no way for an owner to sign, and nothing says who `signedAt` belongs to, so the
owner's place always shows "Awaiting signature".

**Ask.**
1. Let the vehicle's owner (or their fleet manager) sign the same contract, e.g.
   `POST /payments/contracts/{contractId}/owner-sign` with the same multipart `signature`, allowed only for the
   booking's owner.
2. Add `renterSignedAt` and `ownerSignedAt` to `ContractResponse` (keep `signedAt` = the renter's, for now), plus
   the owner's display name (`ownerName`), so the contract can show who signed and when.
3. Mark the contract fully signed (and the signed PDF final) only once both have signed, and put both signatures
   with their dates on the signed PDF (`GET /payments/contracts/{contractId}/document?signed=true`).
4. Optionally, a list for owners of contracts waiting for their signature (e.g. on `GET /bookings/owner` rows),
   so the owner side can offer a **Sign contract** button.

## 41. A renter's reviews can't be looked up from a booking — `BookingResponse` has no renter id — found 2026-10-16

**Why.** `GET /reviews/renters/{renterId}` (new) lists what owners have said about a renter, which is useful to an
owner deciding on a booking. But the owner's view of a booking (`BookingResponse`) carries only `renterEmail` /
`renterName`, no renter id, so the portal can't call it. Owners can rate renters (`POST /reviews/bookings/{id}/renter`,
now on the owner's booking page once it's Completed), but can't see a renter's history.

**Ask.** Add `renterId` to `BookingResponse`, or accept the booking id: `GET /reviews/bookings/{bookingId}/renter-history`.
The portal will show the renter's average rating and recent reviews on the owner's booking page.

## 42. Phone verification by SMS (Firebase) — portal side built, switched off; endpoint not on the VPS yet — 2026-10-16

The backend team described `POST /auth/verify-firebase-phone { firebaseIdToken, email? }`, which sets `phoneNumber`
and `phoneVerified`. The portal side is built (Profile → phone → **Verify by SMS**, `usePhoneVerification`), switched
off with `VITE_ENABLE_PHONE_VERIFICATION=false` as the product owner asked. To switch it on later: deploy the endpoint
to the VPS (it's not in the live spec yet), add `phoneVerified` to `UserResponse`, then set the four `VITE_FIREBASE_*`
values and `VITE_ENABLE_PHONE_VERIFICATION=true`.

## 40 (update, 2026-10-16). Owner signing and saved signatures — built (local backend 192.168.8.31), wired in the portal

Built by the backend and consumed: saved signatures (`GET`/`POST`/`DELETE /profile/signature`,
`GET /profile/signature/image`), renter signing with `useSavedSignature` / `saveAsProfile`, owner signing
(`POST /payments/contracts/{id}/owner-sign`), and `renterSignedAt`/`renterSignedBy`/`ownerSignedAt`/`ownerSignedBy`/
`fullySignedDocumentAvailable` on `ContractResponse` (`signedAt` was removed — the portal falls back to it for an
older server). Checked live: save → read → image → delete of a saved signature works.

**Still blocking owner signing in practice: item 13.** An owner can only open a booking's contract when the portal
knows its id, and `BookingResponse` still has no `contractId` (nor is there `GET /payments/bookings/{bookingId}/contract`).
The owner's booking page has the **Read & sign** step ready, but it only appears when that id is known (today, only in
the browser session that drafted the contract — i.e. never for the owner). **Ask:** add `contractId` to
`BookingResponse` (or that GET), allowed for the booking's owner.

**Also:** deploy all of this to the VPS (`102.68.87.231`) — it's still on the old backend. And `UserResponse` has no
`phoneVerified` yet (item 42).

**Owner's "please sign" notification (2026-10-16).** The backend sends the owner a notification to accept / sign. The
portal now opens a notification whose `referenceType` contains `CONTRACT` at `/contracts/{referenceId}/sign`, which
loads the contract, finds its booking, remembers the pair and shows the owner's **Read & sign** (and **Sign Contract**
as the notification's button). **Please make sure** that notification has `referenceType: "CONTRACT"` and
`referenceId` = the **contract id** — if it carries the booking id instead, the owner still can't reach the contract
(item 13). Not checked live: the test account isn't an owner.

## 43. `POST /auth/login` refuses a log-in without `rememberMe` — found 2026-10-17 (local backend 192.168.8.31)

Every log-in without `rememberMe` (even for an unknown email) answers 400 "The request format or parameter values
are invalid", although `LoginRequest` marks it optional. The portal now always sends it (the "Remember me" box), so
log-in works — but other clients (mobile, scripts) will break. **Ask:** treat a missing `rememberMe` as `false`
(e.g. `Boolean`, not `boolean`, or a default). The VPS (old backend) ignores the field, so the portal works on both.

## 44. Trip origin and destination on a booking — required by the product, no fields yet — 2026-10-17

The product now requires every booking to say where the trip starts and where it's going, and both are part of the
contract. `BookingRequest`/`BookingResponse` have only `pickupLocation`/`dropoffLocation` (where the car is collected
and returned — not the same thing). **Portal today:** asks for both (**Travelling from / Travelling to**, required),
sends them as `tripOrigin` / `tripDestination` (ignored for now), and also writes them first in the notes —
"Trip: from Nairobi to Diani Beach." — which the contract reads them from. **Ask:** add `tripOrigin` and
`tripDestination` (required, ≤255) to `BookingRequest`, `BookingResponse` and the batch request; the portal will
then stop writing them into the notes.

## 31 (update, 2026-10-17). Terms acceptance — now required by the product at booking and listing, still not recorded

Renters must tick "I have read and accept the Terms of Service and the rental terms" at checkout, and owners "… the
terms for owners" before listing a car (on top of the sign-up box). It's enforced in the portal only — the backend
still has nowhere to record it. **Ask:** record `termsAcceptedAt` (and which terms — e.g. the rental-term ids/version)
on the user at sign-up, on each booking (`BookingRequest.termsAccepted`), and on each vehicle (`VehicleRequest.ownerTermsAccepted`).
The Terms / Privacy pages are no longer marked as drafts (product owner's decision).
