#!/bin/sh
# 初始化 SQLite DB（如果不存在）
if [ ! -f /app/prisma/dev.db ]; then
  echo "初始化資料庫..."
  cd /app && node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect().then(() => {
      console.log('資料庫連線成功');
      prisma.\$disconnect();
    }).catch(e => {
      console.error('資料庫連線失敗:', e.message);
    });
  "
fi

exec node server.js
