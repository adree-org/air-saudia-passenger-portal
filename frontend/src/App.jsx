import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import MfaChallengePage from './pages/auth/MfaChallengePage';
import PasswordResetPage from './pages/auth/PasswordResetPage';
import PasswordResetConfirmPage from './pages/auth/PasswordResetConfirmPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';

// Dashboard & shell
import DashboardPage from './pages/dashboard/DashboardPage';

// Booking pages
import BookingsPage from './pages/bookings/BookingsPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';
import RebookingPage from './pages/bookings/RebookingPage';
import RebookingConfirmPage from './pages/bookings/RebookingConfirmPage';

// Baggage pages
import BaggageClaimsPage from './pages/baggage/BaggageClaimsPage';
import BaggageClaimDetailPage from './pages/baggage/BaggageClaimDetailPage';
import BaggageClaimNewPage from './pages/baggage/BaggageClaimNewPage';

// Loyalty pages
import LoyaltyPage from './pages/loyalty/LoyaltyPage';
import LoyaltyTransactionsPage from './pages/loyalty/LoyaltyTransactionsPage';
import LoyaltyRedemptionPage from './pages/loyalty/LoyaltyRedemptionPage';
import LoyaltyLinkPage from './pages/loyalty/LoyaltyLinkPage';

// Seat pages
import SeatSelectionPage from './pages/seats/SeatSelectionPage';
import UpgradeRequestPage from './pages/seats/UpgradeRequestPage';

// Check-in pages
import CheckInPage from './pages/checkin/CheckInPage';
import BoardingPassPage from './pages/checkin/BoardingPassPage';

// Profile pages
import ProfilePage from './pages/profile/ProfilePage';
import NotificationPreferencesPage from './pages/profile/NotificationPreferencesPage';
import PdplRequestPage from './pages/profile/PdplRequestPage';

// Payment pages
import PaymentPage from './pages/payment/PaymentPage';
import PaymentResultPage from './pages/payment/PaymentResultPage';

// Shared / utility pages
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Layout components
import PublicLayout from './layouts/PublicLayout';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';

// Store actions & selectors
import { checkAuth, selectIsAuthenticated, selectAuthLoading, selectCurrentUser } from './store/slices/authSlice';
import { setLocale } from './store/slices/i18nSlice';

// i18n
import { useTranslation } from 'react-i18next';

// Loading spinner
import LoadingSpinner from './components/common/LoadingSpinner';

/**
 * PrivateRoute — wraps protected routes.
 * Redirects unauthenticated users to /login, preserving the intended destination.
 */
function PrivateRoute({ children, requiredRoles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const currentUser = useSelector(selectCurrentUser);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = currentUser?.roles || [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

/**
 * PublicOnlyRoute — redirects already-authenticated users away from auth pages
 * (e.g., login, register) to the dashboard.
 */
function PublicOnlyRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
}

/**
 * AppRoutes — defines the full route tree.
 * Separated from App so that hooks that depend on router context work correctly.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* ── Root redirect ── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Public / auth routes ── */}
      <Route
        element={
          <PublicLayout />
        }
      >
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register/verify"
          element={
            <PublicOnlyRoute>
              <VerifyOtpPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/mfa"
          element={
            <PublicOnlyRoute>
              <MfaChallengePage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/password-reset"
          element={
            <PublicOnlyRoute>
              <PasswordResetPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/password-reset/confirm"
          element={
            <PasswordResetConfirmPage />
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* ── Authenticated routes ── */}
      <Route
        element={
          <PrivateRoute>
            <AuthenticatedLayout />
          </PrivateRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Bookings */}
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:pnr" element={<BookingDetailPage />} />
        <Route path="/bookings/:pnr/rebook" element={<RebookingPage />} />
        <Route path="/bookings/:pnr/rebook/confirm" element={<RebookingConfirmPage />} />

        {/* Baggage Claims */}
        <Route path="/baggage" element={<BaggageClaimsPage />} />
        <Route path="/baggage/new" element={<BaggageClaimNewPage />} />
        <Route path="/baggage/:claimId" element={<BaggageClaimDetailPage />} />

        {/* Loyalty */}
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/loyalty/transactions" element={<LoyaltyTransactionsPage />} />
        <Route path="/loyalty/redeem" element={<LoyaltyRedemptionPage />} />
        <Route path="/loyalty/link" element={<LoyaltyLinkPage />} />

        {/* Seat Selection & Upgrades */}
        <Route path="/seats/:bookingId" element={<SeatSelectionPage />} />
        <Route path="/seats/:bookingId/upgrade" element={<UpgradeRequestPage />} />

        {/* Check-In & Boarding Pass */}
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/checkin/:bookingId/boarding-pass" element={<BoardingPassPage />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/notifications" element={<NotificationPreferencesPage />} />
        <Route path="/profile/pdpl" element={<PdplRequestPage />} />

        {/* Payment */}
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
      </Route>

      {/* ── 404 catch-all ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/**
 * App — root component.
 *
 * Responsibilities:
 *  1. Dispatch checkAuth() on mount to validate any existing HttpOnly refresh
 *     token cookie and rehydrate the Redux auth state without exposing tokens
 *     to JavaScript (tokens live in HttpOnly cookies; access token is held
 *     transiently in Redux store memory only).
 *  2. Synchronise the i18n locale and HTML dir/lang attributes whenever the
 *     user's preferred language changes (Arabic RTL / English LTR).
 *  3. Render the BrowserRouter and full route tree.
 */
export default function App() {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const [authChecked, setAuthChecked] = useState(false);

  // ── 1. Check auth on mount ──────────────────────────────────────────────
  useEffect(() => {
    const performAuthCheck = async () => {
      try {
        await dispatch(checkAuth()).unwrap();
      } catch {
        // Not authenticated — this is a normal state; no error handling needed.
      } finally {
        setAuthChecked(true);
      }
    };

    performAuthCheck();
  }, [dispatch]);

  // ── 2. Sync HTML dir and lang attributes with i18n locale ───────────────
  useEffect(() => {
    const language = i18n.language || 'ar';
    const isArabic = language === 'ar';

    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');

    // Persist locale preference to Redux store so components can read it
    // without importing i18n directly.
    dispatch(setLocale(language));
  }, [i18n.language, dispatch]);

  // ── 3. Block render until auth check resolves to prevent flash of
  //       unauthenticated content or premature redirects. ──────────────────
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}