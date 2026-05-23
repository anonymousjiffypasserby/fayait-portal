# Faya IT Services: Universal Enterprise Platform Architecture Blueprint
**Comprehensive System Engineering, Operational Orchestration & Automatic Deployment Specifications**

---

## 1. Executive Vision & Architectural Goals

This platform is engineered by **Faya IT Services** as a secure, sovereign, multi-departmental corporate operating system optimized specifically for large-scale retail enterprises operating multiple physical storefronts, central warehouses, and diverse internal administrative offices. 

By wrapping a collection of best-of-breed open-source enterprise backend engines into a single, cohesive, highly responsive custom React/Tailwind CSS frontend shell, the architecture bypasses the structural pitfalls of legacy multi-database iframe layouts. The architecture operates entirely via decoupled, high-performance API pipelines (REST and GraphQL) feeding a unified application state.

### Core Strategic Requirements
* **Infrastructure Strategy:** Single-tenant isolation model deploying pre-compiled, production-frozen master Docker images onto client environments. Infrastructure footprints scale dynamically across isolated virtual private servers (optimized for 24GB RAM bare environments, e.g., Contabo tiering) depending on target customer size.
* **White-Label Branding Paradigm:** Complete abstraction of vendor and native application visuals. The application layout features no hardcoded platform naming. Instead, it functions as a dynamically white-labeled headless orchestrator, parsing the active subdomain string to inject the client company's own custom logo and brand assets into the top-navigation and login panels.
* **Domain & Routing Infrastructure:** Seamless single-tenant routing achieved through a centralized **Wildcard DNS architecture** under the master domain (`*.fayait.com`). Every client instance receives an instantly provisioned subdomain (e.g., `companyA.fayait.com`).
* **Authentication & Security:** Zero-trust architectural posture utilizing a centralized Single Sign-On (SSO) gateway via OpenID Connect (OIDC) to eliminate data silos and authenticate sessions seamlessly across all application sub-services simultaneously.

---

## 2. Global Component Mapping Matrix

The core backend engines have been selected based on architectural purity, API completeness, development velocity within a decoupled ecosystem, and robust performance capacity when operating within ample RAM footprints.

| Target Proprietary Framework | Core Backend Engine Underlying Module | Primary Department Served | Primary Integration Paradigm |
| :--- | :--- | :--- | :--- |
| **HubSpot / NetSuite ERP** | **ERPNext Core** | Finance, C-Suite Operations, & Supply Chain | REST API JSON Serialization (`/api/resource/`) |
| **Workday / BambooHR** | **Frappe HR App** | Human Resources & Personnel Administration | Native DocType Shared Database Transactions |
| **Google Drive / MS Office** | **Nextcloud Hub + Euro-Office Server** | All Staff (Digital Document Workspace) | WebDAV File Tree Aggregation + WOPI Websockets |
| **Jira Service Desk / Snipe-IT**| **GLPI Core (ITIL & ITAM Engine)** | IT Engineering & Facility Operations | REST V2 / GraphQL Asset Topology Mapping |
| **TeamViewer / AnyDesk** | **RustDesk Server Cluster (`hbbs`/`hbbr`)** | IT Support Infrastructure | Native Rust Client Relay Signaling via GLPI IDs |
| **Asana / Trello** | **Planka** | Project Managers & Store Operators | Real-time WebSockets / Decoupled REST Nodes |
| **Zoom / Teams Video** | **Jitsi Meet Container Cluster** | All Staff (Corporate Communications) | Embedded Javascript Canvas View Framework API |
| **HubSpot Marketing Automation**| **Mautic** | Outbound Marketing & Consumer Strategy | Webhook-driven Tracking & Event Subscriptions |
| **Twilio API Services** | **Chatwoot Omni-Channel Inbox** | Customer Service & POS Support Teams | Full REST Routing & Event Stream WebSockets |
| **TalentLMS / Absorb** | **Frappe LMS** | Corporate Academies & Field Onboarding | Shared Database / OIDC Token Verification |
| **1Password / Bitwarden** | **Passbolt (Community Edition)** | Corporate Security & Secret Vaulting | Asymmetric OpenPGP Client Decryption API |
| **Algolia / ElasticSearch** | **Meilisearch** | Unified Search Framework (Utility) | Rust-powered Reverse-Indexed REST Polling |

---

## 3. Comprehensive Domain Architecture & Technical Deep Dives

### 3.1 Network Edge & Subdomain Routing Mechanics (`*.fayait.com`)
The platform leverages an automated, zero-touch network routing architecture. By establishing a master wildcard `A` record (`*.fayait.com`) pointing directly to the main reverse proxy container (e.g., Traefik or Caddy), new client instances can be onboarded instantly without manually adjusting global DNS tables.

```
                  [ User types: companyA.fayait.com ]
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Wildcard DNS (*.fayait)  │
                    └─────────────┬─────────────┘
                                  │ (Points to master IP)
                                  ▼
                    ┌───────────────────────────┐
                    │ Central Traefik / Proxy   │
                    └─────────────┬─────────────┘
                                  │ (Inspects incoming Host Header)
                                  ▼
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Client A VPS   │       │  Client B VPS   │       │  Client C VPS   │
│ (companyA.faya) │       │ (companyB.faya) │       │ (companyC.faya) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

* **Automated TLS Handshakes:** The edge proxy intercepts the raw connection request and handles automated Let's Encrypt SSL/TLS negotiations via a DNS-01 challenge loop. This provides immediate, secure HTTPS execution for the client domain without service interruption.
* **Headless Context Injection:** When the custom React application mounts in the browser, it reads the initialization parameters via `window.location.hostname`. If it matches `companyA.fayait.com`, the app fetches that specific tenant's branding asset object profile from the configuration server, instantly overriding the navigation frames with the **Client Company's Logo** and preferred color map.
* **Premium Enterprise Domain Mapping:** For enterprise-tier clients demanding a native domain presence (e.g., `portal.companyA.com`), the reverse proxy handles custom inbound connection streams using a basic `CNAME` redirection layout, maintaining exact software architecture continuity.

### 3.2 Revenue, Inventory & Personnel (ERPNext & Frappe HR)
* **Database Paradigm:** Single unified schema operating on MariaDB/PostgreSQL. Frappe HR and Frappe LMS sit natively within the core system context, bypassing all inter-database latency or sync-state risks.
* **Invoicing & Ledger Mechanics:** Multi-store retail locations map directly to independent POS Profiles and Warehouses within ERPNext. Every terminal checkout logs a `Sales Invoice` entry that auto-reconciles stock ledgers using FIFO or Moving Average costing models, while triggering an automated balancing journal down to the company's General Ledger.
* **Automated Stock Replenishment:** Configured utilizing automated material requests. When retail store stocks fall below specified minimum thresholds, the backend generates an automated `Material Request` or `Purchase Order` routed directly to regional fulfillment centers or vendors.
* **Payroll & Commissions Sync:** Because Frappe HR shares the ERP database context, store clerk performance metrics, shift logs, and sales commission allocations translate directly into monthly payroll ledger entries without data migration scripts.

### 3.3 Collaborative Workspace & Document Processing (Nextcloud & Euro-Office)
* **Architecture Strategy:** Nextcloud serves as the directory hierarchy database, storage access-control validator, and WebDAV sync target. It sits backed by local high-speed VPS NVMe volume tracking blocks.
* **Real-time Document Synchronization:** Euro-Office (the community-driven, purely open-source hard fork of OnlyOffice) executes inside a container cluster alongside Nextcloud. The systems communicate securely via the WOPI (Web Application Open Platform Interface) protocol.
* **The Websocket Multi-User Loop:** When multiple users open a `.docx` or `.xlsx` asset:
    1. The frontend initiates a canvas component viewport mapped to Euro-Office.
    2. A bidirectional, high-concurrency websocket channel opens, maintaining cell selections, typing events, and cursor movements inside memory arrays.
    3. The file is saved back down into the Nextcloud data framework seamlessly upon session teardown.

### 3.4 Infrastructure Monitoring & Remote Operations (GLPI & RustDesk)
* **ITIL Support Structuring:** GLPI maps corporate hardware topology cleanly—linking network equipment, server racks, store POS components, and auxiliary hardware into relational tracking maps.
* **Ticketing Integration:** Tickets handle comprehensive change-management pipelines. Hardware objects are directly linked to incident logs, allowing operations teams to trace systematic equipment failures across specific retail branches.
* **Lag-Free Remote Control Realization:** Remote screen interaction is achieved via a dedicated, self-hosted RustDesk infrastructure:
    * **Signaling Server (`hbbs`):** Resolves NAT punch pathways, attempting a raw peer-to-peer (P2P) UDP session between the IT operator and target machine.
    * **Relay Server (`hbbr`):** If firewalls interrupt P2P pathways, traffic is routed through the dedicated high-bandwidth `hbbr` container on the local Contabo VPS. Written completely in Rust using modern codecs (H.264/H.265/AV1), it guarantees a responsive connection profile (<40ms latency) without external data-leakage profiles.
    * **API Pipeline Hook:** The custom React frontend queries GLPI for an asset's unique target ID string and initializes a local client launch command utilizing custom URL schemes (`rustdesk://[target_id]`).

### 3.5 Task Orchestration & Omnichannel Interaction (Planka & Chatwoot)
* **Visual Project Operations:** Planka provides lightweight, high-performance Kanban workflow boards built using React and Node.js. It operates independently from the database overhead of the ERP system, ensuring rapid, real-time board updates via dedicated websocket pipelines.
* **Unified Customer Message Ingestion:** Chatwoot captures disparate external customer text interactions (WhatsApp Business API, Twilio SMS networks, live website chat boxes, and corporate Facebook pages) and maps them into a single, cohesive, multi-agent queue UI category. This allows customer care staff to process tickets efficiently within a single workspace window.

### 3.6 Decentralized Security & Secret Vaulting (Passbolt)
* **Cryptographic Posture:** The security framework relies on Passbolt rather than a traditional master-password-derived solution. It uses an asymmetric OpenPGP encryption schema.
* **Enterprise Credential Sharing Flows:** Passbolt treats secrets as discrete entities that inherit permissions cleanly from nested directory paths (`Logins > Branch 4 > Safe Keys`). Corporate access can be instantly revoked, keys rotated, and audit tracking vectors reviewed down to individual user touch points across all multi-store branches.

---

## 4. Single-Tenant VPS Orchestration & Automation Infrastructure

To achieve automated one-click deployments from the Faya IT Services Central Control Panel, manual steps are replaced by programmatic container provisioning via backend webhooks communicating directly with an orchestration layer (e.g., Coolify Engine, Traefik Hub, or an automated Ansible/Docker-compose agent).

```
 ┌────────────────────────────────────────────────────────┐
 │            FAYA IT CONTROL PANEL (Admin UI)            │
 │  • Input: Company Name, Emails, Package, VPS SSH Keys │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼ (Secure API Webhook JSON Payload)
 ┌────────────────────────────────────────────────────────┐
 │              INFRASTRUCTURE CONTROLLER                 │
 │             (Orchestrator REST Daemons)                │
 └───────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼ (If Shared Environment)               ▼ (If Dedicated Environment)
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     SHARED CLUSTER SERVER       │     │     DEDICATED CONTABO VPS       │
│ • Appends unique configuration  │     │ • Executes automated SSH hooks  │
│ • Spawns isolated container loop│     │ • Installs core Docker Engine   │
│ • Allocates shared host metrics │     │ • Boots master system imagery  │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### 4.1 Control Panel Ingestion Specifications
The Faya IT Admin Panel collects five specific inputs to trigger a downstream deployment event:
1. **Company Name (`string`):** Sets directory naming conventions, database prefix configurations, and subdomains (e.g., `companyA`).
2. **Superadmin Email (`string`):** The default root administrator target for initial user verification workflows.
3. **Billing Email (`string`):** Dedicated account destination for structural invoice generation and platform tracking notifications.
4. **Services Array (`list`):** Explicitly defines feature availability profiles paid for by the client (e.g., `['erp', 'hr', 'drive', 'tickets', 'meetings']`).
5. **Target Credentials (`object`):** Host IP addresses and secure SSH target private keys. Maps to a **Shared Server Cluster** for low-tier companies or a brand new **Dedicated VPS Node** for high-volume corporate accounts.

### 4.2 Single-Click Deployment Automation Pipeline Mechanics
Upon form submission, the automated control sequence executes without human intervention:

1. **Host Verification Protocol:** The central automation engine establishes an SSH bridge to the destination nodes. If a dedicated machine is targeted, it applies system package baselines, initializes Docker nodes, and configures the reverse proxy runtime.
2. **Dynamic Compose Generation:** The engine parses the selected service flags to generate a production configuration file derived from the frozen master image schema (`registry.fayait.com/platform-core:latest`).
3. **Runtime Environment Injection:** Configurations are embedded straight into the container context via standard environment parameters:
   * `CLIENT_IDENTIFIER=companyA`
   * `SYSTEM_ROOT_ADMIN=admin@companya.com`
   * `PROVISIONED_TIERS=erp,hr,drive,tickets`
4. **Automatic Superadmin Provisioning:** During container initialization, database migrations trigger custom initialization scripts across backend sub-services:
   * **ERPNext/Frappe:** Invokes API hooks (`frappe.get_doc`) to register the corporate admin email and assign standard Global Manager privileges.
   * **GLPI/Passbolt:** Triggers internal terminal utilities to establish authorization paths using the specified customer target properties.
5. **Asset Handover Protocol:** The container stack reports deployment success metrics back to the control plane. The system transmits a secure configuration confirmation packet containing the system login endpoint (`companyA.fayait.com`) and temporal access credentials directly to the client's verified superadmin email destination.

### 4.3 Central Authorization Framework (SSO Implementation)
To stitch these varied standalone backend containers into a seamless dashboard experience, the infrastructure places **Keycloak** or **ZITADEL** at the primary gate of the client's server network.

* **Protocol Mapping:** Every standalone engine container (ERPNext, Nextcloud, GLPI, Passbolt, Planka, Chatwoot) is configured to utilize the central OIDC (OpenID Connect) token authentication endpoints.
* **The Single-Login Experience:** When a user arrives at the platform interface and inputs their central corporate credentials once, the identity gateway validates their roles and generates a cryptographically signed JSON Web Token (JWT).
* **Headless Data Extraction Processing:** As the custom React frontend framework updates its interface view across tabs, it securely attaches this active authorization token inside background fetch headers. This pulls native JSON records concurrently from all endpoints across the container ecosystem while avoiding any cross-origin resource constraints or security blockades.

---

## 5. Current Implementation Status

### ERPNext Docker Deployment — COMPLETE ✅
- Stack: `frappe/erpnext:v15` with MariaDB 10.6, Redis 7, 2 workers, scheduler, websocket, nginx frontend
- Site: `erp.fayait.com` — all 5 apps installed (frappe, erpnext, hrms, lms, payments), 907+ DB tables
- CORS: `allow_cors_origin = "*"` configured on site
- Admin API token: `306686e0fa0c28d:05e917b76198d96` (stored in portal `.env` as `VITE_ERP_TOKEN`)
- Compose file: `/data/coolify/applications/erpnext/docker-compose.yml`
- Key fix: `env` named volume for shared virtualenv; `fetch-apps` init container clones hrms/lms/payments before configurator

### ERP Custom Frontend — COMPLETE ✅
All files live under `src/pages/erp/` and `src/services/erpnextApi.js`:

| File | Purpose |
|------|---------|
| `src/services/erpnextApi.js` | API client — `erpFinance`, `erpCommerce`, `erpInventory`, `erpSetup`, `erpReports` |
| `src/pages/erp/shared.jsx` | Theme tokens, shared components, status badges, formatters |
| `src/pages/erp/FinanceDashboard.jsx` | KPI cards, recent invoices/bills, quick actions |
| `src/pages/erp/Invoices.jsx` | Sales Invoices + Purchase Bills tabs with search/filter/pagination |
| `src/pages/erp/Orders.jsx` | Sales Orders + Purchase Orders tabs |
| `src/pages/erp/Customers.jsx` | Customers + Suppliers tabs |
| `src/pages/erp/Items.jsx` | Item master with group/stock filters |
| `src/pages/erp/Accounting.jsx` | Journal Entries, Chart of Accounts, GL Entries tabs |
| `src/pages/erp/Inventory.jsx` | Stock Entries, Warehouses, Stock Balance tabs |
| `src/pages/erp/ERPReports.jsx` | Built-in report browser (80+ reports) with inline runner |
| `src/pages/erp/index.jsx` | Main ERP container — collapsible sidebar + view router |

- Route: `/erp/*` added to `App.jsx` gated by `ServiceRoute service="erp"`
- Nav: ERP item added to Layout.jsx sidebar under Work section
- Auth: currently shared Administrator token; future: Keycloak OIDC bearer tokens per user
- `SetupNotice` shown on all pages if ERPNext has no Company configured

### Next Planned Features
- Keycloak SSO integration (replaces shared token)
- Payment Entries page
- Quotations / CRM page
- Per-user ERPNext role mapping via Keycloak

---

## 6. Prompt Engineering Directives for AI Implementation Tasks
**CRITICAL: Whichever AI model reads this document must strict-bind execution parameters to the operational instructions below. Do not deviate from these engineering constraints.**

### 6.1 Role Posture
You are an expert full-stack systems software engineer specializing in the MERN/Frappe/Docker stack. When instructed to draft components, write code, or build configuration files based on `claude.md`, you will instantly assume the architectural constraints of this document without asking the user for clarifying details or requiring repeated high-level summaries.

### 6.2 Code Generation Standards
* **Frontend Tasks:** All UI code must be written in clean, modern React utilizing tailwind CSS styles. The UI must contain **zero references** to fixed product brand names; all rendering states must load logos dynamically by checking `window.location.hostname` inputs.
* **Feature Gating Logic:** Always wrap navigation elements and tab items inside a conditional permissions evaluation checker that explicitly references the active `PROVISIONED_TIERS` arrays loaded out of user token contexts.
* **Backend and Compose Tasks:** All environment variables, Docker Compose generation configurations, or setup hooks written must adhere strictly to the schema properties documented in Section 4. Ensure all code outputs provide fully completed implementations instead of truncated shorthand text placeholders.
