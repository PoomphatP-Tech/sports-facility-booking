const staffManagementService = require('../services/staff-management.service');

const getAllStaff = async (req, res) => {
  try {
    const staff = await staffManagementService.getAllStaff();
    return res.status(200).json({ status: 'ok', data: staff });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get staff list',
      detail: error.message,
    });
  }
};

const createStaff = async (req, res) => {
  try {
    const { username, name, password, facilityIds = [] } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'username, name and password are required',
      });
    }

    const result = await staffManagementService.createStaff({ username, name, password, facilityIds });
    return res.status(201).json({
      status: 'ok',
      message: 'Staff created successfully',
      data: result,
    });
  } catch (error) {
    const isDuplicate = error.message?.includes('duplicate key');
    return res.status(isDuplicate ? 409 : 500).json({
      status: 'error',
      message: 'Failed to create staff',
      detail: error.message,
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const staffId = Number(req.params.staffId);
    if (!staffId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid staff ID' 
    });
    }

    const { username, name, password, facilityIds = [] } = req.body;

    if (!username || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'username and name are required',
      });
    }

    const result = await staffManagementService.updateStaff(staffId, { username, name, password, facilityIds });
    return res.status(200).json({
      status: 'ok',
      message: 'Staff updated successfully',
      data: result,
    });
  } catch (error) {
    return res.status(notFound ? 404 : 500).json({
      status: 'error',
      message: 'Failed to update staff',
      detail: error.message,
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staffId = Number(req.params.staffId);
    if (!staffId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid staff ID' 
      });
    }

    const result = await staffManagementService.deleteStaff(staffId);
    return res.status(200).json({
      status: 'ok',
      message: 'Staff deleted successfully',
      data: result,
    });
  } catch (error) {
    return res.status(notFound ? 404 : 500).json({
      status: 'error',
      message: 'Failed to delete staff',
      detail: error.message,
    });
  }
};

const updateStaffStatus = async (req, res) => {
  try {
    const staffId = Number(req.params.staffId);
    if (!staffId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid staff ID' 
    });
    }

    const { status } = req.body;

    await staffManagementService.updateStaffStatus(staffId, status);
    return res.status(200).json({
      status: 'ok',
      message: 'Staff status updated successfully',
    });
  } catch (error) {
    return res.status(notFound ? 404 : 500).json({
      status: 'error',
      message: 'Failed to update staff status',
      detail: error.message,
    });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  updateStaffStatus,
};
