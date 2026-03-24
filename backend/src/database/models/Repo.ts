import mongoose from 'mongoose';

const repo = new mongoose.Schema(
    {
        repoID: { type: String, required: true },
        repoURL: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Repo', repo);
