const { pool } = require('../config/db');
const userStore = require("../store/user.store");

const buildError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDate = (val) =>
  val ? String(val).split('T')[0] : null;

const buildFullProfile = async (user) => {
  const profile = {
    id: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    dateOfBirth: normalizeDate(user.dateOfBirth),
    address: user.address || null,
    role: user.role || 'member',
    accountStatus: user.accountStatus || null,
  };

  if (user.role === 'member') {
    const { rows } = await pool.query(
      `SELECT member_id, member_status,
              TO_CHAR(membership_start, 'YYYY-MM-DD') AS membership_start,
              TO_CHAR(membership_exp,   'YYYY-MM-DD') AS membership_exp,
              profile_img_url
       FROM public.members WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    if (rows[0]) {
      profile.memberId       = rows[0].member_id;
      profile.memberStatus   = rows[0].member_status;
      profile.membershipStart = rows[0].membership_start;
      profile.membershipExp  = rows[0].membership_exp;
      profile.profileImgUrl  = rows[0].profile_img_url;
    }
  }

  if (user.role === 'staff' || user.role === 'admin') {
    const { rows } = await pool.query(
      `SELECT staff_id FROM public.staff WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    if (rows[0]) {
      profile.staffId = rows[0].staff_id;
    }
  }

  return profile;
};

const getProfile = async ({ userId }) => {
  const user = await userStore.findById(userId);
  if (!user) {
    throw buildError("user not found", 404);
  }
  const profile = await buildFullProfile(user);
  return { user: profile };
};

const updateProfile = async ({ userId, firstName, lastName, dateOfBirth, address }) => {
  const user = await userStore.updateProfileById(userId, {
    firstName,
    lastName,
    dateOfBirth: dateOfBirth || null,
    address,
  });
  if (!user) {
    throw buildError("user not found", 404);
  }
  const profile = await buildFullProfile(user);
  return { user: profile };
};

module.exports = { getProfile, updateProfile };
