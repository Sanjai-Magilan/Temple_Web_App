/**
 * Razorpay Payment Integration
 * Client-side utility for Razorpay checkout
 */

class RazorpayPayment {
  constructor(options) {
    this.options = options;
    this.razorpayKey = options.key;
  }

  /**
   * Initialize Razorpay checkout
   */
  async initCheckout(orderData) {
    const self = this;
    
    const options = {
      key: this.razorpayKey,
      amount: orderData.amount * 100, // Convert to paise
      currency: 'INR',
      name: 'Temple Management',
      description: orderData.description || 'Payment',
      order_id: orderData.order_id,
      handler: async function(response) {
        await self.verifyPayment(response, orderData);
      },
      prefill: {
        name: orderData.name || '',
        email: orderData.email || '',
        contact: orderData.phone || ''
      },
      theme: {
        color: '#3399cc'
      },
      modal: {
        ondismiss: function() {
          if (self.options.onCancel) {
            self.options.onCancel();
          }
        }
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.on('payment.failed', function(response) {
      if (self.options.onFailure) {
        self.options.onFailure(response);
      } else {
        window.location.href = '/payment/failure?error=' + encodeURIComponent(response.error.description);
      }
    });

    razorpay.open();
  }

  /**
   * Verify payment with server
   */
  async verifyPayment(response, orderData) {
    try {
      const verifyResponse = await fetch('/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          order_id: response.razorpay_order_id,
          payment_id: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          payment_type: orderData.payment_type
        })
      });

      const result = await verifyResponse.json();

     if (result.success) {
  if (this.options.onSuccess) {
    this.options.onSuccess(result);
  }

  // Redirect to success page or provided successUrl
  const redirectUrl = `/payment/success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
  if (orderData.successUrl) {
    const query = redirectUrl.split("?")[1];
    const separator = orderData.successUrl.includes("?") ? "&" : "?";
    window.location.href = orderData.successUrl + separator + query;
  } else if (!this.options.onSuccess) {
    window.location.href = redirectUrl;
  }
} else {
        if (this.options.onFailure) {
          this.options.onFailure(result);
        } else {
          window.location.href = '/payment/failure?error=' + encodeURIComponent(result.message);
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      if (this.options.onFailure) {
        this.options.onFailure({ message: 'Payment verification failed' });
      } else {
        window.location.href = '/payment/failure?error=Verification failed';
      }
    }
  }
}

/**
 * Helper function to create payment order and open checkout
 */
async function initiatePayment(paymentType, paymentData, options = {}) {
  try {
    // Create order on server
    const orderResponse = await fetch(`/payment/${paymentType}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(paymentData)
    });

    const orderResult = await orderResponse.json();

    if (!orderResult.success) {
      throw new Error(orderResult.message || 'Failed to create payment order');
    }

    // Initialize Razorpay checkout
    const razorpayPayment = new RazorpayPayment({
      key: orderResult.key,
      ...options
    });

    await razorpayPayment.initCheckout({
      order_id: orderResult.order_id,
      amount: orderResult.amount,
      description: paymentData.description || `${paymentType} payment`,
      payment_type: paymentType,
      ...orderResult,
      ...options
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    if (options.onFailure) {
      options.onFailure({ message: error.message });
    } else {
      alert('Payment initiation failed: ' + error.message);
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RazorpayPayment, initiatePayment };
}



