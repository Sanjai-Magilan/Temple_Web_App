ALTER TABLE families
  ADD COLUMN family_uid VARCHAR(20) NULL AFTER id;

UPDATE families
SET family_uid = CONCAT('FAM', LPAD(id, 6, '0'))
WHERE family_uid IS NULL OR family_uid = '';

ALTER TABLE families
  ADD UNIQUE KEY uq_family_uid (family_uid);

ALTER TABLE family_members
  ADD COLUMN gender ENUM('male','female','other') NOT NULL DEFAULT 'other' AFTER relationship,
  ADD COLUMN father_member_id INT UNSIGNED NULL AFTER gender,
  ADD COLUMN mother_member_id INT UNSIGNED NULL AFTER father_member_id,
  ADD COLUMN spouse_member_id INT UNSIGNED NULL AFTER mother_member_id,
  ADD COLUMN profile_image_path VARCHAR(500) NULL AFTER date_of_birth;

ALTER TABLE family_members
  ADD INDEX idx_father_member (father_member_id),
  ADD INDEX idx_mother_member (mother_member_id),
  ADD INDEX idx_spouse_member (spouse_member_id),
  ADD INDEX idx_gender (gender);

ALTER TABLE family_members
  ADD CONSTRAINT fk_family_member_father FOREIGN KEY (father_member_id) REFERENCES family_members(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_family_member_mother FOREIGN KEY (mother_member_id) REFERENCES family_members(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_family_member_spouse FOREIGN KEY (spouse_member_id) REFERENCES family_members(id) ON DELETE SET NULL;