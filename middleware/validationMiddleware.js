/**
 * Validation Middleware
 * Validates user input using express-validator
 */

const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors for HTML responses
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Get first error message
    const firstError = errors.array()[0].msg;
    
    // Determine which view to render based on route
    const isLogin = req.path === '/login' || req.originalUrl.includes('/login');
    const viewName = isLogin ? 'auth/login' : 'auth/register';
    const title = isLogin ? 'Login' : 'Register';
    
    return res.status(400).render(viewName, {
      title: title,
      error: firstError,
      formData: req.body
    });
  }
  next();
};

/**
 * Registration validation rules
 */
exports.validateRegistration = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('family_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Family name must be between 2 and 200 characters'),
  handleValidationErrors
];

/**
 * Login validation rules
 */
exports.validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

