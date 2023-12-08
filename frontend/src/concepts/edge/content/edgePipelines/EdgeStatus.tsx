import { Icon, Popover, Spinner, Split, SplitItem } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { K8sCondition } from '~/k8sTypes';

type EdgeStatusProps = {
  status?: K8sCondition;
};

export const EdgeStatus: React.FC<EdgeStatusProps> = ({ status }) => {
  const statusIcon =
    status?.status === 'True' ? (
      <Icon status="success">
        <CheckCircleIcon />
      </Icon>
    ) : status?.status === 'False' ? (
      <Icon status="danger">
        <ExclamationCircleIcon />
      </Icon>
    ) : (
      <Spinner size="md" />
    );
  return (
    <Popover
      alertSeverityVariant={
        status?.status === 'True' ? 'success' : status?.status === 'False' ? 'danger' : 'info'
      }
      aria-label="Status popover"
      headerIcon={statusIcon}
      headerContent={status?.reason}
      bodyContent={status?.message}
    >
      <Split hasGutter>
        <SplitItem>{statusIcon}</SplitItem>
        <SplitItem>{status?.reason ?? 'Unknown'}</SplitItem>
      </Split>
    </Popover>
  );
};
