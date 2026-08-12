import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const availabilityInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Full exclusivity: as soon as ANY bungalow is reserved on a given date/slot,
 * that date+slot is considered fully booked for ALL clients.
 */
export const getBookedSlots = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilityInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cabins, error: cabinError } = await supabaseAdmin.from("cabins").select("id").eq("is_active", true);
    if (cabinError) throw new Error(cabinError.message);
    if (!cabins || cabins.length === 0) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("reservation_date, nights, slot")
      .neq("status", "cancelled")
      .gte("reservation_date", data.from)
      .lte("reservation_date", data.to);
    if (error) throw new Error(error.message);

    // Full exclusivity: any reservation on a date blocks ALL slots that overlap
    const blocked = new Set<string>(); // "date:slot"
    for (const r of rows ?? []) {
      const nights = Math.max(1, Number(r.nights ?? 1));
      const start = new Date(`${r.reservation_date}T00:00:00Z`);
      for (let i = 0; i < nights; i += 1) {
        const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
        // If slot is 24h, block both; if half_day, block half_day and also 24h (can't coexist)
        blocked.add(`${d}:half_day`);
        blocked.add(`${d}:24h`);
      }
    }

    const out: { date: string; slot: "half_day" | "24h" }[] = [];
    for (const key of blocked) {
      const [date, slot] = key.split(":") as [string, "half_day" | "24h"];
      out.push({ date, slot });
    }
    return out;
  });

/**
 * Per-day availability across the whole (active) fleet.
 * Full exclusivity: any reservation = date is fully booked (free = 0).
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

    // Full exclusivity: any reservation on a date makes it fully booked
    const usedDates = new Set<string>();
    for (const r of rows ?? []) {
      const nights = Math.max(1, Number(r.nights ?? 1));
      const start = new Date(`${r.reservation_date}T00:00:00Z`).getTime();
      for (let i = 0; i < nights; i += 1) {
        const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
        usedDates.add(d);
      }
    }

    const days: { date: string; free: number }[] = [];
    const from = new Date(`${data.from}T00:00:00Z`).getTime();
    const to = new Date(`${data.to}T00:00:00Z`).getTime();
    for (let ts = from; ts <= to; ts += 86400000) {
      const date = new Date(ts).toISOString().slice(0, 10);
      // Full exclusivity: if any reservation exists on this date, free = 0
      days.push({ date, free: usedDates.has(date) ? 0 : totalCabins });
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
  guestsCount: z.number().int().min(0).max(20),
  adults: z.number().int().min(1).max(20).default(1),
  children6_10: z.number().int().min(0).max(20).default(0),
  childrenUnder5: z.number().int().min(0).max(20).default(0),
});

const CHILDREN_6_10_PRICE = 50; // fixed price per child aged 6-10

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

    // Total guests = adults + children 6-10 (under 5 don't count toward capacity)
    const totalCountableGuests = data.adults + data.children6_10;
    const capacityValidCabins = cabins.filter((c) => totalCountableGuests <= c.capacity);
    if (capacityValidCabins.length === 0) return { ok: false as const, reason: "capacity" as const };

    const nights = data.slot === "24h" ? data.nights : 1;

    // Full exclusivity: check if ANY reservation overlaps on the requested dates
    const requestedDates: string[] = [];
    for (let i = 0; i < nights; i++) {
      requestedDates.push(
        new Date(new Date(`${data.date}T00:00:00Z`).getTime() + i * 86400000).toISOString().slice(0, 10)
      );
    }

    const { data: existingReservations, error: resError } = await supabaseAdmin
      .from("reservations")
      .select("cabin_id, reservation_date, nights, slot")
      .neq("status", "cancelled")
      .gte(
        "reservation_date",
        new Date(new Date(`${data.date}T00:00:00Z`).getTime() - 30 * 86400000).toISOString().slice(0, 10)
      );

    if (resError) throw new Error(resError.message);

    // Full exclusivity: if any reservation exists on any of the requested dates, block all
    const blockedDates = new Set<string>();
    for (const r of existingReservations ?? []) {
      const rNights = Math.max(1, Number(r.nights ?? 1));
      const rStart = new Date(`${r.reservation_date}T00:00:00Z`);
      for (let i = 0; i < rNights; i += 1) {
        const d = new Date(rStart.getTime() + i * 86400000).toISOString().slice(0, 10);
        blockedDates.add(d);
      }
    }

    const hasConflict = requestedDates.some((d) => blockedDates.has(d));
    if (hasConflict) return { ok: false as const, reason: "taken" as const };

    // Pick the first available cabin (already no conflicts since exclusivity)
    const availableCabin = capacityValidCabins[0];
    if (!availableCabin) return { ok: false as const, reason: "taken" as const };

    // Calculate total price:
    // Adults × unit price × nights (for 24h) + children6_10 × 50 DT × nights
    const adultUnitPrice = Number(
      data.slot === "half_day" ? availableCabin.price_half_day : availableCabin.price_24h
    );
    const adultTotal = data.slot === "half_day"
      ? adultUnitPrice * data.adults
      : adultUnitPrice * data.adults * nights;
    const childrenTotal = data.slot === "half_day"
      ? CHILDREN_6_10_PRICE * data.children6_10
      : CHILDREN_6_10_PRICE * data.children6_10 * nights;
    const total = adultTotal + childrenTotal;

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
        guests_count: totalCountableGuests + data.childrenUnder5,
        adults: data.adults,
        children_6_10: data.children6_10,
        children_under_5: data.childrenUnder5,
        total_price: total,
      })
      .select("id, reference, total_price")
      .single();

    if (error) {
      if (error.code === "23505" || error.code === "23P01")
        return { ok: false as const, reason: "taken" as const };
      throw new Error(error.message);
    }

    // Create admin notification
    try {
      await supabaseAdmin.from("admin_notifications").insert({
        reservation_id: inserted.id,
        title: "Nouvelle réservation",
        body: `${data.fullName} — ${data.date} · ${data.slot === "half_day" ? "Demi-pontion" : "Pontion complète"}`,
        is_read: false,
      });
    } catch {
      // Non-fatal: notification failure shouldn't block booking
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
        "reference, reservation_date, nights, slot, full_name, guests_count, adults, children_6_10, children_under_5, total_price, status, payment_status, created_at, cabins(name, name_ar, slug, included_package, included_package_ar)",
      )
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
