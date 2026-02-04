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
