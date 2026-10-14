import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';
import TrainingJobStatus from '@odh-dashboard/model-training/components/TrainingJobStatus';
import RayJobStatus from '@odh-dashboard/model-training/components/RayJobStatus';
import { ModelStatusIcon } from '@odh-dashboard/model-serving/shared/components';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';
import type { NotebookState } from '@odh-dashboard/internal/pages/projects/notebook/types';
import NotebookStatusLabel from '@odh-dashboard/internal/concepts/notebooks/NotebookStatusLabel';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { useNotebookStatus } from '@odh-dashboard/internal/utilities/notebookControllerUtils';
import { isRayJob, isTrainJob } from '@odh-dashboard/model-training/types';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import type { InfrastructureWorkloadRow } from '../types/infrastructureWorkloads';
import { InfrastructureWorkloadKind } from '../types/infrastructureWorkloads';

export const HardwareProfileCell: React.FC<
  Pick<InfrastructureWorkloadRow, 'hardwareProfile' | 'hardwareProfileResourceType'>
> = ({ hardwareProfile, hardwareProfileResourceType }) => {
  if (!hardwareProfile) {
    return <>--</>;
  }

  return (
    <>
      <Content component={ContentVariants.p}>{hardwareProfile}</Content>
      {hardwareProfileResourceType && (
        <Content component={ContentVariants.small}>{hardwareProfileResourceType}</Content>
      )}
    </>
  );
};

const WorkbenchStatusCell: React.FC<{
  notebookState: NotebookState;
  kueueStatus?: KueueWorkloadStatusWithMessage | null;
  onClick: () => void;
}> = ({ notebookState, kueueStatus, onClick }) => {
  const { kueueStatusByNotebookName } = React.useContext(ProjectDetailsContext);
  const [notebookStatus] = useNotebookStatus(
    notebookState.isStarting,
    notebookState.notebook,
    notebookState.isRunning,
    notebookState.runningPodUid,
  );

  return (
    <NotebookStatusLabel
      isStarting={notebookState.isStarting}
      isStopping={notebookState.isStopping}
      isRunning={notebookState.isRunning}
      notebookStatus={notebookStatus}
      kueueStatus={
        kueueStatus ?? kueueStatusByNotebookName[notebookState.notebook.metadata.name] ?? null
      }
      onClick={onClick}
      isCompact
    />
  );
};

export const StatusCell: React.FC<{
  workload: InfrastructureWorkloadRow;
  notebookState?: NotebookState;
  onClick: () => void;
}> = ({ workload, notebookState, onClick }) => {
  const isModelDeployment =
    workload.resource.kind === InfrastructureWorkloadKind.InferenceService ||
    workload.resource.kind === InfrastructureWorkloadKind.LLMInferenceService;

  if (isModelDeployment) {
    const state = workload.deploymentStatus?.state ?? ModelDeploymentState.UNKNOWN;
    return (
      <ModelStatusIcon
        state={state}
        kueueStatus={workload.kueueStatus ? { status: workload.kueueStatus } : null}
        bodyContent={workload.deploymentStatus?.message}
        stoppedStates={getModelDeploymentStoppedStates(
          state,
          workload.resource.metadata.annotations,
        )}
        onClick={onClick}
      />
    );
  }

  if (isTrainJob(workload.resource)) {
    return (
      <TrainingJobStatus
        job={workload.resource}
        jobStatus={workload.jobStatus}
        onClick={onClick}
        showProgressBar={false}
      />
    );
  }

  if (isRayJob(workload.resource)) {
    return (
      <RayJobStatus job={workload.resource} jobStatus={workload.jobStatus} onClick={onClick} />
    );
  }

  if (workload.resource.kind === InfrastructureWorkloadKind.Notebook && notebookState) {
    return (
      <WorkbenchStatusCell
        notebookState={notebookState}
        kueueStatus={workload.kueueStatus ? { status: workload.kueueStatus } : null}
        onClick={onClick}
      />
    );
  }

  return null;
};
