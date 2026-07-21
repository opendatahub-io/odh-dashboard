import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { PhaseLabelLocation, PhaseStatus } from '~/app/utilities/phaseLabelUtils';

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
