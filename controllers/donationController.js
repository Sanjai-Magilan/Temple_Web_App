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



