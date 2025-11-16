export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogPayload {
  level: LogLevel;
  timestamp: string; // ISO8601 UTC
  event: string; // e.g. 'auth.login.success.magiclink'
  message?: string;
  screen?: string;
  context?: Record<string, unknown>;
}

export interface LogConfig {
  enabled: boolean;
  levelThreshold: LogLevel;
  maskEmail: boolean;
}
