import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useRedirect } from '~/utilities/useRedirect';

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

    const [redirect, state] = renderResult.result.current;
    expect(state.loaded).toBe(false);
    expect(state.error).toBeUndefined();

    await redirect();
    renderResult.rerender(createRedirectPath, { onComplete });

    expect(createRedirectPath).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/success-path', undefined);
    expect(onComplete).toHaveBeenCalled();
    expect(renderResult.result.current[1].loaded).toBe(true);
    expect(renderResult.result.current[1].error).toBeUndefined();
  });

  it('should handle async redirect path creation', async () => {
    const createRedirectPath = jest.fn().mockResolvedValue('/async-path');
    const renderResult = testHook(useRedirect)(createRedirectPath);
    const [redirect] = renderResult.result.current;

    await redirect();
    renderResult.rerender(createRedirectPath);

    expect(createRedirectPath).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/async-path', undefined);
    expect(renderResult.result.current[1].loaded).toBe(true);
    expect(renderResult.result.current[1].error).toBeUndefined();
  });

  it('should handle redirect with navigation options', async () => {
    const createRedirectPath = jest.fn().mockReturnValue('/path');
    const navigateOptions = { replace: true };
    const renderResult = testHook(useRedirect)(createRedirectPath, { navigateOptions });
    const [redirect] = renderResult.result.current;

    await redirect();
    renderResult.rerender(createRedirectPath, { navigateOptions });

    expect(mockNavigate).toHaveBeenCalledWith('/path', navigateOptions);
  });

  it('should handle error when path is undefined', async () => {
    const createRedirectPath = jest.fn().mockReturnValue(undefined);
    const onError = jest.fn();
    const renderResult = testHook(useRedirect)(createRedirectPath, { onError });

    const [redirect] = renderResult.result.current;

    await redirect();
    renderResult.rerender(createRedirectPath, { onError });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(renderResult.result.current[1].loaded).toBe(true);
    expect(renderResult.result.current[1].error).toBeInstanceOf(Error);
  });

  it('should handle error in path creation', async () => {
    const error = new Error('Failed to create path');
    const createRedirectPath = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();
    const renderResult = testHook(useRedirect)(createRedirectPath, { onError });

    const [redirect] = renderResult.result.current;

    await redirect();
    renderResult.rerender(createRedirectPath, { onError });

    expect(onError).toHaveBeenCalledWith(error);
    expect(renderResult.result.current[1].loaded).toBe(true);
    expect(renderResult.result.current[1].error).toBe(error);
  });

  it('should not redirect to not-found when notFoundOnError is false', async () => {
    const createRedirectPath = jest.fn().mockRejectedValue(new Error());
    const renderResult = testHook(useRedirect)(createRedirectPath);

    const [redirect] = renderResult.result.current;

    await redirect(false);
    renderResult.rerender(createRedirectPath);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(renderResult.result.current[1].loaded).toBe(true);
    expect(renderResult.result.current[1].error).toBeInstanceOf(Error);
  });

  it('should be stable', () => {
    const createRedirectPath = jest.fn().mockReturnValue('/path');
    const renderResult = testHook(useRedirect)(createRedirectPath);
    renderResult.rerender(createRedirectPath);
    expect(renderResult).hookToBeStable([true, true]);
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
