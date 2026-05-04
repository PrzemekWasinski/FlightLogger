export interface Flight {
  id: number;
  from: string;
  to: string;
  airline?: string;
  aircraft?: string;
  registration?: string;
  date?: string;
}

// Each entry = one distinct flight. Same route can appear multiple times
// with different airlines or aircraft — that's intentional.
export const SAMPLE_FLIGHTS: Flight[] = [
  // ── LHR → JFK  (4 flights, 3 airlines) ─────────────────────────────────
  { id:  1, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2022-03-15' },
  { id:  2, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-343',    date: '2022-11-02' },
  { id:  3, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2023-04-20' },
  { id:  4, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2024-01-08' },

  // ── LHR → DXB  (3 flights, 2 airlines) ─────────────────────────────────
  { id:  5, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2022-06-10' },
  { id:  6, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2023-01-22' },
  { id:  7, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2024-03-14' },

  // ── LHR → SIN  (2 flights) ──────────────────────────────────────────────
  { id:  8, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2023-07-05' },
  { id:  9, from: 'SIN', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2023-07-19' },

  // ── JFK → LAX  (2 flights) ──────────────────────────────────────────────
  { id: 10, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Boeing 737-900ER',  date: '2022-08-30' },
  { id: 11, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Airbus A320neo',    date: '2023-09-11' },

  // ── DOH → LHR  (2 flights) ──────────────────────────────────────────────
  { id: 12, from: 'DOH', to: 'LHR', airline: 'Qatar Airways',      aircraft: 'Airbus A380-800',   date: '2022-12-25' },
  { id: 13, from: 'LHR', to: 'DOH', airline: 'Qatar Airways',      aircraft: 'Boeing 787-9',      date: '2024-02-17' },

  // ── AMS → JFK  (2 flights) ──────────────────────────────────────────────
  { id: 14, from: 'AMS', to: 'JFK', airline: 'KLM',                aircraft: 'Boeing 777-200ER',  date: '2023-05-03' },
  { id: 15, from: 'JFK', to: 'AMS', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2023-10-29' },

  // ── Single-leg routes ────────────────────────────────────────────────────
  { id: 16, from: 'LHR', to: 'NRT', airline: 'JAL',                aircraft: 'Boeing 787-9',      date: '2023-03-18' },
  { id: 17, from: 'DXB', to: 'SIN', airline: 'Emirates',           aircraft: 'Boeing 777-300ER',  date: '2023-06-27' },
  { id: 18, from: 'SIN', to: 'SYD', airline: 'Qantas',             aircraft: 'Airbus A380-800',   date: '2023-08-14' },
  { id: 19, from: 'LAX', to: 'NRT', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2024-04-02' },
  { id: 20, from: 'GRU', to: 'LHR', airline: 'LATAM',              aircraft: 'Boeing 777-300ER',  date: '2023-11-15' },
  { id: 21, from: 'CDG', to: 'NRT', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2022-09-06' },
  { id: 22, from: 'FRA', to: 'ORD', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2023-02-28' },
  { id: 23, from: 'ICN', to: 'LAX', airline: 'Korean Air',         aircraft: 'Boeing 777-300ER',  date: '2024-01-20' },
  { id: 24, from: 'SYD', to: 'LAX', airline: 'Qantas',             aircraft: 'Airbus A380-800',   date: '2022-07-12' },
  { id: 25, from: 'MEX', to: 'JFK', airline: 'Aeromexico',         aircraft: 'Boeing 787-9',      date: '2023-12-10' },
];
