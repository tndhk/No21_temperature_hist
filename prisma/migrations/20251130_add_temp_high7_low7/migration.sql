-- Add tempHigh7 and tempLow7 columns to TemperatureHistory table
ALTER TABLE "TemperatureHistory" ADD COLUMN "tempHigh7" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TemperatureHistory" ADD COLUMN "tempLow7" DOUBLE PRECISION NOT NULL DEFAULT 0;
