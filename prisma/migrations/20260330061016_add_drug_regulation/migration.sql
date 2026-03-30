-- AlterTable
ALTER TABLE "Drug" ADD COLUMN "regulationUrl" TEXT;

-- CreateTable
CREATE TABLE "DrugRegulation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drugCode" TEXT NOT NULL,
    "payCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DrugRegulation_drugCode_idx" ON "DrugRegulation"("drugCode");

-- CreateIndex
CREATE INDEX "DrugRegulation_payCode_idx" ON "DrugRegulation"("payCode");

-- CreateIndex
CREATE UNIQUE INDEX "DrugRegulation_drugCode_payCode_key" ON "DrugRegulation"("drugCode", "payCode");
