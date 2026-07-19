import models from '../../models/index.js';

export const show = async (req, res) => {
  try {
    const setting = await models.SiteSetting.instance();

    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json({ data: setting });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const setting = await models.SiteSetting.instance();

    const {
      site_name, hero_title, hero_subtitle, hero_bg_image,
      about_content, address, map_embed_url,
      phone, email,
      facebook_url, youtube_url, twitter_url, linkedin_url, instagram_url,
      whatsapp_number,
      student_count, years_experience, success_rate,
      admission_email, messages_email,
      smtp_host, smtp_port, smtp_username, smtp_password,
      smtp_encryption, smtp_from_address, smtp_from_name,
    } = req.body;

    const updateData = {};
    if (site_name !== undefined) updateData.site_name = site_name;
    if (hero_title !== undefined) updateData.hero_title = hero_title;
    if (hero_subtitle !== undefined) updateData.hero_subtitle = hero_subtitle;
    if (hero_bg_image !== undefined) updateData.hero_bg_image = hero_bg_image;
    if (about_content !== undefined) updateData.about_content = about_content;
    if (address !== undefined) updateData.address = address;
    if (map_embed_url !== undefined) updateData.map_embed_url = map_embed_url;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (facebook_url !== undefined) updateData.facebook_url = facebook_url;
    if (youtube_url !== undefined) updateData.youtube_url = youtube_url;
    if (twitter_url !== undefined) updateData.twitter_url = twitter_url;
    if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url;
    if (instagram_url !== undefined) updateData.instagram_url = instagram_url;
    if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
    if (student_count !== undefined) updateData.student_count = student_count;
    if (years_experience !== undefined) updateData.years_experience = years_experience;
    if (success_rate !== undefined) updateData.success_rate = success_rate;
    if (admission_email !== undefined) updateData.admission_email = admission_email;
    if (messages_email !== undefined) updateData.messages_email = messages_email;
    if (smtp_host !== undefined) updateData.smtp_host = smtp_host;
    if (smtp_port !== undefined) updateData.smtp_port = smtp_port;
    if (smtp_username !== undefined) updateData.smtp_username = smtp_username;
    if (smtp_password !== undefined) updateData.smtp_password = smtp_password;
    if (smtp_encryption !== undefined) updateData.smtp_encryption = smtp_encryption;
    if (smtp_from_address !== undefined) updateData.smtp_from_address = smtp_from_address;
    if (smtp_from_name !== undefined) updateData.smtp_from_name = smtp_from_name;

    if (req.file) {
      updateData.hero_bg_image = req.file.path.replace(/\\/g, '/');
    }

    await setting.update(updateData);

    const updated = await models.SiteSetting.instance();

    res.json({ message: 'Settings updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};
