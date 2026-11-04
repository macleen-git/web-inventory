# Admin dashboard database setup

The admin user directory and activity panel use MySQL through the Express API. Firebase Authentication remains the sign-in provider; the backend verifies Firebase ID tokens and reads roles from MySQL.

## 1. Install backend dependencies

From the backend folder, run:

```bash
npm install
```

This installs `firebase-admin` along with the existing API dependencies.

## 2. Configure Firebase Admin on the backend

Create a Firebase service-account key for the same Firebase project used by the frontend. Store the JSON securely in the backend hosting provider's environment variables as `FIREBASE_SERVICE_ACCOUNT_JSON` (the complete JSON value). Never commit the service-account file or paste its private key into source code.

For local development, set the same environment variable in the ignored `backend/.env` file. The backend also supports `GOOGLE_APPLICATION_CREDENTIALS` when using a securely stored service-account file.

## 3. Run the MySQL migration

Run `backend/sql/user_analytics.sql` once against the same MySQL/Aiven database configured for the API. It creates:

- `app_users`: Firebase UID, display name, email, photo, MySQL role, account status, creation time, and last-seen time.
- `activity_logs`: authenticated user activity timestamps used by the realtime chart.

Do not create a second database. Use the existing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` settings.

## 4. Promote the intended administrator

After that account signs in once so `/api/auth/sync` creates its MySQL row, obtain its Firebase Authentication UID from Firebase Console. Run this statement in the database, replacing the placeholder with the exact UID:

```sql
UPDATE app_users
SET role = 'admin'
WHERE firebase_uid = 'YOUR_FIREBASE_UID';
```

The sync endpoint intentionally never accepts a role from the browser and never overwrites an existing MySQL role. Do not promote a user by changing the browser or Firestore document.

## 5. Deploy the backend and frontend branch

Deploy the backend with the new environment variable and installed dependencies, then deploy the frontend from `feature/mysql-database-foundation`. The frontend admin page calls:

- `POST /api/auth/sync`
- `POST /api/activity/heartbeat`
- `GET /api/admin/users`
- `GET /api/admin/overview?period=day|week|month`

The dashboard will show actual MySQL records after the migration, backend deployment, and first sign-in syncs. Activity bars begin filling as signed-in clients send their minute heartbeat.

## Important

This update adds the database-backed user directory and analytics read APIs. It does not yet add an admin role-editing API or a complete superadmin approval workflow. Existing inventory CRUD endpoints are unchanged and are not made authenticated by this change.
