/**
 * @jest-environment jsdom
 */
/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams } from 'react-router-dom';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { IsAreaAvailableStatus, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useClusterInfo } from '@odh-dashboard/internal/redux/selectors/clusterInfo';
import { getOpenShiftConsoleAction } from '@odh-dashboard/internal/app/AppLauncher';
import { useFeatureStoreCR } from '../apiHooks/useFeatureStoreCR';
import { useFeatureStoreObject } from '../apiHooks/useFeatureStoreObject';
import useFeatureStoreProjects from '../apiHooks/useFeatureStoreProjects';
import { RegistryFeatureStore } from '../hooks/useRegistryFeatureStores';
import { FeatureStoreObject } from '../const';
import FeatureStoreCoreLoader from '../FeatureStoreCoreLoader';

jest.mock('@odh-dashboard/ui-core/components/conditionalArea', () => ({
  conditionalArea: () => (Component: React.ComponentType) => Component,
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
  SupportedArea: {
    FEATURE_STORE: 'FEATURE_STORE',
    FEATURE_STORE_ADMIN: 'FEATURE_STORE_ADMIN',
  },
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed');
jest.mock('@odh-dashboard/internal/concepts/userSSAR/utils', () => ({
  verbModelAccess: jest.fn(() => ({
    group: 'feast.dev',
    resource: 'featurestores',
    verb: 'create',
  })),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/clusterInfo', () => ({
  useClusterInfo: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/app/AppLauncher', () => ({
  getOpenShiftConsoleAction: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/external/RedirectErrorState', () => ({
  __esModule: true,
  default: ({ title, errorMessage }: { title: string; errorMessage: string }) => (
    <div data-testid="redirect-error-state">
      {title}: {errorMessage}
    </div>
  ),
}));

jest.mock('../apiHooks/useFeatureStoreCR');
jest.mock('../apiHooks/useFeatureStoreObject');
jest.mock('../apiHooks/useFeatureStoreProjects');

jest.mock('../FeatureStoreContext', () => ({
  FeatureStoreContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/FeatureStorePageTitle', () => ({
  __esModule: true,
  default: ({ title }: { title: React.ReactNode }) => <div>{title}</div>,
}));

jest.mock('../components/FeatureStoreObjectIcon', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <span>{title}</span>,
}));

jest.mock('../icons/header-icons/SupportIcon', () => ({
  __esModule: true,
  default: () => <span data-testid="support-icon" />,
}));

jest.mock('../screens/components/EmptyStateFeatureStore', () => ({
  __esModule: true,
  default: ({
    title,
    description,
    testid,
    headerIcon,
    customAction,
  }: {
    title: string;
    description: React.ReactNode;
    testid: string;
    headerIcon?: () => React.ReactNode;
    customAction?: React.ReactNode;
  }) => (
    <div data-testid={testid}>
      <h1>{title}</h1>
      <div data-testid="empty-state-icon">{headerIcon ? headerIcon() : null}</div>
      <div data-testid="empty-state-description">{description}</div>
      <div data-testid="empty-state-action">{customAction}</div>
    </div>
  ),
}));

jest.mock('../screens/components/InvalidFeatureStoreProject', () => ({
  __esModule: true,
  default: ({ projectName }: { projectName: string }) => (
    <div data-testid="invalid-feature-store-project">Unknown project: {projectName}</div>
  ),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    title,
    children,
    loaded,
    empty,
    emptyStatePage,
    loadError,
  }: {
    title: React.ReactNode;
    children?: React.ReactNode;
    loaded: boolean;
    empty: boolean;
    emptyStatePage?: React.ReactNode;
    loadError?: Error;
  }) => (
    <div data-testid="applications-page">
      <div data-testid="page-title">{title}</div>
      {loadError ? (
        <div data-testid="page-error">{loadError.message}</div>
      ) : !loaded ? (
        <div data-testid="page-loading">Loading</div>
      ) : empty ? (
        emptyStatePage
      ) : (
        children
      )}
    </div>
  ),
  WhosMyAdministrator: () => <div data-testid="whos-my-administrator" />,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({
    to,
    children,
    ...rest
  }: { to: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="feature-store-outlet" />,
  useParams: jest.fn(),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseAccessAllowed = jest.mocked(useAccessAllowed);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseClusterInfo = jest.mocked(useClusterInfo);
const mockGetOpenShiftConsoleAction = jest.mocked(getOpenShiftConsoleAction);
const mockUseFeatureStoreCR = jest.mocked(useFeatureStoreCR);
const mockUseFeatureStoreObject = jest.mocked(useFeatureStoreObject);
const mockUseFeatureStoreProjects = jest.mocked(useFeatureStoreProjects);

const areaStatus = (status: boolean): IsAreaAvailableStatus => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredCapabilities: null,
  requiredComponents: null,
});

const registryFeatureStore: RegistryFeatureStore = {
  name: 'store-a',
  project: 'store-a',
  registry: { path: 'registry.svc:443' },
  namespace: 'ns-a',
  status: {
    conditions: [{ type: 'Ready', status: 'True', lastTransitionTime: '2025-01-01T00:00:00Z' }],
  },
};

const renderLoader = () =>
  render(<FeatureStoreCoreLoader getInvalidRedirectPath={() => '/develop-train/feature-store'} />);

const setupAccess = (isAdmin: boolean, adminAreaAvailable: boolean) => {
  mockUseAccessAllowed.mockReturnValue([isAdmin, true]);
  mockUseIsAreaAvailable.mockReturnValue(areaStatus(adminAreaAvailable));
};

const setupFeatureStoreCR = ({
  loaded = true,
  error,
  present = true,
}: { loaded?: boolean; error?: Error; present?: boolean } = {}) => {
  mockUseFeatureStoreCR.mockReturnValue({
    data: present ? registryFeatureStore : null,
    loaded,
    error,
  });
};

const setupProjects = (names: string[]) => {
  mockUseFeatureStoreProjects.mockReturnValue({
    data: {
      projects: names.map((name) => ({
        spec: { name },
        meta: {
          createdTimestamp: '2025-01-01T00:00:00Z',
          lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
        },
      })),
      pagination: {
        page: 1,
        limit: 10,
        total_count: names.length,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    },
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  });
};

describe('FeatureStoreCoreLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseFeatureStoreObject.mockReturnValue(FeatureStoreObject.ENTITIES);
    mockUseClusterInfo.mockReturnValue({ serverURL: 'https://console.example.com' });
    mockGetOpenShiftConsoleAction.mockReturnValue(null);
    setupAccess(false, false);
    setupFeatureStoreCR();
    setupProjects([]);
  });

  it('renders a loading spinner while the feature store CR has not loaded', () => {
    setupFeatureStoreCR({ loaded: false });

    renderLoader();

    expect(screen.getByLabelText('Loading feature store')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-outlet')).not.toBeInTheDocument();
  });

  it('renders a loading spinner while the admin check has not resolved', () => {
    mockUseAccessAllowed.mockReturnValue([false, false]);

    renderLoader();

    expect(screen.getByLabelText('Loading feature store')).toBeInTheDocument();
  });

  it('renders the load error page when CR discovery fails', () => {
    setupFeatureStoreCR({ error: new Error('CRD discovery failed') });

    renderLoader();

    expect(screen.getByTestId('page-error')).toHaveTextContent('CRD discovery failed');
    expect(screen.queryByTestId('redirect-error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-store-outlet')).not.toBeInTheDocument();
  });

  it('shows the "No feature stores" empty state to an admin with the admin area enabled', () => {
    setupAccess(true, true);
    setupFeatureStoreCR({ present: false });

    renderLoader();

    expect(screen.getByTestId('empty-state-feature-store')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No feature stores');
    expect(screen.getByTestId('go-to-feature-stores-btn')).toBeInTheDocument();
  });

  it('shows the "Create a feature store" empty state to an admin without the admin area', () => {
    setupAccess(true, false);
    setupFeatureStoreCR({ present: false });
    mockGetOpenShiftConsoleAction.mockReturnValue({
      label: 'OpenShift Console',
      href: 'https://console.example.com',
      image: <span />,
    });

    renderLoader();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create a feature store');
    expect(screen.queryByTestId('go-to-feature-stores-btn')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /OpenShift Platform/ })).toHaveAttribute(
      'href',
      'https://console.example.com',
    );
  });

  it('shows the access request empty state to a non-admin', () => {
    setupAccess(false, false);
    setupFeatureStoreCR({ present: false });

    renderLoader();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Request access to a feature store',
    );
    expect(screen.getByTestId('whos-my-administrator')).toBeInTheDocument();
    expect(screen.getByTestId('support-icon')).toBeInTheDocument();
  });

  it('shows the access request empty state to a non-admin even when the admin area is available', () => {
    setupAccess(false, true);
    setupFeatureStoreCR({ present: false });

    renderLoader();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Request access to a feature store',
    );
    expect(screen.getByTestId('whos-my-administrator')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage/i })).not.toBeInTheDocument();
    // The admin "Go to Feature stores" action must stay hidden: showAdminUI needs isAdmin too.
    expect(screen.queryByTestId('go-to-feature-stores-btn')).not.toBeInTheDocument();
  });

  it('renders the invalid project page when the route project is unknown', () => {
    mockUseParams.mockReturnValue({ fsProjectName: 'missing-project' });
    setupProjects(['known-project']);

    renderLoader();

    expect(screen.getByTestId('invalid-feature-store-project')).toHaveTextContent(
      'Unknown project: missing-project',
    );
    expect(screen.queryByTestId('feature-store-outlet')).not.toBeInTheDocument();
  });

  it('renders the outlet when the route project exists', () => {
    mockUseParams.mockReturnValue({ fsProjectName: 'known-project' });
    setupProjects(['known-project']);

    renderLoader();

    expect(screen.getByTestId('feature-store-outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('invalid-feature-store-project')).not.toBeInTheDocument();
  });
});
