import * as React from 'react';
import { act } from 'react';
import { render, RenderOptions, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import DevFeatureFlagsBanner from '#~/app/DevFeatureFlagsBanner';

const renderOptions = (): RenderOptions => {
  const store = new PluginStore([]);
  return {
    wrapper: ({ children }) => <PluginStoreProvider store={store}>{children}</PluginStoreProvider>,
  };
};

describe('DevFeatureFlagsBanner', () => {
  it('should not render if no feature flags are overridden', () => {
    const result = render(
      <DevFeatureFlagsBanner
        dashboardConfig={{}}
        setDevFeatureFlag={() => undefined}
        resetDevFeatureFlags={() => undefined}
        devFeatureFlags={null}
        setDevFeatureFlagQueryVisible={() => undefined}
      />,
      renderOptions(),
    );
    expect(result.container).toBeEmptyDOMElement();
  });

  it('should render banner and open modal', () => {
    const resetFn = jest.fn();
    const visibleFn = jest.fn();
    const result = render(
      <DevFeatureFlagsBanner
        dashboardConfig={{}}
        setDevFeatureFlag={() => undefined}
        resetDevFeatureFlags={resetFn}
        setDevFeatureFlagQueryVisible={visibleFn}
        devFeatureFlags={{}}
      />,
      renderOptions(),
    );
    expect(result.container).not.toBeEmptyDOMElement();
    act(() => result.getByTestId('override-feature-flags-button').click());
    result.getByTestId('dev-feature-flags-modal');

    act(() => result.getByTestId('reset-feature-flags-button').click());
    expect(resetFn).toHaveBeenCalled();
    expect(visibleFn).toHaveBeenLastCalledWith(true);
    act(() => result.getByRole('button', { name: 'Close' }).click());
    expect(visibleFn).toHaveBeenLastCalledWith(false);
  });

  it('should render and set feature flags', () => {
    const setFeatureFlagFn = jest.fn();
    const resetFn = jest.fn();
    const result = render(
      <DevFeatureFlagsBanner
        dashboardConfig={{
          disableAcceleratorProfiles: false,
        }}
        setDevFeatureFlag={setFeatureFlagFn}
        resetDevFeatureFlags={resetFn}
        setDevFeatureFlagQueryVisible={() => undefined}
        devFeatureFlags={{
          disableHome: true,
        }}
      />,
      renderOptions(),
    );
    expect(result.container).not.toBeEmptyDOMElement();
    act(() => result.getByTestId('override-feature-flags-button').click());
    screen.getByTestId('dev-feature-flags-modal');

    act(() => result.getByTestId('reset-feature-flags-button').click());
    expect(resetFn).toHaveBeenCalled();

    expect(result.getByTestId('disableHome-checkbox')).toBeChecked();
    expect(result.getByTestId('disableAcceleratorProfiles-checkbox')).not.toBeChecked();
    expect(result.getByTestId('enablement-checkbox')).toBePartiallyChecked();

    expect(result.getByTestId('disableHome-value').textContent).toBe('true (overridden)');
    expect(result.getByTestId('disableAcceleratorProfiles-value').textContent).toBe('false');
    expect(result.getByTestId('enablement-value').textContent).toBe('');

    act(() => {
      result.getByTestId('disableHome-checkbox').click();
      result.getByTestId('disableAcceleratorProfiles-checkbox').click();
      result.getByTestId('enablement-checkbox').click();
    });

    expect(setFeatureFlagFn).toHaveBeenCalledTimes(3);
    expect(setFeatureFlagFn.mock.calls).toEqual([
      ['disableHome', false],
      ['disableAcceleratorProfiles', true],
      ['enablement', true],
    ]);
  });
});
