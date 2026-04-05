#!/bin/bash
echo "Building portal..."
npm run build

echo "Building Docker image..."
docker build -t fayait-portal:latest .

echo "Restarting container..."
docker stop fayait-portal 2>/dev/null
docker rm fayait-portal 2>/dev/null
docker run -d \
  --name fayait-portal \
  --restart unless-stopped \
  --network coolify \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.portal.rule=Host(\`portal.fayait.com\`)" \
  -l "traefik.http.routers.portal.entrypoints=https" \
  -l "traefik.http.routers.portal.tls=true" \
  -l "traefik.http.routers.portal.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.portal.loadbalancer.server.port=80" \
  fayait-portal:latest

echo "Done! Portal deployed."
