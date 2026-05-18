# Faya IT — Portal Frontend (per-client VPS template)

## Brand Guidelines

### Colors
| Token | Hex |
|---|---|
| Blue (primary) | `#0B3C5D` |
| Blue dark | `#082D45` |
| Blue mid | `#1A5A8A` |
| Blue light | `#2478B5` |
| Blue pale | `#D6E8F5` |
| Orange (primary) | `#FF7A00` |
| Orange dark | `#CC6200` |
| Orange light | `#FF9A3C` |
| Orange pale | `#FFF0E0` |

### Typography
- **Font**: Inter (Google Fonts) — weights 300, 400, 500, 600, 700
- **Import**: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`
- Body: 16px
- Subtitles: 18px (`text-lg`)
- Section titles: 30px / 36px on md+ (`text-3xl` / `text-4xl`)

Use these consistently across all Faya IT services (portal, admin, www, etc.).

## Design System (portal-specific)

The portal uses inline styles and a shared theme object — NOT Tailwind. CSS variables are defined in `src/index.css`:
```
--faya-orange: #E85D24
--faya-navy:   #1B2A4A
--faya-orange-light: #FDF0EA
--faya-gray:   #f4f5f7
```

The `T` (theme) object used across pages:
```js
const T = {
  navy: '#1a1f2e', bg: '#f0f2f5', card: '#fff',
  border: 'rgba(0,0,0,0.06)', muted: '#888',
  orange: '#f97316', blue: '#2563eb', green: '#1D9E75',
  red: '#e74c3c', yellow: '#d97706', purple: '#9b59b6',
  font: "'DM Sans', 'Helvetica Neue', sans-serif",
}
```

**UI patterns to follow for every new native module:**
- Cards: `background:#fff, border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:10, padding:'16px 20px'`
- Page header: navy title + muted subtitle, action buttons top-right
- Tables: full-width, `border-collapse:collapse`, row hover `#f8f9fa`
- Sidebar is dark navy (`#1B2A4A`), active item uses orange accent
- Empty states: centered icon + title + subtitle, no loud colors
- Loading: small spinner or skeleton rows, never full-page spinners
- Every module must use `T` constants — no random hex values inline

## Architecture Principles (read before building anything)

### No iframes — everything is native UI
Every backend service (Zammad, Nextcloud, Vaultwarden, Wiki.js, etc.) is an **engine only**.
Clients never see the backend service UI. The portal is the only frontend.
Portal-api proxies all calls to backend services using internal API tokens.

### How service URLs work
- `SERVICES_ENABLED` env var controls which modules appear in the sidebar
- `/api/companies/config` returns `serviceUrls` built from env vars — portal reads these
- Backend services are called by portal-api using `{SERVICE}_URL` env vars
- For iframe-free modules, the backend URL never reaches the browser

### Per-company deployment model
Same portal GitHub repo deployed to every client. Per-client env vars set in Coolify:
```
VITE_API_URL=https://api.{client}.fayait.com     # portal → portal-api
SERVICES_ENABLED=tickets,assets,hr,projects,...   # controls sidebar visibility
```
Portal-api env vars per client:
```
ZAMMAD_URL, ELEMENT_URL, NEXTCLOUD_URL, GRAFANA_URL, STATUS_URL   # public service URLs (returned in /api/config for any iframe fallbacks)
VAULTWARDEN_URL, WIKIJS_URL, PAPERLESS_URL, METABASE_URL, JITSI_URL, EXCALIDRAW_URL  # proxied by portal-api, never exposed to browser
COMPANY_SUBDOMAIN, SERVICES_ENABLED, JWT_SECRET
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
ZAMMAD_TOKEN, SNIPE_TOKEN, MATRIX_ADMIN_TOKEN, NEXTCLOUD_ADMIN_TOKEN
```

## Scope

This repo and its portal-api concern **client portal functionality only**.

**Out of scope — do not touch:**
- `www.fayait.com` — Faya IT marketing website
- `cms.fayait.com` — CMS backing www.fayait.com

These live in `website-api` (separate repo). Split is complete.

## Stack
- React + Vite
- Deployed via Coolify → GitHub push to `main` triggers auto-deploy on each client VPS
- Traefik reverse proxy (10-15s to pick up new container after deploy)

## Deploy

**Per-client VPS model (active transition):**
- Same GitHub repo (`main`) is used for all client portal deployments
- Each client VPS has its own Coolify deployment with different env vars
- `git push origin main` → Coolify auto-deploys to all client VPS portals simultaneously
- Set `VITE_API_URL=https://api.{client}.fayait.com` in Coolify per deployment

**Central Faya IT services (on Faya IT VPS):**
- API dev/test (api.fayait.com): `git push origin master` (portal-api repo)
- Admin (admin.fayait.com): `git push origin master` (admin-portal repo)
- Coolify auto-deploys on push → Traefik picks up new container in 10–15s

**Onboarding a new client (portal + API):**
1. Central Coolify → Add Server → paste client VPS SSH details
2. Create new Project for the client (copy from Acme project)
3. Add Application → portal (this repo) → domain: `{client}.fayait.com`
4. Add Application → portal-api → domain: `api.{client}.fayait.com`
5. Set env vars: `VITE_API_URL`, `DATABASE_URL`, service URLs (`NC_URL`, `ZAMMAD_URL`, `GRAFANA_URL`, etc.)
6. DNS: point `{client}.fayait.com` and `api.{client}.fayait.com` → client VPS IP
7. Deploy both → Traefik handles SSL

## Backend Services Registry

Every service runs as a separate Coolify service (own container/compose) within the client's Coolify project. Portal-api proxies all calls — services are never directly exposed to the browser.

| Service | Purpose | Portal module | portal-api env var | Status |
|---|---|---|---|---|
| Zammad | Tickets engine | Tickets (native) | `ZAMMAD_URL` + `ZAMMAD_TOKEN` | ✅ running |
| Nextcloud + EuroOffice | File storage + office editing | Files (native — build) | `NEXTCLOUD_URL` + `NEXTCLOUD_ADMIN_TOKEN` | ✅ running |
| Matrix/Synapse + Element | Team chat | Chat (native — build) | `MATRIX_URL` + `MATRIX_ADMIN_TOKEN` | ✅ running |
| Snipe-IT | Asset tracking (backend sync) | Assets (native ✅) | `SNIPE_URL` + `SNIPE_TOKEN` | ✅ running |
| Grafana + Prometheus | Infrastructure monitoring | Analytics (native — build) | `GRAFANA_URL` | ✅ running |
| Uptime Kuma | Service uptime | Status (native — build) | `STATUS_URL` | ✅ running |
| Vaultwarden | Password manager | Passwords (native — build) | `VAULTWARDEN_URL` + `VAULTWARDEN_TOKEN` | ✅ running |
| n8n | Workflow automation | Internal only | `N8N_WEBHOOK_URL` | ✅ running |
| RustDesk server | Remote desktop relay | Assets → remote commands | internal | ✅ running |
| OCS Inventory | Network device discovery | Assets → network discovery | `OCS_URL` | ✅ running |
| Paperless-ngx | Document management + OCR | Documents (native — build) | `PAPERLESS_URL` + `PAPERLESS_TOKEN` | 🔲 install |
| Wiki.js | Internal knowledge base | Wiki (native — build) | `WIKIJS_URL` + `WIKIJS_TOKEN` | 🔲 install |
| Jitsi Meet | Video conferencing | Meetings (native — build) | `JITSI_URL` | 🔲 install |
| Metabase | Business intelligence | BI / Analytics (native — build) | `METABASE_URL` + `METABASE_TOKEN` | 🔲 install |
| Excalidraw | Collaborative whiteboard | Whiteboard (native — build) | `EXCALIDRAW_URL` | 🔲 install |

## Inter-service Integration Map

Planned integrations (to build progressively — note here when implemented):
- **Tickets ↔ Assets**: ticket auto-created when asset goes offline 3× (done via n8n + Zammad)
- **Tickets ↔ HR**: tickets scoped to department; employee offboarding creates access-revoke ticket
- **Documents ↔ HR**: employee contracts, payslips, ID docs stored in Paperless; linked from HR profile
- **Documents ↔ Assets**: warranty docs, manuals attached to asset records via Paperless
- **Wiki ↔ Projects**: project documentation links; project detail shows related wiki pages
- **Meetings ↔ Projects**: "Start meeting" button on project/task detail; Jitsi room per project
- **Meetings ↔ HR**: scheduled team meetings visible in HR calendar
- **BI ↔ Portal DB**: Metabase reads portal PostgreSQL for business dashboards (assets, HR, projects)
- **Passwords ↔ Users**: Vaultwarden org synced with portal users; department-based collections
- **Passwords ↔ Assets**: service credentials for assets stored in Vaultwarden
- **Status ↔ Tickets**: Uptime Kuma alert → n8n → Zammad ticket (already wired)
- **Chat ↔ All**: Matrix notifications for ticket updates, asset alerts, HR leave approvals

## API
- Base URL: `VITE_API_URL` env var (falls back to `https://api.fayait.com` in dev)
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
- ServiceFrame: iframe wrapper for Chat (Matrix), Analytics (Grafana), Files (Nextcloud), Status page

### Files (Nextcloud + EuroOffice)
- Nextcloud runs as a Docker container on the client VPS (managed via central Coolify)
- EuroOffice Document Server runs as a second Docker container on the same client VPS
- Nextcloud is configured to use EuroOffice for in-browser editing of .docx, .xlsx, .pptx
- Users access Files via the portal iframe — auto-login via nc-bridge.html SSO bridge
- Files URL: `files.acme.fayait.com` | Office URL: `office.acme.fayait.com`
- Both URLs come from env vars on the VPS, not DB lookups

**Onboarding a new client (Files + Office) — replace `{client}` with client subdomain:**
1. Central Coolify → Add Server → paste client VPS SSH details
2. Create new Project for the client (copy from Acme project)
3. Add Service → Nextcloud → domain: `files.{client}.fayait.com`
4. Add Service → EuroOffice Document Server → domain: `office.{client}.fayait.com`
5. Deploy both → Traefik handles SSL automatically
6. DNS: point `files.{client}.fayait.com` and `office.{client}.fayait.com` → client VPS IP
7. Nextcloud admin → Apps → install the EuroOffice integration app
8. Settings → EuroOffice → Document Editing Service address: `https://office.{client}.fayait.com`
9. Save (Nextcloud tests the connection live)

Test environment uses `files.fayait.com` / `office.fayait.com` (no client subdomain yet).

### Profile (`src/pages/Profile.jsx`)
Display name, language (EN/NL), theme (light/dark), password change.

## Key Business Rules
- Services shown/hidden based on env vars exposed via `/api/config` (single-tenant per VPS — no DB company_services lookup needed)
- Locked services: admins see "contact Faya IT", regular users don't see locked services
- iframe services: Chat (Matrix), Analytics (Grafana), Files (Nextcloud)
- All service URLs (chat, files, grafana, tickets, etc.) come from `/api/config` — never hardcoded
- All other services have native UI built
- **Superadmin (Faya IT staff) has NO access to client data on any client VPS**
  — Superadmin operates exclusively via admin.fayait.com
  — Portal routes must return 403 for superadmin role (fix pending — see Still To Do)
  — On per-client VPS, superadmin role should not exist at all

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
The portal is a SaaS product sold to companies. Each module is for the client company's internal use. Faya IT is the provider — not a participant in client workflows.

**Original model (being replaced):** One shared instance of each service (Zammad, Snipe-IT, Nextcloud, etc.) serving all companies, separated by `company_id` in the data.

**Target model (in transition):** Each client gets their own VPS with fully dedicated service instances — their own Zammad, their own Snipe-IT, their own Nextcloud. No shared infrastructure, no `company_id` scoping, no multi-tenant data isolation needed in code.

admin.fayait.com is for provisioning and billing oversight only — it manages each client's VPS via Coolify and each client's portal-api, but never reads client data directly.

Superadmin accounts belong to Faya IT staff only and must not exist on a client VPS.

## Infrastructure Architecture

**Clone-and-deploy model — one VPS per client, centrally managed via Coolify:**
- Faya IT runs one central Coolify instance (on Faya IT's own VPS) — this is the single pane of glass for all client infrastructure
- Each client VPS is added as a **remote server** in that central Coolify — no Coolify installed on client VPS
- Each client VPS runs the full stack as Docker containers: portal frontend, portal-api, PostgreSQL, Nextcloud + EuroOffice, Zammad, Snipe-IT, Matrix/Element, Grafana
- To onboard a new client: add their VPS as a server in Coolify, deploy the project template, fill in `.env`, point DNS
- **There is only one company per installation** — no multi-tenant isolation needed in the code
- Service URLs are env vars set at deploy time (not looked up from a DB companies table)
- Faya IT runs centrally (on Faya IT VPS alongside Coolify): admin.fayait.com — for billing and provisioning oversight

**URL pattern per client VPS:**
- Portal: `acme.fayait.com` — **transition in progress**
- API: `api.acme.fayait.com` (same VPS)
- Files: `files.acme.fayait.com` (Nextcloud)
- Office: `office.acme.fayait.com` (EuroOffice Document Server)
- Chat: `chat.acme.fayait.com` (Matrix/Element)
- Analytics: `grafana.acme.fayait.com`
- Tickets: `tickets.acme.fayait.com` (Zammad)

**Key implication for portal code:**
- No company switching, no per-company service URL DB lookups
- Service URLs come from env vars → portal-api exposes them to frontend via `/api/config`
- The `companies` table simplifies to a single-row config table (or just env vars)
- JWT doesn't need company_id for data isolation (single tenant)

**Why this model:**
- Full data isolation between clients (separate VPS, separate DB, separate everything)
- GDPR compliance: each client's data never touches another client's machine
- Simple deployment: copy → configure .env → deploy
- Failure isolation: one client's VPS going down doesn't affect others

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
- Snipe-IT: `SNIPE_TOKEN` from env → `snipe_token`
- Nextcloud: nc-bridge.html auto-login via stored NC credentials

All external API calls proxied through portal-api (avoids CORS, hides credentials from browser).
Service URLs come from env vars on the VPS — no DB lookup needed (single tenant per installation).
Future: replace with Authentik OAuth2/OIDC.

## Still To Do

### Phase 2 — Native modules (replace iframes, build new services)
Build native portal UI for every backend service. Each module = portal-api proxy routes + React page using the T theme object. Order by priority:
- **Files** — native Nextcloud UI (file browser, upload, share, office editing trigger)
- **Chat** — native Matrix UI (rooms list, message thread, presence)
- **Passwords** — native Vaultwarden UI (vault items, collections, sharing)
- **Wiki** — native Wiki.js UI (page tree, editor, search)
- **Documents** — native Paperless-ngx UI (inbox, documents, tags, search)
- **Meetings** — native Jitsi UI (room creation, join, schedule)
- **BI** — native Metabase UI (dashboards, charts from portal DB)
- **Status** — native Uptime Kuma UI (monitors, uptime history)
- **Analytics** — native Grafana UI (infrastructure dashboards)
- **Whiteboard** — native Excalidraw UI (canvas, collaboration)

### Phase 3 — Provisioning engine (admin.fayait.com)
One-click client provisioning via Coolify API:
- Admin wizard: company info → service selection → target server → provision button
- Coolify API integration in portal-api admin routes
- Shared pool support (lightweight clients share a VPS)
- DNS checklist output post-provisioning

### Tech Cleanup (legacy multi-tenant removal)
The codebase was originally built for a shared-instance multi-tenant model. Now that every client gets their own VPS and dedicated service instances, this legacy must be removed:
- **`company_id` scoping** — remove from all DB queries and JWT; meaningless when only one company exists per VPS
- **`companies` table / per-company service URL lookups** — remove; service URLs come from env vars
- **Zammad/Snipe/Nextcloud tokens per company** — remove per-company token logic; one token per service per VPS, from env vars
- **Admin panel in portal** (`src/pages/admin/`) — existed to manage multiple companies on a shared instance; remove from portal entirely; admin.fayait.com (admin-portal repo) handles provisioning via Coolify
- **admin-portal API routing** — admin.fayait.com currently hits a single `api.fayait.com`; must be updated to call each client's `api.{client}.fayait.com` as clients move to their own VPS

### GDPR
- **Superadmin portal data access fix** — audit + gate middleware in portal-api (plan written)
- **HR API gate middleware** — server-side role scoping enforcement (partial: cancel leave + report column names fixed)
- **Projects anonymize cascade** — scrub deleted user's name from project/task/comment records (Art. 17)
- **Activity log `performed_by_id`** — store user ID alongside name so anonymization works on logs

### Features
- **Asset file downloads** — still uses token-in-URL pattern (same fix applied to Projects needs doing here)
- **RBAC custom roles** — UI for custom roles per company (tables exist: hr_roles, hr_role_permissions, hr_user_roles)
- **Dutch localization** — LangContext + t() helper in place, translations not yet populated
- **Onboarding flow** — first-login wizard for new companies
- **Licenses module** — software license tracking (not yet started)
- **Users module restructure** — merge Users page with HR People view (currently separate)
