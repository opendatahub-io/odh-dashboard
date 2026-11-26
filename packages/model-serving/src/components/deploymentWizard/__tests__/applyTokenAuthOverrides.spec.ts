import type { TokenAuthenticationFieldHook } from '../fields/TokenAuthenticationField';
import {
  applyTokenAuthOverrides,
  canUseTokenAuth,
  TOKEN_AUTH_EDIT_PERMISSION_WARNING,
  TOKEN_AUTH_PERMISSION_WARNING,
} from '../useDeploymentWizard';

jest.mock('@odh-dashboard/plugin-core');

const field = (): TokenAuthenticationFieldHook => ({
  data: [{ uuid: 'a', displayName: 'existing-token' }],
  setData: jest.fn(),
  shouldAutoCheck: true,
  isDisabled: false,
});

describe('applyTokenAuthOverrides', () => {
  const allowed = { canSetUp: true, mayBeRefused: false };

  it('should leave the field editable with permission and no override', () => {
    const result = applyTokenAuthOverrides(field(), {}, allowed);
    expect(result.isDisabled).toBe(false);
    expect(result.disabledHelperText).toBeUndefined();
    expect(result.permissionWarning).toBeUndefined();
    expect(result.data).toHaveLength(1);
  });

  it('should keep the field and its tokens, and only warn, where setup may be refused', () => {
    const tokens = [
      { uuid: 'a', displayName: 'existing-token', k8sName: 'existing-token-sa' },
      { uuid: 'b', displayName: 'default-name' },
    ];
    const result = applyTokenAuthOverrides(
      { ...field(), data: tokens },
      {},
      { canSetUp: true, mayBeRefused: true },
    );
    // The auth choice is never changed by a permission: setup reuses
    // existing resources, and the dry run stops a refused setup.
    expect(result.isDisabled).toBe(false);
    expect(result.data).toEqual(tokens);
    expect(result.permissionWarning).toBe(TOKEN_AUTH_PERMISSION_WARNING);
  });

  it('should disable an edit it cannot set up, keeping its tokens and without a warning', () => {
    const result = applyTokenAuthOverrides(field(), {}, { canSetUp: false, mayBeRefused: true });
    expect(result.isDisabled).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.permissionWarning).toBeUndefined();
  });

  it('should keep a disabling override, its text, and clear the tokens', () => {
    const result = applyTokenAuthOverrides(
      field(),
      { isDisabled: true, disabledHelperText: 'Not supported' },
      { canSetUp: true, mayBeRefused: true },
    );
    expect(result.isDisabled).toBe(true);
    expect(result.disabledHelperText).toBe('Not supported');
    expect(result.data).toEqual([]);
    expect(result.permissionWarning).toBeUndefined();
  });
});

describe('applyTokenAuthOverrides on an edit', () => {
  it('should not advise turning tokens off, which needs the same access', () => {
    const result = applyTokenAuthOverrides(
      field(),
      {},
      { canSetUp: true, mayBeRefused: true, isEdit: true },
    );
    expect(result.permissionWarning).toBe(TOKEN_AUTH_EDIT_PERMISSION_WARNING);
    expect(result.permissionWarning).not.toBe(TOKEN_AUTH_PERMISSION_WARNING);
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
