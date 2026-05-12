const fs   = require('fs');
const path = require('path');

//parse a single csv line handling quoted fields
function parseLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const csvPath = path.join(__dirname, 'data', 'airports.csv');
const outPath = path.join(__dirname, 'data', 'airports.ts');

const lines  = fs.readFileSync(csvPath, 'utf8').split('\n');
const header = parseLine(lines[0]);

const iataIdx      = header.indexOf('iata_code');
const latIdx       = header.indexOf('latitude_deg');
const lonIdx       = header.indexOf('longitude_deg');
const nameIdx      = header.indexOf('name');
const cityIdx      = header.indexOf('municipality');
const countryIdx   = header.indexOf('iso_country');
const continentIdx = header.indexOf('continent');

const airports = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cols      = parseLine(line);
  const iata      = cols[iataIdx]?.trim();
  const lat       = parseFloat(cols[latIdx]);
  const lon       = parseFloat(cols[lonIdx]);
  const name      = cols[nameIdx]?.trim()      ?? '';
  const city      = cols[cityIdx]?.trim()      ?? '';
  const country   = cols[countryIdx]?.trim()   ?? '';
  const continent = cols[continentIdx]?.trim() ?? '';
  if (!iata || iata.length !== 3) continue;
  if (isNaN(lat) || isNaN(lon)) continue;
  airports[iata] = { name, city, country, continent, lat, lon };
}

const entries = Object.entries(airports)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, { name, city, country, continent, lat, lon }]) =>
    `  ${code}: { name: ${JSON.stringify(name)}, city: ${JSON.stringify(city)}, country: ${JSON.stringify(country)}, continent: ${JSON.stringify(continent)}, lat: ${lat}, lon: ${lon} },`
  )
  .join('\n');

const output =
`export interface Airport {
  name: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Record<string, Airport> = {
${entries}
};
`;

fs.writeFileSync(outPath, output, 'utf8');
console.log('wrote ' + Object.keys(airports).length + ' airports to data/airports.ts');
