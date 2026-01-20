/**
 * Family Controller
 * Handles family and family member management
 */

const familyModel = require('../models/familyModel');

/**
 * Show family members list page
 */
exports.listMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's family (as head)
    let family = await familyModel.findByHeadUserId(userId);
    
    // If not head, check if member of any family
    if (!family) {
      const families = await familyModel.findByUserId(userId);
      if (families.length > 0) {
        family = await familyModel.findById(families[0].id);
      }
    }
    
    if (!family) {
      return res.render('family/list', {
        title: 'Family Members',
        family: null,
        members: [],
        isHead: false,
        message: 'You have not created a family yet. Create one during registration or contact admin.'
      });
    }
    
    const members = await familyModel.getMembers(family.id);
    const isHead = await familyModel.isHead(family.id, userId);
    
    res.render('family/list', {
      title: 'Family Members',
      family,
      members,
      isHead,
      message: null
    });
  } catch (error) {
    console.error('Error listing family members:', error);
    res.status(500).render('errors/500', { title: 'Error' });
  }
};

/**
 * Show add family member form
 */
exports.showAddMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const family = await familyModel.findByHeadUserId(userId);
    
    if (!family) {
      return res.redirect('/family?error=no_family');
    }
    
    // Only head can add members
    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    
    res.render('family/add', {
      title: 'Add Family Member',
      family,
      error: null,
      formData: {}
    });
  } catch (error) {
    console.error('Error showing add member form:', error);
    res.status(500).render('errors/500', { title: 'Error' });
  }
};

/**
 * Handle add family member
 */
exports.addMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const family = await familyModel.findByHeadUserId(userId);
    
    if (!family) {
      return res.redirect('/family?error=no_family');
    }
    
    // Only head can add members
    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    
    const { member_name, relationship, email, mobile, address, occupation, age, date_of_birth } = req.body;
    
    // Validation
    if (!member_name || !member_name.trim()) {
      return res.render('family/add', {
        title: 'Add Family Member',
        family,
        error: 'Member name is required',
        formData: req.body
      });
    }
    
    if (!relationship) {
      return res.render('family/add', {
        title: 'Add Family Member',
        family,
        error: 'Relationship is required',
        formData: req.body
      });
    }
    
    // Add member
    await familyModel.addMember({
      family_id: family.id,
      member_name: member_name.trim(),
      relationship,
      email: email || null,
      mobile: mobile || null,
      address: address || null,
      occupation: occupation || null,
      age: age ? parseInt(age) : null,
      date_of_birth: date_of_birth || null
    });
    
    res.redirect('/family?success=member_added');
  } catch (error) {
    console.error('Error adding family member:', error);
    const family = await familyModel.findByHeadUserId(req.user.userId);
    res.render('family/add', {
      title: 'Add Family Member',
      family,
      error: 'Failed to add family member. Please try again.',
      formData: req.body
    });
  }
};

/**
 * Show edit family member form
 */
exports.showEditMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    
    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }
    
    const family = await familyModel.findById(member.family_id);
    
    // Only head can edit members
    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    
    res.render('family/edit', {
      title: 'Edit Family Member',
      family,
      member,
      error: null
    });
  } catch (error) {
    console.error('Error showing edit member form:', error);
    res.status(500).render('errors/500', { title: 'Error' });
  }
};

/**
 * Handle edit family member
 */
exports.editMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    
    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }
    
    const family = await familyModel.findById(member.family_id);
    
    // Only head can edit members
    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    
    const { member_name, relationship, email, mobile, address, occupation, age, date_of_birth } = req.body;
    
    // Validation
    if (!member_name || !member_name.trim()) {
      return res.render('family/edit', {
        title: 'Edit Family Member',
        family,
        member: { ...member, ...req.body },
        error: 'Member name is required'
      });
    }
    
    if (!relationship) {
      return res.render('family/edit', {
        title: 'Edit Family Member',
        family,
        member: { ...member, ...req.body },
        error: 'Relationship is required'
      });
    }
    
    // Update member
    await familyModel.updateMember(memberId, {
      member_name: member_name.trim(),
      relationship,
      email: email || null,
      mobile: mobile || null,
      address: address || null,
      occupation: occupation || null,
      age: age ? parseInt(age) : null,
      date_of_birth: date_of_birth || null
    });
    
    res.redirect('/family?success=member_updated');
  } catch (error) {
    console.error('Error editing family member:', error);
    const member = await familyModel.getMemberById(req.params.id);
    const family = member ? await familyModel.findById(member.family_id) : null;
    res.render('family/edit', {
      title: 'Edit Family Member',
      family,
      member: { ...member, ...req.body },
      error: 'Failed to update family member. Please try again.'
    });
  }
};

/**
 * Handle delete family member
 */
exports.deleteMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    
    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    const family = await familyModel.findById(member.family_id);
    
    // Only head can delete members
    const isHead = await familyModel.isHead(family.id, userId);
    if (!isHead) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Cannot delete head
    if (member.relationship === 'head') {
      return res.status(400).json({ success: false, message: 'Cannot delete family head' });
    }
    
    await familyModel.deleteMember(memberId);
    
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
};

/**
 * Show member details (view page)
 */
exports.viewMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberId = req.params.id;
    
    const member = await familyModel.getMemberById(memberId);
    if (!member) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }
    
    const family = await familyModel.findById(member.family_id);
    
    // Check if user has access to this family
    const isHead = await familyModel.isHead(family.id, userId);
    const isMember = await familyModel.isMember(family.id, userId);
    
    if (!isHead && !isMember) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    
    res.render('family/view', {
      title: 'View Family Member',
      family,
      member,
      isHead
    });
  } catch (error) {
    console.error('Error viewing family member:', error);
    res.status(500).render('errors/500', { title: 'Error' });
  }
};

