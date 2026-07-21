import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DashboardConfigKind } from '@odh-dashboard/k8s-core';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import type { UserState } from '#~/redux/selectors/types';
import { useUser } from '#~/redux/selectors';
import { useAppContext } from '#~/app/AppContext';
import { mockDashboardConfig } from '#~/__mocks__';
import type { BuildStatus } from '#~/types';
import type { StorageClassKind } from '#~/k8sTypes';
import WhatsNewModal from '#~/app/whatsNew/WhatsNewModal';

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

const useAppContextMock = jest.mocked(useAppContext);
const useUserMock = jest.mocked(useUser);
const mockUseBrowserStorage = jest.mocked(useBrowserStorage);

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

      fireEvent.click(screen.getByText('Skip tour'));

      expect(mockSetSeen).toHaveBeenCalledWith(true);
    });
  });

  describe('admin vs non-admin tour steps', () => {
    it('should include Settings step for admin users (6 total)', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start tour');

      expect(screen.getByText(/of 6/)).toBeInTheDocument();
    });

    it('should exclude Settings step for non-admin users (5 total)', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start tour');

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
      startTourAndWait("What's new in 3.5");

      expect(screen.getByText(/OdhDashboardConfig/)).toBeInTheDocument();
      expect(screen.getByText('autorag')).toBeInTheDocument();
      expect(screen.queryByText(/Contact your administrator/)).not.toBeInTheDocument();
    });

    it('should tell non-admins to contact their administrator', () => {
      useAppContextMock.mockReturnValue(buildAppContext(unavailableFeatureConfig));
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait("What's new in 3.5");

      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument();
      expect(screen.queryByText(/OdhDashboardConfig/)).not.toBeInTheDocument();
    });

    it('should not show any unavailability message when all step features are enabled', () => {
      useAppContextMock.mockReturnValue(buildAppContext({ automl: true }));
      useUserMock.mockReturnValue(adminUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start tour');

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
    it('should skip to the first step with new features, not Projects', () => {
      useAppContextMock.mockReturnValue(buildAppContext({ genAiStudio: true }));
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait("What's new in 3.5");

      expect(screen.getByText('Gen AI studio')).toBeInTheDocument();
    });
  });

  describe('completion screen', () => {
    it('should show completion modal with docs link after last step', () => {
      useAppContextMock.mockReturnValue(buildAppContext());
      useUserMock.mockReturnValue(regularUser);

      render(<WhatsNewModal />);
      openWelcomeModal();
      startTourAndWait('Start tour');

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
});
