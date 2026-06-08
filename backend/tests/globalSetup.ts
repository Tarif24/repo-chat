import { MongoMemoryServer } from 'mongodb-memory-server';

// This is a module-level variable that persists between globalSetup and globalTeardown
// We store it so globalTeardown can stop the same server instance
declare global {
    // eslint-disable-next-line no-var
    var __MONGOINSTANCE: MongoMemoryServer;
}

export default async function globalSetup() {
    // Create and start the in-memory MongoDB server
    const instance = await MongoMemoryServer.create({
        instance: {},
    });

    // Get the connection string
    const uri = instance.getUri();

    // Store the instance on global so globalTeardown can access it
    global.__MONGOINSTANCE = instance;

    // Store the URI in an environment variable so your test files can read it
    process.env.MONGO_TEST_URI = uri;

    console.log(`\nMongoDB Memory Server started at: ${uri}`);
}
