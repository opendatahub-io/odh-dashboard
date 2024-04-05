import * as React from 'react';
import { useCheckboxTableBase, UseCheckboxTableBaseProps } from '~/components/table';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

const useCompareRunsCheckboxTable = (): UseCheckboxTableBaseProps<PipelineRunKFv2> => {
  const { selectedRuns, setSelectedRuns, runs } = useCompareRuns();
  return useCheckboxTableBase<PipelineRunKFv2>(
    runs,
    selectedRuns,
    setSelectedRuns,
    React.useCallback((d) => d.run_id, []),
  );
};

export default useCompareRunsCheckboxTable;
