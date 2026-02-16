const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.post('/admin/news/new', verifyToken, requireRole('admin'), newsController.createNews);
router.post('/admin/news/delete/:id', verifyToken, requireRole('admin'), newsController.deleteNews);

module.exports = router;
