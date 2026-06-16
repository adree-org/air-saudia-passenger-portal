```jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Plane, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import useStore from '../store/index.js';

const t = {
  ar: {
    title: 'طيران السعودية',
    subtitle: 'بوابة المسافر',
    loginTab: 'تسجيل الدخول',
    registerTab: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginBtn: 'تسجيل الدخول',
    registerBtn: 'إنشاء الحساب',
    firstName: 'الاسم الأول (عربي)',
    lastName: 'اسم العائلة (عربي)',
    firstNameEn: 'الاسم الأول (إنجليزي)',
    lastNameEn: 'اسم العائلة (إنجليزي)',
    phone: 'رقم الجوال',
    phonePlaceholder: '+966XXXXXXXXX',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPlaceholder: 'أعد إدخال كلمة المرور',
    nationality: 'الجنسية',
    nationalityPlaceholder: 'SAU',
    language: 'اللغة المفضلة',
    pdplConsent: 'أوافق على سياسة الخصوصية وشروط نظام حماية البيانات الشخصية (PDPL)',
    otpTitle: 'التحقق من الهوية',
    otpSubtitle: 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني',
    otpLabel: 'رمز التحقق',
    otpPlaceholder: 'أدخل الرمز المكون من 6 أرقام',
    otpVerifyBtn: 'تحقق',
    otpResend: 'إعادة إرسال الرمز',
    mfaTitle: 'التحقق الثنائي',
    mfaSubtitle: 'أدخل رمز المصادقة',
    passwordStrength: 'قوة كلمة المرور',
    weak: 'ضعيفة',
    fair: 'مقبولة',
    good: 'جيدة',
    strong: 'قوية',
    emailError: 'بريد إلكتروني غير صحيح',
    passwordError: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز خاص',
    confirmError: 'كلمات المرور غير متطابقة',
    pdplError: 'يجب الموافقة على سياسة الخصوصية',
    requiredError: 'هذا الحقل مطلوب',
    switchLang: 'English',
    forgotPasswordTitle: 'استعادة كلمة المرور',
    forgotPasswordSubtitle: 'أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين',
    sendResetLink: 'إرسال رابط الاستعادة',
    backToLogin: 'العودة لتسجيل الدخول',
    resetSent: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني',
  },
  en: {
    title: 'Air Saudia',
    subtitle: 'Passenger Portal',
    loginTab: 'Login',
    registerTab: 'Register',
    email: 'Email Address',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot Password?',
    loginBtn: 'Sign In',
    registerBtn: 'Create Account',
    firstName: 'First Name (Arabic)',
    lastName: 'Last Name (Arabic)',
    firstNameEn: 'First Name (English)',
    lastNameEn: 'Last Name (English)',
    phone: 'Mobile Number',
    phonePlaceholder: '+966XXXXXXXXX',
    confirmPassword: 'Confirm Password',
    confirmPlaceholder: 'Re-enter your password',
    nationality: 'Nationality',
    nationalityPlaceholder: 'SAU',
    language: 'Preferred Language',
    pdplConsent: 'I agree to the Privacy Policy and PDPL Data Protection terms',
    otpTitle: 'Identity Verification',
    otpSubtitle: 'Enter the verification code sent to your email',
    otpLabel: 'Verification Code',
    otpPlaceholder: 'Enter 6-digit code',
    otpVerifyBtn: 'Verify',
    otpResend: 'Resend Code',
    mfaTitle: 'Two-Factor Authentication',
    mfaSubtitle: 'Enter your authentication code',
    passwordStrength: 'Password Strength',
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    emailError: 'Invalid email address',
    passwordError: 'Password must be 8+ chars with uppercase, lowercase, digit and special character',
    confirmError: 'Passwords do not match',
    pdplError: 'You must agree to the privacy policy',
    requiredError: 'This field is required',
    switchLang: 'عربي',
    forgotPasswordTitle: 'Reset Password',
    forgotPasswordSubtitle: 'Enter your email to receive a reset link',
    sendResetLink: 'Send Reset Link',
    backToLogin: 'Back to Login',
    resetSent: 'Password reset link has been sent to your email',
  },
};

function PasswordStrengthMeter({ password, lang }) {
  const getText = t[lang];
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const labels = [getText.weak, getText.weak, getText.fair, getText.good, getText.strong, getText.strong];
  const colors = ['#ef4444', '#ef4444', '#f97316', '#eab308', '#22c55e', '#22c55e'];

  if (!password) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: i <= strength ? colors[strength] : '#e2e8f0',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '0.75rem', color: colors[strength] }}>
        {getText.passwordStrength}: {labels[strength]}
      </span>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, verifyRegistrationOtp, isLoading, error, clearError, language, setLanguage, mfaPending } = useStore();

  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const lang = language || 'ar';
  const getText = t[lang];
  const isRtl = lang === 'ar';

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    last_name_en: '',
    phone_number: '',
    nationality: '',
    preferred_language: lang,
    pdplConsent: false,
  });
  const [otpCode, setOtpCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    clearError();
  }, [activeTab]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pwd) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(pwd);

  const handleLogin = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!loginForm.email) errors.email = getText.requiredError;
    else if (!validateEmail(loginForm.email)) errors.email = getText.emailError;
    if (!loginForm.password) errors.password = getText.requiredError;
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    const result = await login(loginForm);
    if (result?.mfaRequired) {
      setShowMfa(true);
    } else if (result?.success) {
      navigate('/dashboard');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!registerForm.email) errors.email = getText.requiredError;
    else if (!validateEmail(registerForm.email)) errors.email = getText.emailError;
    if (!registerForm.password) errors.password = getText.requiredError;
    else if (!validatePassword(registerForm.password)) errors.password = getText.passwordError;
    if (registerForm.password !== registerForm.confirmPassword) errors.confirmPassword = getText.confirmError;
    if (!registerForm.first_name_ar) errors.first_name_ar = getText.requiredError;
    if (!registerForm.last_name_ar) errors.last_name_ar = getText.requiredError;
    if (!registerForm.first_name_en) errors.first_name_en = getText.requiredError;
    if (!registerForm.last_name_en) errors.last_name_en = getText.requiredError;
    if (!registerForm.phone_number) errors.phone_number = getText.requiredError;
    if (!registerForm.pdplConsent) errors.pdplConsent = getText.pdplError;
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});

    const { confirmPassword, pdplConsent, ...submitData } = registerForm;
    const result = await register({ ...submitData, pdplConsent: true });
    if (result?.success) {
      setRegisteredEmail(registerForm.email);
      setShowOtp(true);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setFieldErrors({ otp: getText.requiredError });
      return;
    }
    setFieldErrors({});
    const result = await verifyRegistrationOtp({ email: registeredEmail, code: otpCode, purpose: 'registration' });
    if (result?.success) {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!validateEmail(forgotEmail)) {
      setFieldErrors({ forgotEmail: getText.emailError });
      return;
    }
    setFieldErrors({});
    try {
      const { requestPasswordReset } = await import('../api/client.js');
      await requestPasswordReset({ email: forgotEmail });
      setSuccessMessage(getText.resetSent);
    } catch (_) {
      setSuccessMessage(getText.resetSent); // Always show success for security
    }
  };

  const toggleLanguage = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #006847 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      direction: isRtl ? 'rtl' : 'ltr',
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    },
    container: {
      width: '100%',
      maxWidth: '460px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    logoCircle: {
      width: '64px',
      height: '64px',
      background: '#006847',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1rem',
    },
    title: {
      color: '#ffffff',
      fontSize: '1.8rem',
      fontWeight: '800',
      marginBottom: '0.25rem',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: '0.9rem',
    },
    card: {
      background: '#ffffff',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    },
    tabs: {
      display: 'flex',
      borderBottom: '2px solid #e2e8f0',
      marginBottom: '1.5rem',
    },
    tab: (active) => ({
      flex: 1,
      padding: '0.75rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: active ? '700' : '500',
      color: active ? '#006847' : '#64748b',
      borderBottom: active ? '2px solid #006847' : '2px solid transparent',
      marginBottom: '-2px',
      transition: 'all 0.2s',
    }),
    formGroup: {
      marginBottom: '1rem',
    },
    label: {
      display: 'block',
      fontSize: '0.83rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.4rem',
    },
    input: (hasError) => ({
      width: '100%',
      padding: '0.65rem 0.9rem',
      border: `1.5px solid ${hasError ? '#ef4444' : '#d1d5db'}`,
      borderRadius: '8px',
      fontSize: '0.9rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      background: '#ffffff',
      color: '#0f172a',
      boxSizing: 'border-box',
    }),
    inputWrapper: {
      position: 'relative',
    },
    eyeBtn: {
      position: 'absolute',
      [isRtl ? 'left' : 'right']: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
    },
    errorText: {
      color: '#ef4444',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    },
    submitBtn: {
      width: '100%',
      padding: '0.85rem',
      background: '#006847',
      color: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
    },
    forgotLink: {
      background: 'none',
      border: 'none',
      color: '#006847',
      fontSize: '0.82rem',
      cursor: 'pointer',
      padding: 0,
      textDecoration: 'underline',
    },
    checkboxRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      marginBottom: '1rem',
    },
    checkbox: {
      marginTop: '2px',
      width: '16px',
      height: '16px',
      cursor: 'pointer',
      accentColor: '#006847',
    },
    checkboxLabel: {
      fontSize: '0.8rem',
      color: '#374151',
      lineHeight: '1.5',
    },
    globalError: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      color: '#dc2626',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    successMsg: {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      color: '#16a34a',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    langBtn: {
      position: 'fixed',
      top: '1rem',
      [isRtl ? 'left' : 'right']: '1rem',
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.3)',
      color: '#ffffff',
      padding: '0.4rem 1rem',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '0.82rem',
      backdropFilter: 'blur(10px)',
    },
    select: {
      width: '100%',
      padding: '0.65rem 0.9rem',
      border: '1.5px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9rem',
      outline: 'none',
      background: '#ffffff',
      color: '#0f172a',
      boxSizing: 'border-box',
    },
    twoCol: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.75rem',
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: '#006847',
      cursor: 'pointer',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      marginBottom: '1rem',
      padding: 0,
    },
  };

  const renderForgotPassword = () => (
    <div>
      <button style={styles.backBtn} onClick={() => { setShowForgotPassword(false); setSuccessMessage(''); }}>
        ← {getText.backToLogin}
      </button>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>{getText.forgotPasswordTitle}</h3>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{getText.forgotPasswordSubtitle}</p>
      {successMessage && (
        <div style={styles.successMsg}><CheckCircle size={16} />{successMessage}</div>
      )}
      <form onSubmit={handleForgotPassword}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.email}</label>
          <input
            style={styles.input(!!fieldErrors.forgotEmail)}
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder={getText.emailPlaceholder}
          />
          {fieldErrors.forgotEmail && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.forgotEmail}</div>}
        </div>
        <button type="submit" style={styles.submitBtn} disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="spin" /> : null}
          {getText.sendResetLink}
        </button>
      </form>
    </div>
  );

  const renderOtpVerification = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ ...styles.logoCircle, background: '#006847', margin: '0 auto 1rem' }}>
          <Shield size={28} color="#ffffff" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>{getText.otpTitle}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>{getText.otpSubtitle}</p>
        <p style={{ color: '#006847', fontSize: '0.85rem', fontWeight: '600' }}>{registeredEmail}</p>
      </div>
      {error && <div style={styles.globalError}><AlertCircle size={16} />{error}</div>}
      <form onSubmit={handleOtpVerify}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.otpLabel}</label>
          <input
            style={{ ...styles.input(!!fieldErrors.otp), textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3em' }}
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
          />
          {fieldErrors.otp && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.otp}</div>}
        </div>
        <button type="submit" style={styles.submitBtn} disabled={isLoading}>
          {isLoading ? <Loader2 size={18} /> : null}
          {getText.otpVerifyBtn}
        </button>
        <button type="button" style={{ ...styles.forgotLink, display: 'block', textAlign: 'center', marginTop: '1rem', width: '100%' }}>
          {getText.otpResend}
        </button>
      </form>
    </div>
  );

  const renderMfaChallenge = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ ...styles.logoCircle, margin: '0 auto 1rem' }}>
          <Shield size={28} color="#ffffff" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>{getText.mfaTitle}</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>{getText.mfaSubtitle}</p>
      </div>
      {error && <div style={styles.globalError}><AlertCircle size={16} />{error}</div>}
      <form onSubmit={async (e) => {
        e.preventDefault();
        const { verifyMfa } = await import('../api/client.js');
        try {
          const res = await verifyMfa({ code: otpCode });
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          navigate('/dashboard');
        } catch (_) {}
      }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.otpLabel}</label>
          <input
            style={{ ...styles.input(false), textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3em' }}
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
          />
        </div>
        <button type="submit" style={styles.submitBtn} disabled={isLoading}>
          {isLoading ? <Loader2 size={18} /> : null}
          {getText.otpVerifyBtn}
        </button>
      </form>
    </div>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin}>
      {error && <div style={styles.globalError}><AlertCircle size={16} />{error}</div>}
      <div style={styles.formGroup}>
        <label style={styles.label}>{getText.email}</label>
        <input
          style={styles.input(!!fieldErrors.email)}
          type="email"
          value={loginForm.email}
          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
          placeholder={getText.emailPlaceholder}
          autoComplete="email"
        />
        {fieldErrors.email && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.email}</div>}
      </div>
      <div style={styles.formGroup}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>{getText.password}</label>
          <button type="button" style={styles.forgotLink} onClick={() => setShowForgotPassword(true)}>
            {getText.forgotPassword}
          </button>
        </div>
        <div style={styles.inputWrapper}>
          <input
            style={{ ...styles.input(!!fieldErrors.password), paddingRight: isRtl ? '0.9rem' : '2.8rem', paddingLeft: isRtl ? '2.8rem' : '0.9rem' }}
            type={showPassword ? 'text' : 'password'}
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            placeholder={getText.passwordPlaceholder}
            autoComplete="current-password"
          />
          <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {fieldErrors.password && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.password}</div>}
      </div>
      <button type="submit" style={styles.submitBtn} disabled={isLoading}>
        {isLoading ? <Loader2 size={18} /> : <Plane size={18} />}
        {getText.loginBtn}
      </button>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
      {error && <div style={styles.globalError}><AlertCircle size={16} />{error}</div>}
      <div style={styles.twoCol}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.firstName}</label>
          <input
            style={styles.input(!!fieldErrors.first_name_ar)}
            type="text"
            value={registerForm.first_name_ar}
            onChange={(e) => setRegisterForm({ ...registerForm, first_name_ar: e.target.value })}
            placeholder="محمد"
          />
          {fieldErrors.first_name_ar && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.first_name_ar}</div>}
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.lastName}</label>
          <input
            style={styles.input(!!fieldErrors.last_name_ar)}
            type="text"
            value={registerForm.last_name_ar}
            onChange={(e) => setRegisterForm({ ...registerForm, last_name_ar: e.target.value })}
            placeholder="العمري"
          />
          {fieldErrors.last_name_ar && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.last_name_ar}</div>}
        </div>
      </div>
      <div style={styles.twoCol}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.firstNameEn}</label>
          <input
            style={styles.input(!!fieldErrors.first_name_en)}
            type="text"
            value={registerForm.first_name_en}
            onChange={(e) => setRegisterForm({ ...registerForm, first_name_en: e.target.value })}
            placeholder="Mohammed"
          />
          {fieldErrors.first_name_en && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.first_name_en}</div>}
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.lastNameEn}</label>
          <input
            style={styles.input(!!fieldErrors.last_name_en)}
            type="text"
            value={registerForm.last_name_en}
            onChange={(e) => setRegisterForm({ ...registerForm, last_name_en: e.target.value })}
            placeholder="Al-Omari"
          />
          {fieldErrors.last_name_en && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.last_name_en}</div>}
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{getText.email}</label>
        <input
          style={styles.input(!!fieldErrors.email)}
          type="email"
          value={registerForm.email}
          onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
          placeholder={getText.emailPlaceholder}
        />
        {fieldErrors.email && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.email}</div>}
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{getText.phone}</label>
        <input
          style={styles.input(!!fieldErrors.phone_number)}
          type="tel"
          value={registerForm.phone_number}
          onChange={(e) => setRegisterForm({ ...registerForm, phone_number: e.target.value })}
          placeholder={getText.phonePlaceholder}
        />
        {fieldErrors.phone_number && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.phone_number}</div>}
      </div>
      <div style={styles.twoCol}>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.nationality}</label>
          <input
            style={styles.input(false)}
            type="text"
            value={registerForm.nationality}
            onChange={(e) => setRegisterForm({ ...registerForm, nationality: e.target.value.toUpperCase().slice(0, 3) })}
            placeholder={getText.nationalityPlaceholder}
            maxLength={3}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{getText.language}</label>
          <select
            style={styles.select}
            value={registerForm.preferred_language}
            onChange={(e) => setRegisterForm({ ...registerForm, preferred_language: e.target.value })}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{getText.password}</label>
        <div style={styles.inputWrapper}>
          <input
            style={{ ...styles.input(!!fieldErrors.password), paddingRight: isRtl ? '0.9rem' : '2.8rem', paddingLeft: isRtl ? '2.8rem' : '0.9rem' }}
            type={showPassword ? 'text' : 'password'}
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            placeholder={getText.passwordPlaceholder}
          />
          <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordStrengthMeter password={registerForm.password} lang={lang} />
        {fieldErrors.password && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.password}</div>}
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{getText.confirmPassword}</label>
        <div style={styles.inputWrapper}>
          <input
            style={{ ...styles.input(!!fieldErrors.confirmPassword), paddingRight: isRtl ? '0.9rem' : '2.8rem', paddingLeft: isRtl ? '2.8rem' : '0.9rem' }}
            type={showConfirmPassword ? 'text' : 'password'}
            value={registerForm.confirmPassword}
            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
            placeholder={getText.confirmPlaceholder}
          />
          <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {fieldErrors.confirmPassword && <div style={styles.errorText}><AlertCircle size={12} />{fieldErrors.confirmPassword}</div>}
      </div>
      <div style={styles.checkboxRow}>
        <input
          type="checkbox"
          style={styles.checkbox}
          id="pdplConsent"
          checked={registerForm.pdplConsent}
          onChange={(e) => setRegisterForm({ ...registerForm, pdplConsent: e.target.checked })}
        />
        <label htmlFor="pdplConsent" style={styles.checkboxLabel}>{getText.pdplConsent}</label>
      </div>
      {fieldErrors.pdplConsent && <div style={{ ...styles.errorText, marginTop: '-0.75rem', marginBottom: '0.75rem' }}><AlertCircle size={12} />{fieldErrors.pdplConsent}</div>}
      <button type="submit" style={styles.submitBtn} disabled={isLoading}>
        {isLoading ? <Loader2 size={18} /> : <CheckCircle size={18} />}
        {getText.registerBtn}
      </button>
    </form>
  );

  return (
    <div style={styles.page}>
      <button style={styles.langBtn} onClick={toggleLanguage}>{getText.switchLang}</button>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <Plane size={28} color="#ffffff" />
          </div>
          <h1 style={styles.title}>{getText.title}</h1>
          <p style={styles.subtitle}>{getText.subtitle}</p>
        </div>
        <div style={styles.card}>
          {showForgotPassword ? renderForgotPassword() :
           showOtp ? renderOtpVerification() :
           showMfa || mfaPending ? renderMfaChallenge() : (
            <>
              <div style={styles.tabs}>
                <button style={styles.tab(activeTab === 'login')} onClick={() => { setActiveTab('login'); clearError(); setFieldErrors({}); }}>
                  {getText.loginTab}
                </button>
                <button style={styles.tab(activeTab === 'register')} onClick={() => { setActiveTab('register'); clearError(); setFieldErrors({}); }}>
                  {getText.registerTab}
                </button>
              </div>
              {activeTab === 'login' ? renderLoginForm() : renderRegisterForm()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
``