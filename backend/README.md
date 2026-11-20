# Hardware Inventory Backend Setup

The Express API can connect to either the local MySQL/MariaDB service supplied by XAMPP or an Aiven Cloud MySQL service. Choose one database target in `backend/.env`.

## 1. Install backend dependencies

From the repository root:

```bash
cd backend
npm install
```

## 2. Create the backend environment file

Copy `.env.example` to `.env` inside the `backend` folder. Keep `.env` private; it is ignored by Git.

## Option A: XAMPP local database

1. Open XAMPP Control Panel and start **MySQL**. Apache is only needed if you want to use phpMyAdmin.
2. Open `http://localhost/phpmyadmin`.
3. Import `database/schema.sql` to create the `hardware_inventory_v2` database and its tables.
4. Use the local settings in `backend/.env`:

```env
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hardware_inventory_v2
DB_SSL=false
```

If you configured a password for the XAMPP database user, put it in `DB_PASSWORD`.

## Option B: Aiven Cloud MySQL

1. In the Aiven Console, open your MySQL service and copy its **host**, **port**, **user**, and **password** from the connection information. Also check the database name shown by Aiven; do not assume it is `hardware_inventory_v2`.
2. Download the service's **CA certificate** from the Aiven connection information.
3. Create `backend/certs` and save the downloaded certificate as `backend/certs/ca.pem`. The `certs/` folder and `.pem` files are ignored by Git.
4. Set `backend/.env` to the Aiven values:

```env
PORT=8080
DB_HOST=your-aiven-host
DB_PORT=your-aiven-port
DB_USER=your-aiven-username
DB_PASSWORD=your-aiven-password
DB_NAME=your-aiven-database-name
DB_SSL=true
DB_SSL_CA=./certs/ca.pem
```

5. Ensure the Aiven service is running and its network access settings allow connections from the machine running this API.
6. Run the SQL in `database/schema.sql` against the Aiven service to create the database and tables. If your Aiven plan or account does not allow creating a database, create/use a database that it provides and set `DB_NAME` to that exact database name; run the table definitions in that database without the `CREATE DATABASE` and `USE hardware_inventory_v2` statements.

**Never commit `backend/.env`, Aiven passwords, or CA/private credential files.** Only the placeholder `.env.example` belongs in GitHub.

## 3. Start and verify the API

From the `backend` folder:

```bash
npm run dev
```

When the database connection succeeds, the terminal reports that the Hardware Inventory API is running and the database is connected. Check the health endpoint in a browser:

```text
http://localhost:8080/api/health
```

Expected response:

```json
{"status":"ok","database":"connected"}
```

The React app should use `VITE_API_URL=http://localhost:8080` in its own `hardware-react/.env` for local development.
