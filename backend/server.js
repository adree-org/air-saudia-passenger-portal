```javascript
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');

// Route imports
const indexRouter = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-API-Key'],
}));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global rate limiter (public routes) ──────────────────────────────────────
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute.',
    messageAr: 'طلبات كثيرة جداً من هذا العنوان، يرجى المحاولة بعد دقيقة.',
  },
  skip: (req) => !!req.user, // authenticated users get separate limiter
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    messageAr: 'محاولات مصادقة كثيرة جداً، يرجى المحاولة لاحقاً.',
  },
});

app.use('/api/v1/auth', authLimiter);
app.use('/api', publicLimiter);

// ── Language middleware ───────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const lang = req.headers['accept-language'];
  if (lang && lang.startsWith('ar')) {
    req.locale = 'ar';
  } else {
    req.locale = 'en';
  }
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Air Saudia Passenger Portal API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Mount all routers ─────────────────────────────────────────────────────────
app.use('/api/v1', indexRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    messageAr: 'المسار المطلوب غير موجود.',
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this data already exists.',
      messageAr: 'سجل بهذه البيانات موجود بالفعل.',
      detail: process.env.NODE_ENV !== 'production' ? err.detail : undefined,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Related record not found.',
      messageAr: 'السجل المرتبط غير موجود.',
    });
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: `Required field missing: ${err.column}`,
      messageAr: `حقل مطلوب مفقود: ${err.column}`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      messageAr: 'رمز غير صالح.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired.',
      messageAr: 'انتهت صلاحية الرمز.',
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File size exceeds the 10 MB limit.',
      messageAr: 'حجم الملف يتجاوز الحد المسموح به (10 ميغابايت).',
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation.',
      messageAr: 'انتهاك سياسة CORS.',
    });
  }

  // Default 500
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
    messageAr: err.messageAr || 'خطأ داخلي في الخادم.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  testConnection().then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Air Saudia Passenger Portal API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
  }).catch((err) => {
    console.error('❌ Failed to connect to database. Exiting.', err.message);
    process.exit(1);
  });
}

module.exports = app;
``