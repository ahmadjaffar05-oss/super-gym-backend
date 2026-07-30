import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Enforced everywhere a user sets or changes a password (registration,
 * password reset, admin-created accounts). Kept in one place so the
 * policy can never drift between endpoints.
 */
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';
