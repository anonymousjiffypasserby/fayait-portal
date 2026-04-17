Faya IT Portal — Full Product Spec
Version 1.0 — Based on NinjaOne/Snipe-IT feature parity + custom MSP features

Vision
A modern MSP portal for Caribbean/Surinamese businesses. Clients log in and see their
own IT environment. Faya IT manages everything from the admin panel. The portal should
feel like a modern SaaS product — not a self-hosted open source tool.

User Roles
RoleAccessSuperadmin (fayait)Everything. All companies. All data. All settings.Company AdminOwn company only. Full asset/ticket/project access. RustDesk connect. Agent token.Regular UserOwn company only. Read-only assets. Own tickets. Own projects. No RustDesk. No tokens.

Pages & Modules

1. Dashboard (/dashboard)
Purpose: At-a-glance overview of the company's IT environment.
Widget: Asset Summary

Total assets count
Breakdown: Deployed / Ready to Deploy / Maintenance / Retired / Lost/Stolen
Clickable counts → opens Assets page pre-filtered by that status
Circular donut chart showing distribution

Widget: License Summary

Total licenses
Expired / Expiring soon (within 30 days) / Active
Clickable → goes to Licenses page

Widget: People Summary

Total users
Active / Inactive
Clickable → goes to People page

Widget: Recent Activity

Last 10 events across all modules: asset checkins, checkouts, ticket updates,
new assets registered, audits
Each row: icon + description + timestamp + user who triggered it
Pulls from audit_log table

Widget: Online/Offline Assets (Custom — not in Snipe-IT)

Live count: X online, Y offline
Updates in real-time via SSE
Clickable → Assets page filtered by online/offline

Widget: Alerts (Custom)

Open Zammad tickets triggered by monitoring thresholds
RAM alerts, disk alerts, offline alerts
Clickable → Tickets page

Widget: Locations Map

Assets grouped by location
Shows count per location

Widget: Categories Breakdown

Laptops / Desktops / Servers count
Bar or donut chart

Widget Behavior (all widgets):

Minimizable (collapses to header bar)
Expandable to fullscreen
Printable
Clicking a number/segment initiates a filtered search in the relevant module


2. Assets (/assets)
Purpose: Full hardware asset lifecycle management. Snipe-IT feature parity +
custom monitoring features.
2a. Asset List View (default)

Sortable columns: Tag, Name, Model, Status, Assigned To, Location, Last Seen, Online
Search: asset tag, hostname, serial, MAC, IP, assigned user
Filters: Status, Category, Manufacturer, Model, Location, Department, Online/Offline
Filters persist in URL params
Checkbox multi-select rows
Bulk action bar appears when rows selected:

Bulk Checkout (assign all to one user)
Bulk Check In
Bulk Update Location
Bulk Update Department
Bulk Update Status
Bulk Audit
Bulk Delete (confirmation modal)


Card view toggle (shows asset card with health score + online badge)
Online badge on each row — updates in real-time via SSE (green = online, grey = offline)
RAM% and CPU% mini-bars on each row — update in real-time via SSE pings
Clicking a row → detail panel slides in from right (no page navigation)

2b. Asset Detail Panel (slides in from right)
Header:

Asset tag (SUBDOMAIN-XXXXXX format) with QR icon
Asset name / hostname
Online badge (real-time)
Last seen timestamp (real-time)
Health score badge

Action buttons (top right of panel):

Check Out
Check In
Edit
Clone
Delete
Audit
Download QR Tag (generates QR as PNG download, labeled with asset tag)
View in Snipe-IT (opens snipe.fayait.com/hardware/:snipe_id — only if snipe_id exists)
Connect via RustDesk (admin only — opens rustdesk://ID — only if rustdesk_id exists)

Tabs:
Overview tab:
All Snipe-IT fields:

Asset Tag, Asset Name, Serial, Manufacturer (dropdown), Model (dropdown filtered by
manufacturer), Status (dropdown), Category (Laptop/Desktop/Server), Supplier (dropdown),
Purchase Date, Purchase Cost, Order Number, Warranty Months, Warranty Expiry
(auto-calculated), EOL Date, Notes
Assigned To (dropdown → users), Checkout Date, Expected Checkin Date
Location (dropdown), Department (dropdown)

Custom fields:

Hostname, MAC Address, IP Address, Network Type
CPU, CPU Cores, RAM GB, Disk GB, OS
GPU, Monitors, Resolution
Battery Status + Health % (laptops only — hide for desktops/servers)
Last Logged-In User
Pending Updates count (expandable list)
Antivirus name + status
RustDesk ID (admin only), RustDesk Password (admin only)
Agent Token (admin only, copyable with copy button)
Snipe-IT ID (admin only)

Hardware tab:

Per-drive disk details (disks_detail expanded: drive letter, size, used, health/SMART)
USB devices list
Full CPU/RAM/GPU specs
Monitor details + resolution

Software tab:

Last Logged-In User (shown at top)
Pending Windows Updates count + expandable list of update names
Installed Software table: Name, Version, Publisher (searchable, sortable)
Last full scan timestamp

Network tab:

IP address, MAC, Network Type
Network Discovery toggle (on/off)
Discovered devices table (devices found on subnet, pending approval)

Columns: IP, MAC, Hostname (if resolved), First Seen, Actions (Approve / Ignore)



History tab:

Timeline of all events for this asset:

Checkout / Checkin (who, when, where)
Audit events (who audited, when)
Status changes
Field edits (what changed, old value, new value, who changed it, when)
Agent online/offline events with timestamps


7-day uptime chart (visual timeline of online/offline periods)

Maintenance tab:

List of maintenance records: Title, Supplier, Cost, Start Date, End Date, Notes,
Completed checkbox
Add Maintenance Record button → inline form
Each record: Edit / Delete actions

Files tab:

File attachments (placeholder — list + upload button)
Downloads any attached files

2c. Sidebar sub-pages (mirrors Snipe-IT sidebar):

List All
Deployed
Ready to Deploy
Pending
Un-deployable
Archived
Due for Audit
Due for Checkin
Quick Scan Checkin (barcode/QR scan → checkin by tag)
Bulk Checkout
Deleted (soft-delete trash, restore option)
Maintenances (all maintenance records across all assets)
Import (CSV import with field mapping)
Bulk Audit

2d. Dropdowns — all must fetch from DB:
FieldSourceNotesAssigned UserGET /api/users?company_id=XFull name displayedDepartmentGET /api/departments?company_id=XLocationGET /api/locations?company_id=XCreate locations tableManufacturerGET /api/manufacturersModelGET /api/models?manufacturer_id=XFilters by manufacturerSupplierGET /api/suppliersCreate suppliers tableCompanyGET /api/companiesSuperadmin onlyStatusFixed listReady to Deploy, Deployed, Maintenance, Retired, Lost/StolenCategoryFixed listLaptop, Desktop, Server

3. Licenses (/licenses)
Purpose: Track software licenses per company.
Fields:

License Name, Software Name, License Key (masked), License Type
(Per Seat / Single / Site), Seats Total, Seats Used, Expiry Date,
Purchase Date, Purchase Cost, Supplier, Notes

Features:

List view with sortable columns
Filter: expired / expiring soon / active
Assign license seats to users
Alert when seats exceeded or expiry within 30 days
Import CSV


4. People (/people)
Purpose: Manage users per company (mirrors Snipe-IT's People module).
Fields:

Full Name, Email, Username, Department (dropdown), Location (dropdown),
Phone, Job Title, Manager, Employee Number, Notes, Avatar

Features:

List view: sortable, searchable
Per user: assets assigned, licenses assigned, activity log
Activate / Deactivate user
Import CSV


5. Tickets (/tickets)
Purpose: Helpdesk ticket management via Zammad API.
Features:

List all tickets for company (GET Zammad API filtered by company)
Status: Open / Pending / Resolved / Closed
Priority: Low / Normal / High / Urgent
Create new ticket (POST to Zammad)
View ticket thread + reply
Attach files
Filter by status, priority, assigned agent
Alerts from monitoring agent appear here automatically (threshold triggers)


6. Projects (/projects)
Purpose: Project management via Plane API.
Defer until Plane is deployed.
Planned features:

Project list for company
Issues / tasks with status, assignee, priority
Cycles (sprints)
Modules
Create/update issues from portal


7. Reports (/reports)
Purpose: Exportable reports for MSP use.
Report types:

Asset Inventory (all assets with all fields) → export CSV / PDF
Assets by Status
Assets by Location
Assets by Department
Assets Due for Audit
Warranty Expiry Report (assets expiring within X days)
License Compliance (seats used vs purchased)
Maintenance History
Checkout/Checkin History
Monitoring Alert History


Real-Time Architecture
Two-speed agent:

FayaIT-Ping (every 5 min): POST /api/checkin/ping → { agent_token, online,
ram_percent, cpu_percent }
FayaIT-Agent (every 60 min): POST /api/checkin → full hardware + software scan

Offline detection:

Background job on API runs every 2 minutes
Marks asset offline if last_seen < now - 12 minutes
Broadcasts offline event via SSE

SSE endpoint:

GET /api/assets/live
Portal subscribes on load
Receives: { id, online, last_seen, ram_percent, cpu_percent } on every ping/checkin/offline event
Updates table rows in real-time without page refresh


Database Tables (full list)
Existing:
companies, company_services, users, user_access, departments, company_roles,
role_permissions, projects, project_comments, project_followers, notifications,
announcements, invoices, audit_log, asset_checkins, asset_thresholds, assets
To create:

locations (id, name, address, company_id)
manufacturers (id, name, url, support_url, support_phone, support_email)
models (id, name, manufacturer_id, category, eol_date, notes, image_url)
suppliers (id, name, address, city, country, phone, email, url, notes, company_id)
licenses (id, name, software_name, key, type, seats, expiry_date, purchase_date,
cost, supplier_id, company_id, notes)
license_assignments (id, license_id, user_id, assigned_at, assigned_by)
asset_maintenance (id, asset_id, title, supplier_id, cost, start_date, end_date,
notes, completed, completed_at, created_by)
asset_files (id, asset_id, filename, path, uploaded_by, uploaded_at)


Build Order (recommended)

✅ Assets page (in progress)
Dashboard
People
Licenses
Reports
Tickets (Zammad)
Projects (Plane — deploy Plane first)


Design System Rules

Dark-mode friendly, modern SaaS aesthetic
No copying Snipe-IT visual layout
Detail panels slide in from right (no page navigation for detail views)
Consistent dropdown behavior: loading state, error state, pre-selected current value
All relational fields = dropdowns fetching from DB (never free text)
Bulk action bar appears at top of list when rows selected
Filters persist in URL params
Real-time badges use SSE (never polling for online status)
