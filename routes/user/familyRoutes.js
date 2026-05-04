/**
 * Family Routes
 * Handles routes for family and family member management
 */

const express = require("express");
const router = express.Router();
const familyController = require("../../controllers/familyController");
const authMiddleware = require("../../middleware/authMiddleware");
const familyUpload = require("../../middleware/familyUploadMiddleware");

// All family routes require authentication
router.use(authMiddleware.verifyToken);

// Family members list
router.get("/", familyController.listMembers);

// Setup family
router.get("/setup", familyController.showSetup);
router.post(
  "/setup",
  familyUpload.fields([
    { name: "self_profile_image", maxCount: 1 },
    { name: "father_profile_image", maxCount: 1 },
    { name: "mother_profile_image", maxCount: 1 },
  ]),
  familyController.createSetup,
);

// Tree structure
router.get("/tree/:memberId", familyController.getTreeJson);

// Add family member
router.get("/member/add", familyController.showAddMember);
router.post(
  "/member/add",
  familyUpload.single("profile_image"),
  familyController.addMember,
);

// View family member
router.get("/member/:id", familyController.viewMember);
router.get("/member/:id/edit", familyController.showEditMember);
router.post(
  "/member/:id/edit",
  familyUpload.single("profile_image"),
  familyController.editMember,
);

// Delete family member (AJAX)
router.delete("/member/:id", familyController.deleteMember);

module.exports = router;
