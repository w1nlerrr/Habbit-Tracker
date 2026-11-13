import { NotFoundError } from '../../errors/app-error.js';
import { habitsRepository, type HabitsRepository } from './repository.js';

export type HabitRecord = NonNullable<
  Awaited<ReturnType<HabitsRepository['findByIdForUser']>>
>;

/**
 * Проверка владельца: чужая привычка неотличима от несуществующей (404),
 * поэтому перебором идентификаторов нельзя узнать о чужих данных.
 */
export async function getOwnedHabit(userId: string, habitId: string): Promise<HabitRecord> {
  const habit = await habitsRepository.findByIdForUser(habitId, userId);
  if (!habit) {
    throw new NotFoundError('Привычка не найдена');
  }
  return habit;
}
