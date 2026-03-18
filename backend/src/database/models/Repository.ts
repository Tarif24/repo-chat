import mongoose from 'mongoose';

const repository = new mongoose.Schema(
  {
    repoID: { type: String, required: true },
    repoURL: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Repository', repository);
