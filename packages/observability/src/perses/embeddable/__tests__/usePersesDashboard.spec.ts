import { testHook } from '@odh-dashboard/jest-config/hooks';
import { waitFor } from '@testing-library/react';
import { DashboardResource } from '@perses-dev/core';
import { fetchPersesDashboard } from '../../perses-client';
import { usePersesDashboard } from '../usePersesDashboard';

jest.mock('../../perses-client', () => ({
  fetchPersesDashboard: jest.fn(),
}));

const fetchPersesDashboardMock = jest.mocked(fetchPersesDashboard);

const mockDashboard: DashboardResource = {
  kind: 'Dashboard',
  metadata: {
    name: 'test-dashboard',
    project: 'test-project',
    createdAt: '',
    updatedAt: '',
    version: 0,
  },
  spec: {
    display: { name: 'Test Dashboard' },
    datasources: {},
    variables: [],
    panels: {},
    layouts: [],
    duration: '30m',
  },
};

describe('usePersesDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start in a loading state', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    fetchPersesDashboardMock.mockReturnValue(new Promise(() => {}));
    const renderResult = testHook(usePersesDashboard)('test-project', 'test-dashboard');
    expect(renderResult).hookToStrictEqual(
      expect.objectContaining({
        dashboard: undefined,
        loaded: false,
        error: undefined,
      }),
    );
  });

  it('should return the dashboard when loaded', async () => {
    fetchPersesDashboardMock.mockResolvedValue(mockDashboard);
    const renderResult = testHook(usePersesDashboard)('test-project', 'test-dashboard');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      expect.objectContaining({
        dashboard: mockDashboard,
        loaded: true,
        error: undefined,
      }),
    );
    expect(fetchPersesDashboardMock).toHaveBeenCalledWith(
      'test-project',
      'test-dashboard',
      expect.any(AbortSignal),
      undefined,
    );
  });

  it('should fetch from the host proxy and refetch when its path changes', async () => {
    fetchPersesDashboardMock.mockResolvedValue(mockDashboard);
    const options = { persesProxyBasePath: '/custom-base/perses/api' };
    const renderResult = testHook(usePersesDashboard)('test-project', 'test-dashboard', options);
    await renderResult.waitForNextUpdate();
    expect(fetchPersesDashboardMock).toHaveBeenCalledWith(
      'test-project',
      'test-dashboard',
      expect.any(AbortSignal),
      options.persesProxyBasePath,
    );

    renderResult.rerender('test-project', 'test-dashboard', { ...options });
    expect(fetchPersesDashboardMock).toHaveBeenCalledTimes(1);

    renderResult.rerender('test-project', 'test-dashboard', {
      persesProxyBasePath: '/another-host/perses/api',
    });
    await waitFor(() => expect(fetchPersesDashboardMock).toHaveBeenCalledTimes(2));
    expect(fetchPersesDashboardMock).toHaveBeenLastCalledWith(
      'test-project',
      'test-dashboard',
      expect.any(AbortSignal),
      '/another-host/perses/api',
    );
    await waitFor(() =>
      expect(renderResult).hookToStrictEqual(
        expect.objectContaining({ dashboard: mockDashboard, loaded: true, error: undefined }),
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(6);
  });

  it('should return an error on failure', async () => {
    const error = new Error('Fetch failed');
    fetchPersesDashboardMock.mockRejectedValue(error);
    const renderResult = testHook(usePersesDashboard)('test-project', 'test-dashboard');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      expect.objectContaining({
        dashboard: undefined,
        loaded: false,
        error,
      }),
    );
  });
});
