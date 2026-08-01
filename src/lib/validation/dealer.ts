import { z } from "zod";

/**
 * Dealer create/edit schema, shared by the client form and the server action.
 */
export const dealerSchema = z.object({
  company: z.string().trim().min(1, { error: "Company name is required." }),
  contactName: z.string().trim().min(1, { error: "Contact name is required." }),
  email: z
    .email({ error: "Enter a valid email address." })
    .transform((s) => s.trim().toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  active: z.boolean().default(true),
});
export type DealerInput = z.infer<typeof dealerSchema>;

export const createDealerSchema = dealerSchema.extend({
  /** When true, also provision a Supabase login linked to this dealer. */
  createLogin: z.boolean().default(false),
});
export type CreateDealerInput = z.infer<typeof createDealerSchema>;
