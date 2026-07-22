import mongoose from 'mongoose';

const ingestProgress = new mongoose.Schema(
    {
        repoURL: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ['idle', 'processing', 'complete', 'error'],
            default: 'idle',
        },
        statusMessage: {
            type: String,
            default: '',
        },
        statusStage: {
            type: String,
            enum: [
                'cloning',
                'scanning',
                'scanResult',
                'storageCheck',
                'chunking',
                'embeddingAndProcessing',
                'complete',
                'error',
            ],
            default: 'cloning',
        },
        statusMeta: {
            type: Object,
            default: {},
        },
        statusUpdatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('IngestProgress', ingestProgress);
