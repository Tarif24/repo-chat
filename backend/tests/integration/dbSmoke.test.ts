import mongoose from 'mongoose';

describe('database smoke test', () => {
    it('mongoose is connected to the in-memory server', () => {
        // 1 = connected in Mongoose's state machine
        expect(mongoose.connection.readyState).toBe(1);
    });

    it('can write and read a document', async () => {
        const TestModel = mongoose.model('Test', new mongoose.Schema({ value: String }));
        await TestModel.create({ value: 'hello' });
        const found = await TestModel.findOne({ value: 'hello' });
        expect(found?.value).toBe('hello');
    });
});
