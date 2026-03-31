#!/bin/sh
# 確保資料庫 schema 為最新
echo "檢查資料庫..."
cd /app && node node_modules/prisma/build/index.js db push --skip-generate
if [ $? -ne 0 ]; then
  echo "資料庫 schema 同步失敗，中止啟動"
  exit 1
fi

echo "啟動 NHI-Watch..."
exec node server.js
