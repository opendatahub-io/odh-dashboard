import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { HardwareProfilesContext } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { useIsDRAHardwareProfileEnabled } from '@odh-dashboard/hardware-profiles/shared/useIsDRAHardwareProfileEnabled';
import { patchDashboardConfigHardwareProfileOrder } from '#~/api';
import { useApplicationSettings } from '#~/app/useApplicationSettings';
import HardwareProfiles from '#~/pages/hardwareProfiles/HardwareProfiles';
import { HardwareProfileBannerWarningTitles } from '#~/pages/hardwareProfiles/utils';

jest.mock('@odh-dashboard/hardware-profiles/shared/useIsDRAHardwareProfileEnabled', () => ({
  useIsDRAHardwareProfileEnabled: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR', () => ({
  ...jest.requireActual('@odh-dashboard/internal/concepts/userSSAR'),
  useAccessAllowed: jest.fn(() => [true, true]),
}));

jest.mock('@odh-dashboard/internal/api', () => ({
  ...jest.requireActual('@odh-dashboard/internal/api'),
  patchDashboardConfigHardwareProfileOrder: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/app/useApplicationSettings', () => ({
  useApplicationSettings: jest.fn(() => ({ dashboardConfig: undefined, refresh: jest.fn() })),
}));

jest.mock('@odh-dashboard/internal/redux/selectors', () => ({
  ...jest.requireActual('@odh-dashboard/internal/redux/selectors'),
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('@odh-dashboard/hardware-profiles/pages/HardwareProfilesTable', () => ({
  __esModule: true,
  default: ({
    hardwareProfiles,
    setHardwareProfileOrder,
  }: {
    hardwareProfiles: HardwareProfileKind[];
    setHardwareProfileOrder: (order: string[]) => Promise<void>;
  }) => (
    <>
      <ul data-testid="hardware-profiles-table">
        {hardwareProfiles.map((profile) => (
          <li key={profile.metadata.name}>{profile.metadata.name}</li>
        ))}
      </ul>
      <button
        data-testid="reverse-hardware-profile-order"
        onClick={() =>
          setHardwareProfileOrder(
            hardwareProfiles.map((profile) => profile.metadata.name).reverse(),
          )
        }
      />
    </>
  ),
}));

const useIsDRAHardwareProfileEnabledMock = jest.mocked(useIsDRAHardwareProfileEnabled);
const useApplicationSettingsMock = jest.mocked(useApplicationSettings);
const patchDashboardConfigHardwareProfileOrderMock = jest.mocked(
  patchDashboardConfigHardwareProfileOrder,
);

const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
const disabledDRAProfile = mockHardwareProfile({
  name: 'dra-profile',
  dra: { resourceClaimTemplateName: 'single-gpu' },
  annotations: { 'opendatahub.io/disabled': 'true' },
});

const renderPage = (hardwareProfiles: HardwareProfileKind[]) =>
  render(
    <MemoryRouter>
      <HardwareProfilesContext.Provider
        value={{ globalHardwareProfiles: [hardwareProfiles, true, undefined] }}
      >
        <HardwareProfiles />
      </HardwareProfilesContext.Provider>
    </MemoryRouter>,
  );

describe('HardwareProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when DRA hardware profiles are disabled', () => {
    beforeEach(() => {
      useIsDRAHardwareProfileEnabledMock.mockReturnValue(false);
    });

    it('should not list DRA hardware profiles', () => {
      renderPage([regularProfile, disabledDRAProfile]);

      const table = screen.getByTestId('hardware-profiles-table');
      expect(table).toHaveTextContent('regular-profile');
      expect(table).not.toHaveTextContent('dra-profile');
    });

    it('should not show a warning banner for DRA hardware profiles', () => {
      renderPage([regularProfile, disabledDRAProfile]);

      expect(screen.queryByTestId('hardware-profiles-error-alert')).not.toBeInTheDocument();
    });

    it('should show the empty state when only DRA hardware profiles exist', () => {
      renderPage([disabledDRAProfile]);

      expect(screen.getByTestId('empty-state-hardware-profiles')).toBeInTheDocument();
      expect(screen.queryByTestId('hardware-profiles-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('hardware-profiles-error-alert')).not.toBeInTheDocument();
    });
  });

  describe('when DRA hardware profiles are enabled', () => {
    beforeEach(() => {
      useIsDRAHardwareProfileEnabledMock.mockReturnValue(true);
    });

    it('should list DRA hardware profiles', () => {
      renderPage([regularProfile, disabledDRAProfile]);

      const table = screen.getByTestId('hardware-profiles-table');
      expect(table).toHaveTextContent('regular-profile');
      expect(table).toHaveTextContent('dra-profile');
    });

    it('should warn when the only hardware profile is a disabled DRA hardware profile', () => {
      renderPage([disabledDRAProfile]);

      expect(screen.getByTestId('hardware-profiles-error-alert')).toHaveTextContent(
        HardwareProfileBannerWarningTitles.ALL_DISABLED,
      );
    });
  });

  describe('when the visible hardware profiles are reordered', () => {
    const profiles = [
      mockHardwareProfile({ name: 'a-profile' }),
      mockHardwareProfile({
        name: 'b-dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      }),
      mockHardwareProfile({ name: 'z-profile' }),
    ];

    const reorderWithSavedOrder = (hardwareProfileOrder: string[]) => {
      useApplicationSettingsMock.mockReturnValue({
        dashboardConfig: mockDashboardConfig({ hardwareProfileOrder }),
        loaded: true,
        loadError: undefined,
        refresh: jest.fn().mockResolvedValue(undefined),
      });
      renderPage(profiles);
      fireEvent.click(screen.getByTestId('reverse-hardware-profile-order'));
    };

    beforeEach(() => {
      useIsDRAHardwareProfileEnabledMock.mockReturnValue(false);
      patchDashboardConfigHardwareProfileOrderMock.mockResolvedValue(mockDashboardConfig({}));
    });

    it('should keep a hidden DRA hardware profile at its position when no order has been saved', async () => {
      reorderWithSavedOrder([]);

      await waitFor(() =>
        expect(patchDashboardConfigHardwareProfileOrderMock).toHaveBeenCalledWith(
          ['z-profile', 'b-dra-profile', 'a-profile'],
          'opendatahub',
        ),
      );
    });

    it('should keep a hidden DRA hardware profile created after the order was saved', async () => {
      reorderWithSavedOrder(['a-profile', 'z-profile']);

      await waitFor(() =>
        expect(patchDashboardConfigHardwareProfileOrderMock).toHaveBeenCalledWith(
          ['z-profile', 'a-profile', 'b-dra-profile'],
          'opendatahub',
        ),
      );
    });
  });
});
