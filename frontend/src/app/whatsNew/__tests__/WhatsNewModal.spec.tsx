import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DashboardConfigKind } from '@odh-dashboard/k8s-core';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import type { UserState } from '#~/redux/selectors/types';
import { useUser } from '#~/redux/selectors';
import { useAppContext } from '#~/app/AppContext';
import { mockDashboardConfig } from '#~/__mocks__';
import type { BuildStatus } from '#~/types';
import type { StorageClassKind } from '#~/k8sTypes';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '#~/concepts/analyticsTracking/segmentIOUtils';
import WhatsNewModal from '#~/app/whatsNew/WhatsNewModal';
import { GUIDED_TOUR_EVENTS } from '#~/app/whatsNew/tracking/guidedTourTracking';
import { openWhatsNewTour } from '#~/app/whatsNew/whatsNewEvent';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/utilities', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core/utilities'),
  useBrowserStorage: jest.fn(),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const useAppContextMock = jest.mocked(useAppContext);
const useUserMock = jest.mocked(useUser);
const mockUseBrowserStorage = jest.mocked(useBrowserStorage);
const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const mockSetSeen = jest.fn();

const buildAppContext = (configOverrides: Parameters<typeof mockDashboardConfig>[0] = {}) => {
  const dashboardConfig: DashboardConfigKind = mockDashboardConfig(configOverrides);
  return {
    buildStatuses: [] as BuildStatus[],
    dashboardConfig,
    storageClasses: [] as StorageClassKind[],
    isRHOAI: true,
    refreshDashboardConfig: jest.fn(),
  };
};

const adminUser: UserState = {
  username: 'admin-user',
  userID: '1',
  isAdmin: true,
  isAllowed: true,
  userLoading: false,
  userError: null,
};

const regularUser: UserState = {
  username: 'regular-user',
  userID: '2',
  isAdmin: false,
  isAllowed: true,
  userLoading: false,
  userError: null,
};

const openWelcomeModal = () => {
  act(() => {
    jest.advanceTimersByTime(1500);
  });
};

const startTourAndWait = (buttonText: string) => {
  fireEvent.click(screen.getByText(buttonText));
  act(() => {
    jest.advanceTimersByTime(200);
  });
};

describe('WhatsNewModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseBrowserStorage.mockReturnValue([false, mockSetSeen]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('seen state', () => {
    it('should not render when already seen', () => {
      mockUseBrowserStorage.mockReturnValue([true, mockSetSeen]);
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();

      expect(screen.queryByTestId('whats-new-modal')).not.toBeInTheDocument();
    });

    it('should mark as seen when user clicks Skip tour', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();

      fireEvent.click(screen.getByText('Close'));

      expect(mockSetSeen).toHaveBeenCalledWith(true);
    });
  });

  describe('admin vs non-admin tour steps', () => {
    it('should include Settings step for admin users (6 total)', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      expect(screen.getByText(/of 6/)).toBeInTheDocument();
    });

    it('should exclude Settings step for non-admin users (5 total)', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      expect(screen.getByText(/of 5/)).toBeInTheDocument();
    });
  });

  describe('role-aware messaging for unavailable features', () => {
    const unavailableFeatureConfig = {
      genAiStudio: true,
      autorag: false,
      guardrails: false,
      agentConfigManagement: false,
    };

    it('should tell admins which flag to enable in OdhDashboardConfig', () => {
      useAppContextMock.mockReturnValue(buildAppContext(unavailableFeatureConfig));
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait("Tour what's new");

      // First step with features is now Projects (roleManagement disabled)
      expect(screen.getByText(/OdhDashboardConfig/)).toBeInTheDocument();
      expect(screen.getByText('roleManagement')).toBeInTheDocument();
      expect(screen.queryByText(/Contact your administrator/)).not.toBeInTheDocument();
    });

    it('should tell non-admins to contact their administrator', () => {
      useAppContextMock.mockReturnValue(buildAppContext(unavailableFeatureConfig));
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait("Tour what's new");

      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument();
      expect(screen.queryByText(/OdhDashboardConfig/)).not.toBeInTheDocument();
    });

    it('should not show any unavailability message when all step features are enabled', () => {
      useAppContextMock.mockReturnValue(buildAppContext({ automl: true }));
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      // Navigate to Develop & train (step 3) which only has automl
      fireEvent.click(screen.getByText('Next'));
      act(() => {
        jest.advanceTimersByTime(200);
      });
      fireEvent.click(screen.getByText('Next'));
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.getByText('Develop & train')).toBeInTheDocument();
      expect(screen.queryByText(/OdhDashboardConfig/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Contact your administrator/)).not.toBeInTheDocument();
    });
  });

  describe("What's new in 3.5 button", () => {
    it('should skip to the first step with new features (Projects)', () => {
      useAppContextMock.mockReturnValue(buildAppContext({ genAiStudio: true }));
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait("Tour what's new");

      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Granular role creation')).toBeInTheDocument();
    });
  });

  describe('completion screen', () => {
    it('should show completion modal with docs link after last step', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Next'));
        act(() => {
          jest.advanceTimersByTime(200);
        });
      }

      expect(screen.getByText("You're ready to go!")).toBeInTheDocument();
      expect(screen.getByText('documentation')).toBeInTheDocument();
    });
  });

  describe('segment tracking', () => {
    it('should fire Guided Tour Started as a form event on auto-launch', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(GUIDED_TOUR_EVENTS.STARTED, {
        outcome: TrackingOutcome.submit,
        success: true,
        entryPoint: 'auto-launch',
        tourVersion: '3.5',
        tourVariant: 'non-admin',
        isReturningUser: false,
        roleType: 'Data Scientist',
      });
    });

    it('should cancel pending auto-launch when the tour is opened manually', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);

      // Open from masthead before the 1.5s auto-launch timer fires.
      act(() => {
        jest.advanceTimersByTime(500);
        openWhatsNewTour('masthead');
      });

      expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.STARTED,
        expect.objectContaining({ entryPoint: 'masthead' }),
      );

      // Auto-launch timer would have fired by now — must not start a second session.
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockFireFormTrackingEvent).toHaveBeenCalledTimes(1);
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.STARTED,
        expect.objectContaining({ entryPoint: 'auto-launch' }),
      );
    });

    it('should fire Dismissed as a form cancel when skipping from welcome', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      mockFireFormTrackingEvent.mockClear();

      fireEvent.click(screen.getByText('Close'));

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.DISMISSED,
        expect.objectContaining({
          outcome: TrackingOutcome.cancel,
          entryPoint: 'auto-launch',
          tourVariant: 'admin',
          dismissStepId: 'welcome',
          dismissStepIndex: -1,
          dismissMethod: 'skip_button',
          stepsViewed: 0,
        }),
      );
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.PATH_SELECTED,
        expect.anything(),
      );
    });

    it('should include tourPath on Dismissed after a path is selected', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');
      mockFireFormTrackingEvent.mockClear();

      fireEvent.click(screen.getByTestId('tour-step-skip'));

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.DISMISSED,
        expect.objectContaining({
          outcome: TrackingOutcome.cancel,
          tourPath: 'full',
          dismissMethod: 'skip_button',
          dismissStepId: 'projects',
        }),
      );
    });

    it('should fire Path Selected and Completed as form events', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(GUIDED_TOUR_EVENTS.PATH_SELECTED, {
        outcome: TrackingOutcome.submit,
        success: true,
        tourPath: 'full',
        tourVersion: '3.5',
        tourVariant: 'non-admin',
        entryPoint: 'auto-launch',
      });

      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Next'));
        act(() => {
          jest.advanceTimersByTime(200);
        });
      }

      mockFireFormTrackingEvent.mockClear();
      fireEvent.click(screen.getByTestId('whats-new-done-close'));

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.COMPLETED,
        expect.objectContaining({
          outcome: TrackingOutcome.submit,
          success: true,
          tourPath: 'full',
          entryPoint: 'auto-launch',
          tourVariant: 'non-admin',
          stepsViewed: 5,
          totalSteps: 5,
        }),
      );
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.DISMISSED,
        expect.anything(),
      );
    });

    it('should fire Completed (not Dismissed) when closing the summary modal via X', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');

      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Next'));
        act(() => {
          jest.advanceTimersByTime(200);
        });
      }

      expect(screen.getByText("You're ready to go!")).toBeInTheDocument();
      mockFireFormTrackingEvent.mockClear();

      // PatternFly modal X (not the footer Close button) — still Completed, not abandon.
      const modalCloseButtons = screen.getAllByRole('button', { name: /^close$/i });
      const modalX = modalCloseButtons.find(
        (button) => button.getAttribute('data-testid') !== 'whats-new-done-close',
      );
      if (!modalX) {
        throw new Error('Expected PatternFly modal close (X) button');
      }
      fireEvent.click(modalX);

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.COMPLETED,
        expect.objectContaining({
          outcome: TrackingOutcome.submit,
          success: true,
          tourPath: 'full',
        }),
      );
      expect(mockFireFormTrackingEvent).not.toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.DISMISSED,
        expect.anything(),
      );
    });

    it('should fire Started with masthead entry point on manual reopen', () => {
      mockUseBrowserStorage.mockReturnValue([true, mockSetSeen]);
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      act(() => {
        openWhatsNewTour('masthead');
      });

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(GUIDED_TOUR_EVENTS.STARTED, {
        outcome: TrackingOutcome.submit,
        success: true,
        entryPoint: 'masthead',
        tourVersion: '3.5',
        tourVariant: 'non-admin',
        isReturningUser: true,
        roleType: 'Data Scientist',
      });
    });

    it('should fire Learn More with Amplitude plan property names', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start full tour');
      mockFireMiscTrackingEvent.mockClear();

      fireEvent.click(screen.getByText('Learn more'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        GUIDED_TOUR_EVENTS.LEARN_MORE_CLICKED,
        expect.objectContaining({
          stepId: 'projects',
          destinationUrl: expect.any(String),
          tourPath: 'full',
          presentationType: 'modal',
        }),
      );
    });
  });
});
