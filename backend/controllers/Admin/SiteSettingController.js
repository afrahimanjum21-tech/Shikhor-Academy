import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import { resetMailConfigCache } from '../../services/mailer.js';

export const show = async (req, res) => {
  try {
    const setting = await models.SiteSetting.instance();

    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const data = setting.toJSON();
    data.has_smtp_password = Boolean(data.smtp_password);
    delete data.smtp_password;

    res.json({ data });
  } catch (error) {
    console.error('Fetch site settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

export const update = async (req, res) => {
  try {
    const setting = await models.SiteSetting.instance();

    const {
      site_name, hero_title, hero_subtitle, hero_bg_image,
      about_content, address, map_link, map_embed_url,
      phone, email,
      facebook_url, youtube_url, twitter_url, linkedin_url, instagram_url,
      whatsapp_number,
      student_count, years_experience, success_rate, established_year,
      admission_email, messages_email,
      smtp_host, smtp_port, smtp_username, smtp_password,
      smtp_encryption, smtp_from_address, smtp_from_name,
      home_hero_title, home_hero_subtitle,
    } = req.body;

    const updateData = {};
    if (site_name !== undefined) updateData.site_name = site_name;
    if (hero_title !== undefined) updateData.hero_title = hero_title;
    if (home_hero_title !== undefined) updateData.hero_title = home_hero_title;
    if (hero_subtitle !== undefined) updateData.hero_subtitle = hero_subtitle;
    if (home_hero_subtitle !== undefined) updateData.hero_subtitle = home_hero_subtitle;
    if (hero_bg_image !== undefined) updateData.hero_bg_image = hero_bg_image;
    if (about_content !== undefined) updateData.about_content = about_content;
    if (address !== undefined) updateData.address = address;
    if (map_link !== undefined) updateData.map_link = map_link;
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
    if (success_rate !== undefined) updateData.success_rate = parseInt(String(success_rate).replace(/%/g, ''), 10) || 0;
    if (established_year !== undefined) updateData.established_year = parseInt(String(established_year), 10) || null;
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
      const result = await MediaService.upload(req.file, { folder: 'site' });
      if (setting.hero_bg_image) {
        await MediaDeleteService.deleteByUrl(setting.hero_bg_image).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.hero_bg_image = result.url;
    }

    await setting.update(updateData);

    resetMailConfigCache();

    const updated = await models.SiteSetting.instance();
    const result = updated.toJSON();
    result.has_smtp_password = Boolean(result.smtp_password);
    delete result.smtp_password;

    res.json({ message: 'Settings updated successfully', data: result });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};
