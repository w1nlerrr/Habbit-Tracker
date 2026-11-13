import type { LoginInput, RegisterInput, UpdateProfileInput } from '@habit/shared';

import { ConflictError, UnauthorizedError } from '../../errors/app-error.js';
import type { User } from '../../generated/prisma/client.js';
import { hashPassword, verifyPassword } from '../../infra/password.js';
import {
  accessTokenTtlSeconds,
  createRefreshToken,
  hashRefreshToken,
  refreshTokenTtlMs,
  signAccessToken,
} from '../../infra/tokens.js';
import { authRepository } from './repository.js';

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

export type AuthResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
};

/**
 * Хеш-заглушка: проверяется, когда пользователь с таким email не найден.
 * Нужен, чтобы время ответа не выдавало существование учётной записи.
 */
const DUMMY_PASSWORD_HASH = await hashPassword('timing-attack-placeholder');

async function issueSession(user: User, meta: RequestMeta): Promise<Omit<AuthResult, 'user'>> {
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role === 'admin' ? 'admin' : 'user',
    email: user.email,
  });

  const { token, tokenHash } = createRefreshToken();
  await authRepository.createSession({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { accessToken, refreshToken: token, expiresInSec: accessTokenTtlSeconds() };
}

export const authService = {
  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Пользователь с такой электронной почтой уже зарегистрирован');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      timezone: input.timezone,
    });

    const tokens = await issueSession(user, meta);

    await authRepository.writeAudit({
      userId: user.id,
      action: 'auth.register',
      entity: 'user',
      entityId: user.id,
      ip: meta.ip,
    });

    return { user, ...tokens };
  },

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const user = await authRepository.findByEmail(input.email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordValid = await verifyPassword(passwordHash, input.password);

    // Единый текст ошибки: не раскрываем, существует ли учётная запись.
    if (!user || !passwordValid || !user.isActive) {
      throw new UnauthorizedError('Неверная электронная почта или пароль');
    }

    await authRepository.touchLastLogin(user.id);
    const tokens = await issueSession(user, meta);

    await authRepository.writeAudit({
      userId: user.id,
      action: 'auth.login',
      entity: 'user',
      entityId: user.id,
      ip: meta.ip,
    });

    return { user, ...tokens };
  },

  /** Обновление access-токена с ротацией refresh-токена. */
  async refresh(rawRefreshToken: string | undefined, meta: RequestMeta): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Отсутствует refresh-токен');
    }

    const session = await authRepository.findSessionByTokenHash(hashRefreshToken(rawRefreshToken));

    if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Сессия недействительна. Войдите заново.');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedError('Учётная запись заблокирована');
    }

    // Ротация: старый токен становится недействительным.
    await authRepository.revokeSession(session.id);
    const tokens = await issueSession(session.user, meta);

    return { user: session.user, ...tokens };
  },

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    await authRepository.revokeSessionByTokenHash(hashRefreshToken(rawRefreshToken));
  },

  async getProfile(userId: string): Promise<User> {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Пользователь не найден или заблокирован');
    }
    return user;
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Пользователь не найден или заблокирован');
    }

    return authRepository.updateProfile(userId, {
      ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
      ...(input.timezone === undefined ? {} : { timezone: input.timezone }),
    });
  },
};

export type AuthService = typeof authService;
