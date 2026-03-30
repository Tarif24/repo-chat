import { env } from '../env.js';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const fileFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) => {
        return stack
            ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
            : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

const consoleFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) => {
        return stack
            ? `[${timestamp}] ${level}: ${message}\n${stack}`
            : `[${timestamp}] ${level}: ${message}`;
    })
);

const dailyRotateTransport = new DailyRotateFile({
    filename: path.join('./logs', '%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '5d',
    format: fileFormat,
});

const logger = winston.createLogger({
    level: env.LOG_LEVEL ?? 'info',
    transports: [
        dailyRotateTransport,
        new winston.transports.Console({
            silent: env.NODE_ENV === 'production',
            format: consoleFormat,
        }),
    ],
});

export default logger;
