import { ModelServingTrackingEvent, type TrackEventFn } from './modelServingTrackingConstants';
import { resolveWellKnownModelCapability } from '../modelCapabilities';

export type CapabilityChangedProperties = {
  capabilityName: string;
  isSuggested: boolean;
};

export type CapabilityMenuOpenedProperties = {
  countOfExistingCapabilities: number;
};

export type ModelDeployedCapabilityProperties = {
  countOfSuggestedCapabilities: number;
  countOfCustomCapabilities: number;
};

export const toCapabilityEventProps = (capability: string): CapabilityChangedProperties => {
  const isSuggested = resolveWellKnownModelCapability(capability) != null;
  return {
    capabilityName: isSuggested ? capability : 'custom',
    isSuggested,
  };
};

export const fireCapabilityAdded = (
  trackEvent: TrackEventFn,
  properties: CapabilityChangedProperties,
): void => {
  trackEvent(ModelServingTrackingEvent.CAPABILITY_ADDED, properties);
};

export const fireCapabilityRemoved = (
  trackEvent: TrackEventFn,
  properties: CapabilityChangedProperties,
): void => {
  trackEvent(ModelServingTrackingEvent.CAPABILITY_REMOVED, properties);
};

export const fireCapabilityMenuOpened = (
  trackEvent: TrackEventFn,
  properties: CapabilityMenuOpenedProperties,
): void => {
  trackEvent(ModelServingTrackingEvent.CAPABILITY_MENU_OPENED, properties);
};

export const getCapabilityCounts = (capabilities: string[]): ModelDeployedCapabilityProperties => {
  const countOfSuggestedCapabilities = capabilities.filter(
    (cap) => resolveWellKnownModelCapability(cap) != null,
  ).length;
  return {
    countOfSuggestedCapabilities,
    countOfCustomCapabilities: capabilities.length - countOfSuggestedCapabilities,
  };
};
