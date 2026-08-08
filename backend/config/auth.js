import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required — set a strong random value (e.g. `node -e "console.log(require(\"crypto\").randomBytes(48).toString(\"hex\"))"`) before starting the server');
}

export default {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  jwtAlgorithm: 'HS256',
};
