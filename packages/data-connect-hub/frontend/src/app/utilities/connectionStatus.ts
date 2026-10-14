import type { Connection } from '~/app/types';

export const statusVariant: Record<Connection['status']['state'], 'success' | 'danger'> = {
  ready: 'success',
  ingestion_not_ready: 'danger',
  not_ready: 'danger',
};

export const isValidTimestamp = (timestamp?: string): timestamp is string =>
  Boolean(timestamp && !Number.isNaN(new Date(timestamp).getTime()));
