import { testHook } from '@odh-dashboard/jest-config/hooks';
import { listRoutes } from '#~/api';
import useRouteForNotebook from '#~/concepts/notebooks/apiHooks/useRouteForNotebook';

jest.mock('#~/api', () => ({
  listRoutes: jest.fn(),
}));

describe('useRouteForNotebook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return notebook route', async () => {
    const mockRoute = {
      spec: {
        host: 'example.com',
      },
    };

    (listRoutes as jest.Mock).mockResolvedValue([mockRoute]);

    const renderResult = testHook(useRouteForNotebook)('test-notebook', 'test-project', true);
    await renderResult.waitForNextUpdate();
    const { data: route, loaded, error } = renderResult.result.current;
    expect(listRoutes).toHaveBeenCalledWith('test-project', 'notebook-name=test-notebook', {
      signal: expect.any(AbortSignal),
    });
    expect(route).toBe('https://example.com/notebook/test-project/test-notebook');
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should handle error', async () => {
    const errorObj = new Error('Test error');
    (listRoutes as jest.Mock).mockRejectedValue(errorObj);

    const renderResult = testHook(useRouteForNotebook)('test-notebook', 'test-project', true);
    await renderResult.waitForNextUpdate();

    const { data: route, loaded, error } = renderResult.result.current;
    expect(listRoutes).toHaveBeenCalledWith('test-project', 'notebook-name=test-notebook', {
      signal: expect.any(AbortSignal),
    });
    expect(error).toBe(errorObj);
    expect(route).toBeNull();
    expect(loaded).toBe(false);
  });
});
