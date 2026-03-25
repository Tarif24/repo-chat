import { env } from '../env.js';
import mongoose from 'mongoose';
import './models/index.js'; // Import all models to register schemas

const connectToDatabase = async () => {
    try {
        // This is where it actually connects to mongoDB via the url
        await mongoose.connect(env.MONGO_URL || '');

        console.log('Connected to MongoDB with Mongoose');

        // Ensure all schema indexes are created
        await Promise.all(Object.values(mongoose.models).map(model => model.ensureIndexes()));

        console.log('All model indexes ensured');

        return mongoose.connection.db;
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

export default connectToDatabase;
