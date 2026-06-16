const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// Redis client for JWT revocation list
// ─────────────────────────────────────────────
let redisClient = null;

const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      tls: process.env.REDIS_TLS === 'true',
      rejectUnauthorized: process.env.REDIS_TLS === 'true',
    },
  });
  redisClient.on('error', (err) => {
    console.error('[auth-middleware] Redis client error:', err);
  });
  await redisClient.connect();
  return redisClient;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes (FR-002 AC-5)
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days (FR-002 AC-5)
const GENERATE_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days as per spec
const ISSUER = process.env.JWT_ISSUER || 'https://aspp.airsaudia.com.sa';
const AUDIENCE = process.env.JWT_AUDIENCE || 'aspp-api';
const REVOKED_JTIS_KEY = 'revoked_jtis';

// ─────────────────────────────────────────────
// Key helpers — RS256 preferred, HS256 fallback
// ─────────────────────────────────────────────
const getSigningKey = () => {
  if (process.env.JWT_PRIVATE_KEY) {
    return Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf8');
  }
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  throw new Error('[auth-middleware] No JWT signing key configured. Set JWT_PRIVATE_KEY (RS256) or JWT_SECRET (HS256).');
};

const getVerifyKey = () => {
  if (process.env.JWT_PUBLIC_KEY) {
    return Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf8');
  }
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  throw new Error('[auth-middleware] No JWT verification key configured. Set JWT_PUBLIC_KEY (RS256) or JWT_SECRET (HS256).');
};

const getAlgorithm = () => {
  return process.env.JWT_PRIVATE_KEY || process.env.JWT_PUBLIC_KEY ? 'RS256' : 'HS256';
};

// ─────────────────────────────────────────────
// generateToken
// Spec: generateToken(userId, role, email) with 7-day expiry
// Also supports generating short-lived access tokens internally
// ─────────────────────────────────────────────

/**
 * Generates a signed JWT token.
 *
 * @param {string} userId  - UUID of the authenticated passenger
 * @param {string} role    - RBAC role: 'PASSENGER' | 'AGENT' | 'ADMIN'
 * @param {string} email   - Passenger email address (included as non-PII claim)
 * @param {object} [options]
 * @param {number} [options.expiresIn]  - Override expiry in seconds (default: 7 days per spec)
 * @param {string} [options.locale]     - Preferred locale 'ar' | 'en' (default: 'ar')
 * @returns {string} Signed JWT string
 */
const generateToken = (userId, role, email, options = {}) => {
  if (!userId) throw new Error('[auth-middleware] generateToken: userId is required');
  if (!role) throw new Error('[auth-middleware] generateToken: role is required');
  if (!email) throw new Error('[auth-middleware] generateToken: email is required');

  const expiresIn = options.expiresIn !== undefined ? options.expiresIn : GENERATE_TOKEN_EXPIRY_SECONDS;
  const locale = options.locale || 'ar';
  const jti = uuidv4();

  const payload = {
    sub: userId,
    iss: ISSUER,
    aud: AUDIENCE,
    jti,
    roles: [role],
    email,
    locale,
  };

  const signingKey = getSigningKey();
  const algorithm = getAlgorithm();

  return jwt.sign(payload, signingKey, {
    algorithm,
    expiresIn,
  });
};

/**
 * Generates a short-lived access token (15 minutes) per HLD Section 7.1.1.
 *
 * @param {string} userId
 * @param {string} role
 * @param {string} email
 * @param {string} [locale]
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (userId, role, email, locale = 'ar') => {
  return generateToken(userId, role, email, {
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    locale,
  });
};

/**
 * Generates a refresh token (7 days) per HLD Section 7.1.1.
 *
 * @param {string} userId
 * @param {string} role
 * @param {string} email
 * @param {string} [locale]
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (userId, role, email, locale = 'ar') => {
  return generateToken(userId, role, email, {
    expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
    locale,
  });
};

// ─────────────────────────────────────────────
// verifyToken
// Spec: verifyToken(token) — validates signature, expiry, iss, aud, jti revocation
// ─────────────────────────────────────────────

/**
 * Verifies a JWT token string.
 * Checks: signature, expiry, issuer, audience, and Redis revocation list.
 *
 * @param {string} token - Raw JWT string
 * @returns {Promise<object>} Decoded payload if valid
 * @throws {Error} With code property: 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'TOKEN_INVALID'
 */
const verifyToken = async (token) => {
  if (!token || typeof token !== 'string') {
    const err = new Error('Token is required');
    err.code = 'TOKEN_INVALID';
    throw err;
  }

  let decoded;
  try {
    const verifyKey = getVerifyKey();
    const algorithm = getAlgorithm();

    decoded = jwt.verify(token, verifyKey, {
      algorithms: [algorithm],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  } catch (jwtError) {
    if (jwtError.name === 'TokenExpiredError') {
      const err = new Error('Token has expired');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    const err = new Error('Token is invalid');
    err.code = 'TOKEN_INVALID';
    err.original = jwtError.message;
    throw err;
  }

  // Check JWT revocation list in Redis (HLD Section 7.1.1 — Token revocation)
  if (decoded.jti) {
    try {
      const redis = await getRedisClient();
      const isRevoked = await redis.zScore(REVOKED_JTIS_KEY, decoded.jti);
      if (isRevoked !== null) {
        const err = new Error('Token has been revoked');
        err.code = 'TOKEN_REVOKED';
        throw err;
      }
    } catch (redisError) {
      if (redisError.code === 'TOKEN_REVOKED') {
        throw redisError;
      }
      // Redis unavailable — fail open with warning to avoid hard outage
      // In production, consider failing closed depending on security posture
      console.error('[auth-middleware] Redis revocation check failed — proceeding with caution:', redisError.message);
    }
  }

  return decoded;
};

// ─────────────────────────────────────────────
// revokeToken
// Adds a JTI to the Redis revocation sorted set with TTL-based expiry score
// ─────────────────────────────────────────────

/**
 * Revokes a JWT by adding its JTI to the Redis revocation list.
 * The score is set to the token's expiry timestamp so expired entries
 * can be pruned with ZREMRANGEBYSCORE.
 *
 * @param {string} jti   - JWT ID claim from the token
 * @param {number} exp   - Token expiry Unix timestamp
 * @returns {Promise<void>}
 */
const revokeToken = async (jti, exp) => {
  if (!jti) return;
  try {
    const redis = await getRedisClient();
    await redis.zAdd(REVOKED_JTIS_KEY, { score: exp, value: jti });
    // Prune expired entries to keep the set bounded
    const now = Math.floor(Date.now() / 1000);
    await redis.zRemRangeByScore(REVOKED_JTIS_KEY, '-inf', now - 1);
  } catch (err) {
    console.error('[auth-middleware] Failed to revoke token JTI:', err.message);
  }
};

// ─────────────────────────────────────────────
// requireAuth middleware
// Spec: Bearer extraction → req.user, 401 on fail
// ─────────────────────────────────────────────

/**
 * Express middleware that enforces authentication.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it via verifyToken(), and attaches the decoded
 * payload to req.user. Returns 401 on any failure.
 *
 * Per HLD Section 7.1.1: access tokens are transported via
 * Authorization: Bearer header. Refresh tokens travel via
 * HttpOnly cookie and are handled separately in the auth router.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      code: 'MISSING_TOKEN',
      messageEn: 'Authentication required. Please log in.',
      messageAr: 'المصادقة مطلوبة. يرجى تسجيل الدخول.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      code: 'INVALID_TOKEN_FORMAT',
      messageEn: 'Invalid Authorization header format. Expected: Bearer <token>',
      messageAr: 'تنسيق رأس التفويض غير صالح. المتوقع: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = await verifyToken(token);
    req.user = {
      id: decoded.sub,
      userId: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      locale: decoded.locale || 'ar',
      jti: decoded.jti,
      exp: decoded.exp,
      iat: decoded.iat,
    };
    return next();
  } catch (err) {
    if (err.code === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        messageEn: 'Your session has expired. Please log in again.',
        messageAr: 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.',
      });
    }
    if (err.code === 'TOKEN_REVOKED') {
      return res.status(401).json({
        code: 'TOKEN_REVOKED',
        messageEn: 'Your session has been invalidated. Please log in again.',
        messageAr: 'تم إلغاء جلستك. يرجى تسجيل الدخول مرة أخرى.',
      });
    }
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      messageEn: 'Invalid or malformed authentication token.',
      messageAr: 'رمز المصادقة غير صالح أو مشوه.',
    });
  }
};

// ─────────────────────────────────────────────
// requireRole middleware factory
// Spec: requireRole(...roles) — 403 on fail
// ─────────────────────────────────────────────

/**
 * Express middleware factory that enforces role-based access control.
 *
 * Must be used after requireAuth (depends on req.user being populated).
 * Returns 403 if the authenticated user does not hold at least one
 * of the required roles.
 *
 * Per HLD Section 7.1.5: roles are encoded in the JWT `roles` claim.
 * Route-level guards enforce role requirements before reaching domain handlers.
 *
 * @param {...string} roles - One or more required role strings
 *   Valid values: 'PASSENGER' | 'AGENT' | 'ADMIN'
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/admin/users', requireAuth, requireRole('ADMIN'), handler);
 * router.get('/bookings', requireAuth, requireRole('PASSENGER', 'AGENT'), handler);
 */
const requireRole = (...roles) => {
  if (roles.length === 0) {
    throw new Error('[auth-middleware] requireRole: at least one role must be specified');
  }

  const normalizedRoles = roles.map((r) => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      // requireAuth was not called before requireRole
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        messageEn: 'Authentication required.',
        messageAr: 'المصادقة مطلوبة.',
      });
    }

    const userRoles = (req.user.roles || []).map((r) => r.toUpperCase());
    const hasRequiredRole = normalizedRoles.some((required) => userRoles.includes(required));

    if (!hasRequiredRole) {
      return res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        messageEn: 'You do not have permission to access this resource.',
        messageAr: 'ليس لديك إذن للوصول إلى هذا المورد.',
        requiredRoles: normalizedRoles,
        userRoles,
      });
    }

    return next();
  };
};

// ─────────────────────────────────────────────
// optionalAuth middleware
// Populates req.user if a valid token is present but does NOT
// reject the request if no token is provided.
// Used for endpoints that serve both authenticated and
// unauthenticated passengers (e.g., PNR lookup — FR-005 AC-1).
// ─────────────────────────────────────────────

/**
 * Express middleware that optionally authenticates the request.
 * If a valid Bearer token is present, req.user is populated.
 * If no token is present or the token is invalid, req.user is null
 * and the request continues without error.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    req.user = null;
    return next();
  }

  const token = parts[1];

  try {
    const decoded = await verifyToken(token);
    req.user = {
      id: decoded.sub,
      userId: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      locale: decoded.locale || 'ar',
      jti: decoded.jti,
      exp: decoded.exp,
      iat: decoded.iat,
    };
  } catch (_err) {
    req.user = null;
  }

  return next();
};

// ─────────────────────────────────────────────
// requireOwnership helper
// Enforces that the authenticated user is accessing their own resource.
// Per HLD Section 7.1.5: resource-level ownership checks are enforced
// within each domain module handler.
// ─────────────────────────────────────────────

/**
 * Returns a middleware that checks whether req.user.id matches
 * a resource owner ID extracted from the request.
 *
 * @param {function(req: import('express').Request): string} getOwnerId
 *   Function that extracts the expected owner ID from the request
 *   (e.g., from req.params, req.body, or a DB lookup result).
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Ensure passenger can only access their own bookings
 * router.get(
 *   '/bookings/:userId',
 *   requireAuth,
 *   requireOwnership((req) => req.params.userId),
 *   handler
 * );
 */
const requireOwnership = (getOwnerId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        messageEn: 'Authentication required.',
        messageAr: 'المصادقة مطلوبة.',
      });
    }

    // ADMIN role bypasses ownership check
    const userRoles = (req.user.roles || []).map((r) => r.toUpperCase());
    if (userRoles.includes('ADMIN')) {
      return next();
    }

    const ownerId = getOwnerId(req);
    if (!ownerId || ownerId !== req.user.id) {
      return res.status(403).json({
        code: 'OWNERSHIP_REQUIRED',
        messageEn: 'You do not have permission to access this resource.',
        messageAr: 'ليس لديك إذن للوصول إلى هذا المورد.',
      });
    }

    return next();
  };
};

// ─────────────────────────────────────────────
// Session idle timeout enforcement
// Per FR-002 AC-7: 30-minute idle timeout triggers re-authentication.
// This middleware checks last_active_at on the session and rejects
// requests where the session has been idle for > 30 minutes.
// The session's last_active_at is updated on each valid request.
// ─────────────────────────────────────────────

const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 minutes

/**
 * Express middleware that enforces session idle timeout.
 * Must be used after requireAuth.
 *
 * Stores the last activity timestamp in Redis keyed by JTI.
 * If the session has been idle for more than 30 minutes, returns 401.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const enforceIdleTimeout = async (req, res, next) => {
  if (!req.user || !req.user.jti) {
    return next();
  }

  const idleKey = `session_idle:${req.user.jti}`;

  try {
    const redis = await getRedisClient();
    const lastActiveStr = await redis.get(idleKey);
    const now = Math.floor(Date.now() / 1000);

    if (lastActiveStr !== null) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (now - lastActive > IDLE_TIMEOUT_SECONDS) {
        // Revoke the token since the session has timed out
        await revokeToken(req.user.jti, req.user.exp);
        await redis.del(idleKey);
        return res.status(401).json({
          code: 'SESSION_IDLE_TIMEOUT',
          messageEn: 'Your session has timed out due to inactivity. Please log in again.',
          messageAr: 'انتهت مهلة جلستك بسبب عدم النشاط. يرجى تسجيل الدخول مرة أخرى.',
        });
      }
    }

    // Update last active timestamp; TTL set to access token remaining lifetime
    const remainingTtl = req.user.exp - now;
    if (remainingTtl > 0) {
      await redis.setEx(idleKey, remainingTtl, String(now));
    }
  } catch (err) {
    // Redis unavailable — skip idle check rather than block all requests
    console.error('[auth-middleware] Idle timeout check failed:', err.message);
  }

  return next();
};

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
module.exports = {
  // Core spec exports
  verifyToken,
  requireAuth,
  requireRole,
  generateToken,

  // Extended exports used by auth router and other modules
  generateAccessToken,
  generateRefreshToken,
  revokeToken,
  optionalAuth,
  requireOwnership,
  enforceIdleTimeout,

  // Constants exposed for use in auth router
  ACCESS_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  ISSUER,
  AUDIENCE,
};