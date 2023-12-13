import { Icon, Popover, Spinner, Split, SplitItem } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { K8sCondition, PipelineRunKind } from '~/k8sTypes';
import { EdgeContext } from '~/concepts/edge/content/EdgeContext';

type EdgeStatusProps = {
  status?: K8sCondition;
  run?: PipelineRunKind;
};

export const EdgeStatus: React.FC<EdgeStatusProps> = ({ status, run }) => {
  const { taskRunStatuses } = React.useContext(EdgeContext);

  const [taskRunStatus, setTaskRunStatus] = React.useState<K8sCondition>();

  React.useEffect(() => {
    if (run) {
      const taskRunStatus = taskRunStatuses[run.metadata.name];
      setTaskRunStatus(taskRunStatus);
    }
  }, [run, taskRunStatuses]);

  const currentStatus = taskRunStatus ?? status;

  const statusIcon =
    currentStatus?.status === 'True' ? (
      <Icon status="success">
        <CheckCircleIcon />
      </Icon>
    ) : currentStatus?.status === 'False' ? (
      <Icon status="danger">
        <ExclamationCircleIcon />
      </Icon>
    ) : (
      <Spinner size="md" />
    );
  return (
    <Popover
      alertSeverityVariant={
        currentStatus?.status === 'True'
          ? 'success'
          : currentStatus?.status === 'False'
          ? 'danger'
          : 'info'
      }
      aria-label="Status popover"
      headerIcon={statusIcon}
      headerContent={currentStatus?.reason}
      bodyContent={currentStatus?.message}
    >
      <Split hasGutter>
        <SplitItem>{statusIcon}</SplitItem>
        <SplitItem>{currentStatus?.reason ?? 'Unknown'}</SplitItem>
      </Split>
    </Popover>
  );
};
