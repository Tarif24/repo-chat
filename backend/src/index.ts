import dotenv from 'dotenv';
import 'dotenv/config';
import express from 'express';
import { createRequire } from 'module';
import { appConfig } from './config/config.js';

import { errorHandler, globalLimiter, requestLogger, responseHandler } from './middleware/index.js';
import { ingest, query, health } from './routes/index.js';
import connectToDatabase from './database/connection.js';
import logger from './lib/logger.js';

// Init and config setting up express app and dotenv
const require = createRequire(import.meta.url);
const app = express();
const cors = require('cors');
dotenv.config();

// Allowed origins for CORS
const allowedOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://repo-chat.tarifmohammad.com',
];

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);

    if (!app) {
        logger.error('Express app instance not found, forcing shutdown');
        process.exit(1);
    }

    // Force close after 3 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 3000);
};

// Server signal handling
const serverSignalHandler = () => {
    // Shutdown signals handling
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, initiating graceful shutdown');
        gracefulShutdown('SIGTERM');
    });
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', err => {
        logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
        //gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
        //gracefulShutdown('UNHANDLED_REJECTION');
    });
};

const startServer = async () => {
    try {
        logger.info('Application setup initiated');

        // Setting up express middleware

        // CORS
        app.use(
            cors({
                origin: (
                    origin: string | undefined,
                    callback: (err: Error | null, allow?: boolean) => void
                ) => {
                    // Allow requests with no origin (like mobile apps or curl)
                    if (!origin) {
                        return callback(null, true);
                    }
                    if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    } else {
                        return callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
            })
        );
        // JSON body parsing
        app.use(express.json());
        // Request logging
        app.use(requestLogger);
        // Rate limiting
        app.use(globalLimiter);
        // Standard response formatting
        app.use(responseHandler);

        const PORT = appConfig.port || 8080;

        logger.info('Setting up server signal handlers');
        serverSignalHandler();

        logger.info('Connecting to database');
        const DBConnection = await connectToDatabase();

        if (DBConnection) {
            logger.info(`Starting server`);
            app.listen(PORT, () => {
                logger.info(`SERVER IS RUNNING ON PORT ${PORT}`);
            });

            logger.info('Setting up express routes for ingest and query');
            app.use('/api/ingest', ingest);
            app.use('/api/query', query);
            app.use('/api/health', health);

            logger.info('Application setup complete');
        } else {
            logger.error('Failed to connect to database, shutting down');
            process.exit(1);
        }

        // Global error handling middleware
        app.use(errorHandler);
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
await startServer();
