import dotenv from 'dotenv';
dotenv.config();

export default {
  jwtSecret: process.env.JWT_SECRET || 'uttoron-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  jwtAlgorithm: 'HS256',
};
