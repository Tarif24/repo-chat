import mongoose, { Document, Schema } from 'mongoose';

export type ChunkMetadata = {
    repoURL?: string;
    relativePath?: string;
    name?: string;
    type?: string;
    language?: string;
    parentDir?: string;
    startLine?: number;
    endLine?: number;
};

export interface ChunkDoc extends Document {
    content: string;
    embedding: number[];
    metadata: ChunkMetadata;
}

const chunkMetadataSchema = new Schema<ChunkMetadata>(
    {
        repoURL: String,
        relativePath: String,
        name: String,
        type: String,
        language: String,
        parentDir: String,
        startLine: Number,
        endLine: Number,
    },
    { _id: false }
);

const chunkSchema = new Schema<ChunkDoc>(
    {
        content: { type: String, required: true },
        embedding: { type: [Number], required: true },
        metadata: { type: chunkMetadataSchema, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<ChunkDoc>('Chunk', chunkSchema);
