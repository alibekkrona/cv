#!/bin/sh
set -eu

attempt=1
max_attempts=30

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database did not become ready after $max_attempts attempts." >&2
    exit 1
  fi

  echo "Database is not ready yet. Retrying migration in 2 seconds ($attempt/$max_attempts)."
  attempt=$((attempt + 1))
  sleep 2
done

node scripts/demo-bootstrap.js

exec npm run start -- --hostname 0.0.0.0
