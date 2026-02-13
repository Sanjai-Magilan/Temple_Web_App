# Receipt Generation Workflow

## Overview
Receipts are generated on-demand and stored as JSON in the database. The PDF is rendered from an EJS template using Puppeteer when the user downloads the receipt.

## Flow (End-to-End)
1. User submits payment from the UI (donation, hall booking, or pooja booking).
2. Client calls `POST /payment/verify` with `order_id`, `payment_id`, and `signature`.
3. Server verifies Razorpay signature and updates payment status.
4. On captured payment, the server builds receipt JSON and stores it in `receipt_json`.
5. User clicks Download Receipt.
6. Server validates access and payment status, renders PDF from EJS, and streams it.

## Where Each Step Happens
- Client payment flow: [public/js/razorpay.js](public/js/razorpay.js)
- Payment verification: [controllers/paymentController.js](controllers/paymentController.js)
- Receipt JSON build + save: [utils/receiptService.js](utils/receiptService.js)
- PDF rendering: [utils/receiptPdf.js](utils/receiptPdf.js)
- Receipt download controller: [controllers/receiptController.js](controllers/receiptController.js)
- Receipt template: [views/receipts/receipt.ejs](views/receipts/receipt.ejs)

## Receipt Download Routes
- Donations: `GET /donations/:id/receipt`
- Hall bookings: `GET /bookings/hall/:id/receipt`
- Pooja bookings: `GET /bookings/pooja/:id/receipt`

## Access Rules
- Admin can download any receipt.
- Regular users can only download their own receipt.
- Receipt download is allowed only when `payment_status` is `completed`.

## Data Storage
- JSON is stored in:
  - `donations.receipt_json`
  - `hall_bookings.receipt_json`
  - `pooja_bookings.receipt_json`

## Notes
- PDFs are generated on-demand (no caching).
- If receipt JSON exists, it is reused to keep the receipt consistent.