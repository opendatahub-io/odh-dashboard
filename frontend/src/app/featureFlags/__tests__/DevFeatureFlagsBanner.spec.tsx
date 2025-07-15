import * as React from 'react';
import { act } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import DevFeatureFlagsBanner from '#~/app/featureFlags/DevFeatureFlagsBanner';

// Mock useDevFlags to return some dev flags so the Dev Flags tab appears
jest.mock('#~/app/featureFlags/useDevFeatureFlags', () => ({
  ...jest.requireActual('#~/app/featureFlags/useDevFeatureFlags'),
  useDevFlags: () => ['Model Serving Plugin', 'Test Dev Flag'],
}));

const renderOptions = (): RenderOptions => {
  const store = new PluginStore({});
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
        isBannerVisible={false}
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
        isBannerVisible
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

  it('should render and set feature flags across all tabs', () => {
    const setFeatureFlagFn = jest.fn();
    const resetFn = jest.fn();
    const result = render(
      <DevFeatureFlagsBanner
        isBannerVisible
        dashboardConfig={{
          disableAcceleratorProfiles: false,
          disableHome: false,
          disableProjects: false,
          disableModelServing: false,
          disablePipelines: false,
        }}
        setDevFeatureFlag={setFeatureFlagFn}
        resetDevFeatureFlags={resetFn}
        setDevFeatureFlagQueryVisible={() => undefined}
        devFeatureFlags={{
          disableHome: true,
          disableHardwareProfiles: true,
        }}
      />,
      renderOptions(),
    );
    expect(result.container).not.toBeEmptyDOMElement();
    act(() => result.getByTestId('override-feature-flags-button').click());
    result.getByTestId('dev-feature-flags-modal');

    // Test Active tab
    expect(result.getByTestId('activeFlagTab')).toBeInTheDocument();

    // Check tech preview flags
    expect(result.getByTestId('disableHardwareProfiles-checkbox')).toBeChecked();
    expect(result.getByTestId('disableHardwareProfiles-value').textContent).toBe(
      'true (overridden)',
    );

    // Click a tech preview flag
    act(() => {
      result.getByTestId('disableHardwareProfiles-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disableHardwareProfiles', false);

    // Check temp dev flags (disable Kueue is on by default)
    expect(result.getByTestId('disableKueue-checkbox')).toBeChecked();

    // Click a temporary dev flag
    act(() => {
      result.getByTestId('disableKueue-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disableKueue', false);

    // Click on Legacy tab
    act(() => {
      result.getByTestId('legacyFlagTab').click();
    });

    // Test Legacy tab flags
    expect(result.getByTestId('legacyFlagTab')).toBeInTheDocument();

    // Check core dashboard flags
    expect(result.getByTestId('disableHome-checkbox')).toBeChecked();
    expect(result.getByTestId('disableHome-value').textContent).toBe('true (overridden)');

    // Click a core dashboard flag
    act(() => {
      result.getByTestId('disableHome-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disableHome', false);

    // Check project management flags
    expect(result.getByTestId('disableProjects-checkbox')).not.toBeChecked();
    expect(result.getByTestId('disableProjects-value').textContent).toBe('false');

    // Click a project management flag
    act(() => {
      result.getByTestId('disableProjects-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disableProjects', true);

    // Check model serving flags
    expect(result.getByTestId('disableModelServing-checkbox')).not.toBeChecked();
    expect(result.getByTestId('disableModelServing-value').textContent).toBe('false');

    // Click a model serving flag
    act(() => {
      result.getByTestId('disableModelServing-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disableModelServing', true);

    // Check advanced AI/ML flags
    expect(result.getByTestId('disablePipelines-checkbox')).not.toBeChecked();
    expect(result.getByTestId('disablePipelines-value').textContent).toBe('false');

    // Click an advanced AI/ML flag
    act(() => {
      result.getByTestId('disablePipelines-checkbox').click();
    });
    expect(setFeatureFlagFn).toHaveBeenCalledWith('disablePipelines', true);

    // click on the dev flags tab
    act(() => {
      result.getByTestId('devFlagTab').click();
    });

    // should be unchecked
    expect(result.getByTestId('Model Serving Plugin-checkbox')).not.toBeChecked();

    // Go back to Active tab to test reset functionality
    act(() => {
      result.getByTestId('activeFlagTab').click();
    });

    act(() => result.getByTestId('reset-feature-flags-button').click());
    expect(resetFn).toHaveBeenCalled();

    // Verify total number of flag changes
    expect(setFeatureFlagFn).toHaveBeenCalledTimes(6);
    expect(setFeatureFlagFn.mock.calls).toEqual([
      ['disableHardwareProfiles', false],
      ['disableKueue', false],
      ['disableHome', false],
      ['disableProjects', true],
      ['disableModelServing', true],
      ['disablePipelines', true],
    ]);
  });
});
