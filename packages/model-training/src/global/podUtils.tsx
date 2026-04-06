import * as React from 'react';
import { Icon } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { t_global_color_brand_default as BrandDefaultColor } from '@patternfly/react-tokens';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';

export const getPodStatusIcon = (pod: PodKind): React.ReactElement => {
  const phase = pod.status?.phase ? pod.status.phase.toLowerCase() : '';
  const containerStatuses = pod.status?.containerStatuses || [];
  const hasWaiting = containerStatuses.some((cs) => cs.state?.waiting);

  switch (phase) {
    case 'succeeded':
      return (
        <Icon status="success">
          <CheckCircleIcon />
        </Icon>
      );
    case 'failed':
      return (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
    case 'running':
      return (
        <Icon>
          <InProgressIcon color={BrandDefaultColor.var} />
        </Icon>
      );
    case 'pending':
      return (
        <Icon status="info">
          <PendingIcon />
        </Icon>
      );
    default:
      if (hasWaiting) {
        return (
          <Icon status="info">
            <PendingIcon />
          </Icon>
        );
      }
      return (
        <Icon status="info">
          <InProgressIcon />
        </Icon>
      );
  }
};
