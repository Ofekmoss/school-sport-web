#!/bin/bash
echo "Restart services with new docker images"

cd /var/www/html/school-sport-web
echo "My location is $(pwd)"
docker compose pull && docker compose build && docker compose down && docker compose up -d
