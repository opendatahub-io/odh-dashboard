import { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { MlmdContext, MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { useMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContext';

export const usePipelineRunMlmdContext = (
  runID?: string,
  refreshRate?: number,
): FetchState<MlmdContext | null> => useMlmdContext(runID, MlmdContextTypes.RUN, refreshRate);
