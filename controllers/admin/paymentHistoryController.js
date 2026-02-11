const paymentModel = require('../../models/paymentModel');

/**
 * Payment History
 */
exports.paymentHistory = async (req, res) => {
  try {

    /* ===============================
       ADMIN CHECK
    =============================== */

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).render('errors/403', {
        title: 'Forbidden',
        message: 'Admin access required'
      });
    }

    /* ===============================
       QUERY PARAMS
    =============================== */

    let {
      search = "",
      filter = "",
      sort = "created_at",
      order = "DESC"
    } = req.query;

    /* ===============================
       SECURITY (SORT WHITELIST)
       Prevent SQL injection
    =============================== */

    const allowedSort = [
      "payment_id",
      "user_id",
      "amount",
      "created_at"
    ];

    if (!allowedSort.includes(sort)) {
      sort = "created_at";
    }

    order = order === "ASC" ? "ASC" : "DESC";


    /* ===============================
       GET DATA FROM MODEL
    =============================== */

    const payments = await paymentModel.getAllPayments({
      search,
      filter,
      sort,
      order
    });


    /* ===============================
       FORMAT DATE
    =============================== */

    payments.forEach(p => {
      p.formatted_date = new Date(p.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });


    /* ===============================
       RENDER VIEW
    =============================== */

    res.render('admin/payment-history', {
      title: 'Payment History',
      user: req.user,
      payments,
      search,
      filter,
      sort,
      order
    });

  } catch (error) {

    console.error('Error loading payment history:', error);

    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load payment history'
    });
  }
};


