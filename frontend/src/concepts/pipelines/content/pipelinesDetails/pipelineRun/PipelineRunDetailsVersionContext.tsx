import * as React from 'react';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { getPipelineVersionResourceRef } from '~/concepts/pipelines/content/tables/utils';
import {
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineVersionKF,
  ResourceReferenceKF,
} from '~/concepts/pipelines/kfTypes';

type PipelineRunDetailsVersionContextState = {
  version: PipelineVersionKF | null;
  loaded: boolean;
  error?: Error;
  versionRef?: ResourceReferenceKF;
};

export const PipelineRunDetailsVersionContext =
  React.createContext<PipelineRunDetailsVersionContextState>({
    version: null,
    loaded: false,
    error: undefined,
    versionRef: undefined,
  });

type PipelineRunDetailsVersionContextProps = {
  children: React.ReactNode;
  resource?: PipelineRunJobKF | PipelineRunKF | null;
};

const PipelineRunDetailsVersionContextProvider: React.FC<PipelineRunDetailsVersionContextProps> = ({
  children,
  resource,
}) => {
  const versionRef = getPipelineVersionResourceRef(resource);
  const [version, loaded, error] = usePipelineVersionById(versionRef?.key.id);

  return (
    <PipelineRunDetailsVersionContext.Provider value={{ version, loaded, error, versionRef }}>
      {children}
    </PipelineRunDetailsVersionContext.Provider>
  );
};

export default PipelineRunDetailsVersionContextProvider;
