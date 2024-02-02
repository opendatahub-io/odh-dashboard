import * as React from 'react';
import YAML from 'yaml';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKind } from '~/k8sTypes';

const usePipelineVersionTemplates = (
  pipelineVersionId?: string,
): FetchState<PipelineRunKind | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKind | null>>(
    (opts) => {
      if (!pipelineVersionId) {
        return Promise.reject(new NotReadyError('No pipeline version id'));
      }

      return api.listPipelineVersionTemplates(opts, pipelineVersionId).then(({ template }) => {
        let pipelineRun: PipelineRunKind;
        try {
          pipelineRun = YAML.parse(template);
        } catch (e) {
          const message = (e as Error | undefined)?.message || '';
          // eslint-disable-next-line no-console
          console.error('Error parsing yaml', e);
          throw new Error(`Unable to parse Pipeline structure. ${message}`);
        }
        return pipelineRun;
      });
    },
    [api, pipelineVersionId],
  );

  return useFetchState(call, null);
};

export default usePipelineVersionTemplates;
