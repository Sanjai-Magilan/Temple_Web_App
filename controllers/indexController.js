/**
 * Index Controller
 * Handles home page and general routes
 */

exports.home = (req, res) => {
  res.render('index', {
    title: 'Temple Management System',
    message: 'Welcome to Temple Management System',
    user: req.user || null
  });
};

