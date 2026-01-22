const userModel = require("../models/userModel");

exports.viewProfile = async (req, res) => {
  res.render("profile/profile", {
    title: "My Profile",
    user: req.user,
  });
};

exports.updateProfile = async (req, res) => {
  try {
    await userModel.updateProfile(req.user.id, req.body);
    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error updating profile");
  }
};
