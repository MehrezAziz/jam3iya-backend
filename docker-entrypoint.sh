#!/bin/sh
set -e
echo "Running database migrations (first run can take several minutes)..."
npx prisma migrate deploy
echo "Migrations finished. Starting API..."
exec node dist/src/main.js
