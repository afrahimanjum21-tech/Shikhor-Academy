import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Backs the secure admin credential-change workflow (SEC-4). The emailed
// confirmation link carries ONLY an opaque, single-use random token; the
// server stores just its SHA-256 hash here, alongside the pending new email
// and/or the already-bcrypt-hashed new password. No secret (password, hash,
// or JWT) is ever placed in the URL, query string, or a token claim.
const PendingCredentialChange = sequelize.define('PendingCredentialChange', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  // Pending new sign-in email (plaintext email address is not a secret).
  new_email: { type: DataTypes.STRING, allowNull: true },
  // Pending new password as a bcrypt hash (server-side only; never in a URL).
  new_password_hash: { type: DataTypes.STRING, allowNull: true },
  // SHA-256 (hex) of the opaque token. Only the hash is stored, so a leak of
  // this table does not reveal usable confirmation links.
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  // Set when the token is redeemed — enforces single use / replay protection.
  consumed_at: { type: DataTypes.DATE, allowNull: true },
});

PendingCredentialChange.associate = (models) => {
  PendingCredentialChange.belongsTo(models.User, { foreignKey: 'user_id' });
  models.User.hasMany(PendingCredentialChange, { foreignKey: 'user_id' });
};

export default PendingCredentialChange;
