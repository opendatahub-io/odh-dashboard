// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useProviders } from '~/app/hooks/useProviders';
import { useProvider } from '~/app/hooks/useProvider';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Provider } from '~/app/types';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseProviders = jest.mocked(useProviders);

describe('useProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-ns' });
    mockUseProviders.mockReturnValue({ providers: [], loaded: true, loadError: undefined });
  });

  it('should return undefined provider when providerId is not provided', () => {
    const renderResult = testHook(useProvider)(undefined);

    expect(renderResult).hookToStrictEqual({
      provider: undefined,
      loaded: true,
      loadError: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return undefined provider when providerId does not match', () => {
    const providers: Provider[] = [{ resource: { id: 'prov-1' }, name: 'Provider 1' }];
    mockUseProviders.mockReturnValue({ providers, loaded: true, loadError: undefined });

    const renderResult = testHook(useProvider)('non-existent');

    expect(renderResult).hookToStrictEqual({
      provider: undefined,
      loaded: true,
      loadError: undefined,
    });
  });

  it('should return matching provider when providerId exists', () => {
    const provider: Provider = { resource: { id: 'prov-1' }, name: 'Provider 1' };
    mockUseProviders.mockReturnValue({
      providers: [provider],
      loaded: true,
      loadError: undefined,
    });

    const renderResult = testHook(useProvider)('prov-1');

    expect(renderResult).hookToStrictEqual({ provider, loaded: true, loadError: undefined });
  });

  it('should pass namespace from URL params to useProviders', () => {
    mockUseParams.mockReturnValue({ namespace: 'my-namespace' });

    testHook(useProvider)('prov-1');

    expect(mockUseProviders).toHaveBeenCalledWith('my-namespace');
  });

  it('should pass empty string when namespace is undefined', () => {
    mockUseParams.mockReturnValue({});

    testHook(useProvider)('prov-1');

    expect(mockUseProviders).toHaveBeenCalledWith('');
  });

  it('should return loaded false while providers are loading', () => {
    mockUseProviders.mockReturnValue({ providers: [], loaded: false, loadError: undefined });

    const renderResult = testHook(useProvider)('prov-1');

    expect(renderResult).hookToStrictEqual({
      provider: undefined,
      loaded: false,
      loadError: undefined,
    });
  });

  it('should forward loadError from useProviders', () => {
    const error = new Error('fetch failed');
    mockUseProviders.mockReturnValue({ providers: [], loaded: false, loadError: error });

    const renderResult = testHook(useProvider)('prov-1');

    expect(renderResult).hookToStrictEqual({
      provider: undefined,
      loaded: false,
      loadError: error,
    });
  });
});
