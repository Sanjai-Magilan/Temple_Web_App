const donationModel = require('../models/donationModel');
const hallBookingModel = require('../models/hallBookingModel');
const poojaBookingModel = require('../models/poojaBookingModel');
const paymentModel = require('../models/paymentModel');
const userModel = require('../models/userModel');
const pool = require('../config/database');

/**
 * Manage Users
 */
exports.manageUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).render('errors/403', {
        title: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const users = await userModel.getAllUsers();

    res.render('dashboard/users', {
      title: 'Manage Users',
      user: req.user,
      users: users
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load users'
    });
  }
};