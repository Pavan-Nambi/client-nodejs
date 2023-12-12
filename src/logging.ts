import winston from 'winston';

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, file }) => {
      return `${timestamp} [${file}] ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});
