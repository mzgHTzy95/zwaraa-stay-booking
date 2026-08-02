import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilityInput = z.object({
  cabinId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilityInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("reservation_date, slot")
      .eq("cabin_id", data.cabinId)
      .neq("status", "cancelled")
      .gte("reservation_date", data.from)
      .lte("reservation_date", data.to);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ date: r.reservation_date, slot: r.slot }));
  });

const reservationInput = z.object({
  cabinId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["half_day", "24h"]),
  cin: z.string().trim().min(4).max(20),
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(6).max(25),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestsCount: z.number().int().min(1).max(20),
});

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reservationInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cabin, error: cabinError } = await supabaseAdmin
      .from("cabins")
      .select("id, capacity, price_half_day, price_24h, is_active")
      .eq("id", data.cabinId)
      .maybeSingle();
    if (cabinError) throw new Error(cabinError.message);
    if (!cabin || !cabin.is_active) return { ok: false as const, reason: "cabin" as const };
    if (data.guestsCount > cabin.capacity)
      return { ok: false as const, reason: "capacity" as const };

    const total = Number(data.slot === "half_day" ? cabin.price_half_day : cabin.price_24h);

    const { data: inserted, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        cabin_id: data.cabinId,
        reservation_date: data.date,
        slot: data.slot,
        cin: data.cin,
        full_name: data.fullName,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        guests_count: data.guestsCount,
        total_price: total,
      })
      .select("id, reference, total_price")
      .single();

    if (error) {
      if (error.code === "23505") return { ok: false as const, reason: "taken" as const };
      throw new Error(error.message);
    }

    return {
      ok: true as const,
      id: inserted.id,
      reference: inserted.reference,
      total: Number(inserted.total_price),
    };
  });

const payInput = z.object({
  reservationId: z.string().uuid(),
  cardNumber: z.string().trim().min(8).max(25),
});

export const payReservation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => payInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reservation, error } = await supabaseAdmin
      .from("reservations")
      .select("id, reference, total_price, payment_status")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) return { ok: false as const };

    if (reservation.payment_status !== "paid") {
      const { error: updateError } = await supabaseAdmin
        .from("reservations")
        .update({ payment_status: "paid", status: "confirmed" })
        .eq("id", reservation.id);
      if (updateError) throw new Error(updateError.message);

      const { error: txError } = await supabaseAdmin.from("transactions").insert({
        reservation_id: reservation.id,
        amount: reservation.total_price,
        status: "success",
        simulated: true,
      });
      if (txError) throw new Error(txError.message);
    }

    return { ok: true as const, reference: reservation.reference };
  });

export const getReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ reference: z.string().trim().min(4).max(30) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("reservations")
      .select(
        "reference, reservation_date, slot, full_name, guests_count, total_price, status, payment_status, created_at, cabins(name, name_ar, slug, included_package, included_package_ar)",
      )
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
