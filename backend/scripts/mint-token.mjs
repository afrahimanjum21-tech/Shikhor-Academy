import '../config/bootstrap-env.js';
import models from '../models/index.js';
import authConfig from '../config/auth.js';
import jwt from 'jsonwebtoken';

const arg = process.argv[2] || 'afrahimanjum090@gmail.com';
const user = await models.User.findOne({ where: { email: arg } });
if (!user) {
  console.log('NO USER');
  process.exit(1);
}
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  authConfig.jwtSecret,
  { expiresIn: '1h' }
);
console.log(token);
process.exit(0);