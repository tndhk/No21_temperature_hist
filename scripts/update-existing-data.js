const Database = require('better-sqlite3');
const path = require('path');

// 既存データの7日移動平均を計算して更新するスクリプト
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

function compute7DayAverage(values) {
  return values.map((_, i) => {
    const startIdx = Math.max(0, i - 6);
    const window = values.slice(startIdx, i + 1);
    const sum = window.reduce((acc, v) => acc + v, 0);
    return sum / window.length;
  });
}

try {
  const db = new Database(dbPath);
  console.log('Connected to database');

  // 全データを日付順で取得
  const allData = db.prepare(`
    SELECT id, date, tempHigh, tempLow
    FROM TemperatureHistory
    ORDER BY date ASC
  `).all();

  console.log(`Found ${allData.length} records to update`);

  if (allData.length === 0) {
    console.log('No data to update');
    db.close();
    process.exit(0);
  }

  // 7日移動平均を計算
  const tempHighValues = allData.map(d => d.tempHigh);
  const tempLowValues = allData.map(d => d.tempLow);

  const high7List = compute7DayAverage(tempHighValues);
  const low7List = compute7DayAverage(tempLowValues);

  // データを更新
  const updateStmt = db.prepare(`
    UPDATE TemperatureHistory
    SET tempHigh7 = ?, tempLow7 = ?
    WHERE id = ?
  `);

  const updateMany = db.transaction((records) => {
    for (const record of records) {
      updateStmt.run(record.tempHigh7, record.tempLow7, record.id);
    }
  });

  const recordsToUpdate = allData.map((d, i) => ({
    id: d.id,
    tempHigh7: high7List[i],
    tempLow7: low7List[i],
  }));

  updateMany(recordsToUpdate);

  console.log(`Successfully updated ${allData.length} records with 7-day moving averages`);

  // 確認のため、いくつかのレコードを表示
  const sample = db.prepare(`
    SELECT date, tempHigh, tempHigh7, tempLow, tempLow7
    FROM TemperatureHistory
    ORDER BY date DESC
    LIMIT 5
  `).all();

  console.log('\nSample of updated data (most recent 5):');
  console.table(sample);

  db.close();
  console.log('\nDatabase updated successfully');
} catch (error) {
  console.error('Error updating database:', error);
  process.exit(1);
}
