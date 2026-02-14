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

    // --- 1. GET COUNTS (General Stats) ---
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

    // --- 2. GET TOTAL DONATION (Specific for "Total Donation" Card) ---
    const [totalDonationResult] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM donations
       WHERE user_id = ?`,
      [userId]
    );

    // --- 3. GET FAMILY MEMBERS COUNT (Specific for "Family" Card) ---
    const [familyResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM family_members WHERE user_id = ?',
      [userId]
    );
    const familyCount = familyResult[0].count;

    // --- 4. GET UPCOMING POOJA (Specific for "Upcoming Pooja" Card & Details) ---
    // --- 4. GET UPCOMING POOJAN (Specific for "Upcoming Pooja" Card & Details) ---
    const [upcomingPoojasResult] = await pool.execute(
      `SELECT * FROM pooja_bookings 
         WHERE user_id = ? AND booking_date >= CURDATE() 
         ORDER BY booking_date ASC LIMIT 5`,
      [userId]
    );
    const upcomingPooja = upcomingPoojasResult.length > 0 ? upcomingPoojasResult[0] : null;
    const upcomingPoojas = upcomingPoojasResult;

    // --- 5. GET UPCOMING HALL BOOKINGS (FUTURE EVENT) ---
    const [upcomingHallResult] = await pool.execute(
      `SELECT * FROM hall_bookings 
       WHERE user_id = ? AND booking_date >= CURDATE()
       ORDER BY booking_date ASC 
       LIMIT 5`,
      [userId]
    );

    const upcomingHall = upcomingHallResult.length > 0
      ? upcomingHallResult[0]
      : null;
    const upcomingHallBookings = upcomingHallResult;


    // --- 6. GET RECENT ACTIVITY (For tables/history if needed) ---
    const recentDonations = await donationModel.getUserDonations(userId, 1, 0);
    const recentHallBookings = await hallBookingModel.getUserBookings(userId, 3, 0);
    const recentPoojaBookings = await poojaBookingModel.getUserBookings(userId, 1, 0);

    const recentBookings = [...recentHallBookings, ...recentPoojaBookings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);


    // --- RENDER ---
    res.render('dashboard/user', {
      title: 'Dashboard',
      user: req.user,

      // Dynamic Data for Dashboard Cards
      upcomingPooja: upcomingPooja,
      upcomingHall: upcomingHall,
      totalDonation: parseFloat(totalDonationResult[0].total) || 0,
      familyCount: familyCount,

      // Other data for sidebar/footer/history
      donationsCount: donationsCount[0].count,
      hallBookingsCount: hallBookingsCount[0].count,
      poojaBookingsCount: poojaBookingsCount[0].count,
      recentDonations: recentDonations,
      recentBookings: recentBookings,
      upcomingPoojas: upcomingPoojas,
      upcomingHallBookings: upcomingHallBookings
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
 * Admin Dashboard (No changes made here)
 */
exports.adminDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).render('errors/403', {
        title: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [totalDonations] = await pool.execute(
      `SELECT COUNT(*) as count FROM donations d
       WHERE d.payment_id IS NOT NULL AND 
       d.payment_id IN (SELECT id FROM payments WHERE status = 'completed')`
    );

    const [totalBookings] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM hall_bookings WHERE payment_id IS NOT NULL AND payment_id IN (SELECT id FROM payments WHERE status = 'completed')) + 
        (SELECT COUNT(*) FROM pooja_bookings WHERE payment_id IS NOT NULL AND payment_id IN (SELECT id FROM payments WHERE status = 'completed')) 
       as count`
    );
    const [totalRevenue] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`
    );

    const recentPayments = await paymentModel.getUserPayments(null, 10, 0);
    const [pendingHallBookings] = await pool.execute(
      'SELECT * FROM hall_bookings WHERE status = "pending" ORDER BY created_at DESC LIMIT 5'
    );
    const [pendingPoojaBookings] = await pool.execute(
      `SELECT pb.*, p.status as payment_status 
       FROM pooja_bookings pb
       LEFT JOIN payments p ON pb.payment_id = p.id
       WHERE pb.status = "pending" 
       ORDER BY pb.created_at DESC LIMIT 5`
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