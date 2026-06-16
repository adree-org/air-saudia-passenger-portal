```javascript
'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const {
  User,
  Session,
  OtpCode,
  PasswordResetToken,
  PdplConsent,
  NotificationPreferences,
  AuditLog,
  NotificationLog,
} = require('../models/index');
const { requireAuth, generateToken } = require('../middleware/auth');

const BCRYPT_ROUNDS = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/;

function validatePasswordComplexity(password) {
  return PASSWORD_REGEX.test(password);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function redactEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.substring(0, 2)}***@${domain}`;
}

function redactPhone(phone) {
  return phone.replace(/(\+\d{3})\d+(\d{4})/, '$1****$2');
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      national_id,
      password,
      first_name_ar,
      last_name_ar,
      first_name_en,
      last_name_en,
      phone_number,
      preferred_language = 'ar',
      nationality,
      date_of_birth,
      pdpl_consent,
      pdpl_consent_version = '2023-v1',
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    const errors = [];

    if (!email || typeof email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required.', messageAr: 'البريد الإلكتروني مطلوب.' });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push({ field: 'email', message: 'Invalid email format.', messageAr: 'صيغة البريد الإلكتروني غير صحيحة.' });
      }
    }

    if (!password) {
      errors.push({ field: 'password', message: 'Password is required.', messageAr: 'كلمة المرور مطلوبة.' });
    } else if (!validatePasswordComplexity(password)) {
      errors.push({
        field: 'password',
        message: 'Password must be 8–64 characters and include uppercase, lowercase, digit, and special character.',
        messageAr: 'يجب أن تكون كلمة المرور 8-64 حرفاً وتتضمن حرفاً كبيراً وصغيراً ورقماً وحرفاً خاصاً.',
      });
    }

    if (!first_name_ar || !last_name_ar || !first_name_en || !last_name_en) {
      errors.push({ field: 'name', message: 'Full name (Arabic and English) is required.', messageAr: 'الاسم الكامل بالعربية والإنجليزية مطلوب.' });
    }

    if (!phone_number) {
      errors.push({ field: 'phone_number', message: 'Phone number is required.', messageAr: 'رقم الهاتف مطلوب.' });
    }

    if (!nationality || nationality.length !== 3) {
      errors.push({ field: 'nationality', message: 'Valid 3-letter nationality code is required.', messageAr: 'رمز الجنسية مكوّن من 3 أحرف مطلوب.' });
    }

    if (!pdpl_consent) {
      errors.push({
        field: 'pdpl_consent',
        message: 'PDPL consent must be accepted before registration.',
        messageAr: 'يجب قبول موافقة نظام PDPL قبل التسجيل.',
      });
    }

    if (!['ar', 'en'].includes(preferred_language)) {
      errors.push({ field: 'preferred_language', message: 'Language must be ar or en.', messageAr: 'اللغة يجب أن تكون ar أو en.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Check for duplicate email ─────────────────────────────────────────────
    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      await AuditLog.create({
        eventType: 'REGISTER_DUPLICATE_EMAIL',
        entityType: 'User',
        entityId: existingUser.id,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        outcome: 'FAILURE',
      });
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        messageAr: 'يوجد حساب مسجّل بهذا البريد الإلكتروني بالفعل.',
      });
    }

    // ── Check duplicate National ID ───────────────────────────────────────────
    if (national_id) {
      const existingById = await User.findByNationalId(national_id);
      if (existingById) {
        return res.status(409).json({
          success: false,
          message: 'An account with this National ID already exists.',
          messageAr: 'يوجد حساب مسجّل بهذا الرقم الوطني بالفعل.',
        });
      }
    }

    // ── Hash password & create user ───────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await User.create({
      email: normalizedEmail,
      nationalId: national_id || null,
      passwordHash,
      firstNameAr: first_name_ar.trim(),
      lastNameAr: last_name_ar.trim(),
      firstNameEn: first_name_en.trim(),
      lastNameEn: last_name_en.trim(),
      phoneNumber: phone_number,
      preferredLanguage: preferred_language,
      nationality: nationality.toUpperCase(),
      dateOfBirth: date_of_birth || null,
    });

    // ── Log PDPL consent ──────────────────────────────────────────────────────
    await PdplConsent.create({
      userId: newUser.id,
      consentVersion: pdpl_consent_version,
      ipAddress: getClientIp(req),
      consentType: 'registration',
    });

    // ── Seed notification preferences ─────────────────────────────────────────
    await NotificationPreferences.upsert({
      userId: newUser.id,
      emailBookingConfirmations: true,
      smsFlightAlerts: true,
      loyaltyNewsletters: false,
    });

    // ── Generate and store OTP ────────────────────────────────────────────────
    const otp = generateOtp();
    const codeHash = await bcrypt.hash(otp, 10);

    await OtpCode.create({
      userId: newUser.id,
      purpose: 'registration',
      codeHash,
      deliveryChannel: 'email',
      deliveredTo: redactEmail(normalizedEmail),
    });

    // ── Log notification ──────────────────────────────────────────────────────
    await NotificationLog.create({
      userId: newUser.id,
      channel: 'email',
      recipient: redactEmail(normalizedEmail),
      templateId: `registration-otp-${preferred_language}`,
      language: preferred_language,
      subject: preferred_language === 'ar'
        ? 'رمز التحقق من تسجيل حسابك - Air Saudia'
        : 'Your Air Saudia Account Verification Code',
      status: 'queued',
      referenceType: 'otp',
      referenceId: newUser.id,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await AuditLog.create({
      userId: newUser.id,
      eventType: 'USER_REGISTRATION',
      entityType: 'User',
      entityId: newUser.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      outcome: 'SUCCESS',
      metadata: { email: normalizedEmail, preferred_language },
    });

    // ── In development, return OTP for testing ────────────────────────────────
    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined;

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      messageAr: 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني بالرمز المرسل.',
      data: {
        userId: newUser.id,
        email: normalizedEmail,
        otpDeliveredTo: redactEmail(normalizedEmail),
        ...(devOtp && { _dev_otp: devOtp }),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { user_id, otp, purpose = 'registration' } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({
        success: false,
        message: 'user_id and otp are required.',
        messageAr: 'معرّف المستخدم ورمز التحقق مطلوبان.',
      });
    }

    const otpRecord = await OtpCode.findValidByUserId(user_id, purpose);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP is invalid or has expired.',
        messageAr: 'رمز التحقق غير صالح أو انتهت صلاحيته.',
      });
    }

    const isMatch = await bcrypt.compare(String(otp), otpRecord.code_hash);
    if (!isMatch) {
      await AuditLog.create({
        userId: user_id,
        eventType: 'OTP_VERIFY_FAILURE',
        entityType: 'User',
        entityId: user_id,
        ipAddress: getClientIp(req),
        outcome: 'FAILURE',
        metadata: { purpose },
      });
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code.',
        messageAr: 'رمز التحقق غير صحيح.',
      });
    }

    // Mark OTP as used
    await OtpCode.markUsed(otpRecord.id);

    if (purpose === 'registration') {
      await User.activateAccount(user_id);
    }

    await AuditLog.create({
      userId: user_id,
      eventType: 'OTP_VERIFY_SUCCESS',
      entityType: 'User',
      entityId: user_id,
      ipAddress: getClientIp(req),
      outcome: 'SUCCESS',
      metadata: { purpose },
    });

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      messageAr: 'تم التحقق من الرمز بنجاح.',
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        messageAr: 'البريد الإلكتروني وكلمة المرور مطلوبان.',
      });
    }

    const user = await User.findByEmail(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحين.',
      });
    }

    // Check account status
    if (user.account_status === 'locked') {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to multiple failed login attempts. Please reset your password.',
        messageAr: 'تم قفل الحساب بسبب محاولات تسجيل دخول فاشلة متعددة. يرجى إعادة تعيين كلمة المرور.',
      });
    }

    if (user.account_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Account is not yet verified. Please check your email for the OTP.',
        messageAr: 'الحساب لم يتم التحقق منه بعد. يرجى مراجعة بريدك الإلكتروني للحصول على رمز التحقق.',
      });
    }

    if (user.account_status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact support.',
        messageAr: 'تم تعليق الحساب. يرجى التواصل مع الدعم.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const failCount = await User.incrementFailedLogin(user.id);

      if (failCount >= 5) {
        await User.lockAccount(user.id);
        await AuditLog.create({
          userId: user.id,
          eventType: 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'],
          outcome: 'FAILURE',
          metadata: { reason: 'max_failed_logins' },
        });
        return res.status(423).json({
          success: false,
          message: 'Account locked after 5 failed attempts. Please reset your password.',
          messageAr: 'تم قفل الحساب بعد 5 محاولات فاشلة. يرجى إعادة تعيين كلمة المرور.',
        });
      }

      await AuditLog.create({
        userId: user.id,
        eventType: 'LOGIN_FAILURE',
        entityType: 'User',
        entityId: user.id,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        outcome: 'FAILURE',
        metadata: { failed_count: failCount },
      });

      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${5 - failCount} attempt(s) remaining before lockout.`,
        messageAr: `البريد الإلكتروني أو كلمة المرور غير صحيحين. تبقى ${5 - failCount} محاولة/محاولات قبل القفل.`,
        remainingAttempts: 5 - failCount,
      });
    }

    // Reset failed login count on success
    await User.resetFailedLogin(user.id);

    // ── MFA Check ─────────────────────────────────────────────────────────────
    if (user.mfa_enabled) {
      // Issue a short-lived pre-auth token for MFA step
      const preAuthToken = generateToken(user.id, 'pre_auth', user.email);
      await AuditLog.create({
        userId: user.id,
        eventType: 'LOGIN_MFA_REQUIRED',
        entityType: 'Session',
        entityId: user.id,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        outcome: 'SUCCESS',
        metadata: { mfa_method: user.mfa_method },
      });

      if (user.mfa_method === 'sms') {
        const otp = generateOtp();
        const codeHash = await bcrypt.hash(otp, 10);
        await OtpCode.invalidateAllByUserId(user.id, 'mfa');
        await OtpCode.create({
          userId: user.id,
          purpose: 'mfa',
          codeHash,
          deliveryChannel: 'sms',
          deliveredTo: redactPhone(user.phone_number),
        });
        const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined;

        return res.json({
          success: true,
          requiresMfa: true,
          mfaMethod: 'sms',
          preAuthToken,
          otpDeliveredTo: redactPhone(user.phone_number),
          message: 'MFA required. OTP sent to your mobile.',
          messageAr: 'التحقق بخطوتين مطلوب. تم إرسال رمز التحقق إلى هاتفك.',
          ...(devOtp && { _dev_otp: devOtp }),
        });
      }

      return res.json({
        success: true,
        requiresMfa: true,
        mfaMethod: 'totp',
        preAuthToken,
        message: 'MFA required. Please enter your authenticator app code.',
        messageAr: 'التحقق بخطوتين مطلوب. يرجى إدخال رمز تطبيق المصادقة.',
      });
    }

    // ── Issue tokens ──────────────────────────────────────────────────────────
    const accessToken = generateToken(user.id, user.account_status, user.email);
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await Session.create({
      userId: user.id,
      refreshTokenHash,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    await AuditLog.create({
      userId: user.id,
      eventType: 'USER_LOGIN',
      entityType: 'Session',
      entityId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      outcome: 'SUCCESS',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      messageAr: 'تم تسجيل الدخول بنجاح.',
      data: {
        accessToken,
        user: User.sanitize(user),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/mfa/verify
// ─────────────────────────────────────────────────────────────────────────────
router.post('/mfa/verify', requireAuth, async (req, res, next) => {
  try {
    const { otp, totp_code } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', messageAr: 'المستخدم غير موجود.' });
    }

    if (user.mfa_method === 'sms') {
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP code required.', messageAr: 'رمز التحقق مطلوب.' });
      }
      const otpRecord = await OtpCode.findValidByUserId(userId, 'mfa');
      if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'OTP expired or not found.', messageAr: 'انتهت صلاحية رمز التحقق أو غير موجود.' });
      }
      const isMatch = await bcrypt.compare(String(otp), otpRecord.code_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect OTP.', messageAr: 'رمز التحقق غير صحيح.' });
      }
      await OtpCode.markUsed(otpRecord.id);
    } else if (user.mfa_method === 'totp') {
      if (!totp_code) {
        return res.status(400).json({ success: false, message: 'TOTP code required.', messageAr: 'رمز TOTP مطلوب.' });
      }
      const speakeasy = require('speakeasy');
      const isValid = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: String(totp_code),
        window: 1, // 30-second tolerance
      });
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid TOTP code.', messageAr: 'رمز TOTP غير صالح.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'MFA method not configured.', messageAr: 'لم يتم تهيئة طريقة التحقق الثنائي.' });
    }

    // Issue real access + refresh tokens
    const accessToken = generateToken(user.id, user.account_status, user.email);
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await Session.create({
      userId: user.id,
      refreshTokenHash,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    await AuditLog.create({
      userId: user.id,
      eventType: 'MFA_VERIFY_SUCCESS',
      entityType: 'Session',
      entityId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      outcome: 'SUCCESS',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    return res.json({
      success: true,
      message: 'MFA verified. Login complete.',
      messageAr: 'تم التحقق بنجاح. تسجيل الدخول مكتمل.',
      data: {
        accessToken,
        user: User.sanitize(user),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.user.sessionId;
    if (sessionId) {
      await Session.revokeById(sessionId);
    }

    await AuditLog.create({
      userId: req.user.userId,
      sessionId,
      eventType: 'USER_LOGOUT',
      entityType: 'Session',
      entityId: sessionId,
      ipAddress: getClientIp(req),
      outcome: 'SUCCESS',
    });

    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

    return res.json({
      success: true,
      message: 'Logged out successfully.',