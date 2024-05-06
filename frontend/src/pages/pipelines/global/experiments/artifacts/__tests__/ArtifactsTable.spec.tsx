import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Artifact } from '~/third_party/mlmd';
import * as useGetArtifactsList from '~/pages/pipelines/global/experiments/artifacts/useGetArtifactsList';
import * as MlmdListContext from '~/concepts/pipelines/context/MlmdListContext';
import * as usePipelinesUiRoute from '~/concepts/pipelines/context/usePipelinesUiRoute';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { ArtifactsList } from '~/pages/pipelines/global/experiments/artifacts/ArtifactsList';

jest.mock('~/redux/selectors', () => ({
  ...jest.requireActual('~/redux/selectors'),
  useUser: jest.fn(() => ({ isAdmin: true })),
}));

jest.mock('~/concepts/pipelines/context/PipelinesContext', () => ({
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
  })),
}));

describe('ArtifactsTable', () => {
  const useGetArtifactsListSpy = jest.spyOn(useGetArtifactsList, 'useGetArtifactsList');
  const useMlmdListContextSpy = jest.spyOn(MlmdListContext, 'useMlmdListContext');
  const usePipelinesUiRouteSpy = jest.spyOn(usePipelinesUiRoute, 'usePipelinesUiRoute');

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
            toObject: jest.fn(() => ({
              id: 1,
              typeId: 14,
              type: 'system.Artifact',
              uri: 'https://test-artifact!-aiplatform.googleapis.com/v1/12.15',
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
              ],
              state: 2,
              createTimeSinceEpoch: new Date(),
            })),
          },
          {
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

    usePipelinesUiRouteSpy.mockReturnValue(['dspa-pipeline-ui-route', true]);
  });

  it('renders artifacts table with data', () => {
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
