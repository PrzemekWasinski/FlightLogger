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
  { id:   2, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2018-03-01' },
  { id:   3, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2018-06-20' },
  { id:   4, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2018-08-15' },
  { id:   5, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2018-10-05' },
  { id:   6, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 767-300ER',   date: '2018-12-22' },
  { id:   7, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2019-01-30' },
  { id:   8, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2019-03-18' },
  { id:   9, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 787-8',       date: '2019-05-07' },
  { id:  10, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2019-07-14' },
  { id:  11, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2019-09-03' },
  { id:  12, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 777-200',     date: '2019-11-28' },
  { id:  13, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 777-300ER',   date: '2020-01-15' },
  { id:  14, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2020-02-26' },
  { id:  15, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2020-09-10' },
  { id:  16, from: 'JFK', to: 'LHR', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2020-10-22' },
  { id:  17, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2021-04-05' },
  { id:  18, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 767-300ER',   date: '2021-06-18' },
  { id:  19, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 787-8',       date: '2021-07-30' },
  { id:  20, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2021-09-14' },
  { id:  21, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2021-11-02' },
  { id:  22, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-300ER',   date: '2021-12-20' },
  { id:  23, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2022-01-08' },
  { id:  24, from: 'JFK', to: 'LHR', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2022-02-25' },
  { id:  25, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2022-03-15' },
  { id:  26, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 777-200',     date: '2022-04-29' },
  { id:  27, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2022-06-03' },
  { id:  28, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 787-8',       date: '2022-07-17' },
  { id:  29, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2022-08-31' },
  { id:  30, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-300ER',   date: '2022-10-12' },
  { id:  31, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2022-11-26' },
  { id:  32, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2022-12-18' },
  { id:  33, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2023-01-22' },
  { id:  34, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 767-300ER',   date: '2023-03-06' },
  { id:  35, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2023-04-20' },
  { id:  36, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 787-8',       date: '2023-05-14' },
  { id:  37, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 777-300ER',   date: '2023-06-28' },
  { id:  38, from: 'JFK', to: 'LHR', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2023-08-09' },
  { id:  39, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2023-09-23' },
  { id:  40, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2023-11-04' },
  { id:  41, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2023-12-17' },
  { id:  42, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 777-200',     date: '2024-01-08' },
  { id:  43, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2024-02-22' },
  { id:  44, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 787-8',       date: '2024-03-07' },
  { id:  45, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 777-300ER',   date: '2024-04-19' },
  { id:  46, from: 'JFK', to: 'LHR', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2024-05-03' },
  { id:  47, from: 'LHR', to: 'JFK', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2024-06-14' },
  { id:  48, from: 'JFK', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 787-10',      date: '2024-07-28' },
  { id:  49, from: 'LHR', to: 'JFK', airline: 'Virgin Atlantic',   aircraft: 'Airbus A350-1000',   date: '2024-08-11' },
  { id:  50, from: 'JFK', to: 'LHR', airline: 'United',            aircraft: 'Boeing 767-300ER',   date: '2024-09-25' },
  { id:  51, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2024-10-09' },
  { id:  52, from: 'JFK', to: 'LHR', airline: 'American Airlines', aircraft: 'Boeing 777-300ER',   date: '2024-11-22' },
  { id:  53, from: 'LHR', to: 'JFK', airline: 'British Airways',   aircraft: 'Boeing 747-400',     date: '2024-12-14' },
  { id:  54, from: 'JFK', to: 'LHR', airline: 'Virgin Atlantic',   aircraft: 'Airbus A330-300',    date: '2025-01-18' },

  //lhr dxb 32 flights
  { id:  55, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2018-03-10' },
  { id:  56, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2018-05-22' },
  { id:  57, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2018-07-14' },
  { id:  58, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2018-09-30' },
  { id:  59, from: 'LHR', to: 'DXB', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2018-12-05' },
  { id:  60, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2019-02-18' },
  { id:  61, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2019-04-25' },
  { id:  62, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2019-07-11' },
  { id:  63, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2019-09-20' },
  { id:  64, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2019-11-08' },
  { id:  65, from: 'LHR', to: 'DXB', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2020-01-24' },
  { id:  66, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2020-09-15' },
  { id:  67, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2021-02-03' },
  { id:  68, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2021-04-17' },
  { id:  69, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2021-06-29' },
  { id:  70, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2021-08-15' },
  { id:  71, from: 'LHR', to: 'DXB', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2021-10-02' },
  { id:  72, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2021-12-19' },
  { id:  73, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2022-02-08' },
  { id:  74, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2022-04-21' },
  { id:  75, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2022-06-10' },
  { id:  76, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2022-08-26' },
  { id:  77, from: 'LHR', to: 'DXB', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2022-10-14' },
  { id:  78, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2022-12-30' },
  { id:  79, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2023-02-16' },
  { id:  80, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2023-05-04' },
  { id:  81, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2023-07-22' },
  { id:  82, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2023-09-08' },
  { id:  83, from: 'LHR', to: 'DXB', airline: 'British Airways',   aircraft: 'Boeing 787-9',       date: '2023-11-24' },
  { id:  84, from: 'DXB', to: 'LHR', airline: 'Emirates',          aircraft: 'Boeing 777-300ER',   date: '2024-01-12' },
  { id:  85, from: 'LHR', to: 'DXB', airline: 'Emirates',          aircraft: 'Airbus A380-800',    date: '2024-04-05' },
  { id:  86, from: 'DXB', to: 'LHR', airline: 'British Airways',   aircraft: 'Boeing 777-200ER',   date: '2024-07-19' },

  //jfk lax 28 flights
  { id:  87, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Boeing 757-200',     date: '2018-01-20' },
  { id:  88, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Airbus A321',        date: '2018-03-08' },
  { id:  89, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A321',        date: '2018-05-15' },
  { id:  90, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Boeing 737-900ER',   date: '2018-07-29' },
  { id:  91, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Airbus A321neo',     date: '2018-10-03' },
  { id:  92, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Boeing 737-800',     date: '2018-12-11' },
  { id:  93, from: 'JFK', to: 'LAX', airline: 'United',             aircraft: 'Airbus A320',        date: '2019-02-24' },
  { id:  94, from: 'LAX', to: 'JFK', airline: 'JetBlue',            aircraft: 'Airbus A320',        date: '2019-04-17' },
  { id:  95, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Boeing 737-900ER',   date: '2019-06-30' },
  { id:  96, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Airbus A321',        date: '2019-09-13' },
  { id:  97, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A321neo',     date: '2019-11-28' },
  { id:  98, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Boeing 737-800',     date: '2020-01-16' },
  { id:  99, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Airbus A321',        date: '2020-09-05' },
  { id: 100, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Boeing 737-800',     date: '2020-11-20' },
  { id: 101, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A320',        date: '2021-02-08' },
  { id: 102, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Airbus A319',        date: '2021-04-24' },
  { id: 103, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Boeing 757-200',     date: '2021-07-10' },
  { id: 104, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Airbus A321',        date: '2021-09-25' },
  { id: 105, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A321neo',     date: '2021-12-04' },
  { id: 106, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Boeing 737-900ER',   date: '2022-02-18' },
  { id: 107, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Airbus A321neo',     date: '2022-05-03' },
  { id: 108, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Boeing 737-800',     date: '2022-08-17' },
  { id: 109, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A321',        date: '2022-11-01' },
  { id: 110, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Airbus A320',        date: '2023-01-29' },
  { id: 111, from: 'JFK', to: 'LAX', airline: 'Delta',              aircraft: 'Boeing 737-900ER',   date: '2023-04-15' },
  { id: 112, from: 'LAX', to: 'JFK', airline: 'American Airlines',  aircraft: 'Airbus A321neo',     date: '2023-07-30' },
  { id: 113, from: 'JFK', to: 'LAX', airline: 'JetBlue',            aircraft: 'Airbus A320',        date: '2023-10-14' },
  { id: 114, from: 'LAX', to: 'JFK', airline: 'United',             aircraft: 'Boeing 737-800',     date: '2024-02-28' },

  //lhr sin 20 flights
  { id: 115, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2018-02-10' },
  { id: 116, from: 'SIN', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2018-05-26' },
  { id: 117, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2018-09-12' },
  { id: 118, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2018-11-28' },
  { id: 119, from: 'LHR', to: 'SIN', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2019-03-04' },
  { id: 120, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2019-06-18' },
  { id: 121, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2019-10-02' },
  { id: 122, from: 'SIN', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 787-10',     date: '2019-12-20' },
  { id: 123, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2020-02-08' },
  { id: 124, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2020-10-14' },
  { id: 125, from: 'LHR', to: 'SIN', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2021-05-30' },
  { id: 126, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2021-08-16' },
  { id: 127, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2021-11-03' },
  { id: 128, from: 'SIN', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 787-10',     date: '2022-02-17' },
  { id: 129, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2022-06-01' },
  { id: 130, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2022-09-22' },
  { id: 131, from: 'LHR', to: 'SIN', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2023-01-08' },
  { id: 132, from: 'SIN', to: 'LHR', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2023-05-14' },
  { id: 133, from: 'LHR', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2023-10-30' },
  { id: 134, from: 'SIN', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 787-10',     date: '2024-03-19' },

  //cdg jfk 18 flights
  { id: 135, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2018-04-11' },
  { id: 136, from: 'JFK', to: 'CDG', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2018-06-27' },
  { id: 137, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2018-09-15' },
  { id: 138, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2018-12-03' },
  { id: 139, from: 'CDG', to: 'JFK', airline: 'Delta',              aircraft: 'Boeing 767-300ER',  date: '2019-03-19' },
  { id: 140, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2019-07-04' },
  { id: 141, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2019-10-20' },
  { id: 142, from: 'JFK', to: 'CDG', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2020-01-08' },
  { id: 143, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2020-10-26' },
  { id: 144, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2021-05-12' },
  { id: 145, from: 'CDG', to: 'JFK', airline: 'Delta',              aircraft: 'Boeing 767-300ER',  date: '2021-08-28' },
  { id: 146, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2021-11-16' },
  { id: 147, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2022-03-04' },
  { id: 148, from: 'JFK', to: 'CDG', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2022-07-20' },
  { id: 149, from: 'CDG', to: 'JFK', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2022-11-08' },
  { id: 150, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2023-02-24' },
  { id: 151, from: 'CDG', to: 'JFK', airline: 'Delta',              aircraft: 'Boeing 767-300ER',  date: '2023-09-06' },
  { id: 152, from: 'JFK', to: 'CDG', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2024-01-22' },

  //fra jfk 15 flights
  { id: 153, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2018-05-17' },
  { id: 154, from: 'JFK', to: 'FRA', airline: 'United',             aircraft: 'Boeing 767-300ER',  date: '2018-08-30' },
  { id: 155, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Airbus A340-600',   date: '2019-01-14' },
  { id: 156, from: 'JFK', to: 'FRA', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2019-05-28' },
  { id: 157, from: 'FRA', to: 'JFK', airline: 'United',             aircraft: 'Boeing 777-200',    date: '2019-09-11' },
  { id: 158, from: 'JFK', to: 'FRA', airline: 'Lufthansa',          aircraft: 'Airbus A340-600',   date: '2020-01-25' },
  { id: 159, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2020-10-08' },
  { id: 160, from: 'JFK', to: 'FRA', airline: 'United',             aircraft: 'Boeing 767-300ER',  date: '2021-03-22' },
  { id: 161, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Airbus A380-800',   date: '2021-07-07' },
  { id: 162, from: 'JFK', to: 'FRA', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2021-10-19' },
  { id: 163, from: 'FRA', to: 'JFK', airline: 'United',             aircraft: 'Boeing 777-200',    date: '2022-02-03' },
  { id: 164, from: 'JFK', to: 'FRA', airline: 'Lufthansa',          aircraft: 'Airbus A380-800',   date: '2022-06-17' },
  { id: 165, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Boeing 747-8',      date: '2023-01-31' },
  { id: 166, from: 'JFK', to: 'FRA', airline: 'United',             aircraft: 'Boeing 767-300ER',  date: '2023-08-14' },
  { id: 167, from: 'FRA', to: 'JFK', airline: 'Lufthansa',          aircraft: 'Airbus A340-600',   date: '2024-02-28' },

  //ams jfk 12 flights
  { id: 168, from: 'AMS', to: 'JFK', airline: 'KLM',                aircraft: 'Boeing 777-200ER',  date: '2018-06-14' },
  { id: 169, from: 'JFK', to: 'AMS', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2018-09-27' },
  { id: 170, from: 'AMS', to: 'JFK', airline: 'KLM',                aircraft: 'Boeing 787-9',      date: '2019-02-11' },
  { id: 171, from: 'JFK', to: 'AMS', airline: 'KLM',                aircraft: 'Boeing 777-200ER',  date: '2019-07-24' },
  { id: 172, from: 'AMS', to: 'JFK', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2019-12-09' },
  { id: 173, from: 'JFK', to: 'AMS', airline: 'KLM',                aircraft: 'Boeing 787-9',      date: '2020-02-25' },
  { id: 174, from: 'AMS', to: 'JFK', airline: 'KLM',                aircraft: 'Boeing 777-200ER',  date: '2021-04-10' },
  { id: 175, from: 'JFK', to: 'AMS', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2021-09-23' },
  { id: 176, from: 'AMS', to: 'JFK', airline: 'KLM',                aircraft: 'Boeing 787-9',      date: '2022-01-07' },
  { id: 177, from: 'JFK', to: 'AMS', airline: 'KLM',                aircraft: 'Boeing 777-200ER',  date: '2022-07-21' },
  { id: 178, from: 'AMS', to: 'JFK', airline: 'Delta',              aircraft: 'Airbus A330-300',   date: '2023-03-08' },
  { id: 179, from: 'JFK', to: 'AMS', airline: 'KLM',                aircraft: 'Boeing 787-9',      date: '2023-11-16' },

  //dxb sin 10 flights
  { id: 180, from: 'DXB', to: 'SIN', airline: 'Emirates',           aircraft: 'Airbus A380-800',   date: '2018-07-08' },
  { id: 181, from: 'SIN', to: 'DXB', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2018-11-21' },
  { id: 182, from: 'DXB', to: 'SIN', airline: 'Emirates',           aircraft: 'Boeing 777-300ER',  date: '2019-04-07' },
  { id: 183, from: 'SIN', to: 'DXB', airline: 'Emirates',           aircraft: 'Airbus A380-800',   date: '2019-08-19' },
  { id: 184, from: 'DXB', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2020-01-04' },
  { id: 185, from: 'SIN', to: 'DXB', airline: 'Emirates',           aircraft: 'Boeing 777-300ER',  date: '2021-03-17' },
  { id: 186, from: 'DXB', to: 'SIN', airline: 'Emirates',           aircraft: 'Airbus A380-800',   date: '2021-10-30' },
  { id: 187, from: 'SIN', to: 'DXB', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2022-05-15' },
  { id: 188, from: 'DXB', to: 'SIN', airline: 'Emirates',           aircraft: 'Boeing 777-300ER',  date: '2023-02-28' },
  { id: 189, from: 'SIN', to: 'DXB', airline: 'Emirates',           aircraft: 'Airbus A380-800',   date: '2023-09-12' },

  //lhr nrt 9 flights
  { id: 190, from: 'LHR', to: 'NRT', airline: 'JAL',                aircraft: 'Boeing 777-300ER',  date: '2018-08-22' },
  { id: 191, from: 'NRT', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2019-01-09' },
  { id: 192, from: 'LHR', to: 'NRT', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2019-06-25' },
  { id: 193, from: 'NRT', to: 'LHR', airline: 'JAL',                aircraft: 'Boeing 787-9',      date: '2019-11-13' },
  { id: 194, from: 'LHR', to: 'NRT', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2020-09-30' },
  { id: 195, from: 'NRT', to: 'LHR', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2021-07-14' },
  { id: 196, from: 'LHR', to: 'NRT', airline: 'JAL',                aircraft: 'Boeing 787-9',      date: '2022-04-08' },
  { id: 197, from: 'NRT', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 777-300ER',  date: '2022-12-26' },
  { id: 198, from: 'LHR', to: 'NRT', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2023-08-01' },

  //sin syd 8 flights
  { id: 199, from: 'SIN', to: 'SYD', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2018-04-15' },
  { id: 200, from: 'SYD', to: 'SIN', airline: 'Qantas',             aircraft: 'Airbus A380-800',   date: '2018-10-29' },
  { id: 201, from: 'SIN', to: 'SYD', airline: 'Qantas',             aircraft: 'Boeing 787-9',      date: '2019-05-18' },
  { id: 202, from: 'SYD', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2019-12-01' },
  { id: 203, from: 'SIN', to: 'SYD', airline: 'Singapore Airlines', aircraft: 'Airbus A380-800',   date: '2021-06-05' },
  { id: 204, from: 'SYD', to: 'SIN', airline: 'Qantas',             aircraft: 'Airbus A380-800',   date: '2022-02-19' },
  { id: 205, from: 'SIN', to: 'SYD', airline: 'Qantas',             aircraft: 'Boeing 787-9',      date: '2022-11-07' },
  { id: 206, from: 'SYD', to: 'SIN', airline: 'Singapore Airlines', aircraft: 'Airbus A350-900',   date: '2023-07-23' },

  //doh lhr 7 flights
  { id: 207, from: 'DOH', to: 'LHR', airline: 'Qatar Airways',      aircraft: 'Airbus A380-800',   date: '2018-09-06' },
  { id: 208, from: 'LHR', to: 'DOH', airline: 'Qatar Airways',      aircraft: 'Boeing 787-9',      date: '2019-03-22' },
  { id: 209, from: 'DOH', to: 'LHR', airline: 'Qatar Airways',      aircraft: 'Airbus A350-900',   date: '2019-10-08' },
  { id: 210, from: 'LHR', to: 'DOH', airline: 'Qatar Airways',      aircraft: 'Airbus A380-800',   date: '2020-12-24' },
  { id: 211, from: 'DOH', to: 'LHR', airline: 'Qatar Airways',      aircraft: 'Boeing 787-9',      date: '2021-08-11' },
  { id: 212, from: 'LHR', to: 'DOH', airline: 'Qatar Airways',      aircraft: 'Airbus A350-900',   date: '2022-05-27' },
  { id: 213, from: 'DOH', to: 'LHR', airline: 'Qatar Airways',      aircraft: 'Airbus A380-800',   date: '2023-11-14' },

  //icn lax 6 flights
  { id: 214, from: 'ICN', to: 'LAX', airline: 'Korean Air',         aircraft: 'Boeing 777-300ER',  date: '2018-10-17' },
  { id: 215, from: 'LAX', to: 'ICN', airline: 'Asiana',             aircraft: 'Boeing 777-200ER',  date: '2019-04-03' },
  { id: 216, from: 'ICN', to: 'LAX', airline: 'Korean Air',         aircraft: 'Airbus A380-800',   date: '2020-02-20' },
  { id: 217, from: 'LAX', to: 'ICN', airline: 'Korean Air',         aircraft: 'Boeing 777-300ER',  date: '2021-09-07' },
  { id: 218, from: 'ICN', to: 'LAX', airline: 'Asiana',             aircraft: 'Boeing 777-200ER',  date: '2022-06-23' },
  { id: 219, from: 'LAX', to: 'ICN', airline: 'Korean Air',         aircraft: 'Airbus A380-800',   date: '2023-12-05' },

  //jfk mia 5 flights
  { id: 220, from: 'JFK', to: 'MIA', airline: 'American Airlines',  aircraft: 'Boeing 737-800',    date: '2019-01-28' },
  { id: 221, from: 'MIA', to: 'JFK', airline: 'Delta',              aircraft: 'Boeing 717-200',    date: '2019-08-12' },
  { id: 222, from: 'JFK', to: 'MIA', airline: 'American Airlines',  aircraft: 'Airbus A321',       date: '2021-04-04' },
  { id: 223, from: 'MIA', to: 'JFK', airline: 'American Airlines',  aircraft: 'Boeing 737-800',    date: '2022-09-18' },
  { id: 224, from: 'JFK', to: 'MIA', airline: 'Delta',              aircraft: 'Boeing 737-900ER',  date: '2024-03-01' },

  //lax nrt 5 flights
  { id: 225, from: 'LAX', to: 'NRT', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2018-12-27' },
  { id: 226, from: 'NRT', to: 'LAX', airline: 'JAL',                aircraft: 'Boeing 787-9',      date: '2019-07-15' },
  { id: 227, from: 'LAX', to: 'NRT', airline: 'United',             aircraft: 'Boeing 777-200',    date: '2021-05-03' },
  { id: 228, from: 'NRT', to: 'LAX', airline: 'ANA',                aircraft: 'Boeing 787-9',      date: '2022-10-19' },
  { id: 229, from: 'LAX', to: 'NRT', airline: 'JAL',                aircraft: 'Boeing 777-300ER',  date: '2024-02-07' },

  //lhr bom 4 flights
  { id: 230, from: 'LHR', to: 'BOM', airline: 'Air India',          aircraft: 'Boeing 787-8',      date: '2019-05-06' },
  { id: 231, from: 'BOM', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 787-10',     date: '2020-11-18' },
  { id: 232, from: 'LHR', to: 'BOM', airline: 'Air India',          aircraft: 'Boeing 777-200LR',  date: '2022-08-03' },
  { id: 233, from: 'BOM', to: 'LHR', airline: 'British Airways',    aircraft: 'Boeing 787-10',     date: '2024-01-15' },

  //gru lhr 4 flights
  { id: 234, from: 'GRU', to: 'LHR', airline: 'LATAM',              aircraft: 'Boeing 777-300ER',  date: '2018-11-04' },
  { id: 235, from: 'LHR', to: 'GRU', airline: 'British Airways',    aircraft: 'Boeing 777-200ER',  date: '2020-08-21' },
  { id: 236, from: 'GRU', to: 'LHR', airline: 'LATAM',              aircraft: 'Boeing 787-9',      date: '2022-04-16' },
  { id: 237, from: 'LHR', to: 'GRU', airline: 'LATAM',              aircraft: 'Boeing 777-300ER',  date: '2023-12-28' },

  //cdg nrt 4 flights
  { id: 238, from: 'CDG', to: 'NRT', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2019-08-18' },
  { id: 239, from: 'NRT', to: 'CDG', airline: 'Air France',         aircraft: 'Boeing 777-300ER',  date: '2020-09-01' },
  { id: 240, from: 'CDG', to: 'NRT', airline: 'JAL',                aircraft: 'Boeing 777-300ER',  date: '2022-02-14' },
  { id: 241, from: 'NRT', to: 'CDG', airline: 'Air France',         aircraft: 'Airbus A350-900',   date: '2023-06-30' },

  //jfk ord 3 flights
  { id: 242, from: 'JFK', to: 'ORD', airline: 'United',             aircraft: 'Boeing 737-900ER',  date: '2020-06-14' },
  { id: 243, from: 'ORD', to: 'JFK', airline: 'American Airlines',  aircraft: 'Boeing 737-800',    date: '2022-03-29' },
  { id: 244, from: 'JFK', to: 'ORD', airline: 'United',             aircraft: 'Airbus A320',       date: '2024-08-11' },

  //mex jfk 3 flights
  { id: 245, from: 'MEX', to: 'JFK', airline: 'Aeromexico',         aircraft: 'Boeing 787-9',      date: '2019-10-02' },
  { id: 246, from: 'JFK', to: 'MEX', airline: 'Delta',              aircraft: 'Boeing 737-800',    date: '2021-12-29' },
  { id: 247, from: 'MEX', to: 'JFK', airline: 'Aeromexico',         aircraft: 'Boeing 737 MAX 8',  date: '2023-05-17' },

  //syd lax 3 flights
  { id: 248, from: 'SYD', to: 'LAX', airline: 'Qantas',             aircraft: 'Airbus A380-800',   date: '2019-06-09' },
  { id: 249, from: 'LAX', to: 'SYD', airline: 'Qantas',             aircraft: 'Boeing 787-9',      date: '2021-11-22' },
  { id: 250, from: 'SYD', to: 'LAX', airline: 'United',             aircraft: 'Boeing 787-9',      date: '2023-04-08' },
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
