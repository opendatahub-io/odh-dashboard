import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { PhaseLabelLocation, PhaseStatus } from '~/app/utilities/phaseLabelUtils';
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
};

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
  status: PhaseStatus;
  location: PhaseLabelLocation;
};

export enum EventTrackingPopoverType {
  STATUS = 'status',
  WARNING = 'warning',
}

export enum EventTrackingResourceType {
  SUBSCRIPTION = 'subscription',
  AUTHPOLICY = 'authPolicy',
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
