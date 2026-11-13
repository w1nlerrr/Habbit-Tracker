import clsx from 'clsx';

/** Плейсхолдер загрузки с мягким мерцанием. */
export function Skeleton({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={clsx('ht-shimmer relative overflow-hidden rounded-xl bg-surface-muted', className)}
    />
  );
}
