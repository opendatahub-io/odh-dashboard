import { renderHook } from '@testing-library/react';
import { useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';
import { useApiKeysPageLoad } from '~/app/hooks/useApiKeysPageLoad';
import { useApiKeysTableState } from '~/app/hooks/useApiKeysTableState';
import { useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

jest.mock('~/app/context/KeysAndSubsContext', () => ({ useKeysAndSubsContext: jest.fn() }));
jest.mock('~/app/hooks/useApiKeysTableState', () => ({ useApiKeysTableState: jest.fn() }));
jest.mock('~/app/utilities/gridFeatureFlag', () => ({ useGridFeatureFlag: jest.fn() }));

describe('useApiKeysPageLoad admin controls', () => {
  beforeEach(() => {
    jest.mocked(useKeysAndSubsContext).mockReturnValue({
      isMaasAdmin: true,
      isMaasAdminLoaded: true,
      hasAnyApiKeysLoaded: true,
      refresh: jest.fn(),
      subscriptions: [],
    } as unknown as ReturnType<typeof useKeysAndSubsContext>);
    jest.mocked(useApiKeysTableState).mockReturnValue({
      loaded: true,
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useApiKeysTableState>);
  });

  it('keeps the role but hides deferred admin controls in Grid mode', () => {
    jest.mocked(useGridFeatureFlag).mockReturnValue(true);

    const { result } = renderHook(useApiKeysPageLoad);

    expect(result.current.isMaasAdmin).toBe(true);
    expect(result.current.adminControlsEnabled).toBe(false);
  });

  it('keeps admin controls when Grid is off', () => {
    jest.mocked(useGridFeatureFlag).mockReturnValue(false);

    const { result } = renderHook(useApiKeysPageLoad);

    expect(result.current.isMaasAdmin).toBe(true);
    expect(result.current.adminControlsEnabled).toBe(true);
  });
});
