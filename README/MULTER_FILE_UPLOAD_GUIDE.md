# Multer File Upload Guide - Family Setup Form

## Overview

This document explains how the Family Setup form handles multipart/form-data uploads using Multer instead of Busboy. The solution handles:

- Single file fields (`self_profile_image`, `father_profile_image`, `mother_profile_image`)
- Dynamic file fields (`extra_member_image_0`, `extra_member_image_1`, etc.)
- Safe JSON parsing of `extra_members_json`
- Clean structured data ready for MySQL insertion

---

## Architecture

### 1. Middleware Configuration (`middleware/familyUploadMiddleware.js`)

```javascript
const uploader = multer({
  storage, // diskStorage - saves to uploads/family-members/
  fileFilter, // image validation
  limits: {
    // 5MB max per file
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  // For family setup form with multiple named fields + dynamic fields
  setupForm: uploader.fields([
    { name: "self_profile_image", maxCount: 1 },
    { name: "father_profile_image", maxCount: 1 },
    { name: "mother_profile_image", maxCount: 1 },
    { name: "extra_member_image_*", maxCount: 50 }, // Wildcard for dynamic fields
  ]),

  // For member add/edit (single file)
  single: (fieldName) => uploader.single(fieldName),

  // For other scenarios
  array: (fieldName, maxCount) => uploader.array(fieldName, maxCount),
  any: () => uploader.any(),
};
```

### 2. Route Configuration (`routes/user/familyRoutes.js`)

```javascript
router.post(
  "/setup",
  familyUpload.setupForm, // Handles all file fields
  familyController.createSetup,
);
```

### 3. Controller Logic (`controllers/familyController.js`)

#### How `req.files` is structured with `.fields()`:

```javascript
// With .fields() middleware, req.files looks like:
req.files = {
  "self_profile_image": [
    { filename: "1234567890-123456789.jpg", ... }
  ],
  "father_profile_image": [
    { filename: "1234567890-987654321.jpg", ... }
  ],
  "mother_profile_image": [
    { filename: "1234567890-555555555.jpg", ... }
  ],
  "extra_member_image_0": [
    { filename: "1234567890-111111111.jpg", ... }
  ],
  "extra_member_image_1": [
    { filename: "1234567890-222222222.jpg", ... }
  ]
}
```

#### Extracting Files and Creating File Map:

```javascript
const fileMap = {};
if (req.files && typeof req.files === "object") {
  // Iterate through all file fields
  Object.keys(req.files).forEach((fieldName) => {
    if (
      Array.isArray(req.files[fieldName]) &&
      req.files[fieldName].length > 0
    ) {
      // Get the first (and typically only) file for this field
      fileMap[fieldName] = req.files[fieldName][0].filename;
    }
  });
}

// Example fileMap:
// {
//   "self_profile_image": "1234567890-123456789.jpg",
//   "father_profile_image": "1234567890-987654321.jpg",
//   "extra_member_image_0": "1234567890-111111111.jpg"
// }
```

#### Getting Image Paths:

```javascript
const selfImagePath = fileMap["self_profile_image"]
  ? "/uploads/family-members/" + fileMap["self_profile_image"]
  : null;

const fatherImagePath = fileMap["father_profile_image"]
  ? "/uploads/family-members/" + fileMap["father_profile_image"]
  : null;

const motherImagePath = fileMap["mother_profile_image"]
  ? "/uploads/family-members/" + fileMap["mother_profile_image"]
  : null;

// Results:
// selfImagePath:   "/uploads/family-members/1234567890-123456789.jpg"
// fatherImagePath: "/uploads/family-members/1234567890-987654321.jpg"
// motherImagePath: null (if not uploaded)
```

#### Parsing Extra Members JSON Safely:

```javascript
let extraMembers = [];
if (req.body.extra_members_json) {
  try {
    const parsed = JSON.parse(req.body.extra_members_json);
    if (Array.isArray(parsed)) {
      extraMembers = parsed.map((member) => {
        // The frontend sends imageField as "extra_member_image_0", etc.
        const imageFieldName =
          member.imageField || `extra_member_image_${member.index || 0}`;

        // Look up the uploaded filename from our fileMap
        const uploadedFilename = fileMap[imageFieldName];
        const imagePath = uploadedFilename
          ? "/uploads/family-members/" + uploadedFilename
          : null;

        return {
          name: String(member.name || "").trim(),
          relationship: String(member.relationship || "").trim(),
          mobile: String(member.mobile || "").trim(),
          occupation: String(member.occupation || "").trim(),
          dob: String(member.dob || "").trim(),
          age: member.age ? parseInt(member.age, 10) : null,
          imagePath: imagePath, // <-- Image path from uploaded file
        };
      });
    }
  } catch (parseError) {
    console.warn("Could not parse extra_members_json:", parseError.message);
    extraMembers = [];
  }
}

// Example result:
// extraMembers = [
//   {
//     name: "John Doe",
//     relationship: "siblings",
//     mobile: "9876543210",
//     occupation: "Doctor",
//     dob: "1990-01-15",
//     age: 33,
//     imagePath: "/uploads/family-members/1234567890-111111111.jpg"
//   },
//   {
//     name: "Jane Smith",
//     relationship: "children",
//     mobile: "9876543211",
//     occupation: "Engineer",
//     dob: "2015-05-20",
//     age: 8,
//     imagePath: null  // No image uploaded
//   }
// ]
```

#### Complete Family Setup Data Structure:

```javascript
await familyModel.createFullFamilySetup({
  user_id: userId,

  // Family info
  family_name: "Smith Family",
  address: "123 Main St",
  city: "Springfield",
  state: "IL",
  pincode: "62701",

  // Father info (with image)
  father_name: "Robert Smith",
  father_mobile: "5551234567",
  father_dob: "1965-03-20",
  father_age: 58,
  father_occupation: "Businessman",
  father_gender: "male",
  father_image_path: "/uploads/family-members/1234567890-987654321.jpg",

  // Mother info (with image)
  mother_name: "Mary Smith",
  mother_mobile: "5559876543",
  mother_dob: "1968-07-10",
  mother_age: 55,
  mother_occupation: "Teacher",
  mother_image_path: "/uploads/family-members/1234567890-555555555.jpg",

  // Self/Family Head (with image)
  self_name: "David Smith",
  self_mobile: "5557775555",
  self_gender: "male",
  self_dob: "1990-12-15",
  self_age: 33,
  self_occupation: "Software Engineer",
  self_image_path: "/uploads/family-members/1234567890-123456789.jpg",

  // Spouse info
  spouse_name: "Sarah Smith",
  spouse_mobile: "5555555555",
  spouse_gender: "female",
  spouse_dob: "1992-06-10",
  spouse_age: 31,
  spouse_occupation: "Doctor",

  // Siblings (no images in main setup)
  siblings: [
    {
      name: "Michael Smith",
      gender: "male",
      mobile: "5554444444",
      occupation: "Lawyer",
      dob: "1988-04-05",
      age: 35,
    },
  ],

  // Children (no images in main setup)
  children: [
    {
      name: "Thomas Smith",
      gender: "male",
      mobile: null,
      occupation: null,
      dob: "2015-01-20",
      age: 8,
    },
  ],

  // Extra members with images
  extra_members: [
    {
      name: "John Nephew",
      relationship: "nephew",
      mobile: "5558888888",
      occupation: "Student",
      dob: "2005-09-12",
      age: 18,
      imagePath: "/uploads/family-members/1234567890-111111111.jpg",
    },
    {
      name: "Anna Niece",
      relationship: "niece",
      mobile: "5559999999",
      occupation: null,
      dob: "2010-03-30",
      age: 13,
      imagePath: null, // No image uploaded
    },
  ],
});
```

---

## Form Structure (Frontend)

### HTML Input Fields:

```html
<form
  id="familySetupForm"
  action="/family/setup"
  method="POST"
  enctype="multipart/form-data"
>
  <!-- Self/Head Section -->
  <input type="file" name="self_profile_image" accept=".jpg,.jpeg,.png,.webp" />

  <!-- Father Section -->
  <input
    type="file"
    name="father_profile_image"
    accept=".jpg,.jpeg,.png,.webp"
  />

  <!-- Mother Section -->
  <input
    type="file"
    name="mother_profile_image"
    accept=".jpg,.jpeg,.png,.webp"
  />

  <!-- Dynamic Extra Members -->
  <input
    type="file"
    name="extra_member_image_0"
    accept=".jpg,.jpeg,.png,.webp"
  />
  <input
    type="file"
    name="extra_member_image_1"
    accept=".jpg,.jpeg,.png,.webp"
  />
  <!-- ... more dynamic fields ... -->

  <!-- Hidden JSON field storing extra member metadata -->
  <input type="hidden" name="extra_members_json" id="extra_members_json" />
</form>
```

### JavaScript to Populate `extra_members_json`:

```javascript
function syncExtraMembers() {
  const cards = container.querySelectorAll(".member-card");
  const payload = [];

  cards.forEach(function (card, index) {
    const name = card.querySelector(".extra-member-name").value.trim();
    if (!name) return; // Skip empty entries

    const imageField = card
      .querySelector(".extra-member-image")
      .getAttribute("name");

    payload.push({
      name: name,
      relationship: card.querySelector(".extra-member-relationship").value,
      mobile: card.querySelector(".extra-member-mobile").value.trim(),
      occupation: card.querySelector(".extra-member-occupation").value.trim(),
      dob: card.querySelector(".extra-member-dob").value,
      age: card.querySelector(".extra-member-age").value,
      imageField: imageField, // e.g., "extra_member_image_0"
      index: index,
    });
  });

  document.getElementById("extra_members_json").value = JSON.stringify(payload);
}

// Call before form submission
document
  .getElementById("familySetupForm")
  .addEventListener("submit", function () {
    syncExtraMembers();
  });
```

---

## Request/Response Cycle

### Frontend submits form:

```
POST /family/setup
Content-Type: multipart/form-data

[File: self_profile_image]
[File: father_profile_image]
[File: mother_profile_image]
[File: extra_member_image_0]
[File: extra_member_image_1]
extra_members_json: [{"name":"John","imageField":"extra_member_image_0",...}]
self_name: "David Smith"
father_name: "Robert Smith"
... other form fields ...
```

### Multer middleware processes:

1. Validates all image files (size, format)
2. Saves files to `uploads/family-members/` with unique names
3. Populates `req.files` object with file metadata
4. Populates `req.body` with form fields

### Controller processes `req.files` and `req.body`:

1. Creates `fileMap` from uploaded files
2. Builds image paths: `/uploads/family-members/{filename}`
3. Parses `extra_members_json`
4. Matches extra members with their uploaded images
5. Calls `familyModel.createFullFamilySetup()` with complete data
6. Redirects to success page

---

## Error Handling

### File Upload Errors:

```javascript
// Multer handles validation errors automatically:
// - File too large: 413 Payload Too Large
// - Invalid format: 400 Bad Request
// - Server error: 500 Internal Server Error

// To add custom error handling in your route:
router.post(
  "/setup",
  familyUpload.setupForm,
  (err, req, res, next) => {
    if (err) {
      return res.status(400).render("family/setup", {
        error: err.message || "File upload failed",
        formData: req.body,
      });
    }
    next();
  },
  familyController.createSetup,
);
```

### JSON Parsing Errors:

```javascript
// Already handled in controller with try-catch:
if (req.body.extra_members_json) {
  try {
    const parsed = JSON.parse(req.body.extra_members_json);
    // ... process ...
  } catch (parseError) {
    console.warn("Could not parse extra_members_json:", parseError.message);
    extraMembers = []; // Fall back to empty
  }
}
```

### Missing Required Files:

```javascript
// Just check if fileMap has the field:
const selfImagePath = fileMap["self_profile_image"]
  ? "/uploads/family-members/" + fileMap["self_profile_image"]
  : null;  // null is acceptable; not all files are required

// For database, optional fields can be NULL
self_image_path: selfImagePath,  // Passes null if not uploaded
```

---

## Accessing Data in Controller

```javascript
// Uploaded files (Multer with .fields())
req.files = {
  "field_name": [
    { filename: "...", path: "...", size: 12345, ... }
  ]
}

// Form fields
req.body = {
  "self_name": "David Smith",
  "father_name": "Robert Smith",
  "extra_members_json": "[{...}]",
  ...
}

// Extracted in controller:
const fileMap = {};
Object.keys(req.files || {}).forEach(fieldName => {
  if (req.files[fieldName]?.length > 0) {
    fileMap[fieldName] = req.files[fieldName][0].filename;
  }
});

const imagePath = fileMap["self_profile_image"]
  ? "/uploads/family-members/" + fileMap["self_profile_image"]
  : null;

const extraMembers = JSON.parse(req.body.extra_members_json || "[]");
```

---

## Troubleshooting

| Problem                         | Cause                                      | Solution                                                   |
| ------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| "Unexpected end of form"        | Busboy stream handling                     | Already fixed by switching to Multer                       |
| Files not saving                | Storage destination doesn't exist          | Middleware creates `uploads/family-members/` automatically |
| File not found in `req.files`   | Wrong field name or middleware not applied | Check HTML form field names match `.fields()` config       |
| `req.body` is empty             | `multipart/form-data` not parsed           | Ensure middleware is applied before controller             |
| `req.files` is undefined        | Middleware not configured                  | Use `.fields()` instead of `.single()`                     |
| Extra members images not linked | JSON imageField doesn't match filename     | Ensure form JS sets correct `imageField` value             |

---

## Migration from Busboy to Multer

### Before (Busboy):

```javascript
// middleware/familyUploadMiddleware.js
module.exports = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// routes/familyRoutes.js
router.post(
  "/setup",
  familyUpload.single("self_profile_image"),
  familyUpload.any(), // This caused issues
  familyController.createSetup,
);

// controller
const imagePath = req.file
  ? "/uploads/family-members/" + req.file.filename
  : null; // Only one file!
```

### After (Multer with .fields()):

```javascript
// middleware/familyUploadMiddleware.js
module.exports = {
  setupForm: uploader.fields([
    { name: "self_profile_image", maxCount: 1 },
    { name: "father_profile_image", maxCount: 1 },
    { name: "mother_profile_image", maxCount: 1 },
    { name: "extra_member_image_*", maxCount: 50 },
  ]),
  // ... other exports
};

// routes/familyRoutes.js
router.post(
  "/setup",
  familyUpload.setupForm, // Single middleware call!
  familyController.createSetup,
);

// controller
const fileMap = {};
Object.keys(req.files || {}).forEach((fieldName) => {
  if (req.files[fieldName]?.length > 0) {
    fileMap[fieldName] = req.files[fieldName][0].filename;
  }
});
// All files available in fileMap!
```

---

## Best Practices

1. **Always use try-catch for JSON parsing**: User data can be malformed
2. **Validate file sizes at middleware**: Prevent large uploads from wasting resources
3. **Use diskStorage for persistence**: tempFiles directory would be cleared
4. **Check if files exist before building paths**: Handle optional uploads gracefully
5. **Build a fileMap first**: Simplifies data mapping and extraction
6. **Log file uploads for debugging**: Helps troubleshoot "file not found" issues
7. **Clean up old uploads**: Implement cleanup for outdated/unused files
8. **Use `.fields()` for multiple named fields**: Much cleaner than `.any()`

---

## Testing the Implementation

### Manual Test (Postman/cURL):

```bash
curl -X POST http://localhost:3000/family/setup \
  -F "self_name=David Smith" \
  -F "self_profile_image=@/path/to/image.jpg" \
  -F "father_name=Robert Smith" \
  -F "father_profile_image=@/path/to/father.jpg" \
  -F "extra_member_image_0=@/path/to/extra.jpg" \
  -F 'extra_members_json=[{"name":"John","imageField":"extra_member_image_0"}]'
```

### Check Server Logs:

```javascript
// In controller, add logging:
console.log("req.files keys:", Object.keys(req.files || {}));
console.log("req.body keys:", Object.keys(req.body || {}));
console.log("fileMap:", fileMap);
console.log("extraMembers:", extraMembers);
```

### Verify Files on Disk:

```bash
ls -la uploads/family-members/
# Should show uploaded image files with timestamps
```

---

## Reference Links

- [Multer Documentation](https://github.com/expressjs/multer)
- [Multer .fields() API](https://github.com/expressjs/multer#fieldname-maxcount)
- [Node.js fs.mkdirSync](https://nodejs.org/api/fs.html#fs_fs_mkdirsync_path_options)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
