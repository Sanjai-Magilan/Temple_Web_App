/**
 * Dashboard Controller
 * Handles user and admin dashboard
 */

const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const paymentModel = require("../models/paymentModel");
const userModel = require("../models/userModel");
const pool = require("../config/database");

/**
 * User Dashboard
 */
exports.userDashboard = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const userId = req.user.id;

    const [
      [donationsCountRows],
      [hallBookingsCountRows],
      [poojaBookingsCountRows],
      [totalDonationRows],
      [familyRows],
      [upcomingPoojasRows],
      [upcomingHallRows],
      recentDonationsResult,
      recentHallBookings,
      recentPoojaBookings,
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) as count
         FROM donations d
         INNER JOIN payments p ON d.payment_id = p.id
         WHERE d.user_id = ? AND d.payment_id IS NOT NULL AND p.status = 'completed'`,
        [userId],
      ),
      pool.execute(
        `SELECT COUNT(*) as count
         FROM hall_bookings hb
         INNER JOIN payments p ON hb.payment_id = p.id
         WHERE hb.user_id = ? AND hb.payment_id IS NOT NULL AND p.status = 'completed'`,
        [userId],
      ),
      pool.execute(
        `SELECT COUNT(*) as count
         FROM pooja_bookings pb
         INNER JOIN payments p ON pb.payment_id = p.id
         WHERE pb.user_id = ? AND pb.payment_id IS NOT NULL AND p.status = 'completed'`,
        [userId],
      ),
      pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM donations
         WHERE user_id = ?`,
        [userId],
      ),
      pool.execute(
        `SELECT COUNT(*) as count
         FROM family_members
         WHERE user_id = ?`,
        [userId],
      ),
      pool.execute(
        `SELECT *
         FROM pooja_bookings
         WHERE user_id = ? AND booking_date >= CURDATE()
         ORDER BY booking_date ASC
         LIMIT 5`,
        [userId],
      ),
      pool.execute(
        `SELECT *
         FROM hall_bookings
         WHERE user_id = ? AND booking_date >= CURDATE()
         ORDER BY booking_date ASC
         LIMIT 5`,
        [userId],
      ),
      donationModel.getUserDonations(userId, 1, 0),
      hallBookingModel.getUserBookings(userId, 3, 0),
      poojaBookingModel.getUserBookings(userId, 1, 0),
    ]);

    const upcomingPooja =
      upcomingPoojasRows.length > 0 ? upcomingPoojasRows[0] : null;
    const upcomingHall =
      upcomingHallRows.length > 0 ? upcomingHallRows[0] : null;
    const recentDonations = recentDonationsResult.donations;

    const recentBookings = [...recentHallBookings, ...recentPoojaBookings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);

    res.render("dashboard/user", {
      title: "Dashboard",
      user: req.user,
      upcomingPooja,
      upcomingHall,
      totalDonation: parseFloat(totalDonationRows[0].total) || 0,
      familyCount: familyRows[0].count,
      donationsCount: donationsCountRows[0].count,
      hallBookingsCount: hallBookingsCountRows[0].count,
      poojaBookingsCount: poojaBookingsCountRows[0].count,
      recentDonations,
      recentBookings,
      upcomingPoojas: upcomingPoojasRows,
      upcomingHallBookings: upcomingHallRows,
    });
  } catch (error) {
    console.error("Error loading user dashboard:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load dashboard",
    });
  }
};

/**
 * Admin Dashboard (No changes made here)
 */
exports.adminDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("errors/403", {
        title: "Forbidden",
        message: "Admin access required",
      });
    }

    const [totalUsers] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "user"',
    );
    const [totalDonations] = await pool.execute(
      `SELECT COUNT(*) as count FROM donations d
       WHERE d.payment_id IS NOT NULL AND 
       d.payment_id IN (SELECT id FROM payments WHERE status = 'completed')`,
    );

    const [totalBookings] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM hall_bookings WHERE payment_id IS NOT NULL AND payment_id IN (SELECT id FROM payments WHERE status = 'completed')) + 
        (SELECT COUNT(*) FROM pooja_bookings WHERE payment_id IS NOT NULL AND payment_id IN (SELECT id FROM payments WHERE status = 'completed')) 
       as count`,
    );
    const [totalRevenue] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`,
    );

    // Fetch Recent Confirmed Payments
    const [recentConfirmedPayments] = await pool.execute(
      `SELECT * FROM payments 
         WHERE status = 'completed' 
         ORDER BY created_at DESC LIMIT 5`,
    );

    // Delete expired news (where published_at < NOW())
    await pool.execute("DELETE FROM news WHERE published_at < NOW()");

    // Fetch News / Special Days (Upcoming Only)
    const [latestNews] = await pool.execute(
      `SELECT * FROM news 
       WHERE is_published = 1 
       ORDER BY published_at ASC LIMIT 5`,
    );

    res.render("dashboard/admin", {
      title: "Admin Dashboard",
      user: req.user,
      totalUsers: totalUsers[0].count,
      totalDonations: totalDonations[0].count,
      totalBookings: totalBookings[0].count,
      totalRevenue: parseFloat(totalRevenue[0].total) || 0,
      recentConfirmedPayments: recentConfirmedPayments,
      latestNews: latestNews,
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load admin dashboard",
    });
  }
};
