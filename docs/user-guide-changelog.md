# User Guide Changelog

Tracks changes to [user-guide.md](./user-guide.md). One entry per update, newest
first.

## 2026-10-20 (phone and tablet layout)

- **Changed:** on a phone, bookings (My Bookings, Fleet Bookings, All Bookings) and the admin Users, All Vehicles and
  Audit Log lists show each row as a labelled card instead of a squeezed table.
- **Changed:** the phone menu strip fades at its edge when there's more to swipe to, and opens scrolled to the
  current page.
- **Changed:** on the narrowest phones (under 360px wide) the top bar shows only the logo mark, so its icons fit.
- **Changed:** the booking form's side-by-side fields (Booking Mode / Getting the vehicle, Travelling from / to,
  Pickup / Drop-off Location) stack on a phone; a vehicle's photo and details sit side by side only on wide screens.
- **Fixed:** pages with a table (bookings, Users, All Vehicles, Reports) were wider than a phone screen, so the page
  zoomed out and the WhatsApp button sat off screen. Tab rows too long for the screen now scroll inside themselves.
- **Fixed:** status badges, prices and long email addresses no longer break out of their boxes or split oddly on a
  phone; booking pages put the status badge above the vehicle name there.

## 2026-10-17 (trip route required; terms must be accepted)

- **Added:** **Travelling from** and **Travelling to** on the booking form. Both are required, show on Your Booking,
  and are part of the contract (on its letterhead, whatever the owner's template says, and in its trip details).
  Bookings already in a basket without them must be edited before checkout.
- **Added:** renters must tick **I have read and accept the Terms of Service and the rental terms** before
  **Continue to contract**; owners must tick **… the terms for owners** before **Add Vehicle**. **Read them** opens
  the terms that apply to them.
- **Changed (admins):** each rental term says **Who it applies to**: Everyone, Renters (accepted at checkout) or Owners
  (accepted when listing a car). Admins add, edit, delete and switch them on or off under **Rental Terms**.
- **Changed:** the Terms of Service and Privacy Policy are no longer marked as drafts.

## 2026-10-16 (log-in and sign-up: remember me, show password, password rules)

- **Added:** **Remember me on this device** on the log-in and sign-up forms. Ticked, you stay signed in after closing
  the browser (until the sign-in expires or you log out); unticked, it ends when the browser closes. The choice is
  sent to the backend with the log-in (`rememberMe`).
- **Added:** an eye button on every password field to show or hide what you typed.
- **Changed:** a new password (sign-up, change password) needs at least 8 characters with a letter, a number and a
  symbol. A checklist under the field ticks off each rule as you type.
- **Changed:** **Create an account** on the log-in page and panel is now a full-width button.
- **Fixed:** logging in against the newer backend failed with "The request format or parameter values are invalid":
  it refuses a log-in without `rememberMe`, which is now always sent.

## 2026-10-16 (signing from the owner's notification)

- **Added:** the owner's "please sign the contract" notification has a **Sign Contract** button. It opens the
  contract, with the renter and dates, and **Read & sign**. The booking's own page then offers signing too. A renter
  opening it is taken to their own signing page.

## 2026-10-16 (saved signature, owner signing, owner payouts)

- **Added:** **My signature** on Profile: draw or upload your signature once, agreeing it can be used to sign your
  rental contracts. Replace or remove it any time.
- **Changed:** signing a contract offers **Sign with my saved signature** (one click, still your own action on each
  contract), or **Draw a new one**. A renter without a saved one can tick **Save this signature for my next
  contracts**.
- **Added (owners):** the owner's booking page shows who has signed the contract and when, with **Read & sign** to
  sign as the owner (drawn or saved signature). It appears only once the portal can find the booking's contract
  (`docs/backend-requests.md` item 13 / 40).
- **Changed:** the contract's Signatures section shows each party's own signing date and name.
- **Added (admins):** **Owner Payouts**: what each owner is owed per paid booking (To pay / Paid / Failed), with
  **Mark paid** (with the payment reference) and **Failed** (with a reason).

## 2026-10-16 (pages centred again)

- **Changed back:** pages beside the left menu are centred again, as before (the earlier change that started them
  right next to the menu is undone). The menu still stays in place while the page scrolls.

## 2026-10-16 (payment page tidied)

- **Changed:** the payment page is a compact, centred column: the booking ("Total Paid" once paid) on top, the
  payment and **Continue to Sign Contract** in a matching card underneath, over the same Nairobi skyline as
  checkout, so the booking steps look like one journey. **Booking Confirmed** shows a coastal lodge, for the trip
  ahead, and is centred too.

## 2026-10-16 (new backend features in the portal)

- **Added (owners):** **Booking Policy** (Owner Panel): your own cancellation and date-moving rules (free-cancellation
  window, last cancellation, late refund %, whether and how often renters can move their dates), with a plain-words
  summary of what renters get. Until you save one, your bookings follow the platform's standard policy.
- **Added (owners):** **Statements**: what your vehicles earned (gross, commission and payment fees taken out, your
  payout) by month, by vehicle and per paid booking with its receipt number; filter by vehicle and dates; printable.
- **Added (owners):** **Rate the renter** on a Completed booking's page.
- **Added (renters):** **Move dates** next to **Cancel booking**, checked against the owner's policy first.
- **Added (renters):** **Pay overstay** when a car was returned late and an overstay charge is due.
- **Added (renters):** the official receipt as a PDF (the file icon next to **Receipt**).
- **Fixed:** reviews now send whether you were satisfied (**Yes / No**, set from the stars), which the backend
  requires.
- **Added (admins):** **Rental Terms**: add, edit, delete and switch on/off the platform's rental terms, grouped by
  category. Renters see the switched-on ones on the Terms page and from **Read the rental terms** at checkout.
- **Added (admins):** **Standard booking policy** in Platform Settings; **Add a renter** on Users (shows the
  temporary password once); **Upload a document for this user** on a user's page.
- **Added:** vehicles can have a **year**, **insurer** and **policy number**, and a booking can say how many
  **passengers**. All four now appear on the contract.
- **Changed:** the payment page is wider, with the booking and the payment side by side, and says "Your payment went
  through" once paid. Pages no longer shift sideways.
- **Built, switched off:** verifying your phone number by SMS code (Google Firebase), waiting on the backend.

## 2026-10-16 (phone numbers are checked)

- **Changed:** phone numbers are checked wherever they're typed (sign-up, profile, checkout). Kenyan numbers can be
  written any usual way (`0712 345 678`, `712345678`, `+254 712 345 678`) and are saved as `+254712345678`; other
  countries' numbers need `+` and the country code. Anything else gets "Enter a valid phone number, e.g. 0712 345
  678 or +254 712 345 678." (`lib/phone`).

## 2026-10-16 (contract read in parts; confirm, then sign; layout beside the menu)

- **Changed:** the contract is read **part by part** (The Parties & The Vehicle, Trip Details, …) with **Back** and
  a blue **Next** that stays at the bottom of the screen, and a progress bar ("Part 2 of 7"). It no longer sits in
  its own scrolling box; it's wider, with larger text, and shows **only the information that's available** (empty
  details and sections are left out). The letterhead keeps the dark band with the logo and the company's full name,
  **Ramellian Executive Travels**. Print / PDF is on the contract's own top bar and still prints all of it.
- **Added:** on the last part, **I have read and understood this agreement** must be ticked before **Accept &
  Continue** (contract page) or **Sign** (signing page) works. **Sign** jumps straight to the renter's place in the
  Signatures section, where the signature pad and **Submit signature** are. Each contract in a group is read and
  confirmed on its own.
- **Changed:** the renter's name under the signature comes from their profile (full name as on their ID).
- **Fixed:** a contract that's already signed now says so and offers **Continue** to the next step, instead of a
  page with nowhere to go. If a signature is refused (e.g. payment not confirmed yet), the reason shows under the
  button.
- **Changed:** on the contract pages, the way back, the title and the instructions float in a column on the left
  while the contract scrolls.
- **Changed:** on every signed-in page, the left menu stays in place while the page scrolls, and pages start right
  next to the menu instead of centring in the space beside it.

## 2026-10-16 (the contract as a proper document, with signatures)

- **Changed:** the rental contract no longer shows as raw text. It's laid out as a document: letterhead with the
  reference and agreement date, the platform notice in its own box, numbered sections, details as tables, numbered
  clauses, and **Not provided** for anything not filled in. It follows each owner's own template
  (`ContractDocument`, `lib/contractDocument`).
- **Added:** a **Signatures** section on every contract, with a place for the renter and for the owner, each dated
  when signed. The renter's shows **Signed electronically** with the date once signed (or **Sign in the box below**
  on the signing page). The owner's shows **Awaiting signature**: the backend can't take an owner's signature yet
  (`docs/backend-requests.md` item 40).
- **Changed:** the agreement date is the date the contract was accepted, not the day you happen to view it.
- **Added:** **Print / Save as PDF** under the contract, printing only the contract.
- **Changed:** owners previewing their contract template see it in the same document layout.

## 2026-10-16 (price breakdown at checkout)

- **Added:** a **Price breakdown** on Checkout and Your Booking, from the backend's quote: the rental (days × daily
  price) plus any delivery, driver and payment processing fee, adding up to the total charged. Several vehicles get
  a breakdown and subtotal each. The platform's commission is never shown as a renter charge (`CartTotals`,
  `lib/quoteBreakdown`).
- **Changed:** the quote now also sends Self-Drive / Chauffeured, so a driver charge is included when the backend
  sets one.

## 2026-10-16 (a clear way back on every booking step)

- **Added:** a back button at the top of each booking step: **Back to checkout** on the contract and the combined
  payment, **Back to contract** on the payment page (or **View booking** once it's paid), **Back to payment** on
  the signature page, and **Back to My Bookings** on a booking's own page.
- **Fixed:** the step indicator above Your Booking and Checkout no longer shows the removed "Your Contact" step.

## 2026-10-16 (new font)

- **Changed:** the whole portal now uses one font, **Plus Jakarta Sans**: bold for headings and prices, regular for
  text. It replaces Playfair Display (headings) and Inter (text). The font is set in one place,
  `src/theme/fonts.js`.

## 2026-10-16 (see-through booking panel)

- **Changed:** the booking panel on a vehicle's page is now see-through glass, so the background shows through
  it (`AddToBookingPanel`).

## 2026-10-13 (a car with one booking no longer looks booked on every date)

- **Fixed:** a vehicle with a booking on some dates showed "This vehicle is already booked for those dates" for
  **any** dates chosen, so it couldn't be booked at all. The backend's single-vehicle check ignores the dates
  (`docs/backend-requests.md` item 39); the vehicle page now asks the dated vehicle list instead, so only the
  dates that really clash are refused (`useVehicleWindowBooked`).

## 2026-10-12 (simpler booking: fewer steps from Book to paid)

- **Removed:** the separate "How can we reach you?" step. **Book now** and **Book** go straight to checkout, with
  **Create Account** already open for a visitor. The old `/booking/contact` address opens checkout.
- **Changed:** sign-up asks for a **phone number** (required). It's saved to your profile once you're signed in,
  so checkout no longer asks for it again. A booking lead (vehicles chosen, email and phone) is still sent to the
  business, now when the sign-up form is submitted.
- **Changed:** entering the email verification code **signs you in automatically** and takes you back to your
  booking — no logging in again (unless the page was reloaded in between).
- **Changed:** **Proceed to Payment** goes straight to Pesapal — the "You're ready to pay" countdown page is gone.
- **Changed:** coming back from Pesapal now lands on the booking's own Payment page, so paid / failed / still
  checking always look and work the same. A double-click on **Try Again** starts only one payment.
- **Changed:** the **Finish setting up your account** window and banner no longer pop up during checkout,
  contract, payment or signing.
- **Fixed in the guide:** several vehicles are paid for in **one** combined payment (the guide said one at a time).

## 2026-10-12 (contract: registration, VIN and pick-up place filled in)

- **Changed:** the contract a renter reads and signs now shows the vehicle's **registration number** and
  **VIN**, so the agreement identifies the exact car. Pick-up and return show the vehicle's own location when no
  place was given and it isn't delivered (`contractFields`).
- **Documented:** what stays blank and why (owner's details, which the portal can't look up), and that the
  backend's signed copy is still the raw template.

## 2026-10-12 (paying again after a failed or abandoned Pesapal payment)

- **Fixed:** on the **Payment Status** page (where Pesapal sends you back), **Try Again** / **Continue to
  Payment** didn't do anything: a new payment was started but you were never taken to it. It now takes you
  straight to Pesapal to pay again. One click starts one payment, even if you double-click.
- **Fixed:** if you backed out of Pesapal without paying, the page could spin on "Waiting for your payment to be
  confirmed…" forever. It now offers **Check again** next to the pay button, and after about 30 seconds it says
  it's still waiting to hear back. If the payment check itself fails (a server problem, such as the backend
  being unable to reach Pesapal), it now says **Couldn't check your payment** instead of spinning, with **Check
  again** and **Try Again** (`PaymentSuccessPage`, `PaymentPage`, `usePaymentStatus`).

## 2026-10-12 (Log In no longer squeezed inside the booking panel)

- **Fixed:** pressing a button inside the vehicle page's booking panel while signed out opened the **Log In**
  window inside the panel, squeezed into its box. Pop-up windows and side panels now always open over the
  whole screen (`Modal`, `Drawer`).

## 2026-10-12 (identity document: ID or passport, selfies, number read from the photo)

- **Changed:** Documents now has one **Identity Document** card where you choose **National ID** or
  **Passport**. One is enough; you're never asked for both. The checkout "Verification Required" window
  asks the same way.
- **Added:** a selfie holding the document: two for a National ID (holding the front, holding the back), one
  for a Passport (holding the photo page). On a phone these open the front camera. They're sent with the
  document as one image, so the reviewer sees them together.
- **Changed:** the ID number (or passport number) is read from the photo automatically and can no longer be
  typed, here or on the profile (where it's now shown read-only). If it can't be read, you're asked to retake
  the photo (`IdentityDocumentCard`, `DocumentGateModal`, `PersonalDetailsForm`, `lib/identity`).

## 2026-10-12 (no booking mode picked means both)

- **Changed:** when adding or editing a vehicle, leaving both **Self-Drive** and **Chauffeured** unselected no
  longer shows "Select at least one booking mode" — the vehicle is saved as offering both, and a short note
  says so (`vehicleForm`, `AddVehiclePage`, `EditVehiclePage`).

## 2026-10-09 (bigger vehicle photo)

- **Changed:** the vehicle page's photo is a little bigger (about 12% — it now takes two thirds of the left side,
  with the details beside it); the page still fits on one screen (`VehicleDetailPage`).

## 2026-10-09 (trip type back to tap-to-choose buttons)

- **Restored:** on the vehicle page, Trip Type is a set of buttons again (tap one, tap again to clear) instead
  of a dropdown. The booking panel's spacing was tightened slightly so it still fits on screen with them.

## 2026-10-09 (vehicle page fits on one screen)

- **Changed:** on a computer or tablet the vehicle page now shows the photo and the vehicle's details side by
  side, with Reviews right under them and the booking panel beside, so the whole vehicle — photo, name,
  features, price, reviews and Book now — is visible without scrolling (measured on a 1349×760 screen). On a
  phone it still stacks. Spacing between the photo, details, Reviews and the booking panel's rows was opened up
  so it doesn't feel crowded (`VehicleDetailPage`, `AddToBookingPanel`, `Step2_TripDetails`).

## 2026-10-09 (reviews: no more "5.0" above a big "No reviews yet")

- **Changed:** a vehicle (or owner) with no reviews yet now shows one line — the starting stars, **5.0**, and
  "No reviews yet" — instead of the stars above a large empty "No reviews yet" block that seemed to contradict
  them (`ReviewList`).

## 2026-10-09 (vehicle page: photo no longer overflows)

- **Fixed: a large vehicle photo pushed the gallery past the right edge** of the vehicle page, cutting off its
  Next arrow and photo count (the page's columns grew to the photo's own width). Both columns now stay within
  their space (`VehicleDetailPage`).
- **Changed: the photo is capped at just over half the screen's height** (`ImageGallery`), so the vehicle's
  name and details show without scrolling.

## 2026-10-09 (no more scrolling to reach a button: booking panel, filters, Create Account, checkout)

- **Vehicle page booking panel** — was taller than the screen (Book now sat below it). Now fits (measured
  853px → 538px): dates get their own row (they were cut off), Booking Mode and **Getting the vehicle**
  (**I'll collect** / **Deliver**) are compact toggles side by side, Trip Type is a dropdown instead of eight
  chips, special instructions open from **Add special instructions**, and **Add to booking** shares a row with
  **Preview rental terms**. The panel is now see-through like Browse Vehicles' filters.
- **Browse Vehicles filters** — no longer scroll inside the column: Minimum Seats, Fuel Type and Transmission
  sit two to a row, the separate "Search a location" box is gone (the place chips and the main search box
  cover it), and the page starts a little higher.
- **Create Account panel** — Password and Confirm Password sit side by side, so the whole form fits.
- **Checkout** — the buttons (Sign up / I have an account / Continue to contract, Back) now come right under
  the total, with "What happens next" below them, so they're on screen without scrolling.

## 2026-10-09 (delivery fee; contract details filled in; panels easier to read)

- **New: delivery to the renter, for a flat fee.** The vehicle page asks **How will you get the vehicle?** —
  **I'll collect it** (no fee) or **Deliver it to me** (the fee, from the backend's own quote, is shown and added
  to the total; a delivery address is required). It's sent with the booking (`deliveryRequested`, live spec
  2026-10-09) and shown on Your Booking and checkout. Documented in step 2 of the booking walkthrough.
- **New: Platform Settings has the delivery fee**, alongside the commission and the Pesapal fee. All three are
  now saved together — saving the commission alone could have cleared the other two.
- **New: the contract shows the booking's own details.** When reviewing and signing, any `{{field}}` in the
  contract (renter's name and ID number, vehicle, trip, charges, cancellation terms) is filled in from the
  booking (`lib/contractFields.js`). On screen only — the stored, signed PDF still needs the backend to fill them
  (docs/backend-requests.md item 37). The vehicle's registration and VIN, and the owner's details, are left as
  blank lines in the renter's view.
- **Changed: slide-in panels are more solid**, with the page behind softly blurred — the frosted version let a
  busy page show through and clash with the panel's text. "Continue to checkout" is now just **Continue**.
- **Backend (unchanged here):** the owner still gets a "new booking" notification before payment — that's sent
  by the backend; marked urgent in docs/backend-requests.md item 18.

## 2026-10-09 (slide-in panels are frosted glass)

- **Changed:** every panel that slides in from the right — "How can we reach you?", Log In, Create Account and
  the others — is now frosted glass like Browse Vehicles' search box and filters: the page shows through,
  blurred, instead of a solid block (`Drawer`).

## 2026-10-09 (booking as a visitor: everything slides in, no new pages)

- **Fixed: Book now sent a visitor to a separate "How can we reach you?" page.** It now slides in from the
  right over the vehicle's page, as the Book button on Your Booking already did.
- **Changed: "Already have an account? Log in" opens the Log In panel in place** (on the vehicle page, Your
  Booking or checkout) instead of moving to checkout first; Log In and Create Account switch between each other
  in place too. Logging in still lands you on checkout. Shared by the vehicle page and Your Booking through the
  new `GuestBookingPanels`. Updated steps 2 and 4 of the booking walkthrough.

## 2026-10-09 (Browse Vehicles: review fixes)

- **Fixed: the filter column slid under the pinned search box** near the end of the results. Its height now
  leaves room for the page's bottom and footer, so it stays below the search box.
- **Changed: Sort by is on the title's line** ("Browse Vehicles · 6 vehicles found"), instead of alone above
  the results with a gap beside it.
- **Changed: clearer filters** — "Minimum Seats", "Fuel Type" and "Transmission" say **Any** when nothing is
  chosen, and the place counts and the price slider's end labels are brighter over the photo.
- **Changed: "Booked" only shows once dates are chosen.** Without dates it read as "unavailable" for a car
  that may be free on the renter's own dates.
- **Changed (phones): the WhatsApp chat button slides away while you scroll down**, so it doesn't sit on top of
  a car's Book button, and comes back as soon as you scroll up.
- **Found:** visitors never see vehicle photos — the backend doesn't return them at all; only the browser that
  uploaded them has a copy. Asked for in docs/backend-requests.md item 36.

## 2026-10-09 (Browse Vehicles: tighter filter spacing)

- **Changed:** less space between the filters (and between the "Available in" chips), so the column is about
  70px shorter and more of it fits on screen before scrolling (`FilterPanel`).

## 2026-10-09 (Browse Vehicles: a different photo each visit, behind the whole page again)

- **Changed:** the photo covers the whole page again, behind the see-through search box and filters (the top
  band from the entry below is undone; the rounded search box stays). It no longer cross-fades on a timer:
  each time you open Browse Vehicles you get the next destination photo, which stays put while you're there.
  The last one shown is remembered in your browser. (`PageBackdrop`'s `images`.)

## 2026-10-09 (Browse Vehicles: photos in a top band, calm background below; rounded search box back)

- **Changed:** the moving destination photos now fill only a band across the top of Browse Vehicles, behind
  the title and search box, fading into the plain dark background. The filters, Sort by and the cars sit on
  that steady background, so they read the same whichever photo is showing (`PageBackdrop`'s `band`).
- **Restored:** the search box's fully rounded (pill) corners.

## 2026-10-09 (Browse Vehicles: search and filters styled like Sort by)

- **Changed:** the search box and the filters now match the **Sort by** field — plain, see-through fields
  sitting straight on the page, with no card around the filters. On a narrower screen, where **Filters**
  opens the panel over the cars, it keeps a frosted card so its labels stay readable. (`FilterPanel`'s
  `bare`, `SearchBar`.) Replaces the frosted-glass look from the entry below.

## 2026-10-09 (Browse Vehicles: frosted-glass search and filters)

- **Changed:** the dark band behind the pinned search box is gone, and the search box and filter panel are now
  frosted glass — the page's photo shows through, blurred — instead of solid blocks. Kept translucent rather
  than fully transparent so their text stays readable as cars scroll underneath. (`SearchBar`, `FilterPanel`,
  `VehiclesPage`.)

## 2026-10-09 (Browse Vehicles: cars only, a slim footer)

- **Changed:** Browse Vehicles no longer shows the full company footer (Services / Vehicles / Company columns)
  under the cars — just one slim line with the copyright and **Privacy Policy** / **Terms of Service**, which
  stay reachable from every public page. Every other page keeps the full footer. (`Footer`'s `compact`,
  chosen by path in `App.jsx`'s `PublicLayout`.)

## 2026-10-09 (Browse Vehicles: a moving background)

- **Changed:** Browse Vehicles' background now cross-fades slowly through the destination photos (Nairobi, the
  coast), one every 8 seconds, instead of a single still photo — the same set as the home page's hero
  (`lib/destinationPhotos.js`). Anyone whose device asks for reduced motion keeps a still photo. `PageBackdrop`
  takes `images` for this; other pages can switch to it the same way.

## 2026-10-09 (Browse Vehicles: full-width search back and pinned; sorting fixed)

- **Fixed: Sort by seemed to do nothing.** When results were in more than one place they were grouped busiest
  place first, which overrode the chosen order (under "Most Seats" the 8-seater sat in the second group). Once a
  sort is picked, the results are now one list in that order; grouping by place stays for the default view.
  (On the live data every car is priced at 1 and rated 5.0, so the price and Top Rated sorts still can't
  change anything there — Most Seats and Newest show it working.)
- **Changed: the search box is full width again**, as its own bar pinned under the top bar, instead of
  squeezed into the filter column. Wide screens: the filter column stays beside the results, pinned just below
  the bar. Narrower screens: **Filters** sits beside the search box and opens the panel inside the bar.
  New `hooks/useMediaQuery.js` places the one filter panel for each width.

## 2026-10-09 (newest listings: a "Newest" sort, a "Just added" row and a "New" badge)

- **New: "Newest" in Sort by**, a **Just added** row on the home page, and a green **New** badge on any vehicle
  listed in the last 7 days. **Recommended** stays the default, now using newest as its last tie-break.
- `VehicleResponse` has no created date, so "listed" means when an admin approved it (`reviewedAt`) — only
  approved vehicles are public. The backend refuses `sort=newest` (400), so the portal sorts it itself and
  never sends it (`lib/vehicleRanking.js`, `useVehicleAvailability`). Asked for a real `createdAt` and a
  `newest` sort in docs/backend-requests.md item 35. Documented under "Browse vehicles".

## 2026-10-08 (Browse Vehicles: search and filters stay in view while scrolling)

- **Changed:** the search box moved into the filter column, and that column is now sticky (`VehiclesPage.jsx`).
  Wide screens: it stays beside the results, scrolling on its own if taller than the screen. Narrower screens
  (including a signed-in person's view beside the left menu): a slim bar — search plus a **Filters (n)** button
  that opens the panel in place — stays under the top bar. Documented under "Browse vehicles".

## 2026-10-08 (real vehicles on the home page; "Recommended" now means something)

- **New: swipeable rows of real vehicles on the home page** — **Available now**, **Chauffeured** and
  **Self-Drive** (`FeaturedVehiclesSection` / `VehicleRow`), up to 10 each, with **See all** to Browse Vehicles
  filtered the same way. They replace the old "Our Fleet" section, which only listed model names
  (`FleetSection` and `VehicleTierCard` removed). An empty row hides itself.
- **Changed: "Recommended" is now a real order.** Tested live: the backend's default order is by internal id,
  effectively random. The portal now orders it itself (`lib/vehicleRanking.js`): free for your dates first,
  then rating, then listings with photos. The other sorts are still the backend's. Backend asked to take this
  over: docs/backend-requests.md item 35. Documented under "Browse vehicles".

## 2026-10-08 ("Rent Out My Car" is now "List Your Car")

- **Renamed** the owner sign-up button in the top bar and the phone menu from **Rent Out My Car** to **List Your
  Car** — it no longer reads like **Rent a Car** beside it, and speaks to the visitor like every other button.
  It still opens Register with the owner setup to follow. Updated every mention in this guide and in
  `docs/menu-structure.md`; older entries below keep the old name.

## 2026-10-08 (top bar: Log In now comes after Rent Out My Car)

- **Changed:** for a visitor on a wide screen, the top bar reads **Rent a Car**, **Rent Out My Car**, **Log In**
  (Log In used to come first). Phones are unchanged — Log In is the only one of the three in the bar there.
  Updated the "Getting around" description of the top bar.
- **New: icons on those three buttons** — a car on **Rent a Car**, a key on **Rent Out My Car**, a sign-in
  arrow on **Log In** — in the top bar, beside the phone menu icon, and in the phone menu itself, which now
  lists them in the same order.

## 2026-10-08 (a "General" vehicle can be booked for any trip type)

- **Fixed: a Wedding (or any other trip) was refused on a vehicle marked General.** The portal read General as
  "General trips only". Tested live: the backend accepts any trip type on any vehicle, so the refusal was the
  portal's own check. New `bookableTripTypes` (`lib/vehicleOptions.js`) treats General — or no restriction — as
  every trip type; the vehicle page's trip-type chips (`TripTypeSelect`), the add-to-booking check and the
  checkout re-check (`tripTypeProblem`) all use it. A vehicle limited to specific trips without General is
  still limited. Updated step 2 of the booking walkthrough.

## 2026-10-08 (fewer steps to book: the home search carries through, and "Book now" skips the basket)

- **Fixed: the home page's search was thrown away.** Browse Vehicles clears every filter it arrives with
  (so an old bookmark doesn't stick), and that included the home search bar's own choices. `BookingBar` now
  marks its navigation `state.fromSearch`, and `VehiclesPage` keeps the filters in that case only.
- **New: the search fills in the vehicle's booking form.** `VehiclesPage` mirrors its dates, mode and
  pickup/return places into `bookingStore.search` (memory only, not saved), and `AddToBookingPanel` starts a
  fresh form from it — skipping dates already past, and a mode the vehicle doesn't offer.
- **New: Book now.** The vehicle page's main button is now **Book now** (to checkout, or the contact step for a
  visitor); **Add to booking, keep browsing** still goes to Your Booking. Updated steps 1–2 of the booking
  walkthrough.

## 2026-10-07 (returning renters can skip "How can we reach you?" by logging in)

- **New: "Already have an account? Log in" on the contact step.** We can't tell a returning renter from a new
  visitor until they sign in, so they used to be asked for a contact anyway. The button (`ContactForm.jsx`, so
  it shows in both the panel and the `/booking/contact` page) goes to checkout with `state.auth = 'login'`;
  `BookingCheckoutPage.jsx` opens its Log In panel from that and clears the state so a reload doesn't reopen
  it. No contact is shared or stored. Updated step 4 of the booking walkthrough.

## 2026-10-07 (a signed-in renter with no phone number is asked for one once, at checkout)

- **New: checkout asks a signed-in renter for a phone number if their profile has none.** Signed-in renters
  skip the "How can we reach you?" step, so until now one could book with only an email on file. An **Add your
  phone number** box (`CheckoutPhonePrompt.jsx`) now appears on `BookingCheckoutPage.jsx` in that case, and
  **Continue to contract** is disabled until it's saved. It's saved to the profile (`PATCH /users/me`, phone
  only), so it's asked once and never again; a phone shared before signing up starts the field. Renters who
  already have a phone number see nothing new. Added to step 5 of the checkout walkthrough.

## 2026-10-06 ("How was your trip?" now opens right after Record Return, instead of waiting for the booking to show as Completed)

- **Changed: the review prompt now opens immediately once a return is recorded.** Previously it only ever
  appeared once the booking separately refetched as Completed, further down the booking's own page — a renter
  could easily miss it. `VehicleHandoverModal.jsx` now takes an `onRecorded` callback (fired after a successful
  dropoff, right after `onClose`), and `BookingDetailPage.jsx` uses it to open `ReviewForm` in its own modal
  right away. The original lower-page section still appears too, in case the prompt is dismissed without
  sending a review. Updated step 11 of the renter walkthrough to match.

## 2026-10-06 (checkout no longer blocks on missing documents — a non-blocking notice up front, a one-time reminder after booking)

- **Changed: Continue to contract no longer refuses to go on just because an ID/licence isn't approved yet.**
  Re-confirmed against the live spec that the backend itself has relaxed this — `POST /bookings/create` and
  `/bookings/create-batch` now return a normal `201` with a `warnings` list instead of refusing the booking
  (see docs/backend-requests.md item 34). Checkout (`BookingCheckoutPage.jsx`) still tells you what's missing
  with a notice and an **Upload now** shortcut, but you can continue past it.
- **New: a one-time "Before You Pick Up" reminder right after a booking is made,** if anything's still
  outstanding — listing exactly what, with **Upload Documents Now** or **I'll Do It Later**
  (`BookingWarningsModal.jsx`, shown from `ContractPage.jsx`). Updated step 6 of the checkout walkthrough
  to match.

## 2026-10-06 (two fixes: a just-approved document needed a page reload to show it; a receipt could show less than what was actually paid)

- **Fixed: your Documents page needed a hard reload to show a status an administrator had just decided.**
  The app's query cache doesn't refetch on its own (`refetchOnWindowFocus: false`, a 5-minute `staleTime`
  globally — `lib/queryClient.js`), and nothing told it "this specific document just changed" from a
  different person's (the admin's) browser. `useDocuments` (`hooks/useDocuments.js`) now re-checks every 15
  seconds while a page has it open, and immediately on switching back to the tab — same idea as the polling
  `useChat.js` already does for a conversation. "Pending" now turns into "Approved"/"Rejected" on its own.
- **Fixed: a receipt could show less than what was actually paid.** A renter reported paying more than their
  receipt said. `Receipt.jsx` read `PaymentStatusResponse.amount` directly for "Amount Paid" — confirmed
  live that this field looks to be the bare vehicle rate, not the real total Pesapal collects (which adds a
  transaction fee — see docs/backend-requests.md item 29). The receipt now shows the booking's own
  `estimatedAmount` instead — the same total already quoted to, and agreed by, the renter before they ever
  paid — falling back to the old field only if that's missing. Flagged in backend-requests.md as a backend
  field that may need correcting at the source, not just worked around here.

## 2026-10-06 (Record Pickup now waits for the trip's own start date; photo uploads at handover aren't possible yet)

- **Fixed: a renter could record a vehicle pickup days before they were actually due to collect it.**
  "Record Pickup" was only ever gated on the booking being Confirmed, with no check against the trip's own
  dates. New `canRecordPickup` (`lib/utils.js`) also requires the scheduled pickup day to have actually
  arrived (any time from the start of that day onward — this only blocks being early, not a late pickup).
  Until then, the button shows disabled with the date it opens up, on both My Bookings' expanded row
  (`BookingRow.jsx`) and the booking's own page (`BookingDetailPage.jsx`).
- **Investigated, not built: uploading a photo alongside a handover entry.** Re-checked the live spec —
  `POST /handovers/bookings/{id}/pickup`/`.../dropoff` still only accept one file, `signature`; there is no
  field for a condition photo, and the only other upload endpoint (`POST /vehicles/{id}/photos`) attaches to
  the vehicle's own listing, not a specific booking. Logged as backend-requests.md item 33 — needs a new
  field/endpoint before this can be built.

## 2026-10-06 (a new Assistant — chat with Ramellian's own bot — added to every role's menu)

- **A new "Assistant" page (`/assistant`)** lets anyone signed in chat with Ramellian's in-app bot — ask about
  a vehicle, a booking, or how something on the portal works — using the backend's newly-added
  `POST /bot/inapp` (confirmed against the live OpenAPI spec 2026-10-06; see docs/backend-requests.md).
  Shown next to Messages/Inbox in every role's side menu, as a new bot icon in the top bar
  (`NotificationBell.jsx`), and — the way most people will actually reach it — a WhatsApp-style floating
  button in the bottom-right corner of **every** page (`AssistantFab.jsx`), solid WhatsApp green with the
  WhatsApp glyph (`react-icons`) — global the same way a real business's WhatsApp button is: shown to a
  signed-out visitor too, not just once signed in. Clicking it opens the same conversation right there in a
  small panel, without leaving the page you're on; clicking it again (or the panel's own close button) puts
  it away. `POST /bot/inapp` needs a signed-in account, though, so a visitor who opens the panel gets
  **Log In**/**Create Account** there instead of the chat box — the button itself is never hidden from them,
  only the chat behind it. The bot can reply with an attachment (an image shown inline, or a file as a
  download link), but **unlike Messages, this conversation isn't saved anywhere** — the backend has no
  endpoint to list past bot messages, so it starts fresh every time the panel (or the full `/assistant` page)
  is opened, with nothing kept across a reload.
  A separate backend endpoint, `/bot/whatsapp/inbound`, also exists for the same bot answering WhatsApp
  messages directly, but that's a webhook the WhatsApp provider calls on the backend — nothing in the portal
  itself calls or needs it.

## 2026-10-05 (every booking status tab now shows a count, everywhere it appears)

- **Each tab in `BookingStatusTabs` — Confirmed, Pending Payment, Active, Completed, Cancelled, Rejected,
  Expired, All — now shows how many bookings are in it**, e.g. "Active (3)", on My Bookings, Fleet Bookings,
  All Bookings, and the Bookings tab of both the Owner's and Admin's Reports pages. New
  `countBookingsByStatus` (`lib/bookingFilters.js`) counts against whatever else is currently filtered (When,
  trip type, mode, date range, vehicle search) but ignores whichever status tab happens to be selected, so a
  tab's own count doesn't change just because it's the one you're looking at.

## 2026-10-05 (a Terms of Service/Privacy Policy now exist, sign-up requires agreeing to them, and every contract gets a fixed platform clause — plus the booking calendar now shows small cars instead of dots)

- **`/terms` and `/privacy` are now real pages**, not dead links — the footer already pointed at both, but
  neither route existed until now (`TermsPage.jsx`/`PrivacyPage.jsx`, sharing a new `LegalPage` layout).
  Both are an explicit draft: they describe how the portal actually works today, written by the product
  team, and carry a visible notice that they need review from Ramellian's own legal counsel before they're
  final. The core of the Terms is a limitation-of-liability section: Ramellian operates the booking
  platform but is not a party to a rental, and liability for what happens during one is governed by the
  rental agreement signed between that owner and renter, not by Ramellian.
- **Signing up now requires checking "I agree to the Terms of Service and Privacy Policy"** (new `Checkbox`
  widget, `src/components/ui/Checkbox.jsx`) before the account can be created, on both `RegisterPage` and the
  checkout `RegisterModal`. The live `RegisterRequest` has no field for this, so it's enforced client-side
  only for now — logged as backend-requests.md item 31, since there's currently no server-held record of
  when, or whether, a given account actually agreed.
- **Every owner's rental contract now starts with a fixed "Ramellian Platform Terms" clause** (new
  `lib/contractBoilerplate.js`), shown read-only in `ContractTemplateEditor` above the owner's own editable
  wording and prepended to it when saved, so it's part of the one `content` string the backend stores and
  the renter signs — an owner's own terms can add to it but can't remove or edit it.
- **The Booking Calendar's status markers are small car icons now, not plain dots** (`BookingCalendar.jsx`),
  each tinted to that booking's own vehicle color (as entered on its listing — new `lib/vehicleColor.js`,
  matching common color words inside whatever free text an owner typed, e.g. "Pearl White" → white) and ringed
  in its status color (gold for Pending, green for Confirmed/Active, red for Cancelled/Rejected/Expired) — so a
  glance shows both which vehicle and what state it's in. The legend still shows status only, with a neutral
  car.

## 2026-10-05 (Record Pickup/Return moved from the owner's booking page to the renter's — the backend only accepts it from the renter)

- **Fixed: "Record Pickup" on the owner's/admin's booking tables always failed** with "Couldn't record the
  pickup. Only the renter can submit handover details." The whole feature had been built on the assumption
  that the owner/dispatcher records the vehicle's condition at pickup and return, with the renter only
  signing to confirm it — the live backend actually requires the opposite: only the renter's own account can
  submit `POST /handovers/bookings/{id}/pickup`/`dropoff` at all, a 403 otherwise. **Record Pickup**/**Record
  Return** moved to the renter's side — My Bookings' expanded row and the booking's own page
  (`BookingDetailPage.jsx`) — and were removed from Fleet Bookings, All Bookings and the owner's booking page
  (`OwnerBookingDetailPage.jsx`), which now show the same handover record read-only instead, same as they
  always could. `VehicleHandoverForm`'s own copy changed to match: the renter fills in odometer/fuel/
  condition/damage, then has the owner or their dispatcher — whoever's physically there — sign to confirm
  it, the opposite direction from before. Submitting a pickup still only ever changes the booking's own
  status forward (e.g. to Active) — it's never removed from any list, the renter's or the owner's.

## 2026-10-05 (clicking outside the Log In / Create Account / contact panel now actually closes it, and leaves a tab to bring it back)

- **Fixed: clicking outside the right-side panel (`Drawer`) didn't close it.** The dimmed overlay sat visually
  on top of the container the click-to-close check was looking at, so a real click on the dimmed area never
  landed on that container — only the click-to-close check itself (via `getByTestId`, which clicks a specific
  element directly) made it look like it worked in tests. Clicking outside, pressing Escape, and the **X** all
  go through the same handler now and all actually close the panel.
- **Dismissing the panel now leaves a small restore tab docked to the right edge of the screen**, for Log In,
  Create Account and the contact step — so closing it by accident (or just changing your mind) doesn't mean
  hunting back down the button that first opened it. The tab is labelled with what it reopens (e.g. **Continue:
  Log In**), not just an icon, so it's clear what it's for at a glance. Clicking it reopens the same panel,
  starting fresh (same as opening it the first time) rather than restoring exactly what was typed. The tab only
  appears after a dismissal like that; closing the panel because the job is done (signed in, registered,
  contact saved) still leaves nothing behind.

## 2026-10-05 (the "how can we reach you" step also opens as a panel now, from the cart or checkout page)

- **Booking's "how can we reach you" step** (phone or email, before a visitor signs up) **now opens as the same
  right-side panel** instead of navigating to its own `/booking/contact` page. The cart page's **Book** button
  opens it directly over the cart; on checkout, **Change** next to the saved contact (or **Back**, before
  signing up) reopens it over checkout instead. The shared form logic moved into `ContactForm`
  (`src/components/booking/ContactForm.jsx`), used by both the new `BookingContactDrawer` and the standalone
  `/booking/contact` page, which is untouched and still works for a direct link or the browser's Back button —
  only the two usual ways into this step (from the cart, or editing it from checkout) no longer leave the page.

## 2026-10-05 (checkout's sign-up/log-in now slides in from the right, not a centered popup)

- **"Sign up to continue" and "I have an account" on the checkout page now open as a panel that slides in from
  the right edge of the screen** (new `Drawer` widget, `src/components/ui/Drawer.jsx`, used by `RegisterModal`/
  `LoginModal` in place of the shared `Modal`) instead of a centered popup — the backdrop is a light, unblurred
  dim rather than the full-screen blurred overlay `Modal` uses, so the booking behind it stays visible rather
  than being covered. The panel is sized to its content and capped at the viewport height (scrolling on its own
  past that) rather than stretched edge-to-edge, so it reads as a floating, rounded-corner card docked to the
  right rather than a strip running the full height of the screen. Everything else about the two panels is
  unchanged: they still switch straight to each other, logging in still just closes the panel once signed in,
  and registering still moves on to the real **Verify your email** page afterwards. `Modal` itself is untouched
  and still used everywhere else (booking detail modals, admin dialogs, etc.) — only these two auth panels
  moved to `Drawer`.

## 2026-10-05 (signing up or logging in at checkout now happens in a dialog, not a separate page)

- **"Sign up to continue" and "I have an account" on the checkout page now open as dialogs over the page**
  (`RegisterModal`/`LoginModal`, `src/components/auth/`) instead of navigating to `/auth/register`/
  `/auth/login` — the booking stays visible underneath, so it reads as one step rather than being sent away to
  do something else. The two dialogs switch straight to each other ("Log in"/"Create one" inside either one)
  without a moment where neither is open. Logging in finishes entirely in the dialog — it just closes once
  signed in, landing back on the same checkout view. Registration still has to move on to the real
  **Verify your email** page afterwards (there's a code to type in, which needs its own screen either way);
  the dialog only ever removed the page change for *entering your details*, which is the part that happens
  far more often at checkout, since most people reaching it are new. `/auth/login` and `/auth/register`
  themselves are unchanged — this only affects the two buttons on the checkout page.

## 2026-10-05 (payment receipts, and the owner's Reports page can now be filtered)

- **Every paid booking now has a Receipt** — Preview and Download actions (`ReceiptActions`/`ReceiptModal`/
  `Receipt.jsx`) offered the moment payment succeeds (on the payment page itself), as a new **Receipt** column
  on My Bookings, Fleet Bookings, All Bookings and both report tables' itemized list, and on the booking's own
  detail page. "Download" opens the receipt and goes straight to the browser's print dialog (save-as-PDF is
  the usual option there — there's no PDF-generation library in this project, so this reuses the same
  technique the Reports pages' own Print button already does); "Preview" just opens it to look at. The receipt
  is generated entirely from data already on hand (the booking and its payment status) rather than depending
  on the backend's own `receipt` field — confirmed, once the backend came back up later the same session, to
  be a short code (e.g. `UJ3N08KRL1`), not a document, so that was the right call. It only ever shows the
  total amount paid, never a platform-fee breakdown, per the rule behind item 29.
- **The Owner Reports page's Revenue tab can now be filtered** — the same status tabs and filter bar (When,
  trip type, mode, date range, vehicle search) the Bookings tab already had now sit above both tabs, and
  narrowing them updates the payout figures and the bookings-over-time chart too, not just the itemized list.
  Both tabs read the same filter state (it lives in the URL), so switching between them keeps whatever's
  selected. Built entirely client-side (`lib/reports.js`'s new `filterReport`) since the backend's report
  endpoints take no filter parameters of their own — see `docs/backend-requests.md` item 30.
  **Corrected same day:** checking against real bookings showed `BookingResponse.ownerPayout` is always
  `null`, which would have made the filtered "Your Payout" figure silently show KES 0 — `filterReport` now
  falls back to `estimatedAmount − platformFee` per booking instead, an approximation until the backend
  populates the real field (see item 30).

## 2026-10-05 (the pre-payment auto-redirect now counts down visibly)

- **The "You're ready to pay" panel's text now counts down the seconds** ("Taking you to complete payment
  securely in 5s…", then 4s, 3s, …) instead of just saying "a few seconds", so the auto-redirect added
  2026-10-04 isn't a silent surprise. Purely a display addition — the countdown and the actual redirect run
  as two independent timers so the redirect's own single-fire guarantee (and the manual-click cancel) are
  unaffected.

## 2026-10-04 (the payment page now sends you to Pesapal automatically, not just on click)

- **The "You're ready to pay" panel now auto-redirects to Pesapal ~5 seconds after checkout starts**
  (`PaymentStatusPanel.jsx`), instead of waiting indefinitely for a manual click. The **Continue to Payment**
  button stays visible as a fallback — for a popup/redirect blocker, or a renter who doesn't want to wait —
  and clicking it (or middle/ctrl/cmd-clicking to open in a new tab) cancels the pending auto-redirect so it
  can't fire a second, redundant navigation. Scoped to that first panel only: once polling is exhausted and
  the renter is offered the same button again later, it's click-only, as before.

## 2026-10-03 (owners get a real booking calendar, per vehicle and across the whole fleet)

- **A new "View Calendar" button on each My Vehicles card** opens that vehicle's bookings as a month-grid
  calendar (`BookingCalendar`/`VehicleCalendarModal`) — colour-coded dots by status (Confirmed/Active green,
  Pending amber), with a legend, and clicking a day lists exactly which booking covers it. Replaces the old
  plain "Booked dates" text list (first three, "+N more") with a short count and this calendar instead.
- **A new "Booking Calendar" page** (`/owner/calendar`, also in the sidebar under My Fleet) shows the whole
  fleet on one calendar, with a vehicle filter when there's more than one — left on "All vehicles", a day
  with more than one vehicle booked shows a dot per booking and names each vehicle when clicked.

## 2026-10-03 (dates you already hold on a vehicle are now struck through in the calendar itself, not just rejected after picking them)

- **The trip-dates calendar now shows your own existing bookings on a vehicle as unavailable, up front** —
  red, struck through, with a "Not available" legend and a tooltip, and they simply can't be clicked as a
  start or end date (`DateRangePicker`'s new `disabledRanges`, wired up in `Step2_TripDetails` from the
  renter's own `GET /bookings/mine`). A plain-text explanation above the calendar also names the exact dates
  ("You already have this vehicle booked for …"). Picking a range that would span across one of those dates
  in between is refused the same way. This replaces the previous behavior of only rejecting the clash after
  dates were already picked and **Add to booking** was clicked — it's now visible before you try, not just
  enforced after. Same scope and limitation as the underlying check it's built on: it can only ever reflect
  *your own* bookings, not anyone else's (see `docs/backend-requests.md` item 25 for the vehicle-wide
  "Booked" badge, which still needs its own backend fix).
- **The "Booked" badge on vehicle search cards is now bigger, bold, and red** (`Badge`'s new `size="lg"`
  option), instead of a small amber pill — it's meant to read as a hard stop, not a caution.

## 2026-10-03 (a signed-in renter can no longer re-book a vehicle they already hold for the same dates)

- **Adding a vehicle to your booking now also checks your own existing bookings**, not just the vehicle's
  "booked" flag (`AddToBookingPanel`) — if you already have a Pending/Confirmed/Active booking on that
  vehicle covering the dates you picked, it's blocked with an explanation, the same way a date someone else
  already holds is blocked today. This closes the specific way a renter could accidentally book and pay for
  the same vehicle twice while the vehicle's own "Booked" badge is known to be unreliable (see
  `docs/backend-requests.md` item 25) — it only ever catches your own repeat booking, not anyone else's.

## 2026-10-03 (price quote now shows the platform fee, not just the base price)

- **The live price quote (`POST /bookings/quote`) now breaks the total into base price and platform fee**
  (`baseAmount` + `platformFee` = `totalAmount`), replacing the single `estimatedAmount` the backend used to
  return there — confirmed live, a breaking response-shape change. Updated everywhere that read the old
  field (`AddToBookingPanel`, `CartTotals`) to use `totalAmount` instead. One visible side effect: the
  client-side placeholder price shown before the live quote loads (days × daily rate) does not include this
  fee, so once the real quote arrives the total can tick up slightly from the initial guess — this already
  happens today for any quote correction, just now also for the fee specifically. A created booking's own
  record (`BookingResponse`) is unrelated and keeps its existing `estimatedAmount` unchanged, alongside the
  same new `baseAmount`/`platformFee` breakdown, not yet shown anywhere in the UI.

## 2026-10-03 (a fast double-click could start two separate Pesapal checkouts for the same booking)

- **"Proceed to Payment" and "Try Again" are now guarded against a fast double-click** starting two separate
  Pesapal checkouts for the same booking (`PaymentPage.jsx`/`GroupPaymentPage.jsx`/`PaymentStatusPanel.jsx`)
  — found while investigating a real double-payment report. The existing `loading` state on the button only
  covered the checkout request itself, not the fresh booking-status check that runs just before it, so two
  clicks close enough together could both pass that check and both start a checkout. Confirmed this
  specific gap wasn't the cause of the reported incident (that one traces to the vehicle not showing as
  booked at all — see `docs/backend-requests.md` item 25/23, a backend issue), but it's a real, separate
  double-charge risk and is now closed either way.

## 2026-10-03 (payment status is no longer polled before the renter has even reached Pesapal)

- **Payment status polling now waits until the renter actually clicks "Continue to Pesapal"**, instead of
  starting the instant "Proceed to Payment" is clicked on our own page (`PaymentPage.jsx`/`GroupPaymentPage.jsx`).
  Previously the fixed ~30-second polling budget (`PAYMENT_POLL_MAX_ATTEMPTS`) started ticking before the
  renter had even left for Pesapal — someone who took their time to click through, or opened the Pesapal
  link in a new tab and paid there, could see "Still waiting on Pesapal" give up before they'd even finished
  paying. Polling now only starts once the renter has clicked through (including a middle/ctrl/cmd-click
  into a new tab), or when resuming a session that already got that far.

## 2026-10-03 (a delayed Pesapal payment no longer loses its way back to checkout)

- **"Still waiting on Pesapal" now keeps offering Continue to Pesapal**, instead of only "Check again" once
  polling gives up (`PaymentStatusPanel`). A renter who was simply slow to pay, or came back to the page
  later, had no way back to the actual checkout before this — "Check again" only re-asks for a status that
  was never going to change if they'd never gotten to Pesapal in the first place. The link now also survives
  leaving and returning to the page (stashed by `usePesapalCheckout`/`useGroupCheckout`, not just held in
  memory). If that link is genuinely unavailable (e.g. a different device than checkout started on), **Try
  Again** appears instead, starting a fresh payment. Applies to both the single-vehicle and combined
  (multi-vehicle) payment pages.

## 2026-10-03 (reports gain a Bookings by month chart; pickup/return can be recorded straight from the bookings list)

- **Owner Reports and Platform Reports now show a "Bookings by month" chart** (`BookingsChart`) — a stacked
  bar per month, one color per outcome (Upcoming/Active/Completed/Cancelled/Rejected), built from the same
  report data as the existing outcome pills. Hovering or focusing a bar shows its breakdown; a **Table view**
  toggle shows the identical numbers as an accessible table, so nothing is chart-only.
- **Fleet Bookings and All Bookings can now record a vehicle's pickup or return from the list itself**
  (`BookingRow`), the same handover form the booking's own page already offered — an owner or admin
  previously had to open a booking's full page first to do this.

## 2026-10-02 (cancelling now previews your refund and can't be abused close to pickup; status tabs standardized across all three bookings pages)

- **"Cancel booking" now checks the owner's cancellation policy first** (`CancelBookingModal`, shared by My
  Bookings and the booking detail page, replacing each one's own plain confirm dialog): it previews a full
  refund with enough notice, a reduced percentage inside the late-cancellation window, or refuses the
  cancellation outright once you're too close to pickup (inside the policy's hard cancellation deadline) —
  deliberately, so cancellation can't be used right up until pickup. Confirming now calls the backend's
  policy-aware cancel endpoint and shows the refund actually recorded, instead of just flipping the status.
- **My Bookings, Fleet Bookings and All Bookings now pick status from the same row of quick tabs**, each
  with its own icon (previously only My Bookings had tabs; Fleet Bookings and All Bookings used a Status
  dropdown buried in the filter bar) — status filtering now looks and works identically for a renter, an
  owner, and an admin.

## 2026-09-28 (bookings tables get a full filter bar; a way back to an unsigned contract)

- **My Bookings, Fleet Bookings and All Bookings now filter by status, When, trip type, mode, a pickup-date
  range and a vehicle name search — any combination at once** (`BookingFilters`, replacing the earlier
  When-only filter). All three pages share the one filter bar and keep it in the URL, so a filtered view is
  bookmarkable and survives a refresh; My Bookings and Fleet Bookings gained a Status filter they didn't have
  before (previously only All Bookings had one).
- **My Bookings now offers "Sign contract" on a booking you paid for but left before signing** — a stopgap for
  leaving the flow mid-session (closing the tab, switching device): it only appears when this same browser
  session drafted that contract, the same limitation the existing Unsigned/Signed PDF download links already
  have (see `docs/backend-requests.md` item 13 — the backend has no way to look up a contract by booking id
  otherwise).

## 2026-09-28 (bookings filterable by When; cart can be cleared; trip type limited to what the vehicle supports; stalled payment confirmation now says so)

- **Trip Type now only offers what the vehicle actually supports** (`AddToBookingPanel`/`TripTypeSelect`),
  instead of all 8 options regardless of the vehicle. Previously the backend's own enum for a vehicle's
  supported trip types (`GENERAL`, `CORPORATE`, …) didn't even match the booking form's own trip-type list
  (`CORPORATE_EVENT` instead of `CORPORATE`, no `GENERAL` at all) — fixed both the mismatch and the missing
  restriction, since picking an unsupported type surfaced as an unhelpful "Vehicle does not support the
  selected trip type" only after trying to book. A stale cart item that still picks an unsupported type (the
  vehicle's own list changed after it was added) now gets a specific message naming what it does support,
  both when adding to the cart and again at Checkout.
- **Your Booking and Checkout can now remove or clear a booking that's already started**, not just ones still
  pending — previously those cards showed no buttons at all. **Remove** on a started booking asks first (it
  stays in My Bookings, cancel it from there for real); **Clear booking** empties the whole list at once, same
  confirmation.
- **My Bookings, Fleet Bookings and All Bookings now have a "When" filter** — All time / Upcoming / Ongoing /
  Past — alongside All Bookings' existing status filter.
- **The Payment page no longer spins forever with no explanation.** After Pesapal doesn't confirm for about 30
  seconds, it now says "Still waiting on Pesapal" with a **Check again** button (re-checks status without
  starting a new payment), instead of an indistinguishable-from-broken spinner. Same fix for a combined
  (multi-vehicle) group payment.

## 2026-09-28 (the booking list table shows the pickup/return time too)

- **My Bookings, Fleet Bookings and All Bookings now show the pickup/return time under the date range** in
  the Dates column (e.g. "28 Sep 2026 – 04 Oct 2026 (7 days)" with "02:00 PM – 05:00 PM" underneath) —
  previously the time was only visible once a row was expanded. New `formatTime` helper in `lib/utils.js`.

## 2026-09-28 (booking cards show the pickup/return time, not just the date; Checkout gets an Edit button)

- **Your Booking and Checkout now show the exact pickup and return time**, not just the date — e.g. "28 Sep
  2026, 03:00 PM – 30 Sep 2026, 05:00 PM" instead of "28 Sep 2026 – 30 Sep 2026". A trip's time matters just
  as much as its date (see the stale-start-time fixes above), so it shouldn't be hidden until you dig into
  the date picker again.
- **Checkout now has an Edit button next to Remove** for any vehicle not yet booked (`BookingCheckoutPage`
  only had Remove before, unlike Your Booking) — including the vehicle flagged for a lapsed start time: you
  can fix its dates in place instead of removing it and starting over.

## 2026-09-28 (a dedicated landing page for Pesapal's return redirect)

- **New page, `/payment/success`.** Pesapal's own redirect back after checkout is a full page load — it
  doesn't carry `vehicleId` the way `/book/:vehicleId/payment` needs, so this reads `bookingId` from a
  `?bookingId=` query param first, falling back to a `lastCheckoutBookingId` `usePesapalCheckout` now stashes
  in sessionStorage right before sending the browser to Pesapal (mirroring how `PaymentPage.jsx` already
  mirrors `bookingId` for the same reason). It polls `GET /payments/pesapal/bookings/{bookingId}/status`
  (never infers success client-side, same rule the rest of the payment flow follows) and shows the same
  success/failed/pending panel `PaymentPage.jsx` uses: successful offers **Continue to Sign Contract** (the
  vehicle id for that route comes from the booking record, not the URL), failed offers **Try Again**
  (re-starts checkout for the same booking), pending keeps polling.
- This doesn't replace `PaymentPage.jsx`'s own return handling — both exist; which one Pesapal actually lands
  on depends on the backend's `PESAPAL_CALLBACK_URL` (backend-side config, not knowable from here — see
  `docs/backend-requests.md` item 15, which also found that starting Pesapal checkout at all currently 500s
  consistently, so this couldn't be exercised end-to-end against a real payment).

## 2026-09-28 (a booking's contract is now downloadable from the bookings list, not just its own page)

- **My Bookings, Fleet Bookings and All Bookings rows now show Unsigned/Signed PDF download links** in the
  expanded row, when this browser session has that contract's id — the same "Contract" section
  `BookingDetailPage` already had, now also in the list itself so it doesn't need a separate page visit.
  The lookup (`lib/contracts.js`'s `sessionContractId`) is shared between both places.

## 2026-09-28 (renters could not sign contracts at all — fixed; plus booking the same vehicle again)

- **Signing was completely broken.** `SignaturePage` read which contract to sign from `booking.contractId` —
  a field the live backend's `BookingResponse` doesn't have (confirmed against the swagger spec), so it was
  always `undefined` and the page could never load a contract, for anyone, ever. Fixed: the contract's id is
  now stashed in `sessionStorage` (keyed by booking id) the moment it's first drafted, the same pattern
  already used for `bookingId` to survive Pesapal's redirect — `SignaturePage` reads it from there instead.
  Confirmed live against the real backend that the stash captures a genuine contract id from the draft
  response. Logged as `docs/backend-requests.md` item 13 (the real fix is adding `contractId` to
  `BookingResponse`, or a way to look a contract up by booking id — this sessionStorage stash only lasts the
  session the contract was drafted in). A booking's own page also used the same broken field for its
  contract-download links; fixed the same way.
- **You can now book a vehicle again even if you already have a booking for it.** A vehicle's own page used
  to always treat re-adding it to your selection as *editing* the existing entry — including, incorrectly,
  keeping the old booking's id even after its dates were changed, so checkout would silently reuse the
  old, already-created booking instead of making a new one. Now: if that vehicle already has a real booking
  (not just an unsaved selection), the page shows **Book Again**, says the existing booking is safe, and
  choosing different dates starts a genuinely separate booking; re-adding it *unchanged* still just leaves
  the existing one as it was.

## 2026-09-28 (a second cause of the same "startTime: must be a future date" error)

The DateRangePicker fix earlier today stopped a *freshly chosen* date from defaulting to a past time, but
the same backend error ("Could not create your booking. bookings[0].startTime: must be a future date")
could still happen for a different reason: the cart is kept in `localStorage` across visits, so a trip's
start time — chosen whenever that vehicle was added, possibly in an earlier session — can quietly lapse
into the past before checkout is ever reached, with nothing catching it beforehand. Fixed in two places:

- **`BookingCheckoutPage`** now flags a cart item whose trip start time has already passed the same way it
  already flags an unavailable or no-longer-listed vehicle — a clear message next to that vehicle, and
  **Continue to contract** disabled until it's removed.
- **`useStartNextBooking`** (the hook both this page and `BookingConfirmPage`'s "Continue with the next
  vehicle" call) now checks every un-booked cart item for a lapsed start time before making any request at
  all, and refuses with a clear, attributed message instead of sending a request doomed to fail — this is
  the one that matters for `BookingConfirmPage`, which has no per-item list to show a problem against.

## 2026-09-28 (Inbox notifications show the vehicle and a clear action button)

- **A booking notification now shows that booking's vehicle photo.** The notification itself only carries a
  booking id (`referenceId`), not the vehicle or its photo — `NotificationVehiclePhoto` looks both up
  (`GET /bookings/{id}` then `GET /vehicles/{id}`) purely to render the thumbnail (the same generic
  silhouette used elsewhere for a vehicle with no uploaded photo, never a broken-image icon). A chat/other
  notification keeps its plain icon; there's nothing to picture there.
- **Every notification now has an explicit, labeled action button instead of the whole row being one plain
  link.** An owner's new-booking notification says **Review Booking** (that page is where Accept/Reject
  actually happens, via `BookingStatusControl` — the notification itself doesn't perform the action); any
  other booking notification says **View Booking**; a chat/message notification says **Reply**. A
  notification with nowhere to go (`notificationLink` returns null) gets a plain **Mark read** instead.

## 2026-09-28 (bugs found running a real booking end-to-end against the live backend)

Testing the full booking flow — log in, browse, pick dates, book, contract, cancel, rebook — against the
live backend (not mocks) surfaced two real bugs, both fixed:

- **Picking "Today" or a quick preset ("Next 3 Days" etc.) in the afternoon could make a booking
  un-creatable.** `DateRangePicker`'s presets default a same-day pickup to 09:00; picked after 9am, that
  `startTime` is already in the past, and the backend rejects it outright ("startTime: must be a future
  date") — reproduced live every time. Fixed in `DateRangePicker.jsx`: picking "today" now bumps the
  default pickup time forward to the next full hour instead of a fixed 09:00 (and nudges the return time
  forward too, if it would otherwise land before pickup on a same-day booking). A related but separate
  bug in the fix's first pass — every caller already seeds the picker's `startTime` prop with the plain
  09:00 default even before any date is chosen, which silently overrode the bump — is fixed alongside it.
- **My Bookings could hide a booking you'd just made.** Booking creation never invalidated the cached
  bookings list (default cache lifetime: 5 minutes), so going straight from checkout to My Bookings could
  show the pre-booking snapshot, missing the one just created. Fixed in `useBooking.js`
  (`useStartNextBooking`): the bookings cache is now invalidated the moment a booking is created, the same
  way cancelling or paying for one already did.

## 2026-09-28 (fixed a dead-end on the contract page)

- **Revisiting the contract step after it was already done no longer shows a raw, unrecoverable error.**
  `ContractPage` always requested a fresh contract draft on mount; the backend correctly refuses that once a
  booking's contract has already been accepted ("A contract draft can only be created for a pending booking"),
  which showed up as a plain error banner with a **Try again** that could only ever fail the same way. The page
  now recognizes that specific rejection and shows **Continue to payment** instead (or, for a cancelled booking,
  says so and offers **Browse other vehicles**).
- **The checkout flow's forward navigations now replace history** (`useAcceptContract`, `useSignContract`,
  `PaymentPage`, `GroupPaymentPage`) instead of pushing a new entry — the main way to land back on an
  already-accepted contract page was the browser's Back button, since none of these steps could be revisited on
  purpose. Back now skips over completed steps instead of landing on one.

## 2026-09-28 (booking rows expand in place, with a lot more detail)

- **My Bookings, Fleet Bookings and All Bookings rows now have a "View Details" button that expands the row in
  place** instead of navigating to a separate page — a first version of this did navigate, but that meant losing
  your place in the list, so it now stays on the same page (click again, or the row itself, to collapse it).
- **The expanded row shows much more than before:** a booking reference, exact pickup and drop-off times (not
  just the date range already in the row), duration, self-drive/chauffeured mode, trip type, the assigned
  chauffeur (chauffeured trips), overstay days/amount if any, renter notes, and — on Fleet Bookings/All Bookings
  — the renter's email. It also fetches the vehicle once a row is expanded (the booking itself doesn't carry
  these) to show the vehicle's pickup **location** and **registration number**, and, for a renter, the owner's
  email. A renter gets **Message the owner** and, while the booking is still Pending or Confirmed,
  **Cancel booking**, right there in the row; an owner or admin gets **Message the renter** (status changes for
  them still go through the booking's own page, via `BookingStatusControl`).
- A booking's own full page (`BookingDetailPage`/`OwnerBookingDetailPage`) is unchanged and still reachable from a
  notification about that booking.

## 2026-09-27 (when a booking turns out unavailable)

- **New: a clear "the owner couldn't fulfil this" flow.** A vehicle can be listed as available and still not be —
  a double booking, a mechanical issue, the owner simply not having updated it. If the owner declines the booking, or
  its 15-minute payment hold runs out, the renter now sees why (with the owner's note, if left), a **Message the
  owner** button and **Browse other vehicles** — on the contract, payment or signature step if they were still there,
  and on the booking's own page afterwards. A booking the renter cancelled themselves is unaffected — it keeps its
  plain Cancelled label.
- **Right before payment, the booking is checked once more.** So a renter can no longer pay into a booking the owner
  declined, or whose hold expired, moments earlier while they were reading the contract.
- **No automatic refund yet** if this happens after payment has already gone through — the backend has no refund
  endpoint. Added to `docs/backend-requests.md`, along with asking whether the backend prevents double-booked dates at
  all today.

## 2026-09-27 (booking flow: choose first, sign up at checkout)

- **The renter flow changed order.** You no longer need an account to choose a vehicle. New flow: browse → pick dates
  and mode on the vehicle's page → **Add to booking** → **Your Booking** (`/booking`) → **Book** → share a phone number
  or email (`/booking/contact`, visitors only) → **Checkout** (`/booking/checkout`) → sign up, verify email, log in (you
  land back on checkout) → documents → the owner's contract → pay → sign. Renter Guide steps rewritten (there are now 11)
  and the flowchart redrawn.
- **Several vehicles in one booking.** Each has its own dates; **Your Booking** shows days × price per vehicle and the
  estimated total. The backend takes one vehicle per booking, so the contract, payment and signature are done one vehicle
  at a time ("Continue with the next vehicle"). A combined payment needs a backend change — see the new
  `docs/backend-requests.md`.
- **Price by days.** The price shown before a booking exists is an estimate: days × daily price, every started 24 hours
  counting as a day, minimum one. The backend confirms the real amount when the booking is created.
- **Contract review moved next to payment.** It can't be shown before sign-up (an owner's contract only exists once a
  booking does), so it is read and accepted just before paying.
- **New top-bar shopping-bag icon** with the number of vehicles, for everyone, once something has been added.
- **"Book Now" and the one-vehicle wizard are gone.** `/book/:vehicleId` now opens the vehicle's page. The document
  check moved to checkout (ID always; licence too when any vehicle is self-drive).
- `docs/design.md` routes, component tree and flows updated to match.

## 2026-09-25 (windows that scroll; a compact permission grid)

- **Fixed: tall pop-up windows couldn't scroll.** The shared window had no maximum height, so anything taller than the screen ran off it
  and the buttons were unreachable. It now fits the screen, and its body scrolls while the title and Close button stay put. This
  fixes every tall window (the role editor, photo galleries, the sticker check, the user editor…).
- **The role editor's permission list is now a compact grid** — one row per area, one column per action (Read, Create, Update,
  Delete, Manage) and a **More** cell for the rest — instead of a long stack of boxes. Row and column boxes pick a whole area or a
  whole action at once, and the **Save role** buttons are pinned to the bottom of the window.

## 2026-09-25 (replace and remove vehicle photos)

- **The backend added `DELETE /vehicles/{id}/photos/{photoId}`, and the edit-vehicle page now uses it.** Each current photo has
  **Replace** and **Remove** (Remove asks first). Replace uploads the new photo first, then deletes the old one, so nothing is
  lost if a step fails; the new photo keeps the old one's angle. These act immediately, not on Save. Only photos whose id the
  portal knows (uploaded from this browser) can be changed, because the backend still has no list of a vehicle's photos.

## 2026-09-25 (Approved Vehicles and Rejected Vehicles)

- **Two new pages, one for each outcome:** **Approved Vehicles** (`/admin/vehicles/approved`) and **Rejected Vehicles**
  (`/admin/vehicles/rejected`). Each lists every vehicle with that status (with the owner's rejection note), has a count,
  a search and pagination, and lets you change a decision on the spot. They are complete lists — the backend lists vehicles by
  status — unlike the document pages.
- **New menu heading: Vehicles** — All Vehicles, Add Vehicle, Vehicle Approvals, Approved Vehicles, Rejected Vehicles (All
  Vehicles, Add Vehicle and Vehicle Approvals moved here from Administration). On Vehicle Approvals the Approved / Rejected
  tiles now link to the new pages.

## 2026-09-24 (roles & permissions, approvals redesign, and a backend problem)

- **The backend is currently refusing your login token everywhere.** Checked live: the public vehicle list answers 200 with
  no token and **403 as soon as the token is attached**, and `GET /users/me`, the user list and every admin call also answer
  403. Login itself works, but the token it issues now carries a new set of roles (`READ`, `CREATE`, `UPDATE`, `DELETE`) and
  31 permissions, and the server refuses it. This began with the backend release that added roles and permissions, after
  your screenshot was taken, so **approving a vehicle fails with 403 — it isn't the button**. Nothing in the portal can
  fix it; the backend team needs to look at how the login token is built and checked. The portal now says so in words
  ("The server refused it (403) — your account may not have permission…") instead of "server responded 403".
- **New endpoints used — roles and permissions.** New admin page **Roles & Permissions** (`/roles`, `/permissions`): edit what
  each role can do (permissions grouped, select-all per group), create/delete roles, create/edit/delete permissions. The
  user editor now offers the roles that really exist, and a user's page shows their **Permissions**. This is what was asked
  for as "add or remove roles and permissions" — except that removing a role *from a person* still has no backend call.
- **Vehicle Approvals redesigned:** a modern card layout (photo, price, key-fact pills, insurance strip), counts per group,
  tabs, search, and **pagination** (five to a page). **All Vehicles** is paginated too (ten to a page). The pagination is a
  shared widget (`Pagination` + `usePagination`).
- The announcements permissions (`ANNOUNCEMENT_*`) exist on the token but the spec still has no announcement endpoints, so
  Announcements still uses direct messages.

## 2026-09-24 (the backend added vehicle approval; vehicle editing)

Re-read the live spec after the backend changed: **six new endpoints** and new vehicle fields, all now used.
- **Vehicle approval.** Vehicles now carry `approvalStatus` (`PENDING`, `APPROVED`, `REJECTED`), notes, who decided and when. New
  admin page **Vehicle Approvals** (`GET /vehicles/admin/all`, `PUT /vehicles/admin/{id}/review`): details, photos, insurance
  sticker with the QR check, Approve/Reject with a note, reversible. The public list now shows only approved vehicles, so the
  two existing vehicles (which have no status) show as "Not approved yet" until approved.
- **Owners see it too:** each vehicle card says *Awaiting approval* / *Not approved yet* / the rejection reason.
- **My Vehicles now uses `GET /vehicles/me`**, replacing the workaround built from bookings, documents and browser memory.
- **All Vehicles now uses `GET /vehicles/admin/all`** (every vehicle, including switched-off ones) and has an **Approval**
  column and an **Edit** button; the platform report has an **Awaiting approval** tile.
- **Edit vehicle** (new, for owners and admins): change any detail, replace the insurance sticker, add photos (the backend
  has no photo delete). Answering "why can't I update vehicle images" — there was simply no edit page until now.
- The add-vehicle confirmation no longer says the vehicle is "live"; it says it was sent for approval.
- Not used: `PUT /vehicles/{id}/review` has no screen (the hook exists; the spec doesn't say who beyond an administrator may
  use it), `GET /vehicles/admin` duplicates `/vehicles/admin/all`, and `POST /vehicles` duplicates `create-vehicle`.

## 2026-09-24 (document decisions: what "not saved" was, fleet menu, emails)

- **Document decisions ARE saved — the Approved/Rejected pages just couldn't list them.** Checked live: the backend
  holds an approved passport and a rejected ID. The pages only showed decisions recorded in this browser, so
  earlier ones looked missing. They now also list the reviewer's **own** decided documents (the backend reports
  those), and say plainly that other people's decided documents are saved but can't be listed.
- **A super admin who owns nothing no longer gets a fleet menu.** The backend puts a fleet-manager (`MANAGE`) role in
  a super admin's login token whether or not they own anything, and the portal took that as owning vehicles, so
  **My Fleet** (My Vehicles, Fleet Bookings) and the avatar menu's **Owner Panel** showed. For administrators only a
  real car-owner role now counts.
- **Announcements can also go by email.** The backend can't send email, so the page prepares it: a subject box, and
  a button that opens your own email app with the message written and everyone in Bcc (split into several emails
  if the list is long), plus **Copy all addresses**. It's sent from your own email address.

## 2026-09-24 (vehicle photos in All Vehicles)

- **All Vehicles now shows a photo thumbnail** for each vehicle (click for all its photos), or a placeholder that
  says no photo is available. Explained in the Administrator Guide why photos are often missing: the backend
  returns no photos with a vehicle (its photo-list call answers 500 and a photo's address is only revealed to the
  uploader), so only photos uploaded from the same browser can be shown; the insurance sticker, which is saved on
  the vehicle, shows for any vehicle that has one.

## 2026-09-24 (platform report, QR check, Edit user, announcements, new message)

- **New message.** Administrators get a **New message** button on the Messages page: search for a person, pick
  them, write, send (`POST /chat/messages`), and land in that conversation. Phone numbers are removed. Only
  administrators get it, since finding a person uses the administrator's account list. Documented in the Messages
  paragraph of the Overview.

- **The platform report now covers people and vehicles** — and who has **signed in recently** (last 60 minutes,
  and 24 hours), with each person's last sign-in. It is labelled honestly: the backend has no "online now" and no
  sign-out record, so it is "signed in within the last hour", read from the audit log.
- **Insurance sticker QR check.** Opening a sticker reads its QR code automatically (new dependency: `jsqr`) and
  shows the text, whether the registration appears in it, and a link if it's a web address. The AKI verifier still
  has to give the validity answer; the panel says so and points to it.
- **Edit is now a real editor, not only roles**: an *Account active* switch and the role cards, plus a plain note
  that permissions come with the role (no permission endpoints exist in the spec) and that personal details are
  the person's own to change (`PATCH /users/me` is self-only). The list and account-page buttons are now just
  **Edit**. A **Message** button on the account page opens a direct conversation.
- **Announcements** — new page: one message to everyone / renters / owners / fleet managers / administrators,
  sent as direct messages one at a time (the backend has no broadcast), with confirmation, progress, stop and retry.

## 2026-09-24 (every remaining API in the spec is now used)

Compared the live spec (re-downloaded) with what the portal calls. Newly used:
- **Audit Log** (admin) — new page from four *new* endpoints (`/admin/audit-logs`, `/audit-logs`, and by id); the
  personal version powers **Recent activity** on the Profile page.
- **Security on the Profile page** — change password and two-factor sign-in.
- **Reviews** — a renter can review a completed booking; reviews show on the vehicle page and (with complaints,
  admin only) on an owner's account page.
- **Booking status** — renters can cancel a Pending/Confirmed booking; owners and admins can update a booking's
  status; and **Record a payment** (manual payment confirmation).
- **Owner contract templates** — new owner page **Contract Templates** (`/owner/contracts`).
- **Admin insurance review** — an Insurance column and sticker viewer on All Vehicles, and the vehicle shown on
  vehicle-related documents.
- Not used on purpose: the Pesapal IPN callback (`GET/POST /payments/pesapal/ipn`) is the payment provider calling
  the backend, never a browser; and `POST /auth/verify-code`, which duplicates `verify-email` / `verify-whatsapp`
  that the verify page already uses.

## 2026-09-24 (reversing document decisions; icons on menu groups)

- **Approved Documents and Rejected Documents** are new pages (under a new **Documents** menu heading, next to
  Review Documents). Each shows the decided document again and lets an administrator reverse the decision:
  **Reject instead** / **Approve instead**, or **Back to pending**. Because the backend has no list of decided
  documents, these pages show the decisions made from this browser (remembered locally); this limitation is
  written in the guide and on the pages.
- **Menu group headings now have icons** (Administration, Documents, My Fleet, My Rentals).
- Review Documents (the pending page) now points to the two new pages. Added them to the Administrator Guide.

## 2026-09-24 (document previews, Edit roles, redesigned user page, grouped menus)

- **Documents are previewed on the review card.** Each pending document now shows the file itself (picture or
  PDF) next to its Approve / Reject buttons, with **View full size** for a closer look. (The file endpoint
  answers "octet-stream", so the portal re-labels the file with the type on its record to make PDFs display.)
- **Edit roles.** Every row of the Users list has an **Edit roles** button (pencil) that opens a window showing
  the account's current roles and a card for each role to give; the same button is in the account page's header.
  Replaced the plain role drop-down.
- **User page redesigned.** Header with photo/initials, name, roles, status and the actions; at-a-glance chips;
  grouped icon cards (Contact, Account, Business, Payouts); an **Identity on file** card showing any ID or
  licence pictures on the profile.
- **Grouped menus for two-role accounts.** An administrator's menu now has an **Administration** heading, and a
  **My Fleet** heading if they also own vehicles; an owner who also rents gets **My Fleet** and **My Rentals**.
  Headings fold and open; the one holding the current page is open. Overview, Profile, Messages and Inbox stay
  at the top. Updated the Administrator Guide and the Overview.

## 2026-09-24 (simpler sign-in, visible Log In button, real admin pages)

- **Sign-in no longer asks "Log in as".** The login form (and the two-factor step) is email and password only;
  the account's roles decide where you land — administrators and super admins on the Admin Panel, owners on the
  Owner Panel (or the renter Dashboard if that is the side they used last on this browser), everyone else on the
  renter Dashboard. The portal now remembers the last side per person. Rewrote "Log in as a renter or a car
  owner" as "How signing in works" and removed the place that said to "log in again choosing Car Owner".
- **"Rent Out My Car" now starts owner onboarding.** With the "Log in as" choice gone, the button opens Register
  with `?as=owner`; that is remembered (for the browser tab, until the next login), and the next login opens the
  Owner Panel's setup steps. Updated the Car Owner guide's first paragraph. An account that is already signed in
  and has no owner role has no button for this (signed-in people are never shown "Rent Out My Car") — it can
  still reach `/owner` by address.
- **A Log In button is always visible to visitors** — first in the top bar's button group, and on phones in the
  bar beside the menu icon (not only inside the drawer).
- **Administrator Guide rewritten against the live spec.** New pages: **Users** (list, search, filter by role,
  give a role, enable/disable, delete), **Review Documents** (approve/reject with notes, open the file),
  **All Vehicles** (put on/off the market, remove). **Contract Templates** now uses the real endpoints
  (name, version, status; approve/reject; new versions instead of edit/delete). **All Bookings** is built
  from the admin report because the backend has no "all bookings" endpoint. **Admin Overview** and **Reports**
  read the report's real fields (they were reading fields that don't exist, so they always showed zero).
  Added the new pages to the Admin menu (filtered by permission) and the Quick Reference.

## 2026-09-24 (left menu follows permissions)

- **The left menu now shows only the items the signed-in account's permissions allow**, on top of picking the
  menu by role. The permissions come from the login token (checked live for felixwanzetse@gmail.com:
  `BOOKING_READ`, `VEHICLE_CREATE`, `DOCUMENT_UPLOAD` and so on). Added a paragraph after the "left menu is on
  every page" paragraph listing which permission unlocks which item, and the fallback (no permission list in the
  token → role only).

## 2026-09-24 (search filters no longer wiped by the search box)

- **Fixed a filter being cleared right after the search page loaded.** The search box wrote its (empty) text back
  to the page address about 0.3 seconds after loading, using an out-of-date copy of the address, so a place or
  price you picked in that moment disappeared. It now reads the current address and writes nothing when the
  box already matches it.

## 2026-09-24 (super admin recognised)

- **Fixed a super admin not getting the admin menus.** The backend names this account's roles `SUPER_ADMIN`,
  `MANAGE` and `CAR_OWNER` (checked live, and the admin endpoints all answer for it), but the portal only knew
  `ADMIN` / `MANAGER` / `OWNER`, so it treated the account as a plain owner. `SUPER_ADMIN` now counts as
  Administrator and `MANAGE` as Fleet Manager, so the Admin Panel menu, the admin pages and the Administrator
  badge appear. An administrator who also owns vehicles has **My Vehicles** and **Fleet Bookings** in the Admin
  menu, and login opens the Admin Panel. Updated the guide.

## 2026-09-24 (photo backgrounds on login and registration)

- **The login and registration pages now sit on a full-page photo** — one of the destination photos the site
  already uses (the Nairobi skyline for login, Diani beach for registration) — under a dark overlay, with the form
  card slightly see-through so it stays easy to read.

## 2026-09-24 (no second logo on the sign-in pages)

- **Removed the extra logo from the login page** (and, for the same reason, the register, verify-email and
  two-factor pages): the top bar already shows the logo at the top left, so the card no longer repeats it.

## 2026-09-24 (WhatsApp verification hidden)

- **WhatsApp verification is hidden for now.** Registration goes back to name, email and password with the
  code sent by email, and the verify page has no WhatsApp option. The feature is still in the code, switched
  off by `VITE_ENABLE_WHATSAPP_VERIFICATION` (off unless set to `true`), so turning it on later needs no
  rebuild of the feature. Reverted Renter steps 1–2 and the sign-up diagram; the earlier WhatsApp entry below
  describes what it does when switched on.

## 2026-09-24 (no "Rent Out My Car" for a signed-in renter)

- **Removed "Rent Out My Car" from the renter's left menu.** A signed-in person shouldn't be shown "Rent a Car" or
  "Rent Out My Car" anywhere (they were already gone from the top bar); the menu still had it as a way in to
  becoming an owner. A renter who wants to list a car now chooses **Car Owner** on the login page. Accounts that
  already own vehicles keep the **Switch to Car Owner / Switch to Renter** item.

## 2026-09-24 (log in as a renter or a car owner)

- **The login page now asks "Log in as": Car Renter or Car Owner.** The account is the same; the choice opens the
  right side of the portal — the renter Dashboard or the Owner Panel — with the matching left menu (kept through
  two-factor login too). The backend's login is unchanged (email and password only).
- **Switch without logging in again:** an account that owns vehicles gets **Switch to Renter** in the Owner
  Panel menu and **Switch to Car Owner** in the renter menu. Opening an Owner Panel page also puts an owner
  back in owner mode. The menu still never depends on the page — only on who you are and the side you chose.
- Updated the Overview and the left-menu paragraph.

## 2026-09-24 (WhatsApp verification; search by location; price slider)

- **Verify on WhatsApp.** The backend now has WhatsApp verification, so **Register** asks how to send
  your code — **Email** (default) or **WhatsApp** (then a WhatsApp number is required). The verify page
  works for either: it verifies through the matching backend call, resends the same way, and can switch
  ("Get the code on WhatsApp instead" / "…by email instead"). Tested against the live backend: an account
  is found by its email (a phone number must match exactly as stored, so the app always uses the email),
  and wrong or expired codes come back as "Invalid or expired verification code". Updated Renter steps 1–2
  and the sign-up flow diagram.
- **Vehicles available by location.** The search page's filter panel now has **Available in**: every place
  with available vehicles and how many are in each (click to filter). When results span more than one place
  they're shown place by place under a heading.
- **Price range is now a slider** (two handles, keyboard-friendly), from KES 0 up to just above the dearest
  available vehicle, replacing the Min / Max boxes. The results update when you let go of a handle.

## 2026-09-24 (one consistent left menu)

- **Fixed the menu changing between pages.** It used to depend on which section a page belonged to, so an
  owner clicking *Profile* or *Documents* (which are in the renter's dashboard section) suddenly got the
  renter menu. Now the menu depends only on your roles — admin, owner (plus *My Bookings* if you also rent),
  or renter — and is identical on every page.

## 2026-09-24 (logo over the menu, Profile below Overview)

- **Signed in, the top-bar logo now sits exactly at the top of the left menu** — the top bar runs the full
  width and the logo fills a column the same width as the menu, with the same divider — while staying on the
  same line as About and Contact. Visitors keep the centred top bar.
- **Profile is now the item right below Overview** in the renter, owner and admin menus (it used to be near
  the bottom).

## 2026-09-24 (left menu on every page when signed in)

- **The left menu is now on every page for a signed-in person** — browsing vehicles, a vehicle's page, the
  home page, About, Contact, FAQ, the booking steps, Inbox and Messages — not just the dashboard sections.
  It keeps the menu you were last in (renter, owner or admin). Visitors don't get it. Added a line to the
  Overview.

## 2026-09-24 (logo top left, About and Contact at the far right)

- **The logo is back in the top bar, always at the top left** (on the same line as the other items), and it is
  no longer repeated at the top of the left menu, which now starts with your profile photo and name. This
  replaces the earlier "logo above the profile photo" arrangement.
- **About and Contact moved to the very end on the right**, after the buttons (or the messages/inbox icons
  and avatar). Updated the Overview paragraph.

## 2026-09-24 (chat and notifications now use the backend)

- The backend now has **notification and chat APIs**, so the portal uses them. The Inbox is the
  backend's notifications (list, unread count, mark one / all read) instead of the version built from
  bookings — the owner is notified by the backend when a renter books their vehicle. The bell shows the
  backend's unread count and refreshes every 30 seconds.
- **New Messages** (`/messages`): a list of conversations and a chat screen for each — two-way messages
  between renter and owner, per booking (**Message the owner** / **Message the renter** buttons on the
  booking pages). Unread counts show on a new speech-bubble icon in the top bar and on *Messages* and
  *Inbox* in the side menu. Sending to yourself is refused by the backend.
- **Phone numbers are still stripped** everywhere a message or notification is written or shown (the
  backend doesn't check). The "we removed a number" notice now stays while you keep typing.
- Replaced the earlier Inbox and messaging notes in the guide.

## 2026-09-24 (menu stays on Inbox, top bar and logo)

- **The left menu no longer disappears on the Inbox.** The Inbox opens inside the same menu you were
  in (renter, owner or admin) — it was a full-width page before.
- **About and Contact moved to the right** of the top bar, before a divider and the bell/avatar (or
  the two buttons for a visitor); the logo is alone on the left.
- **The logo is at the top of the left menu, just above your profile photo.** While the left menu is
  showing, the top bar hides its own logo on wide screens so there's only one. Updated the Overview.

## 2026-09-24 (inbox, notifications, no phone numbers)

- **Signed-in people no longer see "Rent a Car" / "Rent Out My Car"** in the top bar (or the mobile
  menu); they see a notification bell and their avatar instead. Visitors still see the two buttons.
- **New Inbox** (`/inbox`, bell in the top bar, *Inbox* in every side menu): an owner is notified when
  a renter books their vehicle and as that booking moves on; a renter is notified as their booking
  progresses and when a chauffeur is assigned. Built from the person's bookings (the backend has no
  notification or messaging service), checked every minute; read state is kept in the browser.
- **Phone numbers are stripped** from what one person can show another: `07…`, `01…`/`011…`,
  country-code numbers (`+254`, `00254`, `254`, other `+` codes), spelled-out digits — replaced with
  "[phone number removed]" as it's typed, when the booking is sent, and when it's displayed
  (including in the Inbox). Dates, times and prices are left alone.
- Two-way messaging is **not built** — it needs message endpoints on the backend.
- Updated the top-bar paragraph in the Overview.

## 2026-09-24 (top bar and side menu layout)

- **Top bar simplified:** removed the *Vehicles* and *Services* menus (browse with **Rent a Car**;
  Services is still in the footer). The logo now has *About* and *Contact* beside it, and the
  account avatar moved to the far right after the two buttons.
- **Side menu:** it now starts with your profile photo and name (linking to Profile) instead of a
  second copy of the logo. Updated the Overview paragraph about the navbar.

## 2026-09-24 (re-check after the backend fix)

- Re-tested the live backend. **Fixed on the backend:** vehicles now store availability, air
  conditioning, insurance, the date window and the sticker photo; visitors can browse without
  logging in; saving name/phone/location works. Replaced the three "known backend issue"
  notes to match, and corrected the Renter step that says you can browse before logging in
  (that is true again).
- **Still open on the backend:** a switched-off vehicle isn't returned by the owner filter,
  photos can't be listed, an owner can't delete a vehicle, and the "profile complete" flag
  stays off.
- Added the profile's new **Middle Name** field (in the backend definition, optional, up to
  100 characters) to the personal-details step.

## 2026-09-24 (vehicle search shows current cars)

- Checked the live backend: an available vehicle *is* returned for a signed-in person. To make
  sure the search page never shows an out-of-date list, vehicle lists are now fetched fresh
  each time they are opened (before, a copy up to 5 minutes old — including one fetched while
  the backend was down or empty — could be shown).
- The backend refuses vehicle lists to visitors who aren't signed in (403); Browse Vehicles now
  says "Please log in to browse vehicles" instead of the misleading "check your connection".
  Noted this in the Renter guide, since it contradicts "browse before you log in".

## 2026-09-24 (account type no longer asked again)

- **Fixed the portal asking for Individual / Business over and over.** Tested live: the
  account type does save (`ownerType: INDIVIDUAL`), but the backend's own "profile
  complete" flag stays off, and the portal was waiting on that flag. The account-details
  step, the banner and the documents check now go by whether an account type is saved, so
  once it is, it isn't asked for again. Updated the guided-setup Profile step and the Car
  Owner guide.

## 2026-09-24 (live test of vehicle add/update)

- Tested the vehicle add and update calls against the live backend with a real account and
  recorded what it does in a "Known backend issue" note in the Car Owner guide: it accepts the
  availability, air-conditioning, insurance, date-window and sticker fields but doesn't store
  them, so a new vehicle stays unavailable. The portal now always sends the three yes/no
  fields the backend insists on (it answers 400 without them), and the sticker upload reports
  honestly when the server doesn't keep the photo.

## 2026-09-24 (availability switch fix, owner filter)

- **The availability switch now moves immediately** when clicked (before it waited for the
  backend and looked frozen). If the request fails, or the backend answers OK but leaves the
  value unchanged, the switch goes back and a message says so.
- **My Vehicles now asks the backend for just your vehicles** using its `ownerId` filter
  (added to the backend definition), keeping the older lookups as a safety net. Replaced the
  outdated "no my vehicles endpoint" limitation note.

## 2026-09-24 (availability switch everywhere, search hides unavailable)

- The **Available for booking** on/off switch is now also on the owner's Fleet Overview
  preview and on the owner's own vehicle page (it was only on My Vehicles), with a short
  "On — renters can book it / Off — renters can't see it" line.
- **Only the public search and fleet pages hide unavailable vehicles** (so nobody is offered a
  car they can't book); owner screens keep every vehicle. Added a bullet to the Car Owner list.

## 2026-09-24 (vehicle page, own-vehicle booking, availability)

- **An owner can no longer book their own vehicle.** On the vehicle's page "Book Now" is
  replaced by a note and a My Vehicles link, and the booking page itself refuses it too.
- **The vehicle page now shows all the details** the backend gives: colour, air conditioning,
  comprehensive insurance, the trip types it suits, and when it's available. The owner also
  sees the registration number, VIN and insurance sticker there (renters don't).
- **New availability choice when adding a vehicle:** *Always available* or *Only on specific
  dates* — for specific dates, a start and an end, each with a date and a time, are mandatory
  (your product rule). The booking wizard now stops a renter choosing dates outside that
  window. Updated the Car Owner "Add your first vehicle" step, the Renter "Browse vehicles"
  step, and the Car Owner list.

## 2026-09-24 (registration and setup steps)

- **Removed Individual / Business from the registration form** — it was redundant, because
  the same choice is made in the profile's account-details step. Registration now asks
  only for name, email and password. Updated the Overview, the guided-setup Profile step,
  the Renter and Car Owner steps, and the sign-up flow diagram.
- **The setup steps no longer start over.** The setup window and the Profile page open on
  the first step that is still unfinished, and after saving a step they go to the next step
  not yet done (skipping finished ones) instead of just the next in line. The step bar
  ticks finished steps, every step can be opened (finished or not) to edit later, and
  "Skip this step" is now **Do this later**. When nothing is left the window closes by
  itself, and the Profile page says everything is set up. Added a paragraph to the
  guided-setup section and updated the Profile description.

## 2026-09-24 (vehicle fields aligned with the backend)

- Re-checked the add-vehicle form against the live backend definition and added the
  vehicle fields it now supports: **Working air conditioning** and an optional
  **Available from / Available until** window (both optional), plus **Comprehensive
  insurance**. These are also shown on My Vehicles and on
  the vehicle's detail page, and are kept when you flip the availability switch.
  Updated the Car Owner guide's "Add your first vehicle" step and the My Vehicles
  bullet. **Comprehensive insurance and an uploaded photo of the insurance sticker are
  mandatory** (your product rule — we don't allow vehicles without comprehensive
  insurance; the backend definition doesn't require either). The photo is uploaded
  after the vehicle is created, with a **Try again** button if that upload fails, and
  a thumbnail appears on My Vehicles.

## 2026-09-23 (phone number mandatory)

- **The phone number is now mandatory** on the profile (your product rule — the backend
  definition doesn't require it). Marked with `*`; the form won't save without it, and
  the setup window and banner prompt for it while it's empty, even after the backend's own
  "profile complete" flag is true. Nothing else is mandatory. Updated the guided-setup
  Profile step.

## 2026-09-23 (profile fields aligned to the backend spec)

The backend's API definition changed: `ProfileRequest` now also has ID number,
ID front/back links, and a profile photo link, and **nothing** is marked required on
either the profile or the owner-profile request any more.

- **Reverted the mandatory-field rules** added earlier the same day (phone, location,
  business name, phone-number format check, `*` markers, the "still required" reminders
  and the "continue without saving" button). The forms now enforce only what the
  backend's definition says — its length limits.
- **Car owners and renters now see identical profile fields**: first name, last name,
  phone, location, **ID number** (new), payout provider and account reference (now shown
  to renters too, since both use the same backend call), and the Business fields for a
  Business. Documented in the guided-setup Profile step and the Car Owner guide.
- The ID number moved off the National ID upload (where it had been sent as an extra,
  undocumented form part) onto the profile, where the definition puts it.
- Documented why ID front/back and profile photo aren't offered (they take links).
- When the account type saves but the personal details are refused, the setup window
  stays on the profile step so the error stays visible, with "Continue to the next
  step". Reworded the known-backend-issue note accordingly.

## 2026-09-23 (optional business documents, renter-only licence, photo guide, signed-out landing)

- **Business documents are now optional.** A business doesn't have to be a limited
  company, so only the business name is compulsory; registration number, tax number,
  address, the Business Registration Certificate, and the Tax Certificate are all
  optional. The identity document is now the only required upload for any account
  type. Updated the guided-setup Documents step, the Renter and Owner guides, and the
  sign-up form note.
- **Driving Licence is renter-only.** It's only listed for accounts that rent cars
  (Renter role / `isCarRenter`); owner-only accounts no longer see it. Updated the
  guided-setup Documents step and the Renter and Owner guides.
- **Guided vehicle photos.** Documented the new per-angle photo slots on the add-vehicle
  form (front, back, left, right, interior front, interior back seats), the framing
  tips and car diagrams, the progress counter, and that uploads are named by angle.
  The photo endpoint accepts only a file (no angle field), so the angle is kept in the
  file name.
- **Signed-out visitors land on the main page.** Added a "Not signed in?" paragraph:
  opening/refreshing a signed-in page while signed out, or an expired session, now
  goes to `/` instead of the login form.

## 2026-09-23 (profile rebuilt against the live backend)

Re-checked the OpenAPI spec and tested the live backend with a real account, and
found the earlier setup flow was built on wrong assumptions. Changes to the guide:

- **Sign-up now asks Individual or Business.** The backend's register call has no
  such field, so the choice is remembered in the browser and pre-selects the
  profile form after login. Documented in the Overview, Renter Guide, and the
  Overview diagram.
- **Rewrote "Guided setup"** as three steps: Profile → Documents → Vehicle. Live
  test showed that saving the account type (`PUT /users/me/owner-profile`) is what
  flips the backend's `hasCompletedProfile` flag — not the name/phone form the
  previous version described.
- **Documented the fields and documents per account type.** Business: business
  name, registration number, tax number, address, plus registration and tax
  certificates (the backend rejects those unless the profile is Business). Everyone:
  National ID or Passport; optional Driving Licence and Proof of Address. Owners:
  optional payout details. Document types were found by probing the live backend;
  the spec only says "string".
- **Replaced the old "known backend issue" callout.** `GET /vehicles` and
  `GET /documents` were said to return 500; on retest the vehicle list works and the
  document list only failed because the portal called the wrong URL
  (`/documents` instead of `/documents/me`), which is now fixed. The real fault is
  `PATCH /users/me` returning 500 for valid input, now documented instead.
- Added a note that the backend's `CAR_OWNER` role is treated as Owner.
- **Softened the "Car Owner is self-service" claim.** The live test account held the
  `CAR_OWNER` role before it had any owner profile, so the earlier finding (saving
  the owner profile grants the role) can't be relied on any more. Reworded the
  Overview, Car Owner Guide, and Quick Reference to say it's unconfirmed.
- Noted that Profile and Documents are now in the Owner Panel sidebar.

## 2026-09-23 (guided setup at sign-in)

- Replaced the passive-banner-only description of the setup prompts with the new
  **guided setup window** that opens immediately after sign-in (profile form inline,
  then the add-vehicle step for car owners, with "Remind me later"). The banner is
  kept as the fallback reminder and is still documented.
- Documented that profile save failures now show the backend's actual error message
  (in the window and on the Profile page) rather than a generic one, and that a
  successful save which the backend still marks incomplete is called out.

## 2026-09-23 (owner vehicles + setup prompts)

Checked the live OpenAPI spec first: there is still no `GET /vehicles/mine`, but
`GET /users/me` (`UserResponse`) now carries `hasCompletedProfile`,
`hasAddedVehicleToProfile`, and `isCarOwner`. Documented the features built on
them:

- Added the **"Finish setting up" prompts** paragraph to the Overview — the
  banner under the navbar that asks any signed-in user with an incomplete profile
  to complete it, and asks car owners with no vehicle to add one (where each link
  goes, when it hides, that it can be dismissed for the session).
- Car Owner Guide: the Fleet Overview now previews your vehicles, and there's a new
  **My Vehicles** page (`/owner/vehicles`, in the sidebar). The "vehicle added"
  step now follows the backend's `hasAddedVehicleToProfile` flag. Added the new
  page to the Owner flow diagram and the Quick Reference table.
- Added a **Limitation** note under the Owner diagram: My Vehicles is derived by
  filtering the public vehicle list by owner email (no dedicated endpoint), and
  that list only returns available vehicles.

## 2026-09-22 (profile picture)

- Documented the new profile picture upload on `/dashboard/profile` (click the
  camera icon on the avatar). Checked the live OpenAPI spec first — there's no
  backend endpoint to actually store a user avatar (only `/vehicles/{id}/photos`
  for vehicle listings exists), so this is implemented as local-only storage in
  the browser (`localStorage`, keyed per user id) rather than a real upload.
  Noted that explicitly in the guide so it isn't mistaken for something that
  syncs across devices.

## 2026-09-22 (live test findings)

Ran end-to-end test automation against the real backend
(`http://192.168.8.11:8080`) using a real account, and fixed what turned out to
be broken:

- **Corrected the Owner role model — it's self-service, not admin-granted.**
  Live-tested: calling `PUT /users/me/owner-profile` (the guide's "Complete your
  profile" step) with a RENTER-only account immediately came back with
  `roles: ["OWNER", "RENTER"]` — no administrator involved. Fleet Manager and
  Administrator are still not self-service. Updated the Overview, Car Owner
  Guide, Administrator Guide, Quick Reference, and the Owner flow diagram to
  reflect this. This also explained the reported bug ("nothing tells an owner to
  add docs and vehicles"): `/owner` was gated behind already holding the
  Owner/Manager role, so nobody could ever reach the very step that grants it —
  fixed in `App.jsx` (`/owner` now only requires being signed in; the deeper
  owner routes still require the role, which is present client-side by the time
  they're reached).
- **Corrected the email verification step.** It's a short numeric code emailed
  to you, not a clickable link — confirmed live: `POST /auth/verify-email` takes
  `{ email, code }` and rejects a bare token. Updated the Renter Guide's step 2
  and its flow diagram.
- **Documented a known backend bug**, added as a callout under the Owner flow
  diagram: `GET /vehicles` and `GET /documents` both return `500` on the real
  backend for an authenticated request (and `GET /vehicles` returns `403`
  unauthenticated, despite vehicle browsing being meant to be public). Not
  fixable from this frontend repo — flagged for whoever owns the backend.

## 2026-09-22 (navbar CTAs)

- Documented the new **Rent a Car** and **Rent Out My Car** buttons added to the
  navbar (desktop and mobile drawer): Rent a Car always goes to `/vehicles`; Rent
  Out My Car goes to Register when signed out, or straight to `/owner` when signed
  in (still subject to the centralized role-assignment rule — no role yet means a
  bounce back to the dashboard, not a new page). Added a mention in the Overview,
  a line in the Renter Guide, and a line in the Car Owner / Fleet Manager Guide.

## 2026-09-22

- **Corrected the sign-up/role model.** The guide previously said only Renters
  could self-register and that Car Owner, Fleet Manager, and Administrator accounts
  were created separately without going through public sign-up. That was wrong:
  every account registers through the same public sign-up form
  (`/auth/register`); Renter, Car Owner, Fleet Manager, and Administrator are
  roles assigned to an account afterward through centralized user management, and
  an account can hold more than one role at a time (e.g. Renter + Owner).
  Updated the Overview, Car Owner / Fleet Manager Guide, Administrator Guide, and
  Quick Reference sections, plus all three Mermaid diagrams, to reflect this.
- Removed the "open question" callout at the end of the guide — it was asking to
  confirm the exact assumption that turned out to be wrong.
- Added this changelog and linked it from the bottom of the guide.

## 2026-09-22 (earlier)

- Initial version of the guide, generated as `docs/user-guide.md` with role
  overview, step-by-step instructions, Mermaid flow diagrams, and a quick
  reference table for Renter, Car Owner, Fleet Manager, and Administrator.
