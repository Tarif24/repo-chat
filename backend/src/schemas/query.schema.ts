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

export const userQuerySchema = z.object({
    query: z
        .string()
        .refine(str => str.trim().length > 0, { message: 'Query cannot be empty' })
        .transform(str => str.trim()),
    repoUrl: githubUrlSchema,
    chatHistory: z.array(
        z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
        })
    ),
});

export const URLSchema = z.object({
    repoUrl: githubUrlSchema,
});

export type GetRepoByURLType = z.infer<typeof URLSchema>;
export type UserQueryType = z.infer<typeof userQuerySchema>;
