/**
 * Family Controller
 * Handles setup, listing, tree API, member CRUD
 */

const familyModel = require("../models/familyModel");

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function pickValue(currentValue, fallbackValue) {
  if (currentValue === undefined || currentValue === null)
    return fallbackValue || "";
  const text = String(currentValue).trim();
  return text === "" ? fallbackValue || "" : text;
}

async function resolveFamilyForUser(userId) {
  let family = await familyModel.findByHeadUserId(userId);
  if (!family) {
    const families = await familyModel.findByUserId(userId);
    if (families.length > 0) {
      family = await familyModel.findById(families[0].id);
    }
  }
  return family;
}

async function buildSetupContext(user) {
  const userId = user.id;
  const family = await resolveFamilyForUser(userId);

  const defaultSelfName = (
    (user.first_name || "") +
    " " +
    (user.last_name || "")
  ).trim();

  if (!family) {
    return {
      family: null,
      formData: {
        self_name: defaultSelfName,
        self_gender: "male",
        siblings_json: "[]",
        children_json: "[]",
      },
    };
  }

  const members = await familyModel.getMembers(family.id);
  const byId = {};
  members.forEach(function (m) {
    byId[m.id] = m;
  });

  let selfMember = await familyModel.getMemberByUserId(family.id, userId);
  if (!selfMember) {
    selfMember =
      members.find(function (m) {
        return m.user_id === userId;
      }) ||
      members.find(function (m) {
        return m.relationship === "head";
      }) ||
      null;
  }

  const father =
    selfMember && selfMember.father_member_id
      ? byId[selfMember.father_member_id]
      : null;
  const mother =
    selfMember && selfMember.mother_member_id
      ? byId[selfMember.mother_member_id]
      : null;
  const spouse =
    selfMember && selfMember.spouse_member_id
      ? byId[selfMember.spouse_member_id]
      : null;

  const siblings = selfMember
    ? members
        .filter(function (m) {
          return (
            m.id !== selfMember.id &&
            m.father_member_id === selfMember.father_member_id &&
            m.mother_member_id === selfMember.mother_member_id
          );
        })
        .map(function (m) {
          return {
            name: m.member_name,
            gender: m.gender || "other",
            mobile: m.mobile || null,
            occupation: m.occupation || null,
            dob: m.date_of_birth || null,
            age: m.age || null,
          };
        })
    : [];

  const children = selfMember
    ? members
        .filter(function (m) {
          return (
            m.father_member_id === selfMember.id ||
            m.mother_member_id === selfMember.id
          );
        })
        .map(function (m) {
          return {
            name: m.member_name,
            gender: m.gender || "other",
            mobile: m.mobile || null,
            occupation: m.occupation || null,
            dob: m.date_of_birth || null,
            age: m.age || null,
          };
        })
    : [];

  return {
    family: family,
    formData: {
      family_name: family.family_name || "",
      address: family.address || "",
      city: family.city || "",
      state: family.state || "",
      pincode: family.pincode || "",

      father_name: father ? father.member_name : "",
      father_mobile: father ? father.mobile || "" : "",
      father_dob: father ? father.date_of_birth || "" : "",
      father_age: father ? father.age || "" : "",
      father_occupation: father ? father.occupation || "" : "",

      mother_name: mother ? mother.member_name : "",
      mother_mobile: mother ? mother.mobile || "" : "",
      mother_dob: mother ? mother.date_of_birth || "" : "",
      mother_age: mother ? mother.age || "" : "",
      mother_occupation: mother ? mother.occupation || "" : "",

      self_name: selfMember ? selfMember.member_name : defaultSelfName,
      self_mobile: selfMember ? selfMember.mobile || "" : "",
      self_gender: selfMember ? selfMember.gender || "male" : "male",
      self_dob: selfMember ? selfMember.date_of_birth || "" : "",
      self_age: selfMember ? selfMember.age || "" : "",
      self_occupation: selfMember ? selfMember.occupation || "" : "",

      spouse_name: spouse ? spouse.member_name : "",
      spouse_mobile: spouse ? spouse.mobile || "" : "",
      spouse_gender: spouse ? spouse.gender || "" : "",
      spouse_dob: spouse ? spouse.date_of_birth || "" : "",
      spouse_age: spouse ? spouse.age || "" : "",
      spouse_occupation: spouse ? spouse.occupation || "" : "",

      siblings_json: JSON.stringify(siblings),
      children_json: JSON.stringify(children),
    },
  };
}

exports.showSetup = async (req, res) => {
  try {
    const context = await buildSetupContext(req.user);

    res.render("family/setup", {
      title: "Family Setup",
      family: context.family,
      error: null,
      formData: context.formData,
    });
  } catch (error) {
    console.error("Error showing family setup:", error);
    res.status(500).render("errors/500", { title: "Error" });
  }
};

exports.createSetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const context = await buildSetupContext(req.user);
    const seed = context.formData || {};

    const siblingsPosted = parseJsonArray(req.body.siblings_json);
    const childrenPosted = parseJsonArray(req.body.children_json);

    const siblings =
      siblingsPosted.length > 0
        ? siblingsPosted
        : parseJsonArray(seed.siblings_json);
    const children =
      childrenPosted.length > 0
        ? childrenPosted
        : parseJsonArray(seed.children_json);

    const imagePath = req.file
      ? "/uploads/family-members/" + req.file.filename
      : null;

    await familyModel.createFullFamilySetup({
      user_id: userId,

      family_name: pickValue(req.body.family_name, seed.family_name),
      address: pickValue(req.body.address, seed.address),
      city: pickValue(req.body.city, seed.city),
      state: pickValue(req.body.state, seed.state),
      pincode: pickValue(req.body.pincode, seed.pincode),

      father_name: pickValue(req.body.father_name, seed.father_name),
      father_mobile: pickValue(req.body.father_mobile, seed.father_mobile),
      father_dob: pickValue(req.body.father_dob, seed.father_dob),
      father_age: pickValue(req.body.father_age, seed.father_age),
      father_occupation: pickValue(
        req.body.father_occupation,
        seed.father_occupation,
      ),
      father_gender: "male",

      mother_name: pickValue(req.body.mother_name, seed.mother_name),
      mother_mobile: pickValue(req.body.mother_mobile, seed.mother_mobile),
      mother_dob: pickValue(req.body.mother_dob, seed.mother_dob),
      mother_age: pickValue(req.body.mother_age, seed.mother_age),
      mother_occupation: pickValue(
        req.body.mother_occupation,
        seed.mother_occupation,
      ),

      self_name: pickValue(req.body.self_name, seed.self_name),
      self_mobile: pickValue(req.body.self_mobile, seed.self_mobile),
      self_gender: pickValue(req.body.self_gender, seed.self_gender || "male"),
      self_dob: pickValue(req.body.self_dob, seed.self_dob),
      self_age: pickValue(req.body.self_age, seed.self_age),
      self_occupation: pickValue(
        req.body.self_occupation,
        seed.self_occupation,
      ),
      self_image_path: imagePath,

      spouse_name: pickValue(req.body.spouse_name, seed.spouse_name),
      spouse_mobile: pickValue(req.body.spouse_mobile, seed.spouse_mobile),
      spouse_gender: pickValue(req.body.spouse_gender, seed.spouse_gender),
      spouse_dob: pickValue(req.body.spouse_dob, seed.spouse_dob),
      spouse_age: pickValue(req.body.spouse_age, seed.spouse_age),
      spouse_occupation: pickValue(
        req.body.spouse_occupation,
        seed.spouse_occupation,
      ),

      siblings: siblings,
      children: children,
    });

    res.redirect("/family?success=family_saved");
  } catch (error) {
    console.error("Error creating family setup:", error);
    const context = await buildSetupContext(req.user);

    res.status(400).render("family/setup", {
      title: "Family Setup",
      family: context.family,
      error: error.message || "Failed to save family setup.",
      formData: Object.assign({}, context.formData, req.body),
    });
  }
};

exports.listMembers = async (req, res) => {
  try {
    const userId = req.user.id;

    let family = await familyModel.findByHeadUserId(userId);
    if (!family) {
      const families = await familyModel.findByUserId(userId);
      if (families.length > 0) {
        family = await familyModel.findById(families[0].id);
      }
    }

    if (!family) {
      return res.render("family/list", {
        title: "Family",
        family: null,
        members: [],
        isHead: false,
        message: "No family data found. Please complete family setup.",
        myFamilyView: null,
        selectedMemberId: null,
        initialTree: null,
      });
    }

    const members = await familyModel.getMembers(family.id);
    const isHead = await familyModel.isHead(family.id, userId);

    let selectedMemberId = parseInt(req.query.memberId || "", 10);
    if (Number.isNaN(selectedMemberId)) selectedMemberId = null;

    if (!selectedMemberId) {
      const selfMember = await familyModel.getMemberByUserId(family.id, userId);
      if (selfMember) {
        selectedMemberId = selfMember.id;
      } else {
        const head = members.find((m) => m.relationship === "head");
        selectedMemberId = head
          ? head.id
          : members.length > 0
            ? members[0].id
            : null;
      }
    }

    let initialTree = null;
    let myFamilyView = null;
    if (selectedMemberId) {
      initialTree = await familyModel.getThreeGenerationTree(selectedMemberId);
      myFamilyView = await familyModel.getMyFamilyView(
        family.id,
        selectedMemberId,
      );
    }

    res.render("family/list", {
      title: "Family",
      family,
      members,
      isHead,
      message: null,
      myFamilyView,
      selectedMemberId,
      initialTree,
    });
  } catch (error) {
    console.error("Error listing family members:", error);
    res.status(500).render("errors/500", { title: "Error" });
  }
};

exports.getTreeJson = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = parseInt(req.params.memberId, 10);

    const family = await familyModel.getFamilyByMemberId(memberId);
    if (!family) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    const allowed = await familyModel.isUserInFamily(family.id, userId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const tree = await familyModel.getThreeGenerationTree(memberId);
    return res.json({ success: true, tree });
  } catch (error) {
    console.error("Error getting family tree:", error);
    res.status(500).json({ success: false, message: "Failed to load tree" });
  }
};

exports.showAddMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const family = await familyModel.findByHeadUserId(userId);

    if (!family) {
      return res.redirect("/family/setup");
    }

    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render("errors/403", { title: "Access Denied" });
    }

    const members = await familyModel.getMembers(family.id);

    res.render("family/add", {
      title: "Add Family Member",
      family,
      members,
      error: null,
      formData: {},
    });
  } catch (error) {
    console.error("Error showing add member form:", error);
    res.status(500).render("errors/500", { title: "Error" });
  }
};

exports.addMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const family = await familyModel.findByHeadUserId(userId);

    if (!family) {
      return res.redirect("/family/setup");
    }

    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render("errors/403", { title: "Access Denied" });
    }

    const body = req.body;
    if (!body.member_name || !body.member_name.trim()) {
      const members = await familyModel.getMembers(family.id);
      return res.render("family/add", {
        title: "Add Family Member",
        family,
        members,
        error: "Member name is required",
        formData: body,
      });
    }

    const imagePath = req.file
      ? "/uploads/family-members/" + req.file.filename
      : null;

    await familyModel.addMember({
      family_id: family.id,
      user_id: body.user_id || null,
      member_name: body.member_name.trim(),
      relationship: body.relationship || "other",
      gender: body.gender || "other",
      father_member_id: body.father_member_id || null,
      mother_member_id: body.mother_member_id || null,
      spouse_member_id: body.spouse_member_id || null,
      email: body.email || null,
      mobile: body.mobile || null,
      address: body.address || null,
      occupation: body.occupation || null,
      age: body.age || null,
      date_of_birth: body.date_of_birth || null,
      profile_image_path: imagePath,
    });

    res.redirect("/family?success=member_added");
  } catch (error) {
    console.error("Error adding family member:", error);
    const family = await familyModel.findByHeadUserId(req.user.id);
    const members = family ? await familyModel.getMembers(family.id) : [];
    res.status(400).render("family/add", {
      title: "Add Family Member",
      family,
      members,
      error: error.message || "Failed to add member.",
      formData: req.body,
    });
  }
};

exports.showEditMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;

    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render("errors/404", { title: "Not Found" });
    }

    const family = await familyModel.findById(member.family_id);
    const isHead = await familyModel.isHead(family.id, userId);

    if (!isHead) {
      return res.status(403).render("errors/403", { title: "Access Denied" });
    }

    const members = await familyModel.getMembers(family.id);

    res.render("family/edit", {
      title: "Edit Family Member",
      family,
      member,
      members,
      error: null,
    });
  } catch (error) {
    console.error("Error showing edit member:", error);
    res.status(500).render("errors/500", { title: "Error" });
  }
};

exports.editMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;

    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render("errors/404", { title: "Not Found" });
    }

    const family = await familyModel.findById(member.family_id);
    const isHead = await familyModel.isHead(family.id, userId);

    if (!isHead) {
      return res.status(403).render("errors/403", { title: "Access Denied" });
    }

    const body = req.body;
    if (!body.member_name || !body.member_name.trim()) {
      const members = await familyModel.getMembers(family.id);
      return res.render("family/edit", {
        title: "Edit Family Member",
        family,
        member: Object.assign({}, member, body),
        members,
        error: "Member name is required",
      });
    }

    const imagePath = req.file
      ? "/uploads/family-members/" + req.file.filename
      : null;

    await familyModel.updateMember(memberId, {
      member_name: body.member_name.trim(),
      relationship: body.relationship || "other",
      gender: body.gender || "other",
      father_member_id: body.father_member_id || null,
      mother_member_id: body.mother_member_id || null,
      spouse_member_id: body.spouse_member_id || null,
      email: body.email || null,
      mobile: body.mobile || null,
      address: body.address || null,
      occupation: body.occupation || null,
      age: body.age || null,
      date_of_birth: body.date_of_birth || null,
      profile_image_path: imagePath,
    });

    res.redirect("/family?success=member_updated");
  } catch (error) {
    console.error("Error editing member:", error);
    const member = await familyModel.getMemberById(req.params.id);
    const family = member ? await familyModel.findById(member.family_id) : null;
    const members = family ? await familyModel.getMembers(family.id) : [];
    res.status(400).render("family/edit", {
      title: "Edit Family Member",
      family,
      member: Object.assign({}, member || {}, req.body),
      members,
      error: error.message || "Failed to update member.",
    });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;

    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    const family = await familyModel.findById(member.family_id);
    const isHead = await familyModel.isHead(family.id, userId);

    if (!isHead) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (member.relationship === "head") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete family head" });
    }

    await familyModel.deleteMember(memberId);
    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    console.error("Error deleting member:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete member" });
  }
};

exports.viewMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;

    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render("errors/404", { title: "Not Found" });
    }

    const family = await familyModel.findById(member.family_id);
    const isHead = await familyModel.isHead(family.id, userId);
    const isMember = await familyModel.isMember(family.id, userId);

    if (!isHead && !isMember) {
      return res.status(403).render("errors/403", { title: "Access Denied" });
    }

    res.render("family/view", {
      title: "View Family Member",
      family,
      member,
      isHead,
    });
  } catch (error) {
    console.error("Error viewing member:", error);
    res.status(500).render("errors/500", { title: "Error" });
  }
};
