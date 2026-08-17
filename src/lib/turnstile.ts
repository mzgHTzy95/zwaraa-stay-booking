import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const turnstileSecret =
  process.env["TURNSTILE_SECRET"];

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

export async function verifyTurnstileToken(token: string) {
  if (!turnstileSecret) {
    throw new Error("Missing TURNSTILE_SECRET environment variable");
  }

  if (!token || typeof token !== "string") {
    return { ok: false, errors: ["missing_token"] } as const;
  }

  const body = new URLSearchParams();
  body.append("secret", turnstileSecret);
  body.append("response", token);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    return { ok: false, errors: ["network_error"] } as const;
  }

  const data = turnstileResponseSchema.parse(await response.json());

  return {
    ok: data.success,
    errors: data.success
      ? []
      : (data["error-codes"] ?? ["verification_failed"]),
  } as const;
}

export const verifyTurnstile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => verifyTurnstileToken(data.token));
