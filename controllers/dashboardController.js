/**
 * Dashboard Controller
 * Handles user and admin dashboard
 */

const donationModel = require('../models/donationModel');
const hallBookingModel = require('../models/hallBookingModel');
const poojaBookingModel = require('../models/poojaBookingModel');
const paymentModel = require('../models/paymentModel');
const userModel = require('../models/userModel');
const pool = require('../config/database');

/**
 * User Dashboard
 */
exports.userDashboard = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    const userId = req.user.id;

    // Get counts - only count completed payments
    const [donationsCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM donations d
       WHERE d.user_id = ? AND d.payment_id IS NOT NULL AND 
       d.payment_id IN (SELECT id FROM payments WHERE status = 'completed')`,
      [userId]
    );

    const [hallBookingsCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM hall_bookings hb
       WHERE hb.user_id = ? AND hb.payment_id IS NOT NULL AND
       hb.payment_id IN (SELECT id FROM payments WHERE status = 'completed')`,
      [userId]
    );

    const [poojaBookingsCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM pooja_bookings pb
       WHERE pb.user_id = ? AND pb.payment_id IS NOT NULL AND
       pb.payment_id IN (SELECT id FROM payments WHERE status = 'completed')`,
      [userId]
    );

    const [totalSpentResult] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments 
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    // Get recent donations
    const recentDonations = await donationModel.getUserDonations(userId, 5, 0);

    // Get recent bookings (combine hall and pooja)
        // Get recent bookings with payment status (combine hall and pooja)
    const [recentHallBookingsData] = await pool.execute(
      `SELECT hb.*, p.status as payment_status 
       FROM hall_bookings hb
       LEFT JOIN payments p ON hb.payment_id = p.id
       WHERE hb.user_id = ?
       ORDER BY hb.created_at DESC
       LIMIT 3`,
      [userId]
    );

    const [recentPoojaBookingsData] = await pool.execute(
      `SELECT pb.*, p.status as payment_status 
       FROM pooja_bookings pb
       LEFT JOIN payments p ON pb.payment_id = p.id
       WHERE pb.user_id = ?
       ORDER BY pb.created_at DESC
       LIMIT 3`,
      [userId]
    );

    // Format bookings with type indicator
    const recentHallBookings = recentHallBookingsData.map(booking => ({
      ...booking,
      type: 'hall'
    }));

    const recentPoojaBookings = recentPoojaBookingsData.map(booking => ({
      ...booking,
      type: 'pooja'
    }));

    const recentBookings = [...recentHallBookings, ...recentPoojaBookings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    res.render('dashboard/user', {
      title: 'Dashboard',
      user: req.user,
      donationsCount: donationsCount[0].count,
      hallBookingsCount: hallBookingsCount[0].count,
      poojaBookingsCount: poojaBookingsCount[0].count,
      totalSpent: parseFloat(totalSpentResult[0].total) || 0,
      recentDonations: recentDonations,
      recentBookings: recentBookings
    });
  } catch (error) {
    console.error('Error loading user dashboard:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load dashboard'
    });
  }
};

/**
 * Admin Dashboard
 */
exports.adminDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).render('errors/403', {
        title: 'Forbidden',
        message: 'Admin access required'
      });
    }

    // Get counts
    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [totalDonations] = await pool.execute('SELECT COUNT(*) as count FROM donations');
    const [totalBookings] = await pool.execute(
      'SELECT (SELECT COUNT(*) FROM hall_bookings) + (SELECT COUNT(*) FROM pooja_bookings) as count'
    );
    const [totalRevenue] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`
    );

    // Get recent payments
    const recentPayments = await paymentModel.getUserPayments(null, 10, 0);

    // Get pending bookings
    const [pendingHallBookings] = await pool.execute(
      'SELECT * FROM hall_bookings WHERE status = "pending" ORDER BY created_at DESC LIMIT 5'
    );
    const [pendingPoojaBookings] = await pool.execute(
      'SELECT * FROM pooja_bookings WHERE status = "pending" ORDER BY created_at DESC LIMIT 5'
    );
    const pendingBookings = [...pendingHallBookings, ...pendingPoojaBookings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.render('dashboard/admin', {
      title: 'Admin Dashboard',
      user: req.user,
      totalUsers: totalUsers[0].count,
      totalDonations: totalDonations[0].count,
      totalBookings: totalBookings[0].count,
      totalRevenue: parseFloat(totalRevenue[0].total) || 0,
      recentPayments: recentPayments,
      pendingBookings: pendingBookings
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load admin dashboard'
    });
  }
};



