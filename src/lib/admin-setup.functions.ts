import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("not found")
  );
}

/** True once at least one admin account exists — bootstrap is then closed. */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (error) {
      if (isMissingTableError(error)) return false;
      throw new Error(error.message);
    }

    return (count ?? 0) > 0;
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
});

const bootstrapInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

/** Creates the very first administrator. Refuses once one exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bootstrapInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      if (isMissingTableError(countError)) {
        return {
          ok: false as const,
          reason: "The 'user_roles' table is missing. Apply the Supabase migration first.",
        };
      }
      throw new Error(countError.message);
    }
    if ((count ?? 0) > 0) return { ok: false as const, reason: "closed" as const };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false as const, reason: error?.message ?? "error" };

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleError) {
      if (isMissingTableError(roleError)) {
        return {
          ok: false as const,
          reason: "The 'user_roles' table is missing. Apply the Supabase migration first.",
        };
      }
      return { ok: false as const, reason: roleError.message };
    }

    return { ok: true as const };
  });
