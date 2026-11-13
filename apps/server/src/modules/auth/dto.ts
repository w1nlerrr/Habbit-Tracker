import type { UserDto } from '@habit/shared';

import type { User } from '../../generated/prisma/client.js';

/** Единственное место преобразования модели БД в публичное представление. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role === 'admin' ? 'admin' : 'user',
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}

