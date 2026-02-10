/**
 * @jest-environment jsdom
 */


const { RazorpayPayment, initiatePayment } = require('../public/js/razorpay');

global.fetch = jest.fn();

delete window.location;
window.location = { href: '' };

// Mock Razorpay SDK
global.Razorpay = jest.fn().mockImplementation((options) => {
  return {
    open: jest.fn(),
    on: jest.fn(),
    _options: options
  };
});

describe('initiatePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates order and initializes Razorpay', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        key: 'rzp_test_key',
        order_id: 'order_123',
        amount: 500
      })
    });

    await initiatePayment('donation', { description: 'Temple Donation' });

    expect(fetch).toHaveBeenCalledWith(
      '/payment/donation/order',
      expect.objectContaining({
        method: 'POST'
      })
    );

    expect(Razorpay).toHaveBeenCalled(); // Checkout initialized
  });

  test('handles order creation failure', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        success: false,
        message: 'Order failed'
      })
    });

    const onFailure = jest.fn();

    await initiatePayment('donation', {}, { onFailure });

    expect(onFailure).toHaveBeenCalledWith({ message: 'Order failed' });
  });
});

describe('verifyPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls onSuccess when verification succeeds', async () => {
    const onSuccess = jest.fn();

    fetch.mockResolvedValueOnce({
      json: async () => ({ success: true })
    });

    const payment = new RazorpayPayment({
      key: 'test_key',
      onSuccess
    });

    await payment.verifyPayment(
      {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123'
      },
      { payment_type: 'donation' }
    );

    expect(fetch).toHaveBeenCalledWith(
      '/payment/verify',
      expect.objectContaining({ method: 'POST' })
    );

    expect(onSuccess).toHaveBeenCalled();
  });
});
describe('cancelPayment', () => {
test('handles network error during verification', async () => {
  fetch.mockRejectedValueOnce(new Error('Network error'));

  const onFailure = jest.fn();
  const payment = new RazorpayPayment({ key: 'test_key', onFailure });

  await payment.verifyPayment(
    {
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'sig_123'
    },
    { payment_type: 'donation' }
  );

  expect(onFailure).toHaveBeenCalledWith({ message: 'Payment verification failed' });
});

test('calls onCancel when checkout dismissed', () => {
  const onCancel = jest.fn();

  new RazorpayPayment({
    key: 'test_key',
    onCancel
  }).initCheckout({
    order_id: 'order_123',
    amount: 100,
    payment_type: 'donation'
  });

  const optionsPassed = Razorpay.mock.calls[0][0];
  optionsPassed.modal.ondismiss();

  expect(onCancel).toHaveBeenCalled();
});
});
