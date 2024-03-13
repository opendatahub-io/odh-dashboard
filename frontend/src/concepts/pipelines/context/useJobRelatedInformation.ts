import * as React from 'react';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineAPIState } from '~/concepts/pipelines/context/usePipelineAPIState';

type JobStatus = {
  loading: boolean;
  data: PipelineRunJobKFv2 | null;
};

export type GetJobInformation = (resource?: PipelineRunJobKFv2) => JobStatus;

const useJobRelatedInformation = (
  apiState: PipelineAPIState,
): { getJobInformation: GetJobInformation } => {
  const [jobStorage, setJobStorage] = React.useState<{ [jobId: string]: JobStatus } | undefined>(
    {},
  );
  const loadedIds = React.useRef<string[]>([]);

  return {
    getJobInformation: React.useCallback<GetJobInformation>(
      (resource) => {
        if (!apiState.apiAvailable) {
          return { loading: false, data: null };
        }
        if (!resource) {
          return { loading: false, data: null };
        }
        const jobId = resource.recurring_run_id;
        if (jobStorage?.[jobId]) {
          return jobStorage[jobId];
        }
        if (loadedIds.current.includes(jobId)) {
          return { loading: true, data: null };
        }
        loadedIds.current.push(jobId);

        apiState.api
          .getPipelineRunJob({}, jobId)
          .then((job) => {
            setJobStorage((jobState) => ({
              ...jobState,
              [jobId]: { loading: false, data: job },
            }));
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error('Could not fetch job reference', e);
            loadedIds.current = loadedIds.current.filter((i) => i !== jobId);
            return null;
          });

        return { loading: true, data: null };
      },
      [apiState, jobStorage],
    ),
  };
};

export default useJobRelatedInformation;
