/*profie routes file*/
const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/profile",
  authMiddleware.verifyToken,
  profileController.viewProfile,
);
router.post(
  "/profile/update",
  authMiddleware.verifyToken,
  profileController.updateProfile,
);

module.exports = router;
