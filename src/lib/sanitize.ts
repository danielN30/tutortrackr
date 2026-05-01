import { z } from "zod";

// Strip control characters (except newline/tab) and trim
export function sanitizeText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export const studentNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be under 100 characters")
  .transform(sanitizeText);

export const subjectSchema = z
  .string()
  .min(1, "Subject is required")
  .max(60, "Subject must be under 60 characters")
  .transform(sanitizeText);

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email")
  .max(255, "Email must be under 255 characters");

export const topicSchema = z
  .string()
  .min(1)
  .max(120, "Topic must be under 120 characters")
  .transform(sanitizeText);

export const notesSchema = z
  .string()
  .max(5000, "Notes must be under 5000 characters")
  .transform(sanitizeText);

export const studentInputSchema = z.object({
  name: studentNameSchema,
  subject: subjectSchema,
  parent_email: emailSchema,
});
