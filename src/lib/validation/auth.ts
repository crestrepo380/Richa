import { z } from "zod";

/**
 * Shared auth schemas. Imported by both the client form and the server action
 * so the browser and the server enforce exactly the same rules — client-side
 * validation is a UX convenience, never the security boundary.
 */

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Enter your password." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const magicLinkSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
});
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, { error: "Use at least 10 characters." })
      .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
      .regex(/[0-9]/, { error: "Include at least one number." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
