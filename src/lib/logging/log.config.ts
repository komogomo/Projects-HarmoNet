import type { LogConfig, LogLevel } from '@/src/lib/logging/log.types';

const levelOrder: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

const getEnv = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'development';
};

const env = getEnv();

const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }
  return undefined;
};

const parseBool = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const lowered = value.toLowerCase();
  if (lowered === '1' || lowered === 'true' || lowered === 'yes') return true;
  if (lowered === '0' || lowered === 'false' || lowered === 'no') return false;
  return undefined;
};

const isNextBuildPhase = (): boolean => {
  const phase = getEnvVar('NEXT_PHASE');
  return phase === 'phase-production-build';
};

const resolveThreshold = (): LogLevel => {
  const fromEnv = getEnvVar('NEXT_PUBLIC_LOG_LEVEL') ?? getEnvVar('LOG_LEVEL');
  if (fromEnv === 'DEBUG' || fromEnv === 'INFO' || fromEnv === 'WARN' || fromEnv === 'ERROR') {
    return fromEnv;
  }
  return env === 'production' ? 'INFO' : 'DEBUG';
};

export const defaultLogConfig: LogConfig = {
  enabled:
    parseBool(getEnvVar('NEXT_PUBLIC_LOG_ENABLED') ?? getEnvVar('LOG_ENABLED')) ??
    (env !== 'test' && !isNextBuildPhase()),
  levelThreshold: resolveThreshold(),
  maskEmail: true,
};

export const shouldLog = (level: LogLevel, config: LogConfig = defaultLogConfig): boolean => {
  if (!config.enabled) return false;

  const idx = levelOrder.indexOf(level);
  const thresholdIdx = levelOrder.indexOf(config.levelThreshold);
  return idx >= thresholdIdx;
};
