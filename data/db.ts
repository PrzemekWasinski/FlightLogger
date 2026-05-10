import * as SQLite from 'expo-sqlite';

export interface Flight {
  id: number;
  from: string;
  to: string;
  airline?: string;
  aircraft?: string;
  registration?: string;
  date?: string;
}

//route frequencies lhr-jfk 54, lhr-dxb 32, jfk-lax 28, lhr-sin 20, cdg-jfk 18
//fra-jfk 15, ams-jfk 12, dxb-sin 10, lhr-nrt 9, sin-syd 8, doh-lhr 7
//icn-lax 6, jfk-mia 5, lax-nrt 5, lhr-bom 4, gru-lhr 4, cdg-nrt 4
//jfk-ord 3, mex-jfk 3, syd-lax 3
const SEED: Flight[] = [
  //lhr jfk 54 flights most common
  { id:   1, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2018-02-14' },
  
];

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
      for (const f of SEED) {
        db.runSync(
          'INSERT INTO flights (id, origin, destination, airline, aircraft, registration, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          f.id, f.from, f.to, f.airline ?? null, f.aircraft ?? null, f.registration ?? null, f.date ?? null,
        );
      }
    });
  }
}

export function insertFlight(from: string, to: string, airline?: string, aircraft?: string): void {
  db.runSync(
    'INSERT INTO flights (origin, destination, airline, aircraft) VALUES (?, ?, ?, ?)',
    from, to, airline ?? null, aircraft ?? null,
  );
}

export function deleteFlight(id: number): void {
  db.runSync('DELETE FROM flights WHERE id = ?', id);
}

export function updateFlight(id: number, from: string, to: string, airline?: string, aircraft?: string): void {
  db.runSync(
    'UPDATE flights SET origin = ?, destination = ?, airline = ?, aircraft = ? WHERE id = ?',
    from, to, airline ?? null, aircraft ?? null, id,
  );
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
