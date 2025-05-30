import useExperiments, {
  useActiveExperiments,
} from '#~/concepts/pipelines/apiHooks/useExperiments';
import createUsePipelineTable from '#~/concepts/pipelines/content/tables/usePipelineTable';

export const useActiveExperimentTable = createUsePipelineTable(useActiveExperiments);

export default createUsePipelineTable(useExperiments);
