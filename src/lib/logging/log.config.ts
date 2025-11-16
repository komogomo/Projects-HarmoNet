import type { LogConfig, LogLevel } from '@/src/lib/logging/log.types';

const levelOrder: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

const getEnv = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'development';
};

const env = getEnv();

export const defaultLogConfig: LogConfig = {
  enabled: env !== 'test',
  levelThreshold: env === 'production' ? 'INFO' : 'DEBUG',
  maskEmail: true,
};

export const shouldLog = (level: LogLevel, config: LogConfig = defaultLogConfig): boolean => {
  if (!config.enabled) return false;

  const idx = levelOrder.indexOf(level);
  const thresholdIdx = levelOrder.indexOf(config.levelThreshold);
  return idx >= thresholdIdx;
};
