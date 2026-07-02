import React from 'react';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';

type RunsCache = {
  runs: Record<string, PipelineRunKF | null>;
  errors: Record<string, Error>;
  loading: Set<string>;
};

const ArtifactRunsContext = React.createContext<RunsCache>({
  runs: {},
  errors: {},
  loading: new Set(),
});

export const useArtifactRunsCache = (): RunsCache => React.useContext(ArtifactRunsContext);

type ArtifactRunsProviderProps = {
  children: React.ReactNode;
  runs: Record<string, PipelineRunKF | null>;
  errors: Record<string, Error>;
  loading: Set<string>;
};

export const ArtifactRunsProvider: React.FC<ArtifactRunsProviderProps> = ({
  children,
  runs,
  errors,
  loading,
}) => {
  const value = React.useMemo(() => ({ runs, errors, loading }), [runs, errors, loading]);

  return <ArtifactRunsContext.Provider value={value}>{children}</ArtifactRunsContext.Provider>;
};
