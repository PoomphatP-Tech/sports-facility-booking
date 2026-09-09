const equipmentReportService = require('../services/equipment-report.service');

const createReport = async (req, res) => {
  try {
    const { facilityId, description } = req.body;

    if (!facilityId || !description) {
      return res.status(400).json({
        message: 'facilityId and description are required',
      });
    }

    const report = await equipmentReportService.createReport({
      userId: req.user.id,
      facilityId,
      description,
    });

    return res.status(201).json({
      message: 'equipment report created',
      data: report,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'failed to create equipment report',
    });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await equipmentReportService.getMyReports({
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'my equipment reports fetched',
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'failed to get my reports',
    });
  }
};

const getAllReports = async (_req, res) => {
  try {
    const reports = await equipmentReportService.getAllReports();

    return res.status(200).json({
      message: 'all equipment reports fetched',
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'failed to get all reports',
    });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    const updated = await equipmentReportService.updateReportStatus({
      userId: req.user.id,
      reportId,
      status,
    });

    return res.status(200).json({
      message: 'equipment report status updated',
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'failed to update report status',
    });
  }
};

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
};