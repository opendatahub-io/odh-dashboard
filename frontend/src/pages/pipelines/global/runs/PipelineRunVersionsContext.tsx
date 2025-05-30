import * as React from 'react';
import { useAllPipelineVersions } from '#~/concepts/pipelines/apiHooks/useAllPipelineVersions';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

type PipelineRunVersionsContextState = {
  versions: PipelineVersionKF[];
  loaded: boolean;
  error?: Error;
};

export const PipelineRunVersionsContext = React.createContext<PipelineRunVersionsContextState>({
  versions: [],
  loaded: false,
  error: undefined,
});

type PipelineRunVersionsContextProps = {
  children: React.ReactNode;
};

const PipelineRunVersionsContextProvider: React.FC<PipelineRunVersionsContextProps> = ({
  children,
}) => {
  const [{ items: versions }, loaded, error] = useAllPipelineVersions();

  const contextValue = React.useMemo(
    () => ({ versions, loaded, error }),
    [versions, loaded, error],
  );

  return (
    <PipelineRunVersionsContext.Provider value={contextValue}>
      {children}
    </PipelineRunVersionsContext.Provider>
  );
};

export default PipelineRunVersionsContextProvider;
