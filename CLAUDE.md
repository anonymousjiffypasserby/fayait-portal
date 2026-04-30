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
- Assets: GET /api/assets (returns flat DB records via LATERAL join — see field names below)
- HR: all calls via `hrApi` helper (src/pages/hr/shared.jsx), base path /api/hr/
- Reports: base path /api/reports/, supports ?format=csv and ?format=pdf on all endpoints
- Tickets: proxied through portal-api to Zammad; token passed via JWT payload

## Modules Built

### Assets (`src/pages/assets/`)
Full IT asset inventory and lifecycle management.
- Views: All / Deployed / Ready / Pending / Maintenance / Archived / Un-deployable / Lost-Stolen / Deleted / Requestable / Due for Audit / Due for Checkin / All Maintenance
- Display modes: table + card view; bulk selection with BulkBar
- Checkout / Checkin / Audit workflows
- Maintenance scheduling with cost tracking
- Asset files (upload/download docs per asset)
- Checkout history per asset
- Remote commands (RustDesk integration)
- Network discovery (approve / ignore discovered devices)
- CSV bulk import with validation
- QR code modal
- Real-time online/offline status via SSE
- Bulk operations: assign, relocate, status change

### Accessories / Components / Consumables / Kits (`src/pages/accessories|components|consumables|kits/`)
- Accessories: checkout/checkin workflow, history
- Components: install/uninstall to assets, asset mapping
- Consumables: usage tracking, low stock
- Kits: bundled checkout/checkin as single transaction
- All support CRUD + soft-delete (retire/restore)

### Requests (`src/pages/requests/`)
- Users submit asset requests
- Admin approval / denial workflow
- Request status tracking (pending → approved/denied)

### Projects (`src/pages/projects/`)
Native project and task management.
- Views: Board (kanban by status) / List / Calendar / My Tasks
- Tasks: status, priority, due dates, assignment, reorder, overdue alerts
- Comments: threaded discussion with @mentions, internal notes
- Attachments: upload/download per project and per task (auth-header download — no token in URL)
- Activity log per project
- Project follow/unfollow, signoff (admin)
- Department-scoped sidebar views
- **GDPR**: SAR Export (admin) — generates HTML report of a user's project assignments, tasks, comments (GDPR Art. 15)

### HR (`src/pages/hr/`)
Full employee lifecycle and payroll.

Employee self-service views: MyProfile, MySchedule, MyTimesheets, MyLeave, MyPayslips

Admin/manager views:
- Employees — staff directory, employee detail records
- Schedule Builder — weekly schedule creation and publishing
- Team Timesheets — submission review and approval
- Leave Requests — leave approval workflow
- Payroll Runs — payroll execution and payslip generation
- Job Functions, Shift Templates, Leave Types, Deductions — reference data maintenance

Role scoping: admin → all company data, manager → team + self, staff → self only

### Tickets (`src/pages/tickets/`)
Native helpdesk UI (backed by Zammad via portal-api proxy).
- Views: Board (kanban) / List / Reports
- List: search, multi-filter (state, priority, group, assigned, overdue, unassigned), sort, CSV export
- Board: kanban by status with drag-like status change
- Detail panel: articles (replies), tags (Categories), assignment, state/priority, SLA indicators
- New ticket form: customer, department, category, priority, attachment
- Pending reminder with due time
- GDPR controls per ticket: processing restriction (Art. 18), anonymize/redact (Art. 17)
- **SAR Export**: search by customer name → HTML report of all tickets + articles (GDPR Art. 15)
- Settings: default SLA priority, retention policy (documented config)
- Reports tab: SLA response/resolution, agent performance, CSAT

### Reports (`src/pages/reports/`)
25+ report endpoints across all modules, all support CSV + PDF export.
- **Assets**: Inventory, By Status/Location/Department/Category, Warranty Expiring, Audit Due, Checkout History, Never Checked In, Age Report
- **Financial**: Depreciation, Purchase Cost, Maintenance Costs
- **Monitoring**: Alert History, Offline History, Software Inventory, Pending Updates
- **Projects**: Overview, By Department, By User, Overdue, Activity
- **HR**: Payroll Summary, Hours Worked, Leave Balances, Leave Usage
- **Tickets**: Overview, By Priority/Group, Response Time SLA, Resolution Time SLA, Agent Performance, CSAT
- Custom report builder with flexible query

### Notifications (`src/pages/Notifications.jsx` + `src/components/NotificationBell.jsx`)
- Bell icon with unread badge, SSE real-time updates
- Full notifications page: filter by severity/type, mark read, dismiss, clear all
- Notification types: low stock, warranty expiring, asset offline, license expiring, audit due, update available, request submitted/reviewed, command events

### Users / People (`src/pages/users/`)
- Views: All Users / Active / Inactive / Invited / Department Heads / Admins
- Add user with provisioning cascade (Matrix, Snipe-IT, Zammad)
- Edit user, deactivate/reactivate, password reset, retry provisioning
- CSV bulk import with result modal
- Org chart view (hierarchical)
- Departments management
- Job Functions management
- Roles & Permissions matrix (role CRUD, assign/unassign per user)
- Per-user activity log

### Dashboard (`src/pages/Dashboard.jsx`)
Widgets: Asset Summary (donut), Online/Offline (SSE), Recent Activity, Categories Breakdown, Locations, People, Alerts, My Projects (with progress bars), HR summary (admin), Tickets counts. Service status display.

### Settings (`src/pages/settings/`)
Reference data tabs: Locations, Manufacturers, Models, Suppliers, Categories. All support CRUD + sync to Snipe-IT/Zammad on save.

### Admin (`src/pages/admin/`)
Faya IT internal panel (superadmin only). Company list, per-company service activation/deactivation (tickets, assets, projects, chat, grafana, files, status), company metadata, add company user.

### Billing / Status / ServiceFrame
- Billing: plan display, invoice list with download
- Status: uptime monitoring display
- ServiceFrame: iframe wrapper for Chat (Matrix), Analytics (Grafana), Files, Status page

### Profile (`src/pages/Profile.jsx`)
Display name, language (EN/NL), theme (light/dark), password change.

## Key Business Rules
- Services shown based on company_services status per company
- Locked services: admins see "contact Faya IT", regular users don't see locked services
- iframe services: Chat (Matrix), Analytics (Grafana)
- All other services have native UI built
- **Superadmin (Faya IT staff) has NO access to client data in portal.fayait.com**
  — Superadmin operates exclusively via admin.fayait.com
  — Portal routes must return 403 for superadmin role (fix pending — see Still To Do)

## Assets API Field Names
The assets API returns flat DB records (not Snipe-IT nested objects). Use:
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

## GDPR Compliance Status

### Done
- **Tickets**: SAR export (Art. 15), processing restriction (Art. 18), anonymize/redact (Art. 17), retention policy config
- **Projects**: SAR export (Art. 15), auth-header attachment downloads (no token in URL, Art. 32)
- **Users**: soft-delete (deactivate, not destroy), per-user audit log

### Pending (backend + frontend)
- Superadmin data access gate (portal-api middleware — blocks all company data reads for superadmin role)
- HR role-gate middleware (server-side enforcement of admin/manager/staff scoping)
- Projects anonymize cascade: when user deleted, scrub name from project/task/comment records (Art. 17)
- Activity log `performed_by_id`: currently stores only name — needs user ID so anonymization can scrub logs

## Business Model
The portal is a SaaS product sold to companies. Each module is for the client company's internal use. Faya IT is the provider — not a participant in client workflows. admin.fayait.com is for provisioning and billing only, never for viewing client data.

Superadmin accounts belong to Faya IT staff only and must not read or write any company's portal data.

## Automation Architecture

### n8n handles (keep these workflows):
- Uptime Kuma → Zammad ticket → Element/Matrix alerts
- Any future complex multi-step conditional workflows

### portal-api handles directly (no n8n):
- User provisioning (lib/provisioning.js)
- Master data sync (departments, locations, categories)
- All simple API calls to external services

Rule: simple data operations → portal-api direct; complex multi-step conditional → n8n

## Master Data Sync Architecture

`portal-api/src/lib/sync.js` is the single sync library, called by settings routes on any master data change.

- `syncDepartment(dept, action)` → Zammad organizations + Snipe-IT departments
- `syncLocation(location, action)` → Snipe-IT locations
- `syncCategory(category, action)` → Snipe-IT categories
- `syncManufacturer(manufacturer, action)` → Snipe-IT manufacturers
- `syncModel(model, action)` → Snipe-IT models

Sync rules: portal DB updated first; failures logged but never block portal; each settings table has `_sync_status` JSONB `{ zammad: ok|failed, snipe: ok|failed }`; failed syncs retried on next update of that record.

## SSO Architecture (Token Passthrough)

Single login acquires service tokens stored in JWT:
- Zammad: `POST /api/v1/user_access_tokens` with user credentials → `zammad_token`
- Snipe-IT: company-level `SNIPE_TOKEN` from env (per-company, not per-user) → `snipe_token`

All external API calls proxied through portal-api (avoids CORS, hides credentials from browser).
Future: replace with Authentik OAuth2/OIDC.

## Still To Do
- **Superadmin portal data access fix** — audit + gate middleware in portal-api (plan written)
- **HR API gate middleware** — server-side role scoping enforcement (partial: cancel leave + report column names fixed)
- **Projects anonymize cascade** — scrub deleted user's name from project/task/comment records (GDPR Art. 17)
- **Activity log `performed_by_id`** — store user ID alongside name so anonymization works on logs
- **RBAC custom roles** — UI for custom roles per company (tables exist: hr_roles, hr_role_permissions, hr_user_roles)
- **Dutch localization** — LangContext + t() helper in place, translations not yet populated
- **Onboarding flow** — first-login wizard for new companies
- **Licenses module** — software license tracking (not yet started)
- **Users module restructure** — merge Users page with HR People view (currently separate)
- **Asset file downloads** — still uses token-in-URL pattern (same fix applied to Projects needs doing here)
