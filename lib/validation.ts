import { z } from "zod";
import { ApiError } from "./errors";

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(254),
    phone: z.string().trim().max(30).optional(),
  }),
  pickupTime: z.iso.datetime({ offset: true }),
  lines: z
    .array(
      z.object({
        sizeId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(50),
        spicy: z.boolean().optional(),
        instructions: z.string().max(200).optional(),
        components: z.array(z.string().max(8)).max(2).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export const ticketPatchSchema = z.object({ status: z.string() });

/** Parse JSON + schema; any failure becomes a 400 invalid_request. Prices in the body are ignored. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Body must be valid JSON.");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(400, "invalid_request", "Request failed validation.", {
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  return result.data;
}
