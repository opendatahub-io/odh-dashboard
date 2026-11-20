import type { TrackEvent } from '@odh-dashboard/analytics/types';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  MaaSEvents,
  ModelDeploymentMode,
  type ModelAsMaasPublishedProperties,
  PublishedAsMaasSource,
} from '~/app/types/event-tracking';

const DEPLOYMENT_WIZARD_PATH = '/ai-hub/models/deployments/deploy';

type MaaSPublishTrackingSession = {
  addedAsMaas: boolean;
  mode: ModelDeploymentMode;
  completed: boolean;
  submitAttempted: boolean;
  trackEvent: TrackEvent;
};

let session: MaaSPublishTrackingSession | null = null;

export const isDeploymentWizardPath = (pathname: string): boolean =>
  pathname.includes(DEPLOYMENT_WIZARD_PATH);

const noopTrackEvent: TrackEvent = () => undefined;

export const startMaaSPublishTrackingSession = (
  mode: ModelDeploymentMode,
  trackEvent: TrackEvent,
): void => {
  if (!session) {
    session = {
      addedAsMaas: false,
      mode,
      completed: false,
      submitAttempted: false,
      trackEvent,
    };
  } else {
    // Repeated start updates mode and callback without resetting completion state.
    session.mode = mode;
    session.trackEvent = trackEvent;
  }
};

export const updateMaaSPublishTrackingSession = (addedAsMaas: boolean): void => {
  if (session) {
    session.addedAsMaas = addedAsMaas;
  }
};

export const markMaaSPublishSubmitAttempted = (): void => {
  if (session) {
    session.submitAttempted = true;
  }
};

const buildProperties = (
  outcome: TrackingOutcome,
  success: boolean,
  overrides?: Partial<Pick<ModelAsMaasPublishedProperties, 'addedAsMaas' | 'mode'>>,
): ModelAsMaasPublishedProperties | undefined => {
  if (!session || session.completed) {
    return undefined;
  }
  return {
    outcome,
    success,
    source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
    addedAsMaas: overrides?.addedAsMaas ?? session.addedAsMaas,
    mode: overrides?.mode ?? session.mode,
  };
};

/**
 * Fires the Model as Maas Published event once per wizard session when the
 * Subscribed users field is active. Uses the callback stored in the active
 * session; with no session or an already-completed session, emits nothing.
 */
export const fireMaaSPublishTrackingEvent = (
  outcome: TrackingOutcome,
  success: boolean,
  overrides?: Partial<Pick<ModelAsMaasPublishedProperties, 'addedAsMaas' | 'mode'>>,
): void => {
  const properties = buildProperties(outcome, success, overrides);
  if (!properties) {
    return;
  }
  const trackEvent = session?.trackEvent ?? noopTrackEvent;
  session = session ? { ...session, completed: true } : null;
  trackEvent(
    MaaSEvents.MODEL_AS_MAAS_PUBLISHED,
    properties satisfies ModelAsMaasPublishedProperties,
  );
};

/**
 * Ends the tracking session. When leaving the deployment wizard without a prior
 * event: fires submit/error if a deploy was attempted, otherwise cancel. When the
 * field only becomes inactive while still on the wizard route, clears without firing.
 */
export const endMaaSPublishTrackingSession = (leftWizard: boolean): void => {
  if (leftWizard && session && !session.completed) {
    if (session.submitAttempted) {
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, false);
    } else {
      fireMaaSPublishTrackingEvent(TrackingOutcome.cancel, false);
    }
  }
  session = null;
};

/** Test-only: reset module session between tests. */
export const resetMaaSPublishTrackingSession = (): void => {
  session = null;
};
