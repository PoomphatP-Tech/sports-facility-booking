const { pool } = require("../config/db");
const { hasFacilityBookings } = require("./booking.service");

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const getDayOfWeekLabel = (date) => DAY_NAMES[date.getDay()];

const getAvailableTime = async ({ facilityIds }) => {
  if (!facilityIds.length) return new Map();

  const result = await pool.query(
    `
      SELECT
        facility_id,
        day_of_week,
        TO_CHAR(MIN(start_time), 'HH24:MI') AS start_time,
        TO_CHAR(MAX(end_time), 'HH24:MI') AS end_time
      FROM public.facility_schedules
      WHERE facility_id = ANY($1::int[])
      GROUP BY facility_id, day_of_week
      ORDER BY facility_id, ARRAY_POSITION(ARRAY['sun','mon','tue','wed','thu','fri','sat'], day_of_week)
    `,
    [facilityIds],
  );

  const availableMap = new Map();

  for (const row of result.rows) {
    const current = availableMap.get(row.facility_id) || [];
    current.push({
      day: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
    });
    availableMap.set(row.facility_id, current);
  }

  return availableMap;
};

const getFacilityCards = async () => {
  const facilityResult = await pool.query(
    `
      SELECT
        facility_id,
        name,
        description,
        usage_guideline,
        image_url,
        max_people,
        max_duration_minutes,
        latitude,
        longitude
      FROM public.facilities
      ORDER BY facility_id ASC
    `,
  );

  const facilities = facilityResult.rows;
  const facilityIds = facilities.map((facility) => facility.facility_id);

  const today = new Date();
  const dayOfWeek = getDayOfWeekLabel(today);
  const allSchedulesByFacility = await getAvailableTime({ facilityIds });

  return facilities.map((facility) => {
    const allSchedules = allSchedulesByFacility.get(facility.facility_id) || [];
    const availableTime = allSchedules.find((s) => s.day === dayOfWeek) || null;
    const otherAvailableTimes = allSchedules.filter((s) => s.day !== dayOfWeek);

    return {
      facilityId: facility.facility_id,
      name: facility.name,
      description: facility.description,
      usageGuideline: facility.usage_guideline,
      imageUrl: facility.image_url ?? null,
      maxPeople: facility.max_people,
      maxDurationMinutes: facility.max_duration_minutes ?? null,
      availableTime,
      otherAvailableTimes,
      latitude: facility.latitude != null ? parseFloat(facility.latitude) : null,
      longitude: facility.longitude != null ? parseFloat(facility.longitude) : null,
    };
  });
};

const updateFacility = async (facilityId, data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      name,
      description,
      usageGuideline,
      imageUrl,
      maxPeople,
      maxDurationMinutes,
      schedules = [],
    } = data;
    const facilityResult = await client.query(
      `
      UPDATE public.facilities
      SET
        name = $1,
        description = $2,
        usage_guideline = $3,
        max_people = $4,
        image_url = $5,
        max_duration_minutes = $6
      WHERE facility_id = $7
      RETURNING *
      `,
      [
        name,
        description ?? null,
        usageGuideline ?? null,
        maxPeople,
        imageUrl ?? null,
        maxDurationMinutes ?? null,
        facilityId,
      ],
    );

    if (facilityResult.rows.length === 0) {
      throw new Error("Facility not found");
    }

    await client.query(
      `
      DELETE FROM public.facility_schedules
      WHERE facility_id = $1
      `,
      [facilityId],
    );

    for (const schedule of schedules) {
      await client.query(
        `
        INSERT INTO public.facility_schedules
          (facility_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        `,
        [facilityId, schedule.dayOfWeek, schedule.startTime, schedule.endTime],
      );
    }

    await client.query("COMMIT");

    return facilityResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteFacility = async (facilityId) => {
  const hasBookings = await hasFacilityBookings(facilityId);
  if (hasBookings) {
    const error = new Error("Cannot delete facility with active bookings");
    error.statusCode = 409;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      DELETE FROM public.facilities
      WHERE facility_id = $1
      RETURNING *
      `,
      [facilityId],
    );

    if (result.rows.length === 0) {
      throw new Error("Facility not found");
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const createFacility = async (data) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      name,
      description,
      usageGuideline,
      imageUrl,
      maxPeople,
      maxDurationMinutes,
      schedules = [],
    } = data;

    const facilityResult = await client.query(
      `
      INSERT INTO public.facilities
        (name, description, usage_guideline, image_url, max_people, max_duration_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        name,
        description ?? null,
        usageGuideline ?? null,
        imageUrl ?? null,
        maxPeople,
        maxDurationMinutes ?? null,
      ],
    );

    const facility = facilityResult.rows[0];

    for (const schedule of schedules) {
      await client.query(
        `
        INSERT INTO public.facility_schedules
          (facility_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        `,
        [
          facility.facility_id,
          schedule.dayOfWeek,
          schedule.startTime,
          schedule.endTime,
        ],
      );
    }

    await client.query("COMMIT");

    return facility;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAvailableTime,
  getFacilityCards,
  updateFacility,
  deleteFacility,
  createFacility,
};
