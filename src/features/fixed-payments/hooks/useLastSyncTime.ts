import { useState, useEffect } from 'react';

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

/** Guarda o horário da última vez que o status ficou "synced" */
export const useLastSyncTime = (syncStatus: SyncStatus): Date | null => {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    if (syncStatus === 'synced') {
      setLastSyncTime(new Date());
    }
  }, [syncStatus]);

  return lastSyncTime;
};
