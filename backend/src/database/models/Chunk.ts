import mongoose from 'mongoose';

const chunk = new mongoose.Schema(
  {
    content: { type: String, required: true },
    embedding: { type: Number, required: true },
    metadata: {
      repoID: String,
      filePath: String,
      functionName: String,
      className: String,
      language: String,
      directory: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Chunk', chunk);
