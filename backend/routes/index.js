```javascript
'use strict';

const express = require('express');
const router = express.Router();

// Route imports
const authRouter           = require('./auth');
const profileRouter        = require('./profile');
const usersRouter          = require('./users');
const sessionsRouter       = require('./sessions');
const bookingsRouter       = require('./bookings');
const baggageRouter        = require('./baggage');
const loyaltyRouter        = require('./loyalty');
const seatsRouter          = require('./seats');
const notificationsRouter  = require('./notifications');
const auditRouter          = require('./audit');
const documentsRouter      = require('./documents');
const groupsRouter         = require('./groups');
const rolesRouter          = require('./roles');
const productsRouter       = require('./products');
const departmentsRouter    = require('./departments');
const customersRouter      = require('./customers');
const teamsRouter          = require('./teams');

const { requireAuth } = require('../middleware/auth');

// ── Public routes (no auth required) ──────────────────────────────────────────
router.use('/auth',         authRouter);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use('/profile',        requireAuth, profileRouter);
router.use('/users',          requireAuth, usersRouter);
router.use('/sessions',       requireAuth, sessionsRouter);
router.use('/bookings',       bookingsRouter);      // has mixed auth (some public PNR lookup)
router.use('/baggage',        baggageRouter);       // has mixed auth (some public CRN lookup)
router.use('/loyalty',        requireAuth, loyaltyRouter);
router.use('/seats',          requireAuth, seatsRouter);
router.use('/notifications',  requireAuth, notificationsRouter);
router.use('/audit',          requireAuth, auditRouter);
router.use('/documents',      requireAuth, documentsRouter);
router.use('/groups',         requireAuth, groupsRouter);
router.use('/roles',          requireAuth, rolesRouter);
router.use('/products',       requireAuth, productsRouter);
router.use('/departments',    requireAuth, departmentsRouter);
router.use('/customers',      requireAuth, customersRouter);
router.use('/teams',          requireAuth, teamsRouter);

// ── API root ──────────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'Air Saudia Passenger Portal API',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
``