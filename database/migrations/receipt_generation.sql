ALTER TABLE donations
ADD COLUMN receipt_json TEXT NULL AFTER receipt_generated;

ALTER TABLE hall_bookings
ADD COLUMN receipt_json TEXT NULL AFTER cancelled_at;

ALTER TABLE pooja_bookings
ADD COLUMN receipt_json TEXT NULL AFTER cancelled_at;