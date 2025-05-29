import * as React from 'react';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

type PipelineAndVersionContextType = {
  pipelineDataSelector: () => {
    selectedPipelines: PipelineKF[];
    setSelectedPipelines: React.Dispatch<React.SetStateAction<PipelineKF[]>>;
  };
  versionDataSelector: (pipeline: PipelineKF) => {
    selectedVersions: PipelineVersionKF[];
    setSelectedVersions: React.Dispatch<React.SetStateAction<PipelineVersionKF[]>>;
  };
  getResourcesForDeletion: () => {
    pipelines: PipelineKF[];
    versions: { pipelineName: string; version: PipelineVersionKF }[];
  };
  clearAfterDeletion: () => void;
  isPipelineChecked: (pipelineId: string) => boolean;
};

type PipelineAndVersionContextProviderProps = {
  children: React.ReactNode;
};

type SelectedVersion = { pipelineName: string; versions: PipelineVersionKF[] };

export const PipelineAndVersionContext = React.createContext<PipelineAndVersionContextType>({
  pipelineDataSelector: () => ({ selectedPipelines: [], setSelectedPipelines: () => undefined }),
  versionDataSelector: () => ({ selectedVersions: [], setSelectedVersions: () => undefined }),
  getResourcesForDeletion: () => ({ pipelines: [], versions: [] }),
  clearAfterDeletion: () => undefined,
  isPipelineChecked: () => false,
});

const PipelineAndVersionContextProvider: React.FC<PipelineAndVersionContextProviderProps> = ({
  children,
}) => {
  const [selectedPipelines, setSelectedPipelines] = React.useState<PipelineKF[]>([]);
  const [selectedVersions, setSelectedVersions] = React.useState<{
    [pipelineId: string]: SelectedVersion | undefined;
  }>({});

  const setVersions =
    (pipeline: PipelineKF) =>
    (
      newVersions: PipelineVersionKF[] | ((prevState: PipelineVersionKF[]) => PipelineVersionKF[]),
    ) => {
      setSelectedVersions((prev) => ({
        ...prev,
        [pipeline.pipeline_id]: {
          pipelineName: pipeline.display_name,
          versions:
            typeof newVersions === 'function'
              ? newVersions(prev[pipeline.pipeline_id]?.versions || [])
              : newVersions,
        },
      }));
    };

  const isPipelineChecked = React.useCallback(
    (pipelineId: string) =>
      selectedPipelines.some((pipeline) => pipeline.pipeline_id === pipelineId),
    [selectedPipelines],
  );

  const contextValue = React.useMemo(
    () => ({
      pipelineDataSelector: () => ({
        selectedPipelines,
        setSelectedPipelines,
      }),
      versionDataSelector: (pipeline: PipelineKF) => ({
        selectedVersions: selectedVersions[pipeline.pipeline_id]?.versions || [],
        setSelectedVersions: setVersions(pipeline),
      }),
      getResourcesForDeletion: () => ({
        pipelines: selectedPipelines,
        versions: Object.values(selectedVersions)
          .map(
            (selectedVersion) =>
              selectedVersion?.versions.map((version) => ({
                pipelineName: selectedVersion.pipelineName,
                version,
              })) ?? [],
          )
          .flat()
          .filter((selection) => {
            const selectedPipelinesId = selectedPipelines.map((pipeline) => pipeline.pipeline_id);
            const pipelineId = selection.version.pipeline_id;
            // if the pipeline of the pipeline version will be deleted too, there is no need to delete the pipeline version
            if (pipelineId && selectedPipelinesId.includes(pipelineId)) {
              return false;
            }
            return true;
          }),
      }),
      clearAfterDeletion: () => {
        setSelectedPipelines([]);
        setSelectedVersions({});
      },
      isPipelineChecked,
    }),
    [isPipelineChecked, selectedPipelines, selectedVersions],
  );

  return (
    <PipelineAndVersionContext.Provider value={contextValue}>
      {children}
    </PipelineAndVersionContext.Provider>
  );
};

export default PipelineAndVersionContextProvider;
