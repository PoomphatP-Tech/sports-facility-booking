# Sports Facility Booking

A web app for booking sports facilities and managing facility operations, developed as a **group coursework project**.

## Features

- Browse facilities, check availability, and manage bookings.
- Manage facilities, opening hours, and staff accounts.
- Find sports partners and send or respond to matching requests.
- Report equipment issues and track their status.
- Sign in through Firebase, with dedicated member, staff, and admin interfaces.

## Tech Stack

- **Frontend:** React, TypeScript, Bootstrap
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Authentication:** Firebase Authentication

## Getting Started

Requires Node.js 22.12+, npm, PostgreSQL, and a Firebase project.

Create a PostgreSQL database and configure the application using the settings below.

<details>
<summary>Environment and Firebase setup</summary>

Add your database and Firebase service account credentials to `Backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_facility_booking
DB_USER=your_database_user
DB_PASSWORD=your_database_password
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

In Firebase Authentication, enable Email/Password and Google sign-in, and add `localhost` to the authorised domains. Update `Frontend/app/config/firebase.ts` to use the same Firebase project.

Create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_IMGBB_API_KEY=your_imgbb_api_key
```

The imgbb key is needed for facility image uploads. For admin access, set `ROOT_ADMIN_EMAIL` and `KNOWN_ROOT_ADMIN_UID` in `Backend/src/services/admin.service.js` to an existing Firebase user.

</details>

From the project root, install dependencies and start each service in a separate terminal.

**Backend**

```bash
npm --prefix Backend ci
npm --prefix Backend run dev
```

**Frontend**

```bash
npm --prefix Frontend ci
npm --prefix Frontend run dev
```

Open the URL shown by Vite. The backend runs at `http://localhost:5000` and creates the database tables on startup. Add facilities through the admin interface before testing bookings.
