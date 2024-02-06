import usePipelineRunJobs from '~/concepts/pipelines/apiHooks/usePipelineRunJobs';
import createUsePipelineTable from '~/concepts/pipelines/content/tables/usePipelineTable';

// TODO - update type, https://issues.redhat.com/browse/RHOAIENG-2273
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default createUsePipelineTable(usePipelineRunJobs as any);
