const partnerMatchingService = require('../services/partner-matching.service');

const getPartners = async (req, res) => {
  try {
    const partners = await partnerMatchingService.getPartners({
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'partners fetched',
      data: partners,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'failed to get partners',
    });
  }
};

const createMatchRequest = async (req, res) => {
  try {
    const { receiverMemberId } = req.body;

    if (!receiverMemberId) {
      return res.status(400).json({
        message: 'receiverMemberId is required',
      });
    }

    const request = await partnerMatchingService.createMatchRequest({
      senderUserId: req.user.id,
      receiverMemberId,
    });

    return res.status(201).json({
      message: 'match request created',
      data: request,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'failed to create match request',
    });
  }
};

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await partnerMatchingService.getIncomingRequests({
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'incoming partner requests fetched',
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'failed to get partner requests',
    });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const updated = await partnerMatchingService.updateRequestStatus({
      userId: req.user.id,
      requestId,
      status,
    });

    return res.status(200).json({
      message: 'partner request status updated',
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'failed to update partner request status',
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await partnerMatchingService.getMyProfile({
      userId: req.user.id,
    });
    return res.status(200).json({
      message: 'my partner profile fetched',
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'failed to get partner profile',
    });
  }
};

const upsertMyProfile = async (req, res) => {
  try {
    const { bio, sport, skillLevel, availability, preferredTime } = req.body;

    const profile = await partnerMatchingService.upsertMyProfile({
      userId: req.user.id,
      bio,
      sport,
      skillLevel,
      availability,
      preferredTime,
    });

    return res.status(200).json({
      message: 'partner profile saved',
      data: profile,
    });
  } catch (error) {
    const userErrors = {
      SPORT_REQUIRED: 'sport is required',
      INVALID_SKILL_LEVEL: 'skill level must be beginner, intermediate, or advanced',
      AVAILABILITY_REQUIRED: 'availability is required',
      PREFERRED_TIME_REQUIRED: 'preferred time is required',
      'member profile not found': 'member profile not found for this account',
    };
    const msg = userErrors[error.message];
    if (msg) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({
      message: error.message || 'failed to save partner profile',
    });
  }
};

module.exports = {
  getPartners,
  createMatchRequest,
  getIncomingRequests,
  updateRequestStatus,
  getMyProfile,
  upsertMyProfile,
};