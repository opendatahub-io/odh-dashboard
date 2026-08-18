import type { TrackEventFn } from './modelServingTrackingConstants';
import { resolveWellKnownModelCapability } from '../modelCapabilities';

export enum ModelCapabilitiesEvent {
  CAPABILITY_ADDED = 'Deployment Capability Added',
  CAPABILITY_REMOVED = 'Deployment Capability Removed',
  CAPABILITY_MENU_OPENED = 'Deployment Capability Menu Opened',
}

export type CapabilityAddedProperties = {
  capabilityName: string;
  isSuggested: boolean;
};

export type CapabilityRemovedProperties = {
  capabilityName: string;
  isSuggested: boolean;
};

export type CapabilityMenuOpenedProperties = {
  countOfExistingCapabilities: number;
};

export type ModelDeployedCapabilityProperties = {
  countOfCapabilities: number;
  countOfSuggestedCapabilities: number;
  countOfCustomCapabilities: number;
};

export const fireCapabilityAdded = (
  trackEvent: TrackEventFn,
  properties: CapabilityAddedProperties,
): void => {
  trackEvent(ModelCapabilitiesEvent.CAPABILITY_ADDED, properties);
};

export const fireCapabilityRemoved = (
  trackEvent: TrackEventFn,
  properties: CapabilityRemovedProperties,
): void => {
  trackEvent(ModelCapabilitiesEvent.CAPABILITY_REMOVED, properties);
};

export const fireCapabilityMenuOpened = (
  trackEvent: TrackEventFn,
  properties: CapabilityMenuOpenedProperties,
): void => {
  trackEvent(ModelCapabilitiesEvent.CAPABILITY_MENU_OPENED, properties);
};

export const getCapabilityCounts = (capabilities: string[]): ModelDeployedCapabilityProperties => {
  const countOfSuggestedCapabilities = capabilities.filter(
    (cap) => resolveWellKnownModelCapability(cap) != null,
  ).length;
  return {
    countOfCapabilities: capabilities.length,
    countOfSuggestedCapabilities,
    countOfCustomCapabilities: capabilities.length - countOfSuggestedCapabilities,
  };
};
