const dbService = require('../services/db.service');

const pingDatabase = async (req, res) => {
  try {
    const row = await dbService.getDatabaseTime();
    return res.status(200).json({
      status: 'ok',
      databaseTime: row.now,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'database connection failed',
      detail: error.message,
    });
  }
};

module.exports = {
  pingDatabase,
};
