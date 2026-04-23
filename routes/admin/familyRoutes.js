const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/familyController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
  "/families",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  controller.index,
);

router.get(
  "/families/:familyId/details",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  controller.details,
);

router.get(
  "/families/tree/:memberId",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  controller.tree,
);

module.exports = router;
