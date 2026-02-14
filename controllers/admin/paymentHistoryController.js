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
      order = "DESC",
      method = "",
      payment_type = "",
      page = 1
    } = req.query;

    const limit = 12;
    const currentPage = parseInt(page) || 1;
    const offset = (currentPage - 1) * limit;  

    /* ===============================
       SECURITY (SORT WHITELIST)
       Prevent SQL injection
    =============================== */

    const allowedSort = [
      "amount",
      "created_at",
      "booking_date"
    ];

    if (!allowedSort.includes(sort)) {
      sort = "created_at";
    }

    order = order === "ASC" ? "ASC" : "DESC";


    /* ===============================
       GET DATA FROM MODEL
    =============================== */

    const {payments, totalCount} = await paymentModel.getAllPayments({
      search,
      filter,
      sort,
      order,
      method,
      payment_type,
      limit,
      offset
    });

    const totalPages = Math.ceil(totalCount / limit);

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
      p.formatted_booking_date = p.booking_date
        ? new Date(p.booking_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-';
    });

    console.log(payments);


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
      order,
      method,
      payment_type,
      currentPage,
      totalPages
    });  

  } catch (error) {

    console.error('Error loading payment history:', error);

    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load payment history'
    });
  }
};


