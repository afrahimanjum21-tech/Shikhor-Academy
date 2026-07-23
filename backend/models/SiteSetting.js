import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SiteSetting = sequelize.define('SiteSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  site_name: { type: DataTypes.STRING, defaultValue: 'Uttoron Coaching Centre' },
  hero_title: { type: DataTypes.STRING },
  hero_subtitle: { type: DataTypes.TEXT },
  hero_bg_image: { type: DataTypes.STRING },
  about_content: { type: DataTypes.TEXT },
  address: { type: DataTypes.STRING },
  map_link: { type: DataTypes.STRING },
  map_embed_url: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING },
  facebook_url: { type: DataTypes.STRING },
  youtube_url: { type: DataTypes.STRING },
  twitter_url: { type: DataTypes.STRING },
  linkedin_url: { type: DataTypes.STRING },
  instagram_url: { type: DataTypes.STRING },
  whatsapp_number: { type: DataTypes.STRING(20) },
  student_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  established_year: { type: DataTypes.INTEGER },
  success_rate: { type: DataTypes.INTEGER, defaultValue: 0 },
  admission_email: { type: DataTypes.STRING },
  messages_email: { type: DataTypes.STRING },
  smtp_host: { type: DataTypes.STRING },
  smtp_port: { type: DataTypes.INTEGER },
  smtp_username: { type: DataTypes.STRING },
  smtp_password: { type: DataTypes.STRING },
  smtp_encryption: { type: DataTypes.STRING(10) },
  smtp_from_address: { type: DataTypes.STRING },
  smtp_from_name: { type: DataTypes.STRING },
}, {
  hooks: {
    afterFind: (result) => {
      if (result && !Array.isArray(result)) {
        const setting = result;
        if (setting.smtp_host) {
          process.env.MAIL_HOST = setting.smtp_host;
          process.env.MAIL_PORT = String(setting.smtp_port || 587);
          process.env.MAIL_USERNAME = setting.smtp_username || '';
          process.env.MAIL_PASSWORD = setting.smtp_password || '';
          process.env.MAIL_ENCRYPTION = setting.smtp_encryption || 'tls';
          process.env.MAIL_FROM_ADDRESS = setting.smtp_from_address || setting.email || 'noreply@uttoron.com';
          process.env.MAIL_FROM_NAME = setting.smtp_from_name || setting.site_name || 'Uttoron Coaching Centre';
        }
      }
    },
  },
});

SiteSetting.instance = async function() {
  const [setting] = await this.findOrCreate({
    where: { id: 1 },
    defaults: { site_name: 'Uttoron Coaching Centre' },
  });
  return setting;
};

export default SiteSetting;
