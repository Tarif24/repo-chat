import { z } from 'zod';

const githubUrlSchema = z
    .string()
    .regex(
        /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/,
        'Must be a valid GitHub repository URL'
    )
    .transform(url => {
        // strip trailing slash
        const stripped = url.replace(/\/$/, '');
        // ensure https:// prefix
        if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
            return stripped;
        }
        return `https://${stripped.replace(/^www\./, '')}`;
    });

export const ingestRepoSchema = z.object({
    repoUrl: githubUrlSchema,
});

export type IngestRepoType = z.infer<typeof ingestRepoSchema>;
