import { z } from 'zod';
export const emailSchema = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const passwordSchema = z.string().min(10).max(128);
export const registerSchema = z.object({ email: emailSchema, password: passwordSchema, displayName: z.string().trim().min(1).max(60) }).strict();
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const appMetadataSchema = z.object({
 name: z.string().trim().min(2).max(80),
 packageId: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){2,}$/).max(200),
 description: z.string().trim().min(20).max(4000),
 category: z.enum(['Tools','Productivity','Education','Entertainment','Games','Lifestyle','Business','Other']),
 version: z.string().trim().regex(/^\d+\.\d+(\.\d+)?$/).max(30),
 minAndroid: z.string().trim().regex(/^\d+(\.\d+)?$/).max(10).default('8.0')
}).strict();
export function safeDisplayName(value) { return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, 60); }
export function safePackageFilename(name) { return String(name ?? '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180); }
