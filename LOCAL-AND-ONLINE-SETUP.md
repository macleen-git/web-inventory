# Local and Online Environment Setup

The application uses the same Firebase Authentication project and the same Express API code in both environments. The database is selected by the backend environment variables, so local and online records remain separate.

## Local development

1. Start Apache and MySQL in XAMPP.
2. Confirm the local database exists: `hardware_inventory_local`.
3. Copy `backend/.env.local.example` to `backend/.env`.
4. Configure Firebase Admin credentials in `backend/.env`. Use the service account for the same Firebase project used by the frontend. Keep credentials private and never commit them.
5. Copy `hardware-react/.env.local.example` to `hardware-react/.env.local`.
6. In a terminal, start the backend from the `backend` directory with `npm install` (first run) and `npm start`.
7. In another terminal, start the frontend from `hardware-react` with `npm install` (first run) and `npm run dev`.
8. Open the Vite local address, normally `http://localhost:5173`.

The local backend connects to `hardware_inventory_local`. Firebase sign-in is still used. When a user signs in, `/api/auth/sync` creates or updates that user's row in the local `app_users` table. Inventory data is stored in the local MySQL database.

## Online deployment

Keep the existing Netlify and Render environment variables unchanged. Render continues to use its existing online MySQL connection and Firebase Admin credentials. Netlify continues to use its existing Render API URL.

## Separation and safety

- Local API: `http://localhost:8080`.
- Local database: `hardware_inventory_local`.
- Online API/database: existing Render and online MySQL configuration.
- Do not copy online database credentials into the local environment file.
- Do not point Render at XAMPP or expose XAMPP/MySQL to the public internet.
- Do not commit `.env`, Firebase service-account JSON, or private keys.
- The same Firebase identity can exist in both databases, but each database has its own `app_users`, products, transactions, settings, and activity logs.
- There is no automatic synchronization between local and online database records.

## Important

The backend already selects its MySQL connection using `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optional SSL variables. The frontend already selects the API using `VITE_API_URL` and sends the Firebase ID token. Separate environment files are therefore sufficient; no separate local username/password login is needed.
