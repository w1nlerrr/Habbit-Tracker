import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Download, History, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { backupFileSchema, type BackupFileInput } from '@habit/shared';

import { backupApi } from '../../api/backup';
import { ApiError } from '../../api/http';
import { Button, Card, CardHeader, Modal, Spinner } from '../../components/ui';

const KIND_LABELS: Record<string, string> = {
  export: 'Экспорт данных',
  import: 'Импорт данных',
  backup: 'Копия БД',
  restore: 'Восстановление БД',
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  return `${(bytes / 1024).toFixed(1)} КБ`;
}

export function BackupSection(): React.ReactElement {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFileInput | null>(null);

  const historyQuery = useQuery({
    queryKey: ['backup-history'],
    queryFn: backupApi.history,
  });

  const exportMutation = useMutation({
    mutationFn: backupApi.exportData,
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Резервная копия скачана: ${fileName}`);
      void queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось скачать копию');
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ mode, data }: { mode: 'merge' | 'replace'; data: BackupFileInput }) =>
      backupApi.importData(mode, data),
    onSuccess: (result) => {
      toast.success(
        `Импорт завершён: добавлено ${result.imported}, пропущено ${result.skipped}`,
      );
      setPending(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось импортировать данные');
    },
  });

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsedJson: unknown = JSON.parse(await file.text());
      const parsed = backupFileSchema.safeParse(parsedJson);

      if (!parsed.success) {
        toast.error('Файл не является корректной резервной копией Habit Tracker');
        return;
      }

      setPending(parsed.data);
    } catch {
      toast.error('Не удалось прочитать файл: ожидается JSON');
    }
  };

  const history = historyQuery.data?.items ?? [];

  return (
    <>
      <Card>
        <CardHeader
          title="Резервное копирование"
          subtitle="Экспорт и восстановление данных пользователя"
        />

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Button
              loading={exportMutation.isPending}
              icon={<Download className="size-4" />}
              onClick={() => exportMutation.mutate()}
            >
              Скачать резервную копию
            </Button>

            <Button
              variant="secondary"
              icon={<Upload className="size-4" />}
              onClick={() => fileInput.current?.click()}
            >
              Импортировать из файла
            </Button>

            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void onFileChange(event)}
            />
          </div>

          <p className="text-xs text-slate-500">
            Экспорт содержит все привычки, расписание и отметки. Файл проверяется по схеме при
            импорте, статистика пересчитывается заново.
          </p>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <History className="size-4 text-slate-400" />
              Журнал операций
            </p>

            {historyQuery.isLoading ? (
              <div className="flex justify-center py-4 text-indigo-600">
                <Spinner className="size-5" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500">Операций пока не было.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((job) => (
                  <li key={job.id} className="flex items-center gap-3 py-2 text-sm">
                    {job.status === 'success' ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : job.status === 'failed' ? (
                      <XCircle className="size-4 shrink-0 text-rose-500" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-800">
                        {KIND_LABELS[job.kind] ?? job.kind}
                        {job.fileName ? (
                          <span className="text-slate-400"> · {job.fileName}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(job.startedAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                        {' · '}
                        {formatSize(job.sizeBytes)}
                        {job.checksum ? ` · sha256: ${job.checksum.slice(0, 8)}…` : ''}
                      </p>
                      {job.error ? (
                        <p className="truncate text-xs text-rose-500">{job.error}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Modal
        open={pending !== null}
        title="Восстановление из резервной копии"
        onClose={() => setPending(null)}
        footer={
          <Button variant="secondary" onClick={() => setPending(null)}>
            Отмена
          </Button>
        }
      >
        {pending ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              В файле <strong>{pending.habits.length}</strong> привычек и{' '}
              <strong>
                {pending.habits.reduce((sum, habit) => sum + habit.entries.length, 0)}
              </strong>{' '}
              отметок.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-800">Добавить данные (merge)</p>
              <p className="mt-1 text-xs text-slate-500">
                Привычки с совпадающими названиями будут пропущены, остальные добавятся.
              </p>
              <Button
                size="sm"
                className="mt-2"
                loading={importMutation.isPending}
                onClick={() => importMutation.mutate({ mode: 'merge', data: pending })}
              >
                Добавить
              </Button>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="font-medium text-rose-800">Заменить всё (replace)</p>
              <p className="mt-1 text-xs text-rose-600">
                Все текущие привычки и отметки будут удалены и восстановлены из файла.
              </p>
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                loading={importMutation.isPending}
                onClick={() => importMutation.mutate({ mode: 'replace', data: pending })}
              >
                Заменить все данные
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
