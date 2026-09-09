const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register/credentials', authController.registerCredentials);
router.post(
  '/register/details',
  authMiddleware.requireAuth,
  authController.completeRegisterDetails
);

router.post('/google-sync', authController.googleSync);
router.get('/session', authMiddleware.requireAuth, authController.sessionStatus);
router.get('/me', authMiddleware.requireAuth, authController.me);

module.exports = router;