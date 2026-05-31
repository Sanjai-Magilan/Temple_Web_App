const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "family-members");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".jpg";
    const fileName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + safeExt;
    cb(null, fileName);
  },
});

function imageFilter(req, file, cb) {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error("Only image files are allowed."));
  }
  cb(null, true);
}

// Multer configuration for family setup form
// Handles:
// - Single file fields: self_profile_image, father_profile_image, mother_profile_image
// - Dynamic file fields: extra_member_image_0, extra_member_image_1, etc.
const uploader = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Export field configuration for family setup
module.exports = {
  // For family setup form with dynamic extra members
  setupForm: uploader.fields([
    { name: "self_profile_image", maxCount: 1 },
    { name: "father_profile_image", maxCount: 1 },
    { name: "mother_profile_image", maxCount: 1 },
    { name: "extra_member_image_*", maxCount: 50 }, // Wildcard for dynamic fields
  ]),

  // For single file upload (member add/edit)
  single: (fieldName) => uploader.single(fieldName),

  // For other multi-file scenarios
  array: (fieldName, maxCount) => uploader.array(fieldName, maxCount),
  any: () => uploader.any(),
};
