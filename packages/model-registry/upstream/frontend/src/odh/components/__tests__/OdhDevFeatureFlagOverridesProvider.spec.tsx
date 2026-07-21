import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OdhDevFeatureFlagOverridesContext } from '~/odh/extension-points';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';

const SESSION_KEY = 'odh-feature-flags';

const OverridesConsumer: React.FC = () => {
  const overrides = React.useContext(OdhDevFeatureFlagOverridesContext);
  return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
};

describe('OdhDevFeatureFlagOverridesProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should provide null when no overrides are set', () => {
    render(
      <OdhDevFeatureFlagOverridesProvider>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    expect(screen.getByTestId('overrides')).toHaveTextContent('null');
  });

  it('should map HuggingFace API Key dev flag from session storage', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ 'KF MR Upstream: Catalog HuggingFace API Key': true }),
    );
    render(
      <OdhDevFeatureFlagOverridesProvider>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    const overrides = JSON.parse(screen.getByTestId('overrides').textContent!);
    expect(overrides).toEqual({
      tempDevCatalogHuggingFaceApiKeyFeatureAvailable: true,
    });
  });

  it('should map HuggingFace API Key dev flag as false from session storage', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ 'KF MR Upstream: Catalog HuggingFace API Key': false }),
    );
    render(
      <OdhDevFeatureFlagOverridesProvider>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    const overrides = JSON.parse(screen.getByTestId('overrides').textContent!);
    expect(overrides).toEqual({
      tempDevCatalogHuggingFaceApiKeyFeatureAvailable: false,
    });
  });

  it('should provide null when crdOverrides is empty object', () => {
    render(
      <OdhDevFeatureFlagOverridesProvider crdOverrides={{}}>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    expect(screen.getByTestId('overrides')).toHaveTextContent('null');
  });

  it('should apply CRD overrides when provided', () => {
    render(
      <OdhDevFeatureFlagOverridesProvider
        crdOverrides={{ tempDevCatalogHuggingFaceApiKeyFeatureAvailable: true }}
      >
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    const overrides = JSON.parse(screen.getByTestId('overrides').textContent!);
    expect(overrides).toEqual({
      tempDevCatalogHuggingFaceApiKeyFeatureAvailable: true,
    });
  });

  it('should give session storage dev flags higher priority than CRD overrides', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ 'KF MR Upstream: Catalog HuggingFace API Key': false }),
    );
    render(
      <OdhDevFeatureFlagOverridesProvider
        crdOverrides={{ tempDevCatalogHuggingFaceApiKeyFeatureAvailable: true }}
      >
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    const overrides = JSON.parse(screen.getByTestId('overrides').textContent!);
    expect(overrides.tempDevCatalogHuggingFaceApiKeyFeatureAvailable).toBe(false);
  });

  it('should ignore unmapped session storage keys', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ 'Some Unknown Flag': true }));
    render(
      <OdhDevFeatureFlagOverridesProvider>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    expect(screen.getByTestId('overrides')).toHaveTextContent('null');
  });

  it('should react to odh-dev-flags-changed events', () => {
    render(
      <OdhDevFeatureFlagOverridesProvider>
        <OverridesConsumer />
      </OdhDevFeatureFlagOverridesProvider>,
    );
    expect(screen.getByTestId('overrides')).toHaveTextContent('null');

    act(() => {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ 'KF MR Upstream: Catalog HuggingFace API Key': true }),
      );
      window.dispatchEvent(new CustomEvent('odh-dev-flags-changed'));
    });

    const overrides = JSON.parse(screen.getByTestId('overrides').textContent!);
    expect(overrides).toEqual({
      tempDevCatalogHuggingFaceApiKeyFeatureAvailable: true,
    });
  });
});
