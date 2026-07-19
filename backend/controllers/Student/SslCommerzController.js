import models from '../../models/index.js';
import crypto from 'crypto';
import https from 'https';

const SSLC_STORE_ID = process.env.SSLC_STORE_ID || '';
const SSLC_STORE_PASSWORD = process.env.SSLC_STORE_PASSWORD || '';
const SSLC_MODE = process.env.SSLC_MODE || 'sandbox';
const SSLC_BASE = SSLC_MODE === 'live' ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';

function hashVerify(data, expectedHash) {
  const storeId = data.store_id || SSLC_STORE_ID;
  const storePass = data.store_passwd || SSLC_STORE_PASSWORD;
  const verifyKey = data.status === 'VALID'
    ? `${storeId}|${storePass}|${data.transaction_status || ''}|${data.amount || ''}|${data.currency || 'BDT'}|${data.tran_id || ''}|${data.val_id || ''}`
    : `${storeId}|${storePass}|${data.status || ''}|${data.failedreason || ''}`;
  const computed = crypto.createHash('md5').update(verifyKey).digest('hex').toLowerCase();
  return computed === (expectedHash || '').toLowerCase();
}

function sslPost(path, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const url = new URL(path, SSLC_BASE);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          const params = new URLSearchParams(responseData);
          const obj = {};
          for (const [key, value] of params) obj[key] = value;
          resolve(obj);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export const initiate = async (req, res) => {
  try {
    const student = await models.Student.findOne({
      where: { user_id: req.user.id },
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { amount, month } = req.body;
    if (!amount || !month) {
      return res.status(400).json({ message: 'amount and month are required' });
    }

    const tranId = `UTT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const postData = {
      store_id: SSLC_STORE_ID,
      store_passwd: SSLC_STORE_PASSWORD,
      total_amount: amount,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${req.protocol}://${req.get('host')}/api/student/payment/success`,
      fail_url: `${req.protocol}://${req.get('host')}/api/student/payment/failed`,
      cancel_url: `${req.protocol}://${req.get('host')}/api/student/payment/cancel`,
      ipn_url: `${req.protocol}://${req.get('host')}/api/student/payment/ipn`,
      cus_name: student.User.name,
      cus_email: student.User.email,
      cus_phone: student.User.phone || 'N/A',
      cus_add1: 'N/A',
      cus_city: 'N/A',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'Monthly Fee',
      product_category: 'Education',
      product_profile: 'general',
    };

    const result = await sslPost('/gwprocess/v4/api.php', postData);

    if (result.status !== 'SUCCESS') {
      return res.status(400).json({ message: 'Failed to initiate payment', gateway_error: result.failedreason || result.status });
    }

    const payment = await models.Payment.create({
      student_id: student.id,
      month,
      amount,
      trx_id: tranId,
      method: 'sslcommerz',
      status: 'pending',
      ssl_sessionkey: result.sessionkey || null,
    });

    res.json({
      message: 'Payment initiated',
      data: {
        transaction_id: tranId,
        gateway_url: result.GatewayPageURL,
        payment,
      },
    });
  } catch (error) {
    console.error('SslCommerzController.initiate error:', error);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.message });
  }
};

export const success = async (req, res) => {
  try {
    const data = req.body;
    const hash = data.verify_hash || data.verify_sign;

    const isValid = hashVerify(data, hash);
    if (!isValid) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=invalid_hash`);
    }

    const payment = await models.Payment.findOne({ where: { trx_id: data.tran_id } });
    if (payment) {
      payment.status = 'paid';
      payment.ssl_val_id = data.val_id || null;
      payment.ssl_store_amount = data.store_amount || null;
      payment.ssl_card_type = data.card_type || null;
      payment.ssl_card_no = data.card_no || null;
      payment.date = new Date().toISOString().split('T')[0];
      await payment.save();
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=success&trx_id=${data.tran_id}`);
  } catch (error) {
    console.error('SslCommerzController.success error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=error`);
  }
};

export const failed = async (req, res) => {
  try {
    const data = req.body;
    const payment = await models.Payment.findOne({ where: { trx_id: data.tran_id } });
    if (payment) {
      payment.status = 'due';
      await payment.save();
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=failed`);
  } catch (error) {
    console.error('SslCommerzController.failed error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=error`);
  }
};

export const cancel = async (req, res) => {
  try {
    const data = req.body;
    const payment = await models.Payment.findOne({ where: { trx_id: data.tran_id } });
    if (payment) {
      payment.status = 'due';
      await payment.save();
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=cancelled`);
  } catch (error) {
    console.error('SslCommerzController.cancel error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payments?status=error`);
  }
};

export const ipn = async (req, res) => {
  try {
    const data = req.body;
    const hash = data.verify_hash || data.verify_sign;

    const isValid = hashVerify(data, hash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid hash' });
    }

    const payment = await models.Payment.findOne({ where: { trx_id: data.tran_id } });
    if (payment) {
      payment.status = data.status === 'VALID' ? 'paid' : 'due';
      payment.ssl_val_id = data.val_id || null;
      payment.ssl_store_amount = data.store_amount || null;
      payment.ssl_card_type = data.card_type || null;
      payment.ssl_card_no = data.card_no || null;
      if (data.status === 'VALID') {
        payment.date = new Date().toISOString().split('T')[0];
      }
      await payment.save();
    }

    res.json({ message: 'IPN received' });
  } catch (error) {
    console.error('SslCommerzController.ipn error:', error);
    res.status(500).json({ message: 'IPN processing failed', error: error.message });
  }
};

export const status = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { trx_id } = req.query;

    const where = { student_id: student.id, method: 'sslcommerz' };
    if (trx_id) where.trx_id = trx_id;

    const payments = await models.Payment.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: payments });
  } catch (error) {
    console.error('SslCommerzController.status error:', error);
    res.status(500).json({ message: 'Failed to fetch payment status', error: error.message });
  }
};
