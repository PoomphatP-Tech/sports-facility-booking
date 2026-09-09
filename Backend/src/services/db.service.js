const { pool } = require('../config/db');

const getDatabaseTime = async () => {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0];
};

module.exports = {
  getDatabaseTime,
};
