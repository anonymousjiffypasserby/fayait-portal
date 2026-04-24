# Faya IT — Portal Frontend (portal.fayait.com)

## Stack
- React + Vite
- Deployed via Coolify → GitHub push to `main` triggers auto-deploy
- Traefik reverse proxy (10-15s to pick up new container after deploy)

## Deploy
- Portal (portal.fayait.com): `git push origin main` (this repo)
- API (api.fayait.com): `git push origin master` (portal-api repo)
- Admin (admin.fayait.com): `git push origin master` (admin-portal repo)
- Coolify auto-deploys on push → Traefik picks up new container in 10–15s

## API
- Base URL: https://api.fayait.com
- Auth: JWT via POST /api/auth/login
- Assets: GET /api/assets (returns full asset list with latest checkin via LATERAL join)
- HR: all calls via `hrApi` helper (src/pages/hr/shared.jsx), base path /api/hr/
- Reports: base path /api/reports/, supports ?format=csv and ?format=pdf on all endpoints

## Modules Built
- **Assets** — device inventory, RustDesk remote access, live monitoring, checkin agent
- **HR** — employees, scheduling, shift swaps, timesheets (clock-in/out), leave requests,
  leave balances, payroll runs, payslips, performance goals, reviews, documents
- **Projects** — native kanban / list / calendar, tasks, attachments, comments, followers
- **Reports** — 25+ endpoints across assets, financials, monitoring, HR, projects
- **Notifications** — bell icon, SSE stream, 9 automated cron jobs (warranty, audit, leave,
  schedule, contract expiry, document expiry, review due, project due/overdue)
- **People / Users** — invite flow, provisioning cascade (Matrix, Snipe-IT, Zammad),
  org chart, HR profile fields, job functions
- **Tickets** — Zammad iframe (native UI pending)

## Key Business Rules
- Services shown based on company_services status per company
- Locked services: admins see "contact Faya IT", regular users don't see locked services
- iframe services: Chat (Matrix), Analytics (Grafana)
- Custom UI services: Assets (built), HR (built), Projects (built), Reports (built),
  Tickets (pending native), People (built)
- **Superadmin (Faya IT staff) has NO access to client data in portal.fayait.com**
  — Superadmin operates exclusively via admin.fayait.com
  — Portal routes must return 403 for superadmin role (fix pending — see Still To Do)

## Assets API Field Names
The assets API returns flat DB records (not Snipe-IT nested objects). Component must use:
- `asset.hostname` (not `asset.name`)
- `asset.model` string (not `asset.model?.name`)
- `asset.assigned_user` string (not `asset.assigned_to?.name`)
- `asset.rustdesk_id` (not `asset.custom_fields?.rustdesk_id?.value`)
- `asset.asset_type` (not `asset.category?.name`)
- `asset.online` boolean (not `asset.status?.name`)
- Test user: John / Acme Corp (subdomain: acme)
- Test device: DESKTOP-6HSJ452 (Lenovo, i5-1235U, 16GB)

## HR Module Notes
- All HR API calls go through `hrApi` in `src/pages/hr/shared.jsx`
- Route definitions (method + path) are centralised there — not scattered across pages
- Role scoping: admin → all company data, manager → team + self, staff → self only
- `GET /api/hr/employees/me` must be registered before `/:id` in the API router
- Reports hit `/api/reports/hr/*` (not `/api/hr/*`) via `fetchReport` in `src/pages/reports/shared.js`

## Business Model
The portal is a SaaS product sold to companies.
Each module (Assets, Projects, Tickets, People, HR etc.)
is for the CLIENT COMPANY to use internally.
Faya IT is the provider — not a participant in
client workflows. The admin panel (admin.fayait.com)
is for provisioning and billing only, not for
viewing client data.

Superadmin accounts belong to Faya IT staff only
and must not be able to read or write any
company's portal data.

## Still To Do
- Superadmin portal data access fix (plan written — audit + gate middleware in portal-api)
- HR API gaps fix (partial: cancel leave + report column names fixed; gate middleware pending)
- RBAC — custom roles per company (hr_roles, hr_role_permissions, hr_user_roles tables exist)
- Dutch localization
- Onboarding flow (first-login wizard)
- Licenses module
- Users module restructure (merge with HR People view)
