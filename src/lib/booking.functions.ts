import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilityInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilityInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cabins, error: cabinError } = await supabaseAdmin.from("cabins").select("id").eq("is_active", true);
    if (cabinError) throw new Error(cabinError.message);
    const totalCabins = cabins?.length || 0;
    if (totalCabins === 0) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("reservation_date, nights, slot")
      .neq("status", "cancelled")
      .gte("reservation_date", data.from)
      .lte("reservation_date", data.to);
    if (error) throw new Error(error.message);

    const counts: Record<string, { half_day: number; "24h": number }> = {};
    for (const r of rows ?? []) {
      const nights = Math.max(1, Number(r.nights ?? 1));
      const start = new Date(`${r.reservation_date}T00:00:00Z`);
      for (let i = 0; i < nights; i += 1) {
        const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
        if (!counts[d]) counts[d] = { half_day: 0, "24h": 0 };
        if (r.slot === "24h") {
          counts[d]["24h"]++;
          counts[d]["half_day"]++;
        } else {
          counts[d]["half_day"]++;
        }
      }
    }

    const out: { date: string; slot: "half_day" | "24h" }[] = [];
    for (const [date, count] of Object.entries(counts)) {
      if (count["half_day"] >= totalCabins) out.push({ date, slot: "half_day" });
      if (count["24h"] >= totalCabins) out.push({ date, slot: "24h" });
    }
    return out;
  });

/**
 * Per-day availability across the whole (active) fleet.
 * Returns how many bungalows are still free on each date for each pack.
 */
export const getDayAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilityInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cabins, error: cabinError } = await supabaseAdmin
      .from("cabins")
      .select("id, capacity")
      .eq("is_active", true);
    if (cabinError) throw new Error(cabinError.message);
    const totalCabins = cabins?.length ?? 0;
    const maxCapacity = Math.max(0, ...(cabins ?? []).map((c) => Number(c.capacity)));

    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("reservation_date, nights, slot")
      .neq("status", "cancelled")
      .gte("reservation_date", new Date(new Date(`${data.from}T00:00:00Z`).getTime() - 30 * 86400000).toISOString().slice(0, 10))
      .lte("reservation_date", data.to);
    if (error) throw new Error(error.message);

    const used: Record<string, number> = {};
    for (const r of rows ?? []) {
      const nights = Math.max(1, Number(r.nights ?? 1));
      const start = new Date(`${r.reservation_date}T00:00:00Z`).getTime();
      for (let i = 0; i < nights; i += 1) {
        const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
        used[d] = (used[d] ?? 0) + 1;
      }
    }

    const days: { date: string; free: number }[] = [];
    const from = new Date(`${data.from}T00:00:00Z`).getTime();
    const to = new Date(`${data.to}T00:00:00Z`).getTime();
    for (let ts = from; ts <= to; ts += 86400000) {
      const date = new Date(ts).toISOString().slice(0, 10);
      days.push({ date, free: Math.max(0, totalCabins - (used[date] ?? 0)) });
    }

    return { totalCabins, maxCapacity, days };
  });


const reservationInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["half_day", "24h"]),
  nights: z.number().int().min(1).max(30).default(1),
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

    const { data: cabins, error: cabinError } = await supabaseAdmin
      .from("cabins")
      .select("id, capacity, price_half_day, price_24h, is_active")
      .eq("is_active", true);
    if (cabinError) throw new Error(cabinError.message);
    if (!cabins || cabins.length === 0) return { ok: false as const, reason: "cabin" as const };

    const capacityValidCabins = cabins.filter((c) => data.guestsCount <= c.capacity);
    if (capacityValidCabins.length === 0) return { ok: false as const, reason: "capacity" as const };

    const nights = data.slot === "24h" ? data.nights : 1;
    
    // Check overlaps
    const { data: existingReservations, error: resError } = await supabaseAdmin
      .from("reservations")
      .select("cabin_id, reservation_date, nights, slot")
      .neq("status", "cancelled")
      .gte("reservation_date", new Date(new Date(`${data.date}T00:00:00Z`).getTime() - 30 * 86400000).toISOString().slice(0, 10));

    if (resError) throw new Error(resError.message);

    const requestedDates: string[] = [];
    for (let i = 0; i < nights; i++) {
        requestedDates.push(new Date(new Date(`${data.date}T00:00:00Z`).getTime() + i * 86400000).toISOString().slice(0, 10));
    }

    const unavailableCabinIds = new Set<string>();
    for (const r of existingReservations ?? []) {
      const rNights = Math.max(1, Number(r.nights ?? 1));
      const rStart = new Date(`${r.reservation_date}T00:00:00Z`);
      for (let i = 0; i < rNights; i += 1) {
        const d = new Date(rStart.getTime() + i * 86400000).toISOString().slice(0, 10);
        if (requestedDates.includes(d)) {
          if (data.slot === "24h" || r.slot === "24h" || data.slot === r.slot) {
             unavailableCabinIds.add(r.cabin_id);
          }
        }
      }
    }

    const availableCabin = capacityValidCabins.find((c) => !unavailableCabinIds.has(c.id));
    if (!availableCabin) return { ok: false as const, reason: "taken" as const };

    const total =
      data.slot === "half_day"
        ? Number(availableCabin.price_half_day) * data.guestsCount
        : Number(availableCabin.price_24h) * data.guestsCount * nights;


    const { data: inserted, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        cabin_id: availableCabin.id,
        reservation_date: data.date,
        slot: data.slot,
        nights,
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
      if (error.code === "23505" || error.code === "23P01")
        return { ok: false as const, reason: "taken" as const };
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
        "reference, reservation_date, nights, slot, full_name, guests_count, total_price, status, payment_status, created_at, cabins(name, name_ar, slug, included_package, included_package_ar)",
      )
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
