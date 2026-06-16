```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane, Package, Star, Armchair, LogOut, User, Bell, ChevronRight,
  TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw, Globe,
  CreditCard, FileText, Menu, X, Home, Settings
} from 'lucide-react';
import useStore from '../store/index.js';

const t = {
  ar: {
    welcome: 'مرحباً',
    subtitle: 'مرحباً بك في بوابة المسافر',
    myBookings: 'رحلاتي',
    baggage: 'الأمتعة',
    loyalty: 'أميالي',
    seats: 'المقاعد',
    checkin: 'تسجيل الوصول',
    profile: 'ملفي الشخصي',
    logout: 'تسجيل الخروج',
    dashboard: 'لوحة التحكم',
    totalBookings: 'إجمالي الحجوزات',
    activeClaims: 'المطالبات النشطة',
    milesBalance: 'رصيد الأميال',
    tierStatus: 'مستوى العضوية',
    upcomingFlights: 'الرحلات القادمة',
    recentClaims: 'المطالبات الأخيرة',
    quickActions: 'الإجراءات السريعة',
    rebookFlight: 'إعادة حجز رحلة',
    submitClaim: 'تقديم مطالبة أمتعة',
    selectSeat: 'اختيار مقعد',
    viewMiles: 'عرض الأميال',
    flightNumber: 'رقم الرحلة',
    departure: 'المغادرة',
    arrival: 'الوصول',
    status: 'الحالة',
    claimRef: 'رقم المطالبة',
    claimType: 'نوع المطالبة',
    noBookings: 'لا توجد حجوزات قادمة',
    noClaims: 'لا توجد مطالبات',
    loading: 'جاري التحميل...',
    confirmed: 'مؤكد',
    pending: 'قيد المعالجة',
    cancelled: 'ملغي',
    lost: 'مفقودة',
    delayed: 'متأخرة',
    damaged: 'تالفة',
    submitted: 'مقدمة',
    underReview: 'قيد المراجعة',
    resolved: 'محلولة',
    expiringMiles: 'أميال تنتهي قريباً',
    tierRenewal: 'تجديد المستوى',
    viewAll: 'عرض الكل',
    switchLang: 'English',
    notifications: 'الإشعارات',
    sar: 'ريال',
    miles: 'ميل',
    days: 'يوم',
    manageMiles: 'إدارة الأميال',
    linkLoyalty: 'ربط حساب الولاء',
    noLoyalty: 'لم يتم ربط حساب الولاء',
  },
  en: {
    welcome: 'Welcome',
    subtitle: 'Welcome to the Passenger Portal',
    myBookings: 'My Bookings',
    baggage: 'Baggage',
    loyalty: 'My Miles',
    seats: 'Seats',
    checkin: 'Check-In',
    profile: 'My Profile',
    logout: 'Sign Out',
    dashboard: 'Dashboard',
    totalBookings: 'Total Bookings',
    activeClaims: 'Active Claims',
    milesBalance: 'Miles Balance',
    tierStatus: 'Tier Status',
    upcomingFlights: 'Upcoming Flights',
    recentClaims: 'Recent Claims',
    quickActions: 'Quick Actions',
    rebookFlight: 'Rebook a Flight',
    submitClaim: 'Submit Baggage Claim',
    selectSeat: 'Select Seat',
    viewMiles: 'View Miles',
    flightNumber: 'Flight',
    departure: 'Departure',
    arrival: 'Arrival',
    status: 'Status',
    claimRef: 'Claim Ref',
    claimType: 'Type',
    noBookings: 'No upcoming flights',
    noClaims: 'No claims submitted',
    loading: 'Loading...',
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    lost: 'Lost',
    delayed: 'Delayed',
    damaged: 'Damaged',
    submitted: 'Submitted',
    underReview: 'Under Review',
    resolved: 'Resolved',
    expiringMiles: 'Expiring Miles',
    tierRenewal: 'Tier Renewal',
    viewAll: 'View All',
    switchLang: 'عربي',
    notifications: 'Notifications',
    sar: 'SAR',
    miles: 'Miles',
    days: 'days',
    manageMiles: 'Manage Miles',
    linkLoyalty: 'Link Loyalty Account',
    noLoyalty: 'No loyalty account linked',
  },
};

function StatCard({ icon: Icon, value, label, color, subtitle }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: '48px', height: '48px',
          background: `${color}15`,
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={color} />
        </div>
        <TrendingUp size={16} color="#94a3b8" />
      </div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: color, marginTop: '0.25rem', fontWeight: '600' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status, lang }) {
  const getText = t[lang];
  const statusMap = {
    CONFIRMED: { label: getText.confirmed, bg: '#f0fdf4', color: '#16a34a' },
    confirmed: { label: getText.confirmed, bg: '#f0fdf4', color: '#16a34a' },
    PENDING: { label: getText.pending, bg: '#fffbeb', color: '#d97706' },
    pending: { label: getText.pending, bg: '#fffbeb', color: '#d97706' },
    CANCELLED: { label: getText.cancelled, bg: '#fef2f2', color: '#dc2626' },
    cancelled: { label: getText.cancelled, bg: '#fef2f2', color: '#dc2626' },
    SUBMITTED: { label: getText.submitted, bg: '#eff6ff', color: '#2563eb' },
    UNDER_REVIEW: { label: getText.underReview, bg: '#fffbeb', color: '#d97706' },
    RESOLVED: { label: getText.resolved, bg: '#f0fdf4', color: '#16a34a' },
    REBOOKED: { label: 'Rebooked', bg: '#f5f3ff', color: '#7c3aed' },
  };
  const s = statusMap[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '0.2rem 0.6rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
    }}>{s.label}</span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    user, logout, language, setLanguage,
    bookings, fetchBookings, bookingsLoading,
    claims, fetchClaims, baggageLoading,
    loyaltyAccount, fetchLoyaltyAccount, loyaltyLoading,
  } = useStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lang = language || 'ar';
  const getText = t[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    fetchBookings();
    fetchClaims();
    fetchLoyaltyAccount();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const upcomingBookings = bookings.filter(b =>
    b.status !== 'CANCELLED' && new Date(b.departure_at) > new Date()
  ).slice(0, 5);

  const recentClaims = claims.slice(0, 5);
  const activeClaims = claims.filter(c => !['CLOSED', 'RESOLVED — Compensation Approved'].includes(c.status));

  const userName = lang === 'ar'
    ? `${user?.first_name_ar || ''} ${user?.last_name_ar || ''}`
    : `${user?.first_name_en || ''} ${user?.last_name_en || ''}`;

  const tierColors = {
    BLUE: '#3b82f6', SILVER: '#64748b', GOLD: '#c9a84c', PLATINUM: '#7c3aed',
  };
  const tierColor = tierColors[loyaltyAccount?.tier] || '#006847';

  const navItems = [
    { icon: Home, label: getText.dashboard, path: '/dashboard', active: true },
    { icon: Plane, label: getText.myBookings, path: '/bookings' },
    { icon: Package, label: getText.baggage, path: '/baggage' },
    { icon: Star, label: getText.loyalty, path: '/loyalty' },
    { icon: Armchair, label: getText.seats, path: '/seats' },
    { icon: CheckCircle, label: getText.checkin, path: '/checkin' },
    { icon: User, label: getText.profile, path: '/profile' },
  ];

  const styles = {
    layout: {
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      direction: isRtl ? 'rtl' : 'ltr',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    },
    sidebar: {
      width: '260px',
      background: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      [isRtl ? 'right' : 'left']: 0,
      height: '100vh',
      zIndex: 200,
      transform: sidebarOpen ? 'translateX(0)' : `translateX(${isRtl ? '100%' : '-100%'})`,
      transition: 'transform 0.3s ease',
      overflowY: 'auto',
    },
    sidebarDesktop: {
      width: '260px',
      background: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    },
    sidebarHeader: {
      padding: '1.5rem',
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    logoCircle: {
      width: '44px', height: '44px',
      background: '#006847',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brandName: { color: '#ffffff', fontSize: '1rem', fontWeight: '700' },
    brandSub: { color: '#00a86b', fontSize: '0.72rem' },
    navSection: { padding: '1rem 0', flex: 1 },
    navItem: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1.5rem',
      cursor: 'pointer',
      color: active ? '#ffffff' : '#94a3b8',
      background: active ? 'rgba(0,104,71,0.2)' : 'transparent',
      borderRight: active && isRtl ? '3px solid #006847' : 'none',
      borderLeft: active && !isRtl ? '3px solid #006847' : 'none',
      transition: 'all 0.2s',
      fontSize: '0.88rem',
      fontWeight: active ? '600' : '400',
      textDecoration: 'none',
    }),
    sidebarFooter: {
      padding: '1rem 1.5rem',
      borderTop: '1px solid #334155',
    },
    logoutBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#94a3b8',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.88rem',
      padding: '0.5rem 0',
      width: '100%',
      transition: 'color 0.2s',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      marginLeft: isRtl ? 0 : '260px',
      marginRight: isRtl ? '260px' : 0,
      minWidth: 0,
    },
    topbar: {
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 1.5rem',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    content: {
      padding: '1.5rem',
      flex: 1,
    },
    welcomeBanner: {
      background: 'linear-gradient(135deg, #006847 0%, #1e3a5f 100%)',
      borderRadius: '16px',
      padding: '1.5rem 2rem',
      marginBottom: '1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    twoColGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1.5rem',
      marginBottom: '1.5rem',
    },
    card: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    },
    cardTitle: {
      fontSize: '0.95rem',
      fontWeight: '700',
      color: '#0f172a',
    },
    viewAllBtn: {
      background: 'none',
      border: 'none',
      color: '#006847',
      fontSize: '0.82rem',
      cursor: 'pointer',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      padding: '0.6rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#64748b',
      textAlign: isRtl ? 'right' : 'left',
      borderBottom: '1px solid #e2e8f0',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '0.75rem',
      fontSize: '0.85rem',
      color: '#374151',
      borderBottom: '1px solid #f1f5f9',
      whiteSpace: 'nowrap',
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    quickAction: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
      textDecoration: 'none',
    },
    quickActionIcon: {
      width: '48px', height: '48px',
      borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 0.75rem',
    },
    loyaltyCard: {
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: '12px',
      padding: '1.5rem',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
    },
    menuBtn: {
      display: 'none',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#374151',
      padding: '0.5rem',
    },
  };

  const renderSidebarContent = () => (
    <>
      <div style={styles.sidebarHeader}>
        <div style={styles.logoCircle}><Plane size={22} color="#ffffff" /></div>
        <div>
          <div style={styles.brandName}>طيران السعودية</div>
          <div style={styles.brandSub}>Air Saudia</div>
        </div>
      </div>
      <nav style={styles.navSection}>
        {navItems.map((item) => (
          <div
            key={item.path}
            style={styles.navItem(item.active)}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="#94a3b8" />
          </div>
          <div>
            <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '600' }}>{userName || 'Passenger'}</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{user?.email}</div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          <span>{getText.logout}</span>
        </button>
      </div>
    </>
  );

  return (
    <div style={styles.layout}>
      {/* Desktop Sidebar */}
      <div style={{ ...styles.sidebarDesktop, display: window.innerWidth > 768 ? 'flex' : 'none' }}>
        {renderSidebarContent()}
      </div>

      {/* Mobile Sidebar */}
      <div style={{ ...styles.sidebar, display: window.innerWidth <= 768 ? 'flex' : 'none' }}>
        {renderSidebarContent()}
      </div>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{ ...styles.menuBtn, display: 'flex' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{getText.dashboard}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', color: '#374151', fontWeight: '600' }}
              onClick={toggleLanguage}
            >
              <Globe size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
              {getText.switchLang}
            </button>