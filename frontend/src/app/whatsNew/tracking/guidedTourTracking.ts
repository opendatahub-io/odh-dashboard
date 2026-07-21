import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

/** Event names from the Guided Tour Amplitude tracking plan. */
export const GUIDED_TOUR_EVENTS = {
  STARTED: 'Guided Tour Started',
  PATH_SELECTED: 'Guided Tour Path Selected',
  COMPLETED: 'Guided Tour Completed',
  LEARN_MORE_CLICKED: 'Guided Tour Learn More Clicked',
  SUMMARY_DOCS_CLICKED: 'Documentation Link Clicked in Summary',
  DISMISSED: 'Guided Tour Dismissed',
} as const;

export const TOUR_VERSION = '3.5';

/** Bump with TOUR_VERSION each release so first-visit auto-launch resets. */
export const TOUR_SEEN_STORAGE_KEY = `odh-whats-new-${TOUR_VERSION}-seen`;

export type GuidedTourEntryPoint = 'auto-launch' | 'masthead' | 'home-task-assistant';
export type GuidedTourPath = 'full' | 'new-features-only';
export type GuidedTourDismissMethod = 'skip_button' | 'modal_close' | 'popover_close';
export type GuidedTourPresentationType = 'modal' | 'popover';

const getTourVariant = (isAdmin: boolean): 'admin' | 'non-admin' =>
  isAdmin ? 'admin' : 'non-admin';

const getRoleType = (isAdmin: boolean): string => (isAdmin ? 'AI Admin' : 'Data Scientist');

/** Shared fields on every guided-tour form event. */
const formSessionProps = (isAdmin: boolean, entryPoint: GuidedTourEntryPoint) => ({
  tourVersion: TOUR_VERSION,
  tourVariant: getTourVariant(isAdmin),
  entryPoint,
});

/** Form event — tour session becomes active. */
export const trackGuidedTourStarted = (
  entryPoint: GuidedTourEntryPoint,
  isAdmin: boolean,
  isReturningUser: boolean,
): void => {
  fireFormTrackingEvent(GUIDED_TOUR_EVENTS.STARTED, {
    outcome: TrackingOutcome.submit,
    success: true,
    ...formSessionProps(isAdmin, entryPoint),
    isReturningUser,
    roleType: getRoleType(isAdmin),
  });
};

/** Form event — user chose full vs new-features-only path. */
export const trackGuidedTourPathSelected = (
  tourPath: GuidedTourPath,
  entryPoint: GuidedTourEntryPoint,
  isAdmin: boolean,
): void => {
  fireFormTrackingEvent(GUIDED_TOUR_EVENTS.PATH_SELECTED, {
    outcome: TrackingOutcome.submit,
    success: true,
    ...formSessionProps(isAdmin, entryPoint),
    tourPath,
  });
};

/** Form event — user finished the tour via summary Close. */
export const trackGuidedTourCompleted = (args: {
  tourPath: GuidedTourPath;
  entryPoint: GuidedTourEntryPoint;
  isAdmin: boolean;
  stepsViewed: number;
  totalSteps: number;
  hadUnavailableFeatures: boolean;
}): void => {
  fireFormTrackingEvent(GUIDED_TOUR_EVENTS.COMPLETED, {
    outcome: TrackingOutcome.submit,
    success: true,
    ...formSessionProps(args.isAdmin, args.entryPoint),
    tourPath: args.tourPath,
    stepsViewed: args.stepsViewed,
    totalSteps: args.totalSteps,
    hadUnavailableFeatures: args.hadUnavailableFeatures,
  });
};

/** Form event — user exited before completion. */
export const trackGuidedTourDismissed = (args: {
  entryPoint: GuidedTourEntryPoint;
  isAdmin: boolean;
  tourPath?: GuidedTourPath;
  dismissStepId: string;
  dismissStepIndex: number;
  dismissMethod: GuidedTourDismissMethod;
  stepsViewed: number;
  totalSteps: number;
}): void => {
  fireFormTrackingEvent(GUIDED_TOUR_EVENTS.DISMISSED, {
    outcome: TrackingOutcome.cancel,
    ...formSessionProps(args.isAdmin, args.entryPoint),
    ...(args.tourPath ? { tourPath: args.tourPath } : {}),
    dismissStepId: args.dismissStepId,
    dismissStepIndex: args.dismissStepIndex,
    dismissMethod: args.dismissMethod,
    stepsViewed: args.stepsViewed,
    totalSteps: args.totalSteps,
  });
};

/**
 * Learn more on a tour step.
 * Uses misc (not link) because LinkTrackingEventProperties cannot carry the
 * Amplitude plan fields (stepId, destinationUrl, tourPath, presentationType).
 */
export const trackGuidedTourLearnMoreClicked = (args: {
  stepId: string;
  destinationUrl: string;
  tourPath: GuidedTourPath;
  presentationType: GuidedTourPresentationType;
}): void => {
  fireMiscTrackingEvent(GUIDED_TOUR_EVENTS.LEARN_MORE_CLICKED, {
    stepId: args.stepId,
    destinationUrl: args.destinationUrl,
    tourPath: args.tourPath,
    presentationType: args.presentationType,
  });
};

/**
 * Documentation link on the summary step.
 * Uses misc for the same reason as Learn More — plan fields do not fit the link schema.
 */
export const trackGuidedTourSummaryDocsClicked = (args: {
  destinationUrl: string;
  tourPath: GuidedTourPath;
}): void => {
  fireMiscTrackingEvent(GUIDED_TOUR_EVENTS.SUMMARY_DOCS_CLICKED, {
    linkType: 'documentation',
    destinationUrl: args.destinationUrl,
    tourPath: args.tourPath,
  });
};
