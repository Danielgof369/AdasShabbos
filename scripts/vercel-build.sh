#!/usr/bin/env bash
# Vercel build. With DB_SETUP_ON_BUILD=1 the schema is pushed to the
# database before building, so new columns land with the code that uses
# them. It is additive-only: a change that would drop data fails the build
# instead of applying (run such changes by hand with deploy/*.sql).
# SEED_ON_BUILD=1 additionally runs the seed (fresh databases only).
set -euo pipefail
if [ "${DB_SETUP_ON_BUILD:-}" = "1" ]; then
  echo "DB_SETUP_ON_BUILD=1: pushing schema"
  npx prisma db push --skip-generate
  if [ "${SEED_ON_BUILD:-}" = "1" ]; then
    echo "SEED_ON_BUILD=1: seeding"
    npx prisma db seed
  fi
  # Bounded one-off data fixes (see each script's header).
  npx tsx scripts/cleanup-test-signups.ts
fi
npx next build
