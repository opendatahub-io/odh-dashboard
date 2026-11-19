/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import FeatureStoreRoutes from '../FeatureStoreRoutes';

jest.mock('@odh-dashboard/ui-core/components/conditionalArea', () => ({
  conditionalArea: () => (Component: React.ComponentType) => Component,
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR/accessAllowedRouteHoC', () => ({
  accessAllowedRouteHoC: () => (Component: React.ComponentType) => Component,
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR/utils', () => ({
  verbModelAccess: jest.fn(() => ({ group: 'feast.dev', resource: 'featurestores', verb: 'get' })),
}));

jest.mock('../FeatureStore', () => ({
  __esModule: true,
  default: () => <div data-testid="overview-screen" />,
}));

jest.mock('../FeatureStoreCoreLoader', () => {
  const { Outlet } = jest.requireActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    __esModule: true,
    default: () => <Outlet />,
  };
});

jest.mock('../screens/entities/FeatureStoreEntities', () => ({
  __esModule: true,
  default: () => <div data-testid="entities-screen" />,
}));

jest.mock('../screens/entities/EntitiesDetails/EntitiesDetailsPage', () => {
  const { useParams } = jest.requireActual<typeof import('react-router-dom')>('react-router-dom');
  const EntitiesDetailsPageMock = () => {
    const params = useParams<{ fsProjectName: string; entityName: string }>();
    return (
      <div data-testid="entity-details-screen">
        <span data-testid="entity-details-project">{params.fsProjectName}</span>
        <span data-testid="entity-details-entity">{params.entityName}</span>
      </div>
    );
  };
  return {
    __esModule: true,
    default: EntitiesDetailsPageMock,
  };
});

jest.mock('../screens/featureViews/FeatureViews', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-views-screen" />,
}));

jest.mock('../screens/featureViews/featureViewDetails/FeatureViewDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-view-details-screen" />,
}));

jest.mock('../screens/features/Features', () => ({
  __esModule: true,
  default: () => <div data-testid="features-screen" />,
}));

jest.mock('../screens/features/featureDetails/FeatureDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-details-screen" />,
}));

jest.mock('../screens/featureServices/FeatureServices', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-services-screen" />,
}));

jest.mock('../screens/featureServices/featureServiceDetails/FeatureServiceDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="feature-service-details-screen" />,
}));

jest.mock('../screens/dataSources/DataSources', () => ({
  __esModule: true,
  default: () => <div data-testid="data-sources-screen" />,
}));

jest.mock('../screens/dataSources/dataSourceDetails/DataSourceDetailsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="data-source-details-screen" />,
}));

jest.mock('../screens/dataSets/FeatureStoreDataSets', () => ({
  __esModule: true,
  default: () => <div data-testid="datasets-screen" />,
}));

jest.mock('../screens/dataSets/DataSetDetails/DataSetDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="dataset-details-screen" />,
}));

jest.mock('../screens/create/CreateFeatureStoreProject', () => ({
  __esModule: true,
  default: () => <div data-testid="create-project-screen" />,
}));

jest.mock('../screens/create/DeploymentProgressPage', () => ({
  __esModule: true,
  default: () => <div data-testid="deployment-progress-screen" />,
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <FeatureStoreRoutes />
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('FeatureStoreRoutes', () => {
  it('redirects the index route to the overview screen', () => {
    renderAt('/');

    expect(screen.getByTestId('overview-screen')).toBeInTheDocument();
    expect(screen.getByTestId('location-display').textContent).toBe('/overview');
  });

  it('renders the overview screen for the overview route of a project', () => {
    renderAt('/overview/credit_scoring_local');

    expect(screen.getByTestId('overview-screen')).toBeInTheDocument();
  });

  it.each([
    ['entities', 'entities-screen'],
    ['feature-views', 'feature-views-screen'],
    ['features', 'features-screen'],
    ['feature-services', 'feature-services-screen'],
    ['data-sources', 'data-sources-screen'],
    ['datasets', 'datasets-screen'],
  ])('renders the list screen for the %s route', (route, testId) => {
    renderAt(`/${route}/credit_scoring_local`);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it.each([
    ['/feature-views/credit_scoring_local/zipcode_features', 'feature-view-details-screen'],
    ['/entities/credit_scoring_local/user_id', 'entity-details-screen'],
    ['/features/credit_scoring_local/zipcode_features/city', 'feature-details-screen'],
    ['/feature-services/credit_scoring_local/credit_service', 'feature-service-details-screen'],
    ['/data-sources/credit_scoring_local/loan_data', 'data-source-details-screen'],
    ['/datasets/credit_scoring_local/loan_dataset', 'dataset-details-screen'],
  ])('renders the detail screen for %s', (path, testId) => {
    renderAt(path);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('passes the project and entity route params to the entity details page', () => {
    renderAt('/entities/credit_scoring_local/user_id');

    expect(screen.getByTestId('entity-details-project')).toHaveTextContent('credit_scoring_local');
    expect(screen.getByTestId('entity-details-entity')).toHaveTextContent('user_id');
  });

  it('renders the create project screen for the create route', () => {
    renderAt('/create');

    expect(screen.getByTestId('create-project-screen')).toBeInTheDocument();
  });

  it('renders the deployment progress screen for the deploy route', () => {
    renderAt('/create/deploy/my-namespace/my-store');

    expect(screen.getByTestId('deployment-progress-screen')).toBeInTheDocument();
  });
});
