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

    const donations = await donationModel.getUserDonations(req.user.id, 50, 0);

    res.render('donations/list', {
      title: 'My Donations',
      user: req.user,
      donations: donations
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
 * Admin list donations
 */
exports.adminList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || null;

    const result = await donationModel.getAllDonations(limit, offset, search);

    res.render('donations/admin_list', {
      title: 'Donation Management',
      user: req.user,
      donations: result.donations,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit),
      search: search
    });
  } catch (error) {
    console.error('Error loading donations for admin:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donations'
    });
  }
};
