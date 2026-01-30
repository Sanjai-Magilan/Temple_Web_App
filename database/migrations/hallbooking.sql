// For testing the hall booking

INSERT INTO payments (
    payment_id,
    order_id,
    user_id,
    family_id,
    amount,
    currency,
    payment_method,
    status,
    payment_type,
    related_id,
    razorpay_response
) VALUES
-- Payment 2
('pay_HB002', 'order_HB002', 2, 1, 120000.00, 'INR', 'upi', 'completed', 'hall_booking', NULL, NULL),

-- Payment 3
('pay_HB003', 'order_HB003', 2, 1, 90000.00, 'INR', 'card', 'completed', 'hall_booking', NULL, NULL),

-- Payment 4
('pay_HB004', 'order_HB004', 2, 1, 60000.00, 'INR', 'netbanking', 'completed', 'hall_booking', NULL, NULL),

-- Payment 5
('pay_HB005', 'order_HB005', 2, 1, 180000.00, 'INR', 'upi', 'completed', 'hall_booking', NULL, NULL);

INSERT INTO hall_bookings (
    booking_number,
    user_id,
    family_id,
    hall_name,
    booking_date,
    start_time,
    end_time,
    event_type,
    event_description,
    expected_guests,
    amount,
    payment_id,
    status
) VALUES
-- Booking 2
('HB20260202001', 2, 1, 'Sri Lakshmi Mahal', '2026-03-10',
 '09:00:00', '18:00:00', 'Reception',
 'Evening wedding reception', 400, 120000.00, 2, 'confirmed'),

-- Booking 3
('HB20260203001', 2, 1, 'Vinayagar Hall', '2026-03-18',
 '08:00:00', '14:00:00', 'Engagement',
 'Family engagement function', 250, 90000.00, 3, 'confirmed'),

-- Booking 4
('HB20260204001', 2, 1, 'Community Hall', '2026-04-02',
 '10:00:00', '16:00:00', 'Birthday',
 '60th birthday celebration', 200, 60000.00, 4, 'confirmed'),

-- Booking 5
('HB20260205001', 2, 1, 'Royal Convention Center', '2026-04-20',
 '09:00:00', '21:00:00', 'Wedding',
 'Grand wedding ceremony', 700, 180000.00, 5, 'confirmed');
