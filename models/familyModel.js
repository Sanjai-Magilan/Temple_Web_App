/**
 * Family Model
 * Handles all family-related database operations
 */

const pool = require("../config/database");

/**
 * Create new family
 */
exports.create = async (familyData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert family
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

    // Add head user as family member with their details
    const [userRows] = await connection.execute(
      "SELECT first_name, last_name, email, phone FROM users WHERE id = ?",
      [familyData.head_user_id],
    );

    if (userRows.length > 0) {
      const user = userRows[0];
      await connection.execute(
        `INSERT INTO family_members (family_id, user_id, member_name, relationship, email, mobile, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          familyData.head_user_id,
          `${user.first_name} ${user.last_name}`,
          "head",
          user.email,
          user.phone,
          1,
        ],
      );
    }

    // Get created family
    const [rows] = await connection.execute(
      "SELECT id, family_name, head_user_id, address, city, state, pincode, created_at FROM families WHERE id = ?",
      [familyId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error("Error creating family:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Find family by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, family_name, head_user_id, address, city, state, pincode, created_at FROM families WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding family by ID:", error);
    throw error;
  }
};

/**
 * Find family by head user ID
 */
exports.findByHeadUserId = async (userId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, family_name, head_user_id, address, city, state, pincode, created_at FROM families WHERE head_user_id = ?",
      [userId],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding family by head user ID:", error);
    throw error;
  }
};

/**
 * Find families where user is a member
 */
exports.findByUserId = async (userId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.family_name, f.head_user_id, f.address, f.city, f.state, f.pincode, f.created_at,
              fm.relationship
       FROM families f
       INNER JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = ? AND fm.is_active = 1`,
      [userId],
    );
    return rows;
  } catch (error) {
    console.error("Error finding families by user ID:", error);
    throw error;
  }
};

/**
 * Update family details
 */
exports.update = async (familyId, familyData) => {
  try {
    await pool.execute(
      `UPDATE families SET family_name = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?`,
      [
        familyData.family_name,
        familyData.address || null,
        familyData.city || null,
        familyData.state || null,
        familyData.pincode || null,
        familyId,
      ],
    );
    return await exports.findById(familyId);
  } catch (error) {
    console.error("Error updating family:", error);
    throw error;
  }
};

/**
 * Add member to family (with full details)
 */
exports.addMember = async (memberData) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO family_members 
       (family_id, user_id, member_name, relationship, email, mobile, address, occupation, age, date_of_birth, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberData.family_id,
        memberData.user_id || null,
        memberData.member_name,
        memberData.relationship,
        memberData.email || null,
        memberData.mobile || null,
        memberData.address || null,
        memberData.occupation || null,
        memberData.age || null,
        memberData.date_of_birth || null,
        1,
      ],
    );
    return await exports.getMemberById(result.insertId);
  } catch (error) {
    console.error("Error adding family member:", error);
    throw error;
  }
};

/**
 * Get family member by ID
 */
exports.getMemberById = async (memberId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, family_id, user_id, member_name, relationship, email, mobile, 
              address, occupation, age, date_of_birth, is_active, added_at, updated_at
       FROM family_members 
       WHERE id = ?`,
      [memberId],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting family member by ID:", error);
    throw error;
  }
};

/**
 * Update family member
 */
exports.updateMember = async (memberId, memberData) => {
  try {
    await pool.execute(
      `UPDATE family_members SET 
        member_name = ?, 
        relationship = ?, 
        email = ?, 
        mobile = ?, 
        address = ?, 
        occupation = ?, 
        age = ?, 
        date_of_birth = ?
       WHERE id = ?`,
      [
        memberData.member_name,
        memberData.relationship,
        memberData.email || null,
        memberData.mobile || null,
        memberData.address || null,
        memberData.occupation || null,
        memberData.age || null,
        memberData.date_of_birth || null,
        memberId,
      ],
    );
    return await exports.getMemberById(memberId);
  } catch (error) {
    console.error("Error updating family member:", error);
    throw error;
  }
};

/**
 * Delete (deactivate) family member
 */
exports.deleteMember = async (memberId) => {
  try {
    await pool.execute("UPDATE family_members SET is_active = 0 WHERE id = ?", [
      memberId,
    ]);
    return true;
  } catch (error) {
    console.error("Error deleting family member:", error);
    throw error;
  }
};

/**
 * Get all family members
 */
exports.getMembers = async (familyId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, family_id, user_id, member_name, relationship, email, mobile, 
              address, occupation, age, date_of_birth, is_active, added_at, updated_at
       FROM family_members
       WHERE family_id = ? AND is_active = 1
       ORDER BY 
         CASE relationship 
           WHEN 'head' THEN 1 
           WHEN 'spouse' THEN 2 
           WHEN 'child' THEN 3 
           WHEN 'parent' THEN 4 
           ELSE 5 
         END,
         added_at ASC`,
      [familyId],
    );
    return rows;
  } catch (error) {
    console.error("Error getting family members:", error);
    throw error;
  }
};

/**
 * Get children of a family
 */
exports.getChildren = async (familyId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, family_id, user_id, member_name, relationship, email, mobile, 
              address, occupation, age, date_of_birth, is_active, added_at, updated_at
       FROM family_members
       WHERE family_id = ? AND relationship = 'child' AND is_active = 1
       ORDER BY age DESC, added_at ASC`,
      [familyId],
    );
    return rows;
  } catch (error) {
    console.error("Error getting children:", error);
    throw error;
  }
};

/**
 * Check if user is family head
 */
exports.isHead = async (familyId, userId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id FROM families WHERE id = ? AND head_user_id = ?",
      [familyId, userId],
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking if user is family head:", error);
    throw error;
  }
};

/**
 * Check if user is member of family
 */
exports.isMember = async (familyId, userId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id FROM family_members WHERE family_id = ? AND user_id = ? AND is_active = 1",
      [familyId, userId],
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking family membership:", error);
    throw error;
  }
};
