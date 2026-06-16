```javascript
'use strict';

/**
 * Air Saudia Passenger Portal — Data Access Models
 *
 * All models use raw pg queries via the shared pool.
 * Each model exposes CRUD helpers that map to the LLD schema exactly.
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function buildUpdateClause(fields, startIndex = 1) {
  const keys = Object.keys(fields);
  const setClauses = keys.map((key, i) => `"${key}" = $${startIndex + i}`);
  const values = keys.map((key) => fields[key]);
  return { setClauses: setClauses.join(', '), values };
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const User = {
  /**
   * Create a new passenger user (status: 'pending').
   */
  async create({
    email,
    nationalId,
    passwordHash,
    firstNameAr,
    lastNameAr,
    firstNameEn,
    lastNameEn,
    phoneNumber,
    preferredLanguage = 'ar',
    nationality,
    dateOfBirth = null,
    passportNumber = null,
    passportExpiry = null,
    dietaryPreferences = null,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO identity.users (
         id, email, national_id, password_hash,
         first_name_ar, last_name_ar, first_name_en, last_name_en,
         phone_number, preferred_language, nationality,
         date_of_birth, passport_number, passport_expiry,
         dietary_preferences, account_status
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending'
       ) RETURNING *`,
      [
        id, email, nationalId || null, passwordHash,
        firstNameAr, lastNameAr, firstNameEn, lastNameEn,
        phoneNumber, preferredLanguage, nationality,
        dateOfBirth, passportNumber, passportExpiry,
        dietaryPreferences ? JSON.stringify(dietaryPreferences) : null,
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      'SELECT * FROM identity.users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM identity.users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return result.rows[0] || null;
  },

  async findByNationalId(nationalId) {
    const result = await db.query(
      'SELECT * FROM identity.users WHERE national_id = $1',
      [nationalId]
    );
    return result.rows[0] || null;
  },

  async findByLoyaltyMemberId(membershipNumber) {
    const result = await db.query(
      'SELECT * FROM identity.users WHERE loyalty_member_id = $1',
      [membershipNumber]
    );
    return result.rows[0] || null;
  },

  async activateAccount(id) {
    const result = await db.query(
      `UPDATE identity.users
       SET account_status = 'active', failed_login_count = 0, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async incrementFailedLogin(id) {
    const result = await db.query(
      `UPDATE identity.users
       SET failed_login_count = failed_login_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING failed_login_count`,
      [id]
    );
    return result.rows[0]?.failed_login_count || 0;
  },

  async lockAccount(id) {
    const result = await db.query(
      `UPDATE identity.users
       SET account_status = 'locked', locked_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async unlockAccount(id) {
    const result = await db.query(
      `UPDATE identity.users
       SET account_status = 'active', failed_login_count = 0, locked_at = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async resetFailedLogin(id) {
    await db.query(
      `UPDATE identity.users
       SET failed_login_count = 0, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async updateProfile(id, fields) {
    const { setClauses, values } = buildUpdateClause(fields);
    const result = await db.query(
      `UPDATE identity.users SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  },

  async updatePassword(id, passwordHash) {
    const result = await db.query(
      `UPDATE identity.users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [passwordHash, id]
    );
    return result.rows[0] || null;
  },

  async linkLoyaltyAccount(id, membershipNumber) {
    const result = await db.query(
      `UPDATE identity.users
       SET loyalty_member_id = $1, loyalty_linked_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [membershipNumber, id]
    );
    return result.rows[0] || null;
  },

  async updateMfaSettings(id, mfaEnabled, mfaMethod, totpSecret = null) {
    const result = await db.query(
      `UPDATE identity.users
       SET mfa_enabled = $1, mfa_method = $2, totp_secret = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [mfaEnabled, mfaMethod, totpSecret, id]
    );
    return result.rows[0] || null;
  },

  sanitize(user) {
    if (!user) return null;
    const { password_hash, totp_secret, ...safe } = user;
    return safe;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const Session = {
  async create({ userId, refreshTokenHash, ipAddress, userAgent }) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const result = await db.query(
      `INSERT INTO identity.sessions
         (id, user_id, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, userId, refreshTokenHash, ipAddress, userAgent || null, expiresAt]
    );
    return result.rows[0];
  },

  async findByRefreshTokenHash(hash) {
    const result = await db.query(
      `SELECT * FROM identity.sessions
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [hash]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await db.query(
      'SELECT * FROM identity.sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async revokeById(id) {
    const result = await db.query(
      `UPDATE identity.sessions SET revoked_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async revokeAllByUserId(userId) {
    await db.query(
      `UPDATE identity.sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  },

  async updateLastActive(id) {
    await db.query(
      'UPDATE identity.sessions SET last_active_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async findActiveByUserId(userId) {
    const result = await db.query(
      `SELECT * FROM identity.sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const OtpCode = {
  async create({ userId, purpose, codeHash, deliveryChannel, deliveredTo }) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const result = await db.query(
      `INSERT INTO identity.otp_codes
         (id, user_id, purpose, code_hash, delivery_channel, delivered_to, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [id, userId || null, purpose, codeHash, deliveryChannel, deliveredTo, expiresAt]
    );
    return result.rows[0];
  },

  async findValidByUserId(userId, purpose) {
    const result = await db.query(
      `SELECT * FROM identity.otp_codes
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, purpose]
    );
    return result.rows[0] || null;
  },

  async markUsed(id) {
    const result = await db.query(
      'UPDATE identity.otp_codes SET used_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  async invalidateAllByUserId(userId, purpose) {
    await db.query(
      `UPDATE identity.otp_codes
       SET used_at = NOW()
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [userId, purpose]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const PasswordResetToken = {
  async create({ userId, tokenHash }) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
    const result = await db.query(
      `INSERT INTO identity.password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, userId, tokenHash, expiresAt]
    );
    return result.rows[0];
  },

  async findValidByTokenHash(tokenHash) {
    const result = await db.query(
      `SELECT * FROM identity.password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  async markUsed(id) {
    await db.query(
      'UPDATE identity.password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async invalidateAllByUserId(userId) {
    await db.query(
      `UPDATE identity.password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const PdplConsent = {
  async create({ userId, consentVersion, ipAddress, consentType, notes = null }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO identity.pdpl_consent
         (id, user_id, consent_version, consented_at, ip_address, consent_type, notes)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6) RETURNING *`,
      [id, userId, consentVersion, ipAddress, consentType, notes]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM identity.pdpl_consent WHERE user_id = $1 ORDER BY consented_at DESC',
      [userId]
    );
    return result.rows;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const NotificationPreferences = {
  async upsert({ userId, emailBookingConfirmations, smsFlightAlerts, loyaltyNewsletters }) {
    const result = await db.query(
      `INSERT INTO identity.notification_preferences
         (user_id, email_booking_confirmations, sms_flight_alerts, loyalty_newsletters, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email_booking_confirmations = EXCLUDED.email_booking_confirmations,
         sms_flight_alerts           = EXCLUDED.sms_flight_alerts,
         loyalty_newsletters         = EXCLUDED.loyalty_newsletters,
         updated_at                  = NOW()
       RETURNING *`,
      [userId, emailBookingConfirmations, smsFlightAlerts, loyaltyNewsletters]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM identity.notification_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const Booking = {
  async upsertFromPss({
    pnr,
    userId,
    passengerLastName,
    status,
    originIata,
    destinationIata,
    departureAt,
    arrivalAt,
    flightNumber,
    cabinClass,
    fareBasis,
    isFlexible,
    rebookingEligible,
    pssRawResponse,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO booking.bookings (
         id, pnr, user_id, passenger_last_name, status,
         origin_iata, destination_iata, departure_at, arrival_at,
         flight_number, cabin_class, fare_basis, is_flexible,
         rebooking_eligible, pss_raw_response, last_synced_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       ON CONFLICT (pnr) DO UPDATE SET
         user_id             = COALESCE(EXCLUDED.user_id, booking.bookings.user_id),
         passenger_last_name = EXCLUDED.passenger_last_name,
         status              = EXCLUDED.status,
         origin_iata         = EXCLUDED.origin_iata,
         destination_iata    = EXCLUDED.destination_iata,
         departure_at        = EXCLUDED.departure_at,
         arrival_at          = EXCLUDED.arrival_at,
         flight_number       = EXCLUDED.flight_number,
         cabin_class         = EXCLUDED.cabin_class,
         fare_basis          = EXCLUDED.fare_basis,
         is_flexible         = EXCLUDED.is_flexible,
         rebooking_eligible  = EXCLUDED.rebooking_eligible,
         pss_raw_response    = EXCLUDED.pss_raw_response,
         last_synced_at      = NOW(),
         updated_at          = NOW()
       RETURNING *`,
      [
        id, pnr, userId || null, passengerLastName, status,
        originIata, destinationIata, departureAt, arrivalAt,
        flightNumber, cabinClass, fareBasis || null, isFlexible,
        rebookingEligible, pssRawResponse ? JSON.stringify(pssRawResponse) : null,
      ]
    );
    return result.rows[0];
  },

  async findByPnr(pnr) {
    const result = await db.query(
      'SELECT * FROM booking.bookings WHERE pnr = $1',
      [pnr.toUpperCase()]
    );
    return result.rows[0] || null;
  },

  async findByPnrAndLastName(pnr, lastName) {
    const result = await db.query(
      `SELECT * FROM booking.bookings
       WHERE pnr = $1 AND LOWER(passenger_last_name) = LOWER($2)`,
      [pnr.toUpperCase(), lastName]
    );
    return result.rows[0] || null;
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT * FROM booking.bookings
       WHERE user_id = $1
       ORDER BY departure_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const countResult = await db.query(
      'SELECT COUNT(*) FROM booking.bookings WHERE user_id = $1',
      [userId]
    );
    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async updateStatus(pnr, status) {
    const result = await db.query(
      `UPDATE booking.bookings SET status = $1, updated_at = NOW() WHERE pnr = $2 RETURNING *`,
      [status, pnr.toUpperCase()]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM booking.bookings WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const RebookRequest = {
  async create({
    bookingId,
    userId,
    newFlightNumber,
    newDepartureAt,
    newArrivalAt,
    newOriginIata,
    newDestinationIata,
    fareDifferenceSar = 0,
    changeFeeSar = 0,
    totalDueSar = 0,
    milesApplied = 0,
    cashChargedSar = 0,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO booking.rebook_requests (
         id, booking_id, user_id, new_flight_number, new_departure_at, new_arrival_at,
         new_origin_iata, new_destination_iata, fare_difference_sar, change_fee_sar,
         total_due_sar, miles_applied, cash_charged_sar
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        id, bookingId, userId, newFlightNumber, newDepartureAt, newArrivalAt,
        newOriginIata, newDestinationIata, fareDifferenceSar, changeFeeSar,
        totalDueSar, milesApplied, cashChargedSar,
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM booking.rebook_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByBookingId(bookingId) {
    const result = await db.query(
      'SELECT * FROM booking.rebook_requests WHERE booking_id = $1 ORDER BY created_at DESC',
      [bookingId]
    );
    return result.rows;
  },

  async updatePaymentStatus(id, paymentStatus, transactionId = null) {
    const result = await db.query(
      `UPDATE booking.rebook_requests
       SET payment_status = $1, payment_transaction_id = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [paymentStatus, transactionId, id]
    );
    return result.rows[0] || null;
  },

  async updateStatus(id, status, pssCommitStatus = null) {
    const fields = { status };
    if (pssCommitStatus) fields.pss_commit_status = pssCommitStatus;
    const { setClauses, values } = buildUpdateClause(fields);
    const result = await db.query(
      `UPDATE booking.rebook_requests SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  },

  async acknowledgeFareRules(id) {
    const result = await db.query(
      `UPDATE booking.rebook_requests
       SET fare_rules_acknowledged = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BAGGAGE MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const BaggageClaim = {
  _generateCrn() {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    return `CLM-${year}-${seq}`;
  },

  async create({
    userId,
    pnr,
    passengerLastName,
    flightDate,
    originIata,
    destinationIata,
    claimType,
    bagTagNumber,
    bagDescription,
    declaredValueSar,
    contactEmail,
    contactPhone,
    description,
  }) {
    const id = uuidv4();
    const crn = this._generateCrn();
    const result = await db.query(
      `INSERT INTO baggage.claims (
         id, crn, user_id, pnr, passenger_last_name, flight_date,
         origin_iata, destination_iata, claim_type, bag_tag_number,
         bag_description, declared_value_sar, contact_email, contact_phone,
         description, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'SUBMITTED')
       RETURNING *`,
      [
        id, crn, userId || null, pnr.toUpperCase(), passengerLastName, flightDate,
        originIata.toUpperCase(), destinationIata.toUpperCase(), claimType.toUpperCase(),
        bagTagNumber.toUpperCase(), bagDescription || null, declaredValueSar || null,
        contactEmail, contactPhone, description || null,
      ]
    );
    return result.rows[0];
  },

  async findByCrn(crn) {
    const result = await db.query(
      'SELECT * FROM baggage.claims WHERE crn = $1',
      [crn.toUpperCase()]
    );
    return result.rows[0] || null;
  },

  async findByCrnAndLastName(crn, lastName) {
    const result = await db.query(
      `SELECT * FROM baggage.claims
       WHERE crn = $1 AND LOWER(passenger_last_name) = LOWER($2)`,
      [crn.toUpperCase(), lastName]
    );
    return result.rows[0] || null;
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT * FROM baggage.claims
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const countResult = await db.query(
      'SELECT COUNT(*) FROM baggage.claims WHERE user_id = $1',
      [userId]
    );
    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async updateStatus(crn, newStatus, changedBy = 'SYSTEM', notes = null) {
    const existing = await this.findByCrn(crn);
    if (!existing) return null;

    const result = await db.query(
      `UPDATE baggage.claims SET status = $1, updated_at = NOW() WHERE crn = $2 RETURNING *`,
      [newStatus, crn.toUpperCase()]
    );

    // Insert status history
    await ClaimStatusHistory.create({
      claimId: existing.id,
      previousStatus: existing.status,
      newStatus,
      changedBy,
      notes,
    });

    return result.rows[0] || null;
  },

  async updateBmsSync(id, bmsClaimId) {
    await db.query(
      `UPDATE baggage.claims SET bms_claim_id = $1, bms_synced_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [bmsClaimId, id]
    );
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM baggage.claims WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const ClaimStatusHistory = {
  async create({ claimId, previousStatus, newStatus, changedBy, notes = null }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO baggage.claim_status_history
         (id, claim_id, previous_status, new_status, changed_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, claimId, previousStatus || null, newStatus, changedBy, notes]
    );
    return result.rows[0];
  },

  async findByClaimId(claimId) {
    const result = await db.query(
      `SELECT * FROM baggage.claim_status_history
       WHERE claim_id = $1 ORDER BY changed_at ASC`,
      [claimId]
    );
    return result.rows;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const ClaimDocument = {
  async create({ claimId, fileName, storageKey, mimeType, fileSizeBytes, uploadedBy }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO baggage.claim_documents
         (id, claim_id, file_name, storage_key, mime_type, file_size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, claimId, fileName, storageKey, mimeType, fileSizeBytes, uploadedBy || null]
    );
    return result.rows[0];
  },

  async findByClaimId(claimId) {
    const result = await db.query(
      'SELECT * FROM baggage.claim_documents WHERE claim_id = $1 ORDER BY uploaded_at DESC',
      [claimId]
    );
    return result.rows;
  },

  async markBmsSynced(id) {
    await db.query(
      'UPDATE baggage.claim_documents SET bms_synced = true WHERE id = $1',
      [id]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const LoyaltyAccount = {
  async upsert({
    userId,
    membershipNumber,
    tier,
    milesBalance,
    tierPoints,
    tierRenewalDate,
    milesExpiryDate,
    milesExpiringAmount,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO loyalty.accounts (
         id, user_id, membership_number, tier, miles_balance,
         tier_points, tier_renewal_date, miles_expiry_date,
         miles_expiring_amount, last_synced_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         membership_number    = EXCLUDED.membership_number,
         tier                 = EXCLUDED.tier,
         miles_balance        = EXCLUDED.miles_balance,
         tier_points          = EXCLUDED.tier_points,
         tier_renewal_date    = EXCLUDED.tier_renewal_date,
         miles_expiry_date    = EXCLUDED.miles_expiry_date,
         miles_expiring_amount = EXCLUDED.miles_expiring_amount,
         last_synced_at       = NOW()
       RETURNING *`,
      [
        id, userId, membershipNumber, tier, milesBalance,
        tierPoints, tierRenewalDate || null, milesExpiryDate || null,
        milesExpiringAmount || 0,
      ]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM loyalty.accounts WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async findByMembershipNumber(membershipNumber) {
    const result = await db.query(
      'SELECT * FROM loyalty.accounts WHERE membership_number = $1',
      [membershipNumber]
    );
    return result.rows[0] || null;
  },

  async updateBalance(id, newBalance) {
    const result = await db.query(
      `UPDATE loyalty.accounts SET miles_balance = $1, last_synced_at = NOW() WHERE id = $2 RETURNING *`,
      [newBalance, id]
    );
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const LoyaltyTransaction = {
  async create({
    loyaltyAccountId,
    transactionDate,
    descriptionAr,
    descriptionEn,
    milesDelta,
    runningBalance,
    transactionType,
    referenceId,
    loyaltySystemId,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO loyalty.transactions (
         id, loyalty_account_id, transaction_date, description_ar, description_en,
         miles_delta, running_balance, transaction_type, reference_id, loyalty_system_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id, loyaltyAccountId, transactionDate, descriptionAr, descriptionEn,
        milesDelta, runningBalance, transactionType,
        referenceId || null, loyaltySystemId || null,
      ]
    );
    return result.rows[0];
  },

  async findByAccountId(accountId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await db.query(
      `SELECT * FROM loyalty.transactions
       WHERE loyalty_account_id = $1
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );
    const countResult = await db.query(
      'SELECT COUNT(*) FROM loyalty.transactions WHERE loyalty_account_id = $1',
      [accountId]
    );
    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const LoyaltyRedemption = {
  async create({
    loyaltyAccountId,
    redemptionType,
    milesDeducted,
    cashAmountSar = 0,
    bookingPnr,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO loyalty.redemptions
         (id, loyalty_account_id, redemption_type, miles_deducted, cash_amount_sar, booking_pnr, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING *`,
      [id, loyaltyAccountId, redemptionType, milesDeducted, cashAmountSar, bookingPnr.toUpperCase()]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM loyalty.redemptions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async confirm(id) {
    const result = await db.query(
      `UPDATE loyalty.redemptions SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  async rollback(id) {
    const result = await db.query(
      `UPDATE loyalty.redemptions SET status = 'rolled_back' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEAT MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const SeatSelection = {
  async create({
    userId,
    pnr,
    flightNumber,
    seatNumber,
    seatType,
    isPaid = false,
    pricePaidSar = 0,
    paymentTransactionId = null,
  }) {
    // Supersede any existing active selection for the same PNR
    await db.query(
      `UPDATE seat.seat_selections
       SET status = 'superseded'
       WHERE user_id = $1 AND pnr = $2 AND status = 'active'`,
      [userId, pnr.toUpperCase()]
    );

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO seat.seat_selections
         (id, user_id, pnr, flight_number, seat_number, seat_type,
          is_paid, price_paid_sar, payment_transaction_id, pss_confirmed, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,'active')
       RETURNING *`,
      [
        id, userId, pnr.toUpperCase(), flightNumber, seatNumber.toUpperCase(),
        seatType.toUpperCase(), isPaid, pricePaidSar, paymentTransactionId,
      ]
    );
    return result.rows[0];
  },

  async findActiveByPnrAndUserId(pnr, userId) {
    const result = await db.query(
      `SELECT * FROM seat.seat_selections
       WHERE pnr = $1 AND user_id = $2 AND status = 'active'
       ORDER BY selected_at DESC LIMIT 1`,
      [pnr.toUpperCase(), userId]
    );
    return result.rows[0] || null;
  },

  async findByPnr(pnr) {
    const result = await db.query(
      `SELECT * FROM seat.seat_selections WHERE pnr = $1 AND status = 'active'`,
      [pnr.toUpperCase()]
    );
    return result.rows;
  },

  async confirmPss(id) {
    await db.query(
      'UPDATE seat.seat_selections SET pss_confirmed = true WHERE id = $1',
      [id]
    );
  },

  async cancel(id) {
    await db.query(
      `UPDATE seat.seat_selections SET status = 'cancelled' WHERE id = $1`,
      [id]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const UpgradeRequest = {
  async create({
    userId,
    pnr,
    flightNumber,
    currentCabin,
    targetCabin,
    upgradeMethod,
    cashAmountSar = 0,
    milesAmount = 0,
    paymentTransactionId = null,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO seat.upgrade_requests
         (id, user_id, pnr, flight_number, current_cabin, target_cabin,
          upgrade_method, cash_amount_sar, miles_amount, payment_transaction_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING')
       RETURNING *`,
      [
        id, userId, pnr.toUpperCase(), flightNumber, currentCabin.toUpperCase(),
        targetCabin.toUpperCase(), upgradeMethod.toUpperCase(),
        cashAmountSar, milesAmount, paymentTransactionId,
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM seat.upgrade_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByPnrAndUserId(pnr, userId) {
    const result = await db.query(
      `SELECT * FROM seat.upgrade_requests
       WHERE pnr = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [pnr.toUpperCase(), userId]
    );
    return result.rows;
  },

  async updateStatus(id, status, pssConfirmed = false) {
    const result = await db.query(
      `UPDATE seat.upgrade_requests
       SET status = $1, pss_confirmed = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, pssConfirmed, id]
    );
    return result.rows[0] || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const AuditLog = {
  async create({
    userId = null,
    sessionId = null,
    eventType,
    entityType = null,
    entityId = null,
    fieldChanged = null,
    oldValueHash = null,
    newValueHash = null,
    ipAddress = null,
    userAgent = null,
    outcome,
    metadata = null,
  }) {
    const id = uuidv4();
    try {
      const result = await db.query(
        `INSERT INTO audit.audit_log (
           id, user_id, session_id, event_type, entity_type, entity_id,
           field_changed, old_value_hash, new_value_hash,
           ip_address, user_agent, outcome, metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          id, userId, sessionId, eventType, entityType, entityId,
          fieldChanged, oldValueHash, newValueHash,
          ipAddress, userAgent, outcome,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
      return result.rows[0];
    } catch (err) {
      // Audit logging must not disrupt main flow
      console.error('[AUDIT_LOG_ERROR]', err.message);
      return null;
    }
  },

  async findByUserId(userId, limit = 50) {
    const result = await db.query(
      `SELECT * FROM audit.audit_log WHERE user_id = $1 ORDER BY event_time DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  async findByEntityId(entityId, entityType) {
    const result = await db.query(
      `SELECT * FROM audit.audit_log
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY event_time DESC`,
      [entityId, entityType]
    );
    return result.rows;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION MODULE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const NotificationLog = {
  async create({
    userId = null,
    channel,
    recipient,
    templateId,
    language,
    subject = null,
    status = 'queued',
    referenceType = null,
    referenceId = null,
  }) {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO notification.notification_log (
         id, user_id, channel, recipient, template_id, language,
         subject, status, reference_type, reference_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id, userId, channel, recipient, templateId, language,
        subject, status, referenceType, referenceId,
      ]
    );
    return result.rows[0];
  },

  async updateStatus(id, status, externalMessageId = null, sentAt = null) {
    const result = await db.query(
      `UPDATE notification.notification_log
       SET status = $1, external_message_id = $2, sent_at = $3
       WHERE id = $4 RETURNING *`,
      [status, externalMessageId, sentAt || (status === 'sent' ? new Date() : null), id]
    );
    return result.rows[0] || null;
  },

  async incrementRetry(id) {
    await db.query(
      'UPDATE notification.notification_log SET retry_count = retry_count + 1 WHERE id = $1',
      [id]
    );
  },

  async findByUserId(userId, limit = 20) {
    const result = await db.query(
      `SELECT * FROM notification.notification_log
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  User,
  Session,
  OtpCode,
  PasswordResetToken,
  PdplConsent,
  NotificationPreferences,
  Booking,
  RebookRequest,
  BaggageClaim,
  ClaimStatusHistory,
  ClaimDocument,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyRedemption,
  SeatSelection,
  UpgradeRequest,
  AuditLog,
  NotificationLog,
  // Utility exports
  sha256,
};
``