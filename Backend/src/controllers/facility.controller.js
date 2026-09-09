const facilityService = require('../services/facility.service');

const getFacilityCards = async (req, res) => {
  try {
    const cards = await facilityService.getFacilityCards();
    return res.status(200).json({
      status: 'ok',
      data: cards,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'failed to get facility cards',
      detail: error.message,
    });
  }
};
const updateFacility = async (req, res) => {
  try {
    const facilityId = Number(req.params.facilityId);

    if (!facilityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid facility ID',
      });
    }

    const updatedFacility = await facilityService.updateFacility(
      facilityId,
      req.body
    );

    return res.status(200).json({
      status: 'ok',
      message: 'Facility updated successfully',
      data: updatedFacility,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'failed to update facility',
      detail: error.message,
    });
  }
};

const deleteFacility = async (req, res) => {
  try {
    const facilityId = Number(req.params.facilityId);

    if (!facilityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid facility ID',
      });
    }

    const deletedFacility = await facilityService.deleteFacility(facilityId);

    return res.status(200).json({
      status: 'ok',
      message: 'Facility deleted successfully',
      data: deletedFacility,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'failed to delete facility',
      detail: error.message,
    });
  }
};

const createFacility = async (req, res) => {
  try {
    const createdFacility = await facilityService.createFacility(req.body);

    return res.status(201).json({
      status: 'ok',
      message: 'Facility created successfully',
      data: createdFacility,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'failed to create facility',
      detail: error.message,
    });
  }
};

module.exports = {
  getFacilityCards,
  updateFacility,
  deleteFacility,
  createFacility
};