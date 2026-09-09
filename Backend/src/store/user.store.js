const { pool } = require('../config/db');

const USER_SELECT =
  'id, firebase_uid, email, password_hash, first_name, last_name, date_of_birth, address, role, account_status';

const mapUser = (row) => ({
  id: String(row.id),
  firebaseUid: row.firebase_uid,
  email: row.email,
  passwordHash: row.password_hash,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: row.date_of_birth,
  address: row.address,
  role: row.role,
  accountStatus: row.account_status,
});

const toNullableTrimmedText = (value) =>
  value === null || value === undefined ? null : String(value).trim();

const create = async ({
  firebaseUid = null,
  email,
  passwordHash = null,
  firstName,
  lastName,
  dateOfBirth,
  address,
  role = 'member',
}) => {
  const { rows } = await pool.query(
    `
      INSERT INTO public.users (
        firebase_uid,
        email,
        password_hash,
        first_name,
        last_name,
        date_of_birth,
        address,
        role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${USER_SELECT}
    `,
    [
      firebaseUid,
      email.trim().toLowerCase(),
      passwordHash,
      toNullableTrimmedText(firstName),
      toNullableTrimmedText(lastName),
      dateOfBirth ?? null,
      toNullableTrimmedText(address),
      role,
    ],
  );

  return mapUser(rows[0]);
};

const findByEmail = async (email) => {
  if (!email) return null;

  const { rows } = await pool.query(
    `SELECT ${USER_SELECT} FROM public.users WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()],
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

const findByFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  const { rows } = await pool.query(
    `SELECT ${USER_SELECT} FROM public.users WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid],
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${USER_SELECT} FROM public.users WHERE id = $1 LIMIT 1`,
    [id],
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

const updateProfileById = async (
  id,
  { firstName, lastName, dateOfBirth, address },
) => {
  const { rows } = await pool.query(
    `
      UPDATE public.users
      SET first_name = $2,
          last_name = $3,
          date_of_birth = $4,
          address = $5
      WHERE id = $1
      RETURNING ${USER_SELECT}
    `,
    [
      id,
      toNullableTrimmedText(firstName),
      toNullableTrimmedText(lastName),
      dateOfBirth,
      toNullableTrimmedText(address),
    ],
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

const createMember = async (userId) => {
  const { rows } = await pool.query(
    `INSERT INTO public.members (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING *`,
    [userId]
  );
  return rows[0] ?? null;
};

const reset = async () => {
  await pool.query(
    'TRUNCATE TABLE public.users RESTART IDENTITY CASCADE',
  );
};

module.exports = {
  create,
  createMember,
  findByEmail,
  findByFirebaseUid,
  findById,
  updateProfileById,
  reset,
};