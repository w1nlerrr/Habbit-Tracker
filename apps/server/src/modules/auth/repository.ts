import { prisma } from '../../infra/db.js';
import type { Prisma } from '../../generated/prisma/client.js';

export type CreateUserData = {
  email: string;
  passwordHash: string;
  displayName: string;
  timezone: string;
};

export type CreateSessionData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ip?: string | undefined;
};

/**
 * Доступ к данным аутентификации.
 * Все запросы параметризованы Prisma — SQL-инъекции невозможны.
 */
export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  createUser(data: CreateUserData) {
    return prisma.user.create({ data });
  },

  updateProfile(userId: string, data: { displayName?: string; timezone?: string }) {
    return prisma.user.update({ where: { id: userId }, data });
  },

  touchLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  },

  createSession(data: CreateSessionData) {
    return prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
      },
    });
  },

  findSessionByTokenHash(tokenHash: string) {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  revokeSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  },

  revokeSessionByTokenHash(tokenHash: string) {
    return prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Удаляет просроченные сессии — вызывается при обслуживании БД. */
  deleteExpiredSessions() {
    return prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },

  writeAudit(data: {
    userId: string | null;
    action: string;
    entity?: string;
    entityId?: string;
    payload?: Prisma.InputJsonValue;
    ip?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity ?? null,
        entityId: data.entityId ?? null,
        payload: data.payload,
        ip: data.ip ?? null,
      },
    });
  },
};

export type AuthRepository = typeof authRepository;
