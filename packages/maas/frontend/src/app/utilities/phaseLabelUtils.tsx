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
import PhaseApiDetails from '~/app/shared/Phase/PhaseApiDetails';
import type { AffectedModel } from '~/app/types/maas-model';
import { modelRefsToSummaries } from '~/app/utilities/authpolicies';
import type { MaaSModelRefSummary } from '~/app/types/subscriptions';

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
  EXTERNAL_PROVIDER = 'External Provider',
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

export const MODEL_NOT_FOUND_STATUS_MESSAGE = 'Model not found. The MaaSModelRef does not exist.';

type ModelRefWithPhase = {
  name: string;
  namespace?: string;
  displayName?: string;
  phase?: string;
  statusMessage?: string;
};

/**
 * Gets a list of affected models from a list of model refs.
 */
export const getAffectedModels = (modelRefs: ModelRefWithPhase[]): AffectedModel[] =>
  modelRefs.flatMap((ref) => {
    const phase = normalizePhase(ref.phase);
    if (phase === PhaseStatus.READY) {
      return [];
    }
    if (phase === PhaseStatus.UNKNOWN) {
      return [
        {
          name: ref.name,
          namespace: ref.namespace,
          displayName: ref.displayName,
          phase: PhaseStatus.UNAVAILABLE,
          statusMessage: ref.statusMessage ?? MODEL_NOT_FOUND_STATUS_MESSAGE,
        },
      ];
    }
    return [
      {
        name: ref.name,
        namespace: ref.namespace,
        displayName: ref.displayName,
        phase,
        statusMessage: ref.statusMessage,
      },
    ];
  });

/** Resolve resource model refs against the summaries, then return non-Ready affected models. */
export const getAffectedModelsFromRefs = (
  refs: { name: string; namespace: string; displayName?: string }[],
  summaries: MaaSModelRefSummary[],
): AffectedModel[] => getAffectedModels(modelRefsToSummaries(refs, summaries));

const POPOVER_CONTENT: Record<PhaseResourceType, Partial<Record<string, PopoverContent>>> = {
  [PhaseResourceType.EXTERNAL_PROVIDER]: {
    [PhaseStatus.READY]: {
      headerIcon: <CheckCircleIcon />,
      headerContent: 'Ready',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid external provider configuration',
    },
    [PhaseStatus.FAILED]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'External provider failed',
    },
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'External provider pending',
    },
  },
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
    [PhaseStatus.PENDING]: {
      headerIcon: <PendingIcon />,
      headerContent: 'External model pending',
    },
    [PhaseStatus.INVALID]: {
      headerIcon: (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      ),
      headerContent: 'Invalid external model configuration',
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
  OVERVIEW = 'overview',
  SUBSCRIPTIONS_TAB = 'subscriptions-tab',
  POLICIES_TAB = 'policies-tab',
  DETAIL_PAGE = 'detail-page',
  EXTERNAL_MODELS = 'external-models',
  EXTERNAL_PROVIDERS = 'external-providers',
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
    case PhaseResourceType.EXTERNAL_MODEL:
      return getStatusSubtextForExternalModel(phase);
    case PhaseResourceType.EXTERNAL_PROVIDER:
      return getStatusSubtextForExternalProvider(phase);
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
      return 'Model setup failed';
    case PhaseStatus.PENDING:
      return 'Awaiting governance pairing';
    case PhaseStatus.INVALID:
      return 'Configuration error';
    default:
      return undefined;
  }
};

const getStatusSubtextForSubscription = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.FAILED:
      return 'All models unavailable or setup failed';
    case PhaseStatus.DEGRADED:
      return 'Models unavailable';
    case PhaseStatus.PENDING:
      return 'Setting up subscription';
    case PhaseStatus.INVALID:
      return 'Configuration error';
    default:
      return undefined;
  }
};

const getStatusSubtextForAuthPolicy = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.DEGRADED:
      return 'Models unavailable';
    case PhaseStatus.FAILED:
      return 'All models unavailable or setup failed';
    case PhaseStatus.PENDING:
      return 'Setting up policy';
    case PhaseStatus.INVALID:
      return 'Configuration error';
    default:
      return undefined;
  }
};

const getStatusSubtextForExternalModel = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.PENDING:
      return 'Setting up external model';
    case PhaseStatus.INVALID:
      return 'Invalid configuration';
    case PhaseStatus.FAILED:
      return 'External model setup failed';
    default:
      return undefined;
  }
};

const getStatusSubtextForExternalProvider = (phase: string): React.ReactNode | undefined => {
  switch (phase) {
    case PhaseStatus.PENDING:
      return 'Setting up external provider';
    case PhaseStatus.INVALID:
      return 'Invalid configuration';
    case PhaseStatus.FAILED:
      return 'External provider setup failed';
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
    case PhaseResourceType.EXTERNAL_MODEL:
      return 'External model status';
    case PhaseResourceType.EXTERNAL_PROVIDER:
      return 'External provider status';
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
  // Pending models (overview tab only) use the same Ready-condition JSON as
  // degraded/failed so operators can inspect governance pairing status.
  const showApiDetails =
    (phase === PhaseStatus.FAILED ||
      phase === PhaseStatus.INVALID ||
      phase === PhaseStatus.UNAVAILABLE ||
      phase === PhaseStatus.DEGRADED ||
      (phase === PhaseStatus.PENDING &&
        (resourceType === PhaseResourceType.MODEL ||
          resourceType === PhaseResourceType.EXTERNAL_MODEL))) &&
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
    case PhaseResourceType.EXTERNAL_MODEL:
      return getAlertContentForExternalModel(phase);
    case PhaseResourceType.EXTERNAL_PROVIDER:
      return getAlertContentForExternalProvider(phase);
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
          'At least one of the models referenced in this policy is unavailable, or authorization is not fully enforced.',
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

const getAlertContentForExternalModel = (
  phase: string,
): { title: string; children: string } | undefined => {
  switch (phase) {
    case PhaseStatus.PENDING:
      return { title: 'Pending', children: 'External model setup is in progress.' };
    case PhaseStatus.FAILED:
      return {
        title: 'External model setup failed',
        children: 'The external model could not be configured.',
      };
    case PhaseStatus.INVALID:
      return {
        title: 'Invalid external model configuration',
        children:
          'The external model configuration is invalid or missing required fields. Edit the external model and ensure its configuration is correct.',
      };
    default:
      return undefined;
  }
};

const getAlertContentForExternalProvider = (
  phase: string,
): { title: string; children: string } | undefined => {
  switch (phase) {
    case PhaseStatus.PENDING:
      return { title: 'Pending', children: 'External provider setup is in progress.' };
    case PhaseStatus.FAILED:
      return {
        title: 'External provider setup failed',
        children: 'The external provider could not be configured.',
      };
    case PhaseStatus.INVALID:
      return {
        title: 'Invalid external provider configuration',
        children:
          'The external provider configuration is invalid or missing required fields. Edit the external provider and ensure its configuration is correct.',
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
    case PhaseStatus.INVALID:
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
