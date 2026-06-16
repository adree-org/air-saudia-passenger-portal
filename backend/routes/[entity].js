backend/routes/users.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const Joi = require('joi');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

const userCreateSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password_hash: Joi.string().max(255).required(),
  first_name_ar: Joi.string().max(100).required(),
  last_name_ar: Joi.string().max(100).required(),
  first_name_en: Joi.string().max(100).required(),
  last_name_en: Joi.string().max(100).required(),
  phone_number: Joi.string().max(20).required(),
  preferred_language: Joi.string().valid('ar', 'en').default('ar'),
  nationality: Joi.string().length(3).required(),
  date_of_birth: Joi.string().isoDate().optional().allow(null),
  passport_number: Joi.string().max(30).optional().allow(null),
  passport_expiry: Joi.string().isoDate().optional().allow(null),
  national_id: Joi.string().max(20).optional().allow(null),
  dietary_preferences: Joi.array().items(Joi.string()).optional().allow(null),
  account_status: Joi.string().valid('pending', 'active', 'locked', 'suspended').default('pending'),
  mfa_enabled: Joi.boolean().default(false),
  mfa_method: Joi.string().valid('sms', 'totp').optional().allow(null),
  loyalty_member_id: Joi.string().max(30).optional().allow(null),
});

const userUpdateSchema = Joi.object({
  first_name_ar: Joi.string().max(100).optional(),
  last_name_ar: Joi.string().max(100).optional(),
  first_name_en: Joi.string().max(100).optional(),
  last_name_en: Joi.string().max(100).optional(),
  phone_number: Joi.string().max(20).optional(),
  preferred_language: Joi.string().valid('ar', 'en').optional(),
  nationality: Joi.string().length(3).optional(),
  date_of_birth: Joi.string().isoDate().optional().allow(null),
  passport_number: Joi.string().max(30).optional().allow(null),
  passport_expiry: Joi.string().isoDate().optional().allow(null),
  national_id: Joi.string().max(20).optional().allow(null),
  dietary_preferences: Joi.array().items(Joi.string()).optional().allow(null),
  account_status: Joi.string().valid('pending', 'active', 'locked', 'suspended').optional(),
  mfa_enabled: Joi.boolean().optional(),
  mfa_method: Joi.string().valid('sms', 'totp').optional().allow(null),
  loyalty_member_id: Joi.string().max(30).optional().allow(null),
  failed_login_count: Joi.number().integer().min(0).optional(),
  locked_at: Joi.string().isoDate().optional().allow(null),
}).min(1);

// GET /api/v1/users — paginated list with filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters = [];
    const values = [];
    let paramIdx = 1;

    if (req.query.email) {
      filters.push(`email ILIKE $${paramIdx++}`);
      values.push(`%${req.query.email}%`);
    }
    if (req.query.account_status) {
      filters.push(`account_status = $${paramIdx++}`);
      values.push(req.query.account_status);
    }
    if (req.query.preferred_language) {
      filters.push(`preferred_language = $${paramIdx++}`);
      values.push(req.query.preferred_language);
    }
    if (req.query.nationality) {
      filters.push(`nationality = $${paramIdx++}`);
      values.push(req.query.nationality);
    }
    if (req.query.mfa_enabled !== undefined) {
      filters.push(`mfa_enabled = $${paramIdx++}`);
      values.push(req.query.mfa_enabled === 'true');
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM identity.users ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(
      `SELECT
        id, email, first_name_ar, last_name_ar, first_name_en, last_name_en,
        preferred_language, nationality, passport_expiry, dietary_preferences,
        account_status, failed_login_count, locked_at, mfa_enabled, mfa_method,
        loyalty_member_id, loyalty_linked_at, created_at, updated_at
       FROM identity.users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataValues
    );

    return res.status(200).json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /users]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// GET /api/v1/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid user ID format.', messageAr: 'تنسيق معرف المستخدم غير صالح.' });
    }

    const result = await pool.query(
      `SELECT
        id, email, first_name_ar, last_name_ar, first_name_en, last_name_en,
        preferred_language, nationality, passport_expiry, dietary_preferences,
        account_status, failed_login_count, locked_at, mfa_enabled, mfa_method,
        loyalty_member_id, loyalty_linked_at, created_at, updated_at
       FROM identity.users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', messageEn: 'User not found.', messageAr: 'المستخدم غير موجود.' });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[GET /users/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// POST /api/v1/users
router.post('/', requireAuth, validateBody(userCreateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email, password_hash, first_name_ar, last_name_ar, first_name_en, last_name_en,
      phone_number, preferred_language, nationality, date_of_birth, passport_number,
      passport_expiry, national_id, dietary_preferences, account_status,
      mfa_enabled, mfa_method, loyalty_member_id,
    } = req.body;

    await client.query('BEGIN');

    const existingEmail = await client.query(
      'SELECT id FROM identity.users WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        code: 'DUPLICATE_EMAIL',
        messageEn: 'An account with this email already exists.',
        messageAr: 'يوجد حساب مرتبط بهذا البريد الإلكتروني بالفعل.',
      });
    }

    if (national_id) {
      const existingNationalId = await client.query(
        'SELECT id FROM identity.users WHERE national_id = $1',
        [national_id]
      );
      if (existingNationalId.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          code: 'DUPLICATE_NATIONAL_ID',
          messageEn: 'An account with this National ID already exists.',
          messageAr: 'يوجد حساب مرتبط بهذا الرقم الوطني بالفعل.',
        });
      }
    }

    const insertResult = await client.query(
      `INSERT INTO identity.users (
        email, password_hash, first_name_ar, last_name_ar, first_name_en, last_name_en,
        phone_number, preferred_language, nationality, date_of_birth, passport_number,
        passport_expiry, national_id, dietary_preferences, account_status,
        mfa_enabled, mfa_method, loyalty_member_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, email, first_name_ar, last_name_ar, first_name_en, last_name_en,
         preferred_language, nationality, passport_expiry, dietary_preferences,
         account_status, mfa_enabled, mfa_method, loyalty_member_id, created_at, updated_at`,
      [
        email, password_hash, first_name_ar, last_name_ar, first_name_en, last_name_en,
        phone_number, preferred_language || 'ar', nationality,
        date_of_birth || null, passport_number || null, passport_expiry || null,
        national_id || null, dietary_preferences ? JSON.stringify(dietary_preferences) : null,
        account_status || 'pending', mfa_enabled || false, mfa_method || null,
        loyalty_member_id || null,
      ]
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || null,
        'USER_CREATED',
        'users',
        insertResult.rows[0].id,
        req.ip || '0.0.0.0',
        JSON.stringify({ created_by: req.user?.id || 'system' }),
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({ data: insertResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /users]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

// PUT /api/v1/users/:id
router.put('/:id', requireAuth, validateBody(userUpdateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid user ID format.', messageAr: 'تنسيق معرف المستخدم غير صالح.' });
    }

    const existing = await client.query(
      `SELECT id, email, first_name_ar, last_name_ar, first_name_en, last_name_en,
              preferred_language, nationality, account_status, mfa_enabled
       FROM identity.users WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', messageEn: 'User not found.', messageAr: 'المستخدم غير موجود.' });
    }

    const allowedFields = [
      'first_name_ar', 'last_name_ar', 'first_name_en', 'last_name_en',
      'phone_number', 'preferred_language', 'nationality', 'date_of_birth',
      'passport_number', 'passport_expiry', 'national_id', 'dietary_preferences',
      'account_status', 'mfa_enabled', 'mfa_method', 'loyalty_member_id',
      'failed_login_count', 'locked_at',
    ];

    const setClauses = [];
    const values = [];
    let paramIdx = 1;
    const changedFields = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        if (field === 'dietary_preferences' && Array.isArray(req.body[field])) {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
        changedFields.push(field);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ code: 'NO_FIELDS', messageEn: 'No valid fields provided for update.', messageAr: 'لم يتم تقديم حقول صالحة للتحديث.' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE identity.users
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, email, first_name_ar, last_name_ar, first_name_en, last_name_en,
         preferred_language, nationality, passport_expiry, dietary_preferences,
         account_status, failed_login_count, locked_at, mfa_enabled, mfa_method,
         loyalty_member_id, loyalty_linked_at, created_at, updated_at`,
      values
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || null,
        'USER_UPDATED',
        'users',
        id,
        req.ip || '0.0.0.0',
        JSON.stringify({ changed_fields: changedFields, updated_by: req.user?.id || 'system' }),
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({ data: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /users/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid user ID format.', messageAr: 'تنسيق معرف المستخدم غير صالح.' });
    }

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, email FROM identity.users WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'USER_NOT_FOUND', messageEn: 'User not found.', messageAr: 'المستخدم غير موجود.' });
    }

    await client.query(
      'UPDATE identity.users SET account_status = $1, updated_at = NOW() WHERE id = $2',
      ['suspended', id]
    );

    await client.query(
      'UPDATE identity.sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [id]
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || null,
        'USER_DELETED',
        'users',
        id,
        req.ip || '0.0.0.0',
        JSON.stringify({ deleted_by: req.user?.id || 'system', email_hash: crypto.createHash('sha256').update(existing.rows[0].email).digest('hex') }),
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({ message: 'User account suspended successfully.', messageAr: 'تم تعليق حساب المستخدم بنجاح.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /users/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

module.exports = router;


backend/routes/sessions.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const Joi = require('joi');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

const sessionCreateSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  refresh_token_hash: Joi.string().max(255).required(),
  ip_address: Joi.string().max(45).required(),
  user_agent: Joi.string().max(512).optional().allow(null),
  expires_at: Joi.string().isoDate().required(),
});

const sessionUpdateSchema = Joi.object({
  refresh_token_hash: Joi.string().max(255).optional(),
  last_active_at: Joi.string().isoDate().optional(),
  revoked_at: Joi.string().isoDate().optional().allow(null),
}).min(1);

// GET /api/v1/sessions — paginated list
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters = [];
    const values = [];
    let paramIdx = 1;

    if (req.query.user_id) {
      if (!isValidUUID(req.query.user_id)) {
        return res.status(400).json({ code: 'INVALID_USER_ID', messageEn: 'Invalid user ID format.', messageAr: 'تنسيق معرف المستخدم غير صالح.' });
      }
      filters.push(`user_id = $${paramIdx++}`);
      values.push(req.query.user_id);
    }
    if (req.query.active === 'true') {
      filters.push(`revoked_at IS NULL AND expires_at > NOW()`);
    }
    if (req.query.active === 'false') {
      filters.push(`(revoked_at IS NOT NULL OR expires_at <= NOW())`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM identity.sessions ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(
      `SELECT id, user_id, user_agent, created_at, expires_at, revoked_at, last_active_at
       FROM identity.sessions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataValues
    );

    return res.status(200).json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /sessions]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// GET /api/v1/sessions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid session ID format.', messageAr: 'تنسيق معرف الجلسة غير صالح.' });
    }

    const result = await pool.query(
      `SELECT id, user_id, user_agent, created_at, expires_at, revoked_at, last_active_at
       FROM identity.sessions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', messageEn: 'Session not found.', messageAr: 'الجلسة غير موجودة.' });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[GET /sessions/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// POST /api/v1/sessions
router.post('/', requireAuth, validateBody(sessionCreateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, refresh_token_hash, ip_address, user_agent, expires_at } = req.body;

    await client.query('BEGIN');

    const userCheck = await client.query('SELECT id FROM identity.users WHERE id = $1 AND account_status = $2', [user_id, 'active']);
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ code: 'USER_NOT_ACTIVE', messageEn: 'User not found or not active.', messageAr: 'المستخدم غير موجود أو غير نشط.' });
    }

    const insertResult = await client.query(
      `INSERT INTO identity.sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, user_agent, created_at, expires_at, revoked_at, last_active_at`,
      [user_id, refresh_token_hash, ip_address, user_agent || null, expires_at]
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user_id, 'SESSION_CREATED', 'sessions', insertResult.rows[0].id, ip_address, JSON.stringify({ user_agent })]
    );

    await client.query('COMMIT');

    return res.status(201).json({ data: insertResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /sessions]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

// PUT /api/v1/sessions/:id
router.put('/:id', requireAuth, validateBody(sessionUpdateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid session ID format.', messageAr: 'تنسيق معرف الجلسة غير صالح.' });
    }

    const existing = await client.query('SELECT id, user_id FROM identity.sessions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', messageEn: 'Session not found.', messageAr: 'الجلسة غير موجودة.' });
    }

    const allowedFields = ['refresh_token_hash', 'last_active_at', 'revoked_at'];
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        values.push(req.body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ code: 'NO_FIELDS', messageEn: 'No valid fields provided for update.', messageAr: 'لم يتم تقديم حقول صالحة للتحديث.' });
    }

    values.push(id);

    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE identity.sessions SET ${setClauses.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, user_id, user_agent, created_at, expires_at, revoked_at, last_active_at`,
      values
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || existing.rows[0].user_id,
        'SESSION_UPDATED',
        'sessions',
        id,
        req.ip || '0.0.0.0',
        JSON.stringify({ updated_fields: Object.keys(req.body) }),
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({ data: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /sessions/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

// DELETE /api/v1/sessions/:id — revoke session
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid session ID format.', messageAr: 'تنسيق معرف الجلسة غير صالح.' });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT id, user_id, revoked_at FROM identity.sessions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', messageEn: 'Session not found.', messageAr: 'الجلسة غير موجودة.' });
    }

    if (existing.rows[0].revoked_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'SESSION_ALREADY_REVOKED', messageEn: 'Session is already revoked.', messageAr: 'الجلسة ملغاة بالفعل.' });
    }

    await client.query(
      'UPDATE identity.sessions SET revoked_at = NOW() WHERE id = $1',
      [id]
    );

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || existing.rows[0].user_id,
        'SESSION_REVOKED',
        'sessions',
        id,
        req.ip || '0.0.0.0',
        JSON.stringify({ revoked_by: req.user?.id || 'system' }),
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Session revoked successfully.', messageAr: 'تم إلغاء الجلسة بنجاح.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /sessions/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

module.exports = router;


backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const Joi = require('joi');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

const bookingCreateSchema = Joi.object({
  pnr: Joi.string().alphanum().min(5).max(10).uppercase().required(),
  user_id: Joi.string().uuid().optional().allow(null),
  passenger_last_name: Joi.string().max(100).required(),
  origin_iata: Joi.string().length(3).uppercase().required(),
  destination_iata: Joi.string().length(3).uppercase().required(),
  departure_datetime: Joi.string().isoDate().required(),
  arrival_datetime: Joi.string().isoDate().required(),
  flight_number: Joi.string().max(10).required(),
  cabin_class: Joi.string().valid('ECONOMY', 'BUSINESS', 'FIRST').required(),
  fare_class: Joi.string().max(5).required(),
  booking_status: Joi.string().valid('CONFIRMED', 'CANCELLED', 'REBOOKED', 'CHECKED_IN', 'COMPLETED').default('CONFIRMED'),
  fare_rules: Joi.object().optional().allow(null),
  is_flexible: Joi.boolean().default(false),
  is_group_booking: Joi.boolean().default(false),
  total_amount_sar: Joi.number().precision(2).min(0).required(),
  currency: Joi.string().length(3).default('SAR'),
  passengers: Joi.array().items(Joi.object({
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    passenger_type: Joi.string().valid('ADULT', 'CHILD', 'INFANT').required(),
    seat_number: Joi.string().max(5).optional().allow(null),
  })).min(1).required(),
});

const bookingUpdateSchema = Joi.object({
  booking_status: Joi.string().valid('CONFIRMED', 'CANCELLED', 'REBOOKED', 'CHECKED_IN', 'COMPLETED').optional(),
  cabin_class: Joi.string().valid('ECONOMY', 'BUSINESS', 'FIRST').optional(),
  departure_datetime: Joi.string().isoDate().optional(),
  arrival_datetime: Joi.string().isoDate().optional(),
  flight_number: Joi.string().max(10).optional(),
  fare_rules: Joi.object().optional().allow(null),
  is_flexible: Joi.boolean().optional(),
  total_amount_sar: Joi.number().precision(2).min(0).optional(),
  passengers: Joi.array().items(Joi.object({
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    passenger_type: Joi.string().valid('ADULT', 'CHILD', 'INFANT').required(),
    seat_number: Joi.string().max(5).optional().allow(null),
  })).min(1).optional(),
}).min(1);

// GET /api/v1/bookings
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters = [];
    const values = [];
    let paramIdx = 1;

    if (req.query.user_id) {
      if (!isValidUUID(req.query.user_id)) {
        return res.status(400).json({ code: 'INVALID_USER_ID', messageEn: 'Invalid user ID.', messageAr: 'معرف المستخدم غير صالح.' });
      }
      filters.push(`b.user_id = $${paramIdx++}`);
      values.push(req.query.user_id);
    }
    if (req.query.pnr) {
      filters.push(`b.pnr = $${paramIdx++}`);
      values.push(req.query.pnr.toUpperCase());
    }
    if (req.query.booking_status) {
      filters.push(`b.booking_status = $${paramIdx++}`);
      values.push(req.query.booking_status);
    }
    if (req.query.origin_iata) {
      filters.push(`b.origin_iata = $${paramIdx++}`);
      values.push(req.query.origin_iata.toUpperCase());
    }
    if (req.query.destination_iata) {
      filters.push(`b.destination_iata = $${paramIdx++}`);
      values.push(req.query.destination_iata.toUpperCase());
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM booking.bookings b ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(
      `SELECT b.id, b.pnr, b.user_id, b.passenger_last_name, b.origin_iata, b.destination_iata,
              b.departure_datetime, b.arrival_datetime, b.flight_number, b.cabin_class,
              b.fare_class, b.booking_status, b.is_flexible, b.is_group_booking,
              b.total_amount_sar, b.currency, b.created_at, b.updated_at
       FROM booking.bookings b
       ${whereClause}
       ORDER BY b.departure_datetime DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataValues
    );

    return res.status(200).json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /bookings]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// GET /api/v1/bookings/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid booking ID format.', messageAr: 'تنسيق معرف الحجز غير صالح.' });
    }

    const bookingResult = await pool.query(
      `SELECT b.id, b.pnr, b.user_id, b.passenger_last_name, b.origin_iata, b.destination_iata,
              b.departure_datetime, b.arrival_datetime, b.flight_number, b.cabin_class,
              b.fare_class, b.booking_status, b.fare_rules, b.is_flexible, b.is_group_booking,
              b.total_amount_sar, b.currency, b.created_at, b.updated_at
       FROM booking.bookings b WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ code: 'BOOKING_NOT_FOUND', messageEn: 'Booking not found.', messageAr: 'الحجز غير موجود.' });
    }

    const passengersResult = await pool.query(
      `SELECT id, first_name, last_name, passenger_type, seat_number
       FROM booking.booking_passengers WHERE booking_id = $1 ORDER BY id`,
      [id]
    );

    const booking = bookingResult.rows[0];
    booking.passengers = passengersResult.rows;

    const now = new Date();
    const departure = new Date(booking.departure_datetime);
    const diffMs = departure - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    booking.rebooking_eligible = diffHours > 2 && booking.is_flexible && !booking.is_group_booking && booking.booking_status === 'CONFIRMED';
    booking.rebooking_cutoff_passed = diffHours <= 2;

    return res.status(200).json({ data: booking });
  } catch (err) {
    console.error('[GET /bookings/:id]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  }
});

// POST /api/v1/bookings
router.post('/', requireAuth, validateBody(bookingCreateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      pnr, user_id, passenger_last_name, origin_iata, destination_iata,
      departure_datetime, arrival_datetime, flight_number, cabin_class,
      fare_class, booking_status, fare_rules, is_flexible, is_group_booking,
      total_amount_sar, currency, passengers,
    } = req.body;

    await client.query('BEGIN');

    const existingPnr = await client.query('SELECT id FROM booking.bookings WHERE pnr = $1', [pnr]);
    if (existingPnr.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'DUPLICATE_PNR', messageEn: 'A booking with this PNR already exists.', messageAr: 'يوجد حجز بهذا الرقم المرجعي بالفعل.' });
    }

    const insertResult = await client.query(
      `INSERT INTO booking.bookings (
        pnr, user_id, passenger_last_name, origin_iata, destination_iata,
        departure_datetime, arrival_datetime, flight_number, cabin_class,
        fare_class, booking_status, fare_rules, is_flexible, is_group_booking,
        total_amount_sar, currency
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, pnr, user_id, booking_status, departure_datetime, created_at`,
      [
        pnr, user_id || null, passenger_last_name, origin_iata, destination_iata,
        departure_datetime, arrival_datetime, flight_number, cabin_class,
        fare_class, booking_status || 'CONFIRMED',
        fare_rules ? JSON.stringify(fare_rules) : null,
        is_flexible || false, is_group_booking || false,
        total_amount_sar, currency || 'SAR',
      ]
    );

    const bookingId = insertResult.rows[0].id;

    for (const passenger of passengers) {
      await client.query(
        `INSERT INTO booking.booking_passengers (booking_id, first_name, last_name, passenger_type, seat_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, passenger.first_name, passenger.last_name, passenger.passenger_type, passenger.seat_number || null]
      );
    }

    await client.query(
      `INSERT INTO audit.audit_log (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.id || null, 'BOOKING_CREATED', 'bookings', bookingId,
        req.ip || '0.0.0.0', JSON.stringify({ pnr, flight_number }),
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({ data: { ...insertResult.rows[0], passengers } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /bookings]', err);
    return res.status(500).json({ code: 'INTERNAL_ERROR', messageEn: 'Internal server error.', messageAr: 'خطأ داخلي في الخادم.' });
  } finally {
    client.release();
  }
});

// PUT /api/v1/bookings/:id
router.put('/:id', requireAuth, validateBody(bookingUpdateSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ code: 'INVALID_ID', messageEn: 'Invalid booking ID format.', messageAr: 'تنسيق معرف الحجز غير صالح.' });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT id, pnr, booking_status FROM booking.bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'BOOKING_NOT_FOUND', messageEn: 'Booking not found.', messageAr: 'الحجز غير موجود.' });
    }

    const scalarFields = ['booking_status',