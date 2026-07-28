import * as React from 'react';
import type { FormTrackingEventProperties, LinkTrackingEventProperties, SimpleTrackingEventProperties } from './trackingTypes';
export type UserInteractionAPI = {
    trackFormEvent: (eventName: string, properties: FormTrackingEventProperties) => void;
    trackLinkEvent: (eventName: string, properties: LinkTrackingEventProperties) => void;
    trackSimpleEvent: (eventName: string, properties?: SimpleTrackingEventProperties) => void;
    trackPageEvent: () => void;
};
export declare const UserInteractionContext: React.Context<UserInteractionAPI>;
