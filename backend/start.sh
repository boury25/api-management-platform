#!/bin/sh
set -e

echo "▶ Pushing Prisma schema to database..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "▶ Seeding database..."
node dist-seed/prisma/seed/index.js

echo "▶ Starting API server..."
exec node dist/server.js
