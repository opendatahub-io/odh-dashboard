import type { TokenAuthenticationFieldHook } from '../fields/TokenAuthenticationField';
import { applyTokenAuthOverrides, NO_TOKEN_AUTH_PERMISSION_TEXT } from '../useDeploymentWizard';

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

  it('should disable the field and keep its tokens without permission', () => {
    const result = applyTokenAuthOverrides(field(), {}, false);
    expect(result.isDisabled).toBe(true);
    expect(result.disabledHelperText).toBe(NO_TOKEN_AUTH_PERMISSION_TEXT);
    expect(result.data).toEqual([{ uuid: 'a', displayName: 'existing-token' }]);
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
