-- CreateTable
CREATE TABLE "TemperatureHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "tempHigh" REAL NOT NULL,
    "tempLow" REAL NOT NULL,
    "tempAvg" REAL NOT NULL,
    "tempAvg7" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TemperatureHistory_date_key" ON "TemperatureHistory"("date");

-- CreateIndex
CREATE INDEX "TemperatureHistory_date_idx" ON "TemperatureHistory"("date");
