import type { HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import type { TopologyType } from '../types';

type TrackEvent = HostApiCoreServices['trackEvent'];

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

export enum LlmAcceleratorConfigTrackingEvent {
  CREATED = 'Model Serving LLM Accelerator Config Created',
  UPDATED = 'Model Serving LLM Accelerator Config Updated',
  DELETED = 'Model Serving LLM Accelerator Config Deleted',
  ENABLEMENT_CHANGED = 'Model Serving LLM Accelerator Config Enablement Changed',
}

export type LlmAcceleratorConfigCreatedProperties = FormTrackingEventProperties & {
  /** Form mode; 'create' is also accepted for callers without an Add form. */
  mode: 'add' | 'create' | 'duplicate' | 'install';
};

export type LlmAcceleratorConfigEnablementChangedProperties = FormTrackingEventProperties & {
  /** The actual enabled state after the toggle attempt (reverts to the prior state on failure). */
  enabled: boolean;
};

export const fireLlmAcceleratorConfigCreated = (
  trackEvent: TrackEvent,
  properties: LlmAcceleratorConfigCreatedProperties,
): void => {
  const { mode, ...outcomeProperties } = properties;
  trackEvent(LlmAcceleratorConfigTrackingEvent.CREATED, {
    ...outcomeProperties,
    mode: mode === 'duplicate' ? 'duplicate' : 'create',
    ...(mode === 'install' && { source: 'install' }),
  });
};

export const fireLlmAcceleratorConfigUpdated = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(LlmAcceleratorConfigTrackingEvent.UPDATED, properties);
};

export const fireLlmAcceleratorConfigDeleted = (
  trackEvent: TrackEvent,
  properties: FormTrackingEventProperties,
): void => {
  trackEvent(LlmAcceleratorConfigTrackingEvent.DELETED, properties);
};

export const fireLlmAcceleratorConfigEnablementChanged = (
  trackEvent: TrackEvent,
  properties: LlmAcceleratorConfigEnablementChangedProperties,
): void => {
  trackEvent(LlmAcceleratorConfigTrackingEvent.ENABLEMENT_CHANGED, properties);
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
