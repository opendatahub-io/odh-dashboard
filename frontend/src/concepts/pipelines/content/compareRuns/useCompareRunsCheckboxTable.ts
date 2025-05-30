import * as React from 'react';
import { useCheckboxTableBase, UseCheckboxTableBaseProps } from '#~/components/table';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

const useCompareRunsCheckboxTable = (): UseCheckboxTableBaseProps<PipelineRunKF> => {
  const { selectedRuns, setSelectedRuns, runs } = useCompareRuns();
  return useCheckboxTableBase<PipelineRunKF>(
    runs,
    selectedRuns,
    setSelectedRuns,
    React.useCallback((d) => d.run_id, []),
  );
};

export default useCompareRunsCheckboxTable;
