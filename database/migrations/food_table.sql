ALTER TABLE hall_bookings
ADD COLUMN food_required TINYINT(1) DEFAULT 0 AFTER expected_guests,
ADD COLUMN food_meals VARCHAR(255) NULL AFTER food_required;