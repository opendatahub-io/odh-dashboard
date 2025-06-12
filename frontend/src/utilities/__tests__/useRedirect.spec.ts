import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useRedirect } from '#~/utilities/useRedirect';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('useRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful redirect', async () => {
    const createRedirectPath = jest.fn().mockReturnValue('/success-path');
    const onComplete = jest.fn();
    const renderResult = testHook(useRedirect)(createRedirectPath, { onComplete });

    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(createRedirectPath).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/success-path', undefined);
    expect(onComplete).toHaveBeenCalled();
    expect(state.loaded).toBe(true);
    expect(state.error).toBeUndefined();
  });

  it('should handle async redirect path creation', async () => {
    const createRedirectPath = jest.fn().mockResolvedValue('/async-path');
    const renderResult = testHook(useRedirect)(createRedirectPath);

    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(createRedirectPath).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/async-path', undefined);
    expect(state.loaded).toBe(true);
    expect(state.error).toBeUndefined();
  });

  it('should handle redirect with navigation options', async () => {
    const createRedirectPath = jest.fn().mockReturnValue('/path');
    const navigateOptions = { replace: true };
    const renderResult = testHook(useRedirect)(createRedirectPath, { navigateOptions });
    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(mockNavigate).toHaveBeenCalledWith('/path', navigateOptions);
  });

  it('should handle error when path is undefined', async () => {
    const createRedirectPath = jest.fn().mockRejectedValue(new Error('No path available'));
    const onError = jest.fn();
    const renderResult = testHook(useRedirect)(createRedirectPath, { onError });

    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(state.loaded).toBe(true);
    expect(state.error).toBeInstanceOf(Error);
  });

  it('should handle error in path creation', async () => {
    const error = new Error('Failed to create path');
    const createRedirectPath = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();
    const renderResult = testHook(useRedirect)(createRedirectPath, { onError });

    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(onError).toHaveBeenCalledWith(error);
    expect(state.loaded).toBe(true);
    expect(state.error).toBe(error);
  });

  it('should not redirect to not-found when notFoundOnError is false', async () => {
    const createRedirectPath = jest.fn().mockRejectedValue(new Error());
    const renderResult = testHook(useRedirect)(createRedirectPath);

    let state = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await renderResult.waitForNextUpdate();
    state = renderResult.result.current;

    expect(mockNavigate).not.toHaveBeenCalled();

    expect(state.loaded).toBe(true);
    expect(state.error).toBeInstanceOf(Error);
  });

  it('should be stable', () => {
    const createRedirectPath = jest.fn().mockReturnValue('/path');
    const renderResult = testHook(useRedirect)(createRedirectPath);
    renderResult.rerender(createRedirectPath);
    expect(renderResult).hookToBeStable({ loaded: true, error: undefined });
    expect(renderResult).hookToHaveUpdateCount(3);
  });
});
