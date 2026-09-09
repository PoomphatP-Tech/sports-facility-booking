const profileService = require('../services/profile.service');

const getProfile = async (req, res) => {
  try {
    const result = await profileService.getProfile({ userId: req.user.id });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, address } = req.body;
    const result = await profileService.updateProfile({
      userId: req.user.id,
      firstName,
      lastName,
      dateOfBirth,
      address,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile };
