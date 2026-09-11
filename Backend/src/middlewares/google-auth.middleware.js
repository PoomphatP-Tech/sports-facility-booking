const { auth } = require('../config/firebase');

const requireGoogleToken = async (req, res, next) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ message: 'authentication required' });

  let identity;
  try {
    identity = await auth.verifyIdToken(match[1]);
  } catch (error) {
    const invalidTokenCodes = [
      'auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired',
      'auth/id-token-revoked', 'auth/user-disabled',
    ];
    if (invalidTokenCodes.includes(error.code)) {
      return res.status(401).json({ message: 'token is invalid or expired' });
    }
    console.error('Google token verification failed:', error.code);
    return res.status(503).json({ message: 'Unable to verify Google sign-in. Please try again.' });
  }

  if (identity.firebase?.sign_in_provider !== 'google.com') {
    return res.status(403).json({ message: 'Please sign in with Google to continue.' });
  }
  if (!identity.email || !identity.email_verified) {
    return res.status(403).json({ message: 'A verified Google email is required.' });
  }

  req.googleIdentity = identity;
  return next();
};

module.exports = { requireGoogleToken };
