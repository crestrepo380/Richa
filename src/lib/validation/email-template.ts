import { z } from "zod";

/**
 * Email template edit schema. `name` identifies the template and is not
 * user-editable once created (it's the key the send code looks up), so it is
 * validated as a slug but supplied by the route, not the form.
 */
export const emailTemplateSchema = z.object({
  subject: z.string().trim().min(1, { error: "Subject is required." }).max(200),
  body: z.string().trim().min(1, { error: "Body is required." }).max(10_000),
  active: z.boolean().default(true),
});
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

export const templateNameSchema = z
  .string()
  .regex(/^[a-z0-9_]+$/, { error: "Use lowercase letters, numbers, and underscores." });
