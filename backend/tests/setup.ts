import mongoose from 'mongoose';

beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI;
    if (!uri) {
        throw new Error('MONGO_TEST_URI not set — did globalSetup run?');
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    // Force close any remaining connections
    await new Promise<void>(resolve => setTimeout(resolve, 500));
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key]?.deleteMany({});
    }
});
