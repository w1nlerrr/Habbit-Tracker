import { hash, verify } from '@node-rs/argon2';

/**
 * Хеширование паролей (Argon2id, победитель Password Hashing Competition).
 * Параметры соответствуют рекомендациям OWASP для интерактивного входа.
 */
const HASH_OPTIONS = {
  memoryCost: 19_456, // 19 МиБ
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, HASH_OPTIONS);
}

export async function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plainPassword);
  } catch {
    // Повреждённый хеш не должен превращаться в 500-ю ошибку.
    return false;
  }
}
