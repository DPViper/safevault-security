const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Validation rules for user registration/login
const validateUser = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be at most 255 characters'),
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors,
];

// Validation rules for vault items
const validateVaultItem = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Note must be at most 5000 characters'),
  handleValidationErrors,
];

// Validation for user management (admin only)
const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be at most 255 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'auditor'])
    .withMessage('Role must be one of: admin, user, auditor'),
  handleValidationErrors,
];

// Validation for search queries
const validateSearch = [
  body('query')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters'),
  handleValidationErrors,
];

module.exports = {
  validateUser,
  validateVaultItem,
  validateUserUpdate,
  validateSearch,
  handleValidationErrors,
};

