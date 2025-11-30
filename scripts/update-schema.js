const fs = require('fs');
const path = require('path');

// SQLiteデータベースを直接更新するスクリプト
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

console.log('Checking if database exists:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

// better-sqlite3を使ってデータベースを更新
const Database = require('better-sqlite3');

try {
  const db = new Database(dbPath);

  console.log('Connected to database');

  // 既存のテーブル構造を確認
  const tableInfo = db.prepare("PRAGMA table_info(TemperatureHistory)").all();
  console.log('Current table structure:', tableInfo);

  // tempHigh7カラムが存在するか確認
  const hasTempHigh7 = tableInfo.some(col => col.name === 'tempHigh7');
  const hasTempLow7 = tableInfo.some(col => col.name === 'tempLow7');

  if (!hasTempHigh7) {
    console.log('Adding tempHigh7 column...');
    db.prepare("ALTER TABLE TemperatureHistory ADD COLUMN tempHigh7 REAL NOT NULL DEFAULT 0").run();
    console.log('tempHigh7 column added');
  } else {
    console.log('tempHigh7 column already exists');
  }

  if (!hasTempLow7) {
    console.log('Adding tempLow7 column...');
    db.prepare("ALTER TABLE TemperatureHistory ADD COLUMN tempLow7 REAL NOT NULL DEFAULT 0").run();
    console.log('tempLow7 column added');
  } else {
    console.log('tempLow7 column already exists');
  }

  // 更新後のテーブル構造を確認
  const updatedTableInfo = db.prepare("PRAGMA table_info(TemperatureHistory)").all();
  console.log('Updated table structure:', updatedTableInfo);

  db.close();
  console.log('Database updated successfully');
} catch (error) {
  console.error('Error updating database:', error);
  process.exit(1);
}
