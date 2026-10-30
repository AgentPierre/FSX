import { z } from "zod";
import { ApiError } from "./errors";

export const CUSTOMER_LIMITS = { name: 100, email: 254, phone: 30 } as const;

export const createOrderSchema = z.object({
  customer: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(CUSTOMER_LIMITS.name, "Use 100 characters or fewer for your name."),
    email: z
      .email("Enter a valid email address.")
      .max(
        CUSTOMER_LIMITS.email,
        "Use 254 characters or fewer for your email address.",
      ),
    phone: z
      .string()
      .trim()
      .max(
        CUSTOMER_LIMITS.phone,
        "Use 30 characters or fewer for your phone number.",
      )
      .optional(),
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

// Above the maximum normal 30-line checkout, including escaped Unicode instructions.
export const MAX_JSON_BODY_BYTES = 64 * 1024;

/** Bound bytes before JSON parsing; Content-Length alone cannot protect chunked requests. */
async function readJson(request: Request): Promise<unknown> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new ApiError(415, "unsupported_media_type", "Use Content-Type: application/json.");
  }
  const tooLarge = () => new ApiError(413, "payload_too_large", "JSON body must be 64 KiB or smaller.");
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_JSON_BODY_BYTES) {
    throw tooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_request", "Body must be valid JSON.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) throw tooLarge();
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (err) {
    // Stop reading rejected streams. Do not wait for a remote sender to finish uploading.
    void reader.cancel().catch(() => {});
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, "invalid_request", "Body must be valid UTF-8 JSON.");
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_request", "Body must be valid JSON.");
  }
}

/** Parse bounded JSON + schema. Unknown fields, including browser prices/statuses, are ignored. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const json = await readJson(request);
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
