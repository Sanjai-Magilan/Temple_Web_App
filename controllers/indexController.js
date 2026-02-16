/**
 * Index Controller
 * Handles home page and general routes
 */

const pool = require('../config/database');

exports.home = async (req, res) => {
  try {
    // Delete expired news (where published_at < NOW())
    await pool.execute('DELETE FROM news WHERE published_at < NOW()');

    // Fetch latest news (Upcoming only)
    const [latestNews] = await pool.execute(
      `SELECT * FROM news 
       WHERE is_published = 1 AND published_at >= CURDATE()
       ORDER BY published_at ASC LIMIT 5`
    );

    res.render('index', {
      title: 'Welcome to Temple Management System',
      message: 'Experience the divine with our comprehensive temple management services. Please login or register to continue.',
      user: req.user,
      latestNews: latestNews
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load home page'
    });
  }
};

