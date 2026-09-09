const authService = require('../services/auth.service');

const formatErrorResponse = (error, fallbackMessage) => ({
  message: error.message || fallbackMessage,
  nextStep: error.nextStep,
  state: error.state,
});

const registerCredentials = async (req, res) => {
  try {
    const { firebaseUid, email } = req.body;
    const result = await authService.registerCredentials({ firebaseUid, email });
    return res.status(201).json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 400)
      .json(formatErrorResponse(error, 'Register credentials failed'));
  }
};

const completeRegisterDetails = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, address } = req.body;

    const result = await authService.completeRegisterDetails({
      firstName,
      lastName,
      dateOfBirth,
      address,
      userId: req.user.id,
    });

    return res.status(201).json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 400)
      .json(formatErrorResponse(error, 'Register details failed'));
  }
};

const me = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

const sessionStatus = async (req, res) => {
  const user = req.user;
  const isPendingStep3 =
    !user.firstName || !user.lastName || !user.dateOfBirth || !user.address;

  return res.status(200).json({
    isLoggedIn: true,
    isPendingStep3,
    user,
  });
};

const googleSync = async (req, res) => {
  try {
    const { firebaseUid, email, firstName, lastName } = req.body;
    const result = await authService.googleSync({ firebaseUid, email, firstName, lastName });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 400).json(formatErrorResponse(error, 'Google sync failed'));
  }
};

module.exports = {
  registerCredentials,
  completeRegisterDetails,
  me,
  sessionStatus,
  googleSync,
};