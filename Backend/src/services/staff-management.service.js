const { pool } = require('../config/db');
const { auth } = require('../config/firebase');

const getAllStaff = async () => {
    const result = await pool.query(`
    SELECT
        s.staff_id,
        u.id AS user_id,
        u.email AS username,
        u.first_name AS name,
        u.account_status AS status,
        f.facility_id,
        f.name AS facility
    FROM public.staff s
    JOIN public.users u ON u.id = s.user_id
    LEFT JOIN public.staff_facilities sf ON sf.staff_id = s.staff_id
    LEFT JOIN public.facilities f ON f.facility_id = sf.facility_id
    ORDER BY s.staff_id ASC
    `);

    const staffMap = new Map();

    for (const row of result.rows) {
        if (!staffMap.has(row.staff_id)) {
            staffMap.set(row.staff_id, {
                staff_id: row.staff_id,
                user_id: row.user_id,
                username: row.username,
                name: row.name,
                status: row.status,
                facilities: [],
            });
        }

        if (row.facility_id) {
            staffMap.get(row.staff_id).facilities.push({
                facilityId: row.facility_id,
                facility: row.facility,
            });
        }
    }

    return Array.from(staffMap.values());
};

const createStaff = async ({ username, name, password, facilityIds = [] }) => {
    const firebaseUser = await auth.createUser({ email: username, password });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userResult = await client.query(
            `
        INSERT INTO public.users (email, firebase_uid, first_name, role)
        VALUES ($1, $2, $3, 'staff')
        RETURNING id
        `, [username, firebaseUser.uid, name]);

        const userId = userResult.rows[0].id;

        const staffResult = await client.query(
            `
        INSERT INTO public.staff (user_id)
        VALUES ($1)
        RETURNING staff_id
        `,[userId]);

        const staffId = staffResult.rows[0].staff_id;

        for (const facilityId of facilityIds) {
            await client.query(
                `
        INSERT INTO public.staff_facilities (staff_id, facility_id)
        VALUES ($1, $2)
        `,[staffId, facilityId]);
        }
        await client.query('COMMIT');
        return { staffId, userId };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateStaff = async (staffId, { username, name, password, facilityIds = [] }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const staffResult = await client.query(
            `SELECT user_id FROM public.staff WHERE staff_id = $1`,
            [staffId]
        );

        if (staffResult.rows.length === 0) {
            throw new Error('Staff not found');
        }

        const userId = staffResult.rows[0].user_id;

        if (password) {
            const { rows: userRows } = await client.query(
                `SELECT firebase_uid FROM public.users WHERE id = $1`, [userId]
            );
            if (userRows[0]?.firebase_uid) {
                await auth.updateUser(userRows[0].firebase_uid, { password });
            }
            await client.query(
                `UPDATE public.users SET email = $1, first_name = $2 WHERE id = $3`,
                [username, name, userId]
            );
        } else {
            await client.query(
                `UPDATE public.users SET email = $1, first_name = $2 WHERE id = $3`,
                [username, name, userId]
            );
        }

        // Delete and create new facility that staff handle
        await client.query(
            `DELETE FROM public.staff_facilities WHERE staff_id = $1`,
            [staffId]
        );

        for (const facilityId of facilityIds) {
            await client.query(
                `
            INSERT INTO public.staff_facilities (staff_id, facility_id)
            VALUES ($1, $2)
            `,[staffId, facilityId]);
        }

        await client.query('COMMIT');
        return { staffId };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteStaff = async (staffId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const staffResult = await client.query(
            `SELECT user_id FROM public.staff WHERE staff_id = $1`,
            [staffId]
        );

        if (staffResult.rows.length === 0) {
            throw new Error('Staff not found');
        }

        const userId = staffResult.rows[0].user_id;

        const { rows: userRows } = await client.query(
            `DELETE FROM public.users WHERE id = $1 RETURNING firebase_uid`, [userId]
        );

        await client.query('COMMIT');

        if (userRows[0]?.firebase_uid) {
            await auth.deleteUser(userRows[0].firebase_uid).catch(() => {});
        }

        return { staffId };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateStaffStatus = async (staffId, status) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const staffResult = await client.query(
            `SELECT user_id FROM public.staff WHERE staff_id = $1`,
            [staffId]
        );

        if (staffResult.rows.length === 0) {
            throw new Error('Staff not found');
        }

        const userId = staffResult.rows[0].user_id;

        await client.query(
            `UPDATE public.users SET account_status = $1 WHERE id = $2`,
            [status, userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getAllStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    updateStaffStatus,
};
