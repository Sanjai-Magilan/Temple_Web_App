# Razorpay Payment Integration Guide

## Overview
This application integrates Razorpay for processing payments for:
- Donations
- Hall Bookings
- Pooja Bookings

## Features
- ✅ Payment order creation
- ✅ Payment verification with signature validation
- ✅ Webhook handling for payment status updates
- ✅ Idempotency checks to prevent duplicate payments
- ✅ Complete payment history in MySQL
- ✅ Automatic booking confirmation on successful payment

## Setup

### 1. Environment Variables
Add to your `.env` file:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret (optional, uses KEY_SECRET if not set)
```

### 2. Razorpay Dashboard Configuration
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/payment/webhook`
4. Enable events: `payment.captured`
5. Copy the webhook secret

### 3. Include Razorpay Checkout Script
Add to your HTML pages:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script src="/js/razorpay.js"></script>
```

## API Endpoints

### Create Donation Order
```javascript
POST /payment/donation/order
Headers: Cookie with JWT token
Body: {
  "amount": 1000,
  "donation_type": "general",
  "purpose": "Temple construction",
  "is_anonymous": false
}
Response: {
  "success": true,
  "order_id": "order_xxx",
  "amount": 1000,
  "key": "rzp_test_xxx",
  "donation_id": 1,
  "receipt_number": "DON-2024-1234"
}
```

### Create Hall Booking Order
```javascript
POST /payment/hall-booking/order
Headers: Cookie with JWT token
Body: {
  "hall_name": "Main Hall",
  "booking_date": "2024-12-25",
  "start_time": "10:00:00",
  "end_time": "14:00:00",
  "event_type": "wedding",
  "event_description": "Wedding ceremony",
  "expected_guests": 200,
  "amount": 5000
}
Response: {
  "success": true,
  "order_id": "order_xxx",
  "amount": 5000,
  "key": "rzp_test_xxx",
  "booking_id": 1,
  "booking_number": "HALL-202412-1234"
}
```

### Create Pooja Booking Order
```javascript
POST /payment/pooja-booking/order
Headers: Cookie with JWT token
Body: {
  "pooja_name": "Ganapathi Pooja",
  "pooja_type": "special",
  "booking_date": "2024-12-25",
  "booking_time": "09:00:00",
  "devotee_name": "John Doe",
  "gotra": "Bharadwaja",
  "nakshatra": "Rohini",
  "special_instructions": "Please use fresh flowers",
  "amount": 2000
}
Response: {
  "success": true,
  "order_id": "order_xxx",
  "amount": 2000,
  "key": "rzp_test_xxx",
  "booking_id": 1,
  "booking_number": "POOJA-202412-1234"
}
```

### Verify Payment
```javascript
POST /payment/verify
Headers: Cookie with JWT token
Body: {
  "order_id": "order_xxx",
  "payment_id": "pay_xxx",
  "signature": "signature_xxx",
  "payment_type": "donation"
}
Response: {
  "success": true,
  "message": "Payment verified successfully",
  "payment_id": "pay_xxx",
  "status": "completed"
}
```

### Webhook (Razorpay → Server)
```javascript
POST /payment/webhook
Headers: {
  "x-razorpay-signature": "webhook_signature"
}
Body: Raw JSON from Razorpay
```

## Client-Side Usage

### Using the Razorpay Utility

```javascript
// Donation payment
initiatePayment('donation', {
  amount: 1000,
  donation_type: 'general',
  purpose: 'Temple construction',
  is_anonymous: false
}, {
  onSuccess: (result) => {
    console.log('Payment successful:', result);
    window.location.href = '/donations/success';
  },
  onFailure: (error) => {
    console.error('Payment failed:', error);
    alert('Payment failed: ' + error.message);
  }
});

// Hall booking payment
initiatePayment('hall-booking', {
  hall_name: 'Main Hall',
  booking_date: '2024-12-25',
  start_time: '10:00:00',
  end_time: '14:00:00',
  amount: 5000
}, {
  onSuccess: (result) => {
    window.location.href = '/bookings/success';
  }
});
```

## Security Features

### 1. Signature Verification
- All payments are verified using Razorpay signature
- Webhook signatures are verified before processing
- Prevents payment tampering

### 2. Idempotency
- Duplicate payment prevention
- Checks if payment already exists before processing
- Prevents double booking/charging

### 3. Authentication
- All payment endpoints require JWT authentication
- Webhook uses signature verification instead

### 4. Database Transactions
- Payment and related records updated atomically
- Rollback on errors

## Payment Flow

1. **User initiates payment** → Frontend calls order creation endpoint
2. **Server creates Razorpay order** → Returns order_id and key
3. **Frontend opens Razorpay checkout** → User completes payment
4. **Razorpay redirects** → With payment_id, order_id, signature
5. **Frontend verifies payment** → Calls /payment/verify endpoint
6. **Server verifies signature** → Updates payment status
7. **Server updates related records** → Confirms booking/donation
8. **Razorpay sends webhook** → Server processes webhook (backup verification)

## Database Schema

### Payments Table
- Stores all payment records
- Links to users, families, and related records
- Tracks payment status and Razorpay response

### Related Tables
- `donations` - Links to payments via `payment_id`
- `hall_bookings` - Links to payments via `payment_id`
- `pooja_bookings` - Links to payments via `payment_id`

## Testing

### Test Mode
1. Use Razorpay test keys
2. Use test cards: https://razorpay.com/docs/payments/test-cards/
3. Test webhook using Razorpay webhook testing tool

### Test Cards
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

## Error Handling

- Invalid signature → 400 Bad Request
- Payment not found → 404 Not Found
- Duplicate payment → Returns existing payment (idempotency)
- Server errors → 500 Internal Server Error

## Production Checklist

- [ ] Use production Razorpay keys
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Set RAZORPAY_WEBHOOK_SECRET
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Test webhook delivery
- [ ] Monitor payment logs
- [ ] Set up error alerts

## Support

For Razorpay API documentation: https://razorpay.com/docs/
For issues, check server logs and Razorpay dashboard logs.



