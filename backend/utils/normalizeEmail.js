// Canonical email form used on every write and lookup so sign-in is not
// case-sensitive and we do not create case-variant duplicate accounts.
export const normalizeEmail = (email) =>
  (typeof email === 'string' ? email.trim().toLowerCase() : email);

export default normalizeEmail;
