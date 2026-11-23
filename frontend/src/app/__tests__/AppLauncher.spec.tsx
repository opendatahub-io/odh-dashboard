import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { mockConsoleLink } from '#~/__mocks__/mockConsoleLinks';
import { MOCK_ODH_ICON } from '#~/__mocks__/mockIcon';
import { useAppContext } from '#~/app/AppContext';
import AppLauncher from '#~/app/AppLauncher';
import { useClusterInfo } from '#~/redux/selectors/clusterInfo';
import { useWatchConsoleLinks } from '#~/utilities/useWatchConsoleLinks';

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('#~/redux/selectors/clusterInfo', () => ({
  ...jest.requireActual('#~/redux/selectors/clusterInfo'),
  useClusterInfo: jest.fn(),
}));

jest.mock('#~/utilities/useWatchConsoleLinks', () => ({
  useWatchConsoleLinks: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireLinkTrackingEvent: jest.fn(),
}));

const useAppContextMock = jest.mocked(useAppContext);
const useClusterInfoMock = jest.mocked(useClusterInfo);
const useWatchConsoleLinksMock = jest.mocked(useWatchConsoleLinks);
const useIsAreaAvailableMock = jest.mocked(useIsAreaAvailable);

const originalLocation = window.location;

const relativeImageLink = mockConsoleLink({
  name: 'github-workshop',
  displayText: 'GitHub - RAG On Prem',
  section: 'Git Repos',
  href: 'https://github.com/adrezni/rag-onprem',
  imageURL: '/static/assets/public/imgs/logos/github.svg',
});

const dataImageLink = mockConsoleLink({
  name: 'custom-data-image',
  displayText: 'Custom data image',
  section: 'Git Repos',
  imageURL: MOCK_ODH_ICON,
});

const renderAndOpen = () => {
  render(<AppLauncher />);
  fireEvent.click(screen.getByRole('button', { name: 'Application launcher' }));
};

describe('AppLauncher', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        hostname: 'rh-ai.apps.example.com',
        protocol: 'https:',
        port: '',
      },
    });
    useAppContextMock.mockReturnValue({
      dashboardConfig: mockDashboardConfig({}),
    } as unknown as ReturnType<typeof useAppContext>);
    useClusterInfoMock.mockReturnValue({ serverURL: 'https://api.example.com:6443' });
    useIsAreaAvailableMock.mockReturnValue({ status: false } as unknown as ReturnType<
      typeof useIsAreaAvailable
    >);
    useWatchConsoleLinksMock.mockReturnValue({
      consoleLinks: [relativeImageLink, dataImageLink],
      loaded: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  });

  it('should resolve console-relative ConsoleLink images against the OpenShift console', () => {
    renderAndOpen();

    expect(screen.getByAltText('GitHub - RAG On Prem logo')).toHaveAttribute(
      'src',
      'https://console-openshift-console.apps.example.com/static/assets/public/imgs/logos/github.svg',
    );
  });

  it('should leave data URI ConsoleLink images untouched', () => {
    renderAndOpen();

    expect(screen.getByAltText('Custom data image logo')).toHaveAttribute('src', MOCK_ODH_ICON);
  });
});
