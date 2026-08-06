import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  PhaseLabelLocation,
  PhaseResourceType,
  PhaseStatus,
  normalizePhase,
} from '~/app/utilities/phaseLabelUtils';
import { ExternalModelsFilterOptions } from '~/app/pages/external-models/const';

export const MaaSEvents = {
  MAAS_RESOURCE_DELETED: 'MaaS Settings Resource Deleted',
  MAAS_RESOURCE_DETAILS_VIEWED: 'MaaS Settings Details Viewed',
  MAAS_SETTINGS_LIST_FILTERED: 'MaaS Settings List Filtered',
  MAAS_SETTINGS_LIST_ROW_EXPANDED: 'MaaS Settings List Row Expanded',
  SUBSCRIPTION_MANAGEMENT_OVERVIEW_FILTERED: 'Subscription Management Overview Filtered',
  SUBSCRIPTION_MANAGEMENT_OVERVIEW_ROW_EXPANDED: 'Subscription Management Overview Row Expanded',
  SUBSCRIPTION_MANAGEMENT_GROUP_LABEL_SELECTED: 'Subscription Management Group Label Selected',
  SUBSCRIPTION_MANAGEMENT_STATUS_POPOVER_VIEWED: 'Subscription Management Status Popover Viewed',
  SUBSCRIPTION_MANAGEMENT_YAML_VIEWED: 'Subscription Management YAML Viewed',
  SUBSCRIPTION_MANAGEMENT_YAML_EXPORTED: 'Subscription Management YAML Exported',
  EXTERNAL_MODELS_LIST_FILTERS: 'External Models List Filtered',
  EXTERNAL_MODEL_ROW_EXPANDED: 'External Model Row Expanded',
  EXTERNAL_MODELS_PROVIDER_LABELS_EXPANDED: 'External Models Provider Labels Expanded',
  EXTERNAL_MODELS_INFO_POPOVER_VIEWED: 'External Models Info Popover Viewed',
  EXTERNAL_MODEL_PROVIDER_DETAIL_VIEWED: 'External Model Provider Detail Viewed',
  SUBSCRIPTION_CREATED: 'Subscription Created',
  SUBSCRIPTION_UPDATED: 'Subscription Updated',
  SUBSCRIPTION_TOKEN_LIMITS_CONFIGURED: 'Subscription Token Limits Configured',
  AUTH_POLICY_CREATED: 'Auth Policy Created',
  AUTH_POLICY_UPDATED: 'Auth Policy Updated',
  MODEL_AS_MAAS_PUBLISHED: 'Model as Maas Published',
};

export type ModelAsMaasPublishedProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  source: PublishedAsMaasSource;
  addedAsMaas: boolean;
  mode: ModelDeploymentMode;
};

export enum PublishedAsMaasSource {
  MODEL_DEPLOYMENT_WIZARD = 'deployment_wizard',
}

export enum ModelDeploymentMode {
  CREATE = 'create',
  EDIT = 'edit',
}

export type AuthPolicyUpdatedSuccessProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  groupCount: number;
  modelCount: number;
  hasDescription: boolean;
  hasMatchingSubscription: boolean;
  editSource: EventTrackingEditSource;
};

export type AuthPolicyUpdatedErrorProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  error: string;
  editSource: EventTrackingEditSource;
};

export type AuthPolicyUpdatedCancelProperties = {
  outcome: TrackingOutcome;
  editSource: EventTrackingEditSource;
};

export type AuthPolicyCreatedSuccessProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  groupCount: number;
  modelCount: number;
  modelCountAvailable: number;
  hasDescription: boolean;
  hasMatchingSubscription: boolean;
  prefillSource: EventTrackingPrefillSource;
};

export type AuthPolicyCreatedErrorProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  error: string;
};

export type AuthPolicyCreatedCancelProperties = {
  outcome: TrackingOutcome;
};

export type SubscriptionCreatedSuccessProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  groupCount: number;
  modelCount: number;
  modelCountAvailable: number;
  hasDescription: boolean;
  hasMatchingPolicy: boolean;
  priority: number;
  prefillSource: EventTrackingPrefillSource;
};

export type SubscriptionCreatedErrorProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  error: string;
};

export type SubscriptionCreatedCancelProperties = {
  outcome: TrackingOutcome;
  modelCount: number;
  modelCountWoLimit: number;
};
export type SubscriptionUpdatedSuccessProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  groupCount: number;
  modelCount: number;
  hasDescription: boolean;
  hasMatchingPolicy: boolean;
  priority: number;
  editSource: EventTrackingEditSource;
};

export type SubscriptionUpdatedErrorProperties = {
  outcome: TrackingOutcome;
  success: boolean;
  error: string;
  editSource: EventTrackingEditSource;
};

export type SubscriptionUpdatedCancelProperties = {
  outcome: TrackingOutcome;
  editSource: EventTrackingEditSource;
};

export type SubscriptionTokenLimitsConfiguredSuccessProperties = {
  outcome: TrackingOutcome;
  limitCount: number;
};

export enum EventTrackingPrefillSource {
  MODEL = 'model',
  GROUP = 'group',
  NONE = 'none',
}

export enum EventTrackingEditSource {
  LIST_KEBAB = 'list-kebab',
  DETAIL_KEBAB = 'detail-kebab',
}

export type MaaSResourceDeletedProperties = {
  resourceType: EventTrackingResourceType;
  source: EventTrackingSource;
  resourceStatus: string;
  outcome: TrackingOutcome;
};

export type MaaSSettingsDetailsViewedProperties = {
  resourceType: EventTrackingResourceType;
  source: EventTrackingSource;
  resourceStatus: string;
};

export type MaaSSettingsListFilteredProperties = {
  resourceType: EventTrackingResourceType;
  filterAttribute: EventTrackingFilterAttribute;
};

export type MaaSSettingsListRowExpandedProperties = {
  resourceType: EventTrackingResourceType;
  expandedSection: EventTrackingExpandedSection;
  resourceStatus: PhaseStatus;
  modelCount: number;
  unavailableModelCount?: number; // Currently unsupported
  groupCount: number;
};

export type SubscriptionManagementYamlViewedProperties = {
  resourceType: EventTrackingResourceType;
  context: EventTrackingContext;
};

export type SubscriptionManagementYamlExportedProperties = {
  resourceType: EventTrackingResourceType;
  context: EventTrackingContext;
  action: EventTrackingYAMLAction;
};

export type SubscriptionManagementOverviewFilteredProperties = {
  filterAttribute: EventTrackingFilterAttribute;
};

export type SubscriptionManagementOverviewRowExpandedProperties = {
  subscriptionCount: number;
  policyCount: number;
};

export type SubscriptionManagementGroupLabelSelectedProperties = {
  subsCountPerModel: number;
  policyCountPerModel: number;
  subsCountWithSelectedGroup: number;
  policyCountWithSelectedGroup: number;
};

export type SubscriptionManagementStatusPopoverViewedProperties = {
  popoverType: EventTrackingPopoverType;
  status: PhaseStatus | 'configuration-warning';
  location: PhaseLabelLocation;
};

export const convertStringToPopoverViewedStatus = (
  status: string | undefined,
): PhaseStatus | 'configuration-warning' => {
  if (status === 'configuration-warning') {
    return 'configuration-warning';
  }

  const normalized = normalizePhase(status);

  switch (normalized) {
    case PhaseStatus.ACTIVE:
      return PhaseStatus.ACTIVE;
    case PhaseStatus.READY:
      return PhaseStatus.READY;
    case PhaseStatus.PENDING:
      return PhaseStatus.PENDING;
    case PhaseStatus.FAILED:
      return PhaseStatus.FAILED;
    case PhaseStatus.INVALID:
      return PhaseStatus.INVALID;
    case PhaseStatus.DEGRADED:
      return PhaseStatus.DEGRADED;
    case PhaseStatus.UNAVAILABLE:
      return PhaseStatus.UNAVAILABLE;
    case PhaseStatus.UNHEALTHY:
      return PhaseStatus.UNHEALTHY;
    case PhaseStatus.UNKNOWN:
      return PhaseStatus.UNKNOWN;
    default:
      return PhaseStatus.UNKNOWN;
  }
};

export enum EventTrackingPopoverType {
  STATUS = 'status',
  WARNING = 'warning',
}

export enum EventTrackingResourceType {
  MODEL = 'model',
  SUBSCRIPTION = 'subscription',
  AUTHPOLICY = 'authPolicy',
  EXTERNAL_MODEL = 'externalModel',
}

export enum EventTrackingSource {
  TAB_LINK = 'tab-link',
  TAB_KEBAB = 'tab-kebab',
  LIST_KEBAB = 'list-kebab',
  OVERVIEW_MODEL = 'overview-model',
  DETAIL_PAGE = 'detail-page',
  DETAIL_KEBAB = 'detail-kebab',
}

export enum EventTrackingExpandedSection {
  GROUPS = 'groups',
  MODELS = 'models',
}

export enum EventTrackingContext {
  CREATE = 'create',
  EDIT = 'edit',
  DETAILS = 'details',
}

export enum EventTrackingYAMLAction {
  COPY = 'copy',
  DOWNLOAD = 'download',
}

export enum EventTrackingFilterAttribute {
  MODEL = 'model',
  GROUP = 'group',
  SUBSCRIPTION = 'subscription',
  POLICY = 'policy',
  STATUS = 'status',
  KEYWORD = 'keyword',
  PROJECT = 'project',
}

export type ExternalModelsListFiltersProperties = {
  filterType: ExternalModelsFilterOptions;
  statusFilters?: string[]; // not supported yet, right now we only have keyword filtering
};

export type ExternalModelRowExpandedProperties = {
  modelStatus: PhaseStatus;
  providerCount: number;
};

export type ExternalModelsProviderLabelsExpandedProperties = {
  visibleProviderCount: number;
};

export type ExternalModelsInfoPopoverViewedProperties = {
  infoTarget: ExternalModelsInfoPopoverTarget;
  location: ExternalModelsInfoPopoverLocation;
};

export type ExternalModelProviderDetailViewedProperties = {
  detailType: ExternalModelProviderDetailType;
  providerType: ExternalModelProviderType;
};

export const enum ExternalModelsInfoPopoverTarget {
  COLUMN_EXTERNAL_PROVIDER = 'column-external-provider',
  COLUMN_STATUS = 'column-status',
  PROVIDER_REFERENCE = 'provider-reference',
  MODEL_REFERENCE = 'model-reference',
  STATUS_LABEL = 'status-label',
  SECONDARY_STATUS = 'secondary-status',
}

export const enum ExternalModelsInfoPopoverLocation {
  TABLE_HEADER = 'table-header',
  EXPANDED_ROW = 'expanded-row',
  TABLE_CELL = 'table-cell',
}

export const enum ExternalModelProviderDetailType {
  PROVIDER_URL = 'provider-url',
  PATH = 'path',
}

const enum ExternalModelProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE = 'azure',
  BEDROCK = 'bedrock',
  VERTEX = 'vertex',
  OTHER = 'other',
}

export const convertPhaseResourceTypeToEventTrackingResourceType = (
  resourceType: string,
): EventTrackingResourceType => {
  switch (resourceType) {
    case PhaseResourceType.SUBSCRIPTION:
      return EventTrackingResourceType.SUBSCRIPTION;
    case PhaseResourceType.AUTHPOLICY:
      return EventTrackingResourceType.AUTHPOLICY;
    case PhaseResourceType.EXTERNAL_MODEL:
      return EventTrackingResourceType.EXTERNAL_MODEL;
    case PhaseResourceType.MODEL:
      return EventTrackingResourceType.MODEL;
    default:
      return EventTrackingResourceType.SUBSCRIPTION;
  }
};
