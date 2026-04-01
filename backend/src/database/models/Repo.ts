import mongoose from 'mongoose';

const repo = new mongoose.Schema(
    {
        repoURL: { type: String, required: true, unique: true },
        latestSHA: { type: String, default: null },
        lastAccessed: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Repo', repo);
