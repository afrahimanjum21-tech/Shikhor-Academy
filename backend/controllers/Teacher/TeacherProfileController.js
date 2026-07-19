import models from '../../models/index.js';
import bcrypt from 'bcryptjs';

export const show = async (req, res) => {
  try {
    const user = await models.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: models.TeacherProfile }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('TeacherProfileController.show error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { name, phone, designation, subject, bio, joining_date } = req.body;

    const user = await models.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name;
    if (phone !== undefined) userUpdates.phone = phone;
    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates);
    }

    let profile = await models.TeacherProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) {
      profile = await models.TeacherProfile.create({ user_id: req.user.id });
    }

    const profileUpdates = {};
    if (designation !== undefined) profileUpdates.designation = designation;
    if (subject !== undefined) profileUpdates.subject = subject;
    if (bio !== undefined) profileUpdates.bio = bio;
    if (joining_date !== undefined) profileUpdates.joining_date = joining_date;
    if (Object.keys(profileUpdates).length > 0) {
      await profile.update(profileUpdates);
    }

    const updatedUser = await models.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: models.TeacherProfile }],
    });

    res.json({ message: 'Profile updated successfully', data: updatedUser });
  } catch (error) {
    console.error('TeacherProfileController.update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const user = await models.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profile_photo_path = req.file.path.replace(/\\/g, '/');
    await user.save();

    res.json({ message: 'Photo updated successfully', data: { profile_photo_path: user.profile_photo_path } });
  } catch (error) {
    console.error('TeacherProfileController.updatePhoto error:', error);
    res.status(500).json({ message: 'Failed to update photo', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, new_password_confirmation } = req.body;

    if (!current_password || !new_password || !new_password_confirmation) {
      return res.status(400).json({ message: 'current_password, new_password, and new_password_confirmation are required' });
    }

    if (new_password !== new_password_confirmation) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await models.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = new_password;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('TeacherProfileController.changePassword error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};
