import * as React from 'react';
import { Alert, Content, Flex, Skeleton, Title } from '@patternfly/react-core';
import ContentModal, { ButtonAction } from '@odh-dashboard/ui-core/components/ContentModal';
import RayJobStatus from './components/RayJobStatus';
import { getRayJobStatusSync, getStatusFlags, getRayJobStatusAlert } from './utils';
import { useWorkloadForJob } from './hooks/useWorkloadForTrainJob';
import { RayJobKind } from '../../k8sTypes';
import { JobDisplayState } from '../../types';

type RayJobStatusModalProps = {
  job: RayJobKind;
  jobStatus?: JobDisplayState;
  onClose: () => void;
  onDelete?: () => void;
  onPauseClick?: () => void;
  onResumeClick?: () => void;
  isToggling?: boolean;
  isPauseDisabled?: boolean;
};

const RayJobStatusModal: React.FC<RayJobStatusModalProps> = ({
  job,
  jobStatus,
  onClose,
  onDelete,
  onPauseClick,
  onResumeClick,
  isToggling = false,
  isPauseDisabled = false,
}) => {
  const status = jobStatus ?? getRayJobStatusSync(job);
  const { isPaused, isComplete, isDeleting, canPauseResume } = getStatusFlags(status);

  const [workloads, workloadLoaded] = useWorkloadForJob(job);
  const workloadConditions = React.useMemo(
    () => (workloadLoaded && workloads.length > 0 ? workloads[0].status?.conditions ?? [] : []),
    [workloads, workloadLoaded],
  );

  const alert = React.useMemo(
    () => getRayJobStatusAlert(status, job, workloadConditions),
    [status, job, workloadConditions],
  );

  const bodyContent = alert ? (
    <Alert
      isInline
      variant={alert.variant}
      title={workloadLoaded ? alert.title : <Skeleton height="20px" width="60%" />}
      data-testid={`ray-job-status-alert-${alert.variant}`}
    >
      {workloadLoaded ? (
        alert.description && (
          <Content data-testid="ray-job-status-alert-description">{alert.description}</Content>
        )
      ) : (
        <Skeleton height="20px" width="80%" />
      )}
    </Alert>
  ) : null;

  const showDeleteButton = !isDeleting && !isComplete;

  const buttonActions: ButtonAction[] = [];

  if (canPauseResume) {
    buttonActions.push({
      label: isPaused ? 'Resume job' : 'Pause job',
      onClick: (isPaused ? onResumeClick : onPauseClick) ?? onClose,
      variant: 'primary',
      dataTestId: isPaused ? 'resume-job-button' : 'pause-job-button',
      isDisabled: isToggling || isPauseDisabled,
      isLoading: isToggling,
    });
  }

  if (showDeleteButton) {
    buttonActions.push({
      label: 'Delete job',
      onClick: onDelete ?? onClose,
      variant: 'secondary',
      dataTestId: 'delete-job-button',
      isDisabled: isToggling,
    });
  }

  buttonActions.push({
    label: 'Close',
    onClick: onClose,
    variant: 'link',
    dataTestId: 'close-status-modal-button',
  });

  return (
    <ContentModal
      dataTestId="ray-job-status-modal"
      variant="small"
      onClose={onClose}
      title={
        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
          <Title headingLevel="h2" size="lg">
            Ray job progress
          </Title>
          <RayJobStatus job={job} jobStatus={status} />
        </Flex>
      }
      contents={bodyContent}
      buttonActions={buttonActions}
    />
  );
};

export default RayJobStatusModal;
