const adminService = require('../services/admin.service');

const getAllAdmins = async (req, res) => {
  try {
    const admins = await adminService.getAllAdmins();
    return res.status(200).json({ data: admins });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const admin = await adminService.createAdmin({ email, password, firstName, lastName });
    return res.status(201).json({ data: admin });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { firstName, lastName, email } = req.body;
    const admin = await adminService.updateAdmin(adminId, { firstName, lastName, email });
    return res.status(200).json({ data: admin });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    await adminService.deleteAdmin(adminId);
    return res.status(200).json({ message: 'Admin deleted' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { getAllAdmins, createAdmin, updateAdmin, deleteAdmin };
