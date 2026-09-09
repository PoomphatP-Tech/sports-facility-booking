const { pool } = require('../config/db');

/**
 * Retrieve the available time slots for a specific venue in the next N days
 * @param {number} facilityId - ID
 * @param {number} daysAhead - 7
 * @returns {Array} slotDate, startTime, endTime, available
 */
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const getDayOfWeek = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const padTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getAvailableSlots = async (facilityId, date) => {
    const facilityResult = await pool.query(
        `SELECT facility_id, name, max_people, max_duration_minutes, usage_guideline
         FROM public.facilities WHERE facility_id = $1`,
        [facilityId]
    );
    if (facilityResult.rows.length === 0) throw new Error('FACILITY_NOT_FOUND');
    const facility = facilityResult.rows[0];

    const dayOfWeek = getDayOfWeek(date);

    const [scheduleResult, allSchedulesResult] = await Promise.all([
        pool.query(
            `SELECT TO_CHAR(start_time, 'HH24:MI') AS start_time, TO_CHAR(end_time, 'HH24:MI') AS end_time
             FROM public.facility_schedules WHERE facility_id = $1 AND day_of_week = $2`,
            [facilityId, dayOfWeek]
        ),
        pool.query(
            `SELECT day_of_week, TO_CHAR(start_time, 'HH24:MI') AS start_time, TO_CHAR(end_time, 'HH24:MI') AS end_time
             FROM public.facility_schedules WHERE facility_id = $1
             ORDER BY ARRAY_POSITION(ARRAY['sun','mon','tue','wed','thu','fri','sat'], day_of_week)`,
            [facilityId]
        ),
    ]);

    const schedules = allSchedulesResult.rows.map((r) => ({
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        endTime: r.end_time,
    }));

    const base = {
        facilityId: facility.facility_id,
        facilityName: facility.name,
        maxPeople: facility.max_people,
        maxDurationMinutes: facility.max_duration_minutes ?? null,
        usageGuideline: facility.usage_guideline ?? null,
        schedules,
        date,
    };

    if (scheduleResult.rows.length === 0) {
        return { ...base, slots: [] };
    }

    const { start_time, end_time } = scheduleResult.rows[0];
    const startMin = toMinutes(start_time);
    const endMin = toMinutes(end_time);

    const slotTimes = [];
    for (let t = startMin; t + 60 <= endMin; t += 60) {
        slotTimes.push({ startTime: padTime(t), endTime: padTime(t + 60) });
    }

    // Get all bookings for the day to calculate per-slot occupancy using overlap
    const bookingsResult = await pool.query(
        `SELECT TO_CHAR(bd.start_time, 'HH24:MI') AS start_time, TO_CHAR(bd.end_time, 'HH24:MI') AS end_time
         FROM public.bookings b
                  JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
         WHERE bd.facility_id = $1 AND bd.date = $2 AND b.booking_status = 'upcoming'`,
        [facilityId, date]
    );

    const bookings = bookingsResult.rows;

    const slots = slotTimes.map(({ startTime, endTime }) => {
        const occupied = bookings.filter(
            (b) => b.start_time < endTime && b.end_time > startTime
        ).length;
        return { startTime, endTime, occupied, available: occupied < facility.max_people };
    });

    return { ...base, slots };
};

/**
 * Member submits a reservation request
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.facilityId
 * @param {string} params.slotDate
 * @param {string} params.startTime
 * @param {string} params.endTime
 * @param {string} params.intendedActivity
 * @returns {Object}
 */
const submitBookingRequest = async ({ userId, facilityId, slotDate, startTime, endTime, intendedActivity, partnerMemberId }) => {
    const memberResult = await pool.query(
        `SELECT member_id FROM public.members WHERE user_id = $1`, [userId]
    );
    if (memberResult.rows.length === 0) throw new Error('MEMBER_NOT_FOUND');
    const memberId = memberResult.rows[0].member_id;

    if (partnerMemberId != null) {
        const partnerIdInt = parseInt(partnerMemberId, 10);
        if (partnerIdInt === memberId) {
            throw new Error('CANNOT_MATCH_SELF');
        }
        const partnerResult = await pool.query(
            `SELECT member_id FROM public.members WHERE member_id = $1`,
            [partnerIdInt]
        );
        if (partnerResult.rows.length === 0) {
            throw new Error('PARTNER_NOT_FOUND');
        }
    }


    const facilityResult = await pool.query(
        `SELECT facility_id, max_people, max_duration_minutes FROM public.facilities WHERE facility_id = $1`,
        [facilityId]
    );
    if (facilityResult.rows.length === 0) throw new Error('FACILITY_NOT_FOUND');
    const facility = facilityResult.rows[0];

    if (startTime >= endTime) throw new Error('INVALID_TIME_RANGE');

    const todayLocal = new Date();
    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    if (slotDate < todayStr) throw new Error('DATE_IN_PAST');

    // Validate against facility schedule
    const dayOfWeek = getDayOfWeek(slotDate);
    const scheduleResult = await pool.query(
        `SELECT TO_CHAR(start_time, 'HH24:MI') AS start_time, TO_CHAR(end_time, 'HH24:MI') AS end_time
         FROM public.facility_schedules WHERE facility_id = $1 AND day_of_week = $2`,
        [facilityId, dayOfWeek]
    );
    if (scheduleResult.rows.length === 0) throw new Error('FACILITY_CLOSED_ON_DAY');
    const schedule = scheduleResult.rows[0];
    if (startTime < schedule.start_time || endTime > schedule.end_time) throw new Error('OUTSIDE_SCHEDULE');

    // Check max_duration_minutes
    if (facility.max_duration_minutes) {
        const duration = toMinutes(endTime) - toMinutes(startTime);
        if (duration > facility.max_duration_minutes) throw new Error('EXCEEDS_MAX_DURATION');
    }

    // Check capacity for every 1-hour slot in the requested range
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    for (let t = startMin; t < endMin; t += 60) {
        const slotStart = padTime(t);
        const slotEnd = padTime(t + 60);
        const { rows } = await pool.query(
            `SELECT COUNT(*) AS cnt FROM public.bookings b
                                             JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
             WHERE bd.facility_id = $1 AND bd.date = $2
               AND bd.start_time < $4 AND bd.end_time > $3
               AND b.booking_status = 'upcoming'`,
            [facilityId, slotDate, slotStart, slotEnd]
        );
        if (parseInt(rows[0].cnt, 10) >= facility.max_people) throw new Error('CAPACITY_EXCEEDED');
    }

    // Duplicate check
    const duplicateResult = await pool.query(
        `SELECT br.booking_request_id FROM public.booking_requests br
                                               JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
         WHERE bd.member_id = $1 AND bd.facility_id = $2 AND bd.date = $3
           AND bd.start_time = $4 AND bd.end_time = $5 AND br.request_status = 'pending'`,
        [memberId, facilityId, slotDate, startTime, endTime]
    );
    if (duplicateResult.rows.length > 0) throw new Error('DUPLICATE_REQUEST');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const detailResult = await client.query(
            `INSERT INTO public.booking_details
               (facility_id, date, start_time, end_time, intended_activity, member_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING booking_detail_id`,
            [facilityId, slotDate, startTime, endTime, intendedActivity || null, memberId]
        );
        const bookingDetailId = detailResult.rows[0].booking_detail_id;

        const requestResult = await client.query(
            `INSERT INTO public.booking_requests (booking_detail_id, request_status)
             VALUES ($1, 'pending')
             RETURNING booking_request_id, request_status, created_at`,
            [bookingDetailId]
        );
        const bookingRequest = requestResult.rows[0];
        const bookingRequestId = bookingRequest.booking_request_id;

        let matchingRequestId = null;
        if (partnerMemberId != null) {
            const matchResult = await client.query(
                `INSERT INTO public.matching_requests
                   (sender_id, receiver_id, booking_request_id, status)
                 VALUES ($1, $2, $3, 'pending')
                 RETURNING request_matching_id`,
                [memberId, parseInt(partnerMemberId, 10), bookingRequestId]
            );
            matchingRequestId = matchResult.rows[0].request_matching_id;
        }

        await client.query('COMMIT');

        return {
            bookingRequestId,
            bookingDetailId,
            status: bookingRequest.request_status,
            createdAt: bookingRequest.created_at,
            partnerMatchingCreated: partnerMemberId != null,
            ...(matchingRequestId != null && { matchingRequestId }),
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Retrieve all pending reservation requests for the venues managed by a specific staff member
 * @param {string} userId - user_id
 * @returns {Array} List of pending approval requests
 */
const getPendingRequestsForStaff = async (userId) => {
    // 1. user staff_id
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;

    // 2. Retrieve all pending requests for the venues managed by this staff member
    const result = await pool.query(
        `
            SELECT
                br.booking_request_id,
                br.request_status,
                br.created_at,
                bd.booking_detail_id,
                bd.facility_id,
                f.name AS facility_name,
                bd.date,
                TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
                TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
                bd.intended_activity,
                bd.member_id,
                u.first_name AS member_first_name,
                u.last_name AS member_last_name,
                u.email AS member_email
            FROM public.booking_requests br
                     JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
                     JOIN public.staff_facilities sf ON sf.facility_id = bd.facility_id
                     JOIN public.members m ON bd.member_id = m.member_id
                     JOIN public.users u ON m.user_id = u.id
            WHERE sf.staff_id = $1
              AND br.request_status = 'pending'
            ORDER BY br.created_at ASC
        `,
        [staffId]
    );

    return result.rows.map((row) => ({
        bookingRequestId: row.booking_request_id,
        bookingDetailId: row.booking_detail_id,
        requestStatus: row.request_status,
        createdAt: row.created_at,
        facility: {
            facilityId: row.facility_id,
            name: row.facility_name,
        },
        bookingDate: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        intendedActivity: row.intended_activity,
        member: {
            memberId: row.member_id,
            firstName: row.member_first_name,
            lastName: row.member_last_name,
            email: row.member_email,
        },
    }));
};

/**
 * Unified Conflict Detection Function
 * @param {number} bookingRequestId
 * @param {number} staffId - staff_id
 * @returns {Object} { errors: string[], requestDetail: Object }
 */
const checkBookingConflict = async (bookingRequestId, staffId) => {
    const errors = [];

    // 1. Query request details
    const detailResult = await pool.query(
        `
            SELECT
                br.booking_request_id,
                br.request_status,
                bd.booking_detail_id,
                bd.facility_id,
                bd.date,
                bd.start_time,
                bd.end_time,
                bd.intended_activity,
                bd.member_id,
                f.name AS facility_name,
                f.max_people,
                u.account_status AS member_account_status,
                u.first_name AS member_first_name,
                u.last_name AS member_last_name
            FROM public.booking_requests br
                     JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
                     JOIN public.members m ON bd.member_id = m.member_id
                     JOIN public.users u ON m.user_id = u.id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (detailResult.rows.length === 0) {
        errors.push('REQUEST_NOT_FOUND');
        return { errors, requestDetail: null };
    }

    const detail = detailResult.rows[0];

    // 2. must be pending
    if (detail.request_status !== 'pending') {
        errors.push('REQUEST_ALREADY_PROCESSED');
    }

    // 3. The employee must be in charge of this venue
    const staffFacilityResult = await pool.query(
        `SELECT staff_facility_id FROM public.staff_facilities
         WHERE staff_id = $1 AND facility_id = $2`,
        [staffId, detail.facility_id]
    );
    if (staffFacilityResult.rows.length === 0) {
        errors.push('STAFF_NOT_AUTHORIZED');
    }

    // 4. The member account must be active
    if (detail.member_account_status !== 'active') {
        errors.push('MEMBER_INACTIVE');
    }

    // 5. Time slot capacity check
    // new_start < existing_end AND new_end > existing_start
    const occupancyResult = await pool.query(
        `
            SELECT COUNT(*) AS occupied_count
            FROM public.bookings b
                     JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
            WHERE bd.facility_id = $1
              AND bd.date = $2
              AND bd.start_time < $4
              AND bd.end_time > $3
              AND b.booking_status = 'upcoming'
        `,
        [detail.facility_id, detail.date, detail.start_time, detail.end_time]
    );
    const occupied = parseInt(occupancyResult.rows[0].occupied_count, 10);
    if (occupied >= detail.max_people) {
        console.log("max_people:", detail.max_people, "occupied:", occupied);
        errors.push('CAPACITY_EXCEEDED');
    }

    return {
        errors,
        requestDetail: {
            bookingRequestId: detail.booking_request_id,
            bookingDetailId: detail.booking_detail_id,
            facilityId: detail.facility_id,
            facilityName: detail.facility_name,
            maxPeople: detail.max_people,
            date: detail.date,
            startTime: detail.start_time,
            endTime: detail.end_time,
            intendedActivity: detail.intended_activity,
            memberId: detail.member_id,
            memberFirstName: detail.member_first_name,
            memberLastName: detail.member_last_name,
            currentOccupied: occupied,
        },
    };
};

/**
 * Staff approves reservation request
 * @param {number} bookingRequestId
 * @param {string} userId - user_id
 * @returns {Object} result
 */
const approveRequest = async (bookingRequestId, userId) => {
    // 1. find staff_id
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;

    // 2. Conflict detection
    const { errors, requestDetail } = await checkBookingConflict(bookingRequestId, staffId);
    if (errors.length > 0) {
        const err = new Error('CONFLICT');
        err.conflicts = errors;
        err.detail = requestDetail;
        throw err;
    }

    // 3. update booking_requests.status = 'approved'
    await pool.query(
        `UPDATE public.booking_requests
         SET request_status = 'approved'
         WHERE booking_request_id = $1`,
        [bookingRequestId]
    );

    // 4. Insert a reservation into the bookings table(status = 'upcoming')
    await pool.query(
        `UPDATE public.booking_details
         SET staff_id = $2
         WHERE booking_detail_id = $1`,
        [requestDetail.bookingDetailId, staffId]
    );

    const bookingResult = await pool.query(
        `INSERT INTO public.bookings (booking_detail_id, booking_status)
         VALUES ($1, 'upcoming')
             RETURNING booking_id, booking_status, created_at`,
        [requestDetail.bookingDetailId]
    );

    // 5. Send a notification to the member
    const memberUserResult = await pool.query(
        `SELECT user_id FROM public.members WHERE member_id = $1`,
        [requestDetail.memberId]
    );
    if (memberUserResult.rows.length > 0) {
        const memberUserId = memberUserResult.rows[0].user_id;
        await pool.query(
            `INSERT INTO public.notification_histories (user_id, message, type)
             VALUES ($1, $2, 'booking_approved')`,
            [
                memberUserId,
                `Your booking for ${requestDetail.facilityName} on ${requestDetail.date} (${requestDetail.startTime}-${requestDetail.endTime}) has been approved.`,
            ]
        );
    }

    return {
        bookingRequestId,
        bookingId: bookingResult.rows[0].booking_id,
        bookingStatus: bookingResult.rows[0].booking_status,
        message: `Booking approved for ${requestDetail.facilityName}`,
    };
};

/**
 * Staff rejects reservation request
 * @param {number} bookingRequestId
 * @param {string} userId - user_id
 * @param {string} reason - reason
 * @returns {Object} result
 */
const rejectRequest = async (bookingRequestId, userId, reason) => {
    // 1. find staff_id
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;

    // 2. details
    const detailResult = await pool.query(
        `
            SELECT
                br.booking_request_id,
                br.request_status,
                bd.booking_detail_id,
                bd.facility_id,
                bd.date,
                bd.start_time,
                bd.end_time,
                bd.member_id,
                f.name AS facility_name
            FROM public.booking_requests br
                     JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (detailResult.rows.length === 0) {
        throw new Error('REQUEST_NOT_FOUND');
    }
    const detail = detailResult.rows[0];

    if (detail.request_status !== 'pending') {
        throw new Error('REQUEST_ALREADY_PROCESSED');
    }

    // 3. Verify that the employee is responsible for this facility
    const sfResult = await pool.query(
        `SELECT staff_facility_id FROM public.staff_facilities
         WHERE staff_id = $1 AND facility_id = $2`,
        [staffId, detail.facility_id]
    );
    if (sfResult.rows.length === 0) {
        throw new Error('STAFF_NOT_AUTHORIZED');
    }

    // 4. update rejected
    await pool.query(
        `UPDATE public.booking_requests
         SET request_status = 'rejected'
         WHERE booking_request_id = $1`,
        [bookingRequestId]
    );

    // 5. record the staff
    await pool.query(
        `UPDATE public.booking_details
         SET staff_id = $2
         WHERE booking_detail_id = $1`,
        [detail.booking_detail_id, staffId]
    );

    // 6. Send a notification to the member
    const memberUserResult = await pool.query(
        `SELECT user_id FROM public.members WHERE member_id = $1`,
        [detail.member_id]
    );
    if (memberUserResult.rows.length > 0) {
        const memberUserId = memberUserResult.rows[0].user_id;
        const rejectMessage = reason
            ? `Your booking for ${detail.facility_name} on ${detail.date} has been rejected. Reason: ${reason}`
            : `Your booking for ${detail.facility_name} on ${detail.date} has been rejected.`;
        await pool.query(
            `INSERT INTO public.notification_histories (user_id, message, type)
             VALUES ($1, $2, 'booking_rejected')`,
            [memberUserId, rejectMessage]
        );
    }

    return {
        bookingRequestId,
        message: `Booking rejected for ${detail.facility_name}`,
    };
};

/**
 * Retrieve all reservations for a specific member
 * @param {string} userId
 * @returns {Object} { upcoming: [], history: [], pendingRequests: [] }
 */
const getMyBookings = async (userId) => {
    // 1. find member_id
    const memberResult = await pool.query(
        `SELECT member_id FROM public.members WHERE user_id = $1`,
        [userId]
    );
    if (memberResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND');
    }
    const memberId = memberResult.rows[0].member_id;

    // 2. search all pending booking
    const pendingResult = await pool.query(
        `
            SELECT
                br.booking_request_id,
                br.request_status,
                br.created_at,
                bd.facility_id,
                f.name AS facility_name,
                TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
      TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
      TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
      bd.intended_activity,
      bd.alt_facility_id,
      af.name AS alt_facility_name
            FROM public.booking_requests br
                JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
                LEFT JOIN public.facilities af ON af.facility_id = CAST(NULLIF(bd.alt_facility_id, '') AS INTEGER)
            WHERE bd.member_id = $1
              AND br.request_status IN ('pending', 'alt_suggested')
            ORDER BY bd.date ASC, bd.start_time ASC
        `,
        [memberId]
    );

    // 3. All booking(upcoming + completed + cancelled)
    const bookingsResult = await pool.query(
        `
            SELECT
                b.booking_id,
                b.booking_status,
                b.created_at,
                br.booking_request_id,
                bd.facility_id,
                f.name AS facility_name,
                bd.date,
                TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
                TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
                bd.intended_activity
            FROM public.bookings b
                     JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
                     LEFT JOIN public.booking_requests br ON br.booking_detail_id = bd.booking_detail_id
            WHERE bd.member_id = $1
            ORDER BY bd.date DESC, bd.start_time DESC
        `,
        [memberId]
    );

    // 4. rejected booking
    const rejectedResult = await pool.query(
        `
            SELECT
                br.booking_request_id,
                br.request_status,
                br.created_at,
                bd.facility_id,
                f.name AS facility_name,
                bd.date,
                TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
                TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
                bd.intended_activity
            FROM public.booking_requests br
                     JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE bd.member_id = $1
              AND br.request_status IN ('rejected', 'cancelled')
            ORDER BY br.created_at DESC
        `,
        [memberId]
    );

    const upcoming = [];
    const history = [];

    for (const row of bookingsResult.rows) {
        const item = {
            bookingId: row.booking_id,
            bookingRequestId: row.booking_request_id,
            bookingStatus: row.booking_status,
            createdAt: row.created_at,
            facilityId: row.facility_id,
            facilityName: row.facility_name,
            bookingDate: row.date,
            startTime: row.start_time,
            endTime: row.end_time,
            intendedActivity: row.intended_activity,
        };

        if (row.booking_status === 'upcoming') {
            upcoming.push(item);
        } else {
            history.push(item);
        }
    }

    const pendingRequests = pendingResult.rows.map((row) => ({
        bookingRequestId: row.booking_request_id,
        requestStatus: row.request_status,
        createdAt: row.created_at,
        facilityId: row.facility_id,
        facilityName: row.facility_name,
        bookingDate: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        intendedActivity: row.intended_activity,
        altFacilityId: row.alt_facility_id || null,
        altFacilityName: row.alt_facility_name || null,
    }));

    const rejected = rejectedResult.rows.map((row) => ({
        bookingRequestId: row.booking_request_id,
        requestStatus: row.request_status,
        createdAt: row.created_at,
        facilityId: row.facility_id,
        facilityName: row.facility_name,
        bookingDate: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        intendedActivity: row.intended_activity,
    }));

    return { upcoming, history, pendingRequests, rejected };
};

/**
 * Member cancels booking
 * @param {number} bookingId
 * @param {string} userId
 */
const cancelBooking = async (bookingId, userId) => {
    // 1. find member_id
    const memberResult = await pool.query(
        `SELECT member_id FROM public.members WHERE user_id = $1`,
        [userId]
    );
    if (memberResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND');
    }
    const memberId = memberResult.rows[0].member_id;

    // 2. is upcoming?
    const bookingResult = await pool.query(
        `
            SELECT b.booking_id, b.booking_status, bd.member_id,
                   bd.facility_id, f.name AS facility_name,
                   bd.date, TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
                   TO_CHAR(bd.end_time, 'HH24:MI') AS end_time
            FROM public.bookings b
                     JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
                     JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE b.booking_id = $1
        `,
        [bookingId]
    );

    if (bookingResult.rows.length === 0) {
        throw new Error('BOOKING_NOT_FOUND');
    }

    const booking = bookingResult.rows[0];

    if (booking.member_id !== memberId) {
        throw new Error('NOT_YOUR_BOOKING');
    }

    if (booking.booking_status !== 'upcoming') {
        throw new Error('CANNOT_CANCEL');
    }

    // 3. update cancelled
    await pool.query(
        `UPDATE public.bookings SET booking_status = 'cancelled' WHERE booking_id = $1`,
        [bookingId]
    );

    // 4. notification
    await pool.query(
        `INSERT INTO public.notification_histories (user_id, message, type)
         VALUES ($1, $2, 'booking_cancelled')`,
        [
            userId,
            `You have cancelled your booking for ${booking.facility_name} on ${booking.date} (${booking.start_time}-${booking.end_time}).`,
        ]
    );

    return {
        bookingId,
        message: `Booking cancelled for ${booking.facility_name}`,
    };
};

/**
 * Retrieve the notification list for a specific user
 * @param {string} userId
 * @returns {Array}
 */
const getNotifications = async (userId) => {
    const result = await pool.query(
        `
            SELECT notif_id, message, is_read, type, sending_at
            FROM public.notification_histories
            WHERE user_id = $1
            ORDER BY sending_at DESC
                LIMIT 50
        `,
        [userId]
    );

    return result.rows.map((row) => ({
        notifId: row.notif_id,
        message: row.message,
        isRead: row.is_read,
        type: row.type,
        sendingAt: row.sending_at,
    }));
};

/**
 * Mark notification as read
 * @param {number} notifId
 * @param {string} userId
 */
const markNotificationRead = async (notifId, userId) => {
    await pool.query(
        `UPDATE public.notification_histories
         SET is_read = TRUE
         WHERE notif_id = $1 AND user_id = $2`,
        [notifId, userId]
    );
    return { notifId, isRead: true };
};

/**
 * Mark all notifications as read
 * @param {string} userId
 */
const markAllNotificationsRead = async (userId) => {
    await pool.query(
        `UPDATE public.notification_histories
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
    );
    return { message: 'all notifications marked as read' };
};

/**
 * Retrieve all upcoming reservations for the venues managed by a specific staff
 * @param {string} userId
 * @returns {Array}
 */
const getUpcomingBookingsForStaff = async (userId) => {
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;

    const result = await pool.query(
        `
            SELECT
                b.booking_id,
                b.booking_status,
                b.created_at,
                bd.facility_id,
                f.name AS facility_name,
                TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
      TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
      TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
      bd.intended_activity,
      bd.member_id,
      u.first_name AS member_first_name,
      u.last_name AS member_last_name,
      u.email AS member_email
            FROM public.bookings b
                JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
                JOIN public.staff_facilities sf ON sf.facility_id = bd.facility_id
                JOIN public.members m ON bd.member_id = m.member_id
                JOIN public.users u ON m.user_id = u.id
            WHERE sf.staff_id = $1
              AND b.booking_status = 'upcoming'
            ORDER BY bd.date ASC, bd.start_time ASC
        `,
        [staffId]
    );

    return result.rows.map((row) => ({
        bookingId: row.booking_id,
        bookingStatus: row.booking_status,
        createdAt: row.created_at,
        facility: {
            facilityId: row.facility_id,
            name: row.facility_name,
        },
        bookingDate: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        intendedActivity: row.intended_activity,
        member: {
            memberId: row.member_id,
            firstName: row.member_first_name,
            lastName: row.member_last_name,
            email: row.member_email,
        },
    }));
};

/**
 * The staff mark completed
 * @param {number} bookingId
 * @param {string} userId
 */
const completeBooking = async (bookingId, userId) => {
    // 1. find staff_id
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;

    // 2.booking details
    const bookingResult = await pool.query(
        `
            SELECT b.booking_id, b.booking_status, bd.facility_id,
                   f.name AS facility_name, bd.member_id,
                   TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
           TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
           TO_CHAR(bd.end_time, 'HH24:MI') AS end_time
            FROM public.bookings b
                JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE b.booking_id = $1
        `,
        [bookingId]
    );

    if (bookingResult.rows.length === 0) {
        throw new Error('BOOKING_NOT_FOUND');
    }

    const booking = bookingResult.rows[0];

    // 3. check upcoming
    if (booking.booking_status !== 'upcoming') {
        throw new Error('BOOKING_NOT_UPCOMING');
    }

    // 4. Verify that the employee is in charge of this facility
    const sfResult = await pool.query(
        `SELECT staff_facility_id FROM public.staff_facilities
         WHERE staff_id = $1 AND facility_id = $2`,
        [staffId, booking.facility_id]
    );
    if (sfResult.rows.length === 0) {
        throw new Error('STAFF_NOT_AUTHORIZED');
    }

    // 5. update completed
    await pool.query(
        `UPDATE public.bookings SET booking_status = 'completed' WHERE booking_id = $1`,
        [bookingId]
    );

    // 6. notification
    const memberUserResult = await pool.query(
        `SELECT user_id FROM public.members WHERE member_id = $1`,
        [booking.member_id]
    );
    if (memberUserResult.rows.length > 0) {
        await pool.query(
            `INSERT INTO public.notification_histories (user_id, message, type)
             VALUES ($1, $2, 'booking_completed')`,
            [
                memberUserResult.rows[0].user_id,
                `Your session at ${booking.facility_name} on ${booking.date} (${booking.start_time}-${booking.end_time}) has been marked as completed.`,
            ]
        );
    }

    return {
        bookingId,
        message: `Booking completed for ${booking.facility_name}`,
    };
};

/**
 * Member withdraws a pending reservation request
 * @param {number} bookingRequestId
 * @param {string} userId
 */
const cancelPendingRequest = async (bookingRequestId, userId) => {
    const memberResult = await pool.query(
        `SELECT member_id FROM public.members WHERE user_id = $1`,
        [userId]
    );
    if (memberResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND');
    }
    const memberId = memberResult.rows[0].member_id;

    const requestResult = await pool.query(
        `
            SELECT br.booking_request_id, br.request_status, bd.member_id,
                   bd.facility_id, f.name AS facility_name,
                   TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
           TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
           TO_CHAR(bd.end_time, 'HH24:MI') AS end_time
            FROM public.booking_requests br
                JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (requestResult.rows.length === 0) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const request = requestResult.rows[0];

    if (request.member_id !== memberId) {
        throw new Error('NOT_YOUR_REQUEST');
    }

    if (request.request_status !== 'pending') {
        throw new Error('REQUEST_NOT_PENDING');
    }

    await pool.query(
        `UPDATE public.booking_requests SET request_status = 'cancelled' WHERE booking_request_id = $1`,
        [bookingRequestId]
    );

    return {
        bookingRequestId,
        message: `Request cancelled for ${request.facility_name} on ${request.date}`,
    };
};

/**
 * Search for available alternative facilities
 * @param {number} bookingRequestId
 * @param {string} userId
 * @returns {Array}
 */
const searchAlternativeFacilities = async (bookingRequestId, userId) => {
    // 1. find staff_id
    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }

    const requestResult = await pool.query(
        `
            SELECT br.booking_request_id, br.request_status,
                   bd.facility_id, bd.date, bd.start_time, bd.end_time
            FROM public.booking_requests br
                     JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (requestResult.rows.length === 0) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const request = requestResult.rows[0];

    if (request.request_status !== 'pending') {
        throw new Error('REQUEST_NOT_PENDING');
    }

    const alternativesResult = await pool.query(
        `
            SELECT
                f.facility_id,
                f.name,
                f.description,
                f.max_people,
                COALESCE(occupied.cnt, 0) AS occupied_count
            FROM public.facilities f
                     LEFT JOIN (
                SELECT bd.facility_id, COUNT(*) AS cnt
                FROM public.bookings b
                         JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
                WHERE bd.date = $1
                  AND bd.start_time < $3
                  AND bd.end_time > $2
                  AND b.booking_status = 'upcoming'
                GROUP BY bd.facility_id
            ) occupied ON occupied.facility_id = f.facility_id
            WHERE f.facility_id != $4
            ORDER BY f.name
        `,
        [request.date, request.start_time, request.end_time, request.facility_id]
    );

    return alternativesResult.rows
        .filter((row) => parseInt(row.occupied_count, 10) < row.max_people)
        .map((row) => ({
            facilityId: row.facility_id,
            name: row.name,
            description: row.description,
            maxPeople: row.max_people,
            occupiedCount: parseInt(row.occupied_count, 10),
            spotsLeft: row.max_people - parseInt(row.occupied_count, 10),
        }));
};

/**
 * Staff Suggested Alternative Facilities
 * @param {number} bookingRequestId
 * @param {number} altFacilityId
 * @param {string} userId
 */
const suggestAlternative = async (bookingRequestId, altFacilityId, userId) => {

    const staffResult = await pool.query(
        `SELECT staff_id FROM public.staff WHERE user_id = $1`,
        [userId]
    );
    if (staffResult.rows.length === 0) {
        throw new Error('STAFF_NOT_FOUND');
    }
    const staffId = staffResult.rows[0].staff_id;


    const requestResult = await pool.query(
        `
            SELECT br.booking_request_id, br.request_status,
                   bd.booking_detail_id, bd.facility_id, bd.member_id,
                   TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
           TO_CHAR(bd.start_time, 'HH24:MI') AS start_time,
           TO_CHAR(bd.end_time, 'HH24:MI') AS end_time,
           f.name AS original_facility_name
            FROM public.booking_requests br
                JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (requestResult.rows.length === 0) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const request = requestResult.rows[0];

    if (request.request_status !== 'pending') {
        throw new Error('REQUEST_NOT_PENDING');
    }

    // Verify staff permissions
    const sfResult = await pool.query(
        `SELECT staff_facility_id FROM public.staff_facilities
         WHERE staff_id = $1 AND facility_id = $2`,
        [staffId, request.facility_id]
    );
    if (sfResult.rows.length === 0) {
        throw new Error('STAFF_NOT_AUTHORIZED');
    }

    // exist?
    const altFacilityResult = await pool.query(
        `SELECT facility_id, name FROM public.facilities WHERE facility_id = $1`,
        [altFacilityId]
    );
    if (altFacilityResult.rows.length === 0) {
        throw new Error('ALT_FACILITY_NOT_FOUND');
    }
    const altFacilityName = altFacilityResult.rows[0].name;

    await pool.query(
        `UPDATE public.booking_details SET alt_facility_id = $2, staff_id = $3
         WHERE booking_detail_id = $1`,
        [request.booking_detail_id, String(altFacilityId), staffId]
    );

    await pool.query(
        `UPDATE public.booking_requests SET request_status = 'alt_suggested'
         WHERE booking_request_id = $1`,
        [bookingRequestId]
    );

    const memberUserResult = await pool.query(
        `SELECT user_id FROM public.members WHERE member_id = $1`,
        [request.member_id]
    );
    if (memberUserResult.rows.length > 0) {
        await pool.query(
            `INSERT INTO public.notification_histories (user_id, message, type)
             VALUES ($1, $2, 'alt_suggested')`,
            [
                memberUserResult.rows[0].user_id,
                `Staff suggested an alternative facility for your booking on ${request.date} (${request.start_time}-${request.end_time}): ${altFacilityName} instead of ${request.original_facility_name}. Please accept or decline.`,
            ]
        );
    }

    return {
        bookingRequestId,
        altFacilityId,
        altFacilityName,
        message: `Alternative suggested: ${altFacilityName}`,
    };
};

/**
 * Alternative Suggestions for Member Responses
 * @param {number} bookingRequestId
 * @param {string} userId
 * @param {boolean} accept
 */
const respondToAlternative = async (bookingRequestId, userId, accept) => {

    const memberResult = await pool.query(
        `SELECT member_id FROM public.members WHERE user_id = $1`,
        [userId]
    );
    if (memberResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND');
    }
    const memberId = memberResult.rows[0].member_id;


    const requestResult = await pool.query(
        `
            SELECT br.booking_request_id, br.request_status,
                   bd.booking_detail_id, bd.facility_id, bd.member_id,
                   bd.alt_facility_id,
                   TO_CHAR(bd.date, 'YYYY-MM-DD') AS date,
           bd.start_time, bd.end_time,
           f.name AS original_facility_name
            FROM public.booking_requests br
                JOIN public.booking_details bd ON br.booking_detail_id = bd.booking_detail_id
                JOIN public.facilities f ON bd.facility_id = f.facility_id
            WHERE br.booking_request_id = $1
        `,
        [bookingRequestId]
    );

    if (requestResult.rows.length === 0) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const request = requestResult.rows[0];

    if (request.member_id !== memberId) {
        throw new Error('NOT_YOUR_REQUEST');
    }

    if (request.request_status !== 'alt_suggested') {
        throw new Error('NO_ALTERNATIVE_PENDING');
    }

    if (!request.alt_facility_id) {
        throw new Error('NO_ALTERNATIVE_FACILITY');
    }

    const altFacilityId = parseInt(request.alt_facility_id, 10);

    if (!accept) {
        await pool.query(
            `UPDATE public.booking_requests SET request_status = 'rejected'
             WHERE booking_request_id = $1`,
            [bookingRequestId]
        );

        return { bookingRequestId, accepted: false, message: 'Alternative declined. Request closed.' };
    }

    const altFacilityResult = await pool.query(
        `SELECT facility_id, name, max_people FROM public.facilities WHERE facility_id = $1`,
        [altFacilityId]
    );

    if (altFacilityResult.rows.length === 0) {
        throw new Error('ALT_FACILITY_NOT_FOUND');
    }

    const altFacility = altFacilityResult.rows[0];

    // Check for conflicts again (alternative facilities may be fully booked during the waiting period)
    const occupancyResult = await pool.query(
        `
            SELECT COUNT(*) AS occupied_count
            FROM public.bookings b
                     JOIN public.booking_details bd ON b.booking_detail_id = bd.booking_detail_id
            WHERE bd.facility_id = $1
              AND bd.date = $2
              AND bd.start_time < $4
              AND bd.end_time > $3
              AND b.booking_status = 'upcoming'
        `,
        [altFacilityId, request.date, request.start_time, request.end_time]
    );

    const occupied = parseInt(occupancyResult.rows[0].occupied_count, 10);
    if (occupied >= altFacility.max_people) {
        throw new Error('ALT_FACILITY_FULL');
    }

    // approve
    await pool.query(
        `UPDATE public.booking_details SET facility_id = $2
         WHERE booking_detail_id = $1`,
        [request.booking_detail_id, altFacilityId]
    );

    await pool.query(
        `UPDATE public.booking_requests SET request_status = 'approved'
         WHERE booking_request_id = $1`,
        [bookingRequestId]
    );

    const bookingResult = await pool.query(
        `INSERT INTO public.bookings (booking_detail_id, booking_status)
         VALUES ($1, 'upcoming')
             RETURNING booking_id`,
        [request.booking_detail_id]
    );

    await pool.query(
        `INSERT INTO public.notification_histories (user_id, message, type)
         VALUES ($1, $2, 'booking_approved')`,
        [
            userId,
            `Your booking has been confirmed at ${altFacility.name} on ${request.date}. The alternative facility was accepted.`,
        ]
    );

    return {
        bookingRequestId,
        bookingId: bookingResult.rows[0].booking_id,
        accepted: true,
        altFacilityName: altFacility.name,
        message: `Alternative accepted. Booking confirmed at ${altFacility.name}.`,
    };
};

const hasFacilityBookings = async (facilityId) => {
    const { rows } = await pool.query(
        `SELECT 1 FROM public.booking_details bd
                           JOIN public.bookings b ON b.booking_detail_id = bd.booking_detail_id
         WHERE bd.facility_id = $1 AND b.booking_status = 'upcoming'
             LIMIT 1`,
        [facilityId]
    );
    return rows.length > 0;
};

module.exports = {
    hasFacilityBookings,
    getAvailableSlots,
    submitBookingRequest,
    getPendingRequestsForStaff,
    approveRequest,
    rejectRequest,
    getMyBookings,
    cancelBooking,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUpcomingBookingsForStaff,
    completeBooking,
    cancelPendingRequest,
    searchAlternativeFacilities,
    suggestAlternative,
    respondToAlternative,
};