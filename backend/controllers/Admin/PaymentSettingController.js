import models from '../../models/index.js';
import { encryptSecret } from '../../services/secretCrypto.js';

export const show = async (req, res) => {
  try {
    const setting = await models.PaymentSetting.sslcommerz();

    if (!setting) {
      return res.status(404).json({ message: 'Payment settings not found' });
    }

    const data = setting.toJSON();
    data.has_store_password = Boolean(data.store_password);
    delete data.store_password;

    res.json(data);
  } catch (error) {
    // D20: log a safe diagnostic (message only — never the full error, which
    // could carry the encrypted store_password in its SQL parameters).
    console.error('PaymentSettingController.show error:', error.message);
    res.status(500).json({ message: 'Failed to fetch payment settings' });
  }
};

export const update = async (req, res) => {
  try {
    const setting = await models.PaymentSetting.sslcommerz();

    const {
      is_active, mode, store_id, store_password,
      enabled_methods, settlement_account_name,
      settlement_account_number, settlement_bank, instructions,
    } = req.body;

    const updateData = {};
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';
    if (mode !== undefined) updateData.mode = mode;
    if (store_id !== undefined) updateData.store_id = store_id;
    if (store_password !== undefined) updateData.store_password = encryptSecret(store_password);
    if (enabled_methods !== undefined) {
      updateData.enabled_methods = typeof enabled_methods === 'string'
        ? JSON.parse(enabled_methods)
        : enabled_methods;
    }
    if (settlement_account_name !== undefined) updateData.settlement_account_name = settlement_account_name;
    if (settlement_account_number !== undefined) updateData.settlement_account_number = settlement_account_number;
    if (settlement_bank !== undefined) updateData.settlement_bank = settlement_bank;
    if (req.body.settlement_bank_name !== undefined) updateData.settlement_bank = req.body.settlement_bank_name;
    if (instructions !== undefined) updateData.instructions = instructions;

    await setting.update(updateData);

    const updated = await models.PaymentSetting.sslcommerz();
    const data = updated.toJSON();
    data.has_store_password = Boolean(data.store_password);
    delete data.store_password;

    res.json({ message: 'Payment settings updated successfully', settings: data });
  } catch (error) {
    console.error('PaymentSettingController.update error:', error.message);
    res.status(500).json({ message: 'Failed to update payment settings' });
  }
};
