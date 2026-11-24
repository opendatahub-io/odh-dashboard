import type { TokenAuthenticationFieldHook } from '../fields/TokenAuthenticationField';
import {
  applyTokenAuthOverrides,
  canUseTokenAuth,
  NO_TOKEN_AUTH_PERMISSION_TEXT,
} from '../useDeploymentWizard';

jest.mock('@odh-dashboard/plugin-core');

const field = (): TokenAuthenticationFieldHook => ({
  data: [{ uuid: 'a', displayName: 'existing-token' }],
  setData: jest.fn(),
  shouldAutoCheck: true,
  isDisabled: false,
});

describe('applyTokenAuthOverrides', () => {
  it('should leave the field editable with permission and no override', () => {
    const result = applyTokenAuthOverrides(field(), {}, true);
    expect(result.isDisabled).toBe(false);
    expect(result.disabledHelperText).toBeUndefined();
    expect(result.data).toHaveLength(1);
  });

  it('should disable the field and keep only existing tokens without permission', () => {
    const result = applyTokenAuthOverrides(
      {
        ...field(),
        data: [
          { uuid: 'a', displayName: 'existing-token', k8sName: 'existing-token-sa' },
          { uuid: 'b', displayName: 'new-draft' },
        ],
      },
      {},
      false,
    );
    expect(result.isDisabled).toBe(true);
    expect(result.data).toEqual([
      { uuid: 'a', displayName: 'existing-token', k8sName: 'existing-token-sa' },
    ]);
    // The withheld draft is counted, so saving here is refused, and explained.
    expect(result.withheldDraftCount).toBe(1);
    expect(result.disabledHelperText).toContain(NO_TOKEN_AUTH_PERMISSION_TEXT);
    expect(result.disabledHelperText).toContain('remove them in that project');
  });

  it('should keep a disabling override, its text, and clear the tokens', () => {
    const result = applyTokenAuthOverrides(
      field(),
      { isDisabled: true, disabledHelperText: 'Not supported' },
      false,
    );
    expect(result.isDisabled).toBe(true);
    expect(result.disabledHelperText).toBe('Not supported');
    expect(result.data).toEqual([]);
  });
});

describe('canUseTokenAuth', () => {
  it('should need token creation for a new deployment and management for an edit', () => {
    const createOnly = { canCreateTokenAuth: true, canManageTokenAuth: false };
    expect(canUseTokenAuth(createOnly, false)).toBe(true);
    expect(canUseTokenAuth(createOnly, true)).toBe(false);
    expect(canUseTokenAuth({ canCreateTokenAuth: false }, false)).toBe(false);
  });

  it('should allow it where the host reports nothing', () => {
    expect(canUseTokenAuth(undefined, false)).toBe(true);
    expect(canUseTokenAuth({}, true)).toBe(true);
  });
});
