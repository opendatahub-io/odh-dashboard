import * as React from 'react';
import {
  AlertProps,
  ContentProps,
  Icon,
  LabelProps,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
  ExclamationTriangleIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import PhaseApiDetails from '~/app/shared/PhaseApiDetails';

type PopoverContent = {
  headerIcon: React.ReactNode;
  headerContent: string;
  bodyContent?: React.ReactNode;
  footerContent?: string;
};

export enum PhaseResourceType {
  MODEL = 'Model',
  SUBSCRIPTION = 'Subscription',
  EXTERNAL_MODEL = 'External Model',
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
  [PhaseResourceType.MODEL]: {
    [PhaseStatus.READY]: {
      headerIcon: <CheckCircleIcon />,
      headerContent: 'Ready',
    },
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Model pending',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Model failed',
    },
  },
  [PhaseResourceType.EXTERNAL_MODEL]: {
    [PhaseStatus.READY]: {
      headerIcon: <CheckCircleIcon />,
      headerContent: 'Ready',
    },
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'Pending',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Failed',
    },
  },
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
  statusMessage?: React.ReactNode,
): PopoverContent => {
  const base = POPOVER_CONTENT[resourceType][phase] ?? DEFAULT_POPOVER_CONTENT;
  if (statusMessage) {
    return { ...base, bodyContent: statusMessage };
  }
  return base;
};

export enum PhaseLabelLocation {
  EXTERNAL_MODELS = 'external-models',
  OVERVIEW = 'overview',
  SUBSCRIPTIONS_TAB = 'subscriptions-tab',
  POLICIES_TAB = 'policies-tab',
  DETAIL_PAGE = 'detail-page',
}

export const getStatusSubtext = (
  phase: string,
  resourceType: PhaseResourceType,
): React.ReactNode | undefined => {
  switch (resourceType) {
    case PhaseResourceType.MODEL:
      return getStatusSubtextForModel(phase);
    case PhaseResourceType.SUBSCRIPTION:
      return getStatusSubtextForSubscription(phase);
    case PhaseResourceType.AUTHPOLICY:
      return getStatusSubtextForAuthPolicy(phase);
    default:
      return undefined;
  }
};

const getStatusSubtextForModel = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.DEGRADED:
    case PhaseStatus.UNAVAILABLE:
      return 'Inference not serving';
    case PhaseStatus.FAILED:
      return 'Gateway not found';
    case PhaseStatus.PENDING:
      return 'Awaiting subscription';
    default:
      return undefined;
  }
};

const getStatusSubtextForSubscription = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.FAILED:
      return 'All rate limits or models unavailable';
    case PhaseStatus.DEGRADED:
      return 'Rate limits or models unavailable';
    default:
      return undefined;
  }
};

const getStatusSubtextForAuthPolicy = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.DEGRADED:
      return 'Rate limits or models unavailable';
    case PhaseStatus.FAILED:
      return 'All rate limits or models unavailable';
    default:
      return undefined;
  }
};

export const getModalSubtitle = (resourceType: PhaseResourceType): string | undefined => {
  switch (resourceType) {
    case PhaseResourceType.SUBSCRIPTION:
      return 'Subscription status';
    case PhaseResourceType.AUTHPOLICY:
      return 'Authorization policy status';
    case PhaseResourceType.MODEL:
      return 'Model status';
    default:
      return undefined;
  }
};

export const getModalAlertProps = (
  phase: string,
  resourceType: PhaseResourceType,
  statusMessage?: string,
  reason?: string,
  status?: string,
  conditionType?: string,
  lastTransitionTime?: string,
): AlertProps => {
  const phaseProps = getPhaseProps(phase);
  const alertContent = getModalTitleAndChildren(phase, resourceType);
  const hasAlertBody = !!alertContent?.children;
  const showApiDetails =
    (phase === PhaseStatus.FAILED ||
      phase === PhaseStatus.INVALID ||
      phase === PhaseStatus.UNAVAILABLE ||
      phase === PhaseStatus.DEGRADED) &&
    (!!reason || !!statusMessage);

  return {
    variant: getAlertVariant(phase),
    title: alertContent?.title,
    children:
      hasAlertBody || showApiDetails ? (
        <Stack hasGutter>
          {hasAlertBody ? (
            <StackItem data-testid="phase-modal-alert-body">{alertContent.children}</StackItem>
          ) : null}
          {showApiDetails ? (
            <StackItem>
              <PhaseApiDetails
                reason={reason}
                statusMessage={statusMessage}
                status={status}
                conditionType={conditionType}
                lastTransitionTime={lastTransitionTime}
              />
            </StackItem>
          ) : null}
        </Stack>
      ) : undefined,
    ...phaseProps,
  };
};

export const convertStatusDetailsToJson = (
  reason?: string,
  statusMessage?: string,
  status?: string,
  conditionType?: string,
  lastTransitionTime?: string,
): string =>
  JSON.stringify(
    { conditionType, status, reason, message: statusMessage, lastTransitionTime },
    null,
    2,
  );

const getModalTitleAndChildren = (
  phase: string,
  resourceType: PhaseResourceType,
): { title: string; children: string } | undefined => {
  switch (resourceType) {
    case PhaseResourceType.MODEL:
      return getAlertContentForModelRef(phase);
    case PhaseResourceType.SUBSCRIPTION:
      return getAlertContentForSubscription(phase);
    case PhaseResourceType.AUTHPOLICY:
      return getAlertContentForAuthPolicy(phase);
    default:
      return undefined;
  }
};

const getAlertContentForModelRef = (
  phase: string,
): { title: string; children: string } | undefined => {
  switch (phase) {
    case PhaseStatus.DEGRADED:
    case PhaseStatus.UNAVAILABLE:
      return {
        title: 'Model unavailable',
        children:
          'The inference service is not serving requests. The model server might be starting, crashing, or lacking resources.',
      };
    case PhaseStatus.FAILED:
      return {
        title: 'Model setup failed',
        children: 'The model could not be configured.',
      };
    case PhaseStatus.PENDING:
      return {
        title: 'Pending MaaS governance',
        children:
          "Consumers can't access this model yet. To enable access, set up a subscription and authorization policy.",
      };
    case PhaseStatus.INVALID:
      return {
        title: 'Invalid model configuration',
        children:
          'The model configuration is invalid or missing required fields. Edit the model and ensure its configuration is correct.',
      };
    default:
      return undefined;
  }
};

const getAlertContentForSubscription = (
  phase: string,
): { title: string; children: string } | undefined => {
  switch (phase) {
    case PhaseStatus.FAILED:
      return {
        title: 'Subscription failed',
        children:
          'Either the rate limit configuration failed, or this subscription includes no available models. ',
      };
    case PhaseStatus.DEGRADED:
      return {
        title: 'Subscription degraded',
        children:
          'At least one of the models or rate limits included in this subscription is unavailable.',
      };
    case PhaseStatus.PENDING:
      return {
        title: 'Pending',
        children: 'Subscription setup is in progress.',
      };
    case PhaseStatus.INVALID:
      return {
        title: 'Invalid subscription configuration',
        children:
          'The subscription configuration is invalid or missing required fields. Edit the subscription and ensure its configuration is correct.',
      };
    default:
      return undefined;
  }
};

const getAlertContentForAuthPolicy = (
  phase: string,
): { title: string; children: string } | undefined => {
  switch (phase) {
    case PhaseStatus.DEGRADED:
      return {
        title: 'Policy degraded',
        children:
          'At least one of the models referenced in this policy is unavailable, or authorization is not fully enforced',
      };
    case PhaseStatus.FAILED:
      return {
        title: 'Policy failed',
        children:
          'Either the rate limit configuration failed, or this policy includes no available models.',
      };
    case PhaseStatus.PENDING:
      return {
        title: 'Pending',
        children: 'Policy setup is in progress.',
      };
    case PhaseStatus.INVALID:
      return {
        title: 'Invalid policy configuration',
        children:
          'The policy configuration is invalid or missing required fields. Edit the policy and ensure its configuration is correct.',
      };
    default:
      return undefined;
  }
};

const getAlertVariant = (phase: string): AlertProps['variant'] => {
  switch (phase) {
    case PhaseStatus.ACTIVE:
    case PhaseStatus.READY:
      return 'success';
    case PhaseStatus.FAILED:
    case PhaseStatus.INVALID:
      return 'danger';
    case PhaseStatus.PENDING:
      return 'info';
    case PhaseStatus.DEGRADED:
      return 'warning';
    case PhaseStatus.UNAVAILABLE:
      return 'warning';
    default:
      return 'info';
  }
};

export const getSubtextProps = (phase: string): ContentProps | undefined => {
  const sharedStyle: React.CSSProperties = { textDecoration: 'underline dotted' };
  switch (phase) {
    case PhaseStatus.DEGRADED:
    case PhaseStatus.UNAVAILABLE:
      return {
        className: 'pf-v6-u-text-color-status-warning',
        style: sharedStyle,
      };
    case PhaseStatus.FAILED:
      return {
        className: 'pf-v6-u-text-color-status-danger',
        style: sharedStyle,
      };
    case PhaseStatus.PENDING:
      return {
        className: 'pf-v6-u-text-color-status-info',
        style: sharedStyle,
      };
    default:
      return undefined;
  }
};
