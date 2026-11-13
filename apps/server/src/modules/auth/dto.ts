import type { User } from '../../generated/prisma/client.js';
import type { UserRole } from '@habit/shared';

export type UserDto = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  createdAt: string;
};

/** Единственное место преобразования модели БД в публичное представление. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as UserRole,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}
