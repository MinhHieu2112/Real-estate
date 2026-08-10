#!/bin/sh
set -e

echo "[Entrypoint] Applying Prisma database migrations..."

# Tìm file schema.prisma linh hoạt theo cả 2 đường dẫn (Root hoặc app directory)
SCHEMA_PATH=""
if [ -f "./apps/server/prisma/schema.prisma" ]; then
  SCHEMA_PATH="./apps/server/prisma/schema.prisma"
elif [ -f "./prisma/schema.prisma" ]; then
  SCHEMA_PATH="./prisma/schema.prisma"
fi

# Chạy Prisma Migration nếu DATABASE_URL tồn tại
if [ -n "$DATABASE_URL" ]; then
  if [ -n "$SCHEMA_PATH" ]; then
    if [ -f "./node_modules/.bin/prisma" ]; then
      ./node_modules/.bin/prisma migrate deploy --schema="$SCHEMA_PATH" || echo "[Entrypoint] Warning: Migration step finished with non-zero exit code."
    elif [ -f "./apps/server/node_modules/.bin/prisma" ]; then
      ./apps/server/node_modules/.bin/prisma migrate deploy --schema="$SCHEMA_PATH" || echo "[Entrypoint] Warning: Migration step finished with non-zero exit code."
    elif command -v npx > /dev/null 2>&1; then
      npx prisma migrate deploy --schema="$SCHEMA_PATH" || echo "[Entrypoint] Warning: Migration step finished with non-zero exit code."
    else
      echo "[Entrypoint] Error: Prisma CLI not found in node_modules."
    fi
  else
    echo "[Entrypoint] Warning: schema.prisma not found. Skipping migration."
  fi
else
  echo "[Entrypoint] Warning: DATABASE_URL is not set. Skipping migration."
fi

echo "[Entrypoint] Starting application..."
exec "$@"