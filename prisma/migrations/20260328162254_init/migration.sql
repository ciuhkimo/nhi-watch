-- CreateTable
CREATE TABLE "Drug" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generic" TEXT,
    "form" TEXT,
    "strength" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT,
    "atcCode" TEXT,
    "manufacturer" TEXT,
    "category" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "status" TEXT NOT NULL DEFAULT '給付中',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalCode" TEXT
);

-- CreateTable
CREATE TABLE "Device" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price" REAL NOT NULL,
    "selfPay" REAL NOT NULL DEFAULT 0,
    "unit" TEXT,
    "startDate" TEXT,
    "status" TEXT NOT NULL DEFAULT '給付中',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalCode" TEXT
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT,
    "startDate" TEXT,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "records" INTEGER,
    "changes" INTEGER,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "errorMsg" TEXT
);

-- CreateTable
CREATE TABLE "DrugMapping" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nhiCode" TEXT NOT NULL,
    "hospitalCode" TEXT NOT NULL,
    "hospitalName" TEXT,
    "mappedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mappedBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Drug_code_key" ON "Drug"("code");

-- CreateIndex
CREATE INDEX "Drug_code_idx" ON "Drug"("code");

-- CreateIndex
CREATE INDEX "Drug_atcCode_idx" ON "Drug"("atcCode");

-- CreateIndex
CREATE INDEX "Drug_status_idx" ON "Drug"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");

-- CreateIndex
CREATE INDEX "Device_code_idx" ON "Device"("code");

-- CreateIndex
CREATE INDEX "Device_category_idx" ON "Device"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_code_key" ON "Payment"("code");

-- CreateIndex
CREATE INDEX "Payment_code_idx" ON "Payment"("code");

-- CreateIndex
CREATE INDEX "Payment_category_idx" ON "Payment"("category");

-- CreateIndex
CREATE INDEX "ChangeLog_date_idx" ON "ChangeLog"("date");

-- CreateIndex
CREATE INDEX "ChangeLog_tableName_idx" ON "ChangeLog"("tableName");

-- CreateIndex
CREATE INDEX "ChangeLog_changeType_idx" ON "ChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "DrugMapping_nhiCode_idx" ON "DrugMapping"("nhiCode");

-- CreateIndex
CREATE INDEX "DrugMapping_hospitalCode_idx" ON "DrugMapping"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "DrugMapping_nhiCode_hospitalCode_key" ON "DrugMapping"("nhiCode", "hospitalCode");
