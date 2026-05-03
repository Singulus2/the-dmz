import { z } from 'zod';

export const senderContactSchema = z.object({
  senderName: z.string().max(255).optional(),
  senderEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
});

export const subjectSchema = z.string().min(1).max(500);
