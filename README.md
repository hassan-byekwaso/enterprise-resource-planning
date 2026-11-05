# ERP System

A full-stack ERP starter using React, Express, PostgreSQL, Prisma, JWT, and role-based access control.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL

## Getting started

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters.
2. Install dependencies with `npm install`.
3. Generate the Prisma client and create the database schema with `npm run db:generate` and `npm run db:migrate`.
4. Configure the `BOOTSTRAP_ADMIN_*` values in `.env`, then run `npm run db:seed` to create or update the bootstrap Super Admin. Re-running the seed resets that account's name and password to those configured values.
5. Start the API and React app with `npm run dev`.

The client runs at `http://localhost:5173`; the API runs at `http://localhost:3000`.

For local setup, copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then replace the server placeholders with your local database URL and a unique JWT secret. The client currency defaults to Ugandan Shillings (`UGX`, `en-UG`); set `VITE_CURRENCY` and `VITE_LOCALE` in `client/.env` to match your organization. Restart Vite after changing client environment values.

## Authentication and access control

- `POST /api/auth/register` creates an Employee account; clients cannot choose a role.
- `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` manage the signed-in session.
- The short-lived JWT is stored in an HTTP-only, same-site cookie and is never exposed to client JavaScript.
- `GET /api/users` and `POST /api/users` require the `SUPER_ADMIN` role. User creation through this route can assign roles.
- Mutating requests must come from the configured `CLIENT_ORIGIN`; configure that value to the exact deployed frontend origin.
- Passwords are hashed with bcrypt. Login and registration have rate limits.
- Protected requests re-check the account’s active status and role in PostgreSQL so disabling an account or changing its role takes effect immediately.

## Inventory

Inventory schema changes are managed through Prisma migrations. For example, apply the initial inventory models with:

```powershell
npm.cmd run db:migrate --workspace server -- --name add_inventory_models
```

The inventory API (`/api/categories`, `/api/products`, and `/api/stock-movements`) requires an active cookie session with the `SUPER_ADMIN`, `MANAGER`, or `INVENTORY_MANAGER` role. It supports category listing/creation, product listing/creation/editing/deletion, low-stock filtering (`GET /api/products/low-stock` or `GET /api/products?lowStock=true`), and the latest 100 stock movements.

Initial product quantities are recorded as stock-in movements. Stock movement quantities for `IN` and `OUT` are positive; an `ADJUSTMENT` quantity is a signed delta. Stock cannot fall below zero, and products with movement history cannot be deleted so the audit trail is preserved. Low stock means `stockQuantity <= minStockLevel`.

Before deploying, use HTTPS, set a strong unique `JWT_SECRET`, configure the exact frontend origin, and add operational logging, monitoring, backups, and migrations to your deployment process.

## Production build

From the repository root, install from the lockfile, generate the Prisma client, and build both workspaces:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run build
```

In production, apply committed migrations with `npx.cmd prisma migrate deploy` from the `server` workspace directory, serve the server with `npm.cmd run start --workspace server`, and host the built `client/dist` directory behind the same-origin API proxy or an equivalent production routing setup. Do not copy example secrets into production.
