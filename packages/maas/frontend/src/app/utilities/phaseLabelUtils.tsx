import * as React from 'react';
import { Icon, LabelProps } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
  ExclamationTriangleIcon,
  PendingIcon,
} from '@patternfly/react-icons';

type PopoverContent = {
  headerIcon: React.ReactNode;
  headerContent: string;
  bodyContent?: string;
  footerContent?: string;
};

export enum PhaseResourceType {
  SUBSCRIPTION = 'Subscription',
  AUTHPOLICY = 'Policy',
}

export enum PhaseStatus {
  ACTIVE = 'Active',
  READY = 'Ready',
  PENDING = 'Pending',
  FAILED = 'Failed',
  INVALID = 'Invalid',
  DEGRADED = 'Degraded',
  UNAVAILABLE = 'Unavailable',
  UNHEALTHY = 'Unhealthy',
  UNKNOWN = 'Unknown',
}

export const getPhaseProps = (
  phase: string | undefined,
): { icon: React.ReactNode; status?: LabelProps['status']; color?: LabelProps['color'] } => {
  switch (phase) {
    case PhaseStatus.ACTIVE:
    case PhaseStatus.READY:
      return { icon: <CheckCircleIcon />, status: 'success' };
    case PhaseStatus.FAILED:
    case PhaseStatus.INVALID:
      return { icon: <ExclamationCircleIcon />, status: 'danger' };
    case PhaseStatus.UNAVAILABLE:
      return { icon: <ExclamationCircleIcon />, status: 'warning' };
    case PhaseStatus.PENDING:
      return { icon: <PendingIcon />, color: 'purple' };
    case PhaseStatus.DEGRADED:
      return { icon: <ExclamationTriangleIcon />, status: 'warning' };
    default:
      return { icon: <OutlinedQuestionCircleIcon />, color: 'grey' };
  }
};

export const normalizePhase = (phase: string | undefined): string => {
  const normalized = phase?.trim();
  if (normalized === PhaseStatus.UNHEALTHY) {
    return PhaseStatus.UNAVAILABLE;
  }
  if (normalized === PhaseStatus.ACTIVE) {
    return PhaseStatus.READY;
  }
  return normalized || PhaseStatus.UNKNOWN;
};

const POPOVER_CONTENT: Record<PhaseResourceType, Partial<Record<string, PopoverContent>>> = {
  [PhaseResourceType.SUBSCRIPTION]: {
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Subscription pending',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Subscription failed',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid subscription spec',
    },
    [PhaseStatus.DEGRADED]: {
      headerIcon: (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      ),
      headerContent: 'Subscription degraded',
    },
  },
  [PhaseResourceType.AUTHPOLICY]: {
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Policy pending',
    },
    [PhaseStatus.DEGRADED]: {
      headerIcon: (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      ),
      headerContent: 'Policy degraded',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Policy failed',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid policy spec',
    },
  },
};

const DEFAULT_POPOVER_CONTENT: PopoverContent = {
  headerIcon: <OutlinedQuestionCircleIcon />,
  headerContent: 'Unknown state',
  bodyContent: 'The resource is in an unknown state.',
};

export const getPopoverContent = (
  phase: string,
  resourceType: PhaseResourceType,
  statusMessage?: string,
): PopoverContent => {
  const base = POPOVER_CONTENT[resourceType][phase] ?? DEFAULT_POPOVER_CONTENT;
  if (statusMessage) {
    return { ...base, bodyContent: statusMessage };
  }
  return base;
};
