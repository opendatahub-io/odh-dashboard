import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useSetVersionFilter } from '~/concepts/pipelines/content/tables/useSetVersionFilter';
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';

let mockUseLocationState: { lastVersion: Partial<PipelineVersionKFv2> } | undefined;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    state: mockUseLocationState,
  })),
}));

describe('useSetVersionFilter', () => {
  const onFilterUpdate = jest.fn();

  it('does not call onFilterUpdate when there is no router state version', async () => {
    renderHook(() => useSetVersionFilter(onFilterUpdate), {
      wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    });

    expect(onFilterUpdate).not.toHaveBeenCalled();
  });

  it('calls onFilterUpdate when router state has a version', () => {
    mockUseLocationState = {
      // eslint-disable-next-line camelcase
      lastVersion: { display_name: 'Some version', pipeline_version_id: 'some-id' },
    };
    renderHook(() => useSetVersionFilter(onFilterUpdate), {
      wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    });

    expect(onFilterUpdate).toBeCalledTimes(1);
    expect(onFilterUpdate).toHaveBeenCalledWith('pipeline_version', {
      label: 'Some version',
      value: 'some-id',
    });
  });
});
