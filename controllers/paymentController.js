/**
 * Payment Controller
 * Handles Razorpay payment initiation and verification
 */
const PAYMENT_LIMITS = {
  donation: 500000,
  hall_booking: 50000
};

const razorpay = require("../config/razorpay");
const paymentModel = require("../models/paymentModel");
const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const { verifyPaymentSignature } = require("../config/razorpay");

/**
 * Create Razorpay order for donation
 */
exports.createDonationOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please login to make a donation" });
    }

    const { amount, donation_type, purpose, is_anonymous } = req.body;

    // Validate amount
    const donationAmount = parseFloat(amount);
    if (donationAmount > PAYMENT_LIMITS.donation) {
    return res.status(400).json({
    success: false,
    message: "Donation amount cannot exceed ₹5,00,000"
  });
}

    // Create Razorpay order
    const options = {
      amount: donationAmount * 100, // Convert to paise
      currency: "INR",
      receipt: `DON-${Date.now()}`,
      notes: {
        payment_type: "donation",
        user_id: req.user.id,
        donation_type: donation_type || "general",
        purpose: purpose || "",
      },
    };

    const order = await razorpay.orders.create(options);

    // Store payment record (pending status)
    const paymentId = await paymentModel.create({
      //payment_id: null, // Will be updated after payment
      order_id: order.id,
      user_id: req.user.id,
      family_id: null,
      amount: donationAmount,
      currency: "INR",
      status: "pending",
      payment_type: "donation",
    });

    // Create donation record (pending payment)
    const donation = await donationModel.create({
      user_id: req.user.id,
      family_id: null,
      amount: donationAmount,
      donation_type: donation_type || "general",
      purpose: purpose || null,
      payment_id: paymentId,
      is_anonymous: is_anonymous || 0,
    });

    res.json({
      success: true,
      order_id: order.id,
      amount: donationAmount,
      key: process.env.RAZORPAY_KEY_ID,
      donation_id: donation.id,
      receipt_number: donation.receipt_number,
    });
  } catch (error) {
  console.error("Error creating donation order:", error);

      // Razorpay amount limit error
      if (
        error?.error?.code === 'BAD_REQUEST_ERROR' &&
        error?.error?.description?.includes('Amount exceeds')
      ) {
        return res.status(400).json({
          success: false,
          message: "Check the amount please"
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create payment order"
      });
    }
};

/**
 * Create Razorpay order for hall booking
 */
exports.createHallBookingOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please login to book a hall" });
    }

    const {
      hall_name,
      booking_date,
      start_time,
      end_time,
      event_type,
      event_description,
      expected_guests,
      amount,
    } = req.body;

    // Validate required fields
    if (!hall_name || !booking_date || !start_time || !end_time || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const bookingAmount = parseFloat(amount);
    // Max limit validation for hall booking
    if (bookingAmount > PAYMENT_LIMITS.hall_booking) {
    return res.status(400).json({
    success: false,
    message: "Hall booking amount cannot exceed ₹50,000"
  });
}


    //Block booking if there is a confirmed booking with overlapping time slot
    const hasConflict = await hallBookingModel.hasConfirmedOverlap({
      hall_name,
      booking_date,
      start_time,
      end_time,
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: "Selected time slot is already booked.",
      });
    }

    // Create Razorpay order
    const options = {
      amount: bookingAmount * 100, // Convert to paise
      currency: "INR",
      receipt: `HALL-${Date.now()}`,
      notes: {
        payment_type: "hall_booking",
        user_id: req.user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    // Store payment record
    const paymentId = await paymentModel.create({
      //payment_id: null,
      order_id: order.id,
      user_id: req.user.id,
      family_id: null,
      amount: bookingAmount,
      currency: "INR",
      status: "pending",
      payment_type: "hall_booking",
    });

    // Create hall booking record
    const booking = await hallBookingModel.create({
      user_id: req.user.id,
      family_id: null,
      hall_name,
      booking_date,
      start_time,
      end_time,
      event_type: event_type || null,
      event_description: event_description || null,
      expected_guests: expected_guests || null,
      amount: bookingAmount,
      payment_id: paymentId,
      status: "pending",
    });

    res.json({
      success: true,
      order_id: order.id,
      amount: bookingAmount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      booking_number: booking.booking_number,
    });
  } catch (error) {
    console.error("Error creating hall booking order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create payment order" });
  }
};

/**
 * Create Razorpay order for pooja booking
 */
exports.createPoojaBookingOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please login to book a pooja" });
    }

    const {
      pooja_name,
      pooja_type,
      booking_date,
      booking_time,
      devotee_name,
      gotra,
      nakshatra,
      special_instructions,
      amount,
    } = req.body;

    // Validate required fields
    if (
      !pooja_name ||
      !booking_date ||
      !booking_time ||
      !devotee_name ||
      !amount
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const bookingAmount = parseFloat(amount);
    // Create Razorpay order
    const options = {
      amount: bookingAmount * 100, // Convert to paise
      currency: "INR",
      receipt: `POOJA-${Date.now()}`,
      notes: {
        payment_type: "pooja_booking",
        user_id: req.user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    // Store payment record
    const paymentId = await paymentModel.create({
      //payment_id: null,
      order_id: order.id,
      user_id: req.user.id,
      family_id: null,
      amount: bookingAmount,
      currency: "INR",
      status: "pending",
      payment_type: "pooja_booking",
    });

    // Create pooja booking record
    const booking = await poojaBookingModel.create({
      user_id: req.user.id,
      family_id: null,
      pooja_name,
      pooja_type: pooja_type || null,
      booking_date,
      booking_time,
      devotee_name,
      gotra: gotra || null,
      nakshatra: nakshatra || null,
      special_instructions: special_instructions || null,
      amount: bookingAmount,
      payment_id: paymentId,
      status: "pending",
    });

    res.json({
      success: true,
      order_id: order.id,
      amount: bookingAmount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      booking_number: booking.booking_number,
    });
  } catch (error) {
    console.error("Error creating pooja booking order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create payment order" });
  }
};

/**
 * Verify payment and update records
 */
exports.verifyPayment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { order_id, payment_id, signature, payment_type } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      order_id,
      payment_id,
      signature,
    );
    if (!isValidSignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // Check idempotency - prevent duplicate payments
    const existingPayment = await paymentModel.findByPaymentId(payment_id);
    if (existingPayment && existingPayment.status === "completed") {
      return res.json({
        success: true,
        message: "Payment already processed",
        payment: existingPayment,
      });
    }

    // Fetch payment details from Razorpay
    const razorpayPayment = await razorpay.payments.fetch(payment_id);

    // Find payment record by order_id
    const payment = await paymentModel.findByOrderId(order_id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment order not found" });
    }

    // Update payment record with payment_id and full details
    await paymentModel.updateByOrderId(order_id, payment_id, {
      payment_method: razorpayPayment.method,
      status: razorpayPayment.status === "captured" ? "completed" : "failed",
      razorpay_response: razorpayPayment,
    });

    // Update related records based on payment type
    if (razorpayPayment.status === "captured" && payment.related_id) {
      if (payment.payment_type === "donation") {
        // Donation receipt is already generated during creation
        // No additional update needed
      } else if (payment.payment_type === "hall_booking") {
        const booking = await hallBookingModel.findById(payment.related_id);

        if (booking) {
          const hasConflict = await hallBookingModel.hasConfirmedOverlap({
            hall_name: booking.hall_name,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            excludeBookingId: booking.id,
          });

          if (hasConflict) {
            await hallBookingModel.updateStatus(
              booking.id,
              "cancelled",
              "Time slot already booked",
            );
            return res.status(409).json({
              success: false,
              message:
                "Time slot already booked. Payment received; admin will contact you.",
            });
          }
        }

        await hallBookingModel.updateStatus(payment.related_id, "confirmed");
      } else if (payment.payment_type === "pooja_booking") {
        await poojaBookingModel.updateStatus(payment.related_id, "confirmed");
      }
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment_id: payment_id,
      status: razorpayPayment.status === "captured" ? "completed" : "failed",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

/**
 * Handle Razorpay webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookBody = req.rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const { verifyWebhookSignature } = require("../config/razorpay");
    const isValid = verifyWebhookSignature(
      webhookBody,
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET,
    );

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const payment =
      req.body.payload.payment?.entity || req.body.payload.payment;

    if (event === "payment.captured" && payment) {
      // Check idempotency
      const existingPayment = await paymentModel.findByPaymentId(payment.id);

      if (!existingPayment) {
        // Payment not found in our database, might be from external source
        console.log("Payment not found in database:", payment.id);
        return res.json({ success: true });
      }

      if (existingPayment.status === "completed") {
        // Already processed
        return res.json({
          success: true,
          message: "Payment already processed",
        });
      }

      // Update payment status
      await paymentModel.update(payment.id, {
        payment_method: payment.method,
        status: "completed",
        razorpay_response: payment,
      });

      // Update related records
      if (existingPayment.related_id) {
        if (existingPayment.payment_type === "hall_booking") {
          const booking = await hallBookingModel.findById(
            existingPayment.related_id,
          );

          if (booking) {
            const hasConflict = await hallBookingModel.hasConfirmedOverlap({
              hall_name: booking.hall_name,
              booking_date: booking.booking_date,
              start_time: booking.start_time,
              end_time: booking.end_time,
              excludeBookingId: booking.id,
            });

            if (hasConflict) {
              await hallBookingModel.updateStatus(
                booking.id,
                "cancelled",
                "Time slot already booked",
              );
              return res.json({ success: true });
            }
          }

          await hallBookingModel.updateStatus(
            existingPayment.related_id,
            "confirmed",
          );
        } else if (existingPayment.payment_type === "pooja_booking") {
          await poojaBookingModel.updateStatus(
            existingPayment.related_id,
            "confirmed",
          );
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res
      .status(500)
      .json({ success: false, message: "Webhook processing failed" });
  }
};

/**
 * Display payment success page
 */
exports.paymentSuccess = async (req, res) => {
  try {
    const { payment_id, order_id } = req.query;
    
    if (!payment_id && !order_id) {
      return res.status(400).render('errors/400', {
        title: 'Bad Request',
        message: 'Payment ID or Order ID is required.',
      });
    }
    
    // Fetch payment details from database
    let paymentDetails = null;
    if (payment_id) {
      paymentDetails = await paymentModel.findByPaymentId(payment_id);
    } else if (order_id) {
      paymentDetails = await paymentModel.findByOrderId(order_id);
    }
    
    res.render('payment/success', {
      title: 'Payment Success',
      payment_id: payment_id || null,
      order_id: order_id || null,
      paymentDetails: paymentDetails,
    });
  } catch (error) {
    console.error('Error rendering payment success page:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'An error occurred while processing your request.',
    });
  }
};

/**
 * Display payment failure page
 */
exports.paymentFailure = async (req, res) => {
  try {
    const { payment_id, order_id, error } = req.query;
    
    res.render('payment/failure', {
      title: 'Payment Failed',
      payment_id: payment_id || null,
      order_id: order_id || null,
      error: error || 'Payment could not be processed.',
    });
  } catch (error) {
    console.error('Error rendering payment failure page:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'An error occurred while processing your request.',
    });
  }
};