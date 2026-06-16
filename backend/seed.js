```javascript
'use strict';

require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./config/database');

const BCRYPT_ROUNDS = 12;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const usersData = [
  {
    email: 'ahmed.al-rashidi@example.sa',
    nationalId: '1012345678',
    password: 'SecurePass@123',
    firstNameAr: 'أحمد',
    lastNameAr: 'الراشدي',
    firstNameEn: 'Ahmed',
    lastNameEn: 'Al-Rashidi',
    phoneNumber: '+966501234567',
    preferredLanguage: 'ar',
    nationality: 'SAU',
    dateOfBirth: '1990-03-15',
    passportNumber: 'A12345678',
    passportExpiry: '2030-03-14',
    dietaryPreferences: ['HALAL'],
    accountStatus: 'active',
    loyaltyMemberId: 'SM1001234',
  },
  {
    email: 'fatima.al-zahrani@example.sa',
    nationalId: '1023456789',
    password: 'Travel@Secure1',
    firstNameAr: 'فاطمة',
    lastNameAr: 'الزهراني',
    firstNameEn: 'Fatima',
    lastNameEn: 'Al-Zahrani',
    phoneNumber: '+966512345678',
    preferredLanguage: 'ar',
    nationality: 'SAU',
    dateOfBirth: '1988-07-22',
    passportNumber: 'B23456789',
    passportExpiry: '2028-07-21',
    dietaryPreferences: ['HALAL', 'VEGETARIAN'],
    accountStatus: 'active',
    loyaltyMemberId: 'SM1002345',
  },
  {
    email: 'khalid.mansouri@example.sa',
    nationalId: '1034567890',
    password: 'Khalid@Pass99',
    firstNameAr: 'خالد',
    lastNameAr: 'المنصوري',
    firstNameEn: 'Khalid',
    lastNameEn: 'Mansouri',
    phoneNumber: '+966523456789',
    preferredLanguage: 'en',
    nationality: 'SAU',
    dateOfBirth: '1985-11-10',
    passportNumber: 'C34567890',
    passportExpiry: '2029-11-09',
    dietaryPreferences: ['HALAL'],
    accountStatus: 'active',
    loyaltyMemberId: 'SM1003456',
  },
  {
    email: 'sara.al-otaibi@example.sa',
    nationalId: '1045678901',
    password: 'Sara#Flight2026',
    firstNameAr: 'سارة',
    lastNameAr: 'العتيبي',
    firstNameEn: 'Sara',
    lastNameEn: 'Al-Otaibi',
    phoneNumber: '+966534567890',
    preferredLanguage: 'ar',
    nationality: 'SAU',
    dateOfBirth: '1995-05-18',
    passportNumber: 'D45678901',
    passportExpiry: '2031-05-17',
    dietaryPreferences: null,
    accountStatus: 'active',
    loyaltyMemberId: null,
  },
  {
    email: 'mohammed.bin-saleh@example.sa',
    nationalId: '1056789012',
    password: 'MBS@Saudia1',
    firstNameAr: 'محمد',
    lastNameAr: 'بن صالح',
    firstNameEn: 'Mohammed',
    lastNameEn: 'Bin-Saleh',
    phoneNumber: '+966545678901',
    preferredLanguage: 'ar',
    nationality: 'SAU',
    dateOfBirth: '1978-09-03',
    passportNumber: 'E56789012',
    passportExpiry: '2027-09-02',
    dietaryPreferences: ['HALAL', 'LOW_SODIUM'],
    accountStatus: 'active',
    loyaltyMemberId: 'SM1004567',
  },
  {
    email: 'david.chen@example.com',
    nationalId: null,
    password: 'David@Travel99',
    firstNameAr: 'ديفيد',
    lastNameAr: 'تشن',
    firstNameEn: 'David',
    lastNameEn: 'Chen',
    phoneNumber: '+966556789012',
    preferredLanguage: 'en',
    nationality: 'CHN',
    dateOfBirth: '1992-02-28',
    passportNumber: 'G67890123',
    passportExpiry: '2032-02-27',
    dietaryPreferences: null,
    accountStatus: 'active',
    loyaltyMemberId: null,
  },
  {
    email: 'layla.al-ghamdi@example.sa',
    nationalId: '1067890123',
    password: 'Layla$Fly2026',
    firstNameAr: 'ليلى',
    lastNameAr: 'الغامدي',
    firstNameEn: 'Layla',
    lastNameEn: 'Al-Ghamdi',
    phoneNumber: '+966567890123',
    preferredLanguage: 'ar',
    nationality: 'SAU',
    dateOfBirth: '1993-12-05',
    passportNumber: 'H78901234',
    passportExpiry: '2033-12-04',
    dietaryPreferences: ['HALAL'],
    accountStatus: 'pending',
    loyaltyMemberId: null,
  },
];

const bookingsData = [
  {
    pnr: 'SV1A2B3C',
    passengerLastName: 'Al-Rashidi',
    status: 'CONFIRMED',
    originIata: 'RUH',
    destinationIata: 'JED',
    departureAt: '2026-07-15T08:30:00Z',
    arrivalAt: '2026-07-15T10:00:00Z',
    flightNumber: 'SV101',
    cabinClass: 'Y',
    fareBasis: 'YOWSAU',
    isFlexible: false,
    rebookingEligible: true,
  },
  {
    pnr: 'SV4D5E6F',
    passengerLastName: 'Al-Zahrani',
    status: 'CONFIRMED',
    originIata: 'JED',
    destinationIata: 'DXB',
    departureAt: '2026-07-20T14:15:00Z',
    arrivalAt: '2026-07-20T16:30:00Z',
    flightNumber: 'SV215',
    cabinClass: 'C',
    fareBasis: 'CFLEX',
    isFlexible: true,
    rebookingEligible: true,
  },
  {
    pnr: 'SV7G8H9I',
    passengerLastName: 'Mansouri',
    status: 'CONFIRMED',
    originIata: 'RUH',
    destinationIata: 'LHR',
    departureAt: '2026-08-01T23:45:00Z',
    arrivalAt: '2026-08-02T06:30:00Z',
    flightNumber: 'SV317',
    cabinClass: 'W',
    fareBasis: 'WPOW',
    isFlexible: false,
    rebookingEligible: true,
  },
  {
    pnr: 'SVABCDEF',
    passengerLastName: 'Al-Otaibi',
    status: 'CONFIRMED',
    originIata: 'DMM',
    destinationIata: 'CAI',
    departureAt: '2026-07-25T06:00:00Z',
    arrivalAt: '2026-07-25T09:45:00Z',
    flightNumber: 'SV422',
    cabinClass: 'Y',
    fareBasis: 'YOWREG',
    isFlexible: false,
    rebookingEligible: true,
  },
  {
    pnr: 'SVXYZ789',
    passengerLastName: 'Bin-Saleh',
    status: 'REBOOKED',
    originIata: 'JED',
    destinationIata: 'KUL',
    departureAt: '2026-09-10T01:30:00Z',
    arrivalAt: '2026-09-10T14:00:00Z',
    flightNumber: 'SV519',
    cabinClass: 'F',
    fareBasis: 'FFLEX',
    isFlexible: true,
    rebookingEligible: false,
  },
];

const claimsData = [
  {
    pnr: 'SV1A2B3C',
    passengerLastName: 'Al-Rashidi',
    flightDate: '2026-06-01',
    originIata: 'RUH',
    destinationIata: 'JED',
    claimType: 'DELAYED',
    bagTagNumber: 'SV123456',
    bagDescription: 'حقيبة سوداء كبيرة من ماركة ساموسونايت',
    declaredValueSar: 1500.00,
    contactEmail: 'ahmed.al-rashidi@example.sa',
    contactPhone: '+966501234567',
    description: 'تأخر وصول الحقيبة لأكثر من 24 ساعة بعد هبوط الرحلة',
    status: 'UNDER_REVIEW',
    crn: 'CLM-2026-000001',
  },
  {
    pnr: 'SV4D5E6F',
    passengerLastName: 'Al-Zahrani',
    flightDate: '2026-06-05',
    originIata: 'JED',
    destinationIata: 'DXB',
    claimType: 'DAMAGED',
    bagTagNumber: 'SV234567',
    bagDescription: 'حقيبة حمراء صغيرة بعجلات',
    declaredValueSar: 800.00,
    contactEmail: 'fatima.al-zahrani@example.sa',
    contactPhone: '+966512345678',
    description: 'الحقيبة وصلت مكسورة المقبض وممزقة من الجانب',
    status: 'SUBMITTED',
    crn: 'CLM-2026-000002',
  },
  {
    pnr: 'SV7G8H9I',
    passengerLastName: 'Mansouri',
    flightDate: '2026-05-20',
    originIata: 'RUH',
    destinationIata: 'LHR',
    claimType: 'LOST',
    bagTagNumber: 'SV345678',
    bagDescription: 'حقيبة زرقاء متوسطة الحجم',
    declaredValueSar: 3500.00,
    contactEmail: 'khalid.mansouri@example.sa',
    contactPhone: '+966523456789',
    description: 'The bag was not found at destination baggage claim after arrival',
    status: 'PENDING_PASSENGER_INFORMATION',
    crn: 'CLM-2026-000003',
  },
];

const loyaltyData = [
  {
    membershipNumber: 'SM1001234',
    tier: 'GOLD',
    milesBalance: 125000,
    tierPoints: 85000,
    tierRenewalDate: '2027-01-01',
    milesExpiryDate: '2026-12-31',
    milesExpiringAmount: 15000,
  },
  {
    membershipNumber: 'SM1002345',
    tier: 'SILVER',
    milesBalance: 45000,
    tierPoints: 32000,
    tierRenewalDate: '2027-01-01',
    milesExpiryDate: '2027-03-31',
    milesExpiringAmount: 5000,
  },
  {
    membershipNumber: 'SM1003456',
    tier: 'PLATINUM',
    milesBalance: 280000,
    tierPoints: 145000,
    tierRenewalDate: '2027-01-01',
    milesExpiryDate: '2027-06-30',
    milesExpiringAmount: 25000,
  },
  {
    membershipNumber: 'SM1004567',
    tier: 'BLUE',
    milesBalance: 8500,
    tierPoints: 4200,
    tierRenewalDate: null,
    milesExpiryDate: '2026-09-30',
    milesExpiringAmount: 2000,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log('\n📦 Seeding users...');
  const userIds = {};

  for (const u of usersData) {
    try {
      const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      const id = uuidv4();

      await db.query(
        `INSERT INTO identity.users (
           id, email, national_id, password_hash,
           first_name_ar, last_name_ar, first_name_en, last_name_en,
           phone_number, preferred_language, nationality,
           date_of_birth, passport_number, passport_expiry,
           dietary_preferences, account_status, loyalty_member_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (email) DO NOTHING`,
        [
          id, u.email.toLowerCase(), u.nationalId, passwordHash,
          u.firstNameAr, u.lastNameAr, u.firstNameEn, u.lastNameEn,
          u.phoneNumber, u.preferredLanguage, u.nationality,
          u.dateOfBirth, u.passportNumber, u.passportExpiry,
          u.dietaryPreferences ? JSON.stringify(u.dietaryPreferences) : null,
          u.accountStatus, u.loyaltyMemberId,
        ]
      );

      // Fetch the inserted/existing user
      const existing = await db.query(
        'SELECT id FROM identity.users WHERE email = $1',
        [u.email.toLowerCase()]
      );
      if (existing.rows[0]) {
        userIds[u.email] = existing.rows[0].id;
      }

      console.log(`   ✅ User: ${u.firstNameEn} ${u.lastNameEn} (${u.email})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed user ${u.email}:`, err.message);
    }
  }

  return userIds;
}

async function seedPdplConsent(userIds) {
  console.log('\n📦 Seeding PDPL consent records...');

  for (const email of Object.keys(userIds)) {
    const userId = userIds[email];
    try {
      await db.query(
        `INSERT INTO identity.pdpl_consent
           (id, user_id, consent_version, consented_at, ip_address, consent_type)
         VALUES ($1,$2,'2023-v1',NOW(),'10.0.0.1','registration')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), userId]
      );
    } catch (err) {
      console.error(`   ❌ Failed PDPL consent for ${email}:`, err.message);
    }
  }
  console.log(`   ✅ PDPL consent records seeded for ${Object.keys(userIds).length} users`);
}

async function seedNotificationPreferences(userIds) {
  console.log('\n📦 Seeding notification preferences...');

  for (const userId of Object.values(userIds)) {
    try {
      await db.query(
        `INSERT INTO identity.notification_preferences
           (user_id, email_booking_confirmations, sms_flight_alerts, loyalty_newsletters)
         VALUES ($1, true, true, false)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    } catch (err) {
      console.error(`   ❌ Failed notification prefs for user ${userId}:`, err.message);
    }
  }
  console.log(`   ✅ Notification preferences seeded`);
}

async function seedBookings(userIds) {
  console.log('\n📦 Seeding bookings...');
  const bookingIds = {};

  const emailToLastName = {
    'ahmed.al-rashidi@example.sa': 'Al-Rashidi',
    'fatima.al-zahrani@example.sa': 'Al-Zahrani',
    'khalid.mansouri@example.sa': 'Mansouri',
    'sara.al-otaibi@example.sa': 'Al-Otaibi',
    'mohammed.bin-saleh@example.sa': 'Bin-Saleh',
  };

  const pnrToEmail = {
    'SV1A2B3C': 'ahmed.al-rashidi@example.sa',
    'SV4D5E6F': 'fatima.al-zahrani@example.sa',
    'SV7G8H9I': 'khalid.mansouri@example.sa',
    'SVABCDEF': 'sara.al-otaibi@example.sa',
    'SVXYZ789': 'mohammed.bin-saleh@example.sa',
  };

  for (const b of bookingsData) {
    try {
      const userId = userIds[pnrToEmail[b.pnr]] || null;
      const id = uuidv4();

      await db.query(
        `INSERT INTO booking.bookings (
           id, pnr, user_id, passenger_last_name, status,
           origin_iata, destination_iata, departure_at, arrival_at,
           flight_number, cabin_class, fare_basis, is_flexible, rebooking_eligible
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (pnr) DO NOTHING`,
        [
          id, b.pnr, userId, b.passengerLastName, b.status,
          b.originIata, b.destinationIata, b.departureAt, b.arrivalAt,
          b.flightNumber, b.cabinClass, b.fareBasis,
          b.isFlexible, b.rebookingEligible,
        ]
      );

      const existing = await db.query(
        'SELECT id FROM booking.bookings WHERE pnr = $1',
        [b.pnr]
      );
      if (existing.rows[0]) {
        bookingIds[b.pnr] = existing.rows[0].id;
      }

      console.log(`   ✅ Booking PNR: ${b.pnr} (${b.originIata}→${b.destinationIata})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed booking ${b.pnr}:`, err.message);
    }
  }
  return bookingIds;
}

async function seedBaggageClaims(userIds) {
  console.log('\n📦 Seeding baggage claims...');
  const claimIds = {};

  const pnrToEmail = {
    'SV1A2B3C': 'ahmed.al-rashidi@example.sa',
    'SV4D5E6F': 'fatima.al-zahrani@example.sa',
    'SV7G8H9I': 'khalid.mansouri@example.sa',
  };

  for (const c of claimsData) {
    try {
      const userId = userIds[pnrToEmail[c.pnr]] || null;
      const id = uuidv4();

      await db.query(
        `INSERT INTO baggage.claims (
           id, crn, user_id, pnr, passenger_last_name, flight_date,
           origin_iata, destination_iata, claim_type, bag_tag_number,
           bag_description, declared_value_sar, contact_email, contact_phone,
           description, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (crn) DO NOTHING`,
        [
          id, c.crn, userId, c.pnr, c.passengerLastName, c.flightDate,
          c.originIata, c.destinationIata, c.claimType, c.bagTagNumber,
          c.bagDescription, c.declaredValueSar, c.contactEmail, c.contactPhone,
          c.description, c.status,
        ]
      );

      const existing = await db.query(
        'SELECT id FROM baggage.claims WHERE crn = $1',
        [c.crn]
      );
      if (existing.rows[0]) {
        claimIds[c.crn] = existing.rows[0].id;

        // Seed initial status history
        await db.query(
          `INSERT INTO baggage.claim_status_history
             (id, claim_id, previous_status, new_status, changed_by, notes)
           VALUES ($1,$2,NULL,'SUBMITTED','PASSENGER','Initial claim submission')
           ON CONFLICT DO NOTHING`,
          [uuidv4(), existing.rows[0].id]
        );

        if (c.status !== 'SUBMITTED') {
          await db.query(
            `INSERT INTO baggage.claim_status_history
               (id, claim_id, previous_status, new_status, changed_by, notes)
             VALUES ($1,$2,'SUBMITTED',$3,'AGENT','Status updated by baggage team')
             ON CONFLICT DO NOTHING`,
            [uuidv4(), existing.rows[0].id, c.status]
          );
        }
      }

      console.log(`   ✅ Claim CRN: ${c.crn} (${c.claimType} - ${c.status})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed claim ${c.crn}:`, err.message);
    }
  }
  return claimIds;
}

async function seedLoyaltyAccounts(userIds) {
  console.log('\n📦 Seeding loyalty accounts...');
  const loyaltyIds = {};

  const membershipToEmail = {
    'SM1001234': 'ahmed.al-rashidi@example.sa',
    'SM1002345': 'fatima.al-zahrani@example.sa',
    'SM1003456': 'khalid.mansouri@example.sa',
    'SM1004567': 'mohammed.bin-saleh@example.sa',
  };

  for (const la of loyaltyData) {
    try {
      const userId = userIds[membershipToEmail[la.membershipNumber]];
      if (!userId) {
        console.warn(`   ⚠️  No user found for membership ${la.membershipNumber}`);
        continue;
      }
      const id = uuidv4();

      await db.query(
        `INSERT INTO loyalty.accounts (
           id, user_id, membership_number, tier, miles_balance,
           tier_points, tier_renewal_date, miles_expiry_date,
           miles_expiring_amount, last_synced_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [
          id, userId, la.membershipNumber, la.tier, la.milesBalance,
          la.tierPoints, la.tierRenewalDate, la.milesExpiryDate,
          la.milesExpiringAmount,
        ]
      );

      const existing = await db.query(
        'SELECT id FROM loyalty.accounts WHERE membership_number = $1',
        [la.membershipNumber]
      );
      if (existing.rows[0]) {
        loyaltyIds[la.membershipNumber] = existing.rows[0].id;

        // Seed sample transactions
        const transactions = [
          {
            descriptionAr: `أميال مكتسبة من رحلة RUH-JED`,
            descriptionEn: `Miles earned from flight RUH-JED`,
            milesDelta: 5000,
            transactionType: 'EARN_FLIGHT',
            referenceId: 'SV101',
          },
          {
            descriptionAr: `ترقية درجة باستخدام الأميال`,
            descriptionEn: `Cabin upgrade using miles`,
            milesDelta: -15000,
            transactionType: 'REDEEM_UPGRADE',
            referenceId: 'SV215',
          },
          {
            descriptionAr: `أميال مكتسبة من رحلة JED-DXB`,
            descriptionEn: `Miles earned from flight JED-DXB`,
            milesDelta: 8000,
            transactionType: 'EARN_FLIGHT',
            referenceId: 'SV317',
          },
        ];

        let runningBalance = la.milesBalance - 8000 + 15000 - 5000;
        for (const tx of transactions) {
          runningBalance += tx.milesDelta;
          await db.query(
            `INSERT INTO loyalty.transactions (
               id, loyalty_account_id, transaction_date, description_ar, description_en,
               miles_delta, running_balance, transaction_type, reference_id
             ) VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8)
             ON CONFLICT DO NOTHING`,
            [
              uuidv4(), existing.rows[0].id,
              tx.descriptionAr, tx.descriptionEn,
              tx.milesDelta, runningBalance,
              tx.transactionType, tx.referenceId,
            ]
          );
        }
      }

      console.log(`   ✅ Loyalty: ${la.membershipNumber} (${la.tier}) — ${la.milesBalance.toLocaleString()} miles`);
    } catch (err) {
      console.error(`   ❌ Failed to seed loyalty ${la.membershipNumber}:`, err.message);
    }
  }
  return loyaltyIds;
}

async function seedSeatSelections(userIds, bookingIds) {
  console.log('\n📦 Seeding seat selections...');

  const selections = [
    {
      email: 'ahmed.al-rashidi@example.sa',
      pnr: 'SV1A2B3C',
      flightNumber: 'SV101',
      seatNumber: '24A',
      seatType: 'STANDARD',
      isPaid: false,
      pricePaidSar: 0,
    },
    {
      email: 'fatima.al-zahrani@example.sa',
      pnr: 'SV4D5E6F',
      flightNumber: 'SV215',
      seatNumber: '5C',
      seatType: 'EXTRA_LEGROOM',
      isPaid: true,
      pricePaidSar: 150,
    },
    {
      email: 'khalid.mansouri@example.sa',
      pnr: 'SV7G8H9I',
      flightNumber: 'SV317',
      seatNumber: '12F',
      seatType: 'PREMIUM',
      isPaid: true,
      pricePaidSar: 350,
    },
  ];

  for (const s of selections) {
    try {
      const userId = userIds[s.email];
      if (!userId) continue;

      await db.query(
        `INSERT INTO seat.seat_selections (
           id, user_id, pnr, flight_number, seat_number, seat_type,
           is_paid, price_paid_sar, pss_confirmed, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,'active')
         ON CONFLICT DO NOTHING`,
        [
          uuidv4(), userId, s.pnr, s.flightNumber,
          s.seatNumber, s.seatType, s.isPaid, s.pricePaidSar,
        ]
      );
      console.log(`   ✅ Seat: ${s.seatNumber} on ${s.flightNumber} for ${s.email}`);
    } catch (err) {
      console.error(`   ❌ Failed to seed seat for ${s.email}:`, err.message);
    }
  }
}

async function seedAuditLog(userIds) {
  console.log('\n📦 Seeding audit log...');

  const events = [
    { email: 'ahmed.al-rashidi@example.sa', eventType: 'USER_REGISTRATION', outcome: 'SUCCESS', entityType: 'User' },
    { email: 'ahmed.al-rashidi@example.sa', eventType: 'USER_LOGIN', outcome: 'SUCCESS', entityType: 'Session' },
    { email: 'fatima.al-zahrani@example.sa', eventType: 'USER_REGISTRATION', outcome: 'SUCCESS', entityType: 'User' },
    { email: 'fatima.al-zahrani@example.sa', eventType: 'USER_LOGIN', outcome: 'SUCCESS', entityType: 'Session' },
    { email: 'khalid.mansouri@example.sa', eventType: 'USER_REGISTRATION', outcome: 'SUCCESS', entityType: 'User' },
    { email: 'khalid.mansouri@example.sa', eventType: 'PROFILE_UPDATE', outcome: 'SUCCESS', entityType: 'User', fieldChanged: 'preferred_language' },
    { email: 'ahmed.al-rashidi@example.sa', eventType: 'BAGGAGE_CLAIM_SUBMITTED', outcome: 'SUCCESS', entityType: 'Document' },
    { email: 'fatima.al-zahrani@example.sa', eventType: 'SEAT_SELECTED', outcome: 'SUCCESS', entityType: 'Session' },
  ];

  for (const e of events) {
    try {
      const userId = userIds[e.email];
      await db.query(
        `INSERT INTO audit.audit_log (
           id, event_time, user_id, event_type, entity_type,
           entity_id, field_changed, ip_address, outcome
         ) VALUES ($1,NOW(),$2,$3,$4,$5,$6,'10.0.0.1',$7)
         ON CONFLICT DO NOTHING`,
        [
          uuidv4(), userId, e.eventType, e.entityType,
          userId, e.fieldChanged || null, e.outcome,
        ]
      );
    } catch (err) {
      console.error(`   ❌ Failed to seed audit event:`, err.message);
    }
  }
  console.log(`   ✅ Audit log entries seeded`);
}

async function seedNotificationLog(userIds) {
  console.log('\n📦 Seeding notification log...');

  const notifications = [
    {
      email: 'ahmed.al-rashidi@example.sa',
      channel: 'email',
      recipient: 'a***@example.sa',
      templateId: 'registration-confirmation-ar',
      language: 'ar',
      subject: 'تأكيد تسجيل الحساب - Air Saudia',
      status: 'delivered',
    },
    {
      email: 'fatima.al-zahrani@example.sa',
      channel: 'email',
      recipient: 'f***@example.sa',
      templateId: 'booking-confirmation-ar',
      language: 'ar',
      subject: 'تأكيد الحجز SV4D5E6F - Air Saudia',
      status: 'delivered',
    },
    {
      email: 'khalid.mansouri@example.sa',
      channel: 'sms',
      recipient: '+9665****789',
      templateId: 'mfa-otp-en',
      language: 'en',
      subject: null,
      status: 'delivered',
    },
    {
      email: 'ahmed.al-rashidi@example.sa',
      channel: 'email',
      recipient: 'a***@example.sa',
      templateId: 'baggage-claim-confirmation-ar',
      language: 'ar',
      subject: 'تأكيد مطالبة الأمتعة CLM-2026-000001',
      status: 'sent',
    },
    {
      email: 'mohammed.bin-saleh@example.sa',
      channel: 'email',
      recipient: 'm***@example.sa',
      templateId: 'rebook-confirmation-ar',
      language: 'ar',
      subject: 'تأكيد إعادة الحجز SVXYZ789 - Air Saudia',
      status: 'delivered',
    },
  ];

  for (const n of notifications) {
    try {
      const userId = userIds[n.email];
      await db.query(
        `INSERT INTO notification.notification_log (
           id, user_id, channel, recipient, template_id, language,
           subject, status, sent_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT DO NOTHING`,
        [uuidv4(), userId, n.channel, n.recipient, n.templateId, n.language, n.subject, n.status]
      );
    } catch (err) {
      console.error(`   ❌ Failed notification log for ${n.email}:`, err.message);
    }
  }
  console.log(`   ✅ Notification log entries seeded`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runSeed() {
  console.log('🌱 Starting Air Saudia Passenger Portal database seed...');
  console.log('   Environment:', process.env.NODE_ENV || 'development');

  try {
    await db.testConnection();

    const userIds = await seedUsers();
    await seedPdplConsent(userIds);
    await seedNotificationPreferences(userIds);
    const bookingIds = await seedBookings(userIds);
    await seedBaggageClaims(userIds);
    await seedLoyaltyAccounts(userIds);
    await seedSeatSelections(userIds, bookingIds);
    await seedAuditLog(userIds);
    await seedNotificationLog(userIds);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Sample login credentials:');
    console.log('   Email: ahmed.al-rashidi@example.sa | Password: SecurePass@123');
    console.log('   Email: khalid.mansouri@example.sa  | Password: Khalid@Pass99');
    console.log('   Email: fatima.al-zahrani@example.sa | Password: Travel@Secure1\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.pool.end();
    console.log('🔌 Database connection closed.');
  }
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  runSeed();
}

module.exports = { runSeed };
``