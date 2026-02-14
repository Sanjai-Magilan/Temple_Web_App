/**
 * Index Controller
 * Handles home page and general routes
 */

const pool = require('../config/database');

exports.home = async (req, res) => {
  try {
    // Fetch latest news
    const [latestNews] = await pool.execute(
      `SELECT * FROM news 
       WHERE is_published = 1 
       ORDER BY published_at DESC LIMIT 5`
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

