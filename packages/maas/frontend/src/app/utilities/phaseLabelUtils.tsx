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
  bodyContent: string;
  footerContent: string;
};

export enum PhaseResourceType {
  SUBSCRIPTION = 'Subscription',
  MODELREF = 'Model',
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
      bodyContent:
        'This subscription was recently created and is being reconciled. No action needed - it should become active shortly.',
      footerContent: 'If this persists, check the controller logs.',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Subscription failed',
      bodyContent:
        'All critical dependencies are missing or reconciliation has failed. No models in this subscription are accessible.',
      footerContent: 'Review the subscription spec and model references.',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid subscription spec',
      bodyContent:
        'The resource spec contains validation errors and cannot be reconciled until corrected.',
      footerContent:
        'Edit the YAML to fix structural errors (malformed model refs, missing fields).',
    },
    [PhaseStatus.DEGRADED]: {
      headerIcon: (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      ),
      headerContent: 'Subscription degraded',
      bodyContent:
        'Some models may not be accessible to users. Drill into details to see affected models.',
      footerContent:
        'Common causes: model endpoint removed, rate limit policy not accepted by Kuadrant.',
    },
  },
  [PhaseResourceType.AUTHPOLICY]: {
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Policy pending',
      bodyContent:
        'This authorization policy was recently created. No AuthPolicies have been generated yet - the system is reconciling.',
      footerContent: 'If this persists beyond a few minutes, check the controller logs.',
    },
    [PhaseStatus.DEGRADED]: {
      headerIcon: (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      ),
      headerContent: 'Policy degraded',
      bodyContent:
        'Some authorization policies are not being enforced. This may mean some model refs are missing or some Kuadrant AuthPolicies have not been accepted.',
      footerContent:
        'Note: "Degraded" also covers the initial state when no AuthPolicies have been generated yet. Check if this policy was recently created.',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Policy failed',
      bodyContent:
        'All critical dependencies are missing or reconciliation has failed. Access controls are not in effect.',
      footerContent: 'Review the policy spec and ensure referenced models exist.',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid policy spec',
      bodyContent: 'The policy spec contains validation errors and cannot be reconciled.',
      footerContent: 'Edit the YAML to fix structural errors.',
    },
  },
  [PhaseResourceType.MODELREF]: {
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Model pending',
      bodyContent:
        'This model is awaiting governance pairing (subscription + auth policy) or backend readiness. No action needed - it should become ready once dependencies are met.',
      footerContent: 'Check that a subscription and auth policy reference this model.',
    },
    [PhaseStatus.UNAVAILABLE]: {
      headerIcon: (
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>
      ),
      headerContent: 'Model unavailable',
      bodyContent:
        'This model has governance configured (subscription and auth policy) but the backend or routing has issues. The model cannot serve requests right now.',
      footerContent:
        'Check the inference gateway status and backend health. Contact your infrastructure team if the issue persists.',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Model failed',
      bodyContent: 'Reconciliation has failed completely. The model cannot be used.',
      footerContent: 'Review the model spec and check controller logs for error details.',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid model spec',
      bodyContent: 'The model spec contains validation errors and cannot be reconciled.',
      footerContent: 'Edit the YAML to fix structural errors.',
    },
  },
};

const DEFAULT_POPOVER_CONTENT: PopoverContent = {
  headerIcon: <OutlinedQuestionCircleIcon />,
  headerContent: 'Unknown state',
  bodyContent: 'The resource is in an unknown state.',
  footerContent: 'Contact support if this persists.',
};

export const getPopoverContent = (
  phase: string,
  resourceType: PhaseResourceType,
  statusMessage?: string,
): PopoverContent => {
  const base = POPOVER_CONTENT[resourceType][phase] ?? DEFAULT_POPOVER_CONTENT;
  if (
    statusMessage &&
    resourceType === PhaseResourceType.SUBSCRIPTION &&
    phase === PhaseStatus.DEGRADED
  ) {
    return {
      ...base,
      bodyContent: `${statusMessage}. Some models may not be accessible to users. Drill into details to see affected models.`,
    };
  }
  return base;
};
