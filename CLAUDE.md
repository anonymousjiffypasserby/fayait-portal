# Faya IT — Portal Frontend (portal.fayait.com)

## Stack
- React + Vite
- Deployed via Coolify → GitHub push to `main` triggers auto-deploy
- Traefik reverse proxy (10-15s to pick up new container after deploy)

## API
- Base URL: https://api.fayait.com
- Auth: JWT via POST /api/auth/login
- Assets: GET /api/assets (returns full asset list with latest checkin via LATERAL join)

## Key Business Rules
- Services shown based on company_services status per company
- Locked services: admins see "contact Faya IT", regular users don't see locked services
- iframe services: Chat (Matrix), Analytics (Grafana)
- Custom UI services: Assets (built), Tickets (pending), Projects (pending)

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

## Deploy
git add . && git commit -m "message" && git push origin main
