const { pool } = require('../config/db');

const getMemberIdByUserId = async (userId) => {
  const result = await pool.query(
    `
      SELECT member_id
      FROM public.members
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rows[0]) {
    throw new Error('member profile not found');
  }

  return result.rows[0].member_id;
};

const getPartners = async ({ userId }) => {
  const currentMemberId = await getMemberIdByUserId(userId);

  const result = await pool.query(
    `
      SELECT
        m.member_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        COALESCE(pps.sport, 'Not specified') AS sport,
        COALESCE(pps.skill_level, 'Not specified') AS skill_level,
        COALESCE(pp.availability, 'Not specified') AS availability,
        COALESCE(pp.preferred_time, 'Not specified') AS preferred_time,
        COALESCE(pp.bio, '') AS bio
      FROM public.partner_profiles pp
      JOIN public.members m
        ON pp.member_id = m.member_id
      JOIN public.users u
        ON m.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          sport,
          skill_level
        FROM public.partner_profile_sports
        WHERE partner_profile_id = pp.partner_profile_id
        ORDER BY partner_profile_sport_id ASC
        LIMIT 1
      ) pps ON true
      WHERE m.member_id <> $1
        AND u.role = 'member'
        AND u.account_status = 'active'
        AND u.firebase_uid IS NOT NULL
        AND m.member_status = 'active'
        AND pp.is_active = TRUE
      ORDER BY u.first_name ASC, u.last_name ASC
    `,
    [currentMemberId]
  );

  return result.rows;
};

const createMatchRequest = async ({ senderUserId, receiverMemberId }) => {
  const senderMemberId = await getMemberIdByUserId(senderUserId);

  const result = await pool.query(
    `
      INSERT INTO public.matching_requests
        (sender_id, receiver_id, status)
      VALUES
        ($1, $2, 'pending')
      RETURNING
        request_matching_id,
        sender_id,
        receiver_id,
        status,
        created_at
    `,
    [senderMemberId, receiverMemberId]
  );

  return result.rows[0];
};

const getIncomingRequests = async ({ userId }) => {
  const receiverMemberId = await getMemberIdByUserId(userId);

  const result = await pool.query(
    `
      SELECT
        mr.request_matching_id,
        mr.status,
        mr.created_at,
        sender.user_id AS sender_user_id,
        sender.member_id AS sender_member_id,
        u.first_name,
        u.last_name,
        u.email,
        mr.booking_request_id,
        br.request_status AS booking_request_status,
        TO_CHAR(bd.date, 'YYYY-MM-DD') AS booking_date,
        TO_CHAR(bd.start_time, 'HH24:MI') AS booking_start_time,
        TO_CHAR(bd.end_time, 'HH24:MI') AS booking_end_time,
        bd.intended_activity AS booking_intended_activity,
        f.name AS booking_facility_name
      FROM public.matching_requests mr
      JOIN public.members sender
        ON mr.sender_id = sender.member_id
      JOIN public.users u
        ON sender.user_id = u.id
      LEFT JOIN public.booking_requests br
        ON mr.booking_request_id = br.booking_request_id
      LEFT JOIN public.booking_details bd
        ON br.booking_detail_id = bd.booking_detail_id
      LEFT JOIN public.facilities f
        ON bd.facility_id = f.facility_id
      WHERE mr.receiver_id = $1
      ORDER BY mr.created_at DESC
    `,
    [receiverMemberId]
  );

  return result.rows;
};

const updateRequestStatus = async ({ userId, requestId, status }) => {
  const allowedStatuses = ['accepted', 'rejected'];

  if (!allowedStatuses.includes(status)) {
    throw new Error('invalid status');
  }

  const receiverMemberId = await getMemberIdByUserId(userId);

  const result = await pool.query(
    `
      UPDATE public.matching_requests
      SET status = $1
      WHERE request_matching_id = $2
        AND receiver_id = $3
      RETURNING
        request_matching_id,
        sender_id,
        receiver_id,
        status,
        created_at
    `,
    [status, requestId, receiverMemberId]
  );

  if (!result.rows[0]) {
    throw new Error('request not found');
  }

  return result.rows[0];
};

const getMyProfile = async ({ userId }) => {
  const memberId = await getMemberIdByUserId(userId);

  const profileResult = await pool.query(
    `SELECT partner_profile_id, bio, availability, preferred_time, is_active, created_at
     FROM public.partner_profiles
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  );

  if (!profileResult.rows[0]) {
    return null;
  }

  const profile = profileResult.rows[0];

  const sportResult = await pool.query(
    `SELECT sport, skill_level
     FROM public.partner_profile_sports
     WHERE partner_profile_id = $1
     ORDER BY partner_profile_sport_id ASC
     LIMIT 1`,
    [profile.partner_profile_id]
  );

  const sportRow = sportResult.rows[0] ?? null;

  return {
    partner_profile_id: profile.partner_profile_id,
    bio: profile.bio,
    availability: profile.availability,
    preferred_time: profile.preferred_time,
    is_active: profile.is_active,
    created_at: profile.created_at,
    sport: sportRow?.sport ?? null,
    skill_level: sportRow?.skill_level ?? null,
  };
};

const upsertMyProfile = async ({ userId, bio, sport, skillLevel, availability, preferredTime }) => {
  const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
  if (!sport || !sport.trim()) throw new Error('SPORT_REQUIRED');
  if (!validSkillLevels.includes(skillLevel)) throw new Error('INVALID_SKILL_LEVEL');
  if (!availability || !availability.trim()) throw new Error('AVAILABILITY_REQUIRED');
  if (!preferredTime || !preferredTime.trim()) throw new Error('PREFERRED_TIME_REQUIRED');

  const memberId = await getMemberIdByUserId(userId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `INSERT INTO public.partner_profiles (member_id, bio, availability, preferred_time, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (member_id) DO UPDATE
       SET bio = EXCLUDED.bio,
           availability = EXCLUDED.availability,
           preferred_time = EXCLUDED.preferred_time,
           is_active = TRUE
       RETURNING partner_profile_id, bio, availability, preferred_time, is_active, created_at`,
      [memberId, bio?.trim() || null, availability.trim(), preferredTime.trim()]
    );

    const profileId = profileResult.rows[0].partner_profile_id;

    await client.query(
      `DELETE FROM public.partner_profile_sports WHERE partner_profile_id = $1`,
      [profileId]
    );

    await client.query(
      `INSERT INTO public.partner_profile_sports (partner_profile_id, sport, skill_level)
       VALUES ($1, $2, $3)`,
      [profileId, sport.trim(), skillLevel]
    );

    await client.query('COMMIT');

    return {
      partner_profile_id: profileId,
      bio: profileResult.rows[0].bio,
      availability: profileResult.rows[0].availability,
      preferred_time: profileResult.rows[0].preferred_time,
      is_active: profileResult.rows[0].is_active,
      created_at: profileResult.rows[0].created_at,
      sport: sport.trim(),
      skill_level: skillLevel,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
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