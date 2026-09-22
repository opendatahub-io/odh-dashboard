import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
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

export const fireTopologyTypeSelected = (properties: TopologyTypeSelectedProperties): void => {
  fireMiscTrackingEvent(LlmdTrackingEvent.TOPOLOGY_TYPE_SELECTED, properties);
};

export const fireRoutingSelected = (properties: RoutingSelectedProperties): void => {
  fireMiscTrackingEvent(LlmdTrackingEvent.ROUTING_SELECTED, properties);
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
  /** Whether the config was created from scratch or duplicated from an existing one. */
  mode: 'create' | 'duplicate';
};

export type LlmAcceleratorConfigEnablementChangedProperties = FormTrackingEventProperties & {
  /** The actual enabled state after the toggle attempt (reverts to the prior state on failure). */
  enabled: boolean;
};

export const fireLlmAcceleratorConfigCreated = (
  properties: LlmAcceleratorConfigCreatedProperties,
): void => {
  fireFormTrackingEvent(LlmAcceleratorConfigTrackingEvent.CREATED, properties);
};

export const fireLlmAcceleratorConfigUpdated = (properties: FormTrackingEventProperties): void => {
  fireFormTrackingEvent(LlmAcceleratorConfigTrackingEvent.UPDATED, properties);
};

export const fireLlmAcceleratorConfigDeleted = (properties: FormTrackingEventProperties): void => {
  fireFormTrackingEvent(LlmAcceleratorConfigTrackingEvent.DELETED, properties);
};

export const fireLlmAcceleratorConfigEnablementChanged = (
  properties: LlmAcceleratorConfigEnablementChangedProperties,
): void => {
  fireFormTrackingEvent(LlmAcceleratorConfigTrackingEvent.ENABLEMENT_CHANGED, properties);
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

export const fireTopologyConfigCreated = (properties: TopologyConfigCreatedProperties): void => {
  fireFormTrackingEvent(TopologyConfigTrackingEvent.CREATED, properties);
};

export const fireTopologyConfigUpdated = (properties: TopologyConfigUpdatedProperties): void => {
  fireFormTrackingEvent(TopologyConfigTrackingEvent.UPDATED, properties);
};

export const fireTopologyConfigDeleted = (properties: FormTrackingEventProperties): void => {
  fireFormTrackingEvent(TopologyConfigTrackingEvent.DELETED, properties);
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

export const fireRoutingConfigCreated = (properties: RoutingConfigCreatedProperties): void => {
  fireFormTrackingEvent(RoutingConfigTrackingEvent.CREATED, properties);
};

export const fireRoutingConfigUpdated = (properties: RoutingConfigUpdatedProperties): void => {
  fireFormTrackingEvent(RoutingConfigTrackingEvent.UPDATED, properties);
};

export const fireRoutingConfigDeleted = (properties: FormTrackingEventProperties): void => {
  fireFormTrackingEvent(RoutingConfigTrackingEvent.DELETED, properties);
};
