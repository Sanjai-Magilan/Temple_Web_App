/**
 * Index Controller
 * Handles home page and general routes
 */

exports.home = (req, res) => {
  // Redirect to login page immediately
  res.redirect('/login');
};

