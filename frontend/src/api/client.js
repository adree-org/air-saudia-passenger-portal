```js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor — attach JWT from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const lang = localStorage.getItem('language') || 'ar';
    config.headers['Accept-Language'] = lang;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ───────────────────────────────────────────────────────────────────

export const registerUser = (data) =>
  apiClient.post('/v1/auth/register', data);

export const verifyOtp = (data) =>
  apiClient.post('/v1/auth/verify-otp', data);

export const loginUser = (data) =>
  apiClient.post('/v1/auth/login', data);

export const verifyMfa = (data) =>
  apiClient.post('/v1/auth/mfa/verify', data);

export const logoutUser = () =>
  apiClient.post('/v1/auth/logout');

export const refreshToken = () =>
  apiClient.post('/v1/auth/refresh');

export const requestPasswordReset = (data) =>
  apiClient.post('/v1/auth/password-reset/request', data);

export const confirmPasswordReset = (data) =>
  apiClient.post('/v1/auth/password-reset/confirm', data);

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export const getProfile = () =>
  apiClient.get('/v1/profile');

export const updateProfile = (data) =>
  apiClient.patch('/v1/profile', data);

export const verifyCriticalField = (data) =>
  apiClient.post('/v1/profile/verify-critical', data);

export const updateCriticalField = (data) =>
  apiClient.patch('/v1/profile/critical', data);

export const getNotificationPreferences = () =>
  apiClient.get('/v1/profile/notification-preferences');

export const updateNotificationPreferences = (data) =>
  apiClient.patch('/v1/profile/notification-preferences', data);

export const submitPdplRequest = (data) =>
  apiClient.post('/v1/profile/pdpl/data-request', data);

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

export const getBookings = () =>
  apiClient.get('/v1/bookings');

export const lookupBooking = (pnr, lastName) =>
  apiClient.get('/v1/bookings/lookup', { params: { pnr, lastName } });

export const getBookingByPnr = (pnr) =>
  apiClient.get(`/v1/bookings/${pnr}`);

export const getAlternativeFlights = (pnr, params) =>
  apiClient.get(`/v1/bookings/${pnr}/alternatives`, { params });

export const initiateRebook = (pnr, data) =>
  apiClient.post(`/v1/bookings/${pnr}/rebook`, data);

export const confirmRebook = (pnr, requestId, data) =>
  apiClient.post(`/v1/bookings/${pnr}/rebook/${requestId}/confirm`, data);

export const getFareRules = (pnr) =>
  apiClient.get(`/v1/bookings/${pnr}/fare-rules`);

// ─── BAGGAGE ─────────────────────────────────────────────────────────────────

export const submitBaggageClaim = (data) =>
  apiClient.post('/v1/baggage/claims', data);

export const getBaggageClaims = () =>
  apiClient.get('/v1/baggage/claims');

export const lookupBaggageClaim = (crn, lastName) =>
  apiClient.get('/v1/baggage/claims/lookup', { params: { crn, lastName } });

export const getBaggageClaimDetail = (crn) =>
  apiClient.get(`/v1/baggage/claims/${crn}`);

export const uploadClaimDocuments = (crn, formData) =>
  apiClient.post(`/v1/baggage/claims/${crn}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ─── LOYALTY ─────────────────────────────────────────────────────────────────

export const getLoyaltyAccount = () =>
  apiClient.get('/v1/loyalty/account');

export const getLoyaltyTransactions = (page = 1) =>
  apiClient.get('/v1/loyalty/transactions', { params: { page } });

export const initiateLoyaltyLink = (data) =>
  apiClient.post('/v1/loyalty/link', data);

export const verifyLoyaltyLink = (data) =>
  apiClient.post('/v1/loyalty/link/verify', data);

export const redeemMilesForUpgrade = (data) =>
  apiClient.post('/v1/loyalty/redeem/upgrade', data);

export const redeemMilesForRebook = (data) =>
  apiClient.post('/v1/loyalty/redeem/rebook-partial', data);

// ─── SEATS ───────────────────────────────────────────────────────────────────

export const getSeatMap = (pnr) =>
  apiClient.get(`/v1/seats/${pnr}/map`);

export const selectSeat = (pnr, data) =>
  apiClient.post(`/v1/seats/${pnr}/select`, data);

export const getUpgradeOptions = (pnr) =>
  apiClient.get(`/v1/seats/${pnr}/upgrades`);

export const submitUpgradeRequest = (pnr, data) =>
  apiClient.post(`/v1/seats/${pnr}/upgrades`, data);

export const getUpgradeRequestStatus = (pnr, requestId) =>
  apiClient.get(`/v1/seats/${pnr}/upgrades/${requestId}`);

// ─── CHECK-IN ────────────────────────────────────────────────────────────────

export const getCheckinEligibility = (pnr) =>
  apiClient.get(`/v1/checkin/${pnr}/eligibility`);

export const confirmCheckin = (pnr, data) =>
  apiClient.post(`/v1/checkin/${pnr}/confirm`, data);

export const downloadBoardingPass = (pnr) =>
  apiClient.get(`/v1/checkin/${pnr}/boarding-pass`, { responseType: 'blob' });

export const getWalletBoardingPass = (pnr) =>
  apiClient.get(`/v1/checkin/${pnr}/boarding-pass/wallet`, { responseType: 'blob' });

export default apiClient;
``