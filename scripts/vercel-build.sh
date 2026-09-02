#!/usr/bin/env bash
# Vercel build. When DB_SETUP_ON_BUILD=1 (a demo/staging project with its own
# empty database), push the schema and seed before building so the project
# is usable the moment the deploy finishes. Never set that flag on the
# production project: the live database is migrated by hand (deploy/*.sql).
set -euo pipefail
if [ "${DB_SETUP_ON_BUILD:-}" = "1" ]; then
  echo "DB_SETUP_ON_BUILD=1: pushing schema and seeding"
  npx prisma db push --accept-data-loss --skip-generate
  npx prisma db seed
fi
npx next build
