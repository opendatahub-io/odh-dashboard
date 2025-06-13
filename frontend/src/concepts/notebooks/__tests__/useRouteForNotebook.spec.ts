import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { getRoute } from '#~/api';
import useRouteForNotebook from '#~/concepts/notebooks/apiHooks/useRouteForNotebook';

jest.mock('#~/api', () => ({
  getRoute: jest.fn(),
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

    (getRoute as jest.Mock).mockResolvedValue(mockRoute);

    const renderResult = testHook(useRouteForNotebook)('test-notebook', 'test-project', true);
    await renderResult.waitForNextUpdate();
    const [route, loaded, loadError] = renderResult.result.current as [
      string | null,
      boolean,
      Error | null,
    ];

    expect(getRoute).toHaveBeenCalledWith('test-notebook', 'test-project', {
      signal: expect.any(AbortSignal),
    });
    expect(route).toBe('https://example.com/notebook/test-project/test-notebook');
    expect(loaded).toBe(true);
    expect(loadError).toBeNull();
  });

  it('should handle error', async () => {
    const errorObj = new Error('Test error');
    (getRoute as jest.Mock).mockRejectedValue(errorObj);

    const renderResult = testHook(useRouteForNotebook)('test-notebook', 'test-project', true);
    await renderResult.waitForNextUpdate();

    const [route, loaded, loadError] = renderResult.result.current as [
      string | null,
      boolean,
      Error | null,
    ];
    expect(getRoute).toHaveBeenCalledWith('test-notebook', 'test-project', {
      signal: expect.any(AbortSignal),
    });
    expect(loadError).toBe(errorObj);
    expect(route).toBeNull();
    expect(loaded).toBe(false);
  });
});
