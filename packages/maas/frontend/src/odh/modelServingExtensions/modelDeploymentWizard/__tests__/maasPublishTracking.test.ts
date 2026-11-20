import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { MaaSEvents, ModelDeploymentMode, PublishedAsMaasSource } from '~/app/types/event-tracking';
import {
  endMaaSPublishTrackingSession,
  fireMaaSPublishTrackingEvent,
  isDeploymentWizardPath,
  markMaaSPublishSubmitAttempted,
  resetMaaSPublishTrackingSession,
  startMaaSPublishTrackingSession,
  updateMaaSPublishTrackingSession,
} from '~/odh/modelServingExtensions/modelDeploymentWizard/maasPublishTracking';

describe('maasPublishTracking', () => {
  let trackEvent: jest.Mock;

  beforeEach(() => {
    resetMaaSPublishTrackingSession();
    trackEvent = jest.fn();
  });

  describe('isDeploymentWizardPath', () => {
    it('should return true for the deploy wizard path', () => {
      expect(isDeploymentWizardPath('/ai-hub/models/deployments/deploy')).toBe(true);
      expect(isDeploymentWizardPath('/ai-hub/models/deployments/deploy/extra')).toBe(true);
    });

    it('should return false for non-wizard paths', () => {
      expect(isDeploymentWizardPath('/ai-hub/models/deployments')).toBe(false);
      expect(isDeploymentWizardPath('/ai-hub/models/deployments/test-project')).toBe(false);
    });
  });

  describe('fireMaaSPublishTrackingEvent', () => {
    it('should not fire when no session is active', () => {
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('should emit nothing without a session even though deployment hooks call it', () => {
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, false, { addedAsMaas: true });
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('should fire submit success with session and override values', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      updateMaaSPublishTrackingSession(false);

      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true, {
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.submit,
        success: true,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });
    });

    it('should fire only once per session', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      fireMaaSPublishTrackingEvent(TrackingOutcome.cancel, false);

      expect(trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('startMaaSPublishTrackingSession', () => {
    it('should update mode and callback without resetting state on repeated start', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      updateMaaSPublishTrackingSession(true);
      markMaaSPublishSubmitAttempted();

      const replacement = jest.fn();
      startMaaSPublishTrackingSession(ModelDeploymentMode.EDIT, replacement);

      // The replacement callback receives the pending session's preserved state.
      endMaaSPublishTrackingSession(true);
      expect(trackEvent).not.toHaveBeenCalled();
      expect(replacement).toHaveBeenCalledTimes(1);
      expect(replacement).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.submit,
        success: false,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });
    });

    it('should not re-open completion after the event fired', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      expect(trackEvent).toHaveBeenCalledTimes(1);

      const replacement = jest.fn();
      startMaaSPublishTrackingSession(ModelDeploymentMode.EDIT, replacement);
      endMaaSPublishTrackingSession(true);
      expect(replacement).not.toHaveBeenCalled();
    });
  });

  describe('endMaaSPublishTrackingSession', () => {
    it('should fire cancel when leaving the wizard without a prior event', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      updateMaaSPublishTrackingSession(true);

      endMaaSPublishTrackingSession(true);

      expect(trackEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.cancel,
        success: false,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.CREATE,
      });
    });

    it('should fire submit failure when leaving after a failed deploy attempt', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.EDIT, trackEvent);
      updateMaaSPublishTrackingSession(true);
      markMaaSPublishSubmitAttempted();

      endMaaSPublishTrackingSession(true);

      expect(trackEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.submit,
        success: false,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });
    });

    it('should not fire when the field becomes inactive while still on the wizard', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      endMaaSPublishTrackingSession(false);
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('should not fire cancel after a successful submit', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE, trackEvent);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      trackEvent.mockClear();

      endMaaSPublishTrackingSession(true);

      expect(trackEvent).not.toHaveBeenCalled();
    });
  });
});
