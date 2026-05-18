export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  time: string;
}

let _nextId = 0;
const _logs: LogEntry[] = [];
const MAX_LOGS = 200;

export function log(level: LogLevel, message: string) {
  _logs.unshift({
    id: _nextId++,
    level,
    message,
    time: new Date().toLocaleTimeString('en', { hour12: false }),
  });
  if (_logs.length > MAX_LOGS) _logs.pop();
}

export function getLogs(): readonly LogEntry[] { return _logs; }
export function clearLogs() { _logs.length = 0; }

// Intercept console.error / console.warn so runtime errors are captured automatically
const _origError = console.error.bind(console);
const _origWarn  = console.warn.bind(console);

console.error = (...args: unknown[]) => {
  log('error', args.map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : String(a))).join(' '));
  _origError(...args);
};

console.warn = (...args: unknown[]) => {
  log('warn', args.map(String).join(' '));
  _origWarn(...args);
};
