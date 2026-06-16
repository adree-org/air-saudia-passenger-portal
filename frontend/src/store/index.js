```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loginUser,
  logoutUser,
  registerUser,
  verifyOtp,
  getProfile,
  updateProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  getBookings,
  getBookingByPnr,
  lookupBooking,
  getAlternativeFlights,
  initiateRebook,
  confirmRebook,
  getFareRules,
  getBaggageClaims,
  getBaggageClaimDetail,
  submitBaggageClaim,
  uploadClaimDocuments,
  getLoyaltyAccount,
  getLoyaltyTransactions,
  initiateLoyaltyLink,
  verifyLoyaltyLink,
  redeemMilesForUpgrade,
  getSeatMap,
  selectSeat,
  getUpgradeOptions,
  submitUpgradeRequest,
  getCheckinEligibility,
  confirmCheckin,
} from '../api/client.js';

// ─── AUTH SLICE ───────────────────────────────────────────────────────────────

const createAuthSlice = (set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  mfaPending: false,
  mfaPreAuthToken: null,
  language: 'ar',

  setLanguage: (lang) => {
    set({ language: lang });
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginUser(credentials);
      const { token, user, mfaRequired, preAuthToken } = response.data;
      if (mfaRequired) {
        set({ mfaPending: true, mfaPreAuthToken: preAuthToken, isLoading: false });
        return { mfaRequired: true };
      }
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false, mfaPending: false });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    try {
      await logoutUser();
    } catch (_) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, mfaPending: false, mfaPreAuthToken: null });
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerUser(data);
      set({ isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  verifyRegistrationOtp: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await verifyOtp(data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'OTP verification failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const lang = localStorage.getItem('language') || 'ar';
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, language: lang });
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      } catch (_) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },

  clearError: () => set({ error: null }),
});

// ─── PROFILE SLICE ────────────────────────────────────────────────────────────

const createProfileSlice = (set) => ({
  profile: null,
  notificationPrefs: null,
  profileLoading: false,
  profileError: null,

  fetchProfile: async () => {
    set({ profileLoading: true, profileError: null });
    try {
      const response = await getProfile();
      set({ profile: response.data, profileLoading: false });
    } catch (error) {
      set({ profileError: error.response?.data?.message || 'Failed to load profile', profileLoading: false });
    }
  },

  updateUserProfile: async (data) => {
    set({ profileLoading: true, profileError: null });
    try {
      const response = await updateProfile(data);
      set({ profile: response.data, profileLoading: false });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Update failed';
      set({ profileError: msg, profileLoading: false });
      return { success: false, error: msg };
    }
  },

  fetchNotificationPrefs: async () => {
    try {
      const response = await getNotificationPreferences();
      set({ notificationPrefs: response.data });
    } catch (_) {}
  },

  updateNotifPrefs: async (data) => {
    try {
      const response = await updateNotificationPreferences(data);
      set({ notificationPrefs: response.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },
});

// ─── BOOKINGS SLICE ───────────────────────────────────────────────────────────

const createBookingsSlice = (set) => ({
  bookings: [],
  selectedBooking: null,
  alternatives: [],
  fareRules: null,
  rebookRequest: null,
  bookingsLoading: false,
  bookingsError: null,

  fetchBookings: async () => {
    set({ bookingsLoading: true, bookingsError: null });
    try {
      const response = await getBookings();
      set({ bookings: response.data, bookingsLoading: false });
    } catch (error) {
      set({ bookingsError: error.response?.data?.message || 'Failed to load bookings', bookingsLoading: false });
    }
  },

  fetchBookingByPnr: async (pnr) => {
    set({ bookingsLoading: true, bookingsError: null });
    try {
      const response = await getBookingByPnr(pnr);
      set({ selectedBooking: response.data, bookingsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Booking not found';
      set({ bookingsError: msg, bookingsLoading: false });
      return { success: false, error: msg };
    }
  },

  lookupBookingByPnr: async (pnr, lastName) => {
    set({ bookingsLoading: true, bookingsError: null });
    try {
      const response = await lookupBooking(pnr, lastName);
      set({ selectedBooking: response.data, bookingsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Booking not found';
      set({ bookingsError: msg, bookingsLoading: false });
      return { success: false, error: msg };
    }
  },

  fetchAlternatives: async (pnr, params) => {
    set({ bookingsLoading: true });
    try {
      const response = await getAlternativeFlights(pnr, params);
      set({ alternatives: response.data, bookingsLoading: false });
    } catch (error) {
      set({ bookingsError: error.response?.data?.message, bookingsLoading: false });
    }
  },

  fetchFareRules: async (pnr) => {
    try {
      const response = await getFareRules(pnr);
      set({ fareRules: response.data });
    } catch (_) {}
  },

  createRebookRequest: async (pnr, data) => {
    set({ bookingsLoading: true });
    try {
      const response = await initiateRebook(pnr, data);
      set({ rebookRequest: response.data, bookingsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Rebook failed';
      set({ bookingsError: msg, bookingsLoading: false });
      return { success: false, error: msg };
    }
  },

  finalizeRebook: async (pnr, requestId, data) => {
    set({ bookingsLoading: true });
    try {
      const response = await confirmRebook(pnr, requestId, data);
      set({ bookingsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Confirmation failed';
      set({ bookingsError: msg, bookingsLoading: false });
      return { success: false, error: msg };
    }
  },

  clearSelectedBooking: () => set({ selectedBooking: null, alternatives: [], fareRules: null }),
});

// ─── BAGGAGE SLICE ────────────────────────────────────────────────────────────

const createBaggageSlice = (set) => ({
  claims: [],
  selectedClaim: null,
  baggageLoading: false,
  baggageError: null,

  fetchClaims: async () => {
    set({ baggageLoading: true, baggageError: null });
    try {
      const response = await getBaggageClaims();
      set({ claims: response.data, baggageLoading: false });
    } catch (error) {
      set({ baggageError: error.response?.data?.message || 'Failed to load claims', baggageLoading: false });
    }
  },

  fetchClaimDetail: async (crn) => {
    set({ baggageLoading: true });
    try {
      const response = await getBaggageClaimDetail(crn);
      set({ selectedClaim: response.data, baggageLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Claim not found';
      set({ baggageError: msg, baggageLoading: false });
      return { success: false, error: msg };
    }
  },

  createClaim: async (data) => {
    set({ baggageLoading: true, baggageError: null });
    try {
      const response = await submitBaggageClaim(data);
      set((state) => ({ claims: [response.data, ...state.claims], baggageLoading: false }));
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Claim submission failed';
      set({ baggageError: msg, baggageLoading: false });
      return { success: false, error: msg };
    }
  },

  uploadDocuments: async (crn, formData) => {
    try {
      const response = await uploadClaimDocuments(crn, formData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },
});

// ─── LOYALTY SLICE ────────────────────────────────────────────────────────────

const createLoyaltySlice = (set) => ({
  loyaltyAccount: null,
  loyaltyTransactions: [],
  loyaltyPage: 1,
  loyaltyLoading: false,
  loyaltyError: null,

  fetchLoyaltyAccount: async () => {
    set({ loyaltyLoading: true, loyaltyError: null });
    try {
      const response = await getLoyaltyAccount();
      set({ loyaltyAccount: response.data, loyaltyLoading: false });
    } catch (error) {
      set({ loyaltyError: error.response?.data?.message || 'Failed to load loyalty data', loyaltyLoading: false });
    }
  },

  fetchLoyaltyTransactions: async (page = 1) => {
    set({ loyaltyLoading: true });
    try {
      const response = await getLoyaltyTransactions(page);
      set({ loyaltyTransactions: response.data.transactions || response.data, loyaltyPage: page, loyaltyLoading: false });
    } catch (error) {
      set({ loyaltyError: error.response?.data?.message, loyaltyLoading: false });
    }
  },

  linkLoyaltyAccount: async (data) => {
    try {
      const response = await initiateLoyaltyLink(data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  verifyLoyaltyLinkOtp: async (data) => {
    try {
      const response = await verifyLoyaltyLink(data);
      set({ loyaltyAccount: response.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  },

  redeemForUpgrade: async (data) => {
    set({ loyaltyLoading: true });
    try {
      const response = await redeemMilesForUpgrade(data);
      set({ loyaltyLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Redemption failed';
      set({ loyaltyError: msg, loyaltyLoading: false });
      return { success: false, error: msg };
    }
  },
});

// ─── SEATS SLICE ──────────────────────────────────────────────────────────────

const createSeatsSlice = (set) => ({
  seatMap: null,
  selectedSeat: null,
  upgradeOptions: [],
  upgradeRequest: null,
  seatsLoading: false,
  seatsError: null,

  fetchSeatMap: async (pnr) => {
    set({ seatsLoading: true, seatsError: null });
    try {
      const response = await getSeatMap(pnr);
      set({ seatMap: response.data, seatsLoading: false });
    } catch (error) {
      set({ seatsError: error.response?.data?.message || 'Failed to load seat map', seatsLoading: false });
    }
  },

  chooseSeat: async (pnr, data) => {
    set({ seatsLoading: true });
    try {
      const response = await selectSeat(pnr, data);
      set({ selectedSeat: response.data, seatsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Seat selection failed';
      set({ seatsError: msg, seatsLoading: false });
      return { success: false, error: msg };
    }
  },

  fetchUpgradeOptions: async (pnr) => {
    try {
      const response = await getUpgradeOptions(pnr);
      set({ upgradeOptions: response.data });
    } catch (_) {}
  },

  requestUpgrade: async (pnr, data) => {
    set({ seatsLoading: true });
    try {
      const response = await submitUpgradeRequest(pnr, data);
      set({ upgradeRequest: response.data, seatsLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Upgrade request failed';
      set({ seatsError: msg, seatsLoading: false });
      return { success: false, error: msg };
    }
  },
});

// ─── CHECK-IN SLICE ───────────────────────────────────────────────────────────

const createCheckinSlice = (set) => ({
  checkinEligibility: null,
  checkinLoading: false,
  checkinError: null,

  fetchCheckinEligibility: async (pnr) => {
    set({ checkinLoading: true });
    try {
      const response = await getCheckinEligibility(pnr);
      set({ checkinEligibility: response.data, checkinLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ checkinError: error.response?.data?.message, checkinLoading: false });
      return { success: false };
    }
  },

  performCheckin: async (pnr, data) => {
    set({ checkinLoading: true });
    try {
      const response = await confirmCheckin(pnr, data);
      set({ checkinLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Check-in failed';
      set({ checkinError: msg, checkinLoading: false });
      return { success: false, error: msg };
    }
  },
});

// ─── COMBINED STORE ───────────────────────────────────────────────────────────

const useStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createProfileSlice(set),
      ...createBookingsSlice(set),
      ...createBaggageSlice(set),
      ...createLoyaltySlice(set),
      ...createSeatsSlice(set),
      ...createCheckinSlice(set),
    }),
    {
      name: 'air-saudia-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        language: state.language,
      }),
    }
  )
);

export default useStore;
``