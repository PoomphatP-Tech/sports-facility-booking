const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { requireGoogleToken } = require('../middlewares/google-auth.middleware');

const router = express.Router();

router.post('/register/credentials', authController.registerCredentials);
router.post(
  '/register/details',
  authMiddleware.requireAuth,
  authController.completeRegisterDetails
);

router.post('/google-sync', requireGoogleToken, authController.googleSync,
  authMiddleware.requireAuth, authController.me);
router.get('/session', authMiddleware.requireAuth, authController.sessionStatus);
router.get('/me', authMiddleware.requireAuth, authController.me);

module.exports = router;
