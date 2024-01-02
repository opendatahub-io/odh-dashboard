import * as React from 'react';
import YAML from 'yaml';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKind } from '~/k8sTypes';

const usePipelineTemplate = (pipelineId?: string): FetchState<PipelineRunKind | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKind | null>>(
    (opts) => {
      if (!pipelineId) {
        return Promise.reject(new NotReadyError('No pipeline id'));
      }

      return api.listPipelineTemplate(opts, pipelineId).then(({ template }) => {
        let pipelineRun: PipelineRunKind;
        try {
          pipelineRun = YAML.parse(template);
        } catch (e) {
          const message = (e as Error)?.message || '';
          // eslint-disable-next-line no-console
          console.error('Error parsing yaml', e);
          throw new Error(`Unable to parse Pipeline structure. ${message}`);
        }
        return pipelineRun;
      });
    },
    [api, pipelineId],
  );

  return useFetchState(call, null);
};

export default usePipelineTemplate;
