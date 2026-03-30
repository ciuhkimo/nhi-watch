-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drugCode" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PriceHistory_drugCode_idx" ON "PriceHistory"("drugCode");

-- CreateIndex
CREATE INDEX "PriceHistory_drugCode_date_idx" ON "PriceHistory"("drugCode", "date");
