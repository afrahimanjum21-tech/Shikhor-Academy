import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import EmailService from '../../services/email/EmailService.js';
import { resetMailConfigCache } from '../../services/mailer.js';
import { encryptSecret } from '../../services/secretCrypto.js';
import { parseBool } from '../../utils/parseBool.js';

export const show = async (req, res) => {
  try {
    const setting = await models.SiteSetting.instance();

    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const data = setting.toJSON();
    data.has_smtp_password = Boolean(data.smtp_password);
    delete data.smtp_password;
    data.has_email_api_key = Boolean(data.email_api_key);
    delete data.email_api_key;
    // The admin form uses home_hero_*; expose it mapped from the stored hero_*
    // so the real value LOADS into the form (otherwise it keeps the hardcoded
    // default and an unrelated save overwrites the DB hero text with it).
    if (data.hero_title != null) data.home_hero_title = data.hero_title;
    if (data.hero_subtitle != null) data.home_hero_subtitle = data.hero_subtitle;

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
      footer_description,
      facebook_url, youtube_url, twitter_url, linkedin_url, instagram_url,
      whatsapp_number,
      student_count, years_experience, success_rate, established_year,
      admission_email, messages_email,
      smtp_host, smtp_port, smtp_username, smtp_password,
      smtp_encryption, smtp_from_address, smtp_from_name,
      home_hero_title, home_hero_subtitle,
      email_enabled, email_provider, email_api_key, email_from,
    } = req.body;

    const updateData = {};
    if (site_name !== undefined) updateData.site_name = site_name;
    if (hero_title !== undefined) updateData.hero_title = hero_title;
    if (home_hero_title !== undefined) updateData.hero_title = home_hero_title;
    if (hero_subtitle !== undefined) updateData.hero_subtitle = hero_subtitle;
    if (home_hero_subtitle !== undefined) updateData.hero_subtitle = home_hero_subtitle;
    if (hero_bg_image !== undefined) updateData.hero_bg_image = hero_bg_image;
    if (about_content !== undefined) updateData.about_content = about_content;
    if (footer_description !== undefined) updateData.footer_description = footer_description;
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
    if (smtp_password !== undefined) updateData.smtp_password = encryptSecret(smtp_password);
    if (smtp_encryption !== undefined) updateData.smtp_encryption = smtp_encryption;
    if (smtp_from_address !== undefined) updateData.smtp_from_address = smtp_from_address;
    if (smtp_from_name !== undefined) updateData.smtp_from_name = smtp_from_name;
    if (email_enabled !== undefined) updateData.email_enabled = parseBool(email_enabled);
    if (email_provider !== undefined) updateData.email_provider = String(email_provider).toLowerCase();
    if (email_api_key !== undefined && email_api_key !== '') updateData.email_api_key = encryptSecret(email_api_key);
    if (email_from !== undefined) updateData.email_from = email_from;

    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'site' });
      if (setting.hero_bg_image) {
        await MediaDeleteService.deleteByUrl(setting.hero_bg_image).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.hero_bg_image = result.url;
    }

    await setting.update(updateData);

    resetMailConfigCache();
    EmailService.resetEmailConfigCache();

    const updated = await models.SiteSetting.instance();
    const result = updated.toJSON();
    result.has_smtp_password = Boolean(result.smtp_password);
    delete result.smtp_password;
    result.has_email_api_key = Boolean(result.email_api_key);
    delete result.email_api_key;
    // Mirror the stored hero_* back to the form's home_hero_* field names.
    if (result.hero_title != null) result.home_hero_title = result.hero_title;
    if (result.hero_subtitle != null) result.home_hero_subtitle = result.hero_subtitle;

    res.json({ message: 'Settings updated successfully', data: result });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

// Sends a one-off test email through the broadcast service using the SAVED
// settings (the admin saves the form first, then hits "Send test email").
export const testEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to).trim())) {
      return res.status(400).json({ message: 'A valid recipient email is required' });
    }

    const result = await EmailService.sendTest(to);

    if (result.skipped) {
      return res.json({
        ok: false,
        message: 'Email sending is disabled — enable it and save the sender settings first',
      });
    }
    if (!result.ok) {
      return res.json({
        ok: false,
        message: 'The email provider rejected the request',
        detail: result.raw || result.error || null,
      });
    }
    res.json({ ok: true, message: 'Test email sent successfully', detail: result.raw || null });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
};
