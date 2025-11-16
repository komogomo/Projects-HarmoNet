import { defaultLogConfig, shouldLog } from '@/src/lib/logging/log.config';
import type { LogLevel, LogPayload } from '@/src/lib/logging/log.types';

const maskSensitive = (context?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!context) return undefined;

  const cloned: Record<string, unknown> = { ...context };

  for (const key of Object.keys(cloned)) {
    const value = cloned[key];
    if (typeof value === 'string' && /@/.test(value)) {
      cloned[key] = '[masked-email]';
    }
  }

  return cloned;
};

const buildPayload = (level: LogLevel, event: string, context?: Record<string, unknown>): LogPayload => {
  const base: LogPayload = {
    level,
    timestamp: new Date().toISOString(),
    event,
  };

  const maskedContext = defaultLogConfig.maskEmail ? maskSensitive(context) : context;

  return maskedContext ? { ...base, context: maskedContext } : base;
};

const emit = (level: LogLevel, event: string, context?: Record<string, unknown>): void => {
  if (!shouldLog(level, defaultLogConfig)) return;

  const payload = buildPayload(level, event, context);
  const json = JSON.stringify(payload);

  switch (level) {
    case 'ERROR':
      console.error(json);
      break;
    case 'WARN':
      console.warn(json);
      break;
    case 'INFO':
      console.info(json);
      break;
    default:
      console.log(json);
  }
};

export const logDebug = (event: string, context?: Record<string, unknown>): void => emit('DEBUG', event, context);
export const logInfo = (event: string, context?: Record<string, unknown>): void => emit('INFO', event, context);
export const logWarn = (event: string, context?: Record<string, unknown>): void => emit('WARN', event, context);
export const logError = (event: string, context?: Record<string, unknown>): void => emit('ERROR', event, context);
