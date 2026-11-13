import { NotFoundError } from '../../errors/app-error.js';
import { authRepository } from '../auth/repository.js';

/**
 * Возвращает активного пользователя или 404.
 * Единая точка проверки для всех модулей (привычки, отметки, статистика).
 */
export async function getActiveUser(userId: string) {
  const user = await authRepository.findById(userId);
  if (!user || !user.isActive) {
    throw new NotFoundError('Пользователь не найден или заблокирован');
  }
  return user;
}

export type ActiveUser = Awaited<ReturnType<typeof getActiveUser>>;
