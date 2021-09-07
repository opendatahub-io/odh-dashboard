import { QuickStart } from '@cloudmosaic/quickstarts';
import { fetchQuickStarts } from '../services/quickStartsService';
import { useFetchWatcher } from './useFetchWatcher';

export const useWatchQuickStarts = (): {
  results: QuickStart[] | null;
  loaded: boolean;
  loadError?: Error;
} => useFetchWatcher<QuickStart[]>(fetchQuickStarts);
