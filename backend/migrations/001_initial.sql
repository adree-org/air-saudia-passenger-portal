```sql
-- ============================================================================
-- Air Saudia Passenger Portal — Initial Database Migration
-- Version: 001
-- Date: 2026-06-14
-- PostgreSQL 15
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SCHEMA CREATION
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS baggage;
CREATE SCHEMA IF NOT EXISTS loyalty;
CREATE SCHEMA IF NOT EXISTS seat;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS notification;

-- ============================================================================
-- IDENTITY SCHEMA
-- ============================================================================

-- Table: identity.users
CREATE TABLE IF NOT EXISTS identity.users (
    id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    email                 VARCHAR(255)  NOT NULL,
    national_id           VARCHAR(20)   NULL,
    password_hash         VARCHAR(255)  NOT NULL,
    first_name_ar         VARCHAR(100)  NOT NULL,
    last_name_ar          VARCHAR(100)  NOT NULL,
    first_name_en         VARCHAR(100)  NOT NULL,
    last_name_en          VARCHAR(100)  NOT NULL,
    phone_number          VARCHAR(20)   NOT NULL,
    preferred_language    CHAR(2)       NOT NULL DEFAULT 'ar',
    nationality           CHAR(3)       NOT NULL,
    date_of_birth         DATE          NULL,
    passport_number       VARCHAR(30)   NULL,
    passport_expiry       DATE          NULL,
    dietary_preferences   JSONB         NULL,
    account_status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                              CHECK (account_status IN ('pending','active','locked','suspended')),
    failed_login_count    SMALLINT      NOT NULL DEFAULT 0,
    locked_at             TIMESTAMPTZ   NULL,
    mfa_enabled           BOOLEAN       NOT NULL DEFAULT false,
    mfa_method            VARCHAR(10)   NULL CHECK (mfa_method IN ('sms','totp') OR mfa_method IS NULL),
    totp_secret           VARCHAR(64)   NULL,
    loyalty_member_id     VARCHAR(30)   NULL,
    loyalty_linked_at     TIMESTAMPTZ   NULL,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_users                PRIMARY KEY (id),
    CONSTRAINT uq_users_email          UNIQUE (email),
    CONSTRAINT uq_users_national_id    UNIQUE (national_id),
    CONSTRAINT uq_users_loyalty_member UNIQUE (loyalty_member_id),
    CONSTRAINT chk_preferred_language  CHECK (preferred_language IN ('ar','en'))
);

CREATE INDEX IF NOT EXISTS idx_users_email             ON identity.users (email);
CREATE INDEX IF NOT EXISTS idx_users_national_id       ON identity.users (national_id);
CREATE INDEX IF NOT EXISTS idx_users_loyalty_member_id ON identity.users (loyalty_member_id);
CREATE INDEX IF NOT EXISTS idx_users_account_status    ON identity.users (account_status);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: identity.sessions
CREATE TABLE IF NOT EXISTS identity.sessions (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID          NOT NULL,
    refresh_token_hash   VARCHAR(255)  NOT NULL,
    ip_address           INET          NOT NULL,
    user_agent           TEXT          NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at           TIMESTAMPTZ   NOT NULL,
    revoked_at           TIMESTAMPTZ   NULL,
    last_active_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_sessions                      PRIMARY KEY (id),
    CONSTRAINT uq_sessions_refresh_token_hash   UNIQUE (refresh_token_hash),
    CONSTRAINT fk_sessions_user_id              FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id             ON identity.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash  ON identity.sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at          ON identity.sessions (expires_at);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: identity.otp_codes
CREATE TABLE IF NOT EXISTS identity.otp_codes (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID          NULL,
    purpose           VARCHAR(30)   NOT NULL
                          CHECK (purpose IN ('registration','mfa','profile_update','loyalty_link','password_reset')),
    code_hash         VARCHAR(255)  NOT NULL,
    delivery_channel  VARCHAR(5)    NOT NULL CHECK (delivery_channel IN ('email','sms')),
    delivered_to      VARCHAR(255)  NOT NULL,
    expires_at        TIMESTAMPTZ   NOT NULL,
    used_at           TIMESTAMPTZ   NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_otp_codes        PRIMARY KEY (id),
    CONSTRAINT fk_otp_codes_user   FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id    ON identity.otp_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON identity.otp_codes (expires_at);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: identity.password_reset_tokens
CREATE TABLE IF NOT EXISTS identity.password_reset_tokens (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL,
    token_hash  VARCHAR(255)  NOT NULL,
    expires_at  TIMESTAMPTZ   NOT NULL,
    used_at     TIMESTAMPTZ   NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_password_reset_tokens      PRIMARY KEY (id),
    CONSTRAINT uq_password_reset_token_hash  UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_user        FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON identity.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON identity.password_reset_tokens (expires_at);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: identity.pdpl_consent
CREATE TABLE IF NOT EXISTS identity.pdpl_consent (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL,
    consent_version  VARCHAR(10)  NOT NULL,
    consented_at     TIMESTAMPTZ  NOT NULL,
    ip_address       INET         NOT NULL,
    consent_type     VARCHAR(30)  NOT NULL
                         CHECK (consent_type IN ('registration','data_request','withdrawal')),
    notes            TEXT         NULL,

    CONSTRAINT pk_pdpl_consent      PRIMARY KEY (id),
    CONSTRAINT fk_pdpl_consent_user FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pdpl_consent_user_id ON identity.pdpl_consent (user_id);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: identity.notification_preferences
CREATE TABLE IF NOT EXISTS identity.notification_preferences (
    user_id                      UUID         NOT NULL,
    email_booking_confirmations  BOOLEAN      NOT NULL DEFAULT true,
    sms_flight_alerts            BOOLEAN      NOT NULL DEFAULT true,
    loyalty_newsletters          BOOLEAN      NOT NULL DEFAULT false,
    updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_notification_preferences       PRIMARY KEY (user_id),
    CONSTRAINT fk_notification_prefs_user        FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

-- ============================================================================
-- BOOKING SCHEMA
-- ============================================================================

-- Table: booking.bookings
CREATE TABLE IF NOT EXISTS booking.bookings (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    pnr                 VARCHAR(10)   NOT NULL,
    user_id             UUID          NULL,
    passenger_last_name VARCHAR(100)  NOT NULL,
    status              VARCHAR(30)   NOT NULL,
    origin_iata         CHAR(3)       NOT NULL,
    destination_iata    CHAR(3)       NOT NULL,
    departure_at        TIMESTAMPTZ   NOT NULL,
    arrival_at          TIMESTAMPTZ   NOT NULL,
    flight_number       VARCHAR(10)   NOT NULL,
    cabin_class         VARCHAR(10)   NOT NULL CHECK (cabin_class IN ('Y','W','C','F')),
    fare_basis          VARCHAR(20)   NULL,
    is_flexible         BOOLEAN       NOT NULL DEFAULT false,
    rebooking_eligible  BOOLEAN       NOT NULL DEFAULT false,
    pss_raw_response    JSONB         NULL,
    last_synced_at      TIMESTAMPTZ   NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_bookings          PRIMARY KEY (id),
    CONSTRAINT uq_bookings_pnr      UNIQUE (pnr),
    CONSTRAINT fk_bookings_user_id  FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_pnr         ON booking.bookings (pnr);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id     ON booking.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure   ON booking.bookings (departure_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON booking.bookings (status);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: booking.rebook_requests
CREATE TABLE IF NOT EXISTS booking.rebook_requests (
    id                       UUID           NOT NULL DEFAULT gen_random_uuid(),
    booking_id               UUID           NOT NULL,
    user_id                  UUID           NOT NULL,
    new_flight_number        VARCHAR(10)    NOT NULL,
    new_departure_at         TIMESTAMPTZ    NOT NULL,
    new_arrival_at           TIMESTAMPTZ    NOT NULL,
    new_origin_iata          CHAR(3)        NOT NULL,
    new_destination_iata     CHAR(3)        NOT NULL,
    fare_difference_sar      NUMERIC(10,2)  NOT NULL DEFAULT 0,
    change_fee_sar           NUMERIC(10,2)  NOT NULL DEFAULT 0,
    total_due_sar            NUMERIC(10,2)  NOT NULL DEFAULT 0,
    miles_applied            INTEGER        NOT NULL DEFAULT 0,
    cash_charged_sar         NUMERIC(10,2)  NOT NULL DEFAULT 0,
    payment_transaction_id   VARCHAR(100)   NULL,
    payment_status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                                 CHECK (payment_status IN ('pending','paid','failed','refunded')),
    pss_commit_status        VARCHAR(20)    NOT NULL DEFAULT 'pending'
                                 CHECK (pss_commit_status IN ('pending','committed','failed')),
    fare_rules_acknowledged  BOOLEAN        NOT NULL DEFAULT false,
    status                   VARCHAR(20)    NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','pending_payment','confirmed','failed')),
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_rebook_requests         PRIMARY KEY (id),
    CONSTRAINT fk_rebook_booking          FOREIGN KEY (booking_id)
        REFERENCES booking.bookings (id),
    CONSTRAINT fk_rebook_user             FOREIGN KEY (user_id)
        REFERENCES identity.users (id)
);

CREATE INDEX IF NOT EXISTS idx_rebook_requests_booking_id ON booking.rebook_requests (booking_id);
CREATE INDEX IF NOT EXISTS idx_rebook_requests_user_id    ON booking.rebook_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_rebook_requests_status     ON booking.rebook_requests (status);

-- ============================================================================
-- BAGGAGE SCHEMA
-- ============================================================================

-- Table: baggage.claims
CREATE TABLE IF NOT EXISTS baggage.claims (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    crn                 VARCHAR(15)    NOT NULL,
    user_id             UUID           NULL,
    pnr                 VARCHAR(10)    NOT NULL,
    passenger_last_name VARCHAR(100)   NOT NULL,
    flight_date         DATE           NOT NULL,
    origin_iata         CHAR(3)        NOT NULL,
    destination_iata    CHAR(3)        NOT NULL,
    claim_type          VARCHAR(10)    NOT NULL CHECK (claim_type IN ('LOST','DELAYED','DAMAGED')),
    bag_tag_number      VARCHAR(10)    NOT NULL,
    bag_description     TEXT           NULL,
    declared_value_sar  NUMERIC(10,2)  NULL,
    contact_email       VARCHAR(255)   NOT NULL,
    contact_phone       VARCHAR(20)    NOT NULL,
    description         TEXT           NULL,
    status              VARCHAR(40)    NOT NULL DEFAULT 'SUBMITTED'
                            CHECK (status IN (
                              'SUBMITTED',
                              'UNDER_REVIEW',
                              'PENDING_PASSENGER_INFORMATION',
                              'RESOLVED_BAG_FOUND',
                              'RESOLVED_COMPENSATION_APPROVED',
                              'CLOSED'
                            )),
    bms_claim_id        VARCHAR(50)    NULL,
    bms_synced_at       TIMESTAMPTZ    NULL,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_claims            PRIMARY KEY (id),
    CONSTRAINT uq_claims_crn        UNIQUE (crn),
    CONSTRAINT fk_claims_user       FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE SET NULL,
    CONSTRAINT chk_bag_tag_format   CHECK (bag_tag_number ~ '^[A-Z]{2}[0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_claims_crn       ON baggage.claims (crn);
CREATE INDEX IF NOT EXISTS idx_claims_user_id   ON baggage.claims (user_id);
CREATE INDEX IF NOT EXISTS idx_claims_pnr       ON baggage.claims (pnr);
CREATE INDEX IF NOT EXISTS idx_claims_status    ON baggage.claims (status);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: baggage.claim_status_history
CREATE TABLE IF NOT EXISTS baggage.claim_status_history (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    claim_id         UUID         NOT NULL,
    previous_status  VARCHAR(40)  NULL,
    new_status       VARCHAR(40)  NOT NULL,
    changed_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    changed_by       VARCHAR(50)  NOT NULL,
    notes            TEXT         NULL,

    CONSTRAINT pk_claim_status_history      PRIMARY KEY (id),
    CONSTRAINT fk_claim_status_history_claim FOREIGN KEY (claim_id)
        REFERENCES baggage.claims (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim_id ON baggage.claim_status_history (claim_id);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: baggage.claim_documents
CREATE TABLE IF NOT EXISTS baggage.claim_documents (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    claim_id         UUID          NOT NULL,
    file_name        VARCHAR(255)  NOT NULL,
    storage_key      VARCHAR(500)  NOT NULL,
    mime_type        VARCHAR(50)   NOT NULL
                         CHECK (mime_type IN ('image/jpeg','image/png','application/pdf')),
    file_size_bytes  INTEGER       NOT NULL
                         CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
    uploaded_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    uploaded_by      UUID          NULL,
    bms_synced       BOOLEAN       NOT NULL DEFAULT false,

    CONSTRAINT pk_claim_documents        PRIMARY KEY (id),
    CONSTRAINT fk_claim_documents_claim  FOREIGN KEY (claim_id)
        REFERENCES baggage.claims (id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_documents_user   FOREIGN KEY (uploaded_by)
        REFERENCES identity.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON baggage.claim_documents (claim_id);

-- ============================================================================
-- LOYALTY SCHEMA
-- ============================================================================

-- Table: loyalty.accounts
CREATE TABLE IF NOT EXISTS loyalty.accounts (
    id                    UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id               UUID         NOT NULL,
    membership_number     VARCHAR(30)  NOT NULL,
    tier                  VARCHAR(15)  NOT NULL
                              CHECK (tier IN ('BLUE','SILVER','GOLD','PLATINUM')),
    miles_balance         INTEGER      NOT NULL DEFAULT 0,
    tier_points           INTEGER      NOT NULL DEFAULT 0,
    tier_renewal_date     DATE         NULL,
    miles_expiry_date     DATE         NULL,
    miles_expiring_amount INTEGER      NOT NULL DEFAULT 0,
    last_synced_at        TIMESTAMPTZ  NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_loyalty_accounts          PRIMARY KEY (id),
    CONSTRAINT uq_loyalty_accounts_user_id  UNIQUE (user_id),
    CONSTRAINT uq_loyalty_membership_number UNIQUE (membership_number),
    CONSTRAINT fk_loyalty_accounts_user     FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user_id           ON loyalty.accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_membership_number ON loyalty.accounts (membership_number);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: loyalty.transactions
CREATE TABLE IF NOT EXISTS loyalty.transactions (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    loyalty_account_id  UUID         NOT NULL,
    transaction_date    DATE         NOT NULL,
    description_ar      TEXT         NOT NULL,
    description_en      TEXT         NOT NULL,
    miles_delta         INTEGER      NOT NULL,
    running_balance     INTEGER      NOT NULL,
    transaction_type    VARCHAR(20)  NOT NULL
                            CHECK (transaction_type IN (
                              'EARN_FLIGHT','REDEEM_UPGRADE','REDEEM_REBOOK',
                              'EXPIRE','TOPUP'
                            )),
    reference_id        VARCHAR(100) NULL,
    loyalty_system_id   VARCHAR(100) NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_loyalty_transactions          PRIMARY KEY (id),
    CONSTRAINT fk_loyalty_transactions_account  FOREIGN KEY (loyalty_account_id)
        REFERENCES loyalty.accounts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty.transactions (loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date       ON loyalty.transactions (transaction_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: loyalty.redemptions
CREATE TABLE IF NOT EXISTS loyalty.redemptions (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    loyalty_account_id  UUID           NOT NULL,
    redemption_type     VARCHAR(20)    NOT NULL
                            CHECK (redemption_type IN ('UPGRADE','REBOOK_PARTIAL')),
    miles_deducted      INTEGER        NOT NULL,
    cash_amount_sar     NUMERIC(10,2)  NOT NULL DEFAULT 0,
    booking_pnr         VARCHAR(10)    NOT NULL,
    status              VARCHAR(20)    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','rolled_back')),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ    NULL,

    CONSTRAINT pk_loyalty_redemptions         PRIMARY KEY (id),
    CONSTRAINT fk_loyalty_redemptions_account FOREIGN KEY (loyalty_account_id)
        REFERENCES loyalty.accounts (id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_account_id ON loyalty.redemptions (loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_pnr        ON loyalty.redemptions (booking_pnr);

-- ============================================================================
-- SEAT SCHEMA
-- ============================================================================

-- Table: seat.seat_selections
CREATE TABLE IF NOT EXISTS seat.seat_selections (
    id                     UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id                UUID           NOT NULL,
    pnr                    VARCHAR(10)    NOT NULL,
    flight_number          VARCHAR(10)    NOT NULL,
    seat_number            VARCHAR(5)     NOT NULL,
    seat_type              VARCHAR(20)    NOT NULL
                               CHECK (seat_type IN ('STANDARD','EXTRA_LEGROOM','EXIT_ROW','PREMIUM')),
    is_paid                BOOLEAN        NOT NULL DEFAULT false,
    price_paid_sar         NUMERIC(10,2)  NOT NULL DEFAULT 0,
    payment_transaction_id VARCHAR(100)   NULL,
    pss_confirmed          BOOLEAN        NOT NULL DEFAULT false,
    selected_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    status                 VARCHAR(20)    NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','cancelled','superseded')),

    CONSTRAINT pk_seat_selections        PRIMARY KEY (id),
    CONSTRAINT fk_seat_selections_user   FOREIGN KEY (user_id)
        REFERENCES identity.users (id)
);

CREATE INDEX IF NOT EXISTS idx_seat_selections_pnr     ON seat.seat_selections (pnr);
CREATE INDEX IF NOT EXISTS idx_seat_selections_user_id ON seat.seat_selections (user_id);
CREATE INDEX IF NOT EXISTS idx_seat_selections_status  ON seat.seat_selections (status);

-- ─────────────────────────────────────────────────────────────────────────────

-- Table: seat.upgrade_requests
CREATE TABLE IF NOT EXISTS seat.upgrade_requests (
    id                     UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id                UUID           NOT NULL,
    pnr                    VARCHAR(10)    NOT NULL,
    flight_number          VARCHAR(10)    NOT NULL,
    current_cabin          VARCHAR(5)     NOT NULL,
    target_cabin           VARCHAR(5)     NOT NULL,
    upgrade_method         VARCHAR(10)    NOT NULL
                               CHECK (upgrade_method IN ('CASH','MILES','HYBRID')),
    cash_amount_sar        NUMERIC(10,2)  NOT NULL DEFAULT 0,
    miles_amount           INTEGER        NOT NULL DEFAULT 0,
    payment_transaction_id VARCHAR(100)   NULL,
    status                 VARCHAR(15)    NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING','CONFIRMED','WAITLISTED','DECLINED')),
    pss_confirmed          BOOLEAN        NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_upgrade_requests        PRIMARY KEY (id),
    CONSTRAINT fk_upgrade_requests_user   FOREIGN KEY (user_id)
        REFERENCES identity.users (id)
);

CREATE INDEX IF NOT EXISTS idx_upgrade_requests_pnr     ON seat.upgrade_requests (pnr);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_id ON seat.upgrade_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status  ON seat.upgrade_requests (status);

-- ============================================================================
-- AUDIT SCHEMA
-- ============================================================================

-- Table: audit.audit_log (range-partitioned by month)
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    event_time      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    user_id         UUID         NULL,
    session_id      UUID         NULL,
    event_type      VARCHAR(50)  NOT NULL,
    entity_type     VARCHAR(30)  NULL,
    entity_id       VARCHAR(100) NULL,
    field_changed   VARCHAR(100) NULL,
    old_value_hash  VARCHAR(255) NULL,
    new_value_hash  VARCHAR(255) NULL,
    ip_address      INET         NULL,
    user_agent      TEXT         NULL,
    outcome         VARCHAR(10)  NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE')),
    metadata        JSONB        NULL,

    CONSTRAINT pk_audit_log PRIMARY KEY (id, event_time)
) PARTITION BY RANGE (event_time);

-- Create initial monthly partitions
CREATE TABLE IF NOT EXISTS audit.audit_log_2026_01
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_02
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_03
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_04
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_05
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_06
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_07
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_08
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_09
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_10
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_11
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2026_12
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS audit.audit_log_2027_01
    PARTITION OF audit.audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit.audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_time ON audit.audit_log (event_time DESC);

-- ============================================================================
-- NOTIFICATION SCHEMA
-- ============================================================================

-- Table: notification.notification_log
CREATE TABLE IF NOT EXISTS notification.notification_log (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID         NULL,
    channel             VARCHAR(5)   NOT NULL CHECK (channel IN ('email','sms')),
    recipient           VARCHAR(255) NOT NULL,
    template_id         VARCHAR(50)  NOT NULL,
    language            CHAR(2)      NOT NULL CHECK (language IN ('ar','en')),
    subject             VARCHAR(255) NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','sent','delivered','failed')),
    external_message_id VARCHAR(200) NULL,
    sent_at             TIMESTAMPTZ  NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    retry_count         SMALLINT     NOT NULL DEFAULT 0,
    reference_type      VARCHAR(30)  NULL,
    reference_id        UUID         NULL,

    CONSTRAINT pk_notification_log        PRIMARY KEY (id),
    CONSTRAINT fk_notification_log_user   FOREIGN KEY (user_id)
        REFERENCES identity.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id       ON notification.notification_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status        ON notification.notification_log (status);
CREATE INDEX IF NOT EXISTS idx_notification_log_reference     ON notification.notification_log (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at    ON notification.notification_log (created_at DESC);

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
``