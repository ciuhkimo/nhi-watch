#!/bin/sh
# 確保資料庫 schema 為最新
echo "檢查資料庫..."
cd /app && npx prisma db push --skip-generate 2>/dev/null || true

echo "啟動 NHI-Watch..."
exec node server.js
