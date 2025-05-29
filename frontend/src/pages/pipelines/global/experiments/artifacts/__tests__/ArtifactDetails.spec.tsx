import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react';
import { Artifact } from '#~/third_party/mlmd';
import { artifactsBaseRoute } from '#~/routes/pipelines/artifacts';
import { ArtifactDetails } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactDetails/ArtifactDetails';
import GlobalPipelineCoreDetails from '#~/pages/pipelines/global/GlobalPipelineCoreDetails';
import * as useGetArtifactById from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactById';
import * as useArtifactStorage from '#~/concepts/pipelines/apiHooks/useArtifactStorage';

// Mock the useDispatch hook
jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(() => ({ isAdmin: true })),
}));

jest.mock('#~/concepts/areas/useIsAreaAvailable', () => () => ({
  status: true,
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
  customCondition: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({
    pipelinesServer: {
      initializing: false,
      installed: true,
      compatible: true,
      timedOut: false,
      name: 'dspa',
    },
    namespace: 'Test namespace',
    project: {
      metadata: {
        name: 'Test namespace',
      },
      kind: 'Project',
    },
    apiAvailable: true,
    api: {
      getArtifact: jest.fn(() =>
        // eslint-disable-next-line camelcase
        Promise.resolve({ download_url: 'https://example.com/download-url' }),
      ),
    },
  })),
}));

jest.mock('#~/concepts/pipelines/apiHooks/useArtifactStorage');

describe('ArtifactDetails', () => {
  const useGetArtifactByIdSpy = jest.spyOn(useGetArtifactById, 'useGetArtifactById');
  const useArtifactStorageSpy = jest.spyOn(useArtifactStorage, 'useArtifactStorage');

  beforeEach(() => {
    useArtifactStorageSpy.mockReturnValue({
      getStorageObjectRenderUrl: jest.fn().mockResolvedValue('https://example.com/s3-url/render'),
      getStorageObjectDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://example.com/s3-url/download'),
      getStorageObjectSize: jest.fn().mockResolvedValue(1e9), // Mocking 1 GB size
    });

    useGetArtifactByIdSpy.mockReturnValue([
      {
        getId: jest.fn(() => 1),
        getTypeId: jest.fn(() => 14),
        getType: jest.fn(() => 'system.Artifact'),
        getUri: jest.fn(() => 's3://namespace/bucket/path/to/artifact'),
        getPropertiesMap: jest.fn(() => []),
        getCustomPropertiesMap: jest.fn(
          () =>
            new Map([
              [
                'display_name',
                {
                  getStringValue: () => 'vertex_model',
                },
              ],
              [
                'resourceName',
                {
                  getStringValue: () => '12.15',
                },
              ],
              [
                'registeredModelName',
                {
                  getStringValue: () => 'Model name',
                },
              ],
              [
                'modelRegistryName',
                {
                  getStringValue: () => 'Registry name',
                },
              ],
              [
                'modelVersionName',
                {
                  getStringValue: () => 'v1',
                },
              ],
              [
                'modelVersionId',
                {
                  getStringValue: () => '1',
                },
              ],
              [
                'registeredModelId',
                {
                  getStringValue: () => '1',
                },
              ],
            ]),
        ),
        getState: jest.fn(() => 2),
        getCreateTimeSinceEpoch: jest.fn(() => 1711113121829),
        getLastUpdateTimeSinceEpoch: jest.fn(() => 1711113121829),
        toObject: jest.fn(() => ({
          id: 1,
          typeId: 14,
          type: 'system.Artifact',
          uri: 's3://namespace/bucket/path/to/artifact',
          propertiesMap: [],
          customPropertiesMap: [
            [
              'display_name',
              {
                stringValue: 'vertex_model',
              },
            ],
            [
              'resourceName',
              {
                stringValue: '12.15',
              },
            ],
            [
              'registeredModelName',
              {
                stringValue: 'Model name',
              },
            ],
            [
              'modelRegistryName',
              {
                stringValue: 'Registry name',
              },
            ],
            [
              'modelVersionName',
              {
                stringValue: 'v1',
              },
            ],
            [
              'modelVersionId',
              {
                stringValue: '1',
              },
            ],
            [
              'registeredModelId',
              {
                stringValue: '1',
              },
            ],
          ],
          state: 2,
          createTimeSinceEpoch: 1711113121829,
          lastUpdateTimeSinceEpoch: 1711113121829,
        })),
      } as unknown as Artifact,
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('renders page breadcrumbs', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <GlobalPipelineCoreDetails
            pageName="Artifacts"
            redirectPath={artifactsBaseRoute}
            BreadcrumbDetailsComponent={ArtifactDetails}
          />
        </BrowserRouter>,
      ),
    );

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(
      within(breadcrumb).getByRole('link', { name: 'Artifacts - Test namespace' }),
    ).toBeVisible();
    expect(within(breadcrumb).getByText('vertex_model')).toBeVisible();
  });

  it('renders artifact name as page header with the Overview tab initially selected', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <GlobalPipelineCoreDetails
            pageName="Artifacts"
            redirectPath={artifactsBaseRoute}
            BreadcrumbDetailsComponent={ArtifactDetails}
          />
        </BrowserRouter>,
      ),
    );

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('vertex_model');

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTab).toBeVisible();
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders Overview tab metadata contents', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <GlobalPipelineCoreDetails
            pageName="Artifacts"
            redirectPath={artifactsBaseRoute}
            BreadcrumbDetailsComponent={ArtifactDetails}
          />
        </BrowserRouter>,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Live system dataset' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Custom properties' })).toBeVisible();

    const datasetDescriptionList = screen.getByTestId('dataset-description-list');
    expect(within(datasetDescriptionList).getByRole('term')).toHaveTextContent('URI');
    expect(within(datasetDescriptionList).getByRole('definition')).toHaveTextContent(
      's3://namespace/bucket/path/to/artifact',
    );

    const customPropsDescriptionList = screen.getByTestId('custom-props-description-list');
    const customPropsDescriptionListTerms = within(customPropsDescriptionList).getAllByRole('term');
    const customPropsDescriptionListValues = within(customPropsDescriptionList).getAllByRole(
      'definition',
    );

    expect(customPropsDescriptionListTerms[0]).toHaveTextContent('display_name');
    expect(customPropsDescriptionListValues[0]).toHaveTextContent('vertex_model');
    expect(customPropsDescriptionListTerms[1]).toHaveTextContent('resourceName');
    expect(customPropsDescriptionListValues[1]).toHaveTextContent('12.15');
  });
});
