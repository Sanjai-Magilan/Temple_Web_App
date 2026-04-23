/**
 * Family Model
 * 3-generation relational family tree support
 */

const pool = require("../config/database");

function toIntOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function findMemberByIdentity(connection, familyId, memberName, mobile) {
  const [rows] = await connection.execute(
    "SELECT id, family_id, member_name, mobile FROM family_members " +
      "WHERE family_id = ? AND LOWER(TRIM(member_name)) = ? " +
      "AND ((? IS NOT NULL AND mobile = ?) OR (? IS NULL AND mobile IS NULL)) " +
      "AND is_active = 1 LIMIT 1",
    [
      familyId,
      normalizeName(memberName),
      mobile || null,
      mobile || null,
      mobile || null,
    ],
  );
  return rows[0] || null;
}

async function linkSpousesInternal(connection, memberAId, memberBId) {
  if (!memberAId || !memberBId) return;
  await connection.execute(
    "UPDATE family_members SET spouse_member_id = ? WHERE id = ?",
    [memberBId, memberAId],
  );
  await connection.execute(
    "UPDATE family_members SET spouse_member_id = ? WHERE id = ?",
    [memberAId, memberBId],
  );
}

async function createMemberInternal(connection, memberData) {
  const [result] = await connection.execute(
    "INSERT INTO family_members " +
      "(family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [
      memberData.family_id,
      memberData.user_id || null,
      memberData.member_name,
      memberData.relationship,
      memberData.gender || "other",
      toIntOrNull(memberData.father_member_id),
      toIntOrNull(memberData.mother_member_id),
      toIntOrNull(memberData.spouse_member_id),
      memberData.email || null,
      memberData.mobile || null,
      memberData.address || null,
      memberData.occupation || null,
      toIntOrNull(memberData.age),
      memberData.date_of_birth || null,
      memberData.profile_image_path || null,
    ],
  );
  return result.insertId;
}

exports.create = async (familyData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "INSERT INTO families (family_name, head_user_id, address, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?)",
      [
        familyData.family_name,
        familyData.head_user_id,
        familyData.address || null,
        familyData.city || null,
        familyData.state || null,
        familyData.pincode || null,
      ],
    );

    const familyId = result.insertId;
    const familyUid = "FAM" + String(familyId).padStart(6, "0");

    await connection.execute(
      "UPDATE families SET family_uid = ? WHERE id = ?",
      [familyUid, familyId],
    );

    const [userRows] = await connection.execute(
      "SELECT first_name, last_name, email, phone FROM users WHERE id = ?",
      [familyData.head_user_id],
    );

    if (userRows.length > 0) {
      const user = userRows[0];
      await createMemberInternal(connection, {
        family_id: familyId,
        user_id: familyData.head_user_id,
        member_name: (user.first_name || "") + " " + (user.last_name || ""),
        relationship: "head",
        gender: "male",
        email: user.email,
        mobile: user.phone,
      });
    }

    const [rows] = await connection.execute(
      "SELECT id, family_uid, family_name, head_user_id, address, city, state, pincode, created_at " +
        "FROM families WHERE id = ?",
      [familyId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.findById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT id, family_uid, family_name, head_user_id, address, city, state, pincode, created_at " +
      "FROM families WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

exports.findByHeadUserId = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT id, family_uid, family_name, head_user_id, address, city, state, pincode, created_at " +
      "FROM families WHERE head_user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
    [userId],
  );
  return rows[0] || null;
};

exports.findByUserId = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT f.id, f.family_uid, f.family_name, f.head_user_id, f.address, f.city, f.state, f.pincode, f.created_at, fm.relationship " +
      "FROM families f INNER JOIN family_members fm ON f.id = fm.family_id " +
      "WHERE fm.user_id = ? AND fm.is_active = 1",
    [userId],
  );
  return rows;
};

exports.getFamilyByMemberId = async (memberId) => {
  const [rows] = await pool.execute(
    "SELECT f.id, f.family_uid, f.family_name, f.head_user_id, f.address, f.city, f.state, f.pincode, f.created_at " +
      "FROM families f INNER JOIN family_members fm ON fm.family_id = f.id " +
      "WHERE fm.id = ? LIMIT 1",
    [memberId],
  );
  return rows[0] || null;
};

exports.getMemberByUserId = async (familyId, userId) => {
  const [rows] = await pool.execute(
    "SELECT id, family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active, added_at, updated_at " +
      "FROM family_members WHERE family_id = ? AND user_id = ? AND is_active = 1 LIMIT 1",
    [familyId, userId],
  );
  return rows[0] || null;
};

exports.update = async (familyId, familyData) => {
  await pool.execute(
    "UPDATE families SET family_name = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?",
    [
      familyData.family_name,
      familyData.address || null,
      familyData.city || null,
      familyData.state || null,
      familyData.pincode || null,
      familyId,
    ],
  );
  return exports.findById(familyId);
};

exports.addMember = async (memberData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const memberId = await createMemberInternal(connection, memberData);

    if (memberData.spouse_member_id) {
      await linkSpousesInternal(
        connection,
        memberId,
        toIntOrNull(memberData.spouse_member_id),
      );
    }

    await connection.commit();
    return exports.getMemberById(memberId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.getMemberById = async (memberId) => {
  const [rows] = await pool.execute(
    "SELECT id, family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active, added_at, updated_at " +
      "FROM family_members WHERE id = ?",
    [memberId],
  );
  return rows[0] || null;
};

exports.updateMember = async (memberId, memberData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE family_members SET member_name = ?, relationship = ?, gender = ?, father_member_id = ?, mother_member_id = ?, spouse_member_id = ?, " +
        "email = ?, mobile = ?, address = ?, occupation = ?, age = ?, date_of_birth = ?, profile_image_path = COALESCE(?, profile_image_path) " +
        "WHERE id = ?",
      [
        memberData.member_name,
        memberData.relationship,
        memberData.gender || "other",
        toIntOrNull(memberData.father_member_id),
        toIntOrNull(memberData.mother_member_id),
        toIntOrNull(memberData.spouse_member_id),
        memberData.email || null,
        memberData.mobile || null,
        memberData.address || null,
        memberData.occupation || null,
        toIntOrNull(memberData.age),
        memberData.date_of_birth || null,
        memberData.profile_image_path || null,
        memberId,
      ],
    );

    if (memberData.spouse_member_id) {
      await linkSpousesInternal(
        connection,
        memberId,
        toIntOrNull(memberData.spouse_member_id),
      );
    }

    await connection.commit();
    return exports.getMemberById(memberId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.deleteMember = async (memberId) => {
  await pool.execute("UPDATE family_members SET is_active = 0 WHERE id = ?", [
    memberId,
  ]);
  return true;
};

exports.getMembers = async (familyId) => {
  const [rows] = await pool.execute(
    "SELECT id, family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active, added_at, updated_at " +
      "FROM family_members WHERE family_id = ? AND is_active = 1 " +
      "ORDER BY CASE relationship WHEN 'head' THEN 1 WHEN 'spouse' THEN 2 WHEN 'child' THEN 3 ELSE 4 END, added_at ASC",
    [familyId],
  );
  return rows;
};

exports.getChildren = async (familyId) => {
  const [rows] = await pool.execute(
    "SELECT id, family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active, added_at, updated_at " +
      "FROM family_members WHERE family_id = ? AND relationship = 'child' AND is_active = 1 ORDER BY added_at ASC",
    [familyId],
  );
  return rows;
};

exports.isHead = async (familyId, userId) => {
  const [rows] = await pool.execute(
    "SELECT id FROM families WHERE id = ? AND head_user_id = ?",
    [familyId, userId],
  );
  return rows.length > 0;
};

exports.isMember = async (familyId, userId) => {
  const [rows] = await pool.execute(
    "SELECT id FROM family_members WHERE family_id = ? AND user_id = ? AND is_active = 1",
    [familyId, userId],
  );
  return rows.length > 0;
};

exports.isUserInFamily = async (familyId, userId) => {
  const head = await exports.isHead(familyId, userId);
  if (head) return true;
  return exports.isMember(familyId, userId);
};

exports.createFullFamilySetup = async (payload) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (!payload.father_name || !payload.mother_name || !payload.self_name) {
      throw new Error("Father, mother and selected person are required.");
    }

    if ((payload.father_gender || "male") !== "male") {
      throw new Error("Family head must be male as per current rule.");
    }

    let familyId = null;

    // 1) If current logged-in user already belongs to a family, use that first
    const [existingFamilyByUserMemberRows] = await connection.execute(
      "SELECT family_id FROM family_members WHERE user_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1",
      [payload.user_id],
    );

    if (existingFamilyByUserMemberRows.length > 0) {
      familyId = existingFamilyByUserMemberRows[0].family_id;
    } else {
      // 2) Else if user is family head, use that family
      const [existingFamilyByHeadRows] = await connection.execute(
        "SELECT id FROM families WHERE head_user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
        [payload.user_id],
      );

      if (existingFamilyByHeadRows.length > 0) {
        familyId = existingFamilyByHeadRows[0].id;
      } else {
        // 3) Else fallback father match
        const [existingFatherRows] = await connection.execute(
          "SELECT family_id FROM family_members WHERE relationship = 'head' AND LOWER(TRIM(member_name)) = ? " +
            "AND ((? IS NOT NULL AND mobile = ?) OR (? IS NULL AND mobile IS NULL)) AND is_active = 1 LIMIT 1",
          [
            normalizeName(payload.father_name),
            payload.father_mobile || null,
            payload.father_mobile || null,
            payload.father_mobile || null,
          ],
        );

        if (existingFatherRows.length > 0) {
          familyId = existingFatherRows[0].family_id;
        } else {
          // 4) Create new only if no match anywhere
          const [familyInsert] = await connection.execute(
            "INSERT INTO families (family_name, head_user_id, address, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?)",
            [
              payload.family_name || payload.father_name + " Family",
              payload.user_id,
              payload.address || null,
              payload.city || null,
              payload.state || null,
              payload.pincode || null,
            ],
          );
          familyId = familyInsert.insertId;
          const familyUid = "FAM" + String(familyId).padStart(6, "0");
          await connection.execute(
            "UPDATE families SET family_uid = ? WHERE id = ?",
            [familyUid, familyId],
          );
        }
      }
    }

    await connection.execute(
      "UPDATE families SET family_name = ?, address = ?, city = ?, state = ?, pincode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        payload.family_name || payload.father_name + " Family",
        payload.address || null,
        payload.city || null,
        payload.state || null,
        payload.pincode || null,
        familyId,
      ],
    );

    let fatherMember = await findMemberByIdentity(
      connection,
      familyId,
      payload.father_name,
      payload.father_mobile || null,
    );
    if (!fatherMember) {
      const fatherId = await createMemberInternal(connection, {
        family_id: familyId,
        member_name: payload.father_name,
        relationship: "head",
        gender: "male",
        mobile: payload.father_mobile || null,
        date_of_birth: payload.father_dob || null,
        age: payload.father_age || null,
        occupation: payload.father_occupation || null,
      });
      fatherMember = { id: fatherId };
    }

    let motherMember = await findMemberByIdentity(
      connection,
      familyId,
      payload.mother_name,
      payload.mother_mobile || null,
    );
    if (!motherMember) {
      const motherId = await createMemberInternal(connection, {
        family_id: familyId,
        member_name: payload.mother_name,
        relationship: "spouse",
        gender: "female",
        mobile: payload.mother_mobile || null,
        date_of_birth: payload.mother_dob || null,
        age: payload.mother_age || null,
        occupation: payload.mother_occupation || null,
        spouse_member_id: fatherMember.id,
      });
      motherMember = { id: motherId };
    }

    await linkSpousesInternal(connection, fatherMember.id, motherMember.id);

    const [existingUserRows] = await connection.execute(
      "SELECT id FROM family_members WHERE family_id = ? AND user_id = ? AND is_active = 1 LIMIT 1",
      [familyId, payload.user_id],
    );

    let selfMemberId = null;

    if (existingUserRows.length > 0) {
      selfMemberId = existingUserRows[0].id;
      await connection.execute(
        "UPDATE family_members SET member_name = ?, relationship = 'child', gender = ?, father_member_id = ?, mother_member_id = ?, " +
          "mobile = COALESCE(?, mobile), occupation = COALESCE(?, occupation), age = COALESCE(?, age), date_of_birth = COALESCE(?, date_of_birth), " +
          "profile_image_path = COALESCE(?, profile_image_path) WHERE id = ?",
        [
          payload.self_name,
          payload.self_gender || "male",
          fatherMember.id,
          motherMember.id,
          payload.self_mobile || null,
          payload.self_occupation || null,
          payload.self_age || null,
          payload.self_dob || null,
          payload.self_image_path || null,
          selfMemberId,
        ],
      );
    } else {
      selfMemberId = await createMemberInternal(connection, {
        family_id: familyId,
        user_id: payload.user_id,
        member_name: payload.self_name,
        relationship: "child",
        gender: payload.self_gender || "male",
        father_member_id: fatherMember.id,
        mother_member_id: motherMember.id,
        mobile: payload.self_mobile || null,
        date_of_birth: payload.self_dob || null,
        age: payload.self_age || null,
        occupation: payload.self_occupation || null,
        profile_image_path: payload.self_image_path || null,
      });
    }

    const siblings = Array.isArray(payload.siblings) ? payload.siblings : [];
    for (const s of siblings) {
      if (!s || !s.name) continue;
      const exists = await findMemberByIdentity(
        connection,
        familyId,
        s.name,
        s.mobile || null,
      );
      if (exists) continue;
      await createMemberInternal(connection, {
        family_id: familyId,
        member_name: s.name,
        relationship: "child",
        gender: s.gender || "other",
        father_member_id: fatherMember.id,
        mother_member_id: motherMember.id,
        mobile: s.mobile || null,
        date_of_birth: s.dob || null,
        age: s.age || null,
        occupation: s.occupation || null,
      });
    }

    let spouseMemberId = null;
    if (payload.spouse_name && payload.spouse_name.trim()) {
      const spouseName = payload.spouse_name.trim();

      // current spouse (if any) of self member
      const [selfRows] = await connection.execute(
        "SELECT id, spouse_member_id FROM family_members WHERE id = ? LIMIT 1",
        [selfMemberId],
      );
      const currentSpouseId =
        selfRows.length > 0 ? selfRows[0].spouse_member_id : null;

      const spouseExists = await findMemberByIdentity(
        connection,
        familyId,
        spouseName,
        payload.spouse_mobile || null,
      );

      if (spouseExists) {
        spouseMemberId = spouseExists.id;
        await connection.execute(
          "UPDATE family_members SET member_name = ?, relationship = 'spouse', gender = ?, mobile = COALESCE(?, mobile), " +
            "date_of_birth = COALESCE(?, date_of_birth), age = COALESCE(?, age), occupation = COALESCE(?, occupation) WHERE id = ?",
          [
            spouseName,
            payload.spouse_gender || "other",
            payload.spouse_mobile || null,
            payload.spouse_dob || null,
            payload.spouse_age || null,
            payload.spouse_occupation || null,
            spouseMemberId,
          ],
        );
      } else {
        spouseMemberId = await createMemberInternal(connection, {
          family_id: familyId,
          member_name: spouseName,
          relationship: "spouse",
          gender: payload.spouse_gender || "other",
          mobile: payload.spouse_mobile || null,
          date_of_birth: payload.spouse_dob || null,
          age: payload.spouse_age || null,
          occupation: payload.spouse_occupation || null,
        });
      }

      // clear old spouse backlink if spouse changed
      if (currentSpouseId && currentSpouseId !== spouseMemberId) {
        await connection.execute(
          "UPDATE family_members SET spouse_member_id = NULL WHERE id = ?",
          [currentSpouseId],
        );
      }

      await linkSpousesInternal(connection, selfMemberId, spouseMemberId);
    }

    const children = Array.isArray(payload.children) ? payload.children : [];
    if (children.length > 0 && !spouseMemberId) {
      throw new Error(
        "Children require spouse data so both father and mother can be set.",
      );
    }

    for (const c of children) {
      if (!c || !c.name) continue;
      const exists = await findMemberByIdentity(
        connection,
        familyId,
        c.name,
        c.mobile || null,
      );
      if (exists) continue;

      const selfGender = (payload.self_gender || "male").toLowerCase();
      const childFatherId =
        selfGender === "female" ? spouseMemberId : selfMemberId;
      const childMotherId =
        selfGender === "female" ? selfMemberId : spouseMemberId;

      if (!childFatherId || !childMotherId) {
        throw new Error(
          "Each child must have both father and mother references.",
        );
      }

      await createMemberInternal(connection, {
        family_id: familyId,
        member_name: c.name,
        relationship: "child",
        gender: c.gender || "other",
        father_member_id: childFatherId,
        mother_member_id: childMotherId,
        mobile: c.mobile || null,
        date_of_birth: c.dob || null,
        age: c.age || null,
        occupation: c.occupation || null,
      });
    }

    await connection.commit();

    const family = await exports.findById(familyId);
    const members = await exports.getMembers(familyId);

    return { family, members };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.getThreeGenerationTree = async (selectedMemberId) => {
  const member = await exports.getMemberById(selectedMemberId);
  if (!member || !member.is_active) return null;

  const spouse = member.spouse_member_id
    ? await exports.getMemberById(member.spouse_member_id)
    : null;
  const father = member.father_member_id
    ? await exports.getMemberById(member.father_member_id)
    : null;
  const mother = member.mother_member_id
    ? await exports.getMemberById(member.mother_member_id)
    : null;

  const [children] = await pool.execute(
    "SELECT id, family_id, user_id, member_name, relationship, gender, father_member_id, mother_member_id, spouse_member_id, " +
      "email, mobile, address, occupation, age, date_of_birth, profile_image_path, is_active, added_at, updated_at " +
      "FROM family_members WHERE family_id = ? AND is_active = 1 AND (father_member_id = ? OR mother_member_id = ?) " +
      "ORDER BY member_name ASC",
    [member.family_id, member.id, member.id],
  );

  return {
    family_id: member.family_id,
    selected: member,
    spouse: spouse && spouse.is_active ? spouse : null,
    parents: {
      father: father && father.is_active ? father : null,
      mother: mother && mother.is_active ? mother : null,
    },
    children: children || [],
  };
};

exports.getMyFamilyView = async (familyId, selectedMemberId) => {
  const tree = await exports.getThreeGenerationTree(selectedMemberId);
  if (!tree || tree.family_id !== familyId) return null;

  const [siblings] = await pool.execute(
    "SELECT id, member_name, gender, relationship, mobile, age, profile_image_path FROM family_members " +
      "WHERE family_id = ? AND is_active = 1 AND id != ? AND father_member_id <=> ? AND mother_member_id <=> ? " +
      "ORDER BY member_name ASC",
    [
      familyId,
      selectedMemberId,
      tree.selected.father_member_id || null,
      tree.selected.mother_member_id || null,
    ],
  );

  return {
    selected: tree.selected,
    parents: tree.parents,
    spouse: tree.spouse,
    children: tree.children,
    siblings: siblings || [],
  };
};

exports.getDashboardFamilySummary = async (userId) => {
  let family = await exports.findByHeadUserId(userId);
  if (!family) {
    const families = await exports.findByUserId(userId);
    if (families.length > 0) {
      family = await exports.findById(families[0].id);
    }
  }
  if (!family) return null;

  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM family_members WHERE family_id = ? AND is_active = 1",
    [family.id],
  );

  const selfMember = await exports.getMemberByUserId(family.id, userId);
  const selected =
    selfMember ||
    (
      await pool.execute(
        "SELECT id FROM family_members WHERE family_id = ? AND relationship = 'head' AND is_active = 1 LIMIT 1",
        [family.id],
      )
    )[0][0];

  const selectedId = selfMember ? selfMember.id : selected ? selected.id : null;
  let myView = null;
  if (selectedId) {
    myView = await exports.getMyFamilyView(family.id, selectedId);
  }

  return {
    family,
    member_count: countRows[0].count,
    my_view: myView,
  };
};

exports.getAdminFamilies = async () => {
  const [rows] = await pool.execute(
    "SELECT f.id, f.family_uid, f.family_name, f.created_at, " +
      "COALESCE(h.member_name, CONCAT(u.first_name, ' ', u.last_name)) AS head_name, " +
      "COUNT(fm.id) AS members_count " +
      "FROM families f " +
      "LEFT JOIN users u ON u.id = f.head_user_id " +
      "LEFT JOIN family_members h ON h.family_id = f.id AND h.relationship = 'head' AND h.is_active = 1 " +
      "LEFT JOIN family_members fm ON fm.family_id = f.id AND fm.is_active = 1 " +
      "GROUP BY f.id, f.family_uid, f.family_name, f.created_at, head_name " +
      "ORDER BY f.created_at DESC",
  );
  return rows;
};

exports.getFamilyDetailsForAdmin = async (familyId) => {
  const family = await exports.findById(familyId);
  if (!family) return null;

  const members = await exports.getMembers(familyId);
  let initial = members.find((m) => m.relationship === "head");
  if (!initial && members.length > 0) initial = members[0];

  const initialTree = initial
    ? await exports.getThreeGenerationTree(initial.id)
    : null;

  return {
    family,
    members,
    initialTree,
  };
};
