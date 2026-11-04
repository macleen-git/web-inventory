# Admin dashboard database setup

The admin user directory and activity panel use MySQL through the Express API. **Aiven Cloud MySQL is the primary database** so the localhost app and deployed app can use the same records. Firebase Authentication remains the sign-in provider; the backend verifies Firebase ID tokens and reads roles from MySQL.

## 1. Configure the existing Aiven database

Do not create a second database. Use the existing Aiven MySQL service and the existing `defaultdb` database.

From the Aiven console, copy the service's connection details and download its CA certificate. Create `backend/.env` locally using `backend/.env.example` as the template, then set:

- `DB_HOST`: Aiven host
- `DB_PORT`: Aiven port
- `DB_USER`: Aiven username
- `DB_PASSWORD`: Aiven password
- `DB_NAME=defaultdb`
- `DB_SSL=true`
- `DB_SSL_CA=./certs/ca.pem`

Save the downloaded certificate as `backend/certs/ca.pem`. The backend resolves this path relative to its own folder. Never commit `backend/.env`, the CA certificate, or any database password.

For local testing, start the API from the backend folder so dotenv loads `backend/.env` and the CA path resolves correctly:

```bash
cd backend
npm install
npm run dev
```

Check `http://localhost:8080/api/health`. A successful response should report `status: "ok"` and `database: "connected"`.

## 2. Configure Firebase Admin on the backend

Create a Firebase service-account key for the same Firebase project used by the frontend. Store the complete JSON securely in the backend hosting provider's environment variables as `FIREBASE_SERVICE_ACCOUNT_JSON`. For local development, set the same variable in the ignored `backend/.env` file. The backend also supports `GOOGLE_APPLICATION_CREDENTIALS` when using a securely stored service-account file.

This credential is separate from the Aiven database password. Never commit the service-account JSON or paste its private key into source code or chat.

## 3. Run the MySQL migration once

Run `backend/sql/user_analytics.sql` against the existing Aiven `defaultdb` database. It creates:

- `app_users`: Firebase UID, display name, email, photo, MySQL role, account status, creation time, and last-seen time.
- `activity_logs`: authenticated user activity timestamps used by the realtime chart.

The migration adds the admin-dashboard tables; it does not replace the existing inventory tables or create another database.

## 4. Promote the intended administrator

After the intended admin account signs in once so `POST /api/auth/sync` creates its MySQL row, obtain its Firebase Authentication UID from Firebase Console. Run this statement in Aiven's SQL console or another trusted MySQL client, replacing the placeholder with the exact UID:

```sql
UPDATE app_users
SET role = 'admin'
WHERE firebase_uid = 'YOUR_FIREBASE_UID';
```

The sync endpoint intentionally never accepts a role from the browser and never overwrites an existing MySQL role. Do not promote a user by changing the browser or Firestore document.

## 5. Configure the deployed backend

Set the same Aiven connection values, CA certificate (using the hosting provider's supported secret/file mechanism), and `FIREBASE_SERVICE_ACCOUNT_JSON` in the backend hosting provider's environment. Do not commit any of these values. The deployed frontend must use the deployed API URL.

## 6. Admin dashboard endpoints

The frontend admin page calls:

- `POST /api/auth/sync`
- `POST /api/activity/heartbeat`
- `GET /api/admin/users`
- `GET /api/admin/overview?period=day|week|month`

The dashboard shows actual MySQL records after the migration, backend environment configuration, and first sign-in syncs. Activity bars begin filling as signed-in clients send their minute heartbeat.

## Important

This configures the application to use the existing Aiven database. It does not connect to Aiven automatically until the private values and CA certificate are placed in the local/deployed backend environment and verified with `/api/health`.

This update adds the database-backed user directory and analytics read APIs. It does not yet add an admin role-editing API or a complete superadmin approval workflow. Existing inventory CRUD endpoints are unchanged and are not made authenticated by this change.
