/* eslint-disable camelcase */
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/useGetArtifactsList';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { ArtifactsList } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsList';
import { ArtifactsTable } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsTable';
import { FilterOptions } from '#~/pages/pipelines/global/experiments/artifacts/constants';

jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({ namespace: 'test-namespace' })),
}));
jest.mock('#~/concepts/pipelines/apiHooks/useGetArtifactsList', () => ({
  useGetArtifactsList: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
}));

describe('ArtifactsTable', () => {
  it('should display REST artifact fields and forward name filtering', () => {
    const onFilterUpdate = jest.fn();
    render(
      <BrowserRouter>
        <ArtifactsTable
          artifacts={[
            {
              artifact_id: 'artifact-id',
              name: 'dataset',
              type: PipelineArtifactTypeKF.DATASET,
              uri: 's3://bucket/output',
              created_at: '2026-11-24T10:00:00Z',
            },
          ]}
          isLoaded
          nextPageToken={undefined}
          page={1}
          pageSize={10}
          filterData={{ name: '', id: '', type: undefined }}
          onFilterUpdate={onFilterUpdate}
          onClearFilters={jest.fn()}
          onNextPage={jest.fn()}
          onPreviousPage={jest.fn()}
          onPageSizeChange={jest.fn()}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('row', { name: /dataset/ })).toHaveTextContent('artifact-id');
    expect(screen.getByRole('row', { name: /dataset/ })).toHaveTextContent('s3://bucket/output');
    fireEvent.change(screen.getByTestId('artifact-name-filter-input'), {
      target: { value: 'data' },
    });
    expect(onFilterUpdate).toHaveBeenCalledWith(FilterOptions.Artifact, 'data');
  });

  it('should keep the name filter focused while the REST request is pending', () => {
    jest.mocked(useGetArtifactsList).mockImplementation((_token, _size, filter) =>
      filter
        ? [undefined, false, undefined, jest.fn()]
        : [
            {
              artifacts: [
                { artifact_id: 'id', name: 'dataset', type: PipelineArtifactTypeKF.DATASET },
              ],
            },
            true,
            undefined,
            jest.fn(),
          ],
    );
    render(
      <BrowserRouter>
        <ArtifactsList />
      </BrowserRouter>,
    );
    const nameFilter = screen.getByTestId('artifact-name-filter-input');
    nameFilter.focus();
    fireEvent.change(nameFilter, { target: { value: 'da' } });
    expect(screen.getByTestId('artifact-name-filter-input')).toBe(nameFilter);
    expect(nameFilter).toHaveFocus();
  });
});
