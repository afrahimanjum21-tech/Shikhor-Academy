import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PaymentSetting = sequelize.define('PaymentSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  provider: { type: DataTypes.STRING(50), defaultValue: 'sslcommerz' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  mode: { type: DataTypes.STRING(10), defaultValue: 'sandbox' },
  store_id: { type: DataTypes.STRING },
  store_password: { type: DataTypes.STRING },
  enabled_methods: { type: DataTypes.JSON },
  settlement_account_name: { type: DataTypes.STRING },
  settlement_account_number: { type: DataTypes.STRING },
  settlement_bank: { type: DataTypes.STRING },
  instructions: { type: DataTypes.TEXT },
}, {
  hooks: {
    beforeUpsert: async (values) => {
      if (values.id) {
        const existing = await PaymentSetting.findByPk(values.id);
        if (existing) Object.assign(existing, values);
        else await PaymentSetting.create(values);
        return;
      }
    },
  },
});

PaymentSetting.sslcommerz = async function() {
  const [setting] = await this.findOrCreate({
    where: { provider: 'sslcommerz' },
    defaults: { provider: 'sslcommerz', mode: process.env.SSLC_MODE || 'sandbox' },
  });
  return setting;
};

export default PaymentSetting;
