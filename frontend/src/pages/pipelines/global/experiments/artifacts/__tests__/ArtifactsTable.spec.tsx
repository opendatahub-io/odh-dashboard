import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react';
import { Artifact } from '#~/third_party/mlmd';
import * as useGetArtifactsList from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsList';
import * as MlmdListContext from '#~/concepts/pipelines/context/MlmdListContext';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '#~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { ArtifactsList } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsList';

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
  getPipelineServerName: jest.fn(() => 'Test namespace pipeline server'),
}));

describe('ArtifactsTable', () => {
  const useGetArtifactsListSpy = jest.spyOn(useGetArtifactsList, 'useGetArtifactsList');
  const useMlmdListContextSpy = jest.spyOn(MlmdListContext, 'useMlmdListContext');

  beforeEach(() => {
    useMlmdListContextSpy.mockReturnValue({
      filterQuery: '',
      pageToken: '',
      maxResultSize: 10,
      orderBy: undefined,
      setFilterQuery: jest.fn(),
      setPageToken: jest.fn(),
      setMaxResultSize: jest.fn(),
      setOrderBy: jest.fn(),
    });

    useGetArtifactsListSpy.mockReturnValue([
      {
        artifacts: [
          {
            getId: jest.fn(() => 1),
            getTypeId: jest.fn(() => 14),
            getType: jest.fn(() => 'system.Artifact'),
            getUri: jest.fn(() => 'https://test-artifact!-aiplatform.googleapis.com/v1/12.15'),
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
            getCreateTimeSinceEpoch: jest.fn(() => Date.now()),
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
          },
          {
            getId: jest.fn(() => 2),
            getTypeId: jest.fn(() => 15),
            getType: jest.fn(() => 'system.Dataset'),
            getUri: jest.fn(() => 'https://test2-artifact!-aiplatform.googleapis.com/v1/12.10'),
            getPropertiesMap: jest.fn(() => []),
            getCustomPropertiesMap: jest.fn(
              () =>
                new Map([
                  [
                    'display_name',
                    {
                      getStringValue: () => 'iris_dataset',
                    },
                  ],
                  [
                    'resourceName',
                    {
                      getStringValue: () => '12.10',
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
            getCreateTimeSinceEpoch: jest.fn(() => 1611399342384),
            toObject: jest.fn(() => ({
              id: 2,
              typeId: 15,
              type: 'system.Dataset',
              uri: 'https://test2-artifact!-aiplatform.googleapis.com/v1/12.10',
              customPropertiesMap: [
                [
                  'display_name',
                  {
                    stringValue: 'iris_dataset',
                  },
                ],
                [
                  'resourceName',
                  {
                    stringValue: '12.10',
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
              createTimeSinceEpoch: 1611399342384,
            })),
          },
        ] as unknown as Artifact[],
        nextPageToken: '',
      },
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('renders artifacts table with data', async () => {
    // Wrap in act to handle state updates
    await act(async () => {
      render(
        <BrowserRouter>
          <EnsureAPIAvailability>
            <EnsureCompatiblePipelineServer>
              <MlmdListContext.MlmdListContextProvider>
                <ArtifactsList />
              </MlmdListContext.MlmdListContextProvider>
            </EnsureCompatiblePipelineServer>
          </EnsureAPIAvailability>
        </BrowserRouter>,
      );
    });

    const firstRow = screen.getByRole('row', { name: /vertex_model/ });
    expect(firstRow).toHaveTextContent('vertex_model');
    expect(firstRow).toHaveTextContent('1');
    expect(firstRow).toHaveTextContent('system.Artifact');
    expect(firstRow).toHaveTextContent('https://test-artifact!-aiplatform.googleapis.com/v1/12.15');
    expect(firstRow).toHaveTextContent('Just now');

    const secondRow = screen.getByRole('row', { name: /iris_dataset/ });
    expect(secondRow).toHaveTextContent('iris_dataset');
    expect(secondRow).toHaveTextContent('2');
    expect(secondRow).toHaveTextContent('system.Dataset');
    expect(secondRow).toHaveTextContent(
      'https://test2-artifact!-aiplatform.googleapis.com/v1/12.10',
    );
    expect(secondRow).toHaveTextContent('23 Jan 2021');
  });
});
