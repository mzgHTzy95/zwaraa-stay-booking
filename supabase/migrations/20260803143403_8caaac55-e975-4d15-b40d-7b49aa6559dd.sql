ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS nights integer NOT NULL DEFAULT 1;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_nights_positive CHECK (nights >= 1 AND nights <= 30);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS end_date date GENERATED ALWAYS AS (reservation_date + (nights - 1)) STORED;

DROP INDEX IF EXISTS public.reservations_no_double_booking;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    cabin_id WITH =,
    daterange(reservation_date, reservation_date + nights, '[)') WITH &&
  )
  WHERE (status <> 'cancelled');