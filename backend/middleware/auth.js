import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import models from '../models/index.js';
import { getTokenFromReq } from '../services/cookie.js';
import { withDbRetry } from '../services/dbRetry.js';

export const authenticate = async (req, res, next) => {
  try {
    // Bearer header is checked first (backward compatible); HttpOnly cookie
    // is the browser fallback (see backend/services/cookie.js).
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwtSecret, { algorithms: [authConfig.jwtAlgorithm] });
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    let user;
    try {
      // Retry transient DB connection failures (e.g. Neon compute waking from
      // suspension) before giving up with a 503.
      user = await withDbRetry(() =>
        models.User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] },
        })
      );
    } catch (dbError) {
      console.error('Auth database error:', dbError);
      return res.status(503).json({
        message: 'Database is temporarily unavailable, please try again in a moment',
      });
    }

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // SEC-5: server-side revocation. The token embeds the account's
    // token_version at issue time; logout and password/credential changes bump
    // User.token_version, invalidating every previously issued token. A missing
    // `tv` (tokens issued before this feature shipped) is treated as 0 so
    // existing sessions keep working until the next bump.
    const tokenVersion = Number.isInteger(decoded.tv) ? decoded.tv : 0;
    const currentVersion = Number.isInteger(user.token_version) ? user.token_version : 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};
