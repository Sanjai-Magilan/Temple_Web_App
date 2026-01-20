/**
 * Family Routes
 * Handles routes for family and family member management
 */

const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const authMiddleware = require('../middleware/authMiddleware');

// All family routes require authentication
router.use(authMiddleware.verifyToken);

// Family members list
router.get('/', familyController.listMembers);

// Add family member
router.get('/member/add', familyController.showAddMember);
router.post('/member/add', familyController.addMember);

// View family member
router.get('/member/:id', familyController.viewMember);

// Edit family member
router.get('/member/:id/edit', familyController.showEditMember);
router.post('/member/:id/edit', familyController.editMember);

// Delete family member (AJAX)
router.delete('/member/:id', familyController.deleteMember);

module.exports = router;

