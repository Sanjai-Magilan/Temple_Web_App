/**
 * Index Controller
 * Handles home page and general routes
 */

exports.home = (req, res) => {
  res.render('index', {
    title: 'Welcome to Temple Management System',
    message: 'Experience the divine with our comprehensive temple management services. Please login or register to continue.'
  });
};

