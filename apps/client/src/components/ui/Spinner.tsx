import clsx from 'clsx';

export function Spinner({ className }: { className?: string }): React.ReactElement {
  return (
    <span
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className ?? 'size-5',
      )}
      role="status"
      aria-label="Загрузка"
    />
  );
}
