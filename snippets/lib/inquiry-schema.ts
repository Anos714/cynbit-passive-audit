// snippets/lib/inquiry-schema.ts
// Strict, server-side validation for the contact form.
//
// The current HTML only has `required` and `type=email`. That is a UX hint,
// not validation: a direct POST can omit or ignore it. Parse a fresh object
// from FormData so framework-injected fields (for example $ACTION_ID_*) never
// reach the schema and are not persisted.
//
// Install:
//   npm i zod

import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const inquirySchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    company: optionalText(120),
    industry: optionalText(120),
    message: z.string().trim().min(10).max(5_000),
  })
  .strict();

export type Inquiry = z.infer<typeof inquirySchema>;

export function parseInquiry(formData: FormData) {
  return inquirySchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    company: formData.get('company') || undefined,
    industry: formData.get('industry') || undefined,
    message: formData.get('message'),
  });
}
