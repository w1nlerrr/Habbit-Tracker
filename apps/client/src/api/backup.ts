import type { BackupFileInput, BackupHistoryResponse, BackupImportResult } from '@habit/shared';

import { apiDownload, apiRequest } from './http';

export const backupApi = {
  exportData: () => apiDownload('/backup/export'),

  importData: (mode: 'merge' | 'replace', data: BackupFileInput) =>
    apiRequest<BackupImportResult>('/backup/import', {
      method: 'POST',
      body: { mode, data },
    }),

  history: () => apiRequest<BackupHistoryResponse>('/backup/history'),
};
