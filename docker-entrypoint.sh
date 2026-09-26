#!/bin/sh
# Brings the database up to the schema this image was built with, then serves.
set -e

mkdir -p "$DATA_DIR"

cd /app/packages/db
bunx prisma migrate deploy

cd /app/apps/server
exec bun run src/index.ts
