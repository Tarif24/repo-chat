import mongoose from 'mongoose';

const semanticCache = new mongoose.Schema(
    {
        repoURL: { type: String, required: true },
        query: { type: String, required: true },
        queryEmbedding: { type: [Number], required: true },
        response: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('SemanticCache', semanticCache);
