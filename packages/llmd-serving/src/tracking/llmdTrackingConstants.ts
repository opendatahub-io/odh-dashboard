import type { TrackEvent, FormTrackingEventProperties } from '@odh-dashboard/analytics/types';
import type { TopologyType } from '../types';

export enum LlmdTrackingEvent {
  TOPOLOGY_TYPE_SELECTED = 'Model Serving LLM-D Topology Type Selected',
  ROUTING_SELECTED = 'Model Serving LLM-D Routing Selected',
}

export type TopologyTypeSelectedProperties = {
  llmdComposablePattern: string;
  previousPattern?: string;
};

export type RoutingSelectedProperties = {
  routingConfigurationId: string;
  isDefaultRouting: boolean;
};

export const fireTopologyTypeSelected = (
  trackEvent: TrackEvent,
  properties: TopologyTypeSelectedProperties,
): void => {
  trackEvent(LlmdTrackingEvent.TOPOLOGY_TYPE_SELECTED, properties);
};

export const fireRoutingSelected = (
  trackEvent: TrackEvent,
  properties: RoutingSelectedProperties,
): void => {
  trackEvent(LlmdTrackingEvent.ROUTING_SELECTED, properties);
};

// --- Admin settings CRUD tracking (Model deployment settings tabs) ---

/** Where a config form was seeded from when created. */
export type ConfigSource = 'template' | 'editor';

export enum LlmInferenceServiceConfigTrackingEvent {
  CREATED = 'Model Serving LLM Inference Service Config Created',
  UPDATED = 'Model Serving LLM Inference Service Config Updated',
  DELETED = 'Model Serving LLM Inference Service Config Deleted',
  ENABLEMENT_CHANGED = 'Model Serving LLM Inference Service Config Enablement Changed',
}

export type LlmInferenceServiceConfigCreatedProperties = FormTrackingEventProperties & {
  /** Form mode; 'create' is also accepted for callers without an Add form. */
  mode: 'add' | 'create' | 'duplicate' | 'install';
};

export type LlmInferenceServiceConfigEnablementChangedProperties = FormTrackingEventProperties & {
  /** The actual enabled state after the toggle attempt (reverts to the prior state on failure). */
  enabled: boolean;
};

export const fireLlmInferenceServiceConfigCreated = (
  trackEvent: TrackEvent,
  properties: LlmInferenceServiceConfigCreatedProperties,
): void => {
  const { mode, ...outcomeProperties } = properties;
  trackEvent(LlmInferenceServiceConfigTrackingEvent.CREATED, {
    ...outcomeProperties,
    mode: mode === 'duplicate' ? 'duplicate' : 'create',
    ...(mode === 'install' && { source: 'install' }),
  });
};

export const fireLlmInferenceServiceConfigUpdated = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(LlmInferenceServiceConfigTrackingEvent.UPDATED, properties);
};

export const fireLlmInferenceServiceConfigDeleted = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(LlmInferenceServiceConfigTrackingEvent.DELETED, properties);
};

export const fireLlmInferenceServiceConfigEnablementChanged = (
  trackEvent: TrackEvent,
  properties: LlmInferenceServiceConfigEnablementChangedProperties,
): void => {
  trackEvent(LlmInferenceServiceConfigTrackingEvent.ENABLEMENT_CHANGED, properties);
};

export enum TopologyConfigTrackingEvent {
  CREATED = 'Model Serving LLM-D Topology Config Created',
  UPDATED = 'Model Serving LLM-D Topology Config Updated',
  DELETED = 'Model Serving LLM-D Topology Config Deleted',
}

export type TopologyConfigCreatedProperties = FormTrackingEventProperties & {
  mode: 'create' | 'duplicate';
  configSource?: ConfigSource;
  topologyType?: TopologyType;
};

export type TopologyConfigUpdatedProperties = FormTrackingEventProperties & {
  topologyType?: TopologyType;
};

export const fireTopologyConfigCreated = (
  trackEvent: TrackEvent,
  properties: TopologyConfigCreatedProperties,
): void => {
  trackEvent(TopologyConfigTrackingEvent.CREATED, properties);
};

export const fireTopologyConfigUpdated = (
  trackEvent: TrackEvent,
  properties: TopologyConfigUpdatedProperties,
): void => {
  trackEvent(TopologyConfigTrackingEvent.UPDATED, properties);
};

export const fireTopologyConfigDeleted = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(TopologyConfigTrackingEvent.DELETED, properties);
};

export enum RoutingConfigTrackingEvent {
  CREATED = 'Model Serving LLM-D Routing Config Created',
  UPDATED = 'Model Serving LLM-D Routing Config Updated',
  DELETED = 'Model Serving LLM-D Routing Config Deleted',
}

export type RoutingConfigCreatedProperties = FormTrackingEventProperties & {
  mode: 'create' | 'duplicate';
  configSource?: ConfigSource;
  topologyType?: TopologyType;
};

export type RoutingConfigUpdatedProperties = FormTrackingEventProperties & {
  topologyType?: TopologyType;
};

export const fireRoutingConfigCreated = (
  trackEvent: TrackEvent,
  properties: RoutingConfigCreatedProperties,
): void => {
  trackEvent(RoutingConfigTrackingEvent.CREATED, properties);
};

export const fireRoutingConfigUpdated = (
  trackEvent: TrackEvent,
  properties: RoutingConfigUpdatedProperties,
): void => {
  trackEvent(RoutingConfigTrackingEvent.UPDATED, properties);
};

export const fireRoutingConfigDeleted = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(RoutingConfigTrackingEvent.DELETED, properties);
};
