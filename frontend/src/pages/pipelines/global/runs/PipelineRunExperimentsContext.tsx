import * as React from 'react';
import useExperiments from '#~/concepts/pipelines/apiHooks/useExperiments';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

type PipelineRunExperimentsContextState = {
  experiments: ExperimentKF[];
  loaded: boolean;
  error?: Error;
};

export const PipelineRunExperimentsContext =
  React.createContext<PipelineRunExperimentsContextState>({
    experiments: [],
    loaded: false,
    error: undefined,
  });

type PipelineRunExperimentsContextProps = {
  children: React.ReactNode;
};

const PipelineRunExperimentsContextProvider: React.FC<PipelineRunExperimentsContextProps> = ({
  children,
}) => {
  const [{ items: experiments }, loaded, error] = useExperiments();

  const contextValue = React.useMemo(
    () => ({ experiments, loaded, error }),
    [experiments, loaded, error],
  );

  return (
    <PipelineRunExperimentsContext.Provider value={contextValue}>
      {children}
    </PipelineRunExperimentsContext.Provider>
  );
};

export default PipelineRunExperimentsContextProvider;
