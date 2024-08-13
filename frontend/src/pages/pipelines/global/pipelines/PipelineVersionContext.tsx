import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { Outlet } from 'react-router-dom';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { usePipelineVersionByParams } from '~/pages/pipelines/global/pipelines/usePipelineVersionByParams';
import { pipelineVersionsBaseRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type PipelineVersionContextState = {
  pipeline: PipelineKFv2 | null;
  version: PipelineVersionKFv2 | null;
  basePath: string;
};

export const PipelineVersionContext = React.createContext<PipelineVersionContextState>({
  pipeline: null,
  version: null,
  basePath: '',
});

const PipelineVersionContextProvider: React.FC = () => {
  const { namespace } = usePipelinesAPI();
  const { pipeline, version, isLoaded } = usePipelineVersionByParams();

  const contextValue = React.useMemo(
    () => ({
      pipeline,
      version,
      basePath: pipelineVersionsBaseRoute(
        namespace,
        version?.pipeline_id,
        version?.pipeline_version_id,
      ),
    }),
    [namespace, pipeline, version],
  );

  if (!isLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <PipelineVersionContext.Provider value={contextValue}>
      <Outlet />
    </PipelineVersionContext.Provider>
  );
};

export default PipelineVersionContextProvider;
