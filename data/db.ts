import * as SQLite from 'expo-sqlite';
import { Flight, SAMPLE_FLIGHTS } from './sampleFlights';

const db = SQLite.openDatabaseSync('flightlogger.db');

export function initDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS flights (
      id           INTEGER PRIMARY KEY,
      origin       TEXT NOT NULL,
      destination  TEXT NOT NULL,
      airline      TEXT,
      aircraft     TEXT,
      registration TEXT,
      date         TEXT
    );
  `);
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM flights');
  if (!row || row.c === 0) {
    db.withTransactionSync(() => {
      for (const f of SAMPLE_FLIGHTS) {
        db.runSync(
          'INSERT INTO flights (id, origin, destination, airline, aircraft, registration, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          f.id, f.from, f.to, f.airline ?? null, f.aircraft ?? null, f.registration ?? null, f.date ?? null,
        );
      }
    });
  }
}

export function getAllFlights(): Flight[] {
  return db
    .getAllSync<{ id: number; origin: string; destination: string; airline: string | null; aircraft: string | null; registration: string | null; date: string | null }>
    ('SELECT * FROM flights ORDER BY id')
    .map(r => ({
      id:           r.id,
      from:         r.origin,
      to:           r.destination,
      airline:      r.airline      ?? undefined,
      aircraft:     r.aircraft     ?? undefined,
      registration: r.registration ?? undefined,
      date:         r.date         ?? undefined,
    }));
}
