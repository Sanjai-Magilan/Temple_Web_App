const familyModel = require("../../models/familyModel");

exports.index = async (req, res) => {
  try {
    const families = await familyModel.getAdminFamilies();
    res.render("admin/families/index", {
      title: "Family Panel",
      user: req.user,
      families,
    });
  } catch (error) {
    console.error("Error loading admin family panel:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load family panel",
    });
  }
};

exports.details = async (req, res) => {
  try {
    const familyId = parseInt(req.params.familyId, 10);
    const data = await familyModel.getFamilyDetailsForAdmin(familyId);

    if (!data) {
      return res.status(404).send("Family not found");
    }

    return res.render("admin/families/details", {
      family: data.family,
      members: data.members,
      initialTree: data.initialTree,
    });
  } catch (error) {
    console.error("Error loading family details:", error);
    res.status(500).send("Failed to load family details");
  }
};

exports.tree = async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const tree = await familyModel.getThreeGenerationTree(memberId);
    if (!tree) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }
    res.json({ success: true, tree });
  } catch (error) {
    console.error("Error loading admin tree:", error);
    res.status(500).json({ success: false, message: "Failed to load tree" });
  }
};
