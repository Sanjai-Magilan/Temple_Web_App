/**
 * Donation Controller
 * Handles donation-related operations
 */

const donationModel = require('../models/donationModel');

/**
 * List user donations
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const { donations, total } = await donationModel.getUserDonations(
      req.user.id,
      limit,
      offset
    );

    const totalPages = Math.ceil(total / limit);

    res.render('donations/list', {
      title: 'My Donations',
      user: req.user,
      donations: donations,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error('Error loading donations:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donations'
    });
  }
};

/**
 * Show donation form
 */
exports.showNew = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    res.render('donations/new', {
      title: 'Make a Donation',
      user: req.user,
      error: null
    });
  } catch (error) {
    console.error('Error loading donation form:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donation form'
    });
  }
};

/**
 * List all donations (Admin)
 */
exports.listAdmin = async (req, res) => {
  console.log('Accessing listAdmin controller');
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type || "";

    const { donations, total } = await donationModel.getAllDonations(
      limit,
      offset,
      search,
      type
    );

    const totalPages = Math.ceil(total / limit);

    res.render("donations/admin_list", {
      title: "All Donations",
      donations: donations,
      currentPage: page,
      totalPages: totalPages,
      search: search,
      donationType: type, // Pass the type to the view
      user: req.user,
    });
  } catch (error) {
    console.error("Error loading admin donations:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load donations",
    });
  }
};



