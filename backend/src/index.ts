import express from 'express';
import dotenv from 'dotenv';
import { createRequire } from 'module';

import { errorHandler, globalLimiter, strictLimiter, requestLogger } from './middleware/index.js';
import { ingest, query } from './routes/index.js';
import connectToDatabase from './database/connection.js';

// Init and config setting up express app and dotenv
const require = createRequire(import.meta.url);
const app = express();
const cors = require('cors');
dotenv.config();

// Graceful shutdown handling
const gracefulShutdown = (signal: String) => {
    console.log(`${signal} received, shutting down gracefully`);

    if (!app) {
        console.log('Server is not running');
        process.exit(1);
    }

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Server signal handling
const serverSignalHandler = () => {
    // Shutdown signals handling
    process.on('SIGTERM', () => {
        console.log('SIGTERM handler called');
        gracefulShutdown('SIGTERM');
    });
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', err => {
        console.error('Uncaught Exception:', err);
        //gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        //gracefulShutdown('UNHANDLED_REJECTION');
    });
};

const startServer = async () => {
    try {
        console.log('Starting application setup');

        // Setting up express middleware

        // CORS
        app.use(cors());
        // JSON body parsing
        app.use(express.json());
        // Request logging
        app.use(requestLogger);
        // Rate limiting
        app.use(globalLimiter);

        const PORT = process.env.PORT || 5000;

        console.log('Setting up server signal handlers');
        serverSignalHandler();

        console.log('Connecting to database');
        const DBConnection = await connectToDatabase();

        if (DBConnection) {
            console.log('Starting server');
            app.listen(PORT, () => {
                console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
            });

            console.log('Setting up express routes for ingest and query');
            app.use('/api/ingest', ingest);
            app.use('/api/query', query);

            console.log('Application setup complete');
        } else {
            console.error('Failed to connect to database, shutting down');
            process.exit(1);
        }

        // Global error handling middleware
        app.use(errorHandler);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
