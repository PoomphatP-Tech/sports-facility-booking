const { pool } = require('../config/db');

const createReport = async ({ userId, facilityId, description }) => {
  const memberResult = await pool.query(
    `
      SELECT member_id
      FROM public.members
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!memberResult.rows[0]) {
    throw new Error('member profile not found');
  }

  const memberId = memberResult.rows[0].member_id;

  const result = await pool.query(
    `
      INSERT INTO public.equipment_reports (member_id, facility_id, description, status)
      VALUES ($1, $2, $3, 'noted')
      RETURNING report_id, member_id, facility_id, description, status, created_at
    `,
    [memberId, facilityId, description]
  );

  return result.rows[0];
};

const getMyReports = async ({ userId }) => {
  const result = await pool.query(
    `
      SELECT
        er.report_id,
        er.description,
        er.status,
        er.created_at,
        f.facility_id,
        f.name AS facility_name
      FROM public.equipment_reports er
      JOIN public.members m ON er.member_id = m.member_id
      LEFT JOIN public.facilities f ON er.facility_id = f.facility_id
      WHERE m.user_id = $1
      ORDER BY er.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

const getAllReports = async () => {
  const result = await pool.query(
    `
      SELECT
        er.report_id,
        er.description,
        er.status,
        er.created_at,
        f.facility_id,
        f.name AS facility_name,
        u.id AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        COALESCE(
          ARRAY_AGG(eiu.equipment_img_url ORDER BY eiu.created_at)
            FILTER (WHERE eiu.equipment_img_url IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) AS image_urls
      FROM public.equipment_reports er
      LEFT JOIN public.facilities f ON er.facility_id = f.facility_id
      LEFT JOIN public.members m ON er.member_id = m.member_id
      LEFT JOIN public.users u ON m.user_id = u.id
      LEFT JOIN public.equipment_image_urls eiu ON eiu.report_id = er.report_id
      GROUP BY er.report_id, er.description, er.status, er.created_at,
               f.facility_id, f.name, u.id, u.email, u.first_name, u.last_name
      ORDER BY er.created_at DESC
    `
  );

  return result.rows;
};

const updateReportStatus = async ({ userId, reportId, status }) => {
  const allowedStatuses = ['noted', 'inProgress', 'resolved'];

  if (!allowedStatuses.includes(status)) {
    throw new Error('invalid status');
  }

  const staffResult = await pool.query(
    `
      SELECT staff_id
      FROM public.staff
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!staffResult.rows[0]) {
    throw new Error('staff profile not found');
  }

  const staffId = staffResult.rows[0].staff_id;

  const result = await pool.query(
    `
      UPDATE public.equipment_reports
      SET status = $1,
          staff_updated_id = $2
      WHERE report_id = $3
      RETURNING report_id, member_id, facility_id, description, status, staff_updated_id, created_at
    `,
    [status, staffId, reportId]
  );

  if (!result.rows[0]) {
    throw new Error('report not found');
  }

  return result.rows[0];
};

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
};