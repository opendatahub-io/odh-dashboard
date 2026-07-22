import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

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
