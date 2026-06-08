export default async function globalTeardown() {
    // Stop the MongoDB instance that globalSetup started
    await global.__MONGOINSTANCE.stop();
    console.log('\nMongoDB Memory Server stopped.');
}
