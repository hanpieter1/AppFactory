// REQ-004: Structured Logging with JSON format
import winston from 'winston';
import config from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: {
    service: config.name,
    version: config.version,
  },
  transports: [
    new winston.transports.Console({
      format:
        config.env === 'development'
          ? winston.format.combine(winston.format.colorize(), winston.format.simple())
          : logFormat,
    }),
  ],
});

// Create a child logger with request context
export function createRequestLogger(requestId: string): winston.Logger {
  return logger.child({ requestId });
}
