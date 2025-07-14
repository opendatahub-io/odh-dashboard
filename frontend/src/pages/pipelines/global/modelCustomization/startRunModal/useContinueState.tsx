import * as React from 'react';
import { useIlabPipeline } from '#~/concepts/pipelines/content/modelCustomizationForm/useIlabPipeline';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

export type ContinueCondition =
  | 'ilabPipelineInstalled'
  | 'pipelineServerConfigured'
  | 'pipelineServerAccessible'
  | 'pipelineServerOnline';

export type ContinueState =
  | { canContinue: true; isLoading: false }
  | { canContinue: false; isLoading: true }
  | { canContinue: false; isLoading: false; unmetCondition: ContinueCondition };

export const useContinueState = (): ContinueState => {
  const { pipelinesServer } = usePipelinesAPI();
  const {
    ilabPipeline,
    loaded: ilabPipelineLoaded,
    loadError: ilabPipelineLoadError,
  } = useIlabPipeline();

  const continueState = React.useMemo<ContinueState>(() => {
    const isLoadingIlabPipeline =
      pipelinesServer.installed && !ilabPipelineLoaded && !ilabPipelineLoadError;
    const isLoading = pipelinesServer.initializing || isLoadingIlabPipeline;

    if (isLoading) {
      return { canContinue: false, isLoading: true };
    }

    const conditions: [ContinueCondition, boolean][] = [
      // Order matters -- the first unmet condition will be set
      ['pipelineServerAccessible', pipelinesServer.installed],
      ['pipelineServerOnline', !pipelinesServer.timedOut],
      ['pipelineServerConfigured', !ilabPipelineLoadError && pipelinesServer.compatible],
      ['ilabPipelineInstalled', ilabPipelineLoaded && !!ilabPipeline],
    ];

    const unmetConditions = conditions
      .filter(([, isMet]) => !isMet)
      .map(([condition]) => condition);

    if (unmetConditions.length > 0) {
      return {
        canContinue: false,
        isLoading: false,
        unmetCondition: unmetConditions[0],
      };
    }

    return { canContinue: true, isLoading: false };
  }, [pipelinesServer, ilabPipelineLoaded, ilabPipelineLoadError, ilabPipeline]);

  return continueState;
};
