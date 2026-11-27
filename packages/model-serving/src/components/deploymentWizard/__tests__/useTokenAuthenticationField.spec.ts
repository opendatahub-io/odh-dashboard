import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useTokenAuthenticationField } from '../fields/TokenAuthenticationField';
import { useWizardFieldOverrides } from '../dynamicFormUtils';

jest.mock('../dynamicFormUtils', () => ({
  ...jest.requireActual('../dynamicFormUtils'),
  useWizardFieldOverrides: jest.fn(),
}));

describe('useTokenAuthenticationField', () => {
  beforeEach(() => {
    jest
      .mocked(useWizardFieldOverrides)
      .mockReturnValue([{ initialValue: true }] as ReturnType<typeof useWizardFieldOverrides>);
  });

  it('should add and remove the untouched default token as the permission changes', () => {
    const renderResult = testHook(useTokenAuthenticationField)(
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    expect(renderResult.result.current.data?.map((t) => t.displayName)).toEqual(['default-name']);

    renderResult.rerender(undefined, undefined, undefined, undefined, false);
    expect(renderResult.result.current.data).toEqual([]);

    renderResult.rerender(undefined, undefined, undefined, undefined, true);
    expect(renderResult.result.current.data?.map((t) => t.displayName)).toEqual(['default-name']);
  });

  it('should keep an edited draft when the permission is denied and restored', () => {
    const renderResult = testHook(useTokenAuthenticationField)(
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    const [token] = renderResult.result.current.data ?? [];
    act(() => renderResult.result.current.setData([{ ...token, displayName: 'my-token' }]));

    renderResult.rerender(undefined, undefined, undefined, undefined, false);
    expect(renderResult.result.current.data?.map((t) => t.displayName)).toEqual(['my-token']);

    renderResult.rerender(undefined, undefined, undefined, undefined, true);
    expect(renderResult.result.current.data?.map((t) => t.displayName)).toEqual(['my-token']);
  });
});
