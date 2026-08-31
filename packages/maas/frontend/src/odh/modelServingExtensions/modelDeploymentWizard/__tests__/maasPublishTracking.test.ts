import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
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

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('maasPublishTracking', () => {
  beforeEach(() => {
    resetMaaSPublishTrackingSession();
    mockFireFormTrackingEvent.mockClear();
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
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalled();
    });

    it('should fire submit success with session and override values', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE);
      updateMaaSPublishTrackingSession(false);

      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true, {
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });

      expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.submit,
        success: true,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });
    });

    it('should fire only once per session', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      fireMaaSPublishTrackingEvent(TrackingOutcome.cancel, false);

      expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('endMaaSPublishTrackingSession', () => {
    it('should fire cancel when leaving the wizard without a prior event', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE);
      updateMaaSPublishTrackingSession(true);

      endMaaSPublishTrackingSession(true);

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.cancel,
        success: false,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.CREATE,
      });
    });

    it('should fire submit failure when leaving after a failed deploy attempt', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.EDIT);
      updateMaaSPublishTrackingSession(true);
      markMaaSPublishSubmitAttempted();

      endMaaSPublishTrackingSession(true);

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(MaaSEvents.MODEL_AS_MAAS_PUBLISHED, {
        outcome: TrackingOutcome.submit,
        success: false,
        source: PublishedAsMaasSource.MODEL_DEPLOYMENT_WIZARD,
        addedAsMaas: true,
        mode: ModelDeploymentMode.EDIT,
      });
    });

    it('should not fire when the field becomes inactive while still on the wizard', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE);
      endMaaSPublishTrackingSession(false);
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalled();
    });

    it('should not fire cancel after a successful submit', () => {
      startMaaSPublishTrackingSession(ModelDeploymentMode.CREATE);
      fireMaaSPublishTrackingEvent(TrackingOutcome.submit, true);
      mockFireFormTrackingEvent.mockClear();

      endMaaSPublishTrackingSession(true);

      expect(mockFireFormTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
