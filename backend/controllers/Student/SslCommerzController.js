import models from '../../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import https from 'https';
import NotificationService from '../../services/NotificationService.js';

// Payment credentials come from the PaymentSetting row when present
// (editable in admin), falling back to environment variables.
async function getPaymentConfig() {
  let mode = process.env.SSLC_MODE || 'sandbox';
  let storeId = process.env.SSLC_STORE_ID || '';
  let storePassword = process.env.SSLC_STORE_PASSWORD || '';
  let isActive = true;
  try {
    const setting = await models.PaymentSetting.sslcommerz();
    if (setting) {
      if (setting.mode) mode = setting.mode;
      if (setting.store_id) storeId = setting.store_id;
      if (setting.store_password) storePassword = setting.store_password;
      isActive = setting.is_active !== false;
    }
  } catch (err) {
    console.error('Payment config read failed, using env fallback:', err.message);
  }
  return {
    mode,
    storeId,
    storePassword,
    isActive,
    base: mode === 'live' ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com',
  };
}

// The gateway can deliver the callback either as a form POST (IPN and
// browser auto-submit) or as a GET redirect with query parameters (sandbox
// and some gateway flows), so both sources are merged.
function callbackData(req) {
  return { ...req.query, ...req.body };
}

function callbackStatus(data) {
  return String(data.status || data.transaction_status || '').toUpperCase();
}

async function hashVerify(data, expectedHash, config) {
  const storeId = data.store_id || config.storeId;
  const storePass = config.storePassword;
  const status = callbackStatus(data);
  const verifyKey = status === 'VALID'
    ? `${storeId}|${storePass}|${data.transaction_status || ''}|${data.amount || ''}|${data.currency || 'BDT'}|${data.tran_id || ''}|${data.val_id || ''}`
    : `${storeId}|${storePass}|${data.status || ''}|${data.failedreason || ''}`;
  const computed = crypto.createHash('md5').update(verifyKey).digest('hex').toLowerCase();
  return computed === (expectedHash || '').toLowerCase();
}

// Legacy v3-style validation: verify_sign over the fields listed in
// verify_key, with store_passwd (MD5 of the store password) appended.
function verifyLegacySign(data, storePassword) {
  if (!data.verify_key || !data.verify_sign) return false;
  const keys = String(data.verify_key).split(',').map(k => k.trim()).filter(Boolean);
  if (!keys.length) return false;
  const parts = keys.map((key) => {
    const value = data[key];
    return `${key}=${value === undefined || value === null ? '' : value}`;
  });
  parts.push(`store_passwd=${crypto.createHash('md5').update(storePassword).digest('hex')}`);
  const computed = crypto.createHash('md5').update(parts.join('&')).digest('hex');
  return computed.toLowerCase() === String(data.verify_sign).toLowerCase();
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
  });
}

// Authoritative server-to-server fallback: ask the gateway what really
function normalizeGwStatus(raw) {
  const s = String(raw || '').trim().toUpperCase();
  return s === 'VALIDATED' ? 'VALID' : s;
}

// happened for this transaction, then the result is trusted (with an amount
// check) regardless of what the callback claimed.
async function validateWithGateway(config, data) {
  const host = config.base.includes('securepay')
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';
  const creds = `store_id=${encodeURIComponent(config.storeId)}&store_passwd=${encodeURIComponent(config.storePassword)}&format=json`;
  try {
    if (data.val_id) {
      const res = await httpsGetJson(`${host}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(data.val_id)}&${creds}`);
      if (res?.status) return { status: normalizeGwStatus(res.status), amount: res.amount };
    }
    if (data.tran_id) {
      const res = await httpsGetJson(`${host}/validator/api/merchantTransIDvalidationAPI.php?tran_id=${encodeURIComponent(data.tran_id)}&${creds}`);
      if (res?.status && Array.isArray(res.element) && res.element.length) {
        const first = res.element[0];
        return { status: normalizeGwStatus(first.status || res.status), amount: first.amount || res.amount };
      }
      if (res?.status) return { status: normalizeGwStatus(res.status), amount: res.amount };
    }
  } catch (err) {
    console.error('SslCommerzController.validateWithGateway error:', err.message);
  }
  return null;
}

async function verifyCallback(data, config) {
  const hash = data.verify_hash || data.verify_sign;
  if (hash && await hashVerify(data, hash, config)) return true;
  if (verifyLegacySign(data, config.storePassword)) return true;
  return false;
}

function sslPost(baseUrl, path, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const url = new URL(path, baseUrl);
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

// The student's actual monthly fee is always derived server-side from their
// batch's course fee — the client can never choose the payment amount.
async function resolveMonthlyFee(studentId) {
  const student = await models.Student.findOne({
    where: { id: studentId },
    include: [{ model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title', 'fee'] }] }],
  });
  return {
    student,
    monthlyFee: student?.Batch?.Course ? parseFloat(student.Batch.Course.fee) || 0 : 0,
  };
}

function validPaymentMonth(month) {
  const value = String(month || '').trim();
  if (/^\d{4}-\d{2}$/.test(value)) return true;
  // The app's canonical month format, produced by buildMonthlyBreakdown
  // (PaymentController): e.g. "Aug 2026". Payment rows, due lists and admin
  // filters all use this format, so it must be accepted here too.
  return /^[A-Za-z]{3} \d{4}$/.test(value);
}

function amountsMatch(expected, gatewayAmount) {
  const got = parseFloat(gatewayAmount);
  if (!Number.isFinite(got)) return false;
  return Math.abs(parseFloat(expected) - got) < 0.01;
}

async function notifyPaymentSuccess(payments, totalExpected) {
  try {
    const student = await models.Student.findByPk(payments[0].student_id, { attributes: ['user_id'] });
    if (student?.user_id) {
      await NotificationService.create({
        userId: student.user_id,
        type: 'payment',
        title: 'Payment Successful',
        body: `Your payment of ৳${totalExpected} (Tran ID: ${payments[0].trx_id}) was successful for ${payments.length} month${payments.length > 1 ? 's' : ''}.`,
        actionUrl: '/student/fees',
        actionLabel: 'View Fees',
      });
    }
  } catch (err) {
    console.error('SslCommerzController notifyPaymentSuccess error:', err.message);
  }
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

    // Accept either a single month (backwards-compatible) or an array of
    // months so students can pay several due months in one transaction.
    const rawMonths = req.body.months && Array.isArray(req.body.months)
      ? req.body.months
      : (req.body.month ? [req.body.month] : []);
    if (rawMonths.length === 0) {
      return res.status(400).json({ message: 'At least one month is required' });
    }
    if (rawMonths.some(m => !validPaymentMonth(m))) {
      return res.status(400).json({ message: 'A valid month (e.g. Aug 2026) is required for every month' });
    }
    const months = [...new Set(rawMonths)];

    const { monthlyFee } = await resolveMonthlyFee(student.id);
    if (monthlyFee <= 0) {
      return res.status(400).json({ message: 'No fee structure is set for your batch — contact the office' });
    }

    const paymentConfig = await getPaymentConfig();
    if (!paymentConfig.isActive) {
      return res.status(400).json({ message: 'Online payments are temporarily disabled — contact the office' });
    }
    if (!paymentConfig.storeId || !paymentConfig.storePassword) {
      return res.status(500).json({ message: 'Payment gateway is not configured yet' });
    }

    // Never double-charge: months that already have a pending or paid record
    // for this student are dropped silently.
    const existing = await models.Payment.findAll({
      where: { student_id: student.id, month: { [Op.in]: months }, status: { [Op.in]: ['pending', 'paid'] } },
      attributes: ['month'],
    });
    const chargeable = months.filter(m => !existing.some(e => e.month === m));
    if (chargeable.length === 0) {
      return res.status(400).json({ message: 'These months are already paid or awaiting verification' });
    }

    const amount = parseFloat((monthlyFee * chargeable.length).toFixed(2));

    const tranId = `UTT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const postData = {
      store_id: paymentConfig.storeId,
      store_passwd: paymentConfig.storePassword,
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

    const result = await sslPost(paymentConfig.base, '/gwprocess/v4/api.php', postData);

    if (result.status !== 'SUCCESS') {
      return res.status(400).json({ message: 'Failed to initiate payment', gateway_error: result.failedreason || result.status });
    }

    // One payment row per month, all sharing the same transaction ID, so the
    // breakdown shows each month individually while the gateway sees one charge.
    try {
      await models.Payment.bulkCreate(chargeable.map(month => ({
        student_id: student.id,
        month,
        amount: monthlyFee,
        trx_id: tranId,
        method: 'sslcommerz',
        status: 'pending',
        ssl_sessionkey: result.sessionkey || null,
      })));
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'A payment for these months is already being processed — refresh and try again' });
      }
      throw error;
    }

    const payments = await models.Payment.findAll({ where: { trx_id: tranId } });

    res.json({
      message: 'Payment initiated',
      data: {
        transaction_id: tranId,
        gateway_url: result.GatewayPageURL,
        payment: payments,
      },
    });
  } catch (error) {
    console.error('SslCommerzController.initiate error:', error);
    res.status(500).json({ message: 'Failed to initiate payment' });
  }
};

export const success = async (req, res) => {
  try {
    const data = callbackData(req);
    const config = await getPaymentConfig();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const status = callbackStatus(data);

    // The success URL was hit for a non-VALID outcome (failed/cancelled
    // redirect) — treat it like the corresponding terminal callback.
    if (status !== 'VALID') {
      return handleTerminalCallback(req, res, '/payment/failed', 'due');
    }

    const payments = await models.Payment.findAll({ where: { trx_id: data.tran_id } });
    if (!payments.length) {
      return res.redirect(`${frontendUrl}/payment/failed?status=unknown&tran_id=${data.tran_id || ''}`);
    }

    // The gateway amount must equal the total of all months in this transaction.
    const totalExpected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    // `amount` is what the customer paid (equals our initiate total).
    // `store_amount` is what the merchant account receives after gateway
    // charges/discounts (the sandbox applies a sample discount to it), so it
    // must never be used as the charge-verification target.
    const gatewayAmount = data.amount || data.store_amount;
    if (!amountsMatch(totalExpected, gatewayAmount)) {
      console.error('PaymentController.success amount mismatch', { trx: data.tran_id, expected: totalExpected, got: gatewayAmount });
      return res.redirect(`${frontendUrl}/payment/failed?status=amount_mismatch&tran_id=${data.tran_id || ''}`);
    }

    let verified = await verifyCallback(data, config);
    if (!verified) {
      // Hash check failed (sandbox redirects may carry no hash) — ask the
      // gateway directly. The validation API is the authoritative source.
      const gw = await validateWithGateway(config, data);
      if (!gw || gw.status !== 'VALID' || !amountsMatch(totalExpected, gw.amount || gatewayAmount)) {
        console.error('SslCommerzController.success unverifiable', { trx: data.tran_id, status });
        return res.redirect(`${frontendUrl}/payment/failed?status=invalid_hash&tran_id=${data.tran_id || ''}`);
      }
      verified = true;
    }
    if (!verified) {
      return res.redirect(`${frontendUrl}/payment/failed?status=invalid_hash&tran_id=${data.tran_id || ''}`);
    }

    if (payments.every(p => p.status === 'paid')) {
      return res.redirect(`${frontendUrl}/payment/success?status=already_paid&tran_id=${data.tran_id}`);
    }
    const payable = payments.filter(p => p.status === 'pending');
    if (!payable.length) {
      return res.redirect(`${frontendUrl}/payment/failed?status=not_pending&tran_id=${data.tran_id}`);
    }

    const now = new Date().toISOString().split('T')[0];
    for (const payment of payable) {
      payment.status = 'paid';
      payment.ssl_val_id = data.val_id || null;
      payment.ssl_store_amount = data.store_amount || null;
      payment.ssl_card_type = data.card_type || null;
      payment.ssl_card_no = data.card_no || null;
      payment.date = now;
      await payment.save();
    }

    await notifyPaymentSuccess(payable, totalExpected);

    res.redirect(`${frontendUrl}/payment/success?status=success&tran_id=${data.tran_id}`);
  } catch (error) {
    console.error('SslCommerzController.success error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?status=error`);
  }
};

// Un-verify-able callbacks (forged or gateway anomalies) are logged and ignored;
// an attacker must not be able to flip any payment row by hitting these endpoints.
async function handleTerminalCallback(req, res, fallbackPath, targetStatus) {
  const data = callbackData(req);
  const config = await getPaymentConfig();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const status = callbackStatus(data);

  const verified = await verifyCallback(data, config);
  if (!verified) {
    console.error('PaymentController terminal callback rejected hash', { trx: data.tran_id, status });
    return res.redirect(`${frontendUrl}/payment/failed?status=invalid_hash&tran_id=${data.tran_id || ''}`);
  }

  const payments = await models.Payment.findAll({ where: { trx_id: data.tran_id } });
  if (payments.length) {
    for (const payment of payments) {
      if (payment.status === 'pending') {
        payment.status = targetStatus;
        await payment.save();
      }
    }
  }

  const cancelled = status === 'CANCELLED' || status === 'CANCEL';
  res.redirect(`${frontendUrl}${fallbackPath}?status=${cancelled ? 'cancelled' : 'failed'}&tran_id=${data.tran_id || ''}`);
}

export const failed = async (req, res) => {
  try {
    await handleTerminalCallback(req, res, '/payment/failed', 'due');
  } catch (error) {
    console.error('SslCommerzController.failed error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?status=error`);
  }
};

export const cancel = async (req, res) => {
  try {
    await handleTerminalCallback(req, res, '/payment/cancelled', 'due');
  } catch (error) {
    console.error('SslCommerzController.cancel error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?status=error`);
  }
};

export const ipn = async (req, res) => {
  try {
    const data = callbackData(req);
    const config = await getPaymentConfig();
    const status = callbackStatus(data);

    const payments = await models.Payment.findAll({ where: { trx_id: data.tran_id } });
    if (!payments.length) {
      // Unknown transaction — nothing to reconcile, accept silently.
      return res.json({ message: 'IPN received' });
    }

    if (status === 'VALID') {
      let verified = await verifyCallback(data, config);
      const totalExpected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      // `amount` is what the customer paid (equals our initiate total).
      // `store_amount` is what the merchant account receives after gateway
      // charges/discounts (the sandbox applies a sample discount to it), so it
      // must never be used as the charge-verification target.
      const gatewayAmount = data.amount || data.store_amount;
      if (!amountsMatch(totalExpected, gatewayAmount)) {
        console.error('PaymentController.ipn amount mismatch', { trx: data.tran_id, expected: totalExpected, got: gatewayAmount });
        return res.status(400).json({ message: 'Amount mismatch' });
      }
      if (!verified) {
        const gw = await validateWithGateway(config, data);
        verified = !!(gw && gw.status === 'VALID' && amountsMatch(totalExpected, gw.amount || gatewayAmount));
      }
      if (!verified) {
        console.error('PaymentController.ipn rejected', { trx: data.tran_id, status });
        return res.status(400).json({ message: 'Invalid hash' });
      }
      const now = new Date().toISOString().split('T')[0];
      let markedPaid = false;
      for (const payment of payments) {
        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.ssl_val_id = data.val_id || null;
          payment.ssl_store_amount = data.store_amount || null;
          payment.ssl_card_type = data.card_type || null;
          payment.ssl_card_no = data.card_no || null;
          payment.date = now;
          await payment.save();
          markedPaid = true;
        }
      }
      if (markedPaid) await notifyPaymentSuccess(payments, totalExpected);
    } else {
      const verified = await verifyCallback(data, config);
      if (!verified) {
        console.error('PaymentController.ipn rejected hash', { trx: data.tran_id, status });
        return res.status(400).json({ message: 'Invalid hash' });
      }
      for (const payment of payments) {
        if (payment.status === 'pending') {
          payment.status = 'due';
          await payment.save();
        }
      }
    }

    res.json({ message: 'IPN received' });
  } catch (error) {
    console.error('SslCommerzController.ipn error:', error);
    res.status(500).json({ message: 'IPN processing failed' });
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
    res.status(500).json({ message: 'Failed to fetch payment status' });
  }
};
