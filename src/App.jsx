import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation, useParams } from 'react-router-dom';
import { LayoutDashboard, ListChecks, IdCard, UserCircle, Search, Car, BarChart3, FileText, Home, Plus, Bell, MessageSquare, ArrowLeftRight, Users, FileCheck2, ShieldCheck, Files, CarFront, KeyRound, CheckCircle2, XCircle, ScrollText, Megaphone, Warehouse, Percent, CalendarDays, Bot, CalendarClock, Wallet } from 'lucide-react';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';
import GuestRoute from './components/layout/GuestRoute';
import PrivateRoute from './components/layout/PrivateRoute';
import RoleRoute from './components/layout/RoleRoute';
import ErrorBoundary from './components/layout/ErrorBoundary';
import RouteFallback from './components/layout/RouteFallback';
import SetupPrompts from './components/layout/SetupPrompts';
import SetupGuideModal from './components/layout/SetupGuideModal';
import AssistantFab from './components/layout/AssistantFab';
import { useSyncCurrentUser } from './hooks/useProfile';
import { useSessionExpiry, useReturnToCheckoutAfterAuth } from './hooks/useAuth';
import { USER_ROLES } from './lib/constants';
import { PERMISSIONS as P, hasPermission } from './lib/permissions';
import { useAuthStore } from './store/authStore';

/**
 * Every page is its own chunk (implementation-plan.md 12.7) — nothing about
 * a route's page component is needed until that route is actually visited,
 * so eagerly bundling all ~30 of them into the main chunk would only slow
 * down the first paint. Layout/shell components above stay eager: they're
 * needed on essentially every route.
 */
const HomePage = lazy(() => import('./pages/HomePage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const BookingCartPage = lazy(() => import('./pages/BookingCartPage'));
const BookingCheckoutPage = lazy(() => import('./pages/BookingCheckoutPage'));
const GroupPaymentPage = lazy(() => import('./pages/GroupPaymentPage'));
const ContractPage = lazy(() => import('./pages/ContractPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const SignaturePage = lazy(() => import('./pages/SignaturePage'));
const BookingConfirmPage = lazy(() => import('./pages/BookingConfirmPage'));
const ContractSignPage = lazy(() => import('./pages/ContractSignPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/BookingDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OwnerBookingsPage = lazy(() => import('./pages/OwnerBookingsPage'));
const OwnerCalendarPage = lazy(() => import('./pages/OwnerCalendarPage'));
const OwnerBookingDetailPage = lazy(() => import('./pages/OwnerBookingDetailPage'));
const OwnerReportsPage = lazy(() => import('./pages/OwnerReportsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminBookingsPage = lazy(() => import('./pages/AdminBookingsPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage'));
const AdminVehiclesPage = lazy(() => import('./pages/AdminVehiclesPage'));
const AdminDocumentsPage = lazy(() => import('./pages/AdminDocumentsPage'));
const AdminReviewedDocumentsPage = lazy(() => import('./pages/AdminReviewedDocumentsPage'));
const AdminAuditLogPage = lazy(() => import('./pages/AdminAuditLogPage'));
const AdminAnnouncementsPage = lazy(() => import('./pages/AdminAnnouncementsPage'));
const AdminRolesPage = lazy(() => import('./pages/AdminRolesPage'));
const AdminPlatformSettingsPage = lazy(() => import('./pages/AdminPlatformSettingsPage'));
const AdminRentalTermsPage = lazy(() => import('./pages/AdminRentalTermsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/AdminPayoutsPage'));
const AdminVehicleApprovalsPage = lazy(() => import('./pages/AdminVehicleApprovalsPage'));
const EditVehiclePage = lazy(() => import('./pages/EditVehiclePage'));
const OwnerContractTemplatesPage = lazy(() => import('./pages/OwnerContractTemplatesPage'));
const OwnerBookingPolicyPage = lazy(() => import('./pages/OwnerBookingPolicyPage'));
const OwnerStatementsPage = lazy(() => import('./pages/OwnerStatementsPage'));
const ContractTemplatesPage = lazy(() => import('./pages/ContractTemplatesPage'));
const AddVehiclePage = lazy(() => import('./pages/AddVehiclePage'));
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage'));
const OwnerVehiclesPage = lazy(() => import('./pages/OwnerVehiclesPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const Verify2faPage = lazy(() => import('./pages/Verify2faPage'));
const WidgetShowcase = lazy(() => import('./pages/WidgetShowcase'));

/** The old one-vehicle booking wizard's address: booking now starts from the vehicle's own page. */
function VehicleRedirect() {
  const { vehicleId } = useParams();
  return <Navigate to={`/vehicles/${vehicleId}`} replace />;
}

/** Wraps a page element in its own error boundary so one broken page can't take down the whole app shell. */
const page = (element) => <ErrorBoundary>{element}</ErrorBoundary>;

/**
 * App-wide shell — the sticky Navbar renders exactly once here and is
 * shared by every route (auth, booking flow, dashboard/owner/admin panels
 * included), rather than being scoped to just the marketing pages.
 * Also syncs the full `GET /users/me` profile into authStore once
 * authenticated, regardless of which page the user lands on first.
 */
function RootLayout() {
  useSyncCurrentUser();
  useSessionExpiry();
  useReturnToCheckoutAfterAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <SetupPrompts />
      <SetupGuideModal />
      <AssistantFab />
      <Outlet />
    </div>
  );
}

/**
 * Marketing/public site chrome — adds the Footer under the global Navbar
 * (see RootLayout). Content is left unwrapped here (no forced
 * max-width/padding) so full-bleed pages like HomePage can lay out their
 * own sections; simpler pages wrap themselves in <PageWrapper>. See
 * docs/design.md §4.
 *
 * Browse Vehicles gets the slim footer (copyright and legal links only): that page is cars only.
 */
const COMPACT_FOOTER_PATHS = ['/vehicles'];

function PublicLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer compact={COMPACT_FOOTER_PATHS.includes(pathname)} />
    </div>
  );
}

/**
 * Sidebar items per docs/menu-structure.md §6 — trimmed to routes that
 * exist so far. Icons are lucide-react (the icon set already used
 * everywhere else in this app — UserMenu, OwnerDashboardPage, etc.),
 * matched by meaning: DashboardLayout already renders `item.icon` to the
 * left of the label, these arrays just weren't populating it.
 */
/** Which permissions (any one) unlock the items that manage vehicles and their bookings. */
const OWN_VEHICLES = [P.VEHICLE_CREATE, P.VEHICLE_UPDATE, P.VEHICLE_MANAGE];
const ADD_VEHICLE = [P.VEHICLE_CREATE, P.VEHICLE_MANAGE];
const FLEET_BOOKINGS = [P.BOOKING_READ, P.BOOKING_MANAGE];

const RENTER_SIDEBAR_ITEMS = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/dashboard/profile', icon: UserCircle },
  { label: 'My Bookings', to: '/dashboard/bookings', icon: ListChecks, permissions: [P.BOOKING_READ] },
  { label: 'Messages', to: '/messages', icon: MessageSquare, badge: 'messages' },
  { label: 'Inbox', to: '/inbox', icon: Bell, badge: 'notifications' },
  { label: 'Assistant', to: '/assistant', icon: Bot },
  { label: 'Documents', to: '/dashboard/documents', icon: IdCard, permissions: [P.DOCUMENT_READ, P.DOCUMENT_UPLOAD] },
  { label: 'Browse Vehicles', to: '/vehicles', icon: Search },
];
const OWNER_SIDEBAR_ITEMS = [
  { label: 'Overview', to: '/owner', icon: LayoutDashboard },
  { label: 'Profile', to: '/dashboard/profile', icon: UserCircle },
  { label: 'My Vehicles', to: '/owner/vehicles', icon: Car, permissions: OWN_VEHICLES },
  { label: 'Fleet Bookings', to: '/owner/bookings', icon: ListChecks, permissions: FLEET_BOOKINGS },
  { label: 'Booking Calendar', to: '/owner/calendar', icon: CalendarDays, permissions: FLEET_BOOKINGS },
  { label: 'Messages', to: '/messages', icon: MessageSquare, badge: 'messages' },
  { label: 'Inbox', to: '/inbox', icon: Bell, badge: 'notifications' },
  { label: 'Assistant', to: '/assistant', icon: Bot },
  { label: 'Add Vehicle', to: '/owner/vehicles/new', icon: Plus, permissions: ADD_VEHICLE },
  { label: 'Reports', to: '/owner/reports', icon: BarChart3, permissions: FLEET_BOOKINGS },
  { label: 'Contract Templates', to: '/owner/contracts', icon: FileText },
  { label: 'Booking Policy', to: '/owner/policy', icon: CalendarClock },
  { label: 'Statements', to: '/owner/statements', icon: Wallet, permissions: FLEET_BOOKINGS },
  { label: 'Documents', to: '/dashboard/documents', icon: IdCard, permissions: [P.DOCUMENT_READ, P.DOCUMENT_UPLOAD] },
  { label: 'Browse Vehicles', to: '/vehicles', icon: Search },
  { label: 'Back to Main Site', to: '/', icon: Home },
];
const PROFILE_ITEM = { label: 'Profile', to: '/dashboard/profile', icon: UserCircle };
const MESSAGES_ITEM = { label: 'Messages', to: '/messages', icon: MessageSquare, badge: 'messages' };
const INBOX_ITEM = { label: 'Inbox', to: '/inbox', icon: Bell, badge: 'notifications' };
const ASSISTANT_ITEM = { label: 'Assistant', to: '/assistant', icon: Bot };
const HOME_ITEM = { label: 'Back to Main Site', to: '/', icon: Home };
/** The platform-wide tools, kept together under one heading in the Admin Panel menu. */
const ADMIN_TOOLS = [
  { label: 'Users', to: '/admin/users', icon: Users, permissions: [P.USER_MANAGE] },
  { label: 'Roles & Permissions', to: '/admin/roles', icon: KeyRound, permissions: [P.PERMISSION_MANAGE] },
  { label: 'All Bookings', to: '/admin/bookings', icon: ListChecks, permissions: [P.BOOKING_MANAGE] },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3, permissions: [P.BOOKING_MANAGE] },
  { label: 'Contract Templates', to: '/admin/contracts/templates', icon: FileText },
  { label: 'Audit Log', to: '/admin/audit-log', icon: ScrollText },
  { label: 'Announcements', to: '/admin/announcements', icon: Megaphone },
  { label: 'Platform Settings', to: '/admin/settings', icon: Percent },
  { label: 'Rental Terms', to: '/admin/rental-terms', icon: ScrollText },
  { label: 'Owner Payouts', to: '/admin/payouts', icon: Wallet, permissions: [P.BOOKING_MANAGE] },
];

/** Vehicles, kept together: the whole fleet, adding one, and approval — what's waiting, what was approved, what was rejected. */
const VEHICLE_TOOLS = [
  { label: 'All Vehicles', to: '/admin/vehicles', icon: Car, permissions: [P.VEHICLE_MANAGE] },
  { label: 'Add Vehicle', to: '/admin/vehicles/new', icon: Plus, permissions: ADD_VEHICLE },
  { label: 'Vehicle Approvals', to: '/admin/vehicles/approvals', icon: ShieldCheck, permissions: [P.VEHICLE_MANAGE] },
  { label: 'Approved Vehicles', to: '/admin/vehicles/approved', icon: CheckCircle2, permissions: [P.VEHICLE_MANAGE] },
  { label: 'Rejected Vehicles', to: '/admin/vehicles/rejected', icon: XCircle, permissions: [P.VEHICLE_MANAGE] },
];

/** Document review, kept together: what's waiting, and what has been decided (so a decision can be reversed). */
const DOCUMENT_TOOLS = [
  { label: 'Review Documents', to: '/admin/documents', icon: FileCheck2, permissions: [P.DOCUMENT_REVIEW] },
  { label: 'Approved Documents', to: '/admin/documents/approved', icon: CheckCircle2, permissions: [P.DOCUMENT_REVIEW] },
  { label: 'Rejected Documents', to: '/admin/documents/rejected', icon: XCircle, permissions: [P.DOCUMENT_REVIEW] },
];

/** Puts items under a collapsible heading, with its own icon, in the left menu (see DashboardLayout). */
const inGroup = (group, groupIcon, items) => items.map((item) => ({ ...item, group, groupIcon }));

/** A renter who is also an owner still needs their own bookings, which the owner menu doesn't otherwise list. */
const MY_BOOKINGS_ITEM = { label: 'My Bookings', to: '/dashboard/bookings', icon: ListChecks, permissions: [P.BOOKING_READ] };
/** An administrator who also owns vehicles still gets to their own fleet. */
const MY_VEHICLES_ITEM = { label: 'My Vehicles', to: '/owner/vehicles', icon: Car, permissions: OWN_VEHICLES };
const FLEET_BOOKINGS_ITEM = { label: 'Fleet Bookings', to: '/owner/bookings', icon: ListChecks, permissions: FLEET_BOOKINGS };
const CALENDAR_ITEM = { label: 'Booking Calendar', to: '/owner/calendar', icon: CalendarDays, permissions: FLEET_BOOKINGS };
/** For an account that can be both: switch how the portal is being used, without logging in again. */
const SWITCH_TO_OWNER = { label: 'Switch to Car Owner', to: '/owner', icon: ArrowLeftRight, switchTo: 'owner' };
const SWITCH_TO_RENTER = { label: 'Switch to Renter', to: '/dashboard', icon: ArrowLeftRight, switchTo: 'renter' };

/**
 * The one left menu a person gets, decided ONLY by who they are and how they chose to log in — never by
 * which page or URL they are on — so it is identical on every page. An admin gets the admin menu. Someone
 * who owns vehicles gets the owner menu (plus My Bookings if they also rent) or, if they logged in as a
 * renter, the renter menu; either way with a switch to the other. Anyone else gets the renter menu.
 * The roles pick the menu; the permissions in the person's token then decide which of its items they see
 * (an item with no `permissions` is always shown).
 * @param {string[]} roles
 * @param {'renter'|'owner'|null} mode
 * @param {string[]} [permissions] from the access token
 * @returns {{ items: object[], heading: string }}
 */
function menuFor(roles = [], mode = null, permissions = []) {
  const { items, heading } = menuForRoles(roles, mode);
  return { items: items.filter((item) => hasPermission(item.permissions, permissions)), heading };
}

function menuForRoles(roles, mode) {
  if (roles.includes(USER_ROLES.ADMIN)) {
    // The platform tools sit under "Administration"; an administrator who also owns vehicles gets their own
    // fleet under a second heading, so a two-role menu stays short instead of one long list.
    // Only a real car-owner role counts: the backend also puts a fleet-manager (MANAGE) role in a super admin's token
    // whether or not they own anything, and that must not give an administrator a fleet menu they have no use for.
    const ownsVehicles = roles.includes(USER_ROLES.OWNER);
    const items = [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard },
      PROFILE_ITEM,
      MESSAGES_ITEM,
      INBOX_ITEM,
      ASSISTANT_ITEM,
      ...inGroup('Administration', ShieldCheck, ADMIN_TOOLS),
      ...inGroup('Vehicles', Warehouse, VEHICLE_TOOLS),
      ...inGroup('Documents', Files, DOCUMENT_TOOLS),
      ...(ownsVehicles ? inGroup('My Fleet', CarFront, [MY_VEHICLES_ITEM, FLEET_BOOKINGS_ITEM, CALENDAR_ITEM]) : []),
      HOME_ITEM,
    ];
    return { items, heading: 'Admin Panel' };
  }

  const isOwner = roles.includes(USER_ROLES.OWNER) || roles.includes(USER_ROLES.MANAGER);
  if (!isOwner) return { items: RENTER_SIDEBAR_ITEMS, heading: 'Dashboard' };

  if (mode === 'renter') {
    // An owner using the portal as a renter: the renter menu, with the way back to the owner side after Documents.
    return {
      items: RENTER_SIDEBAR_ITEMS.flatMap((item) => (item.to === '/dashboard/documents' ? [item, SWITCH_TO_OWNER] : [item])),
      heading: 'Dashboard',
    };
  }

  if (roles.includes(USER_ROLES.RENTER)) {
    // Both an owner and a renter: fleet items and renting items each get a heading.
    const byTo = (to) => OWNER_SIDEBAR_ITEMS.find((item) => item.to === to);
    const items = [
      byTo('/owner'),
      PROFILE_ITEM,
      MESSAGES_ITEM,
      INBOX_ITEM,
      ASSISTANT_ITEM,
      byTo('/dashboard/documents'),
      ...inGroup('My Fleet', CarFront, [byTo('/owner/vehicles'), byTo('/owner/bookings'), byTo('/owner/vehicles/new'), byTo('/owner/reports'), byTo('/owner/statements'), byTo('/owner/contracts'), byTo('/owner/policy')]),
      ...inGroup('My Rentals', KeyRound, [MY_BOOKINGS_ITEM, byTo('/vehicles')]),
      SWITCH_TO_RENTER,
      HOME_ITEM,
    ];
    return { items, heading: 'Owner Panel' };
  }

  const items = OWNER_SIDEBAR_ITEMS.flatMap((item) => (item.to === '/' ? [SWITCH_TO_RENTER, item] : [item]));
  return { items, heading: 'Owner Panel' };
}

/**
 * The left-menu shell for a signed-in person, used by EVERY page they can reach — the dashboard,
 * owner and admin sections as well as the public pages (see MemberShell). The menu comes from
 * `menuFor(roles, mode)`, so clicking Profile, Documents, Inbox or Browse Vehicles never swaps it for
 * a different one. Opening an Owner Panel page puts an owner who was in renter mode back in owner mode.
 */
function AccountLayout() {
  const roles = useAuthStore((s) => s.user?.roles) || [];
  const permissions = useAuthStore((s) => s.user?.permissions) || [];
  const mode = useAuthStore((s) => s.mode);
  const setMode = useAuthStore((s) => s.setMode);
  const { pathname, state } = useLocation();
  const isOwner = roles.includes(USER_ROLES.OWNER) || roles.includes(USER_ROLES.MANAGER);
  const requested = state?.switchTo;

  useEffect(() => {
    // A "Switch to …" menu item rides along in the navigation state, so it is applied once the new page is
    // showing (setting it earlier would let the Owner Panel rule below undo it while still on the old page).
    if (requested === 'renter' || requested === 'owner') {
      if (requested !== mode) setMode(requested);
      return;
    }
    if (isOwner && mode === 'renter' && pathname.startsWith('/owner')) setMode('owner');
  }, [requested, isOwner, mode, pathname, setMode]);

  const { items, heading } = menuFor(roles, mode, permissions);
  return <DashboardLayout items={items} heading={heading} />;
}

/**
 * Wraps every page that isn't a dashboard section (browsing vehicles, a vehicle, About, Contact,
 * the booking flow, the Inbox…): a signed-in person always gets the left menu around it, a visitor
 * gets the page on its own. The dashboard / owner / admin sections bring their own menu.
 */
function MemberShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <AccountLayout /> : <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Global shell — Navbar renders once here, shared by every route below */}
        <Route element={<RootLayout />}>
          {/* Everything that isn't a dashboard section — a signed-in person gets the left menu around it */}
          <Route element={<MemberShell />}>
            {/* Public marketing pages — adds the Footer under the global Navbar */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={page(<HomePage />)} />
              <Route path="/vehicles" element={page(<VehiclesPage />)} />
              <Route path="/vehicles/:vehicleId" element={page(<VehicleDetailPage />)} />
              {/* Choosing vehicles, sharing a contact and checking out need no account — the account comes at checkout */}
              <Route path="/booking" element={page(<BookingCartPage />)} />
              {/* The old "How can we reach you?" step — sign-up at checkout asks for it now. */}
              <Route path="/booking/contact" element={<Navigate to="/booking/checkout" replace />} />
              <Route path="/booking/checkout" element={page(<BookingCheckoutPage />)} />
              <Route path="/book/:vehicleId" element={<VehicleRedirect />} />
              <Route path="/services" element={page(<ServicesPage />)} />
              <Route path="/fleet" element={page(<FleetPage />)} />
              <Route path="/about" element={page(<AboutPage />)} />
              <Route path="/contact" element={page(<ContactPage />)} />
              <Route path="/faq" element={page(<FaqPage />)} />
              <Route path="/terms" element={page(<TermsPage />)} />
              <Route path="/privacy" element={page(<PrivacyPage />)} />
              {/* Hidden QA reference — the Phase 1 widget library, not linked from nav */}
              <Route path="/dev/widgets" element={page(<WidgetShowcase />)} />
              <Route path="*" element={page(<NotFoundPage />)} />
            </Route>

            {/* Signed-in only: contract → payment → signature → confirm (after checkout creates the booking), Inbox, Messages */}
            <Route element={<PrivateRoute />}>
              <Route path="/book/:vehicleId/contract" element={page(<ContractPage />)} />
              <Route path="/book/:vehicleId/payment" element={page(<PaymentPage />)} />
              <Route path="/book/group/:groupId/payment" element={page(<GroupPaymentPage />)} />
              {/* Where Pesapal's own redirect lands back — vehicleId isn't in this URL, see PaymentSuccessPage.jsx */}
              <Route path="/payment/success" element={page(<PaymentSuccessPage />)} />
              <Route path="/book/:vehicleId/sign" element={page(<SignaturePage />)} />
              <Route path="/book/:vehicleId/confirm" element={page(<BookingConfirmPage />)} />
              <Route path="/contracts/:contractId/sign" element={page(<ContractSignPage />)} />
              <Route path="/inbox" element={page(<InboxPage />)} />
              <Route path="/messages" element={page(<MessagesPage />)} />
              <Route path="/messages/booking/:bookingId" element={page(<ChatPage />)} />
              <Route path="/messages/user/:otherUserId" element={page(<ChatPage />)} />
              <Route path="/assistant" element={page(<AssistantPage />)} />
            </Route>
          </Route>

          {/* Auth — guest-only */}
          <Route element={<GuestRoute />}>
            <Route path="/auth/login" element={page(<LoginPage />)} />
            <Route path="/auth/register" element={page(<RegisterPage />)} />
            <Route path="/auth/verify-email" element={page(<VerifyEmailPage />)} />
            <Route path="/auth/verify-2fa" element={page(<Verify2faPage />)} />
          </Route>

          {/* Dashboard-style sections — own sidebar shell below the global Navbar */}
          <Route element={<PrivateRoute />}>

            <Route element={<AccountLayout />}>
              <Route path="/dashboard" element={page(<DashboardPage />)} />
              <Route path="/dashboard/bookings" element={page(<MyBookingsPage />)} />
              <Route path="/dashboard/bookings/:bookingId" element={page(<BookingDetailPage />)} />
              <Route path="/dashboard/documents" element={page(<DocumentsPage />)} />
              <Route path="/dashboard/profile" element={page(<ProfilePage />)} />
            </Route>
          </Route>

          {/*
            "/owner" itself is reachable by any authenticated user, not just
            those already holding OWNER/MANAGER — completing its profile step
            (PUT /users/me/owner-profile) is what GRANTS the Owner role on
            the real backend (confirmed live: a RENTER-only account calling
            it comes back with roles ["OWNER","RENTER"]). Gating this route
            behind RoleRoute created a catch-22 where nobody could ever
            become an owner through the UI — the page that grants the role
            was itself locked behind already having it. The rest of the
            owner section (bookings, adding vehicles, reports) still
            requires the role, which by the time a user reaches those is
            already present in authStore (useUpdateOwnerProfile's onSuccess
            merges the fresh `roles` from the PUT response into the store).
          */}
          <Route element={<PrivateRoute />}>
            <Route element={<AccountLayout />}>
              <Route path="/owner" element={page(<OwnerDashboardPage />)} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={[USER_ROLES.OWNER, USER_ROLES.MANAGER]} />}>
            <Route element={<AccountLayout />}>
              <Route path="/owner/vehicles" element={page(<OwnerVehiclesPage />)} />
              <Route path="/owner/bookings" element={page(<OwnerBookingsPage />)} />
              <Route path="/owner/calendar" element={page(<OwnerCalendarPage />)} />
              <Route path="/owner/bookings/:bookingId" element={page(<OwnerBookingDetailPage />)} />
              <Route path="/owner/vehicles/new" element={page(<AddVehiclePage />)} />
              <Route path="/owner/vehicles/:vehicleId/edit" element={page(<EditVehiclePage />)} />
              <Route path="/owner/reports" element={page(<OwnerReportsPage />)} />
              <Route path="/owner/contracts" element={page(<OwnerContractTemplatesPage />)} />
              <Route path="/owner/policy" element={page(<OwnerBookingPolicyPage />)} />
              <Route path="/owner/statements" element={page(<OwnerStatementsPage />)} />
            </Route>
          </Route>

          <Route element={<RoleRoute allowedRoles={[USER_ROLES.ADMIN]} />}>
            <Route element={<AccountLayout />}>
              <Route path="/admin" element={page(<AdminDashboardPage />)} />
              <Route path="/admin/bookings" element={page(<AdminBookingsPage />)} />
              <Route path="/admin/bookings/:bookingId" element={page(<OwnerBookingDetailPage />)} />
              <Route path="/admin/users" element={page(<AdminUsersPage />)} />
              <Route path="/admin/users/:userId" element={page(<AdminUserDetailPage />)} />
              <Route path="/admin/vehicles" element={page(<AdminVehiclesPage />)} />
              <Route path="/admin/vehicles/approvals" element={page(<AdminVehicleApprovalsPage view="review" />)} />
              <Route path="/admin/vehicles/approved" element={page(<AdminVehicleApprovalsPage view="approved" />)} />
              <Route path="/admin/vehicles/rejected" element={page(<AdminVehicleApprovalsPage view="rejected" />)} />
              <Route path="/admin/vehicles/:vehicleId/edit" element={page(<EditVehiclePage />)} />
              <Route path="/admin/documents" element={page(<AdminDocumentsPage />)} />
              <Route path="/admin/documents/approved" element={page(<AdminReviewedDocumentsPage status="APPROVED" />)} />
              <Route path="/admin/documents/rejected" element={page(<AdminReviewedDocumentsPage status="REJECTED" />)} />
              <Route path="/admin/vehicles/new" element={page(<AddVehiclePage />)} />
              <Route path="/admin/reports" element={page(<AdminReportsPage />)} />
              <Route path="/admin/contracts/templates" element={page(<ContractTemplatesPage />)} />
              <Route path="/admin/audit-log" element={page(<AdminAuditLogPage />)} />
              <Route path="/admin/announcements" element={page(<AdminAnnouncementsPage />)} />
              <Route path="/admin/roles" element={page(<AdminRolesPage />)} />
              <Route path="/admin/settings" element={page(<AdminPlatformSettingsPage />)} />
              <Route path="/admin/rental-terms" element={page(<AdminRentalTermsPage />)} />
              <Route path="/admin/payouts" element={page(<AdminPayoutsPage />)} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
