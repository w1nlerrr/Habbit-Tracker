import { createHash, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

import type { UserRole } from '@habit/shared';

import { config } from '../config/index.js';

const ISSUER = 'habit-tracker-api';
const AUDIENCE = 'habit-tracker-client';

const accessKey = new TextEncoder().encode(config.JWT_ACCESS_SECRET);

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

/** Подписывает короткоживущий access-токен (JWT, HS256). */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(config.ACCESS_TOKEN_TTL)
    .sign(accessKey);
}

/** Проверяет подпись, срок действия, издателя и аудиторию access-токена. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('В токене отсутствует идентификатор пользователя');
  }

  const role: UserRole = payload.role === 'admin' ? 'admin' : 'user';

  return {
    sub: payload.sub,
    role,
    email: typeof payload.email === 'string' ? payload.email : '',
  };
}

/** Генерирует непредсказуемый refresh-токен и его хеш для хранения в БД. */
export function createRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashRefreshToken(token) };
}

/** В базе хранится только SHA-256 хеш — утечка таблицы не даёт токенов. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Срок жизни refresh-сессии в миллисекундах. */
export function refreshTokenTtlMs(): number {
  return config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

/** Срок жизни access-токена в секундах (для поля expiresInSec в ответе). */
export function accessTokenTtlSeconds(): number {
  const raw = config.ACCESS_TOKEN_TTL.trim();
  const match = /^(\d+)\s*([smhd])$/.exec(raw);
  if (!match) return 900;

  const amount = Number(match[1]);
  const unit = match[2];
  const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86_400;
  return amount * factor;
}

