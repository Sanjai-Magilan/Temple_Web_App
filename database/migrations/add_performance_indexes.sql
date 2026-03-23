-- Performance indexes for dashboard and payment listing
-- Run once in production and staging

ALTER TABLE payments
  ADD INDEX idx_payments_status_created_at (status, created_at),
  ADD INDEX idx_payments_user_created_at (user_id, created_at),
  ADD INDEX idx_payments_type_created_at (payment_type, created_at);

ALTER TABLE donations
  ADD INDEX idx_donations_user_created_at (user_id, created_at),
  ADD INDEX idx_donations_type_created_at (donation_type, created_at),
  ADD INDEX idx_donations_user_payment (user_id, payment_id);

ALTER TABLE hall_bookings
  ADD INDEX idx_hall_user_created_at (user_id, created_at),
  ADD INDEX idx_hall_user_payment (user_id, payment_id),
  ADD INDEX idx_hall_overlap_lookup (hall_name, booking_date, status, start_time, end_time);

ALTER TABLE pooja_bookings
  ADD INDEX idx_pooja_user_created_at (user_id, created_at),
  ADD INDEX idx_pooja_booking_date_user (booking_date, user_id),
  ADD INDEX idx_pooja_user_payment (user_id, payment_id);