import * as React from 'react';
import { getPipelineIdByPipelineVersion } from '~/concepts/pipelines/content/utils';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';

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
        [pipeline.id]: {
          pipelineName: pipeline.name,
          versions:
            typeof newVersions === 'function'
              ? newVersions(prev[pipeline.id]?.versions || [])
              : newVersions,
        },
      }));
    };

  const isPipelineChecked = (pipelineId: string) =>
    selectedPipelines.some((pipeline) => pipeline.id === pipelineId);

  return (
    <PipelineAndVersionContext.Provider
      value={{
        pipelineDataSelector: () => ({
          selectedPipelines,
          setSelectedPipelines,
        }),
        versionDataSelector: (pipeline: PipelineKF) => ({
          selectedVersions: selectedVersions[pipeline.id]?.versions || [],
          setSelectedVersions: setVersions(pipeline),
        }),
        getResourcesForDeletion: () => ({
          pipelines: selectedPipelines,
          versions: (Object.values(selectedVersions) as SelectedVersion[])
            .map((selectedVersion) =>
              selectedVersion.versions.map((version) => ({
                pipelineName: selectedVersion.pipelineName,
                version,
              })),
            )
            .flat()
            .filter((selection) => {
              const selectedPipelinesId = selectedPipelines.map((pipeline) => pipeline.id);
              const pipelineId = getPipelineIdByPipelineVersion(selection.version);
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
      }}
    >
      {children}
    </PipelineAndVersionContext.Provider>
  );
};

export default PipelineAndVersionContextProvider;
