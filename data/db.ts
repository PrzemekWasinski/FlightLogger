import * as SQLite from 'expo-sqlite';
import { AIRPORTS } from './airports';

export interface Flight {
  id: number;
  from: string;
  to: string;
  airline?: string;
  aircraft?: string;
  registration?: string;
  date?: string;
  msn?: string;
  dep_runway?: string;
  arr_runway?: string;
  cruise_altitude?: string;
  cabin_class?: string;
  distance_km?: number;
}

const SEED: Flight[] = [];

const db = SQLite.openDatabaseSync('flightlogger.db');

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function calcDistance(from: string, to: string): number | null {
  const a = AIRPORTS[from];
  const b = AIRPORTS[to];
  if (!a || !b) return null;
  return haversineKm(a.lat, a.lon, b.lat, b.lon);
}

export function initDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS flights (
      id           INTEGER PRIMARY KEY,
      origin       TEXT NOT NULL,
      destination  TEXT NOT NULL,
      airline      TEXT,
      aircraft     TEXT,
      registration TEXT,
      date         TEXT,
      msn          TEXT,
      dep_runway   TEXT,
      arr_runway   TEXT,
      cruise_altitude TEXT,
      cabin_class  TEXT,
      distance_km  REAL
    );
  `);
  //add distance_km to existing dbs that predate this column
  try { db.execSync('ALTER TABLE flights ADD COLUMN distance_km REAL'); } catch {}
  try { db.execSync('ALTER TABLE flights ADD COLUMN msn TEXT'); } catch {}
  try { db.execSync('ALTER TABLE flights ADD COLUMN dep_runway TEXT'); } catch {}
  try { db.execSync('ALTER TABLE flights ADD COLUMN arr_runway TEXT'); } catch {}
  try { db.execSync('ALTER TABLE flights ADD COLUMN cruise_altitude TEXT'); } catch {}
  try { db.execSync('ALTER TABLE flights ADD COLUMN cabin_class TEXT'); } catch {}

  //backfill distance_km for any rows that are missing it
  const needsDist = db.getAllSync<{ id: number; origin: string; destination: string }>(
    'SELECT id, origin, destination FROM flights WHERE distance_km IS NULL'
  );
  if (needsDist.length > 0) {
    db.withTransactionSync(() => {
      for (const r of needsDist) {
        const dist = calcDistance(r.origin, r.destination);
        if (dist !== null) db.runSync('UPDATE flights SET distance_km = ? WHERE id = ?', dist, r.id);
      }
    });
  }

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

export function insertFlight(
  from: string,
  to: string,
  airline?: string,
  aircraft?: string,
  registration?: string,
  date?: string,
  msn?: string,
  dep_runway?: string,
  arr_runway?: string,
  cruise_altitude?: string,
  cabin_class?: string,
): void {
  db.runSync(
    'INSERT INTO flights (origin, destination, airline, aircraft, registration, date, msn, dep_runway, arr_runway, cruise_altitude, cabin_class, distance_km) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    from, to, airline ?? null, aircraft ?? null, registration ?? null, date ?? null,
    msn ?? null, dep_runway ?? null, arr_runway ?? null, cruise_altitude ?? null, cabin_class ?? null,
    calcDistance(from, to),
  );
}

export function deleteFlight(id: number): void {
  db.runSync('DELETE FROM flights WHERE id = ?', id);
}

export function updateFlight(
  id: number,
  from: string,
  to: string,
  airline?: string,
  aircraft?: string,
  registration?: string,
  date?: string,
  msn?: string,
  dep_runway?: string,
  arr_runway?: string,
  cruise_altitude?: string,
  cabin_class?: string,
): void {
  db.runSync(
    'UPDATE flights SET origin = ?, destination = ?, airline = ?, aircraft = ?, registration = ?, date = ?, msn = ?, dep_runway = ?, arr_runway = ?, cruise_altitude = ?, cabin_class = ?, distance_km = ? WHERE id = ?',
    from, to, airline ?? null, aircraft ?? null, registration ?? null, date ?? null,
    msn ?? null, dep_runway ?? null, arr_runway ?? null, cruise_altitude ?? null, cabin_class ?? null,
    calcDistance(from, to), id,
  );
}

export function getAllFlights(): Flight[] {
  return db
    .getAllSync<{
      id: number; origin: string; destination: string; airline: string | null; aircraft: string | null;
      registration: string | null; date: string | null; msn: string | null; dep_runway: string | null;
      arr_runway: string | null; cruise_altitude: string | null; cabin_class: string | null; distance_km: number | null;
    }>
    ('SELECT * FROM flights ORDER BY id')
    .map(r => ({
      id:           r.id,
      from:         r.origin,
      to:           r.destination,
      airline:      r.airline      ?? undefined,
      aircraft:     r.aircraft     ?? undefined,
      registration: r.registration ?? undefined,
      date:         r.date         ?? undefined,
      msn:          r.msn          ?? undefined,
      dep_runway:   r.dep_runway   ?? undefined,
      arr_runway:   r.arr_runway   ?? undefined,
      cruise_altitude: r.cruise_altitude ?? undefined,
      cabin_class:  r.cabin_class  ?? undefined,
      distance_km:  r.distance_km  ?? undefined,
    }));
}
