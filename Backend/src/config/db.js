const pg = require('pg');
pg.types.setTypeParser(1082, (val) => val);

const { Pool } = require('pg');

const sslConfig =
  process.env.DB_SSL === 'true'
    ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    }
    : false;

const buildPoolConfig = () => {
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslConfig,
  };
};

const pool = new Pool(buildPoolConfig());

const initDb = async () => {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      date_of_birth DATE,
      address TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE
  `);

  await pool.query(`
    ALTER TABLE public.users
    ALTER COLUMN password_hash DROP NOT NULL
  `);

  await pool.query(`
    ALTER TABLE public.users
    ALTER COLUMN first_name DROP NOT NULL,
    ALTER COLUMN last_name DROP NOT NULL,
    ALTER COLUMN date_of_birth DROP NOT NULL,
    ALTER COLUMN address DROP NOT NULL
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  `);

  await pool.query(`
    ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_account_status_check,
    DROP CONSTRAINT IF EXISTS users_role_check
  `);

  await pool.query(`
    ALTER TABLE public.users
    ADD CONSTRAINT users_account_status_check CHECK (account_status IN ('active', 'suspended', 'cancelled')),
    ADD CONSTRAINT users_role_check CHECK (role IN ('member', 'staff', 'admin'))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.pending_registrations (
      registration_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      firebase_uid TEXT UNIQUE,
      otp TEXT NOT NULL,
      otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE public.pending_registrations
    ALTER COLUMN password_hash DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.pending_password_resets (
      reset_request_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.members (
      member_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
      profile_img_url VARCHAR(255),
      member_status TEXT NOT NULL DEFAULT 'active',
      membership_start DATE,
      membership_exp DATE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT members_member_status_check CHECK (member_status IN ('active', 'expired'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.staff (
      staff_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.member_skills (
      member_skill_id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
      sport VARCHAR(100) NOT NULL,
      skill_level TEXT NOT NULL,
      CONSTRAINT member_skills_skill_level_check CHECK (skill_level IN ('beginner', 'intermediate', 'advanced'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.member_sport_preferences (
      member_sport_preference_id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
      sport_preferred VARCHAR(100) NOT NULL
    )
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS public.partner_profiles (
    partner_profile_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL UNIQUE REFERENCES public.members(member_id) ON DELETE CASCADE,
    bio TEXT,
    availability TEXT,
    preferred_time TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS public.partner_profile_sports (
    partner_profile_sport_id SERIAL PRIMARY KEY,
    partner_profile_id INTEGER NOT NULL REFERENCES public.partner_profiles(partner_profile_id) ON DELETE CASCADE,
    sport VARCHAR(100) NOT NULL,
    skill_level TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT partner_profile_sports_skill_level_check
      CHECK (skill_level IN ('beginner', 'intermediate', 'advanced'))
  )
`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.facilities (
      facility_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      usage_guideline TEXT,
      max_people INTEGER NOT NULL DEFAULT 1 CHECK (max_people > 0),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS max_people INTEGER NOT NULL DEFAULT 1
  `);

  await pool.query(`
    ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS image_url TEXT
  `);

  await pool.query(`
    ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS max_duration_minutes INTEGER
  `);

  await pool.query(`
    ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7)
  `);

  // Seed map coordinates for any facility that doesn't have them yet.
  // Coordinates are spread around the University of Southampton Jubilee Sports Centre
  // (approx. 50.9346, -1.3947) as realistic placeholder positions.
  await pool.query(`
    UPDATE public.facilities
    SET
      latitude  = 50.9346 + ((facility_id % 5) - 2) * 0.0004,
      longitude = -1.3947 + ((facility_id % 3) - 1) * 0.0006
    WHERE latitude IS NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.facility_schedules (
      schedule_id SERIAL PRIMARY KEY,
      facility_id INTEGER NOT NULL REFERENCES public.facilities(facility_id) ON DELETE CASCADE,
      day_of_week TEXT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      CONSTRAINT facility_schedules_day_of_week_check CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))
    )
  `);

  await pool.query(`
    ALTER TABLE public.facility_schedules
    DROP COLUMN IF EXISTS slot_duration
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.facility_slot_times (
      slot_time_id SERIAL PRIMARY KEY,
      facility_id INTEGER NOT NULL REFERENCES public.facilities(facility_id) ON DELETE CASCADE,
      slot_date DATE NOT NULL,
      slot_start_time TIME NOT NULL,
      slot_end_time TIME NOT NULL,
      is_booking BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT facility_slot_times_time_check CHECK (slot_start_time < slot_end_time),
      CONSTRAINT facility_slot_times_unique_slot UNIQUE (facility_id, slot_date, slot_start_time, slot_end_time)
    )
  `);

  await pool.query(`
    ALTER TABLE public.facility_slot_times
    ADD COLUMN IF NOT EXISTS slot_date DATE NOT NULL DEFAULT CURRENT_DATE
  `);

  // Backfill schema for existing databases before is_booking was introduced.
  await pool.query(`
    ALTER TABLE public.facility_slot_times
    ADD COLUMN IF NOT EXISTS is_booking BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`
    ALTER TABLE public.facility_slot_times
    DROP CONSTRAINT IF EXISTS facility_slot_times_unique_slot
  `);

  await pool.query(`
    ALTER TABLE public.facility_slot_times
    ADD CONSTRAINT facility_slot_times_unique_slot UNIQUE (facility_id, slot_date, slot_start_time, slot_end_time)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.staff_facilities (
      staff_facility_id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
      facility_id INTEGER NOT NULL REFERENCES public.facilities(facility_id) ON DELETE CASCADE,
      UNIQUE (staff_id, facility_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.booking_details (
      booking_detail_id SERIAL PRIMARY KEY,
      request_id INTEGER,
      facility_id INTEGER REFERENCES public.facilities(facility_id) ON DELETE SET NULL,
      alt_facility_id VARCHAR(255),
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      intended_activity TEXT,
      member_id INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES public.staff(staff_id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.booking_requests (
      booking_request_id SERIAL PRIMARY KEY,
      booking_detail_id INTEGER NOT NULL REFERENCES public.booking_details(booking_detail_id) ON DELETE CASCADE,
      request_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT booking_requests_request_status_check CHECK (request_status IN ('pending', 'approved', 'rejected', 'cancelled', 'alt_suggested'))
    )
  `);

  await pool.query(`
    ALTER TABLE public.booking_requests
    DROP CONSTRAINT IF EXISTS booking_requests_request_status_check
  `);

  await pool.query(`
    ALTER TABLE public.booking_requests
    ADD CONSTRAINT booking_requests_request_status_check
    CHECK (request_status IN ('pending', 'approved', 'rejected', 'cancelled', 'alt_suggested'))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.bookings (
      booking_id SERIAL PRIMARY KEY,
      booking_detail_id INTEGER NOT NULL REFERENCES public.booking_details(booking_detail_id) ON DELETE CASCADE,
      booking_status TEXT NOT NULL DEFAULT 'upcoming',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT bookings_booking_status_check CHECK (booking_status IN ('upcoming', 'completed', 'cancelled'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.matching_requests (
     request_matching_id SERIAL PRIMARY KEY,
     sender_id INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
     receiver_id INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
     booking_id INTEGER REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
     CONSTRAINT matching_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected'))
   )
  `);
  await pool.query(`
  ALTER TABLE public.matching_requests
  ALTER COLUMN status SET DEFAULT 'pending'
`);

  await pool.query(`
  ALTER TABLE public.matching_requests
  DROP CONSTRAINT IF EXISTS matching_requests_status_check
`);

  await pool.query(`
  ALTER TABLE public.matching_requests
  ADD CONSTRAINT matching_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected'))
`);

  await pool.query(`
  ALTER TABLE public.matching_requests
  ADD COLUMN IF NOT EXISTS booking_request_id INTEGER
    REFERENCES public.booking_requests(booking_request_id) ON DELETE CASCADE
`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.equipment_reports (
      report_id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
      facility_id INTEGER REFERENCES public.facilities(facility_id) ON DELETE SET NULL,
      staff_updated_id INTEGER REFERENCES public.staff(staff_id) ON DELETE SET NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'noted',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT equipment_reports_status_check CHECK (status IN ('noted', 'inProgress', 'resolved'))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.equipment_image_urls (
      equipment_img_url_id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES public.equipment_reports(report_id) ON DELETE CASCADE,
      equipment_img_url VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.notification_histories (
      notif_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      sending_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      type VARCHAR(100)
    )
  `);
};

module.exports = {
  pool,
  initDb,
};